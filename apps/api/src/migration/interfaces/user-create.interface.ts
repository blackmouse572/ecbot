export interface IUserCreateInput {
    email: string;
    /** Omit to have a strong one generated and printed once. */
    password?: string;
    /** Role name. Defaults to `superadmin`. */
    role?: string;
    /** Defaults to the part of the email before the `@`. */
    name?: string;
    /** ISO 3166-1 alpha-2 code. Defaults to `VN`. */
    country?: string;
}

export interface IUserCreateResult {
    id: string;
    email: string;
    role: string;
    /** Set only when the command generated the password. */
    generatedPassword?: string;
}
