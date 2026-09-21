import { EntityManager } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { UserEntity } from 'src/modules/user/repository/entities/user.entity';
import { ENUM_VERIFICATION_TYPE } from 'src/modules/verification/enums/verification.enum.constant';
import { VerificationEntity } from 'src/modules/verification/repository/entity/verification.entity';

@Injectable()
export class MigrationVerificationSeed {
    constructor(private readonly em: EntityManager) {}

    async seeds(): Promise<void> {
        // Find test users for verification creation
        const users = await this.em.find(UserEntity, {}, { limit: 3 });

        if (users.length === 0) {
            console.log(
                'No users found for verification seeding. Please seed users first.'
            );
            return;
        }

        const verificationData = [
            {
                user: users[0],
                to: users[0].email,
                type: ENUM_VERIFICATION_TYPE.EMAIL,
                otp: this.generateOtp(),
                expiredDate: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes from now
                isActive: true,
                isVerify: false,
                reference: this.generateReference(),
            },
            {
                user: users[1],
                to: users[1].email,
                type: ENUM_VERIFICATION_TYPE.EMAIL,
                otp: this.generateOtp(),
                expiredDate: new Date(Date.now() + 15 * 60 * 1000), // 15 minutes from now
                isActive: true,
                isVerify: true,
                verifyDate: new Date(),
                reference: this.generateReference(),
            },
            {
                user: users[2],
                to: users[2].mobileNumber?.number || '1234567890',
                type: ENUM_VERIFICATION_TYPE.MOBILE_NUMBER,
                otp: this.generateOtp(),
                expiredDate: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago (expired)
                isActive: true,
                isVerify: false,
                reference: this.generateReference(),
            },
        ];

        for (const verificationDataItem of verificationData) {
            const verification = this.em.create(
                VerificationEntity,
                verificationDataItem
            );
            this.em.persist(verification);
        }

        await this.em.flush();
    }

    async remove(): Promise<void> {
        await this.em.nativeDelete(VerificationEntity, {});
    }

    private generateOtp(): string {
        // Generate 6-digit OTP
        return Math.floor(100000 + Math.random() * 900000).toString();
    }

    private generateReference(): string {
        return randomBytes(16).toString('hex');
    }
}
