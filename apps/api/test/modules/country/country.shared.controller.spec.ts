import { CACHE_TTL_METADATA, CacheInterceptor } from '@nestjs/cache-manager';
import { INTERCEPTORS_METADATA } from '@nestjs/common/constants';
import { COUNTRY_LIST_CACHE_TTL_MS } from 'src/modules/country/constants/country.list.constant';
import { CountrySharedController } from 'src/modules/country/controllers/country.shared.controller';

describe('CountrySharedController list-public', () => {
    const handler = CountrySharedController.prototype.listPublic;

    it('serves the static country list from cache', () => {
        const interceptors =
            Reflect.getMetadata(INTERCEPTORS_METADATA, handler) ?? [];

        expect(interceptors).toContain(CacheInterceptor);
    });

    it('keeps it for an hour, so a re-seed shows up soon after a deploy', () => {
        expect(COUNTRY_LIST_CACHE_TTL_MS).toBe(60 * 60 * 1000);
        expect(Reflect.getMetadata(CACHE_TTL_METADATA, handler)).toBe(
            COUNTRY_LIST_CACHE_TTL_MS
        );
    });
});
