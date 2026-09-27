import { randomUUID } from 'crypto';
import { ForbiddenException } from '@nestjs/common';
import { ENUM_USER_STATUS_CODE_ERROR } from '@app/modules/user/enums/user.status-code.enum';
import { UserSharedController } from '../../../src/modules/user/controllers/user.shared.controller';

// Task 14: avatar uploads used to buffer any size into memory, trust the
// caller's declared file type, key objects with the raw `originalname`, and
// let `updatePhotoProfile` attach any S3 key to the caller's profile — not
// just one the presign step (uploadPhotoProfile) actually issued for them.

describe('UserSharedController — avatar upload hardening (Task 14)', () => {
    let controller: UserSharedController;

    const mockDatabaseService = {};
    const mockAwsS3Service = {
        putItem: jest.fn(),
        presignPutItem: jest.fn(),
        mapPresign: jest.fn(),
    };
    const mockUserService = {
        updateProfile: jest.fn(),
        updatePhoto: jest.fn(),
        createRandomFilenamePhoto: jest.fn(),
    };
    const mockCountryService = { findOneById: jest.fn() };
    const mockActivityService = { createByUser: jest.fn() };
    const mockSession = {
        begin: jest.fn(),
        commit: jest.fn(),
        rollback: jest.fn(),
    };
    const mockEm = { fork: jest.fn(() => mockSession) };

    const user = { id: 'user-1', photo: undefined } as any;

    beforeEach(() => {
        jest.clearAllMocks();
        mockEm.fork.mockReturnValue(mockSession);
        controller = new UserSharedController(
            mockDatabaseService as any,
            mockAwsS3Service as any,
            mockUserService as any,
            mockCountryService as any,
            mockActivityService as any,
            mockEm as any
        );
    });

    describe('updatePhotoProfile', () => {
        it('rejects (403) a key that does not start with user/{user.id}/', async () => {
            await expect(
                controller.updatePhotoProfile(user, {
                    key: `user/someone-else/${randomUUID()}.jpg`,
                    size: 1024,
                } as any)
            ).rejects.toMatchObject(
                new ForbiddenException({
                    statusCode: ENUM_USER_STATUS_CODE_ERROR.PHOTO_KEY_INVALID,
                    message: 'user.error.photoKeyInvalid',
                })
            );

            expect(mockAwsS3Service.mapPresign).not.toHaveBeenCalled();
            expect(mockUserService.updatePhoto).not.toHaveBeenCalled();
        });

        it('rejects (403) a key with no owner-scoped prefix at all', async () => {
            await expect(
                controller.updatePhotoProfile(user, {
                    key: 'workspace/other-workspace/avatar.jpg',
                    size: 1024,
                } as any)
            ).rejects.toBeInstanceOf(ForbiddenException);
        });

        it('accepts a key under the caller’s own user/{user.id}/ prefix', async () => {
            const key = `user/${user.id}/${randomUUID()}.jpg`;
            const aws = { key, completedUrl: 'https://cdn.example.com/x' };
            mockAwsS3Service.mapPresign.mockReturnValue(aws);

            await controller.updatePhotoProfile(user, {
                key,
                size: 1024,
            } as any);

            expect(mockAwsS3Service.mapPresign).toHaveBeenCalledWith({
                key,
                size: 1024,
            });
            expect(mockUserService.updatePhoto).toHaveBeenCalledWith(
                user,
                aws,
                { em: mockSession }
            );
            expect(mockSession.commit).toHaveBeenCalled();
        });
    });

    describe('updateProfile — direct avatar upload key shape', () => {
        beforeEach(() => {
            mockCountryService.findOneById.mockReturnValue({ id: 'vn' });
        });

        it('keys the upload under user/{userId}/<uuid>.<ext>, never the raw originalname', async () => {
            mockAwsS3Service.putItem.mockResolvedValue({
                completedUrl: 'https://cdn.example.com/avatar.png',
            });

            const image = {
                originalname: '../../evil name with spaces.exe.png',
                mimetype: 'image/png',
                buffer: Buffer.from('fake'),
                size: 4,
            } as any;

            await controller.updateProfile(
                user,
                { country: 'vn' } as any,
                image
            );

            expect(mockAwsS3Service.putItem).toHaveBeenCalledTimes(1);
            const call = mockAwsS3Service.putItem.mock.calls[0][0];

            expect(call.key).toMatch(
                /^user\/user-1\/[0-9a-f-]{36}\.png$/
            );
            expect(call.key).not.toContain('evil');
            expect(call.key).not.toContain('originalname');
        });
    });
});
