import { toReplyToDto } from '../../../src/modules/conversation/utils/message-reply-to.util';

describe('toReplyToDto', () => {
    it('drops the platform id of the quoted message', () => {
        expect(
            toReplyToDto({
                kind: 'message',
                externalId: 'mid.1',
                messageId: 'm-1',
                text: 'Size M?',
                fromCustomer: false,
            })
        ).toEqual({
            kind: 'message',
            messageId: 'm-1',
            text: 'Size M?',
            fromCustomer: false,
        });
    });

    it('keeps a story reply and an absent reply as they are', () => {
        expect(toReplyToDto({ kind: 'story' })).toEqual({ kind: 'story' });
        expect(toReplyToDto(undefined)).toBeUndefined();
    });
});
