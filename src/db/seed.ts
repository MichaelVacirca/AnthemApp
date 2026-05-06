import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import bcrypt from "bcryptjs";
import * as schema from "./schema";

const STARTER_CHECKLISTS: Array<{
  role: string;
  shift: "opening" | "closing";
  items: string[];
}> = [
  {
    role: "Bartender",
    shift: "opening",
    items: [
      "Unlock and inspect the bar area",
      "Stock garnishes (lemons, limes, olives, cherries)",
      "Refill ice wells",
      "Verify register float and start of shift cash count",
      "Test POS terminal and printer",
      "Check kegs and CO2 levels",
      "Polish glassware on the rail",
      "Wipe down bar top and stools",
    ],
  },
  {
    role: "Bartender",
    shift: "closing",
    items: [
      "Final cash drop signed and witnessed",
      "Wash and dry all glassware",
      "Empty and rinse ice wells",
      "Wipe down bar top, rail, and back bar",
      "Restock liquor for tomorrow's open",
      "Take fridge temperature reading",
      "Pull and date all garnishes",
      "Run dishwasher final cycle",
      "Lock liquor cage and turn off neon signs",
    ],
  },
  {
    role: "Barback",
    shift: "opening",
    items: [
      "Bring in deliveries and check invoices",
      "Stock beer fridges and reach-ins",
      "Fill ice bins from machine",
      "Confirm CO2 / N2 tank levels",
      "Restock napkins, straws, picks",
      "Sweep and mop floor behind bar",
    ],
  },
  {
    role: "Barback",
    shift: "closing",
    items: [
      "Empty and sanitize all trash bins",
      "Break down boxes and take to recycling",
      "Restock glassware to bar",
      "Sweep and mop floor behind bar",
      "Wipe down all rubber mats",
      "Refill all bar fridges to par",
    ],
  },
  {
    role: "Server",
    shift: "opening",
    items: [
      "Set up tables and chairs in section",
      "Roll silverware to par (50 minimum)",
      "Wipe down menus",
      "Stock service station with napkins, straws, sugar",
      "Brew coffee and prep tea station",
    ],
  },
  {
    role: "Server",
    shift: "closing",
    items: [
      "Close out checks and run cash drop",
      "Wipe down all tables and chairs",
      "Reset tables for tomorrow",
      "Restock silverware rolls",
      "Sweep section",
      "Confirm all to-go containers stocked",
    ],
  },
];

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set.");

  const client = postgres(url, { max: 1 });
  const db = drizzle(client, { schema });

  console.log("Seeding…");

  const existingRoles = await db.select().from(schema.role);
  const existingStaff = await db.select().from(schema.staff);

  if (existingRoles.length > 0 || existingStaff.length > 0) {
    console.log("Database already has data — skipping. Run drizzle-kit push or wipe to reseed.");
    await client.end();
    return;
  }

  const roleNames = Array.from(new Set(STARTER_CHECKLISTS.map((c) => c.role)));
  const insertedRoles = await db
    .insert(schema.role)
    .values(roleNames.map((name) => ({ name })))
    .returning();

  const roleByName = new Map(insertedRoles.map((r) => [r.name, r]));

  for (const c of STARTER_CHECKLISTS) {
    const role = roleByName.get(c.role)!;
    const [created] = await db
      .insert(schema.checklist)
      .values({
        roleId: role.id,
        shiftType: c.shift,
        name: `${c.role} · ${c.shift === "opening" ? "Opening" : "Closing"}`,
      })
      .returning();
    await db.insert(schema.checklistItem).values(
      c.items.map((label, i) => ({
        checklistId: created.id,
        label,
        position: i,
        required: true,
      })),
    );
  }

  const sampleStaff = [
    { name: "Alex (Manager)", pin: "9999", isManager: true, roles: ["Bartender"] },
    { name: "Sam", pin: "1234", isManager: false, roles: ["Bartender"] },
    { name: "Jordan", pin: "2345", isManager: false, roles: ["Barback"] },
    { name: "Morgan", pin: "3456", isManager: false, roles: ["Server"] },
  ];

  for (const s of sampleStaff) {
    const pinHash = await bcrypt.hash(s.pin, 10);
    const [created] = await db
      .insert(schema.staff)
      .values({ name: s.name, pinHash, isManager: s.isManager })
      .returning();
    const links = s.roles
      .map((rn) => roleByName.get(rn))
      .filter((r): r is NonNullable<typeof r> => Boolean(r))
      .map((r) => ({ staffId: created.id, roleId: r.id }));
    if (links.length) await db.insert(schema.staffRole).values(links);
  }

  console.log("Done. Sample PINs:");
  for (const s of sampleStaff) console.log(`  ${s.pin} → ${s.name}`);

  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
