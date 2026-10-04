import { UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EntityManager } from '@mikro-orm/postgresql';
import { AuthPublicController } from '@app/modules/auth/controllers/auth.public.controller';
import { UserService } from '@app/modules/user/services/user.service';
import { AuthService } from '@app/modules/auth/services/auth.service';
import { CountryService } from '@app/modules/country/services/country.service';
import { RoleService } from '@app/modules/role/services/role.service';
import { PasswordHistoryService } from '@app/modules/password-history/services/password-history.service';
import { VerificationService } from '@app/modules/verification/services/verification.service';
import { SessionService } from '@app/modules/session/services/session.service';
import { ActivityService } from '@app/modules/activity/services/activity.service';
import { MessageService } from '@app/common/message/services/message.service';
import { TurnstileService } from '@app/common/turnstile/services/turnstile.service';
import { ApiKeyService } from '@app/modules/api-key/services/api-key.service';
import { HelperDateService } from '@app/common/helper/services/helper.date.service';
import { CloudTasksQueueClient } from '@app/worker/cloud-tasks-queue.client';
import { ImpersonationService } from '@app/modules/auth/services/impersonation.service';
import { ENUM_AUTH_STATUS_CODE_ERROR } from '@app/modules/auth/enums/auth.status-code.enum';

describe('AuthPublicController.impersonateExchange', () => {
    let controller: AuthPublicController;

    const consume = jest.fn();

    beforeEach(async () => {
        consume.mockReset();

        const module: TestingModule = await Test.createTestingModule({
            controllers: [AuthPublicController],
            providers: [
                { provide: EntityManager, useValue: {} },
                { provide: CloudTasksQueueClient, useValue: {} },
                { provide: ConfigService, useValue: { get: jest.fn() } },
                { provide: ApiKeyService, useValue: {} },
                { provide: HelperDateService, useValue: {} },
                { provide: UserService, useValue: {} },
                { provide: AuthService, useValue: {} },
                { provide: CountryService, useValue: {} },
                { provide: RoleService, useValue: {} },
                { provide: PasswordHistoryService, useValue: {} },
                { provide: VerificationService, useValue: {} },
                { provide: SessionService, useValue: {} },
                { provide: ActivityService, useValue: {} },
                { provide: MessageService, useValue: {} },
                { provide: TurnstileService, useValue: {} },
                { provide: ImpersonationService, useValue: { consume } },
            ],
        }).compile();

        controller = module.get(AuthPublicController);
    });

    it('returns the token + user for a valid code', async () => {
        consume.mockResolvedValue({
            tokenType: 'Bearer',
            roleType: 'USER',
            accessToken: 'jwt',
            expiresIn: 600,
            impersonatedBy: 'admin-1',
            session: 's1',
            target: { id: 'u1', name: 'A', email: 'a@x.com' },
        });

        const res = await controller.impersonateExchange({ code: 'c' } as any);

        expect(consume).toHaveBeenCalledWith('c');
        expect(res).toEqual({
            data: {
                tokenType: 'Bearer',
                roleType: 'USER',
                expiresIn: 600,
                accessToken: 'jwt',
                impersonatedBy: 'admin-1',
                user: { id: 'u1', name: 'A', email: 'a@x.com' },
            },
        });
    });

    it('401s a consumed / unknown code', async () => {
        consume.mockResolvedValue(null);

        await expect(
            controller.impersonateExchange({ code: 'c' } as any)
        ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('401 carries the IMPERSONATE_CODE_INVALID status code + i18n message', async () => {
        consume.mockResolvedValue(null);

        await expect(
            controller.impersonateExchange({ code: 'c' } as any)
        ).rejects.toMatchObject({
            response: {
                statusCode:
                    ENUM_AUTH_STATUS_CODE_ERROR.IMPERSONATE_CODE_INVALID,
                message: 'auth.error.impersonateCodeInvalid',
            },
        });
    });
});
