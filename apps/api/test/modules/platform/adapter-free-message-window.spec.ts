import { InstagramPlatformAdapter } from '../../../src/modules/platform/adapters/instagram/instagram.platform-adapter';
import { MessengerPlatformAdapter } from '../../../src/modules/platform/adapters/messenger/messenger.platform-adapter';
import { TelegramPlatformAdapter } from '../../../src/modules/platform/adapters/telegram/telegram.platform-adapter';
import { ThreadsPlatformAdapter } from '../../../src/modules/platform/adapters/threads/threads.platform-adapter';
import { WhatsAppPlatformAdapter } from '../../../src/modules/platform/adapters/whatsapp/whatsapp.platform-adapter';
import { ZaloPlatformAdapter } from '../../../src/modules/platform/adapters/zalo/zalo.platform-adapter';

// Each channel says how long after a customer's last message the shop may
// still message them for free; the customer panel shows it per channel.

const config = { get: () => '' } as any;
const http = { axiosRef: {} } as any;
const accounts = {} as any;

describe('freeMessageWindowHours', () => {
    it('gives Messenger, Instagram and WhatsApp 24 hours and Zalo OA 48', () => {
        expect(
            new MessengerPlatformAdapter(config, http, accounts).capabilities
                .freeMessageWindowHours
        ).toBe(24);
        expect(
            new InstagramPlatformAdapter(config, http, accounts).capabilities
                .freeMessageWindowHours
        ).toBe(24);
        expect(
            new WhatsAppPlatformAdapter(config, http, accounts).capabilities
                .freeMessageWindowHours
        ).toBe(24);
        expect(
            new ZaloPlatformAdapter(config, http, accounts).capabilities
                .freeMessageWindowHours
        ).toBe(48);
    });

    it('keeps Telegram open with no end', () => {
        expect(
            new TelegramPlatformAdapter(config, http, accounts).capabilities
                .freeMessageWindowHours
        ).toBeNull();
    });

    it('leaves it out on channels with no free route for offers', () => {
        expect(
            new ThreadsPlatformAdapter(config, http, accounts, {} as any)
                .capabilities.freeMessageWindowHours
        ).toBeUndefined();
    });
});
