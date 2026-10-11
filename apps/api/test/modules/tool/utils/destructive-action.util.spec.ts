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

    // #247 review: the list missed common verbs, inflections, run-together
    // names and Vietnamese, and read the MCP defaults differently.
    it.each([
        'GMAIL_MOVE_TO_TRASH',
        'cancel_order',
        'refundPayment',
        'void_invoice',
        'revoke_token',
        'archive_project',
        'deactivate_user',
        'terminate_instance',
        'overwrite_file',
        'unsubscribe_contact',
        'transfer_funds',
        'removes_item',
        'deleted_records_purge',
        'bulkdelete',
        'DELETEORDER',
        'xoa_don_hang',
        'huy_don',
    ])('flags %s', name => {
        expect(isDestructiveAction({ name })).toBe(true);
    });

    it('flags Vietnamese warnings in the description', () => {
        expect(
            isDestructiveAction({
                name: 'don_hang',
                description: 'Xóa toàn bộ đơn hàng, không thể hoàn tác.',
            })
        ).toBe(true);
        expect(
            isDestructiveAction({
                name: 'san_pham',
                description: 'Gỡ sản phẩm vĩnh viễn',
            })
        ).toBe(true);
    });

    it.each([
        'list_archived_orders',
        'get_dropdown_options',
        'clearance_items',
        'undelete_order',
        'send_email',
    ])('leaves %s alone', name => {
        expect(isDestructiveAction({ name })).toBe(false);
    });

    it('treats readOnlyHint false with no destructiveHint as destructive, as the MCP spec does', () => {
        expect(
            isDestructiveAction({
                name: 'sync_orders',
                annotations: { readOnlyHint: false },
            })
        ).toBe(true);
        expect(
            isDestructiveAction({
                name: 'add_note',
                annotations: { readOnlyHint: false, destructiveHint: false },
            })
        ).toBe(false);
    });
});
