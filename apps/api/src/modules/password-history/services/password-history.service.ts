import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { plainToInstance } from 'class-transformer';
import { Duration } from 'luxon';
import {
    IDatabaseCreateOptions,
    IDatabaseDeleteManyOptions,
    IDatabaseFindAllOptions,
    IDatabaseFindOneOptions,
    IDatabaseGetTotalOptions,
} from 'src/common/database/interfaces/database.interface';
import { HelperDateService } from 'src/common/helper/services/helper.date.service';
import { HelperHashService } from 'src/common/helper/services/helper.hash.service';
import { PasswordHistoryCreateByAdminRequestDto } from 'src/modules/password-history/dtos/request/password-history.create-by-admin.request.dto';
import { PasswordHistoryCreateRequestDto } from 'src/modules/password-history/dtos/request/password-history.create.request.dto';
import { PasswordHistoryAdminListResponseDto } from 'src/modules/password-history/dtos/response/password-history.admin-list.response.dto';
import { PasswordHistoryListResponseDto } from 'src/modules/password-history/dtos/response/password-history.list.response.dto';
import { IPasswordHistoryService } from 'src/modules/password-history/interfaces/password-history.service.interface';
import {
    PasswordHistoryDoc,
    PasswordHistoryEntity,
} from 'src/modules/password-history/repository/entities/password-history.entity';
import { PasswordHistoryRepository } from 'src/modules/password-history/repository/repositories/password-history.repository';
import { UserMetaResponseDto } from 'src/modules/user/dtos/response/user.meta.response.dto';
import { UserEntity } from 'src/modules/user/repository/entities/user.entity';

@Injectable()
export class PasswordHistoryService implements IPasswordHistoryService {
    private readonly passwordPeriod: number;

    constructor(
        private readonly configService: ConfigService,
        private readonly helperDateService: HelperDateService,
        private readonly helperHashService: HelperHashService,
        private readonly passwordHistoryRepository: PasswordHistoryRepository
    ) {
        this.passwordPeriod = this.configService.get<number>(
            'auth.password.period'
        );
    }

    async findAll(
        find?: Record<string, any>,
        options?: IDatabaseFindAllOptions
    ): Promise<PasswordHistoryEntity[]> {
        return this.passwordHistoryRepository.find(find, {
            populate: ['user', 'by'],
            limit: options?.limit,
            offset: options?.offset,
            orderBy: options?.orderBy,
        });
    }

    async findAllByUser(
        user: string,
        find?: Record<string, any>,
        options?: IDatabaseFindAllOptions
    ): Promise<PasswordHistoryEntity[]> {
        return this.passwordHistoryRepository.find(
            { ...find, user },
            {
                populate: ['user', 'by'],
                limit: options?.limit,
                offset: options?.offset,
                orderBy: options?.orderBy,
            }
        );
    }

    async findOneById(
        _id: string,
        _options?: IDatabaseFindOneOptions
    ): Promise<PasswordHistoryDoc> {
        return this.passwordHistoryRepository.findOne(
            { id: _id },
            {
                populate: ['user', 'by'],
            }
        );
    }

    async findOne(
        find: Record<string, any>,
        _options?: IDatabaseFindOneOptions
    ): Promise<PasswordHistoryDoc> {
        return this.passwordHistoryRepository.findOne(find, {
            populate: ['user', 'by'],
        });
    }

    async findOneByUser(
        user: string,
        password: string,
        _options?: IDatabaseFindOneOptions
    ): Promise<PasswordHistoryDoc> {
        return this.passwordHistoryRepository.findOne(
            {
                user,
                password,
            },
            {
                populate: ['user', 'by'],
            }
        );
    }

    async findOneUsedByUser(
        user: string,
        password: string,
        _options?: IDatabaseFindOneOptions
    ): Promise<PasswordHistoryDoc> {
        const today = this.helperDateService.create();
        const allHistoryPasswords = await this.passwordHistoryRepository.find(
            {
                user,
                expiredAt: { $gte: today },
            },
            {
                populate: ['user', 'by'],
            }
        );

        for (const historyPassword of allHistoryPasswords) {
            const isMatch = this.helperHashService.bcryptCompare(
                password,
                historyPassword.password
            );
            if (isMatch) {
                return historyPassword;
            }
        }

        return null;
    }

