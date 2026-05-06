# Anthem · Bar Checklist

A web app for opening and closing checklists. Staff enter their PIN, pick the role they're working, and step through the checklist for that shift. Managers manage staff, roles, checklists, and review nightly history.

Built with Next.js 15 (App Router), Postgres, Drizzle ORM, and Tailwind CSS. Designed to run on Vercel + Neon (or any Postgres) but works anywhere a Next.js app runs.

## Architecture

- Staff PIN entry → role/shift selection → checklist sign-off
- Each tap saves immediately. Sign-off only allowed when required items are checked.
- Manager admin at `/admin`. Staff flagged as managers get admin access automatically when they enter their PIN.
- All shift activity is recorded with timestamps for the manager dashboard and history view

> **PINs are stored hashed (bcrypt).** Toast PIN integration is intentionally _not_ used — this app maintains its own staff/PIN list. Swap in the Toast API later by replacing `src/app/api/auth/pin/route.ts` and the staff/role provisioning UI.

## Local setup

1. **Clone and install**

   ```sh
   npm install --legacy-peer-deps
   ```

2. **Provision a Postgres database** (Neon, Supabase, or local) and copy the URL.

3. **Create `.env`**

   ```sh
   cp .env.example .env
   ```

   Fill in:
   - `DATABASE_URL` — your Postgres connection string
   - `SESSION_SECRET` — any random string of 16+ characters

4. **Run migrations and seed sample data**

   ```sh
   npm run db:migrate
   npm run db:seed
   ```

   The seed creates roles (Bartender, Barback, Server) with starter checklists and four sample staff. PINs printed to the console.

5. **Run the dev server**

   ```sh
   npm run dev
   ```

   Visit http://localhost:3000.

## Production / Vercel

1. Push to GitHub.
2. Import the repo on Vercel.
3. Set env vars: `DATABASE_URL`, `SESSION_SECRET`.
4. After the first deploy, run migrations against production:
   ```sh
   DATABASE_URL=<prod-url> npm run db:migrate
   ```
5. Optionally seed sample data the first time, or add staff via the admin UI.

## Day-to-day use

- **Staff**: open the app on a tablet behind the bar. Enter PIN, choose role + opening/closing, work the checklist.
- **Managers**: enter your PIN on the same screen. If your staff record has the manager flag, you're routed to `/admin` to add staff, build checklists, and watch the dashboard. Promote/demote managers from the staff page.

Business "day" rolls over at 6 AM local time so closing shifts after midnight stay grouped with the previous evening.

## Scripts

| Command              | What it does                                |
| -------------------- | ------------------------------------------- |
| `npm run dev`        | Start the dev server                        |
| `npm run build`      | Production build                            |
| `npm run start`      | Run the built app                           |
| `npm run typecheck`  | TypeScript check                            |
| `npm run db:generate`| Generate a new migration from schema diffs  |
| `npm run db:migrate` | Apply pending migrations                    |
| `npm run db:seed`    | Insert sample roles, checklists, and staff  |
| `npm run db:studio`  | Open Drizzle Studio against your DB         |

## Schema overview

- `staff` — name, hashed PIN, manager flag, active flag
- `role` — e.g. Bartender, Barback, Server
- `staff_role` — many-to-many between staff and roles
- `checklist` — one per role per shift type (opening / closing)
- `checklist_item` — labeled steps with order and required flag
- `checklist_run` — a single staff member completing one checklist on a business date
- `run_item` — per-item completion timestamp inside a run

## Where to plug in Toast later

Replace the PIN-lookup logic in `src/app/api/auth/pin/route.ts` with a Toast API call that returns the staff member and their currently clocked-in role(s). The rest of the app — checklists, runs, dashboard — only needs an internal `staffId` and `roleId`, so the swap is local.
