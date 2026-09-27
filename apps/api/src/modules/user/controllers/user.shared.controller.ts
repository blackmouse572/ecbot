import { RequestRequiredPipe } from '@app/common/request/pipes/request.required.pipe';
import { ENUM_ACTIVITY_ACTION } from '@app/modules/activity/enums/activity.enum';
import { ENUM_POLICY_SUBJECT } from '@app/modules/policy/enums/policy.enum';
import { EntityManager } from '@mikro-orm/postgresql';
import {
    Body,
    Controller,
    ForbiddenException,
    Get,
    HttpCode,
    HttpStatus,
    InternalServerErrorException,
    NotFoundException,
    Post,
    Put,
    UploadedFile,
    UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiTags } from '@nestjs/swagger';
import { randomUUID } from 'crypto';
import multer from 'multer';
import { ENUM_APP_STATUS_CODE_ERROR } from 'src/app/enums/app.status-code.enum';
import { DatabaseService } from 'src/common/database/services/database.service';
import {
    ENUM_FILE_MIME_IMAGE,
    EXTENSION_BY_MIME_IMAGE,
} from 'src/common/file/enums/file.enum';
import { FileTypePipe } from 'src/common/file/pipes/file.type.pipe';
import { Response } from 'src/common/response/decorators/response.decorator';
import { IResponse } from 'src/common/response/interfaces/response.interface';
import { ActivityService } from 'src/modules/activity/services/activity.service';
import { ApiKeyProtected } from 'src/modules/api-key/decorators/api-key.decorator';
import {
    AuthJwtAccessProtected,
    AuthJwtPayload,
} from 'src/modules/auth/decorators/auth.jwt.decorator';
import { IAuthJwtAccessTokenPayload } from 'src/modules/auth/interfaces/auth.interface';
import { AwsS3Dto } from 'src/modules/aws/dtos/aws.s3.dto';
import { AwsS3PresignRequestDto } from 'src/modules/aws/dtos/request/aws.s3-presign.request.dto';
import { AwsS3PresignResponseDto } from 'src/modules/aws/dtos/response/aws.s3-presign.response.dto';
import { AwsS3Service } from 'src/modules/aws/services/aws.s3.service';
import { ENUM_COUNTRY_STATUS_CODE_ERROR } from 'src/modules/country/enums/country.status-code.enum';
import { CountryService } from 'src/modules/country/services/country.service';
import {
    UserParam,
    UserProtected,
} from 'src/modules/user/decorators/user.decorator';
import {
    UserGetDoc,
    UserSharedProfileDoc,
    UserSharedUpdatePhotoProfileDoc,
    UserSharedUpdateProfileDoc,
    UserSharedUploadPhotoProfileDoc,
} from 'src/modules/user/docs/user.shared.doc';
import { ENUM_USER_STATUS_CODE_ERROR } from 'src/modules/user/enums/user.status-code.enum';
import { UserUpdateProfileRequestDto } from 'src/modules/user/dtos/request/user.update-profile.dto';
import { UserUploadPhotoRequestDto } from 'src/modules/user/dtos/request/user.upload-photo.request.dto';
import { UserProfileResponseDto } from 'src/modules/user/dtos/response/user.profile.response.dto';
import {
    UserActiveParsePipe,
    UserParsePipe,
} from 'src/modules/user/pipes/user.parse.pipe';
import { UserEntity } from 'src/modules/user/repository/entities/user.entity';
import { UserService } from 'src/modules/user/services/user.service';
import { UserShortResponseDto } from '../dtos/response/user.short.response.dto';

@ApiTags('modules.shared.user')
@Controller({
    version: '1',
    path: '/user',
})
export class UserSharedController {
    constructor(
        private readonly databaseService: DatabaseService,
        private readonly awsS3Service: AwsS3Service,
        private readonly userService: UserService,
        private readonly countryService: CountryService,
        private readonly activityService: ActivityService,
        private readonly em: EntityManager
    ) {}

    private async uploadAvatarImage(
        image: Express.Multer.File,
        userId: string
    ): Promise<string> {
        // Key derives from the FileTypePipe-validated mimetype, never the
        // client-controlled `originalname` — same scheme as
        // UserService#createRandomFilenamePhoto (the presign path).
        const extension =
            EXTENSION_BY_MIME_IMAGE[
                image.mimetype as ENUM_FILE_MIME_IMAGE
            ] ?? 'jpg';
        const key = `user/${userId}/${randomUUID()}.${extension}`;
        const uploaded = await this.awsS3Service.putItem({
            key,
            file: image.buffer,
            size: image.size,
        });
        return uploaded.completedUrl;
    }

    @UserSharedProfileDoc()
    @Response('user.profile')
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/profile')
    async profile(
        @AuthJwtPayload<IAuthJwtAccessTokenPayload>('user', UserActiveParsePipe)
        user: UserEntity
    ): Promise<IResponse<UserProfileResponseDto>> {
        const mapped: UserProfileResponseDto =
            this.userService.mapProfile(user);
        return { data: mapped };
    }

