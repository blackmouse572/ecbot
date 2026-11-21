import { AwsS3Service } from '@app/modules/aws/services/aws.s3.service';
import { http } from './utils/http';
import { bootstrapE2E, E2EContext } from './utils/app.setup';
import { login, SEED_USERS } from './utils/auth.helper';
import { createWorkspace, wsBase } from './utils/workspace.helper';

// Saved audiences and product group photos and links (#504) over HTTP.
// Requires Postgres + Redis up and the DB seeded (migrate:up && migrate:seed:e2e).
describe('E2E — saved audiences and product group photos', () => {
    let ctx: E2EContext;
    let ownerToken: string;
    let strangerToken: string;
    let workspaceId: string;

    const auth = (t: string): [string, string] => [
        'Authorization',
        `Bearer ${t}`,
    ];
    const url = (path: string) => `${wsBase(ctx.base)}/${workspaceId}${path}`;
    // Stay under the throttle (10 requests per 0.5 s).
    const pause = () => new Promise(resolve => setTimeout(resolve, 60));

    beforeAll(async () => {
        ctx = await bootstrapE2E();
        // Presigning asks S3, which e2e does not reach: hand back the key.
        jest.spyOn(AwsS3Service.prototype, 'presignPutItem').mockImplementation(
            async (key: string) => ({
                presignUrl: `https://upload.test/${key}`,
                key,
                mime: 'image/png',
                extension: 'png',
                expiredIn: 30_000,
            })
        );
        ownerToken = await login(ctx.app, ctx.base, SEED_USERS.individual);
        strangerToken = await login(ctx.app, ctx.base, SEED_USERS.business);
        workspaceId = await createWorkspace(
            ctx.app,
            ctx.base,
            ownerToken,
            `saved-audience-${Date.now()}`
        );
    });

    beforeEach(pause);

    afterAll(async () => {
        await ctx?.close();
    });

    it('saves, lists, renames and deletes an audience', async () => {
        const created = await http(ctx.app)
            .post(url('/marketing/audiences'))
            .set(...auth(ownerToken))
            .send({
                name: 'Hỏi giá, chưa mua',
                match: 'ALL',
                conditions: [
                    { field: 'STAGE', operator: 'IN', values: ['ASKED_PRICE'] },
                    { field: 'ORDERED_AFTER_PRICE', operator: 'NO' },
                ],
            });
        expect(created.status).toBe(201);
        const id = created.body.data.id;
        expect(created.body.data).toMatchObject({
            name: 'Hỏi giá, chưa mua',
            match: 'ALL',
            conditions: [
                { field: 'STAGE', operator: 'IN', values: ['ASKED_PRICE'] },
                { field: 'ORDERED_AFTER_PRICE', operator: 'NO' },
            ],
        });

        await pause();
        const preset = await http(ctx.app)
            .post(url('/marketing/audiences'))
            .set(...auth(ownerToken))
            .send({ name: 'Đến hạn mua lại', preset: 'REPURCHASE' });
        expect(preset.status).toBe(201);

        await pause();
        const list = await http(ctx.app)
            .get(url('/marketing/audiences?search=mua lại'))
            .set(...auth(ownerToken));
        expect(list.status).toBe(200);
        expect(list.body.data.map((a: any) => a.name)).toEqual([
            'Đến hạn mua lại',
        ]);

        await pause();
        const renamed = await http(ctx.app)
            .patch(url(`/marketing/audiences/${id}`))
            .set(...auth(ownerToken))
            .send({ name: 'Hỏi giá tuần này', preset: 'ASKED_PRICE' });
        expect(renamed.status).toBe(200);
        expect(renamed.body.data).toMatchObject({
            name: 'Hỏi giá tuần này',
            preset: 'ASKED_PRICE',
        });
        expect(renamed.body.data.conditions).toBeNull();

        await pause();
        const removed = await http(ctx.app)
            .delete(url(`/marketing/audiences/${id}`))
            .set(...auth(ownerToken));
        expect(removed.status).toBe(204);

        await pause();
        const gone = await http(ctx.app)
            .patch(url(`/marketing/audiences/${id}`))
            .set(...auth(ownerToken))
            .send({ name: 'x' });
        expect(gone.status).toBe(404);
    });

    it('refuses a duplicate name and a condition that does not fit', async () => {
        const dup = await http(ctx.app)
            .post(url('/marketing/audiences'))
            .set(...auth(ownerToken))
            .send({ name: 'Đến hạn mua lại', preset: 'REPURCHASE' });
        expect(dup.status).toBe(409);

        await pause();
        const bad = await http(ctx.app)
            .post(url('/marketing/audiences'))
            .set(...auth(ownerToken))
            .send({
                name: 'Sai',
                conditions: [
                    { field: 'STAGE', operator: 'AT_LEAST', number: 1 },
                ],
            });
        expect(bad.status).toBe(400);
    });

    it('keeps one workspace out of another', async () => {
        const res = await http(ctx.app)
            .get(url('/marketing/audiences'))
            .set(...auth(strangerToken));
        expect(res.status).toBeGreaterThanOrEqual(403);
        expect(res.status).toBeLessThan(500);
    });

    it('gives a product group a link and a photo uploaded for it', async () => {
        const created = await http(ctx.app)
            .post(url('/product-groups'))
            .set(...auth(ownerToken))
            .send({ name: 'Serum B5', link: 'https://shop.example.vn/serum' });
        expect(created.status).toBe(201);
        const id = created.body.data.id;
        expect(created.body.data).toMatchObject({
            link: 'https://shop.example.vn/serum',
            imageUrl: null,
        });

        await pause();
        const notUrl = await http(ctx.app)
            .patch(url(`/product-groups/${id}`))
            .set(...auth(ownerToken))
            .send({ link: 'shop serum' });
        expect(notUrl.status).toBe(422);

        await pause();
        const upload = await http(ctx.app)
            .post(url(`/product-groups/${id}/image/upload`))
            .set(...auth(ownerToken))
            .send({ mime: 'image/png', size: 2048 });
        expect(upload.status).toBe(200);
        const { key, presignUrl } = upload.body.data;
        expect(key).toMatch(
            new RegExp(
                `^workspace/${workspaceId}/product-group/${id}/.+\\.png$`
            )
        );
        expect(presignUrl).toBeTruthy();

        await pause();
        const elsewhere = await http(ctx.app)
            .put(url(`/product-groups/${id}/image`))
            .set(...auth(ownerToken))
            .send({ key: `user/someone/photo.png`, size: 2048 });
        expect(elsewhere.status).toBe(403);

        await pause();
        const saved = await http(ctx.app)
            .put(url(`/product-groups/${id}/image`))
            .set(...auth(ownerToken))
            .send({ key, size: 2048 });
        expect(saved.status).toBe(200);
        expect(saved.body.data.imageUrl).toContain(key);

        await pause();
        const cleared = await http(ctx.app)
            .delete(url(`/product-groups/${id}/image`))
            .set(...auth(ownerToken));
        expect(cleared.status).toBe(200);
        expect(cleared.body.data.imageUrl).toBeNull();
        expect(cleared.body.data.link).toBe('https://shop.example.vn/serum');
    });
});
