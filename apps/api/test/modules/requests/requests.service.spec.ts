import {
    REQUEST_STATUS,
    REQUEST_TYPE,
} from '../../../src/modules/requests/constant/requests.constant';
import { RequestEntity } from '../../../src/modules/requests/repository/entities/requests.entity';
import { RequestService } from '../../../src/modules/requests/services/requests.service';
import { WorkspaceEntity } from '../../../src/modules/workspace/repository/entities/workspace.entity';

describe('RequestService', () => {
    let service: RequestService;

    const mockRepo = { find: jest.fn(), findOne: jest.fn(), count: jest.fn() };
    const mockUserService = { findOneById: jest.fn() };
    const mockWorkspaceRequestService = {};
    const mockMessageService = {};

    const workspace = { id: 'ws-1' } as WorkspaceEntity;

    beforeEach(() => {
        jest.clearAllMocks();
        service = new RequestService(
            mockRepo as any,
            mockUserService as any,
            mockWorkspaceRequestService as any,
            mockMessageService as any
        );
    });

    describe('findByWorkspace', () => {
        it('filters to pending JOIN_WORKSPACE requests of the workspace', async () => {
            mockRepo.find.mockResolvedValue([{ id: 'r1' }]);

            const result = await service.findByWorkspace(workspace);

            expect(mockRepo.find).toHaveBeenCalledWith(
                {
                    workspace: 'ws-1',
                    type: REQUEST_TYPE.JOIN_WORKSPACE,
                    status: REQUEST_STATUS.PENDING,
                },
                { populate: ['requestFrom'] }
            );
            expect(result).toEqual([{ id: 'r1' }]);
        });
    });

    describe('getTotalByWorkspace', () => {
        it('counts with the same filter', async () => {
            mockRepo.count.mockResolvedValue(3);

            await expect(service.getTotalByWorkspace(workspace)).resolves.toBe(
                3
            );
            expect(mockRepo.count).toHaveBeenCalledWith({
                workspace: 'ws-1',
                type: REQUEST_TYPE.JOIN_WORKSPACE,
                status: REQUEST_STATUS.PENDING,
            });
        });
    });

    describe('approve', () => {
        it('looks up the request scoped to the workspace and 404s when absent', async () => {
            mockRepo.findOne.mockResolvedValue(null);

            await expect(service.approve('req-1', workspace)).rejects.toThrow(
                'requests.error.notFound'
            );

            expect(mockRepo.findOne).toHaveBeenCalledWith({
                id: 'req-1',
                workspace: workspace.id,
            });
        });
    });

    describe('mapList', () => {
        it('exposes only the whitelisted request + requester fields', () => {
            const createdAt = new Date('2026-01-01T00:00:00.000Z');
            const entity = {
                id: 'r1',
                reason: 'I want in',
                status: REQUEST_STATUS.PENDING,
                type: REQUEST_TYPE.JOIN_WORKSPACE,
                createdAt,
                payload: { invitationCode: 'SECRET' },
                requestFrom: {
                    id: 'u1',
                    name: 'Alice',
                    email: 'alice@mail.com',
                    password: 'hashed',
                },
            } as unknown as RequestEntity;

            const [dto] = service.mapList([entity]);

            expect(dto).toEqual({
                id: 'r1',
                reason: 'I want in',
                status: REQUEST_STATUS.PENDING,
                createdAt: createdAt.toISOString(),
                requestFrom: {
                    id: 'u1',
                    name: 'Alice',
                    email: 'alice@mail.com',
                },
            });
            expect((dto as any).payload).toBeUndefined();
            expect((dto.requestFrom as any).password).toBeUndefined();
        });
    });
});
