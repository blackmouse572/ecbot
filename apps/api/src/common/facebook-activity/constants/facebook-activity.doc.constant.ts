import { ApiParamOptions } from '@nestjs/swagger';

const idSegment = { type: 'string', required: true, allowEmptyValue: false };

/** Describes the single mandatory id a listing route takes in its path. */
function pathParam(
    name: string,
    example: string,
    description: string
): ApiParamOptions[] {
    return [{ name, example, description, ...idSegment }];
}

export const FacebookActivityDocPageParams = pathParam(
    'pageId',
    '123456789',
    'Facebook Page the webhook events were delivered to'
);

export const FacebookActivityDocSenderParams = pathParam(
    'senderId',
    '987654321',
    'Page scoped id (PSID) of the person the events came from'
);
