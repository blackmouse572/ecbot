import { DatabaseRepository } from '@app/common/database/bases/database.repository';
import { EntityManager } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';
import { ResetPasswordEntity } from '../entities/reset-password.entity';

@Injectable()
export class ResetPasswordRepository extends DatabaseRepository<ResetPasswordEntity> {
    constructor(em: EntityManager) {
        super(em, ResetPasswordEntity);
    }

    async findByToken(token: string): Promise<ResetPasswordEntity | null> {
        return this.findOne({ token });
    }

    async findValidByToken(token: string): Promise<ResetPasswordEntity | null> {
        return this.findOne({
            token,
            expiredDate: { $gt: new Date() },
            isReset: false,
            isActive: true,
        });
    }

    async findByUser(userId: string): Promise<ResetPasswordEntity[]> {
        return this.find(
            { user: userId },
            { populate: ['user'], orderBy: { createdAt: 'DESC' } }
        );
    }

    async markAsReset(resetPasswordId: string): Promise<ResetPasswordEntity> {
        const resetPassword = await this.findOne({ id: resetPasswordId });
        resetPassword.isReset = true;
        resetPassword.resetDate = new Date();
        await this.em.persistAndFlush(resetPassword);
        return resetPassword;
    }

    async findExpired(): Promise<ResetPasswordEntity[]> {
        return this.find({
            expiredDate: { $lt: new Date() },
            isReset: false,
        });
    }

    async findByOtp(otp: string): Promise<ResetPasswordEntity | null> {
        return this.findOne({ otp });
    }

    async findByReference(
        reference: string
    ): Promise<ResetPasswordEntity | null> {
        return this.findOne({ reference });
    }
}
