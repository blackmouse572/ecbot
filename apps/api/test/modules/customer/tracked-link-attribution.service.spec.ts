import { ENUM_CUSTOMER_TAG_EVENT_ACTOR } from '../../../src/modules/customer/enums/customer-tag.enum';
import { ENUM_TRACKED_LINK_STATUS } from '../../../src/modules/customer/enums/tracked-link.enum';
import { TrackedLinkAttributionService } from '../../../src/modules/customer/services/tracked-link-attribution.service';

// #503 part 3: a code read on an inbound message becomes the customer's
// source: logged, first source kept, offer opt-in, the source's tags, and the
// greeting the agent sends.
describe('TrackedLinkAttributionService', () => {
    const source = {
        id: 'src-tet',
        status: ENUM_TRACKED_LINK_STATUS.ACTIVE,
        greeting: ' Chào bạn, shop tặng mã giảm 10%. ',
        tagIds: ['tag-tet', 'tag-gone'],
        promisesOffer: true,
        parent: null,
    };
    const kol = {
        id: 'kol-linh',
        status: ENUM_TRACKED_LINK_STATUS.ACTIVE,
        greeting: null,
        tagIds: [],
        promisesOffer: false,
        parent: source,
    };
    const links: Record<string, any> = {
        'to-roi-tet': source,
        'to-roi-tet-linh-dan': kol,
    };
    const trackedLinkRepository = {
        findOne: jest.fn(async (where: any) =>
            where.workspace === 'w1' ? (links[where.code] ?? null) : null
        ),
    };
    const marketing = { recordSource: jest.fn(async () => true) };
    const tags = {
        apply: jest.fn(async (_c: string, tagId: string) => {
            if (tagId === 'tag-gone')
                throw new Error('customerTag.error.notFound');
            return {};
        }),
    };
    const service = new TrackedLinkAttributionService(
        trackedLinkRepository as any,
        marketing as any,
        tags as any
    );
    const arrival = {
        customerId: 'c1',
        workspaceId: 'w1',
        code: 'to-roi-tet',
        conversationId: 'conv-1',
        messageId: 'msg-1',
    };

    beforeEach(() => jest.clearAllMocks());

    it('records the visit, tags the customer and gives the greeting', async () => {
        const result = await service.recordArrival(arrival);

        expect(marketing.recordSource).toHaveBeenCalledWith({
            customerId: 'c1',
            workspaceId: 'w1',
            trackedLinkId: 'src-tet',
            promisesOffer: true,
            conversationId: 'conv-1',
            messageId: 'msg-1',
        });
        expect(tags.apply).toHaveBeenCalledWith('c1', 'tag-tet', 'w1', {
            actor: ENUM_CUSTOMER_TAG_EVENT_ACTOR.BOT,
            conversationId: 'conv-1',
        });
        // A tag deleted since the source was made does not stop the rest.
        expect(result).toEqual({
            greeting: 'Chào bạn, shop tặng mã giảm 10%.',
        });
    });

    it("logs a QR or KOL code as itself, with its source's settings", async () => {
        const result = await service.recordArrival({
            ...arrival,
            code: 'to-roi-tet-linh-dan',
        });

        expect(marketing.recordSource).toHaveBeenCalledWith(
            expect.objectContaining({
                trackedLinkId: 'kol-linh',
                promisesOffer: true,
            })
        );
        expect(result?.greeting).toBe('Chào bạn, shop tặng mã giảm 10%.');
    });

    it('ignores an unknown code, another workspace and a stopped source', async () => {
        expect(
            await service.recordArrival({ ...arrival, code: 'khong-co' })
        ).toBeNull();
        expect(
            await service.recordArrival({ ...arrival, workspaceId: 'w2' })
        ).toBeNull();
        source.status = ENUM_TRACKED_LINK_STATUS.STOPPED;
        expect(
            await service.recordArrival({
                ...arrival,
                code: 'to-roi-tet-linh-dan',
            })
        ).toBeNull();
        source.status = ENUM_TRACKED_LINK_STATUS.ACTIVE;
        expect(marketing.recordSource).not.toHaveBeenCalled();
    });

    it('does not greet or tag again for a visit already logged', async () => {
        marketing.recordSource.mockResolvedValueOnce(false);

        expect(await service.recordArrival(arrival)).toBeNull();
        expect(tags.apply).not.toHaveBeenCalled();
    });
});
