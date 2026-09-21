import {
    Controller,
    Get,
    HttpCode,
    HttpStatus,
    NotFoundException,
    Param,
    ParseUUIDPipe,
    Post,
    UseGuards,
} from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import { UserEntity } from 'src/modules/user/repository/entities/user.entity';
import { ResetPasswordEntity } from 'src/modules/reset-password/repository/entities/reset-password.entity';
import { InvitationEntity } from 'src/modules/invitation/repository/entities/invitation.entity';
import { ENUM_INVITATION_STATUS } from 'src/modules/invitation/enums/invitation.enum';
import { TestHelpersGuard } from './test-helpers.guard';

@Controller({ version: '1', path: '/test-helpers' })
@UseGuards(TestHelpersGuard)
export class TestHelpersController {
    constructor(private readonly em: EntityManager) {}

    @Post('/confirm-email/:userId')
    @HttpCode(HttpStatus.NO_CONTENT)
    async confirmEmail(
        @Param('userId', ParseUUIDPipe) userId: string
    ): Promise<void> {
        const user = await this.em.findOne(
            UserEntity,
            { id: userId },
            { populate: ['verification'] }
        );
        if (!user) throw new NotFoundException('User not found');

        user.verification.email = true;
        user.verification.emailVerifiedDate = new Date();
        await this.em.flush();
    }

    @Get('/reset-password-token/:email')
    async getResetPasswordToken(
        @Param('email') email: string
    ): Promise<{ token: string; otp: string }> {
        const record = await this.em.findOne(
            ResetPasswordEntity,
            { to: email, isActive: true, isReset: false },
            { orderBy: { createdAt: 'DESC' } }
        );
        if (!record)
            throw new NotFoundException('No active reset-password token');
        return { token: record.token, otp: record.otp };
    }

    @Get('/invite-token/:workspaceId')
    async getInviteToken(
        @Param('workspaceId', ParseUUIDPipe) workspaceId: string
    ): Promise<{ token: string }> {
        const invitation = await this.em.findOne(InvitationEntity, {
            workspace: { id: workspaceId },
            status: ENUM_INVITATION_STATUS.PENDING,
        });
        if (!invitation) throw new NotFoundException('No pending invitation');
        return { token: invitation.token };
    }
}
