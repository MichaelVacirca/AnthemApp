import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import { lt, sql } from "drizzle-orm";
import postgres from "postgres";
import * as schema from "./schema";

const AUTH_ATTEMPT_RETAIN_HOURS = Number(process.env.AUTH_ATTEMPT_RETAIN_HOURS ?? 24);
const ADMIN_ACTION_RETAIN_DAYS = Number(process.env.ADMIN_ACTION_RETAIN_DAYS ?? 365);

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set.");

  const client = postgres(url, { max: 1 });
  const db = drizzle(client, { schema });

  const authCutoff = new Date(Date.now() - AUTH_ATTEMPT_RETAIN_HOURS * 60 * 60 * 1000);
  const auditCutoff = new Date(Date.now() - ADMIN_ACTION_RETAIN_DAYS * 24 * 60 * 60 * 1000);

  const auth = await db
    .delete(schema.authAttempt)
    .where(lt(schema.authAttempt.attemptedAt, authCutoff))
    .returning({ id: schema.authAttempt.id });

  const audit = await db
    .delete(schema.adminAction)
    .where(lt(schema.adminAction.createdAt, auditCutoff))
    .returning({ id: schema.adminAction.id });

  await db.execute(sql`vacuum (analyze) auth_attempt, admin_action`).catch(() => {});

  console.log(
    `Pruned auth_attempt: ${auth.length} (>${AUTH_ATTEMPT_RETAIN_HOURS}h), admin_action: ${audit.length} (>${ADMIN_ACTION_RETAIN_DAYS}d).`,
  );

  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
