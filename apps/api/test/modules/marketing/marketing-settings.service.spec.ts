import { BadRequestException } from '@nestjs/common';
import { MarketingSettingsService } from 'src/modules/marketing/services/marketing-settings.service';

const DEFAULTS = {
    maxPer30Days: 3,
    maxPerDay: 1,
    restAfter: 3,
    restDays: 30,
    sendFrom: '09:00',
    sendTo: '20:00',
    stopKeywords: ['dừng', 'dung', 'stop'],
    stopReply: null,
    stopReplyEnabled: true,
};

function makeService(saved: Record<string, unknown> | null = null) {
    let row = saved ? { ...saved } : null;
    const repository = {
        findOne: jest.fn(async () => row),
        create: jest.fn(async (data: Record<string, unknown>) => {
            row = { ...data };
            return row;
        }),
        getEntityManager: () => ({
            getReference: (_: unknown, id: string) => ({ id }),
        }),
        save: jest.fn(async (entity: Record<string, unknown>) => {
            row = entity;
            return entity;
        }),
    };
    return {
        service: new MarketingSettingsService(repository as any),
        repository,
    };
}

describe('MarketingSettingsService', () => {
    it('shows the defaults until the shop saves', async () => {
        const { service } = makeService();
        await expect(service.get('ws1')).resolves.toEqual(DEFAULTS);
        await expect(service.rules('ws1')).resolves.toEqual({
            maxPer30Days: 3,
            restAfter: 3,
            restDays: 30,
            sendFrom: '09:00',
            sendTo: '20:00',
        });
    });

    it('saves only the fields sent, on the first save', async () => {
        const { service, repository } = makeService();
        const settings = await service.update('ws1', {
            maxPer30Days: 2,
            restDays: 14,
        });
        expect(repository.create).toHaveBeenCalledWith({
            workspace: { id: 'ws1' },
            maxPer30Days: 2,
            restDays: 14,
        });
        expect(settings).toMatchObject({
            maxPer30Days: 2,
            restDays: 14,
            restAfter: 3,
        });
    });

    it('keeps the saved values a later change leaves out', async () => {
        const { service, repository } = makeService({
            maxPer30Days: 2,
            sendFrom: '08:00',
            sendTo: '21:00',
        });
        await service.update('ws1', { sendTo: '22:00' });
        expect(repository.save).toHaveBeenCalledWith({
            maxPer30Days: 2,
            sendFrom: '08:00',
            sendTo: '22:00',
        });
    });

    it('refuses send hours that end before they start', async () => {
        const { service } = makeService({ sendFrom: '09:00', sendTo: '20:00' });
        await expect(
            service.update('ws1', { sendFrom: '20:30' })
        ).rejects.toBeInstanceOf(BadRequestException);
        await expect(
            service.update('ws1', { sendFrom: '10:00', sendTo: '10:00' })
        ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('stores stop keywords as compared, once each, and null brings back the built-in ones', async () => {
        const { service } = makeService();
        await expect(
            service.update('ws1', { stopKeywords: [' Huỷ! ', 'huỷ', 'STOP'] })
        ).resolves.toMatchObject({ stopKeywords: ['huỷ', 'stop'] });
        await expect(
            service.update('ws1', { stopKeywords: null })
        ).resolves.toMatchObject({ stopKeywords: ['dừng', 'dung', 'stop'] });
    });

    it('refuses stop keywords that are only punctuation', async () => {
        const { service } = makeService();
        await expect(
            service.update('ws1', { stopKeywords: ['!!', ' . '] })
        ).rejects.toBeInstanceOf(BadRequestException);
    });

    it("opts out on the shop's own keywords, and only on a whole message", async () => {
        const { service } = makeService({ stopKeywords: ['huỷ'] });
        await expect(service.isStopMessage('ws1', 'Huỷ.')).resolves.toBe(true);
        await expect(service.isStopMessage('ws1', 'dừng')).resolves.toBe(false);
        await expect(
            service.isStopMessage('ws1', 'cho em huỷ đơn')
        ).resolves.toBe(false);
    });

    it('uses the built-in words without a lookup for long messages', async () => {
        const { service, repository } = makeService();
        await expect(service.isStopMessage('ws1', 'dừng')).resolves.toBe(true);
        await expect(
            service.isStopMessage(
                'ws1',
                'cho em hỏi giá serum vitamin C loại lớn ạ'
            )
        ).resolves.toBe(false);
        expect(repository.findOne).toHaveBeenCalledTimes(1);
    });

    it('gives the shop reply, trimmed, or null for the built-in one, and whether it is on', async () => {
        const { service } = makeService();
        await expect(service.stopReply('ws1')).resolves.toEqual({
            enabled: true,
            text: null,
        });
        await service.update('ws1', { stopReply: '  Dạ shop ngưng gửi ạ.  ' });
        await expect(service.stopReply('ws1')).resolves.toEqual({
            enabled: true,
            text: 'Dạ shop ngưng gửi ạ.',
        });
        await service.update('ws1', { stopReplyEnabled: false });
        await expect(service.stopReply('ws1')).resolves.toEqual({
            enabled: false,
            text: 'Dạ shop ngưng gửi ạ.',
        });
    });
});
