import { join } from 'path';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { ValidationError } from 'class-validator';
import { I18nJsonLoader, I18nModule } from 'nestjs-i18n';
import { HelperArrayService } from '../../../src/common/helper/services/helper.array.service';
import { MessageService } from '../../../src/common/message/services/message.service';

const LANGUAGES_DIR = join(__dirname, '../../../src/languages');

// Custom validators report their constraint under the class name, and
// MessageService translates `request.<constraint>`. Without a string for it,
// the sign-up form shows the raw key, e.g. "request.IsCustomEmailConstraint".
describe('sign-up custom constraint messages (real i18n)', () => {
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

    const error = (property: string, constraint: string): ValidationError =>
        Object.assign(new ValidationError(), {
            property,
            value: 'x',
            constraints: { [constraint]: 'failed' },
            children: [],
        });

    it.each([
        ['en', 'email', 'IsCustomEmailConstraint'],
        ['vi', 'email', 'IsCustomEmailConstraint'],
        ['en', 'password', 'IsPasswordConstraint'],
        ['vi', 'password', 'IsPasswordConstraint'],
        ['en', 'acceptTerms', 'isTermsAccepted'],
        ['vi', 'acceptTerms', 'isTermsAccepted'],
    ])('%s: translates %s (%s)', (lang, property, constraint) => {
        const [{ message }] = messageService.setValidationMessage(
            [error(property, constraint)],
            { customLanguage: lang }
        );

        expect(message).not.toContain('request.');
        expect(message).toContain(property);
        expect(message).not.toContain('—');
    });
});
