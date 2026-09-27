export interface IHelperHashService {
    randomSalt(length: number): string;
    bcrypt(passwordString: string, salt: string): Promise<string>;
    bcryptCompare(
        passwordString: string,
        passwordHashed: string
    ): Promise<boolean>;
    bcryptGetCost(passwordHashed: string): number;
    sha256(string: string): string;
    sha256Compare(hashOne: string, hashTwo: string): boolean;
}
