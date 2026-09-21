import { DatabaseRepository } from '@app/common/database/bases/database.repository';
import { EntityManager } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';
import { UserEntity } from 'src/modules/user/repository/entities/user.entity';

@Injectable()
export class UserRepository extends DatabaseRepository<UserEntity> {
    constructor(em: EntityManager) {
        super(em, UserEntity);
    }

    // Custom method to find users with acti roles
    async findWithActiveRole() {
        return this.find(
            {
                role: {
                    isActive: true,
                },
            },
            {
                populate: ['role', 'country'],
            }
        );
    }

    // Custom method to find by username with relations
    async findByUsernameWithRelations(username: string) {
        return this.findOne({ username }, { populate: ['role', 'country'] });
    }

    // Custom method to find by email with relations
    async findByEmailWithRelations(email: string) {
        return this.findOne({ email }, { populate: ['role', 'country'] });
    }
}
