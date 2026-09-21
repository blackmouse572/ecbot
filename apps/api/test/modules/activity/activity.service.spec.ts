import { ActivityService } from '../../../src/modules/activity/services/activity.service';

describe('ActivityService.mapList', () => {
    const build = () => new ActivityService({} as any);

    const entity = () => ({
        id: 'act1',
        action: 'create',
        subject: 'CHATBOT',
        createdAt: new Date('2026-07-01T00:00:00.000Z'),
        metadata: { id: 'c1', name: 'My Chatbot' },
        user: {
            id: 'u1',
            name: 'Alice',
            username: 'alice',
            email: 'alice@example.com',
            password: 'user-hash',
            salt: 'user-salt',
            role: { id: 'r1', permissions: [{ subject: 'CHATBOT', action: ['manage'] }] },
        },
        by: {
            id: 'b1',
            name: 'Bob',
            username: 'bob',
            email: 'bob@example.com',
            password: 'by-hash',
            salt: 'by-salt',
            role: { id: 'r1', permissions: [{ subject: 'CHATBOT', action: ['manage'] }] },
        },
        workspace: {
            id: 'w1',
            name: 'Acme',
            invitationCode: 'ABC123',
            owner: {
                id: 'u1',
                name: 'Alice',
                password: 'user-hash',
                role: { id: 'r1', permissions: [] },
            },
        },
    });

    it('collapses the populated user relation to its id, not the full entity', () => {
        const service = build();

        const [dto] = service.mapList([entity() as any]);

        expect(dto.user).toBe('u1');
        expect(typeof dto.user).toBe('string');
    });

    it('narrows `by` through UserShortResponseDto and drops role/credentials', () => {
        const service = build();

        const [dto] = service.mapList([entity() as any]);

        expect(dto.by).toMatchObject({
            id: 'b1',
            name: 'Bob',
            email: 'bob@example.com',
        });
        expect((dto.by as any).password).toBeUndefined();
        expect((dto.by as any).salt).toBeUndefined();
        expect((dto.by as any).role).toBeUndefined();
    });

    it('never exposes the populated workspace (with its nested owner/role)', () => {
        const service = build();

        const [dto] = service.mapList([entity() as any]);

        expect((dto as any).workspace).toBeUndefined();
    });
});
