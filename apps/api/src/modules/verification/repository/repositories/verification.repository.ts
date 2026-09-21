import { DatabaseRepository } from '@app/common/database/bases/database.repository';
import { EntityManager } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';
import { ENUM_VERIFICATION_TYPE } from '../../enums/verification.enum.constant';
import { VerificationEntity } from '../entity/verification.entity';

@Injectable()
export class VerificationRepository extends DatabaseRepository<VerificationEntity> {
    constructor(em: EntityManager) {
        super(em, VerificationEntity);
    }

    async findByOtp(otp: string): Promise<VerificationEntity | null> {
        return this.findOne({ otp });
    }

    async findValidByOtp(otp: string): Promise<VerificationEntity | null> {
        return this.findOne({
            otp,
            expiredDate: { $gt: new Date() },
            isActive: true,
            isVerify: false,
        });
    }

    async findByUserAndType(
        userId: string,
        type: ENUM_VERIFICATION_TYPE
    ): Promise<VerificationEntity | null> {
        return this.findOne({ user: userId, type });
    }

    async markAsVerified(verificationId: string): Promise<VerificationEntity> {
        const verification = await this.findOne({ id: verificationId });
        verification.isVerify = true;
        verification.verifyDate = new Date();
        await this.em.persistAndFlush(verification);
        return verification;
    }

    async findExpired(): Promise<VerificationEntity[]> {
        return this.find({
            expiredDate: { $lt: new Date() },
            isActive: true,
        });
    }

    async findByReference(
        reference: string
    ): Promise<VerificationEntity | null> {
        return this.findOne({ reference });
    }
}
