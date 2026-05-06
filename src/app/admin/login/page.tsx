import { redirect } from "next/navigation";
import { isAdminAuthenticated, startAdminSession, checkAdminPassword } from "@/lib/session";

async function login(formData: FormData) {
  "use server";
  const password = String(formData.get("password") ?? "");
  if (!checkAdminPassword(password)) {
    redirect("/admin/login?error=1");
  }
  await startAdminSession();
  redirect("/admin");
}

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (await isAdminAuthenticated()) redirect("/admin");
  const { error } = await searchParams;

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6 py-10">
      <p className="text-xs uppercase tracking-[0.3em] text-accent">Anthem</p>
      <h1 className="mt-2 text-2xl font-semibold">Manager sign-in</h1>
      <p className="mt-1 text-sm text-white/60">Enter the manager password to access the admin area.</p>

      <form action={login} className="mt-6 space-y-3">
        <div>
          <label className="label" htmlFor="password">
            Password
          </label>
          <input id="password" name="password" type="password" autoFocus className="input" required />
        </div>
        {error ? <p className="text-sm text-red-400">Incorrect password.</p> : null}
        <button type="submit" className="btn w-full">
          Sign in
        </button>
      </form>

      <a href="/" className="mt-8 text-center text-xs uppercase tracking-widest text-white/40">
        ← Back to PIN entry
      </a>
    </main>
  );
}
