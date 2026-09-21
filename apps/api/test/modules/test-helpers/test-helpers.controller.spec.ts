import { Test, TestingModule } from '@nestjs/testing';
import { EntityManager } from '@mikro-orm/postgresql';
import { TestHelpersController } from 'src/modules/test-helpers/test-helpers.controller';
import { ForbiddenException, NotFoundException } from '@nestjs/common';

describe('TestHelpersController', () => {
    let controller: TestHelpersController;
    let em: jest.Mocked<EntityManager>;

    beforeEach(async () => {
        em = {
            findOne: jest.fn(),
            fork: jest.fn().mockReturnThis(),
            flush: jest.fn(),
        } as any;

        const module: TestingModule = await Test.createTestingModule({
            controllers: [TestHelpersController],
            providers: [{ provide: EntityManager, useValue: em }],
        }).compile();

        controller = module.get(TestHelpersController);
    });

    it('confirmEmail sets verification.email = true', async () => {
        const mockUser = {
            id: 'u1',
            verification: { email: false, emailVerifiedDate: null },
        };
        em.findOne.mockResolvedValue(mockUser as any);

        await controller.confirmEmail('u1');

        expect(mockUser.verification.email).toBe(true);
        expect(mockUser.verification.emailVerifiedDate).toBeInstanceOf(Date);
        expect(em.flush).toHaveBeenCalled();
    });

    it('confirmEmail throws NotFoundException when user missing', async () => {
        em.findOne.mockResolvedValue(null);
        await expect(controller.confirmEmail('missing')).rejects.toThrow(
            NotFoundException
        );
    });

    it('getResetPasswordToken returns token and otp', async () => {
        em.findOne.mockResolvedValue({ token: 'tok123', otp: '123456' } as any);
        const result = await controller.getResetPasswordToken('test@test.com');
        expect(result).toEqual({ token: 'tok123', otp: '123456' });
    });

    it('getResetPasswordToken throws NotFoundException when no active token', async () => {
        em.findOne.mockResolvedValue(null);
        await expect(
            controller.getResetPasswordToken('x@x.com')
        ).rejects.toThrow(NotFoundException);
    });

    it('getInviteToken returns token string', async () => {
        em.findOne.mockResolvedValue({ token: 'inv456' } as any);
        const result = await controller.getInviteToken('ws1');
        expect(result).toEqual({ token: 'inv456' });
    });

    it('getInviteToken throws NotFoundException when no pending invitation', async () => {
        em.findOne.mockResolvedValue(null);
        await expect(controller.getInviteToken('ws-missing')).rejects.toThrow(
            NotFoundException
        );
    });
});
