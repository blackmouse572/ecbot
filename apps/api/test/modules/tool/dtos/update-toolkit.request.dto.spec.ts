import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { UpdateToolkitRequestDto } from 'src/modules/tool/dtos/request/update-toolkit.request.dto';

function errorsFor(payload: Record<string, unknown>): string[] {
    return validateSync(plainToInstance(UpdateToolkitRequestDto, payload), {
        whitelist: true,
        forbidNonWhitelisted: true,
    }).map(e => e.property);
}

describe('UpdateToolkitRequestDto', () => {
    it('lets the text fields go back to the default with null', () => {
        expect(
            errorsFor({
                name: null,
                description: null,
                logo: null,
                categories: null,
            })
        ).toEqual([]);
    });

    it('rejects a null disabled, the column cannot be null', () => {
        expect(errorsFor({ disabled: null })).toEqual(['disabled']);
    });

    it('accepts a body without disabled', () => {
        expect(errorsFor({ name: 'KiotViet VN' })).toEqual([]);
    });

    it('wants https for the logo', () => {
        expect(errorsFor({ logo: 'http://x.test/a.png' })).toEqual(['logo']);
    });
});