    @UserGetDoc()
    @Response('user.profile')
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Get('/get/:user')
    async getUserProfile(
        @UserParam('user', RequestRequiredPipe, UserParsePipe) user: UserEntity
    ): Promise<IResponse<UserShortResponseDto>> {
        const mapped: UserShortResponseDto = this.userService.mapShort(user);

        return { data: mapped };
    }

    @UserSharedUpdateProfileDoc()
    @Response('user.updateProfile')
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Put('/profile/update')
    @UseInterceptors(
        FileInterceptor('image', {
            storage: multer.memoryStorage(),
            limits: {
                fileSize: 5 * 1024 * 1024,
                files: 1,
            },
        })
    )
    @ApiConsumes('multipart/form-data')
    async updateProfile(
        @AuthJwtPayload<IAuthJwtAccessTokenPayload>('user', UserParsePipe)
        user: UserEntity,
        @Body()
        { country, ...body }: UserUpdateProfileRequestDto,
        @UploadedFile(
            new FileTypePipe([
                ENUM_FILE_MIME_IMAGE.JPG,
                ENUM_FILE_MIME_IMAGE.JPEG,
                ENUM_FILE_MIME_IMAGE.PNG,
                ENUM_FILE_MIME_IMAGE.WEBP,
            ])
        )
        image?: Express.Multer.File
    ): Promise<void> {
        const checkCountry = this.countryService.findOneById(country);
        if (!checkCountry) {
            throw new NotFoundException({
                statusCode: ENUM_COUNTRY_STATUS_CODE_ERROR.NOT_FOUND,
                message: 'country.error.notFound',
            });
        }

        const session = this.em.fork();
        await session.begin();

        try {
            let avatarUrl = body.avatar;
            if (image) {
                avatarUrl = await this.uploadAvatarImage(image, user.id);
            }
            await this.userService.updateProfile(
                user,
                { country, ...body, avatar: avatarUrl },
                { em: session }
            );

            await this.activityService.createByUser(
                user,
                {
                    action: ENUM_ACTIVITY_ACTION.UPDATE,
                    subject: ENUM_POLICY_SUBJECT.USER,
                },
                { em: session }
            );

            await session.commit();
        } catch (err: unknown) {
            await session.rollback();
            throw new InternalServerErrorException({
                statusCode: ENUM_APP_STATUS_CODE_ERROR.UNKNOWN,
                message: 'http.serverError.internalServerError',
                _error: err,
            });
        }

        return;
    }

    @UserSharedUploadPhotoProfileDoc()
    @Response('user.uploadPhotoProfile')
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @HttpCode(HttpStatus.OK)
    @Post('/profile/upload-photo')
    async uploadPhotoProfile(
        @AuthJwtPayload<IAuthJwtAccessTokenPayload>('user', UserParsePipe)
        user: UserEntity,
        @Body() { mime, size }: UserUploadPhotoRequestDto
    ): Promise<IResponse<AwsS3PresignResponseDto>> {
        const randomFilename: string =
            this.userService.createRandomFilenamePhoto(user.id, {
                mime,
                size,
            });

        const aws: AwsS3PresignResponseDto =
            await this.awsS3Service.presignPutItem(randomFilename, size);

        return {
            data: aws,
        };
    }

    @UserSharedUpdatePhotoProfileDoc()
    @Response('user.updatePhotoProfile')
    @UserProtected()
    @AuthJwtAccessProtected()
    @ApiKeyProtected()
    @Put('/profile/update-photo')
    async updatePhotoProfile(
        @AuthJwtPayload<IAuthJwtAccessTokenPayload>('user', UserParsePipe)
        user: UserEntity,
        @Body() body: AwsS3PresignRequestDto
    ): Promise<void> {
        // The presign step (uploadPhotoProfile) only ever issues keys under
        // `user/{user.id}/`. Without this check a caller could confirm any
        // S3 key here — including another user's avatar or an unrelated
        // object — and have it attached to their own profile.
        if (!body.key.startsWith(`user/${user.id}/`)) {
            throw new ForbiddenException({
                statusCode: ENUM_USER_STATUS_CODE_ERROR.PHOTO_KEY_INVALID,
                message: 'user.error.photoKeyInvalid',
            });
        }

        const session = this.em.fork();
        await session.begin();

        try {
            const aws: AwsS3Dto = this.awsS3Service.mapPresign(body);

            await this.userService.updatePhoto(user, aws, { em: session });
            await this.activityService.createByUser(
                user,
                {
                    action: ENUM_ACTIVITY_ACTION.UPDATE,
                    subject: ENUM_POLICY_SUBJECT.USER,
                    metadata: {
                        old: {
                            photo: user.photo,
                        },
                        new: {
                            photo: aws.completedUrl,
                        },
                    },
                },
                { em: session }
            );

            await session.commit();
        } catch (err: unknown) {
            await session.rollback();

            throw new InternalServerErrorException({
                statusCode: ENUM_APP_STATUS_CODE_ERROR.UNKNOWN,
                message: 'http.serverError.internalServerError',
                _error: err,
            });
        }

        return;
    }
}
