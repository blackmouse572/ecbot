import crypto from 'crypto';
import fs from 'fs';
import path, { join } from 'path';

class JwtKeysGenerator {
    private readonly keyDir: string;
    private readonly envPath: string;
    private readonly jwksOutputPath: string;
    private readonly accessTokenPrivateKeyPath: string;
    private readonly accessTokenPublicKeyPath: string;
    private readonly refreshTokenPrivateKeyPath: string;
    private readonly refreshTokenPublicKeyPath: string;

    constructor(keyDir: string) {
        this.keyDir = path.resolve(keyDir);
        this.envPath = path.join(path.dirname(this.keyDir), '.env');
        this.accessTokenPrivateKeyPath = path.join(
            this.keyDir,
            'access-token.pem'
        );
        this.accessTokenPublicKeyPath = path.join(
            this.keyDir,
            'access-token.pub'
        );
        this.refreshTokenPrivateKeyPath = path.join(
            this.keyDir,
            'refresh-token.pem'
        );
        this.refreshTokenPublicKeyPath = path.join(
            this.keyDir,
            'refresh-token.pub'
        );
        this.jwksOutputPath = path.join(this.keyDir, 'jwks.json');
    }

    ensureDir(dir: string): void {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
    }

    generateES512KeyPair(privateKeyPath: string, publicKeyPath: string): void {
        const keyPair = crypto.generateKeyPairSync('ec', {
            namedCurve: 'secp521r1',
            publicKeyEncoding: {
                type: 'spki',
                format: 'pem',
            },
            privateKeyEncoding: {
                type: 'pkcs8',
                format: 'pem',
            },
        });

        fs.writeFileSync(privateKeyPath, keyPair.privateKey);
        fs.writeFileSync(publicKeyPath, keyPair.publicKey);

        try {
            fs.chmodSync(privateKeyPath, 0o600);
        } catch (err) {
            console.warn(`Could not set permissions for ${privateKeyPath}`);
        }
    }

    extractECParams(publicKeyPath: string): {
        x?: string;
        y?: string;
        crv?: string;
    } {
        try {
            const pemContent = fs.readFileSync(publicKeyPath, 'utf8');
            const publicKey = crypto.createPublicKey({
                key: pemContent,
                format: 'pem',
            });

            const keyDetails = publicKey.export({ format: 'jwk' });

            return {
                x: keyDetails.x,
                y: keyDetails.y,
                crv: keyDetails.crv,
            };
        } catch (error) {
            console.error(
                `Error extracting EC parameters from ${publicKeyPath}: ${error.message}`
            );
            throw error;
        }
    }

    createJwk(
        params: {
            x?: string;
            y?: string;
            crv?: string;
        },
        kid: string
    ): {
        kty: string;
        crv?: string;
        x?: string;
        y?: string;
        use: string;
        alg: string;
        kid: string;
    } {
        return {
            kty: 'EC',
            crv: params.crv,
            x: params.x,
            y: params.y,
            use: 'sig',
            alg: 'ES512',
            kid,
        };
    }

    createJwks(
        accessKeyPath: string,
        refreshKeyPath: string,
        outputPath: string
    ): { accessKid: string; refreshKid: string } {
        try {
            const accessParams = this.extractECParams(accessKeyPath);
            const refreshParams = this.extractECParams(refreshKeyPath);

            // randomly generate a kid for the keys
            const accessKid = crypto.randomBytes(16).toString('hex');
            const refreshKid = crypto.randomBytes(16).toString('hex');
            const accessJwk = this.createJwk(accessParams, accessKid);
            const refreshJwk = this.createJwk(refreshParams, refreshKid);

            const jwks = {
                keys: [accessJwk, refreshJwk],
            };

            const outputDir = path.dirname(outputPath);
            this.ensureDir(outputDir);

            if (fs.existsSync(outputPath)) {
                const stat = fs.lstatSync(outputPath); // Use lstatSync to check the path itself
                if (stat.isDirectory()) {
                    console.warn(
                        `Warning: Path ${outputPath} for JWKS file is an existing directory. Removing it.`
                    );
                    // fs.rmSync requires Node.js v12.10.0+ for recursive, v14.14.0+ for force.
                    // Ensure your Node.js version meets these requirements.
                    fs.rmSync(outputPath, { recursive: true, force: true });
                }
            }

            fs.writeFileSync(outputPath, JSON.stringify(jwks, null, 2));
            console.log(`JWKS successfully created at ${outputPath}`);

            return { accessKid, refreshKid };
        } catch (error) {
            console.error(`Error creating JWKS: ${error.message}`);
            throw error;
        }
    }

    // In-place replace, not append — appending would grow .env unboundedly
    // across repeated `generate` runs and leave stale KIDs behind after
    // `rollback` (both verified against a real .env: Docker Compose's
    // env_file parser and dotenv agree on last-occurrence-wins, but relying
    // on that to shadow a never-shrinking pile of old KIDs is still a trap).
    // `value: null` removes the line entirely (used by rollback).
    private setEnvVar(key: string, value: string | null): void {
        if (!fs.existsSync(this.envPath)) {
            return;
        }

        const content = fs.readFileSync(this.envPath, 'utf8');
        const lineRegex = new RegExp(`^${key}=.*$`, 'm');

        if (value === null) {
            const withoutLine = content.replace(
                new RegExp(`^${key}=.*\\n?`, 'm'),
                ''
            );
            if (withoutLine !== content) {
                fs.writeFileSync(this.envPath, withoutLine);
            }
            return;
        }

        const newLine = `${key}="${value}"`;
        if (lineRegex.test(content)) {
            fs.writeFileSync(this.envPath, content.replace(lineRegex, newLine));
        } else {
            const separator =
                content === '' || content.endsWith('\n') ? '' : '\n';
            fs.writeFileSync(
                this.envPath,
                `${content}${separator}${newLine}\n`
            );
        }
    }

