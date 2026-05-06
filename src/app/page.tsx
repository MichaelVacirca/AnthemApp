import Link from "next/link";
import PinPad from "./_components/PinPad";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 py-10">
      <div className="mb-8 text-center">
        <p className="text-sm uppercase tracking-[0.3em] text-accent">Anthem</p>
        <h1 className="mt-2 text-3xl font-semibold">Shift Checklist</h1>
        <p className="mt-2 text-sm text-white/60">
          Enter your Toast PIN to start your opening or closing checklist.
        </p>
      </div>

      <PinPad />

      <Link
        href="/admin/login"
        className="mt-10 text-xs uppercase tracking-widest text-white/40 hover:text-white/70"
      >
        Manager sign-in
      </Link>
    </main>
  );
}
