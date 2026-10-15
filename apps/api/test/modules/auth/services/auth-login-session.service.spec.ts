import { AuthLoginSessionService } from '@app/modules/auth/services/auth-login-session.service';

describe('AuthLoginSessionService.open', () => {
    const begin = jest.fn();
    const commit = jest.fn();
    const rollback = jest.fn();
    const em = { fork: () => ({ begin, commit, rollback }) } as any;
    const createToken = jest.fn();
    const setRefreshTokenCookie = jest.fn();
    const create = jest.fn();
    const setLoginSession = jest.fn();
    const service = new AuthLoginSessionService(
        em,
        { createToken, setRefreshTokenCookie } as any,
        { create, setLoginSession } as any
    );
    const user = { id: 'user-1', email: 'a@b.com' } as any;
    const req = {} as any;
    const res = {} as any;
    const token = { accessToken: 'at', refreshToken: 'rt' };

    beforeEach(() => {
        jest.clearAllMocks();
        create.mockResolvedValue({ id: 'sess-1' });
        createToken.mockReturnValue(token);
    });

    it('creates the session, sets the refresh cookie, commits', async () => {
        await expect(service.open(user, req, res, true)).resolves.toBe(token);

        expect(create).toHaveBeenCalledWith(
            req,
            { user: 'user-1' },
            expect.anything()
        );
        expect(setLoginSession).toHaveBeenCalledWith(user, { id: 'sess-1' });
        expect(createToken).toHaveBeenCalledWith(user, 'sess-1', true);
        expect(setRefreshTokenCookie).toHaveBeenCalledWith(res, 'rt', true);
        expect(commit).toHaveBeenCalled();
    });

    it('rolls back and throws when the session cannot be created', async () => {
        create.mockRejectedValue(new Error('db down'));

        await expect(service.open(user, req, res)).rejects.toThrow('db down');
        expect(rollback).toHaveBeenCalled();
        expect(setRefreshTokenCookie).not.toHaveBeenCalled();
    });
});
