// The login endpoints document only the token response, so the generated
// client has no type for the MFA challenge they return instead.

/** What a login endpoint returns, in place of tokens, when MFA is on. */
export type AuthLoginMfaChallengeResponseDto = {
  mfaRequired: true;
  mfaToken: string;
  expiresIn: number;
};
