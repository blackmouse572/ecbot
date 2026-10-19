export interface IHelperHashService {
    randomSalt(length: number): string;
    passwordHash(passwordString: string): Promise<string>;
    passwordVerify(
        passwordString: string,
        passwordHashed: string
    ): Promise<boolean>;
    passwordNeedsRehash(passwordHashed: string): boolean;
    sha256(string: string): string;
    sha256Compare(hashOne: string, hashTwo: string): boolean;
}
