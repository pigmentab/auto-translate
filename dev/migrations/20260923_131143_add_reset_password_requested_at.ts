import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

// Generated SQL also re-emitted the nested-docs schema because
// 20260610_125120_add_nested_docs_to_pages was hand-written without a JSON snapshot.
// Trimmed to the real delta; this migration's .json snapshot is the full current schema.
export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
  ALTER TABLE "translation_settings" ALTER COLUMN "temperature" DROP NOT NULL;
  ALTER TABLE "users" ADD COLUMN "reset_password_requested_at" timestamp(3) with time zone;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
  ALTER TABLE "translation_settings" ALTER COLUMN "temperature" SET NOT NULL;
  ALTER TABLE "users" DROP COLUMN "reset_password_requested_at";`)
}
