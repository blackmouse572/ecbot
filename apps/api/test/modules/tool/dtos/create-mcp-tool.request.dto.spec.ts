import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { CreateMcpToolRequestDto } from 'src/modules/tool/dtos/request/create-mcp-tool.request.dto';

function errorsFor(payload: Record<string, unknown>): string[] {
    return validateSync(
        plainToInstance(CreateMcpToolRequestDto, payload),
        { skipUndefinedProperties: true }
    ).map(e => e.property);
}

const basePayload = { name: 'My MCP Tool', description: 'does a thing' };

describe('CreateMcpToolRequestDto', () => {
    it('accepts a plain https URL', () => {
        expect(
            errorsFor({ ...basePayload, serverUrl: 'https://mcp.example.com/sse' })
        ).toEqual([]);
    });

    it('rejects a file: URL', () => {
        expect(
            errorsFor({ ...basePayload, serverUrl: 'file:///etc/passwd' })
        ).toEqual(['serverUrl']);
    });

    it('rejects a URL with no protocol', () => {
        expect(
            errorsFor({ ...basePayload, serverUrl: 'mcp.example.com/sse' })
        ).toEqual(['serverUrl']);
    });
});
