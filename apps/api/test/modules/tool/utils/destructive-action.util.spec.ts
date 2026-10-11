import { isDestructiveAction } from 'src/modules/tool/utils/destructive-action.util';

// #177: an MCP server exposed "delete_all_orders" ("Dangerous operation,
// cannot be undone") with no warning, on by default.
describe('isDestructiveAction', () => {
    it('trusts the server annotations first', () => {
        expect(
            isDestructiveAction({
                name: 'sync_orders',
                annotations: { destructiveHint: true },
            })
        ).toBe(true);
        expect(
            isDestructiveAction({
                name: 'delete_draft_preview',
                annotations: { readOnlyHint: true },
            })
        ).toBe(false);
    });

    it('flags unannotated actions by their name or description', () => {
        expect(
            isDestructiveAction({
                name: 'delete_all_orders',
                description: 'Dangerous operation, cannot be undone',
            })
        ).toBe(true);
        expect(isDestructiveAction({ name: 'removeCustomer' })).toBe(true);
        expect(
            isDestructiveAction({
                name: 'reset_store',
                description: 'Permanently erases every product.',
            })
        ).toBe(true);
    });

    it('leaves ordinary actions alone', () => {
        expect(
            isDestructiveAction({
                name: 'list_orders',
                description: 'List orders',
            })
        ).toBe(false);
        expect(
            isDestructiveAction({
                name: 'send_email',
                description: 'Send an email',
            })
        ).toBe(false);
        expect(isDestructiveAction({ name: 'undelete_order' })).toBe(false);
    });

    it('keeps a flag saved at discovery', () => {
        expect(isDestructiveAction({ name: 'sync', destructive: true })).toBe(
            true
        );
    });
});
