import { DatabaseRepository } from '@app/common/database/bases/database.repository';
import { EntityManager, raw } from '@mikro-orm/postgresql';
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

    /**
     * Claims one password or MFA guess in a single conditional update, before
     * the secret is compared, so parallel guesses cannot pass the cap. False
     * when no guess is left (the account is locked).
     */
    async claimPasswordAttempt(id: string, max: number): Promise<boolean> {
        const claimed = await this.updateRaw(
            { id, passwordAttempt: { $lt: max } },
            { passwordAttempt: raw('password_attempt + 1') }
        );
        return claimed === 1;
    }

    async clearPasswordAttempt(id: string): Promise<void> {
        await this.updateRaw({ id }, { passwordAttempt: 0 });
    }

    /** Records an accepted TOTP step; false when it, or a later one, was used. */
    async claimMfaTimeStep(id: string, step: number): Promise<boolean> {
        const claimed = await this.updateRaw(
            {
                id,
                mfaEnabled: true,
                $or: [
                    { mfaLastTimeStep: null },
                    { mfaLastTimeStep: { $lt: step } },
                ],
            },
            { mfaLastTimeStep: step }
        );
        return claimed === 1;
    }

    /** Removes one recovery code hash; false when it was not there (already used). */
    async consumeMfaRecoveryCode(id: string, hash: string): Promise<boolean> {
        const claimed = await this.updateRaw(
            {
                id,
                mfaEnabled: true,
                [raw(
                    'mfa_recovery_codes @> jsonb_build_array(cast(? as text))',
                    [hash]
                )]: true,
            },
            {
                mfaRecoveryCodes: raw('mfa_recovery_codes - cast(? as text)', [
                    hash,
                ]),
            }
        );
        return claimed === 1;
    }
}
