import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { CreateHttpToolRequestDto } from 'src/modules/tool/dtos/request/create-http-tool.request.dto';
import { ENUM_HTTP_METHOD } from 'src/modules/tool/repository/entities/tool.entity';

function errorsFor(payload: Record<string, unknown>): string[] {
    return validateSync(
        plainToInstance(CreateHttpToolRequestDto, payload),
        { skipUndefinedProperties: true }
    ).map(e => e.property);
}

const basePayload = {
    name: 'My Tool',
    description: 'does a thing',
    httpMethod: ENUM_HTTP_METHOD.POST,
    inputSchema: { type: 'object', properties: {} },
};

describe('CreateHttpToolRequestDto', () => {
    it('accepts a plain https URL', () => {
        expect(
            errorsFor({ ...basePayload, httpUrl: 'https://api.example.com/x' })
        ).toEqual([]);
    });

    it('accepts a plain http URL', () => {
        expect(
            errorsFor({ ...basePayload, httpUrl: 'http://api.example.com/x' })
        ).toEqual([]);
    });

    it('rejects a file: URL', () => {
        expect(
            errorsFor({ ...basePayload, httpUrl: 'file:///etc/passwd' })
        ).toEqual(['httpUrl']);
    });

    it('rejects a data: URL', () => {
        expect(
            errorsFor({
                ...basePayload,
                httpUrl: 'data:text/plain;base64,aGVsbG8=',
            })
        ).toEqual(['httpUrl']);
    });

    it('rejects a URL with no protocol', () => {
        expect(
            errorsFor({ ...basePayload, httpUrl: 'api.example.com/x' })
        ).toEqual(['httpUrl']);
    });
});
