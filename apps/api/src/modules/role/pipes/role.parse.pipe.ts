import { Injectable, NotFoundException, PipeTransform } from '@nestjs/common';
import { ENUM_ROLE_STATUS_CODE_ERROR } from 'src/modules/role/enums/role.status-code.enum';
import { RoleEntity } from 'src/modules/role/repository/entities/role.entity';
import { RoleService } from 'src/modules/role/services/role.service';

@Injectable()
export class RoleParsePipe implements PipeTransform {
    constructor(private readonly roleService: RoleService) {}

    async transform(value: any): Promise<RoleEntity> {
        // Populate `workspace` so the controllers' workspace-scoping checks
        // (role.workspace?.id === workspace.id) can read the id off a loaded
        // relation instead of an unpopulated reference.
        const role: RoleEntity = await this.roleService.findOneById(value, {
            populate: ['workspace'],
        });
        if (!role) {
            throw new NotFoundException({
                statusCode: ENUM_ROLE_STATUS_CODE_ERROR.NOT_FOUND,
                message: 'role.error.notFound',
            });
        }

        return role;
    }
}
