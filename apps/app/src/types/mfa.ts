// Local mirrors of the API's MFA DTOs. They move to `@repo/client` on the
// next `pnpm generate:client`; import from there once they exist.

export type AuthMfaSetupResponseDto = {
  secret: string;
  otpauthUri: string;
};

export type AuthMfaEnableResponseDto = {
  recoveryCodes: string[];
};

export type AuthMfaDisableRequestDto = {
  password: string;
  code: string;
};

export type AuthLoginMfaRequestDto = {
  mfaToken: string;
  code: string;
};

/** What a login endpoint returns, in place of tokens, when MFA is on. */
export type AuthLoginMfaChallengeResponseDto = {
  mfaRequired: true;
  mfaToken: string;
  expiresIn: number;
};
