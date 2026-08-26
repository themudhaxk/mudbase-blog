"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";

/** No-op subscribe: hydration is a one-time transition, never a stream of updates. */
const noopSubscribe = (): (() => void) => () => {};

export function ThemeToggle(): React.JSX.Element | null {
  const { resolvedTheme, setTheme } = useTheme();

  // The resolved theme is only known in the browser, so the server and the first client
  // render must agree on "nothing yet" or hydration mismatches. useSyncExternalStore gives
  // that with its server snapshot, without the setState-in-an-effect cascade a `mounted`
  // flag would cause.
  const mounted = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );

  if (!mounted) return null;

  const isDark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className="flex h-8 w-8 items-center justify-center rounded-full border border-ink-200 text-ink-600 transition hover:border-mud-400 hover:text-mud-600 dark:border-ink-700 dark:text-ink-200 dark:hover:border-mud-400 dark:hover:text-mud-300"
    >
      {isDark ? (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <circle cx="12" cy="12" r="4.5" />
          <path d="M12 2v2M12 20v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M2 12h2M20 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4" />
        </svg>
      ) : (
        <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
          <path d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 1020.354 15.354z" />
        </svg>
      )}
    </button>
  );
}
