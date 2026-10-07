import { HelperStringService } from 'src/common/helper/services/helper.string.service';

describe('HelperStringService.checkCustomEmail', () => {
    const service = new HelperStringService();

    // Gmail and Outlook plus-addressing ("name+shop@...") is RFC-valid and
    // common among shop owners who file mail by tag.
    it.each(['name+shop@gmail.com', 'a.b-c_d+tag@outlook.com'])(
        'accepts %s',
        email => {
            expect(service.checkCustomEmail(email)).toEqual({
                validated: true,
            });
        }
    );

    it.each([
        ['name shop@gmail.com', 'request.email.invalidChars'],
        ['name<shop>@gmail.com', 'request.email.invalidChars'],
        ['.name@gmail.com', 'request.email.localPartDot'],
    ])('still rejects %s', (email, messagePath) => {
        expect(service.checkCustomEmail(email)).toMatchObject({
            validated: false,
            messagePath,
        });
    });
});
