import { isMarketingOptOutMessage } from '../../../src/modules/customer/utils/customer-marketing-opt-out.util';

describe('isMarketingOptOutMessage', () => {
    it.each([
        'dừng',
        'Dừng',
        'DỪNG',
        ' dừng. ',
        'dừng!',
        'dung',
        'DUNG',
        'stop',
        'STOP',
        // Decomposed Unicode, as some keyboards send it.
        'dừng'.normalize('NFD'),
    ])('opts out on %j', text => {
        expect(isMarketingOptOutMessage(text)).toBe(true);
    });

    it.each([
        'dừng lại giúp mình',
        'đừng gửi nữa',
        'Dũng',
        'dùng',
        'mình tên Dũng',
        'stop please',
        'không',
        '',
        undefined,
        null,
    ])('does not opt out on %j', text => {
        expect(isMarketingOptOutMessage(text as string)).toBe(false);
    });
});
