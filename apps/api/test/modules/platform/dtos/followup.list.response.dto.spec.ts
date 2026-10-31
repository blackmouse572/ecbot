import { FollowupListResponseDto } from '../../../../src/modules/platform/dtos/response/followup.list.response.dto';

describe('FollowupListResponseDto swagger', () => {
    it('types senderName as a string', () => {
        // `string | null` reflects as Object, which the generated client turns
        // into `{ [key: string]: unknown }`.
        const props = Reflect.getMetadata(
            'swagger/apiModelProperties',
            FollowupListResponseDto.prototype,
            'senderName'
        );
        expect(props.type).toBe(String);
    });
});
