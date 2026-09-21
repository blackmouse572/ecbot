/**
 * Global jest setup (see `setupFilesAfterEnv` in test/jest.json).
 *
 * Unit specs construct controllers and services by hand, so the modules below
 * are replaced with inert stand-ins: decorators that attach nothing, guards
 * that always pass, and entities that are just shapes. Anything a spec wants
 * to assert on is stubbed inside that spec instead.
 *
 * This file re-runs per test file, so every suite gets its own jest.fn()s.
 */

/** Replaces a whole module with the exports given here. */
function stubModule(path: string, mockExports: Record<string, unknown>): void {
    jest.mock(path, () => mockExports);
}

// The stand-ins themselves, named after the export each one replaces so the
// stub tables below can hand them over by shorthand.
const noopDecorator = () => () => {};
const ApiKeyXApiKeyGuard = { canActivate: jest.fn().mockReturnValue(true) };
const PolicyAbilityGuard = jest.fn();
const ResponseInterceptor = jest.fn();
const ResponsePagingInterceptor = jest.fn();
const USER_DEFAULT_PROFILE_SELECT = 'name photo';
const ENUM_APP_STATUS_CODE_ERROR = {
    NOT_FOUND: 'NOT_FOUND',
    UNKNOWN: 'UNKNOWN',
};

stubModule('@app/modules/user/repository/entities/user.entity', {
    UserEntity: class UserEntityStub {},
});

stubModule('@app/modules/user/pipes/user.parse.pipe', {
    UserParsePipe: class UserParsePipeStub {},
});

stubModule('@app/modules/user/services/user.service', {
    UserService: class UserServiceStub {},
});

stubModule('@app/modules/user/decorators/user.decorator', {
    UserProtected: noopDecorator,
    UserParam: noopDecorator,
});

stubModule('@app/modules/user/constants/user.list.constant', {
    USER_DEFAULT_PROFILE_SELECT,
});

stubModule('@app/app/enums/app.status-code.enum', {
    ENUM_APP_STATUS_CODE_ERROR,
});

stubModule('@app/modules/workspace/interfaces/workspace.interface', {
    WorkspaceEntity: class WorkspaceEntityStub {},
});

stubModule('@app/modules/workspace/decorators/workspace.decorator', {
    WorkspaceMemberOrOwnerProtected: noopDecorator,
    WorkspacePolicyAbilityProtected: noopDecorator,
    WorkspaceScopedProtected: noopDecorator,
    WorkspacePayload: noopDecorator,
});

stubModule('@app/modules/api-key/guards/x-api-key/api-key.x-api-key.guard', {
    ApiKeyXApiKeyGuard,
});

stubModule('@app/modules/policy/guards/policy.ability.guard', {
    PolicyAbilityGuard,
});

stubModule('@app/common/response/interceptors/response.interceptor', {
    ResponseInterceptor,
});

stubModule('@app/common/response/interceptors/response.paging.interceptor', {
    ResponsePagingInterceptor,
});

stubModule('@app/common/facebook/services/facebook-auth.service', {
    getAccessToken: jest.fn(),
    getUserProfile: jest.fn(),
});

stubModule('@app/common/facebook/services/facebook-page.service', {});
