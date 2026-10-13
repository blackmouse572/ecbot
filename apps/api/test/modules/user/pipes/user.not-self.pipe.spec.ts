import { CLS_REQ } from 'nestjs-cls';
import { UserNotSelfPipe } from '@app/modules/user/pipes/user.not-self.pipe';
import { ENUM_POLICY_ROLE_TYPE } from '@app/modules/policy/enums/policy.enum';

const pipeFor = (type: ENUM_POLICY_ROLE_TYPE) =>
    new UserNotSelfPipe({
        get: (key: string) =>
            (key as unknown) === CLS_REQ
                ? { user: { user: 'admin-1', type } }
                : undefined,
    } as any);

// Routes run it after UserParsePipe, so it receives the parsed entity; it
// compared that entity with the caller's id string and never matched.
describe('UserNotSelfPipe', () => {
    it('refuses the caller acting on their own account', async () => {
        await expect(
            pipeFor(ENUM_POLICY_ROLE_TYPE.ADMIN).transform({
                id: 'admin-1',
            } as any)
        ).rejects.toMatchObject({
            response: { message: 'user.error.notSelf' },
        });
        await expect(
            pipeFor(ENUM_POLICY_ROLE_TYPE.ADMIN).transform('admin-1')
        ).rejects.toMatchObject({
            response: { message: 'user.error.notSelf' },
        });
    });

    it('lets the caller act on someone else', async () => {
        const other = { id: 'user-2' };
        await expect(
            pipeFor(ENUM_POLICY_ROLE_TYPE.ADMIN).transform(other as any)
        ).resolves.toBe(other);
    });

    it('lets a super admin act on their own account', async () => {
        const self = { id: 'admin-1' };
        await expect(
            pipeFor(ENUM_POLICY_ROLE_TYPE.SUPER_ADMIN).transform(self as any)
        ).resolves.toBe(self);
    });
});
