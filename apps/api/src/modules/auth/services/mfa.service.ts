import { CACHE_MANAGER } from '@nestjs/cache-manager';
import {
    BadRequestException,
    ConflictException,
    Inject,
    Injectable,
} from '@nestjs/common';
import { Cache } from 'cache-manager';
import { createHash, randomBytes, timingSafeEqual } from 'crypto';
import { HelperEncryptionService } from 'src/common/helper/services/helper.encryption.service';
import {
    AUTH_MFA_CHALLENGE_TTL_SECONDS,
    AUTH_MFA_DEFAULT_ISSUER,
    AUTH_MFA_RECOVERY_CODE_COUNT,
} from 'src/modules/auth/constants/auth.mfa.constant';
import { AuthMfaEnableResponseDto } from 'src/modules/auth/dtos/response/auth.mfa-enable.response.dto';
import { AuthMfaSetupResponseDto } from 'src/modules/auth/dtos/response/auth.mfa-setup.response.dto';
import { ENUM_AUTH_STATUS_CODE_ERROR } from 'src/modules/auth/enums/auth.status-code.enum';
import { IAuthMfaChallenge } from 'src/modules/auth/interfaces/auth.interface';
import {
    base32Encode,
    buildOtpauthUri,
    generateTotpSecret,
    verifyTotp,
} from 'src/modules/auth/utils/auth.totp.util';
import { UserEntity } from 'src/modules/user/repository/entities/user.entity';
import { UserService } from 'src/modules/user/services/user.service';

@Injectable()
export class MfaService {
    constructor(
        @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
        private readonly helperEncryptionService: HelperEncryptionService,
        private readonly userService: UserService
    ) {}

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

        const recoveryCodes = Array.from(
            { length: AUTH_MFA_RECOVERY_CODE_COUNT },
            () => this.createRecoveryCode()
        );
        await this.userService.updateMfa(user, {
            mfaEnabled: true,
            mfaSecret: user.mfaPendingSecret,
            mfaPendingSecret: null,
            mfaRecoveryCodes: recoveryCodes.map(c => this.hashRecoveryCode(c)),
            mfaLastTimeStep: step,
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
     * Checks a 6-digit TOTP code or a recovery code. An accepted TOTP step
     * and a used recovery code are recorded, so neither works twice.
     */
    async verify(
        user: UserEntity,
        code: string,
        now: number = Date.now()
    ): Promise<boolean> {
        if (!user.mfaEnabled || !user.mfaSecret) return false;

        const trimmed = code.trim();
        if (/^\d{6}$/.test(trimmed)) {
            const step = verifyTotp(
                this.helperEncryptionService.envelopeDecrypt(user.mfaSecret),
                trimmed,
                now,
                user.mfaLastTimeStep
            );
            if (step === null) return false;
            await this.userService.updateMfa(user, { mfaLastTimeStep: step });
            return true;
        }

        const given = Buffer.from(this.hashRecoveryCode(trimmed));
        const remaining = user.mfaRecoveryCodes ?? [];
        const index = remaining.findIndex(
            hash =>
                hash.length === given.length &&
                timingSafeEqual(Buffer.from(hash), given)
        );
        if (index === -1) return false;

        await this.userService.updateMfa(user, {
            mfaRecoveryCodes: remaining.filter((_, i) => i !== index),
        });
        return true;
    }

    async createChallenge(challenge: IAuthMfaChallenge): Promise<string> {
        const token = randomBytes(32).toString('base64url');
        await this.cacheManager.set(
            this.challengeKey(token),
            challenge,
            AUTH_MFA_CHALLENGE_TTL_SECONDS * 1000
        );
        return token;
    }

    async findChallenge(token: string): Promise<IAuthMfaChallenge | null> {
        return (
            (await this.cacheManager.get<IAuthMfaChallenge>(
                this.challengeKey(token)
            )) ?? null
        );
    }

    async deleteChallenge(token: string): Promise<void> {
        await this.cacheManager.del(this.challengeKey(token));
    }

    invalidCodeError(): BadRequestException {
        return new BadRequestException({
            statusCode: ENUM_AUTH_STATUS_CODE_ERROR.MFA_CODE_INVALID,
            message: 'auth.error.mfaCodeInvalid',
        });
    }

    private challengeKey(token: string): string {
        // Hashed so a cache dump does not hand out live challenges.
        return `auth:mfa:challenge:${createHash('sha256').update(token).digest('hex')}`;
    }

    // 50 random bits, shown as "xxxxx-xxxxx".
    private createRecoveryCode(): string {
        const raw = base32Encode(randomBytes(7)).slice(0, 10).toLowerCase();
        return `${raw.slice(0, 5)}-${raw.slice(5)}`;
    }

    private hashRecoveryCode(code: string): string {
        const normalized = code.toLowerCase().replace(/[^a-z0-9]/g, '');
        return createHash('sha256').update(normalized).digest('hex');
    }
}
