import { buildInvitationLink } from '../../../../src/modules/invitation/utils/invitation-link.util';

describe('buildInvitationLink', () => {
    it('points at the join page with the token in the `tokens` param', () => {
        expect(buildInvitationLink('https://app.acme.test', 'jwt')).toBe(
            'https://app.acme.test/join?tokens=jwt'
        );
    });

    it('does not double the slash when the url has a trailing one', () => {
        expect(buildInvitationLink('https://app.acme.test/', 'jwt')).toBe(
            'https://app.acme.test/join?tokens=jwt'
        );
    });
});
