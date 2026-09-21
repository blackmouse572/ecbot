import {
    isDisallowedAddress,
    isDisallowedHostname,
    parseLiteralAddress,
} from 'src/common/utils/egress-blocklist.util';

describe('egress-blocklist.util', () => {
    describe('isDisallowedAddress', () => {
        it.each([
            ['127.0.0.1', 4], // loopback
            ['10.1.2.3', 4], // RFC1918
            ['172.16.0.1', 4], // RFC1918
            ['172.31.255.255', 4], // RFC1918 upper bound
            ['192.168.1.1', 4], // RFC1918
            ['169.254.169.254', 4], // cloud metadata address
            ['0.0.0.0', 4],
        ])('blocks IPv4 %s', (address, family) => {
            expect(isDisallowedAddress(address, family as 4)).toBe(true);
        });

        it.each([
            ['::1', 6], // loopback
            ['fc00::1', 6], // unique-local
            ['fe80::1', 6], // link-local
        ])('blocks IPv6 %s', (address, family) => {
            expect(isDisallowedAddress(address, family as 6)).toBe(true);
        });

        it('blocks an IPv4-mapped IPv6 loopback', () => {
            expect(isDisallowedAddress('::ffff:127.0.0.1', 6)).toBe(true);
        });

        it('blocks an IPv4-mapped IPv6 metadata address', () => {
            expect(isDisallowedAddress('::ffff:169.254.169.254', 6)).toBe(
                true
            );
        });

        it('does not block a normal public IPv4 address', () => {
            expect(isDisallowedAddress('8.8.8.8', 4)).toBe(false);
        });

        it('does not block a normal public IPv6 address', () => {
            expect(isDisallowedAddress('2001:4860:4860::8888', 6)).toBe(
                false
            );
        });

        it('does not block a normal public IPv4-mapped IPv6 address', () => {
            expect(isDisallowedAddress('::ffff:8.8.8.8', 6)).toBe(false);
        });
    });

    describe('isDisallowedHostname', () => {
        it('blocks a .internal suffix, case-insensitively', () => {
            expect(isDisallowedHostname('metadata.internal')).toBe(true);
            expect(isDisallowedHostname('metadata.INTERNAL')).toBe(true);
        });

        it('does not block a normal hostname', () => {
            expect(isDisallowedHostname('api.example.com')).toBe(false);
        });
    });

    describe('parseLiteralAddress', () => {
        it('parses a bare IPv4 hostname', () => {
            expect(parseLiteralAddress('127.0.0.1')).toEqual({
                address: '127.0.0.1',
                family: 4,
            });
        });

        it('parses a bracketed IPv6 hostname', () => {
            expect(parseLiteralAddress('[::1]')).toEqual({
                address: '::1',
                family: 6,
            });
        });

        it('returns null for a domain name', () => {
            expect(parseLiteralAddress('api.example.com')).toBeNull();
        });
    });
});
