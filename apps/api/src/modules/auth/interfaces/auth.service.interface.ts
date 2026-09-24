import { Response } from 'express';
import { AuthLoginResponseDto } from 'src/modules/auth/dtos/response/auth.login.response.dto';
import { ENUM_AUTH_LOGIN_FROM } from 'src/modules/auth/enums/auth.enum';
import {
    IAuthJwtAccessTokenPayload,
    IAuthJwtRefreshTokenPayload,
    IAuthPassword,
    IAuthPasswordOptions,
    IAuthSocialApplePayload,
    IAuthSocialGooglePayload,
} from 'src/modules/auth/interfaces/auth.interface';
import { UserEntity } from 'src/modules/user/repository/entities/user.entity';

export interface IAuthService {
    createAccessToken(
        subject: string,
        payload: IAuthJwtAccessTokenPayload
    ): string;
    validateAccessToken(subject: string, token: string): boolean;
    payload<T = any>(token: string): T;
    createRefreshToken(
        subject: string,
        payload: IAuthJwtRefreshTokenPayload
    ): string;
    validateRefreshToken(subject: string, token: string): boolean;
    verifyRefreshTokenAllowExpired(
        token: string
    ): IAuthJwtRefreshTokenPayload | null;
    validateUser(passwordString: string, passwordHash: string): boolean;
    runDummyPasswordCompare(passwordString: string): void;
    maybeRehashPassword(
        passwordString: string,
        currentPasswordHash: string
    ): Pick<IAuthPassword, 'passwordHash' | 'salt'> | null;
    createPayloadAccessToken(
        data: UserEntity,
        session: string,
        loginDate: Date,
        loginFrom: ENUM_AUTH_LOGIN_FROM
    ): IAuthJwtAccessTokenPayload;
    createPayloadRefreshToken(
        {
            user,
            session,
            loginFrom,
            loginDate,
        }: IAuthJwtAccessTokenPayload,
        rememberMe: boolean
    ): IAuthJwtRefreshTokenPayload;
    createSalt(length: number): string;
    createPassword(
        password: string,
        options?: IAuthPasswordOptions
    ): IAuthPassword;
    createPasswordRandom(): string;
    checkPasswordExpired(passwordExpired: Date): boolean;
    createToken(
        user: UserEntity,
        session: string,
        rememberMe?: boolean
    ): AuthLoginResponseDto;
    refreshToken(
        user: UserEntity,
        refreshTokenFromRequest: string
    ): AuthLoginResponseDto;
    getPasswordAttempt(): boolean;
    getPasswordMaxAttempt(): number;
    appleGetTokenInfo(idToken: string): Promise<IAuthSocialApplePayload>;
    googleGetTokenInfo(idToken: string): Promise<IAuthSocialGooglePayload>;
    setRefreshTokenCookie(
        res: Response,
        token: string,
        rememberMe?: boolean
    ): void;
    clearRefreshTokenCookie(res: Response): void;
}
