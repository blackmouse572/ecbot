import {
    BadRequestException,
    Injectable,
    PipeTransform,
    UnauthorizedException,
} from '@nestjs/common';
import { CLS_REQ, ClsService } from 'nestjs-cls';
import { ENUM_POLICY_ROLE_TYPE } from 'src/modules/policy/enums/policy.enum';
import { IRequestApp } from 'src/common/request/interfaces/request.interface';
import { ENUM_USER_STATUS_CODE_ERROR } from 'src/modules/user/enums/user.status-code.enum';
import { UserEntity } from 'src/modules/user/repository/entities/user.entity';

@Injectable()
export class UserNotSelfPipe implements PipeTransform {
    constructor(private readonly cls: ClsService) {}

    // Routes run it after UserParsePipe, so it usually gets the entity.
    async transform<T extends string | UserEntity>(value: T): Promise<T> {
        const request = this.cls.get<IRequestApp>(CLS_REQ);
        if (!request) {
            throw new UnauthorizedException({
                message: 'user.error.authContextMissing',
            });
        }
        const { user } = request;
        const id = typeof value === 'string' ? value : value?.id;
        if (
            user?.user === id &&
            user?.type !== ENUM_POLICY_ROLE_TYPE.SUPER_ADMIN
        ) {
            throw new BadRequestException({
                statusCode: ENUM_USER_STATUS_CODE_ERROR.NOT_SELF,
                message: 'user.error.notSelf',
            });
        }

        return value;
    }
}