    syncEnvKids(accessKid: string, refreshKid: string): void {
        if (!fs.existsSync(this.envPath)) {
            console.warn(
                `No .env found at ${this.envPath} — skipping KID sync. Copy .env.example and set AUTH_JWT_ACCESS_TOKEN_KID/AUTH_JWT_REFRESH_TOKEN_KID manually.`
            );
            return;
        }

        this.setEnvVar('AUTH_JWT_ACCESS_TOKEN_KID', accessKid);
        this.setEnvVar('AUTH_JWT_REFRESH_TOKEN_KID', refreshKid);
        console.log(`Synced KIDs into ${this.envPath}`);
    }

    // Fills OAUTH_TOKEN_ENCRYPT_KEY only when the line exists and is empty —
    // a value the user already set is never overwritten, and a missing line
    // is reported rather than invented.
    syncEnvOauthEncryptKey(): void {
        const key = 'OAUTH_TOKEN_ENCRYPT_KEY';

        if (!fs.existsSync(this.envPath)) {
            console.warn(
                `No .env found at ${this.envPath} — skipping ${key} sync.`
            );
            return;
        }

        const content = fs.readFileSync(this.envPath, 'utf8');
        const match = content.match(new RegExp(`^${key}=(.*)$`, 'm'));

        if (!match) {
            console.warn(`No ${key} line found in ${this.envPath} — skipping.`);
            return;
        }

        const currentValue = match[1].trim().replace(/^"(.*)"$/, '$1');
        if (currentValue !== '') {
            return;
        }

        const generated = crypto.randomBytes(16).toString('hex');
        this.setEnvVar(key, generated);
        console.log(`Generated ${key} into ${this.envPath}`);
    }

    generateKeys(): void {
        try {
            this.ensureDir(this.keyDir);
            // Generate access token
            console.log('Generating Access Token ES512 keys...');
            this.generateES512KeyPair(
                this.accessTokenPrivateKeyPath,
                this.accessTokenPublicKeyPath
            );

            // Generate refresh token
            console.log('Generating Refresh Token ES512 keys...');
            this.generateES512KeyPair(
                this.refreshTokenPrivateKeyPath,
                this.refreshTokenPublicKeyPath
            );

            // Generate JWKS
            console.log('Generating JWKS...');
            const { accessKid, refreshKid } = this.createJwks(
                this.accessTokenPublicKeyPath,
                this.refreshTokenPublicKeyPath,
                this.jwksOutputPath
            );
            this.syncEnvKids(accessKid, refreshKid);
            this.syncEnvOauthEncryptKey();

            console.log('JWT keys and JWKS generated successfully!');
        } catch (err) {
            console.error(`Failed to generate JWT keys: ${err.message}`);
            process.exit(1);
        }
    }

    rollbackKeys(): void {
        try {
            if (fs.existsSync(this.accessTokenPrivateKeyPath)) {
                fs.unlinkSync(this.accessTokenPrivateKeyPath);
            }

            if (fs.existsSync(this.accessTokenPublicKeyPath)) {
                fs.unlinkSync(this.accessTokenPublicKeyPath);
            }

            if (fs.existsSync(this.refreshTokenPrivateKeyPath)) {
                fs.unlinkSync(this.refreshTokenPrivateKeyPath);
            }

            if (fs.existsSync(this.refreshTokenPublicKeyPath)) {
                fs.unlinkSync(this.refreshTokenPublicKeyPath);
            }

            if (fs.existsSync(this.jwksOutputPath)) {
                fs.unlinkSync(this.jwksOutputPath);
            }

            // Otherwise .env keeps pointing at KIDs for keys that no longer exist.
            this.setEnvVar('AUTH_JWT_ACCESS_TOKEN_KID', null);
            this.setEnvVar('AUTH_JWT_REFRESH_TOKEN_KID', null);

            console.log('JWT keys and JWKS removed successfully!');
        } catch (err) {
            console.error(`Failed to remove JWT keys: ${err.message}`);
            process.exit(1);
        }
    }
}

function main() {
    // pnpm 9 forwards a literal `--` from `pnpm run x -- args`; ignore it.
    const argv = process.argv
        .slice(2)
        .filter((a, i) => !(i === 0 && a === '--'));
    const command = argv[0] || 'generate';
    const keyDir = argv[1] || join(process.cwd(), 'keys');

    const generator = new JwtKeysGenerator(keyDir);

    if (command === 'generate') {
        generator.generateKeys();
    } else if (command === 'rollback') {
        generator.rollbackKeys();
    } else {
        console.log(`
Usage: node migrate-jwt-keys.js [command] [keysDir]

Commands:
  generate    Generate JWT ES512 keys and JWKS (default)
  rollback    Remove JWT ES512 keys and JWKS

Arguments:
  keysDir     Output directory for keys (default: ./keys)
  `);
    }
}

main();
