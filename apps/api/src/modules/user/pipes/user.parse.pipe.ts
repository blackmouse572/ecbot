import { ENUM_ROLE_STATUS_CODE_ERROR } from '@app/modules/role/enums/role.status-code.enum';
import { Injectable, NotFoundException, PipeTransform } from '@nestjs/common';
import { ENUM_USER_STATUS_CODE_ERROR } from 'src/modules/user/enums/user.status-code.enum';
import { UserEntity } from 'src/modules/user/repository/entities/user.entity';
import { UserService } from 'src/modules/user/services/user.service';

@Injectable()
export class UserParsePipe implements PipeTransform {
    constructor(private readonly userService: UserService) {}

    async transform(value: string): Promise<UserEntity> {
        const user: UserEntity = await this.userService.findOneById(value);
        if (!user) {
            throw new NotFoundException({
                statusCode: ENUM_USER_STATUS_CODE_ERROR.NOT_FOUND,
                message: 'user.error.notFound',
            });
        }

        return user;
    }
}

@Injectable()
export class UserActiveParsePipe implements PipeTransform {
    constructor(private readonly userService: UserService) {}

    async transform(value: string): Promise<UserEntity> {
        const user = await this.userService.findOneById(value, {
            populate: ['role', 'country'],
        });
        if (!user) {
            throw new NotFoundException({
                statusCode: ENUM_USER_STATUS_CODE_ERROR.NOT_FOUND,
                message: 'user.error.notFound',
            });
        }

        return user;
    }
}

@Injectable()
export class UserWithRolePipe implements PipeTransform {
    constructor(private readonly userService: UserService) {}

    async transform(value: string): Promise<UserEntity> {
        const user = await this.userService.findOneById(value, {
            populate: ['role'],
        });
        if (!user) {
            throw new NotFoundException({
                statusCode: ENUM_USER_STATUS_CODE_ERROR.NOT_FOUND,
                message: 'user.error.notFound',
            });
        }

        if (!user.role) {
            throw new NotFoundException({
                statusCode: ENUM_ROLE_STATUS_CODE_ERROR.NOT_FOUND,
                message: 'role.error.notFound',
            });
        }

        return user;
    }
}
