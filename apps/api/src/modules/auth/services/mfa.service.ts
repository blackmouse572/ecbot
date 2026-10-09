import {
    BadRequestException,
    ConflictException,
    Inject,
    Injectable,
    Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, createHmac, randomBytes, randomUUID } from 'crypto';
import { HelperEncryptionService } from 'src/common/helper/services/helper.encryption.service';
import { REDIS_AVAILABLE } from 'src/common/redis/redis-availability.provider';
import { RedisConnectionProvider } from 'src/common/redis/redis-connection.provider';
import {
    AUTH_MFA_CHALLENGE_KEY_PREFIX,
    AUTH_MFA_CHALLENGE_TTL_SECONDS,
    AUTH_MFA_DEFAULT_ISSUER,
    AUTH_MFA_RECOVERY_CODE_BYTES,
    AUTH_MFA_RECOVERY_CODE_COUNT,
} from 'src/modules/auth/constants/auth.mfa.constant';
import { AuthMfaEnableResponseDto } from 'src/modules/auth/dtos/response/auth.mfa-enable.response.dto';
import { AuthMfaSetupResponseDto } from 'src/modules/auth/dtos/response/auth.mfa-setup.response.dto';
import { ENUM_AUTH_STATUS_CODE_ERROR } from 'src/modules/auth/enums/auth.status-code.enum';
import {
    IAuthMfaChallenge,
    IAuthMfaMethod,
} from 'src/modules/auth/interfaces/auth.interface';
import {
    base32Encode,
    buildOtpauthUri,
    generateTotpSecret,
    verifyTotp,
} from 'src/modules/auth/utils/auth.totp.util';
import { ENUM_SEND_EMAIL_PROCESS } from 'src/modules/email/enums/email.enum';
import { SessionService } from 'src/modules/session/services/session.service';
import { UserEntity } from 'src/modules/user/repository/entities/user.entity';
import { UserService } from 'src/modules/user/services/user.service';
import { CloudTasksQueueClient } from 'src/worker/cloud-tasks-queue.client';

@Injectable()
export class MfaService {
    private readonly logger = new Logger(MfaService.name);
    private readonly recoveryPepper: string;
    // Challenges when Redis was unreachable at boot (single instance only).
    private readonly memoryChallenges = new Map<
        string,
        { value: string; expiresAt: number }
    >();

    constructor(
        private readonly redis: RedisConnectionProvider,
        @Inject(REDIS_AVAILABLE) private readonly redisAvailable: boolean,
        configService: ConfigService,
        private readonly helperEncryptionService: HelperEncryptionService,
        private readonly userService: UserService,
        private readonly sessionService: SessionService,
        private readonly cloudTasksClient: CloudTasksQueueClient
    ) {
        this.recoveryPepper = configService.get<string>(
            'auth.mfa.recoveryPepper'
        )!;
    }

    async setup(user: UserEntity): Promise<AuthMfaSetupResponseDto> {
        if (user.mfaEnabled) {
            throw new ConflictException({
                statusCode: ENUM_AUTH_STATUS_CODE_ERROR.MFA_ALREADY_ENABLED,
                message: 'auth.error.mfaAlreadyEnabled',
            });
        }

        const secret = generateTotpSecret();
        await this.userService.updateMfa(user, {
            mfaPendingSecret:
                this.helperEncryptionService.envelopeEncrypt(secret),
        });

        return {
            secret,
            otpauthUri: buildOtpauthUri(
                secret,
                user.email,
                AUTH_MFA_DEFAULT_ISSUER
            ),
        };
    }

    async enable(
        user: UserEntity,
        code: string,
        now: number = Date.now()
    ): Promise<AuthMfaEnableResponseDto> {
        if (user.mfaEnabled) {
            throw new ConflictException({
                statusCode: ENUM_AUTH_STATUS_CODE_ERROR.MFA_ALREADY_ENABLED,
                message: 'auth.error.mfaAlreadyEnabled',
            });
        }
        if (!user.mfaPendingSecret) {
            throw new BadRequestException({
                statusCode: ENUM_AUTH_STATUS_CODE_ERROR.MFA_SETUP_NOT_STARTED,
                message: 'auth.error.mfaSetupNotStarted',
            });
        }

        const secret = this.helperEncryptionService.envelopeDecrypt(
            user.mfaPendingSecret
        );
        const step = verifyTotp(secret, code, now);
        if (step === null) {
            throw this.invalidCodeError();
        }

        const recoveryCodes = this.createRecoveryCodes();
        await this.userService.updateMfa(user, {
            mfaEnabled: true,
            mfaSecret: user.mfaPendingSecret,
            mfaPendingSecret: null,
            mfaRecoveryCodes: recoveryCodes.map(c => this.hashRecoveryCode(c)),
            mfaLastTimeStep: step,
        });

        return { recoveryCodes };
    }

    /** Replaces every recovery code with a new set, shown this once. */
    async regenerateRecoveryCodes(
        user: UserEntity
    ): Promise<AuthMfaEnableResponseDto> {
        const recoveryCodes = this.createRecoveryCodes();
        await this.userService.updateMfa(user, {
            mfaRecoveryCodes: recoveryCodes.map(c => this.hashRecoveryCode(c)),
        });
        return { recoveryCodes };
    }

    async disable(user: UserEntity): Promise<void> {
        await this.userService.updateMfa(user, {
            mfaEnabled: false,
            mfaSecret: null,
            mfaPendingSecret: null,
            mfaRecoveryCodes: null,
            mfaLastTimeStep: null,
        });
    }