    async getTotal(
        find?: Record<string, any>,
        options?: IDatabaseGetTotalOptions
    ): Promise<number> {
        return this.passwordHistoryRepository.getTotal(find, options);
    }

    async getTotalByUser(
        user: string,
        find?: Record<string, any>,
        options?: IDatabaseGetTotalOptions
    ): Promise<number> {
        return this.passwordHistoryRepository.getTotal(
            { ...find, user },
            options
        );
    }

    async createByUser(
        user: UserEntity,
        { type }: PasswordHistoryCreateRequestDto,
        options?: IDatabaseCreateOptions
    ): Promise<PasswordHistoryDoc> {
        const today = this.helperDateService.create();
        const expiredAt: Date = this.helperDateService.forward(
            today,
            Duration.fromObject({
                seconds: this.passwordPeriod,
            })
        );

        const create: PasswordHistoryEntity = new PasswordHistoryEntity();
        create.user = user;
        create.by = user;
        create.type = type;
        create.password = user.password;
        create.expiredAt = expiredAt;

        return this.passwordHistoryRepository.create(create, options);
    }

    async createByAdmin(
        user: UserEntity,
        { by, type }: PasswordHistoryCreateByAdminRequestDto,
        options?: IDatabaseCreateOptions
    ): Promise<PasswordHistoryDoc> {
        const today = this.helperDateService.create();
        const expiredAt: Date = this.helperDateService.forward(
            today,
            Duration.fromObject({
                seconds: this.passwordPeriod,
            })
        );

        const create: PasswordHistoryEntity = new PasswordHistoryEntity();
        create.user = user;
        create.by = this.passwordHistoryRepository['em'].getReference(
            UserEntity,
            by
        );
        create.type = type;
        create.password = user.password;
        create.expiredAt = expiredAt;

        return this.passwordHistoryRepository.create(create, options);
    }

    async deleteMany(
        find?: Record<string, any>,
        options?: IDatabaseDeleteManyOptions
    ): Promise<boolean> {
        await this.passwordHistoryRepository.deleteMany(find, options);

        return true;
    }

    async getPasswordPeriod(): Promise<number> {
        return this.passwordPeriod;
    }

    mapList(
        userHistories: PasswordHistoryEntity[]
    ): PasswordHistoryListResponseDto[] {
        return userHistories.map(history => {
            const dto = plainToInstance(
                PasswordHistoryListResponseDto,
                history
            );
            // `user` is declared as the FK id string, but the finder populates the
            // full UserEntity — which carries password/salt and, with no global
            // serializer, would be JSON.stringify'd verbatim. Collapse it back to
            // the id. (`by` is safe: UserShortResponseDto inherits @Exclude.)
            dto.user = (history.user?.id ?? undefined) as unknown as string;
            return dto;
        });
    }

    // Cross-user admin list. The populated `user`/`by` relations are full
    // UserEntity instances, so each is narrowed explicitly through
    // UserMetaResponseDto with excludeExtraneousValues — otherwise
    // class-transformer copies every entity property (password/salt) onto the
    // nested DTO and leaks it in the response.
    mapAdminList(
        histories: PasswordHistoryEntity[]
    ): PasswordHistoryAdminListResponseDto[] {
        return histories.map(history => {
            const dto = plainToInstance(
                PasswordHistoryAdminListResponseDto,
                history
            );
            dto.user = history.user
                ? plainToInstance(UserMetaResponseDto, history.user, {
                      excludeExtraneousValues: true,
                  })
                : (undefined as any);
            dto.by = history.by
                ? plainToInstance(UserMetaResponseDto, history.by, {
                      excludeExtraneousValues: true,
                  })
                : (undefined as any);
            return dto;
        });
    }
}
