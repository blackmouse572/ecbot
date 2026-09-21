import { ENUM_ACCOUNT_TYPE } from '@app/modules/account/enums/account.enum';
import { NotImplementedException } from '@nestjs/common';
import { AdapterCapabilities } from '../interfaces/message-model';
import {
    PlatformOAuthCapability,
    PlatformUserProfile,
    PlatformWebhookEvent,
} from '../interfaces/platform-adapter.interface';
import { PlatformAdapter } from './platform-adapter.base';

export abstract class BaseStubPlatformAdapter extends PlatformAdapter {
    abstract readonly type: ENUM_ACCOUNT_TYPE;
    readonly capabilities: AdapterCapabilities = {
        cards: false,
        buttons: false,
        quickReplies: false,
        media: false,
        editMessage: false,
        deleteMessage: false,
        reactions: { inbound: false, outbound: false },
        typing: false,
        markRead: false,
    };

    private unimplemented(method: string): never {
        throw new NotImplementedException({
            message: 'platform.error.notImplemented',
            statusCode: 501,
            errors: { adapter: this.constructor.name, method },
        });
    }

    readonly oauth: PlatformOAuthCapability = {
        exchangeCode: async () => this.unimplemented('oauth.exchangeCode'),
        refresh: async () => this.unimplemented('oauth.refresh'),
        getOwnerProfile: async () =>
            this.unimplemented('oauth.getOwnerProfile'),
    };

    verifyChallenge(): Response | null {
        return null;
    }
    verifySignature(): boolean {
        return this.unimplemented('verifySignature');
    }
    parse(): PlatformWebhookEvent[] {
        return this.unimplemented('parse');
    }
    fetchSenderProfile(): Promise<PlatformUserProfile> {
        return this.unimplemented('fetchSenderProfile');
    }
    protected doSend(): Promise<{ externalId: string }> {
        return this.unimplemented('doSend');
    }
}
