import { Command } from 'nestjs-command';
import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import {
    ENUM_POLICY_ACTION,
    ENUM_POLICY_ROLE_TYPE,
    ENUM_POLICY_SUBJECT,
} from 'src/modules/policy/enums/policy.enum';
import { RoleEntity } from 'src/modules/role/repository/entities/role.entity';

@Injectable()
export class MigrationRoleSeed {
    constructor(private readonly em: EntityManager) {}

    @Command({
        command: 'seed:role',
        describe: 'seed roles',
    })
    async seeds(): Promise<void> {
        const data = [
            {
                name: 'superadmin',
                type: ENUM_POLICY_ROLE_TYPE.SUPER_ADMIN,
                permissions: [],
                isActive: true,
            },
            {
                name: 'admin',
                type: ENUM_POLICY_ROLE_TYPE.ADMIN,
                isActive: true,
                permissions: Object.values(ENUM_POLICY_SUBJECT)
                    .filter(e => e !== ENUM_POLICY_SUBJECT.API_KEY)
                    .map(val => ({
                        subject: val,
                        action: [ENUM_POLICY_ACTION.MANAGE],
                    })),
            },
            {
                name: 'individual',
                type: ENUM_POLICY_ROLE_TYPE.USER,
                permissions: [],
                isActive: true,
            },
            {
                name: 'premium',
                type: ENUM_POLICY_ROLE_TYPE.USER,
                permissions: [],
                isActive: true,
            },
            {
                name: 'business',
                type: ENUM_POLICY_ROLE_TYPE.USER,
                permissions: [],
                isActive: true,
            },
        ];

        // Fork for a request-scoped context (global EM is disallowed — see
        // DatabaseOptionService.allowGlobalContext=false).
        const em = this.em.fork();
        for (const roleData of data) {
            const existing = await em.findOne(RoleEntity, {
                name: roleData.name,
            });
            if (existing) continue;
            const role = em.create(RoleEntity, roleData);
            em.persist(role);
        }

        await em.flush();
    }

    async remove(): Promise<void> {
        await this.em.nativeDelete(RoleEntity, {});
    }
}
