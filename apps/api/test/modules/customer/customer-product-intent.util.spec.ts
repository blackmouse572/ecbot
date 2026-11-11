import { ENUM_CUSTOMER_JOURNEY_STAGE as STAGE } from '../../../src/modules/customer/enums/customer-marketing.enum';
import { activeProductIntents } from '../../../src/modules/customer/utils/customer-product-intent.util';

// Repeat buyers: an intent (interest, price question) counts until a
// confirmed order with that product group comes after it.

const day = (d: string) => new Date(`2026-${d}T00:00:00Z`);
const serum = { id: 'serum', name: 'Serum' } as any;
const toner = { id: 'toner', name: 'Toner' } as any;
const intent = (productGroup: any, stage: STAGE, at: string) =>
    ({ productGroup, newValue: stage, createdAt: day(at) }) as any;
const order = (groupIds: (string | null)[], at: string) => ({
    orderedAt: day(at),
    productGroupIds: groupIds,
});

describe('activeProductIntents', () => {
    it('keeps the latest intent per product group and stage', () => {
        const result = activeProductIntents(
            [
                intent(serum, STAGE.ASKED_PRICE, '11-05'),
                intent(serum, STAGE.ASKED_PRICE, '10-01'),
                intent(serum, STAGE.INTERESTED, '09-01'),
            ],
            []
        );
        expect(result).toEqual([
            { productGroup: serum, stage: STAGE.ASKED_PRICE, at: day('11-05') },
            { productGroup: serum, stage: STAGE.INTERESTED, at: day('09-01') },
        ]);
    });

    it('drops an intent once a confirmed order with that group comes after it', () => {
        const result = activeProductIntents(
            [
                intent(serum, STAGE.ASKED_PRICE, '10-01'),
                intent(toner, STAGE.INTERESTED, '10-01'),
            ],
            [order(['serum'], '10-03')]
        );
        expect(result).toEqual([
            { productGroup: toner, stage: STAGE.INTERESTED, at: day('10-01') },
        ]);
    });

    it('keeps an intent that came after the last order: the repeat buyer is back', () => {
        const result = activeProductIntents(
            [intent(serum, STAGE.ASKED_PRICE, '11-01')],
            [order(['serum'], '10-03')]
        );
        expect(result).toHaveLength(1);
    });

    it('drops interest in the shop in general after any later order', () => {
        const result = activeProductIntents(
            [intent(null, STAGE.INTERESTED, '10-01')],
            [order([null], '10-02')]
        );
        expect(result).toEqual([]);
    });
});
