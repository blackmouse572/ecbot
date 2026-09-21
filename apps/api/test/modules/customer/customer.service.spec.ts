import { NotFoundException } from '@nestjs/common';
import { ENUM_ACCOUNT_TYPE } from '../../../src/modules/account/enums/account.enum';
import { CustomerService } from '../../../src/modules/customer/services/customer.service';

describe('CustomerService', () => {
    let service: CustomerService;

    const mockCustomerRepository = {
        findOneById: jest.fn(),
        findByWorkspace: jest.fn(),
        create: jest.fn(),
        updateEntity: jest.fn(),
    };

    const mockContactPointRepository = {
        findByWorkspacePlatformSender: jest.fn(),
        create: jest.fn(),
        updateEntity: jest.fn(),
        findByCustomer: jest.fn(),
    };

    beforeEach(() => {
        jest.clearAllMocks();
        service = new CustomerService(
            mockCustomerRepository as any,
            mockContactPointRepository as any,
            { get: jest.fn() } as any
        );
    });

    describe('resolveContactPoint', () => {
        const params = {
            workspaceId: 'workspace-1',
            platform: ENUM_ACCOUNT_TYPE.FACEBOOK_PAGE,
            externalSenderId: 'sender-fb-1',
        };

        it('creates a fresh Customer + ContactPoint on first sight of a (workspace, platform, sender) tuple', async () => {
            mockContactPointRepository.findByWorkspacePlatformSender.mockResolvedValue(
                null
            );
            mockCustomerRepository.create.mockResolvedValue({ id: 'cust-1' });
            mockContactPointRepository.create.mockResolvedValue({
                id: 'cp-1',
                customer: { id: 'cust-1' },
            });

            const result = await service.resolveContactPoint(params);

            expect(mockCustomerRepository.create).toHaveBeenCalledTimes(1);
            expect(mockContactPointRepository.create).toHaveBeenCalledTimes(1);
            expect(mockContactPointRepository.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    platform: ENUM_ACCOUNT_TYPE.FACEBOOK_PAGE,
                    externalSenderId: 'sender-fb-1',
                    workspace: { id: 'workspace-1' },
                    customer: { id: 'cust-1' },
                })
            );
            expect(result.created).toBe(true);
            expect(result.customerId).toBe('cust-1');
            expect(result.contactPoint.id).toBe('cp-1');
        });

        it('returns the SAME ContactPoint + customerId on subsequent calls for the same tuple', async () => {
            const existing = {
                id: 'cp-existing',
                customer: { id: 'cust-existing' },
            };
            mockContactPointRepository.findByWorkspacePlatformSender.mockResolvedValue(
                existing
            );

            const result = await service.resolveContactPoint(params);

            expect(mockCustomerRepository.create).not.toHaveBeenCalled();
            expect(mockContactPointRepository.create).not.toHaveBeenCalled();
            expect(result.created).toBe(false);
            expect(result.contactPoint).toBe(existing);
            expect(result.customerId).toBe('cust-existing');
        });

        it('does NOT merge across distinct externalSenderIds — same workspace+platform but different sender produces two lookups', async () => {
            mockContactPointRepository.findByWorkspacePlatformSender
                .mockResolvedValueOnce(null)
                .mockResolvedValueOnce(null);
            mockCustomerRepository.create
                .mockResolvedValueOnce({ id: 'cust-a' })
                .mockResolvedValueOnce({ id: 'cust-b' });
            mockContactPointRepository.create
                .mockResolvedValueOnce({
                    id: 'cp-a',
                    customer: { id: 'cust-a' },
                })
                .mockResolvedValueOnce({
                    id: 'cp-b',
                    customer: { id: 'cust-b' },
                });

            const a = await service.resolveContactPoint({
                ...params,
                externalSenderId: 'sender-A',
            });
            const b = await service.resolveContactPoint({
                ...params,
                externalSenderId: 'sender-B',
            });

            expect(a.customerId).not.toBe(b.customerId);
            expect(mockCustomerRepository.create).toHaveBeenCalledTimes(2);
        });
    });

    describe('fillCustomerNameIfEmpty', () => {
        it('writes the name when the customer.name is null/undefined', async () => {
            mockCustomerRepository.findOneById.mockResolvedValue({
                id: 'cust-1',
                name: undefined,
            });

            await service.fillCustomerNameIfEmpty('cust-1', 'Alice');

            expect(mockCustomerRepository.updateEntity).toHaveBeenCalledWith(
                { id: 'cust-1' },
                { name: 'Alice' }
            );
        });

        it('does NOT overwrite an operator-set Customer.name', async () => {
            mockCustomerRepository.findOneById.mockResolvedValue({
                id: 'cust-1',
                name: 'Operator-Chosen Name',
            });

            await service.fillCustomerNameIfEmpty(
                'cust-1',
                'Profile Name From Platform'
            );

            expect(mockCustomerRepository.updateEntity).not.toHaveBeenCalled();
        });

        it('is a no-op when the incoming name is empty', async () => {
            await service.fillCustomerNameIfEmpty('cust-1', undefined);
            await service.fillCustomerNameIfEmpty('cust-1', '');

            expect(mockCustomerRepository.findOneById).not.toHaveBeenCalled();
            expect(mockCustomerRepository.updateEntity).not.toHaveBeenCalled();
        });

        it('is a no-op when the customer does not exist', async () => {
            mockCustomerRepository.findOneById.mockResolvedValue(null);

            await service.fillCustomerNameIfEmpty('cust-missing', 'Alice');

            expect(mockCustomerRepository.updateEntity).not.toHaveBeenCalled();
        });
    });

    describe('updateContactPointProfile', () => {
        it('writes displaySenderName + senderAvatar + fetchedAt to the ContactPoint', async () => {
            const fetchedAt = new Date('2026-06-15T10:00:00Z');
            mockContactPointRepository.updateEntity.mockResolvedValue({});

            await service.updateContactPointProfile('cp-1', {
                displaySenderName: 'Alice',
                senderAvatar: 'data:image/jpeg;base64,xyz',
                fetchedAt,
            });

            expect(
                mockContactPointRepository.updateEntity
            ).toHaveBeenCalledWith(
                { id: 'cp-1' },
                {
                    displaySenderName: 'Alice',
                    senderAvatar: 'data:image/jpeg;base64,xyz',
                    fetchedAt,
                }
            );
        });

        it('passes a null avatar through unchanged (clears stale data)', async () => {
            mockContactPointRepository.updateEntity.mockResolvedValue({});

            await service.updateContactPointProfile('cp-1', {
                displaySenderName: 'Alice',
                senderAvatar: null,
                fetchedAt: new Date(),
            });

            const [, patch] =
                mockContactPointRepository.updateEntity.mock.calls[0];
            expect(patch.senderAvatar).toBeNull();
        });
    });

    describe('update (operator edit)', () => {
        it('round-trips all editable fields and returns the updated entity', async () => {
            const existing = { id: 'cust-1', name: 'Old' };
            const updated = {
                id: 'cust-1',
                name: 'New Name',
                phone: '+84 909 000 000',
                email: 'a@b.co',
                language: 'vi',
                notes: 'VIP customer',
                profileSummary: 'Long-time buyer',
            };
            mockCustomerRepository.findOneById.mockResolvedValue(existing);
            mockCustomerRepository.updateEntity.mockResolvedValue(updated);

            const result = await service.update('cust-1', {
                name: 'New Name',
                phone: '+84 909 000 000',
                email: 'a@b.co',
                language: 'vi',
                notes: 'VIP customer',
                profileSummary: 'Long-time buyer',
            });

            expect(mockCustomerRepository.updateEntity).toHaveBeenCalledWith(
                { id: 'cust-1' },
                expect.objectContaining({
                    name: 'New Name',
                    phone: '+84 909 000 000',
                    email: 'a@b.co',
                    language: 'vi',
                    notes: 'VIP customer',
                    profileSummary: 'Long-time buyer',
                })
            );
            expect(result).toEqual(updated);
        });

        it('throws NotFoundException when the customer does not exist', async () => {
            mockCustomerRepository.findOneById.mockResolvedValue(null);

            await expect(
                service.update('cust-missing', { name: 'x' })
            ).rejects.toBeInstanceOf(NotFoundException);
            expect(mockCustomerRepository.updateEntity).not.toHaveBeenCalled();
        });

        it('throws NotFoundException when the update returns null (race / concurrent delete)', async () => {
            mockCustomerRepository.findOneById.mockResolvedValue({
                id: 'cust-1',
            });
            mockCustomerRepository.updateEntity.mockResolvedValue(null);

            await expect(
                service.update('cust-1', { name: 'x' })
            ).rejects.toBeInstanceOf(NotFoundException);
        });
    });

    describe('mapGet / mapList', () => {
        it('mapGet returns the canonical response shape', () => {
            const dto = service.mapGet({
                id: 'cust-1',
                name: 'Alice',
                phone: '+84',
                email: 'a@b.co',
                createdAt: new Date('2026-06-15T00:00:00Z'),
            } as any);

            expect(dto.id).toBe('cust-1');
            expect(dto.name).toBe('Alice');
            expect(dto.email).toBe('a@b.co');
        });

        it('mapList preserves count', () => {
            const result = service.mapList([
                { id: 'a', createdAt: new Date() } as any,
                { id: 'b', createdAt: new Date() } as any,
            ]);
            expect(result).toHaveLength(2);
        });
    });
});
