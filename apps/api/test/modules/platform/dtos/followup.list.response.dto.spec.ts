import {
    FollowupChatbotResponseDto,
    FollowupListResponseDto,
} from '../../../../src/modules/platform/dtos/response/followup.list.response.dto';

// @repo/client is generated from these docs. A `string | null` property
// documented without a type comes out as `{ [key: string]: unknown }` there.
describe('FollowupListResponseDto docs', () => {
    it.each([
        [FollowupListResponseDto, 'senderName'],
        [FollowupListResponseDto, 'triggerMessageId'],
        [FollowupChatbotResponseDto, 'avatar'],
    ] as const)('%p.%s is documented as a nullable string', (dto, property) => {
        expect(
            Reflect.getMetadata(
                'swagger/apiModelProperties', // @nestjs/swagger DECORATORS.API_MODEL_PROPERTIES
                dto.prototype,
                property
            )
        ).toMatchObject({ type: String, nullable: true });
    });
});
