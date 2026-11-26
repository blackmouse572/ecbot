import { EntityManager } from '@mikro-orm/postgresql';
import { DatabaseRepository } from 'src/common/database/bases/database.repository';
import { ApiKeyRepository } from 'src/modules/api-key/repository/repositories/api-key.repository';
import { ClientCredentialRepository } from 'src/modules/client-credential/repository/repositories/client-credential.repository';
import { KnowledgeBaseRepository } from 'src/modules/knowledge-base/repository/repositories/knowledge-base.repository';
import { KnowledgeItemRepository } from 'src/modules/knowledge-base/repository/repositories/knowledge-item.repository';
import { SkillRepository } from 'src/modules/skill/repository/repositories/skill.repository';
import { ToolRepository } from 'src/modules/tool/repository/repositories/tool.repository';

const mockEm = () =>
    ({
        find: jest.fn().mockResolvedValue([]),
        findOne: jest.fn().mockResolvedValue(null),
    }) as unknown as EntityManager & {
        find: jest.Mock;
        findOne: jest.Mock;
    };

describe('DatabaseRepository populate', () => {
    // Populating createdBy / updatedBy / deletedBy on every read cost three
    // LEFT JOINs to users per query (prod: users seq-scanned 547k times) for
    // names almost no screen shows.
    it('does not join the audit users by default', async () => {
        const em = mockEm();
        const repository = new DatabaseRepository(em, 'AnyEntity');

        await repository.find({});
        await repository.findOne({ id: '1' });

        expect(em.find.mock.calls[0][2].populate).toBeUndefined();
        expect(em.findOne.mock.calls[0][2].populate).toBeUndefined();
    });

    it('uses the populate a repository passes', async () => {
        const em = mockEm();
        const repository = new DatabaseRepository(em, 'AnyEntity', [
            'createdBy',
        ]);

        await repository.find({});

        expect(em.find.mock.calls[0][2].populate).toEqual(['createdBy']);
    });

    it('lets a caller replace the repository populate', async () => {
        const em = mockEm();
        const repository = new DatabaseRepository(em, 'AnyEntity', [
            'createdBy',
        ]);

        await repository.findOne({ id: '1' }, { populate: ['workspace'] });

        expect(em.findOne.mock.calls[0][2].populate).toEqual(['workspace']);
    });

    // These screens show who created or updated a row, so their repositories
    // keep the two users: the app's skill, tool and knowledge pages, the
    // client credentials list, and the admin tool pages.
    it.each([
        ['skills', SkillRepository],
        ['tools', ToolRepository],
        ['knowledge bases', KnowledgeBaseRepository],
        ['knowledge items', KnowledgeItemRepository],
        ['client credentials', ClientCredentialRepository],
    ])('keeps createdBy and updatedBy for %s', async (_name, Repository) => {
        const em = mockEm();
        const repository = new (Repository as any)(em);

        await repository.find({});

        expect(em.find.mock.calls[0][2].populate).toEqual([
            'createdBy',
            'updatedBy',
        ]);
    });

    // The x-api-key guard reads a key on every request. Only the admin api
    // key page shows the names, and its pipe asks for them.
    it('does not join the audit users for api keys', async () => {
        const em = mockEm();
        const repository = new ApiKeyRepository(em);

        await repository.findOne({ key: 'k' });

        expect(em.findOne.mock.calls[0][2].populate).toBeUndefined();
    });
});
