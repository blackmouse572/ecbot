import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { randomUUID } from 'crypto';
import { InvitationService } from '../../../../src/modules/invitation/services/invitation.service';
import { InvitationRepository } from '../../../../src/modules/invitation/repository/repositories/invitation.repository';
import { ENUM_INVITATION_STATUS } from '../../../../src/modules/invitation/enums/invitation.enum';

describe('InvitationService', () => {
    let service: InvitationService;

    const mockEm = {
        getReference: jest.fn((_entity: any, id: any) => ({ id })),
    };

    const mockInvitationRepository = {
        findOneById: jest.fn(),
        findOne: jest.fn(),
        find: jest.fn(),
        create: jest.fn(),
        updateEntity: jest.fn(),
        getTotal: jest.fn(),
        deleteMany: jest.fn(),
        getEntityManager: jest.fn(() => mockEm),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                InvitationService,
                {
                    provide: InvitationRepository,
                    useValue: mockInvitationRepository,
                },
            ],
        }).compile();

        service = module.get<InvitationService>(InvitationService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('findOneById', () => {
        it('should return the invitation when found', async () => {
            const invitation = { id: randomUUID() };
            mockInvitationRepository.findOneById.mockResolvedValue(invitation);

            const result = await service.findOneById(invitation.id);

            expect(result).toBe(invitation);
        });

        it('should throw NotFoundException when missing', async () => {
            mockInvitationRepository.findOneById.mockResolvedValue(null);

            await expect(service.findOneById(randomUUID())).rejects.toThrow(
                NotFoundException
            );
        });
    });

    describe('findOneByToken', () => {
        it('should query by token and return the invitation', async () => {
            const invitation = { id: randomUUID(), token: 'jwt-token' };
            mockInvitationRepository.findOne.mockResolvedValue(invitation);

            const result = await service.findOneByToken('jwt-token');

            expect(result).toBe(invitation);
            expect(mockInvitationRepository.findOne).toHaveBeenCalledWith(
                { token: 'jwt-token' },
                undefined
            );
        });

        it('should throw NotFoundException when token has no invitation', async () => {
            mockInvitationRepository.findOne.mockResolvedValue(null);

            await expect(service.findOneByToken('nope')).rejects.toThrow(
                NotFoundException
            );
        });
    });

    describe('findByEmail', () => {
        it('should lowercase the email before querying', async () => {
            mockInvitationRepository.find.mockResolvedValue([]);

            await service.findByEmail('Person@MAIL.com');

            expect(mockInvitationRepository.find).toHaveBeenCalledWith(
                { inviteeEmail: 'person@mail.com' },
                expect.objectContaining({
                    order: { createdAt: expect.anything() },
                })
            );
        });
    });

    describe('create', () => {
        it('should build a PENDING invitation entity with server-provided token/link', async () => {
            const expiresAt = new Date('2026-08-30T00:00:00Z');
            const dto = {
                workspace: randomUUID(),
                user: randomUUID(),
                role: randomUUID(),
                email: 'Invitee@Mail.com',
                token: 'signed-jwt',
                expiresAt,
                invitationLink: 'https://app/join?tokens=signed-jwt',
            };
            mockInvitationRepository.create.mockImplementation(
                (entity: any) => entity
            );

            const result: any = await service.create(dto as any);

            expect(result.status).toBe(ENUM_INVITATION_STATUS.PENDING);
            expect(result.token).toBe('signed-jwt');
            expect(result.inviteeEmail).toBe('invitee@mail.com');
            expect(result.expiresAt).toBe(expiresAt);
            expect(result.invitationLink).toBe(
                'https://app/join?tokens=signed-jwt'
            );
        });
    });

    describe('accept', () => {
        it('should set status ACCEPTED with acceptedAt + acceptedByUserId', async () => {
            const id = randomUUID();
            const userId = randomUUID();
            mockInvitationRepository.updateEntity.mockResolvedValue({ id });

            await service.accept(id, userId);

            expect(mockInvitationRepository.updateEntity).toHaveBeenCalledWith(
                { id },
                expect.objectContaining({
                    status: ENUM_INVITATION_STATUS.ACCEPTED,
                    acceptedByUserId: userId,
                    acceptedAt: expect.any(Date),
                }),
                undefined
            );
        });
    });

    describe('revoke', () => {
        it('should set status REVOKED with revokedAt + revokedByUserId', async () => {
            const id = randomUUID();
            const userId = randomUUID();
            mockInvitationRepository.updateEntity.mockResolvedValue({ id });

            await service.revoke(id, userId);

            expect(mockInvitationRepository.updateEntity).toHaveBeenCalledWith(
                { id },
                expect.objectContaining({
                    status: ENUM_INVITATION_STATUS.REVOKED,
                    revokedByUserId: userId,
                    revokedAt: expect.any(Date),
                }),
                undefined
            );
        });
    });

    describe('regenerateToken', () => {
        it('should reset status to PENDING with a new token/link/expiry', async () => {
            const id = randomUUID();
            const expiresAt = new Date('2026-09-30T00:00:00Z');
            mockInvitationRepository.updateEntity.mockResolvedValue({ id });

            await service.regenerateToken(
                id,
                'new-jwt',
                expiresAt,
                'https://app/join?tokens=new-jwt'
            );

            expect(mockInvitationRepository.updateEntity).toHaveBeenCalledWith(
                { id },
                {
                    token: 'new-jwt',
                    expiresAt,
                    invitationLink: 'https://app/join?tokens=new-jwt',
                    status: ENUM_INVITATION_STATUS.PENDING,
                },
                undefined
            );
        });
    });

    describe('checkExistingInvitation', () => {
        it('should look for a PENDING invitation for the (workspace, email)', async () => {
            const workspaceId = randomUUID();
            mockInvitationRepository.findOne.mockResolvedValue(null);

            const result = await service.checkExistingInvitation(
                workspaceId,
                'Someone@Mail.com'
            );

            expect(result).toBeNull();
            expect(mockInvitationRepository.findOne).toHaveBeenCalledWith({
                workspace: workspaceId,
                inviteeEmail: 'someone@mail.com',
                status: ENUM_INVITATION_STATUS.PENDING,
            });
        });
    });

    describe('deleteMany', () => {
        it('should return true when rows were deleted', async () => {
            mockInvitationRepository.deleteMany.mockResolvedValue([
                { id: '1' },
            ]);

            const result = await service.deleteMany({ workspace: 'w' });

            expect(result).toBe(true);
        });

        it('should return false when nothing was deleted', async () => {
            mockInvitationRepository.deleteMany.mockResolvedValue([]);

            const result = await service.deleteMany({ workspace: 'w' });

            expect(result).toBe(false);
        });
    });
});
