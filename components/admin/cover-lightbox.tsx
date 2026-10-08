"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { maybeMudbaseProxied } from "@/lib/image-proxy";

interface CoverLightboxProps {
  /** Image URL to display full-size. Falsy value renders just the thumbnail. */
  src: string;
  /** Alt text. Defaults to empty string. */
  alt?: string;
  /** Thumbnail CSS class applied to the `<img>` element. */
  thumbnailClassName?: string;
}

/**
 * Cover image thumbnail that opens a lightbox modal on click.
 *
 * Accessibility: focus is trapped inside the modal while open, returned to the
 * trigger on close, and the Escape key closes it. Body scroll is locked while
 * the modal is open. Respects prefers-reduced-motion.
 */
export function CoverLightbox({ src, alt = "", thumbnailClassName }: CoverLightboxProps): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);

  const close = useCallback((): void => {
    setOpen(false);
  }, []);

  /* Body scroll lock */
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  /* Focus management: move to close button when modal opens, return on close */
  useEffect(() => {
    if (open) {
      closeRef.current?.focus();
    } else {
      triggerRef.current?.focus();
    }
  }, [open]);

  /* Escape key */
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent): void {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
      }
      /* Focus trap: cycle focus between close button and the backdrop */
      if (e.key === "Tab") {
        const focusable = backdropRef.current?.querySelectorAll<HTMLElement>(
          'button, [href], [tabindex]:not([tabindex="-1"])',
        );
        if (!focusable || focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [open, close]);

  return (
    <>
      {/* Thumbnail trigger button */}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        className="cover-thumb-trigger"
        aria-label="View cover image full size"
        aria-haspopup="dialog"
      >
        {/*
          Route api.mudbase.dev URLs through /_next/image (same-origin) to avoid
          Chrome blocking the load with net::ERR_BLOCKED_BY_RESPONSE.NotSameOrigin.
          That host sends Cross-Origin-Resource-Policy: same-origin; the proxy
          fetches the image server-side and serves it at the blog origin.
          Non-api.mudbase.dev URLs (arbitrary pastes by the author) are kept as-is
          because /_next/image rejects hosts not in next.config remotePatterns.
        */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={maybeMudbaseProxied(src, 640)}
          alt={alt}
          className={thumbnailClassName ?? "cover-thumb-img"}
        />
      </button>

      {/* Lightbox modal */}
      {open && (
        <div
          ref={backdropRef}
          role="dialog"
          aria-modal="true"
          aria-label="Cover image preview"
          className="cover-lightbox-backdrop"
          onClick={(e) => {
            if (e.target === e.currentTarget) close();
          }}
        >
          {/* Close button */}
          <button
            ref={closeRef}
            type="button"
            onClick={close}
            className="cover-lightbox-close"
            aria-label="Close image preview"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
          {/* Image container */}
          <div className="cover-lightbox-img-wrap">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={maybeMudbaseProxied(src, 1920)}
              alt={alt}
              className="cover-lightbox-img"
            />
          </div>
        </div>
      )}
    </>
  );
}
