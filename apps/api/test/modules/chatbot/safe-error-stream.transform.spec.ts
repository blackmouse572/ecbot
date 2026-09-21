// apps/api/test/modules/chatbot/safe-error-stream.transform.spec.ts
import { SafeErrorStream } from '../../../src/modules/chatbot/utils/safe-error-stream.transform';

function collect(stream: SafeErrorStream, chunks: Buffer[]): Promise<string> {
    return new Promise((resolve, reject) => {
        let out = '';
        stream.on('data', (c: Buffer) => (out += c.toString()));
        stream.on('end', () => resolve(out));
        stream.on('error', reject);
        for (const c of chunks) stream.write(c);
        stream.end();
    });
}

describe('SafeErrorStream', () => {
    it('rewrites a raw 402 error frame to an empty generic error', async () => {
        const frames =
            'data: {"type":"start","messageId":"m1"}\n\n' +
            'data: {"type":"error","errorText":"[agent error: Error code: 402 - secret details]"}\n\n' +
            'data: [DONE]\n\n';
        const out = await collect(
            new SafeErrorStream({ logRawError: () => {} }),
            [Buffer.from(frames)]
        );
        expect(out).toContain('"type":"error"');
        expect(out).not.toContain('secret');
        expect(out).not.toContain('402');
        expect(out).toContain('"errorText":""');
    });

    it('passes a whitelisted 429 error through with the safe message', async () => {
        const frames =
            'data: {"type":"error","errorText":"[agent error: Error code: 429 - busy]"}\n\n';
        const out = await collect(
            new SafeErrorStream({ logRawError: () => {} }),
            [Buffer.from(frames)]
        );
        expect(out).toContain('The AI service is busy');
        expect(out).not.toContain('agent error');
    });

    it('forwards non-error frames byte-for-byte', async () => {
        const frames =
            'data: {"type":"text-start","id":"t1"}\n\n' +
            'data: {"type":"text-delta","id":"t1","delta":"hi"}\n\n' +
            'data: [DONE]\n\n';
        const out = await collect(
            new SafeErrorStream({ logRawError: () => {} }),
            [Buffer.from(frames)]
        );
        expect(out).toBe(frames);
    });

    it('reports the raw error text to logRawError', async () => {
        const logged: string[] = [];
        const frames =
            'data: {"type":"error","errorText":"[agent error: Error code: 500 - oops]"}\n\n';
        await collect(
            new SafeErrorStream({ logRawError: raw => logged.push(raw) }),
            [Buffer.from(frames)]
        );
        expect(logged).toEqual(['[agent error: Error code: 500 - oops]']);
    });

    it('handles frames split across byte boundaries', async () => {
        const frames =
            'data: {"type":"error","errorText":"[agent error: Error code: 429 - busy]"}\n\n';
        const bytes = [...Buffer.from(frames)].map(b => Buffer.from([b]));
        const out = await collect(
            new SafeErrorStream({ logRawError: () => {} }),
            bytes
        );
        expect(out).toContain('The AI service is busy');
    });
});

describe('SafeErrorStream onFrame observer', () => {
    it('reports every parsed data frame, in order, without altering output', async () => {
        const frames =
            'data: {"type":"start","messageId":"m1"}\n\n' +
            'data: {"type":"text-delta","id":"t1","delta":"hi"}\n\n' +
            'data: [DONE]\n\n';
        const seen: string[] = [];
        const out = await collect(
            new SafeErrorStream({
                logRawError: () => {},
                onFrame: f => seen.push(f.type as string),
            }),
            [Buffer.from(frames)]
        );

        expect(seen).toEqual(['start', 'text-delta']);
        expect(out).toBe(frames);
    });

    it('reports error frames with the raw text, before sanitizing the output', async () => {
        const frames =
            'data: {"type":"error","errorText":"[agent error: Error code: 402 - secret]"}\n\n';
        const seen: Record<string, unknown>[] = [];
        const out = await collect(
            new SafeErrorStream({
                logRawError: () => {},
                onFrame: f => seen.push(f),
            }),
            [Buffer.from(frames)]
        );

        expect(seen).toHaveLength(1);
        expect(seen[0].type).toBe('error');
        expect(out).not.toContain('secret');
    });

    it('survives an observer that throws', async () => {
        const frames = 'data: {"type":"start","messageId":"m1"}\n\n';
        const out = await collect(
            new SafeErrorStream({
                logRawError: () => {},
                onFrame: () => {
                    throw new Error('observer blew up');
                },
            }),
            [Buffer.from(frames)]
        );

        expect(out).toBe(frames);
    });
});
