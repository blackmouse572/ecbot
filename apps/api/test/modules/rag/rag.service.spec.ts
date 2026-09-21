// apps/api/test/modules/rag/rag.service.spec.ts
import { ENUM_FILE_MIME_DOCUMENT } from '../../../src/common/file/enums/file.enum';
import { RAGService } from '../../../src/modules/rag/services/rag.service';

describe('RAGService.generateS3Key', () => {
    const service = new RAGService({} as any, {} as any);

    const keyFor = (mime: ENUM_FILE_MIME_DOCUMENT, name: string) =>
        service.generateS3Key('bot1', 'ws1', {
            mime,
            name,
            size: 1000,
        });

    it('maps a PDF mime to a .pdf key', () => {
        expect(keyFor(ENUM_FILE_MIME_DOCUMENT.PDF, 'report.pdf')).toBe(
            'rag/ws1/bot1/report.pdf'
        );
    });

    it('maps a DOCX mime to a .docx key', () => {
        expect(keyFor(ENUM_FILE_MIME_DOCUMENT.DOCX, 'guide.docx')).toBe(
            'rag/ws1/bot1/guide.docx'
        );
    });

    it('maps a TXT mime to a .txt key', () => {
        expect(keyFor(ENUM_FILE_MIME_DOCUMENT.TXT, 'notes.txt')).toBe(
            'rag/ws1/bot1/notes.txt'
        );
    });

    it('maps an MD mime to a .md key and slugs the name', () => {
        expect(keyFor(ENUM_FILE_MIME_DOCUMENT.MD, 'My File Name.md')).toBe(
            'rag/ws1/bot1/my-file-name.md'
        );
    });

    it('keeps the base name when the file has no extension', () => {
        expect(keyFor(ENUM_FILE_MIME_DOCUMENT.EPUB, 'book')).toBe(
            'rag/ws1/bot1/book.epub'
        );
    });
});
