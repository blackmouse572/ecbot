import {
    ENVELOPE_TOKEN_PREFIX,
    HelperEncryptionService,
} from '@app/common/helper/services/helper.encryption.service';
import { AccountEntity } from '@app/modules/account/repository/entities/account.entity';
import { AccountRepository } from '@app/modules/account/repository/repositories/account.repository';
import { EntityManager } from '@mikro-orm/postgresql';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Command, Option } from 'nestjs-command';

export interface IAccountTokenReencryptCounts {
    legacy: number;
    plaintext: number;
    alreadyEnveloped: number;
}

const TOKEN_FIELDS = ['accessToken', 'refreshToken'] as const;

@Injectable()
export class MigrationAccountTokenReencryptSeed {
    constructor(
        private readonly em: EntityManager,
        private readonly accountRepository: AccountRepository,
        private readonly helperEncryption: HelperEncryptionService,
        private readonly configService: ConfigService
    ) {}

    /**
     * Legacy vs plaintext. `envelopeDecrypt` routes a non-`v1:` value down the
     * legacy crypto-js path, which ends in `JSON.parse`. A real legacy
     * ciphertext decrypts back to the token; a value that was never encrypted
     * (what the admin write paths used to store) yields nothing parseable and
     * throws. So: a non-empty string back means legacy — re-encrypt what came
     * out. A throw or an empty result means the stored value *is* the token —
     * encrypt it as it stands.
     */
    private reencryptValue(value: string): {
        next: string;
        kind: 'legacy' | 'plaintext';
    } {
        let decrypted: string | undefined;
        try {
            const result = this.helperEncryption.envelopeDecrypt(value);
            if (typeof result === 'string' && result.length > 0) {
                decrypted = result;
            }
        } catch {
            decrypted = undefined;
        }

        return decrypted
            ? {
                  next: this.helperEncryption.envelopeEncrypt(decrypted),
                  kind: 'legacy',
              }
            : {
                  next: this.helperEncryption.envelopeEncrypt(value),
                  kind: 'plaintext',
              };
    }

    async reencryptTokens(
        dryRun: boolean
    ): Promise<IAccountTokenReencryptCounts> {
        const counts: IAccountTokenReencryptCounts = {
            legacy: 0,
            plaintext: 0,
            alreadyEnveloped: 0,
        };

        // A present-but-wrong legacy key makes the legacy decrypt throw, which
        // reencryptValue reads as *plaintext* and envelope-wraps irreversibly.
        // Refuse to run rather than silently corrupt every legacy row.
        if (
            !this.configService.get<string>('oauth.tokenEncryptKey') ||
            !this.configService.get<string>('oauth.tokenEncryptIv')
        ) {
            throw new Error(
                'OAUTH_TOKEN_ENCRYPT_KEY and OAUTH_TOKEN_ENCRYPT_IV must be set: without them every legacy row is misread as plaintext and wrapped irreversibly'
            );
        }

        // Fork for a request-scoped context (global EM is disallowed — see
        // DatabaseOptionService.allowGlobalContext=false).
        const em = this.em.fork();

        // One row per connected channel, so loading the table whole is cheaper
        // than expressing "not LIKE 'v1:%'" over two nullable columns.
        const accounts = await this.accountRepository.find<AccountEntity>(
            undefined,
            { em }
        );

        for (const account of accounts) {
            let changed = false;

            for (const field of TOKEN_FIELDS) {
                const value = account[field];
                if (!value) continue;
                if (value.startsWith(ENVELOPE_TOKEN_PREFIX)) {
                    counts.alreadyEnveloped++;
                    continue;
                }

                const { next, kind } = this.reencryptValue(value);
                counts[kind]++;

                // Never mutate under --dry-run: these are managed entities and
                // any later flush would persist the change.
                if (!dryRun) {
                    account[field] = next;
                    changed = true;
                }
            }

            if (changed) await this.accountRepository.save(account, { em });
        }

        return counts;
    }

    @Command({
        command: 'account:reencrypt-tokens',
        describe: 're-encrypt account platform tokens into the v1 envelope',
    })
    async reencrypt(
        @Option({
            name: 'dry-run',
            type: 'boolean',
            default: false,
            describe: 'report the counts without writing',
        })
        dryRun: boolean
    ): Promise<void> {
        const counts = await this.reencryptTokens(dryRun);

        // Written to stdout, not the Nest logger: `cli.ts` restricts the
        // application logger to error/fatal, and the counts are this
        // command's whole output.
        process.stdout.write(
            `${dryRun ? '[dry-run] ' : ''}legacy re-encrypted: ${
                counts.legacy
            }, plaintext encrypted: ${
                counts.plaintext
            }, already enveloped token values: ${counts.alreadyEnveloped}\n`
        );
    }
}
