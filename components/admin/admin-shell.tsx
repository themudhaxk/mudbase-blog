"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

/** Header + sign-out shared by every admin page. */
export function AdminShell({ children }: { children: ReactNode }): React.JSX.Element {
  const router = useRouter();

  async function signOut(): Promise<void> {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <>
      <header className="border-b border-ink-200 bg-white dark:border-ink-800 dark:bg-ink-900">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <Link href="/admin" className="font-display text-lg text-ink-950 dark:text-ink-50">
            Blog admin
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/" className="text-ink-600 hover:text-mud-600 dark:text-ink-300">
              View blog
            </Link>
            <button
              type="button"
              onClick={() => void signOut()}
              className="text-ink-600 hover:text-mud-600 dark:text-ink-300"
            >
              Sign out
            </button>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </>
  );
}
