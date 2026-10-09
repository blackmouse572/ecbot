// The login endpoints now document this response (a oneOf with the tokens),
// so after `pnpm generate:client` import it from @repo/client and delete
// this file.

/** What a login endpoint returns, in place of tokens, when MFA is on. */
export type AuthLoginMfaChallengeResponseDto = {
  mfaRequired: true;
  mfaToken: string;
  expiresIn: number;
};
