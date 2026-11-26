import { ApiKeyParsePipe } from 'src/modules/api-key/pipes/api-key.parse.pipe';

describe('ApiKeyParsePipe', () => {
    // Only the admin api key routes parse a key from the path, and the detail
    // page shows who created and updated it. The x-api-key guard reads keys
    // without these joins.
    it('loads the audit users of the key', async () => {
        const apiKeyService = {
            findOneById: jest.fn().mockResolvedValue({ id: 'k1' }),
        };

        await new ApiKeyParsePipe(apiKeyService as any).transform('k1');

        expect(apiKeyService.findOneById).toHaveBeenCalledWith('k1', {
            populate: ['createdBy', 'updatedBy'],
        });
    });
});