    /**
     * Checks a 6-digit TOTP code or a recovery code and says which one
     * passed, or null. Both are spent with a conditional update, so of two
     * concurrent requests carrying the same code only one gets through.
     */
    async verify(
        user: UserEntity,
        code: string,
        now: number = Date.now()
    ): Promise<IAuthMfaMethod | null> {
        if (!user.mfaEnabled || !user.mfaSecret) return null;

        const trimmed = code.trim();
        if (/^\d{6}$/.test(trimmed)) {
            const step = verifyTotp(
                this.helperEncryptionService.envelopeDecrypt(user.mfaSecret),
                trimmed,
                now,
                user.mfaLastTimeStep
            );
            if (step === null) return null;
            return (await this.userService.claimMfaTimeStep(user, step))
                ? 'totp'
                : null;
        }

        return (await this.userService.consumeMfaRecoveryCode(
            user,
            this.hashRecoveryCode(trimmed)
        ))
            ? 'recovery'
            : null;
    }

    async createChallenge(challenge: IAuthMfaChallenge): Promise<string> {
        const token = randomBytes(32).toString('base64url');
        const key = this.challengeKey(token);
        const value = JSON.stringify(challenge);
        const ttlMs = AUTH_MFA_CHALLENGE_TTL_SECONDS * 1000;

        if (this.redisAvailable) {
            await this.redis.client.set(key, value, 'PX', ttlMs);
        } else {
            this.sweepMemoryChallenges();
            this.memoryChallenges.set(key, {
                value,
                expiresAt: Date.now() + ttlMs,
            });
        }
        return token;
    }

    /** Reads a challenge without spending it, so a mistyped code can be retried. */
    async findChallenge(token: string): Promise<IAuthMfaChallenge | null> {
        const key = this.challengeKey(token);
        const value = this.redisAvailable
            ? await this.redis.client.get(key)
            : this.readMemoryChallenge(key);
        return value ? (JSON.parse(value) as IAuthMfaChallenge) : null;
    }

    /**
     * Spends a challenge with an atomic GETDEL: of concurrent callers only
     * one gets it back, so one challenge opens at most one session.
     */
    async consumeChallenge(token: string): Promise<IAuthMfaChallenge | null> {
        const key = this.challengeKey(token);
        let value: string | null;
        if (this.redisAvailable) {
            value = await this.redis.client.getdel(key);
        } else {
            value = this.readMemoryChallenge(key);
            this.memoryChallenges.delete(key);
        }
        return value ? (JSON.parse(value) as IAuthMfaChallenge) : null;
    }

    /**
     * After MFA was turned on or off: signs the user out of every session
     * but `keepSession` (all of them when omitted) and emails them. A failed
     * email is logged, not thrown: the change itself is already saved.
     */
    async revokeSessionsAndNotify(
        user: UserEntity,
        enabled: boolean,
        options: { keepSession?: string; language?: string } = {}
    ): Promise<void> {
        await this.sessionService.updateManyRevokeByUser(
            user.id,
            undefined,
            options.keepSession
        );
        await this.cloudTasksClient
            .enqueue(
                'email',
                ENUM_SEND_EMAIL_PROCESS.MFA_CHANGED,
                {
                    send: { email: user.email, name: user.name },
                    data: { enabled, language: options.language },
                },
                {
                    taskName: `${ENUM_SEND_EMAIL_PROCESS.MFA_CHANGED}-${user.id}-${randomUUID()}`,
                }
            )
            .catch((err: unknown) =>
                this.logger.warn(
                    `MFA email for user [${user.id}] not queued (non-fatal): ${(err as Error)?.message}`
                )
            );
    }

    invalidCodeError(): BadRequestException {
        return new BadRequestException({
            statusCode: ENUM_AUTH_STATUS_CODE_ERROR.MFA_CODE_INVALID,
            message: 'auth.error.mfaCodeInvalid',
        });
    }

    private challengeKey(token: string): string {
        // Hashed so a cache dump does not hand out live challenges.
        return `${AUTH_MFA_CHALLENGE_KEY_PREFIX}:${createHash('sha256').update(token).digest('hex')}`;
    }

    private readMemoryChallenge(key: string): string | null {
        const entry = this.memoryChallenges.get(key);
        if (!entry || entry.expiresAt <= Date.now()) return null;
        return entry.value;
    }

    private sweepMemoryChallenges(): void {
        const now = Date.now();
        for (const [key, entry] of this.memoryChallenges) {
            if (entry.expiresAt <= now) this.memoryChallenges.delete(key);
        }
    }

    private createRecoveryCodes(): string[] {
        return Array.from({ length: AUTH_MFA_RECOVERY_CODE_COUNT }, () =>
            this.createRecoveryCode()
        );
    }

    // 80 random bits, shown as "xxxx-xxxx-xxxx-xxxx".
    private createRecoveryCode(): string {
        const raw = base32Encode(
            randomBytes(AUTH_MFA_RECOVERY_CODE_BYTES)
        ).toLowerCase();
        return raw.match(/.{4}/g)!.join('-');
    }

    // Keyed with a server-side pepper, so a leaked table cannot be brute
    // forced offline without the key.
    private hashRecoveryCode(code: string): string {
        const normalized = code.toLowerCase().replace(/[^a-z0-9]/g, '');
        return createHmac('sha256', this.recoveryPepper)
            .update(normalized)
            .digest('hex');
    }
}
