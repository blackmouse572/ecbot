import { WorkspaceOwnerFilterPipe } from 'src/modules/workspace/pipes/workspace.owner-filter.pipe';

describe('WorkspaceOwnerFilterPipe', () => {
    const pipe = new WorkspaceOwnerFilterPipe();

    it('matches the owner name or email, ignoring case', () => {
        expect(pipe.transform('  Lan  ')).toEqual({
            owner: { $or: [{ name: /Lan/i }, { email: /Lan/i }] },
        });
    });

    it('escapes regex characters so an email matches literally', () => {
        expect(pipe.transform('lan+1@shop.vn')).toEqual({
            owner: {
                $or: [
                    { name: /lan\+1@shop\.vn/i },
                    { email: /lan\+1@shop\.vn/i },
                ],
            },
        });
    });

    it('adds nothing for an empty value', () => {
        expect(pipe.transform(undefined)).toBeUndefined();
        expect(pipe.transform('   ')).toBeUndefined();
    });
});
