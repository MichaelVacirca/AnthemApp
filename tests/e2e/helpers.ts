import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
import postgres from "postgres";
import bcrypt from "bcryptjs";
import * as schema from "../../src/db/schema";

const url = process.env.E2E_DATABASE_URL ?? process.env.DATABASE_URL;
if (!url) {
  throw new Error("E2E_DATABASE_URL or DATABASE_URL must be set for tests");
}

const client = postgres(url, { max: 1 });
const db = drizzle(client, { schema });

export async function resetAuthAttempts(): Promise<void> {
  await db.delete(schema.authAttempt);
}

export async function ensureManagerPin(pin: string): Promise<void> {
  const all = await db.select().from(schema.staff);
  for (const s of all) {
    if (await bcrypt.compare(pin, s.pinHash)) {
      if (!s.isManager || !s.active) {
        await db
          .update(schema.staff)
          .set({ isManager: true, active: true })
          .where(eq(schema.staff.id, s.id));
      }
      return;
    }
  }
  const pinHash = await bcrypt.hash(pin, 10);
  await db.insert(schema.staff).values({
    name: "E2E Manager",
    pinHash,
    isManager: true,
  });
}
