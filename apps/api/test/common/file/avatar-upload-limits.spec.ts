import http, { Server } from 'http';
import multer from 'multer';
import request from 'supertest';

// Task 14, Fix round 1: proves the exact multer config now used by
// updateProfile / createWorkSpace / updateWorkSpace —
// `multer.memoryStorage()` + `{ fileSize: 5 * 1024 * 1024, files: 1 }` —
// actually enforces the 5MB cap at the multipart-parsing layer, and that a
// WebP part still reaches the handler (for FileTypePipe, tested separately
// in file.type.pipe.spec.ts, to validate).
//
// @nestjs/platform-express's FileInterceptor maps multer's LIMIT_FILE_SIZE
// error to a 413 PayloadTooLargeException automatically
// (multer.utils.js#transformException) — this test isolates and proves the
// underlying multer layer only, without needing a full Nest/e2e bootstrap.
describe('Avatar upload multer limits (Task 14, Fix round 1)', () => {
    const upload = multer({
        storage: multer.memoryStorage(),
        limits: { fileSize: 5 * 1024 * 1024, files: 1 },
    }).single('image');

    let server: Server;

    beforeAll(() => {
        server = http.createServer((req, res) => {
            upload(req as any, res as any, (err: unknown) => {
                res.setHeader('Content-Type', 'application/json');
                if (err) {
                    const code = (err as { code?: string }).code;
                    res.statusCode = code === 'LIMIT_FILE_SIZE' ? 413 : 400;
                    res.end(JSON.stringify({ code }));
                    return;
                }
                const file = (req as any).file;
                res.statusCode = 200;
                res.end(
                    JSON.stringify({
                        size: file?.size,
                        mimetype: file?.mimetype,
                    })
                );
            });
        });
    });

    afterAll(() => {
        server.close();
    });

    it('accepts a WebP file at exactly the 5MB boundary', async () => {
        const buffer = Buffer.alloc(5 * 1024 * 1024, 1);

        const res = await request(server)
            .post('/')
            .attach('image', buffer, {
                filename: 'avatar.webp',
                contentType: 'image/webp',
            });

        expect(res.status).toBe(200);
        expect(res.body.mimetype).toBe('image/webp');
        expect(res.body.size).toBe(buffer.length);
    });

    it('rejects a file over 5MB with LIMIT_FILE_SIZE (→ 413 via FileInterceptor)', async () => {
        const buffer = Buffer.alloc(5 * 1024 * 1024 + 1, 1);

        const res = await request(server)
            .post('/')
            .attach('image', buffer, {
                filename: 'avatar.png',
                contentType: 'image/png',
            });

        expect(res.status).toBe(413);
        expect(res.body.code).toBe('LIMIT_FILE_SIZE');
    });
});
