import { Migration } from '@mikro-orm/migrations';

export class Migration20260730081646_widen_invitation_token extends Migration {
    // Widen invitations.token from varchar(255) to text: it stores a signed
    // invitation JWT (header.payload.signature) which exceeds 255 chars once a
    // roleId is included, overflowing the column on insert. Only this column is
    // altered — unrelated schema drift picked up by the diff is intentionally
    // excluded.
    override async up(): Promise<void> {
        this.addSql(
            `alter table "invitations" alter column "token" type text using ("token"::text);`
        );
    }

    override async down(): Promise<void> {
        this.addSql(
            `alter table "invitations" alter column "token" type varchar(255) using ("token"::varchar(255));`
        );
    }
}
