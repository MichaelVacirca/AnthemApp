import PinPad from "./_components/PinPad";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const message =
    error === "manager_required"
      ? "Manager access required. Enter a manager PIN."
      : error === "missing_secret"
        ? "Server is misconfigured (SESSION_SECRET missing)."
        : null;

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 py-10">
      <div className="mb-8 text-center">
        <p className="text-sm uppercase tracking-[0.3em] text-accent">Anthem</p>
        <h1 className="mt-2 text-3xl font-semibold">Shift Checklist</h1>
        <p className="mt-2 text-sm text-white/60">
          Enter your Toast PIN to start your opening or closing checklist.
        </p>
        {message ? <p className="mt-3 text-sm text-red-400">{message}</p> : null}
      </div>

      <PinPad />
    </main>
  );
}
