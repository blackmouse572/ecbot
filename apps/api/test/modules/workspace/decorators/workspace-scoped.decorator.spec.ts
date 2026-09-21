import 'reflect-metadata';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { WORKSPACE_POLICY_ABILITY_META_KEY } from '@app/modules/workspace/constants/workspace.constant';
import { WorkspaceGuard } from '@app/modules/workspace/guards/workspace.guard';
import { WorkspaceMemberGuard } from '@app/modules/workspace/guards/workspace.member.guard';
import { WorkspacePolicyGuard } from '@app/modules/workspace/guards/workspace.policy.guard';

jest.mock('@app/modules/workspace/decorators/workspace.decorator', () =>
    jest.requireActual('@app/modules/workspace/decorators/workspace.decorator')
);
const { WorkspaceScopedProtected } = jest.requireActual<{
    WorkspaceScopedProtected: (...handlers: any[]) => MethodDecorator;
}>('@app/modules/workspace/decorators/workspace.decorator');

class SampleController {
    @WorkspaceScopedProtected({
        subject: 'CUSTOMER',
        action: ['read'],
    })
    list() {}
}

describe('WorkspaceScopedProtected', () => {
    it('applies WorkspaceGuard exactly once, member before policy', () => {
        const guards = Reflect.getMetadata(
            GUARDS_METADATA,
            SampleController.prototype.list
        );

        expect(guards).toEqual([
            WorkspaceGuard,
            WorkspaceMemberGuard,
            WorkspacePolicyGuard,
        ]);
    });

    it('stores handlers as the ability metadata array', () => {
        const abilities = Reflect.getMetadata(
            WORKSPACE_POLICY_ABILITY_META_KEY,
            SampleController.prototype.list
        );

        expect(abilities).toEqual([{ subject: 'CUSTOMER', action: ['read'] }]);
    });
});
