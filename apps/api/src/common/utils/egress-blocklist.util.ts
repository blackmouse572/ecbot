import * as net from 'node:net';

const ipv4BlockList = new net.BlockList();
ipv4BlockList.addSubnet('127.0.0.0', 8, 'ipv4');
ipv4BlockList.addSubnet('10.0.0.0', 8, 'ipv4');
ipv4BlockList.addSubnet('172.16.0.0', 12, 'ipv4');
ipv4BlockList.addSubnet('192.168.0.0', 16, 'ipv4');
ipv4BlockList.addSubnet('169.254.0.0', 16, 'ipv4'); // covers 169.254.169.254 (cloud metadata)
ipv4BlockList.addSubnet('0.0.0.0', 8, 'ipv4');

const ipv6BlockList = new net.BlockList();
ipv6BlockList.addSubnet('::1', 128, 'ipv6');
ipv6BlockList.addSubnet('fc00::', 7, 'ipv6');
ipv6BlockList.addSubnet('fe80::', 10, 'ipv6');

/**
 * True if `address` (of the given `family`) must not be connected to.
 * For family 6, an IPv4-mapped address (::ffff:x.x.x.x) is checked against
 * the IPv4 rules too — net.BlockList does this normalization itself when
 * checked with family 'ipv6', so IPv4 rules do not need a separate IPv6
 * mirror. Do NOT add a ::ffff:0:0/96 rule to the IPv6 list — mixed into a
 * BlockList that also holds IPv4 rules, it matches every IPv4 address.
 */
export function isDisallowedAddress(
    address: string,
    family: 4 | 6
): boolean {
    if (family === 4) {
        return ipv4BlockList.check(address, 'ipv4');
    }
    return (
        ipv6BlockList.check(address, 'ipv6') ||
        ipv4BlockList.check(address, 'ipv6')
    );
}

/** True if `hostname` must not be connected to, independent of its address. */
export function isDisallowedHostname(hostname: string): boolean {
    return hostname.toLowerCase().endsWith('.internal');
}

/**
 * If `hostname` (as it appears on a parsed URL — brackets included for
 * IPv6) is already a literal IP address, returns its unbracketed form and
 * family. Returns null for a domain name, which needs DNS resolution
 * before it can be checked.
 */
export function parseLiteralAddress(
    hostname: string
): { address: string; family: 4 | 6 } | null {
    const unbracketed =
        hostname.startsWith('[') && hostname.endsWith(']')
            ? hostname.slice(1, -1)
            : hostname;
    const family = net.isIP(unbracketed);
    if (family === 0) return null;
    return { address: unbracketed, family: family as 4 | 6 };
}
