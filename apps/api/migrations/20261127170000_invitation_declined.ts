import { Migration } from '@mikro-orm/migrations';

// #648: an invitee's decline gets its own status instead of REVOKED.
export class Migration20261127170000_invitation_declined extends Migration {
    override async up(): Promise<void> {
        this.addSql(
            `alter table "invitations" drop constraint if exists "invitations_status_check";`
        );
        this.addSql(
            `alter table "invitations" add constraint "invitations_status_check" check("status" in ('PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED', 'DECLINED'));`
        );
    }

    override async down(): Promise<void> {
        // A decline was stored as REVOKED before this status existed.
        this.addSql(
            `update "invitations" set "status" = 'REVOKED' where "status" = 'DECLINED';`
        );
        this.addSql(
            `alter table "invitations" drop constraint if exists "invitations_status_check";`
        );
        this.addSql(
            `alter table "invitations" add constraint "invitations_status_check" check("status" in ('PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED'));`
        );
    }
}
