import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Blog admin",
  // The admin is private and has nothing to offer a crawler; keeping it out of the index
  // also keeps the login page from surfacing in search results for the blog.
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: ReactNode }): React.JSX.Element {
  return <div className="min-h-screen bg-ink-50 dark:bg-ink-950">{children}</div>;
}
