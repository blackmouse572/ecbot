import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { I18nJsonLoader, I18nModule } from 'nestjs-i18n';
import { HelperArrayService } from '../../../src/common/helper/services/helper.array.service';
import { MessageService } from '../../../src/common/message/services/message.service';

const LANGUAGES_DIR = join(__dirname, '../../../src/languages');

function jsonFiles(lang: string): string[] {
    return readdirSync(join(LANGUAGES_DIR, lang)).filter(f =>
        f.endsWith('.json')
    );
}

function leaves(
    value: unknown,
    path: string[] = []
): { path: string; text: string }[] {
    if (typeof value === 'string')
        return [{ path: path.join('.'), text: value }];
    if (value && typeof value === 'object') {
        return Object.entries(value).flatMap(([k, v]) =>
            leaves(v, [...path, k])
        );
    }
    return [];
}

const languages = readdirSync(LANGUAGES_DIR, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => entry.name);

describe('language files', () => {
    /**
     * nestjs-i18n interpolates `{name}`. A `{{name}}` placeholder is left
     * verbatim in the rendered string, so the user sees the literal braces —
     * silently, since every test mocks MessageService. Guarding the whole
     * directory catches the next one too, not just the key that prompted this.
     */
    it.each(languages)(
        '%s uses single-brace interpolation everywhere',
        lang => {
            const offenders: string[] = [];

            for (const file of jsonFiles(lang)) {
                const contents = JSON.parse(
                    readFileSync(join(LANGUAGES_DIR, lang, file), 'utf8')
                );
                for (const { path, text } of leaves(contents)) {
                    if (/\{\{\s*\w+\s*\}\}/.test(text)) {
                        offenders.push(`${file}:${path} -> ${text}`);
                    }
                }
            }

            expect(offenders).toEqual([]);
        }
    );

    it('keeps the same placeholder set for every language', () => {
        const placeholders = (lang: string, file: string) => {
            const contents = JSON.parse(
                readFileSync(join(LANGUAGES_DIR, lang, file), 'utf8')
            );
            return leaves(contents).flatMap(({ path, text }) =>
                [...text.matchAll(/\{(\w+)\}/g)].map(m => `${path}.${m[1]}`)
            );
        };

        const [base, ...rest] = languages;
        for (const lang of rest) {
            const shared = jsonFiles(base).filter(f =>
                jsonFiles(lang).includes(f)
            );
            for (const file of shared) {
                expect({
                    file,
                    lang,
                    keys: placeholders(lang, file).sort(),
                }).toEqual({
                    file,
                    lang,
                    keys: placeholders(base, file).sort(),
                });
            }
        }
    });
});

describe('MessageService interpolation (real i18n, no mocks)', () => {
    let messageService: MessageService;

    beforeAll(async () => {
        const moduleRef = await Test.createTestingModule({
            imports: [
                I18nModule.forRoot({
                    loader: I18nJsonLoader,
                    fallbackLanguage: 'en',
                    loaderOptions: { path: LANGUAGES_DIR, watch: false },
                }),
            ],
            providers: [
                MessageService,
                HelperArrayService,
                {
                    // MessageService only reads the available-language list.
                    provide: ConfigService,
                    useValue: {
                        get: (key: string) =>
                            key === 'message.availableLanguage'
                                ? ['en', 'vi']
                                : undefined,
                    },
                },
            ],
        }).compile();

        messageService = moduleRef.get(MessageService);
    });

    // The bug this guards: `{{amount}}` renders literally, so the operator sees
    // "{{amount}} tokens were added" instead of the number.
    it('substitutes the credit notification arguments', () => {
        const message = messageService.setMessage(
            'notification.tokenCredited.message',
            { properties: { amount: '1,000,000', workspaceName: 'Acme' } }
        );

        expect(message).toContain('1,000,000');
        expect(message).toContain('Acme');
        expect(message).not.toContain('{');
    });

    it('leaves no placeholder behind in the Vietnamese copy either', () => {
        const message = messageService.setMessage(
            'notification.tokenCredited.message',
            {
                customLanguage: 'vi',
                properties: { amount: '2.500', workspaceName: 'Acme' },
            }
        );

        expect(message).toContain('2.500');
        expect(message).not.toContain('{');
    });
});
