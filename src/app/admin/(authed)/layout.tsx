import Link from "next/link";
import { redirect } from "next/navigation";
import { endAdminSession } from "@/lib/session";
import AdminNav from "../_components/AdminNav";

async function logout() {
  "use server";
  await endAdminSession();
  redirect("/admin/login");
}

export default function AuthedAdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <header className="border-b border-white/10 bg-white/[0.02]">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3">
          <Link href="/admin" className="text-sm font-semibold tracking-wide text-accent">
            Anthem · Admin
          </Link>
          <AdminNav />
          <form action={logout} className="ml-auto">
            <button className="text-xs uppercase tracking-widest text-white/50 hover:text-white">
              Sign out
            </button>
          </form>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">{children}</main>
    </div>
  );
}
