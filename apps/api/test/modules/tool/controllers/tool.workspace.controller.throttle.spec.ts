import { ToolWorkspaceController } from 'src/modules/tool/controllers/tool.workspace.controller';

// #247 review: creating an MCP tool or changing its connection now calls the
// server, so these routes get the same per-minute cap as /test and /discover.
describe('ToolWorkspaceController throttling', () => {
    it.each(['createMcp', 'update'] as const)(
        'caps %s per minute',
        handlerName => {
            const handler = ToolWorkspaceController.prototype[handlerName];

            expect(Reflect.getMetadata('THROTTLER:LIMITdefault', handler)).toBe(
                10
            );
            expect(Reflect.getMetadata('THROTTLER:TTLdefault', handler)).toBe(
                60000
            );
        }
    );
});
