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

@Injectable()
export class UserNotSelfPipe implements PipeTransform {
    constructor(private readonly cls: ClsService) {}

    async transform(value: string): Promise<string> {
        const request = this.cls.get<IRequestApp>(CLS_REQ);
        if (!request) {
            throw new UnauthorizedException({
                message: 'user.error.authContextMissing',
            });
        }
        const { user } = request;
        if (
            user?.user === value &&
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
