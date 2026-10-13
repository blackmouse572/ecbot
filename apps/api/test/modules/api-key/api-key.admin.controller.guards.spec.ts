import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { POLICY_ROLE_META_KEY } from '@app/modules/policy/constants/policy.constant';
import { ENUM_POLICY_ROLE_TYPE } from '@app/modules/policy/enums/policy.enum';
import { ApiKeyAdminController } from 'src/modules/api-key/controllers/api-key.admin.controller';
import { ApiKeyCreateRequestDto } from 'src/modules/api-key/dtos/request/api-key.create.request.dto';
import { ApiKeyUpdateRequestDto } from 'src/modules/api-key/dtos/request/api-key.update.request.dto';
import { ENUM_API_KEY_TYPE } from 'src/modules/api-key/enums/api-key.enum';
import { ApiKeyService } from 'src/modules/api-key/services/api-key.service';
import { ApiKeyEntity } from 'src/modules/api-key/repository/entities/api-key.entity';

// The global setup stubs UserProtected; the guard spec only reads policy
// metadata, but keep the convention consistent with the other guards specs.
jest.unmock('@app/modules/user/decorators/user.decorator');

// Every admin route must be SUPER_ADMIN-only (was ADMIN before the PR).
const ROUTES = [
    'list',
    'get',
    'create',
    'reset',
    'update',
    'inactive',
    'active',
    'updateDate',
    'delete',
] as const;

const rolesOf = (fn: object) =>
    Reflect.getMetadata(POLICY_ROLE_META_KEY, fn);

describe('ApiKeyAdminController policy roles', () => {
    it.each(ROUTES)('%s is gated to exactly [SUPER_ADMIN]', method => {
        expect(
            rolesOf(ApiKeyAdminController.prototype[method])
        ).toEqual([ENUM_POLICY_ROLE_TYPE.SUPER_ADMIN]);
    });
});

function serviceWithSave(save: jest.Mock) {
    return new ApiKeyService(
        { random: jest.fn().mockReturnValue('x') } as unknown as never,
        { get: jest.fn().mockReturnValue('test') } as never,
        { sha256: jest.fn().mockReturnValue('hash') } as never,
        {
            create: jest.fn().mockReturnValue(new Date()),
            difference: jest.fn().mockReturnValue(0),
        } as never,
        { save } as never
    );
}

describe('ApiKeyService.update', () => {
    it('persists name and type when type is provided', async () => {
        const repository = {
            name: 'old',
            type: ENUM_API_KEY_TYPE.DEFAULT,
        } as unknown as ApiKeyEntity;
        const save = jest.fn().mockResolvedValue(repository);
        const service = serviceWithSave(save);

        await service.update(repository, {
            name: 'new-name',
            type: ENUM_API_KEY_TYPE.PUBLIC,
        });

        expect(repository).toMatchObject({
            name: 'new-name',
            type: ENUM_API_KEY_TYPE.PUBLIC,
        });
        expect(save).toHaveBeenCalledWith(repository, undefined);
    });

    it('leaves the stored type untouched when type is omitted', async () => {
        const repository = {
            name: 'old',
            type: ENUM_API_KEY_TYPE.PUBLIC,
        } as unknown as ApiKeyEntity;
        const save = jest.fn().mockResolvedValue(repository);
        const service = serviceWithSave(save);

        await service.update(repository, { name: 'new-name' });

        expect(repository.type).toBe(ENUM_API_KEY_TYPE.PUBLIC);
        expect(repository.name).toBe('new-name');
    });

    it('leaves the stored type untouched when type is null (no 500)', async () => {
        const repository = {
            name: 'old',
            type: ENUM_API_KEY_TYPE.PUBLIC,
        } as unknown as ApiKeyEntity;
        const save = jest.fn().mockResolvedValue(repository);
        const service = serviceWithSave(save);

        await service.update(repository, {
            name: 'new-name',
            type: null as never,
        });

        expect(repository.type).toBe(ENUM_API_KEY_TYPE.PUBLIC);
    });
});

describe('ApiKey request DTOs validate `type`', () => {
    it('CREATE: missing, null and unknown type are rejected (clean 422, not a 500)', () => {
        for (const body of [
            { name: 'x' },
            { name: 'x', type: null },
            { name: 'x', type: 'nope' },
        ]) {
            const errors = validateSync(
                plainToInstance(ApiKeyCreateRequestDto, body)
            );

            expect(
                errors.some(e => e.property === 'type')
            ).toBe(true);
        }
    });

    it('CREATE: a valid type passes', () => {
        const errors = validateSync(
            plainToInstance(ApiKeyCreateRequestDto, {
                name: 'x',
                type: ENUM_API_KEY_TYPE.DEFAULT,
            })
        );

        expect(errors).toEqual([]);
    });

    it('UPDATE: type is optional and null does not fail validation', () => {
        const errors = validateSync(
            plainToInstance(ApiKeyUpdateRequestDto, {
                name: 'x',
                type: null,
            })
        );

        expect(errors).toEqual([]);
    });

    it('UPDATE: an unknown type still fails', () => {
        const errors = validateSync(
            plainToInstance(ApiKeyUpdateRequestDto, {
                name: 'x',
                type: 'nope',
            })
        );

        expect(errors.some(e => e.property === 'type')).toBe(true);
    });
});
