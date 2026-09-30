"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";

interface MobileNavProps {
  categories: string[];
}

const mqSubscribe = (onChange: () => void): (() => void) => {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
};

const mqSnapshot = (): boolean =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const mqServerSnapshot = (): boolean => false;

function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(mqSubscribe, mqSnapshot, mqServerSnapshot);
}

/**
 * Mobile navigation: a hamburger toggle button + slide-in panel with all nav
 * links and category filters. Desktop (sm+) hides this entirely; the regular
 * inline nav handles desktop layout. Accessible: aria-expanded, aria-controls,
 * role="dialog", focus trap, body scroll lock, Escape to close.
 */
export function MobileNav({ categories }: MobileNavProps): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const reducedMotion = usePrefersReducedMotion();

  const close = useCallback(() => {
    setIsOpen(false);
    requestAnimationFrame(() => toggleRef.current?.focus());
  }, []);

  // Body scroll lock while the panel is open.
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      requestAnimationFrame(() => closeRef.current?.focus());
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Close on Escape key.
  useEffect(() => {
    if (!isOpen) return undefined;
    const handle = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    document.addEventListener("keydown", handle);
    return () => document.removeEventListener("keydown", handle);
  }, [isOpen, close]);

  // Focus trap: keep Tab inside the open panel.
  useEffect(() => {
    if (!isOpen) return undefined;
    const panel = panelRef.current;
    if (!panel) return undefined;

    const getFocusable = (): HTMLElement[] =>
      Array.from(
        panel.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      );

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const els = getFocusable();
      if (!els.length) return;
      const first = els[0];
      const last = els[els.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    panel.addEventListener("keydown", handleTab);
    return () => panel.removeEventListener("keydown", handleTab);
  }, [isOpen]);

  // Inert the panel when closed so keyboard users cannot Tab into off-screen items.
  useEffect(() => {
    const el = panelRef.current;
    if (el) el.inert = !isOpen;
  }, [isOpen]);

  const motionClass = reducedMotion
    ? ""
    : "transition-[transform,visibility] duration-300 ease-in-out";

  return (
    <>
      {/* Hamburger toggle button - mobile only */}
      <button
        ref={toggleRef}
        type="button"
        aria-label="Open navigation menu"
        aria-expanded={isOpen}
        aria-controls="mobile-nav-panel"
        onClick={() => setIsOpen(true)}
        className="flex h-11 w-11 items-center justify-center rounded-lg text-ink-600 transition hover:text-mud-600 dark:text-ink-200 dark:hover:text-mud-300 sm:hidden"
      >
        <svg
          width="22"
          height="22"
          viewBox="0 0 22 22"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <line x1="3" y1="6" x2="19" y2="6" />
          <line x1="3" y1="11" x2="19" y2="11" />
          <line x1="3" y1="16" x2="19" y2="16" />
        </svg>
      </button>

      {/* Backdrop - dims content behind the panel */}
      <div
        aria-hidden="true"
        onClick={close}
        className={[
          "fixed inset-0 z-40 bg-ink-950/60 sm:hidden",
          reducedMotion ? "" : "transition-opacity duration-300",
          isOpen ? "opacity-100" : "pointer-events-none opacity-0",
        ].join(" ")}
      />

      {/* Slide-in nav panel */}
      <div
        id="mobile-nav-panel"
        ref={panelRef}
        role="dialog"
        aria-label="Navigation menu"
        aria-modal="true"
        aria-hidden={!isOpen}
        className={[
          "fixed inset-y-0 right-0 z-50 flex w-72 max-w-[85vw] flex-col bg-ink-50 shadow-xl dark:bg-ink-900 sm:hidden",
          motionClass,
          isOpen ? "translate-x-0 visible" : "invisible translate-x-full",
        ].join(" ")}
      >
        {/* Panel header row */}
        <div className="flex items-center justify-between border-b border-ink-200 px-5 py-3 dark:border-ink-700">
          <span className="font-display text-base font-medium text-ink-950 dark:text-ink-50">
            Menu
          </span>
          <button
            ref={closeRef}
            type="button"
            aria-label="Close navigation menu"
            onClick={close}
            className="flex h-11 w-11 items-center justify-center rounded-lg text-ink-600 transition hover:text-mud-600 dark:text-ink-200 dark:hover:text-mud-300"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 18 18"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <line x1="2" y1="2" x2="16" y2="16" />
              <line x1="16" y1="2" x2="2" y2="16" />
            </svg>
          </button>
        </div>

        {/* Primary nav links */}
        <nav
          aria-label="Primary navigation"
          className="flex flex-col gap-1 px-4 pt-4"
        >
          <a
            href="https://www.mudbase.dev"
            onClick={close}
            className="rounded-lg px-3 py-3 text-sm font-medium text-ink-700 transition hover:bg-ink-100 hover:text-mud-600 dark:text-ink-200 dark:hover:bg-ink-800 dark:hover:text-mud-300"
          >
            Product
          </a>
          <a
            href="https://docs.mudbase.dev"
            onClick={close}
            className="rounded-lg px-3 py-3 text-sm font-medium text-ink-700 transition hover:bg-ink-100 hover:text-mud-600 dark:text-ink-200 dark:hover:bg-ink-800 dark:hover:text-mud-300"
          >
            Docs
          </a>
          <a
            href="https://console.mudbase.dev/console?signup"
            onClick={close}
            className="mt-2 rounded-full bg-ink-950 px-4 py-3 text-center text-sm font-medium text-ink-50 transition hover:bg-mud-600 dark:bg-ink-50 dark:text-ink-950 dark:hover:bg-mud-400"
          >
            Start building
          </a>
        </nav>

        {/* Category filter links */}
        {categories.length > 0 && (
          <nav
            aria-label="Post categories"
            className="mt-4 flex flex-col gap-1 border-t border-ink-200 px-4 pt-4 dark:border-ink-700"
          >
            <p className="px-3 pb-1 font-mono text-[10px] uppercase tracking-widest text-ink-400 dark:text-ink-500">
              Categories
            </p>
            <Link
              href="/"
              onClick={close}
              className="rounded-lg px-3 py-3 font-mono text-xs uppercase tracking-widest text-ink-500 transition hover:bg-ink-100 hover:text-mud-600 dark:text-ink-400 dark:hover:bg-ink-800 dark:hover:text-mud-300"
            >
              All
            </Link>
            {categories.map((category) => (
              <Link
                key={category}
                href={`/category/${category.toLowerCase()}`}
                onClick={close}
                className="rounded-lg px-3 py-3 font-mono text-xs uppercase tracking-widest text-ink-500 transition hover:bg-ink-100 hover:text-mud-600 dark:text-ink-400 dark:hover:bg-ink-800 dark:hover:text-mud-300"
              >
                {category}
              </Link>
            ))}
          </nav>
        )}
      </div>
    </>
  );
}
