import { Injectable } from '@nestjs/common';
import { compare, genSaltSync, getRounds, hash } from 'bcryptjs';
import { SHA256, enc } from 'crypto-js';
import { IHelperHashService } from 'src/common/helper/interfaces/helper.hash-service.interface';

@Injectable()
export class HelperHashService implements IHelperHashService {
    randomSalt(length: number): string {
        return genSaltSync(length);
    }

    // Async so a cost-12 hash/compare (~250 ms) never blocks the event loop.
    bcrypt(passwordString: string, salt: string): Promise<string> {
        return hash(passwordString, salt);
    }

    bcryptCompare(
        passwordString: string,
        passwordHashed: string
    ): Promise<boolean> {
        return compare(passwordString, passwordHashed);
    }

    // The bcrypt cost is embedded in the hash string itself
    // (`$2a$<cost>$...`), so this reads back whatever cost a given hash
    // was created at, regardless of the currently configured cost.
    bcryptGetCost(passwordHashed: string): number {
        return getRounds(passwordHashed);
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
