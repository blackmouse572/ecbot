import { EntityManager } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { ENUM_RESET_PASSWORD_TYPE } from 'src/modules/reset-password/enums/reset-password.enum';
import { ResetPasswordEntity } from 'src/modules/reset-password/repository/entities/reset-password.entity';
import { UserEntity } from 'src/modules/user/repository/entities/user.entity';

@Injectable()
export class MigrationResetPasswordSeed {
    constructor(private readonly em: EntityManager) {}

    async seeds(): Promise<void> {
        // Find test users for reset password creation
        const users = await this.em.find(UserEntity, {}, { limit: 3 });

        if (users.length === 0) {
            console.log(
                'No users found for reset password seeding. Please seed users first.'
            );
            return;
        }

        const resetPasswordData = [
            {
                user: users[0],
                to: users[0].email,
                otp: this.generateOtp(),
                token: this.generateToken(),
                type: ENUM_RESET_PASSWORD_TYPE.EMAIL,
                expiredDate: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes from now
                isReset: false,
                isActive: true,
                reference: this.generateReference(),
            },
            {
                user: users[1],
                to: users[1].email,
                otp: this.generateOtp(),
                token: this.generateToken(),
                type: ENUM_RESET_PASSWORD_TYPE.EMAIL,
                expiredDate: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes from now
                isReset: true,
                isActive: false,
                resetDate: new Date(),
                verifyDate: new Date(),
                reference: this.generateReference(),
            },
            {
                user: users[2],
                to: users[2].email,
                otp: this.generateOtp(),
                token: this.generateToken(),
                type: ENUM_RESET_PASSWORD_TYPE.EMAIL,
                expiredDate: new Date(Date.now() - 10 * 60 * 1000), // 10 minutes ago (expired)
                isReset: false,
                isActive: false,
                reference: this.generateReference(),
            },
        ];

        for (const resetPasswordDataItem of resetPasswordData) {
            const resetPassword = this.em.create(
                ResetPasswordEntity,
                resetPasswordDataItem
            );
            this.em.persist(resetPassword);
        }

        await this.em.flush();
    }

    async remove(): Promise<void> {
        await this.em.nativeDelete(ResetPasswordEntity, {});
    }

    private generateOtp(): string {
        // Generate 6-digit OTP
        return Math.floor(100000 + Math.random() * 900000).toString();
    }

    private generateToken(): string {
        return randomBytes(10).toString('hex');
    }

    private generateReference(): string {
        return randomBytes(16).toString('hex');
    }
}
