// Mirrors the API's password rule (HelperStringService.checkPasswordStrength):
// at least 8 characters with a number, a lowercase and an uppercase letter.
export const PASSWORD_REQUIREMENTS = [
  { key: "minLength", regex: /.{8,}/ },
  { key: "number", regex: /[0-9]/ },
  { key: "lowercase", regex: /[a-z]/ },
  { key: "uppercase", regex: /[A-Z]/ },
] as const;

export const isStrongPassword = (password: string) =>
  PASSWORD_REQUIREMENTS.every(({ regex }) => regex.test(password));
