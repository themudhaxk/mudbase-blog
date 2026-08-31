"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export default function LoginPage(): React.JSX.Element {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm(): React.JSX.Element {
  const router = useRouter();
  const params = useSearchParams();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        setError(body.error ?? "Sign in failed.");
        return;
      }
      // `next` is user-controlled, so only same-site paths are honoured - an absolute URL
      // here would turn the login page into an open redirect.
      const next = params.get("next");
      router.push(next && next.startsWith("/") && !next.startsWith("//") ? next : "/admin");
      router.refresh();
    } catch {
      setError("Could not reach the server.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <form
        onSubmit={(e) => void submit(e)}
        className="w-full max-w-sm rounded-lg border border-ink-200 bg-white p-6 dark:border-ink-700 dark:bg-ink-900"
      >
        <h1 className="font-display text-xl text-ink-950 dark:text-ink-50">Blog admin</h1>
        <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">
          Sign in to write and publish posts.
        </p>

        <label
          htmlFor="password"
          className="mt-6 mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-500 dark:text-ink-400"
        >
          Password
        </label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded border border-ink-200 bg-white px-3 py-2 text-sm text-ink-900 outline-none focus:border-mud-500 dark:border-ink-700 dark:bg-ink-950 dark:text-ink-100"
        />

        {error && (
          <p role="alert" className="mt-3 text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={busy || !password}
          className="mt-5 w-full rounded bg-mud-600 px-4 py-2 text-sm font-semibold text-white hover:bg-mud-500 disabled:opacity-50"
        >
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </main>
  );
}
