import { CACHE_TTL_METADATA, CacheInterceptor } from '@nestjs/cache-manager';
import { INTERCEPTORS_METADATA } from '@nestjs/common/constants';
import { CountrySharedController } from 'src/modules/country/controllers/country.shared.controller';

describe('CountrySharedController list-public', () => {
    const handler = CountrySharedController.prototype.listPublic;

    it('serves the static country list from cache', () => {
        const interceptors =
            Reflect.getMetadata(INTERCEPTORS_METADATA, handler) ?? [];

        expect(interceptors).toContain(CacheInterceptor);
    });

    it('keeps it for a day', () => {
        expect(Reflect.getMetadata(CACHE_TTL_METADATA, handler)).toBe(
            24 * 60 * 60 * 1000
        );
    });
});
