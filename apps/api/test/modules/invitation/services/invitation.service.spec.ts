import { NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { randomUUID } from 'crypto';
import { InvitationService } from '../../../../src/modules/invitation/services/invitation.service';
import { InvitationRepository } from '../../../../src/modules/invitation/repository/repositories/invitation.repository';
import { ENUM_INVITATION_STATUS } from '../../../../src/modules/invitation/enums/invitation.enum';
import { RoleEntity } from '../../../../src/modules/role/repository/entities/role.entity';

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
                {
                    provide: ConfigService,
                    useValue: {
                        get: jest.fn(() => 'https://app.configured.test'),
                    },
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
        it('should set status ACCEPTED with acceptedAt + the acceptedByUser relation', async () => {
            const id = randomUUID();
            const userId = randomUUID();
            mockInvitationRepository.updateEntity.mockResolvedValue({ id });

            await service.accept(id, userId);

            expect(mockInvitationRepository.updateEntity).toHaveBeenCalledWith(
                { id },
                expect.objectContaining({
                    status: ENUM_INVITATION_STATUS.ACCEPTED,
                    // The mapped relation; a bare acceptedByUserId was never saved.
                    acceptedByUser: { id: userId },
                    acceptedAt: expect.any(Date),
                }),
                undefined
            );
        });
    });

    describe('updateRole', () => {
        it('writes the role relation, so the change is persisted', async () => {
            const id = randomUUID();
            mockInvitationRepository.updateEntity.mockResolvedValue({ id });

            await service.updateRole(id, 'role-2');

            expect(mockInvitationRepository.updateEntity).toHaveBeenCalledWith(
                { id },
                { role: { id: 'role-2' } },
                undefined
            );
        });

        it('clears the role when none is given', async () => {
            const id = randomUUID();

            await service.updateRole(id);

            expect(mockInvitationRepository.updateEntity).toHaveBeenCalledWith(
                { id },
                { role: null },
                undefined
            );
        });
    });

    describe('revoke', () => {
        it('should set status REVOKED with revokedAt + the revokedByUser relation', async () => {
            const id = randomUUID();
            const userId = randomUUID();
            mockInvitationRepository.updateEntity.mockResolvedValue({ id });

            await service.revoke(id, userId);

            expect(mockInvitationRepository.updateEntity).toHaveBeenCalledWith(
                { id },
                expect.objectContaining({
                    status: ENUM_INVITATION_STATUS.REVOKED,
                    revokedByUser: { id: userId },
                    revokedAt: expect.any(Date),
                }),
                undefined
            );
        });
    });

    describe('findPendingForEmail', () => {
        it('finds only pending, unexpired invitations to the lowercased email in live workspaces', async () => {
            mockInvitationRepository.find.mockResolvedValue([]);

            await service.findPendingForEmail('An@Mail.com');

            const [filter, options] =
                mockInvitationRepository.find.mock.calls[0];
            expect(filter).toEqual({
                inviteeEmail: 'an@mail.com',
                status: ENUM_INVITATION_STATUS.PENDING,
                expiresAt: { $gt: expect.any(Date) },
                workspace: { deleted: false },
            });
            // Expired ones are excluded by the database, not later.
            expect(filter.expiresAt.$gt.getTime()).toBeLessThanOrEqual(
                Date.now()
            );
            expect(options.populate).toEqual(['workspace', 'inviter', 'role']);
            expect(options.limit).toBe(50);
        });

        it('narrows to one invitation id or one workspace', async () => {
            mockInvitationRepository.find.mockResolvedValue([]);

            await service.findPendingForEmail('an@mail.com', {
                id: 'inv-1',
                workspace: 'ws-1',
            });

            expect(
                mockInvitationRepository.find.mock.calls[0][0]
            ).toMatchObject({
                id: 'inv-1',
                inviteeEmail: 'an@mail.com',
                workspace: { id: 'ws-1', deleted: false },
            });
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

    describe('mapDetail / mapList', () => {
        // Rows written before the placeholder-domain fix still hold
        // `https://app.example.com/join?token=<live-jwt>`, so the link is
        // rebuilt on read rather than served from the column.
        const stale = {
            id: randomUUID(),
            token: 'stored-jwt',
            invitationLink: 'https://app.example.com/join?token=stored-jwt',
        } as any;

        // `role` is an unpopulated ManyToOne reference on the entity; the
        // DTOs promise its id as a string (the app matches it to a select).
        it('sends the role as its id, not the reference object', async () => {
            const row = {
                ...stale,
                role: Object.assign(new RoleEntity(), { id: 'r-1' }),
            };

            const [listed] = await service.mapList([row]);
            const detail = await service.mapDetail(row);

            expect(listed.role).toBe('r-1');
            expect(detail.roleId).toBe('r-1');
        });

        it('leaves the role empty when the invitation has none', async () => {
            const [listed] = await service.mapList([{ ...stale, role: null }]);

            expect(listed.role).toBeUndefined();
        });

        it('rebuilds a stale link from the configured client URL', async () => {
            const result = await service.mapDetail(stale);

            expect(result.invitationLink).toBe(
                'https://app.configured.test/join?tokens=stored-jwt'
            );
        });

        it('rebuilds stale links for every row in a list', async () => {
            const result = await service.mapList([stale]);

            expect(result[0].invitationLink).toBe(
                'https://app.configured.test/join?tokens=stored-jwt'
            );
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
