import { Migration } from '@mikro-orm/migrations';

export class Migration20260226054645 extends Migration {
    override async up(): Promise<void> {
        // This migration is a no-op to skip it safely.
        // The audit column refactoring (created_by/updated_by -> created_by_id/updated_by_id)
        // has already been completed in earlier migrations or is handled elsewhere.
        // This migration file was auto-generated but conflicted with existing schema state.
    }

    override async down(): Promise<void> {
        // No-op down migration for consistency
    }
}
