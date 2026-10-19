import { Injectable } from '@nestjs/common';
import { argon2id, hash, needsRehash, verify } from 'argon2';
import { compare, genSaltSync } from 'bcrypt';
import { SHA256, enc } from 'crypto-js';
import { IHelperHashService } from 'src/common/helper/interfaces/helper.hash-service.interface';

// OWASP's argon2id baseline: 19 MiB, 2 passes, 1 lane.
const ARGON2_OPTIONS = {
    type: argon2id,
    memoryCost: 19_456,
    timeCost: 2,
    parallelism: 1,
};

@Injectable()
export class HelperHashService implements IHelperHashService {
    randomSalt(length: number): string {
        return genSaltSync(length);
    }

    // Both libraries hash on the libuv thread pool, so a password check never
    // takes CPU from the event loop.
    passwordHash(passwordString: string): Promise<string> {
        return hash(passwordString, ARGON2_OPTIONS);
    }

    // Passwords set before the move to argon2id are bcrypt hashes ($2a$/$2b$).
    passwordVerify(
        passwordString: string,
        passwordHashed: string
    ): Promise<boolean> {
        return passwordHashed.startsWith('$argon2')
            ? verify(passwordHashed, passwordString)
            : compare(passwordString, passwordHashed);
    }

    // True for a bcrypt hash, or an argon2 hash made with older settings.
    passwordNeedsRehash(passwordHashed: string): boolean {
        return (
            !passwordHashed.startsWith('$argon2') ||
            needsRehash(passwordHashed, ARGON2_OPTIONS)
        );
    }

    sha256(string: string): string {
        return SHA256(string).toString(enc.Hex);
    }

    sha256Compare(hashOne: string, hashTwo: string): boolean {
        return hashOne === hashTwo;
    }

    isUUID(id: string): boolean {
        const uuidRegex =
            /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        return uuidRegex.test(id);
    }
}
