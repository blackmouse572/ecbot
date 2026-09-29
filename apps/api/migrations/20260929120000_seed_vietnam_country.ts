import { Migration } from '@mikro-orm/migrations';

// Data only: sign-up requires a country, and deployments seeded before
// Vietnam was added to seed:country list only Indonesia. Idempotent.
export class Migration20260929120000_seed_vietnam_country extends Migration {

  override async up(): Promise<void> {
    this.addSql(`insert into "countries" ("name", "alpha2code", "alpha3code", "numeric_code", "fips_code", "phone_code", "continent", "time_zone", "currency") values ('Vietnam', 'VN', 'VNM', '704', 'VM', '["84"]', 'Asia', 'Asia/Ho_Chi_Minh', 'VND') on conflict do nothing;`);
  }

  override async down(): Promise<void> {
    // Keep the row if any user already picked it.
    this.addSql(`delete from "countries" where "alpha2code" = 'VN' and not exists (select 1 from "users" where "users"."country_id" = "countries"."id");`);
  }

}
