import { ENUM_ACCOUNT_TYPE } from '@app/modules/account/enums/account.enum';
import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { PLATFORM_ADAPTER } from '../interfaces/platform-adapter.interface';
import { PlatformAdapter } from '../adapters/platform-adapter.base';
import { UnsupportedPlatformException } from '../exceptions/unsupported-platform.exception';

@Injectable()
export class PlatformAdapterRegistry implements OnModuleInit {
    private readonly adapters = new Map<ENUM_ACCOUNT_TYPE, PlatformAdapter>();

    constructor(
        @Inject(PLATFORM_ADAPTER)
        private readonly registered: PlatformAdapter[]
    ) {}

    onModuleInit(): void {
        for (const adapter of this.registered) {
            this.adapters.set(adapter.type, adapter);
        }
    }

    get(type: ENUM_ACCOUNT_TYPE): PlatformAdapter {
        const adapter = this.adapters.get(type);
        if (!adapter) {
            throw new UnsupportedPlatformException(type);
        }
        return adapter;
    }

    has(type: ENUM_ACCOUNT_TYPE): boolean {
        return this.adapters.has(type);
    }
}
