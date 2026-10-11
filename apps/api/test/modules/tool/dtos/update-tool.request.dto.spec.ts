import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { UpdateToolRequestDto } from 'src/modules/tool/dtos/request/update-tool.request.dto';

// #176: the update DTO left out the URL fields, so the global whitelist
// stripped them and a wrong URL could not be fixed.
function errorsFor(payload: Record<string, unknown>): string[] {
    return validateSync(plainToInstance(UpdateToolRequestDto, payload), {
        whitelist: true,
        forbidNonWhitelisted: true,
    }).map(e => e.property);
}

describe('UpdateToolRequestDto', () => {
    it('accepts a new HTTP method and URL', () => {
        expect(
            errorsFor({
                httpMethod: 'POST',
                httpUrl: 'https://api.example.com/x',
            })
        ).toEqual([]);
    });

    it('accepts a new MCP server URL and rejects a non-http one', () => {
        expect(errorsFor({ serverUrl: 'https://mcp.example.com/sse' })).toEqual(
            []
        );
        expect(errorsFor({ serverUrl: 'file:///etc/passwd' })).toEqual([
            'serverUrl',
        ]);
    });
});
