import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { CreateToolkitRequestDto } from 'src/modules/tool/dtos/request/create-toolkit.request.dto';
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

    it('takes an http(s) server URL and null to reset it', () => {
        expect(errorsFor({ serverUrl: 'https://kv.example.com' })).toEqual([]);
        expect(errorsFor({ serverUrl: null })).toEqual([]);
        expect(errorsFor({ serverUrl: 'ftp://kv.example.com' })).toEqual([
            'serverUrl',
        ]);
    });
});

describe('CreateToolkitRequestDto', () => {
    const errors = (payload: Record<string, unknown>) =>
        validateSync(plainToInstance(CreateToolkitRequestDto, payload), {
            whitelist: true,
            forbidNonWhitelisted: true,
        }).map(e => e.property);

    const valid = {
        slug: 'haravan',
        name: 'Haravan',
        serverUrl: 'https://hv.example.com',
    };

    it('needs a slug, name and server URL', () => {
        expect(errors(valid)).toEqual([]);
        expect(errors({})).toEqual(['slug', 'name', 'serverUrl']);
    });

    it('only takes lowercase kebab-case slugs', () => {
        expect(errors({ ...valid, slug: 'Hara van' })).toEqual(['slug']);
        expect(errors({ ...valid, slug: 'hara-van-2' })).toEqual([]);
    });

    it('takes the optional fields', () => {
        expect(
            errors({
                ...valid,
                description: 'Shop platform',
                logo: 'https://hv.example.com/logo.png',
                categories: [{ id: 'ecommerce', name: 'E-commerce' }],
            })
        ).toEqual([]);
    });
});
