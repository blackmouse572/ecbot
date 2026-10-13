import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { FollowupScheduleRequestDto } from '@app/modules/platform/dtos/request/followup.schedule.request.dto';

const base = {
    conversationId: '5f4c9a8e-1b2c-4d3e-8f9a-0b1c2d3e4f5a',
    chatbotId: '5f4c9a8e-1b2c-4d3e-8f9a-0b1c2d3e4f5b',
    userId: 'psid-1',
    providerId: '5f4c9a8e-1b2c-4d3e-8f9a-0b1c2d3e4f5c',
    prompt: 'check payment',
    reason: 'payment_check',
};

const failedFields = async (body: object) =>
    (await validate(plainToInstance(FollowupScheduleRequestDto, body))).map(
        error => error.property
    );

describe('FollowupScheduleRequestDto', () => {
    it('accepts a delay alone', async () => {
        expect(await failedFields({ ...base, delayMinutes: 30 })).toEqual([]);
    });

    it('accepts a local wall-clock time alone', async () => {
        expect(await failedFields({ ...base, at: '2026-10-14T09:00' })).toEqual(
            []
        );
    });

    it('requires one of the two', async () => {
        expect(await failedFields(base)).toEqual(['delayMinutes', 'at']);
    });

    it.each([
        '2026-10-14',
        '2026-10-14T09:00+07:00',
        '2026-10-14T09:00:00Z',
        'tomorrow 9am',
    ])('rejects at=%s (local minutes precision, no offset)', async at => {
        expect(await failedFields({ ...base, at })).toEqual(['at']);
    });
});
