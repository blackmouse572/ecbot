import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { ENUM_ROLE_STATUS_CODE_ERROR } from 'src/modules/role/enums/role.status-code.enum';
import { RoleEntity } from 'src/modules/role/repository/entities/role.entity';

@Injectable()
export class RoleIsActivePipe implements PipeTransform {
    private readonly isActive: boolean[];

    constructor(isActive: boolean[]) {
        this.isActive = isActive;
    }

    async transform(value: RoleEntity): Promise<RoleEntity> {
        if (!this.isActive.includes(value.isActive)) {
            throw new BadRequestException({
                statusCode: ENUM_ROLE_STATUS_CODE_ERROR.IS_ACTIVE,
                message: 'role.error.isActiveInvalid',
            });
        }

        return value;
    }
}
