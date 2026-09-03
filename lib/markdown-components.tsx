import type { ComponentPropsWithoutRef } from "react";

/**
 * Shared react-markdown component overrides for `.prose-mud` content.
 *
 * The published post page and the admin preview both render markdown through
 * `.prose-mud`, so any renderer override that should apply to both lives here -
 * a preview built on its own component map is a preview that lies.
 */

/**
 * Wraps every markdown table in a horizontal scroll container. A comparison
 * feature map is wider than a phone viewport; without this the table would force
 * the whole page to scroll sideways. Contained here, only the table scrolls, and
 * the visible frame (border, radius) is drawn on the wrapper in globals.css.
 */
function MarkdownTable(props: ComponentPropsWithoutRef<"table">): React.JSX.Element {
  return (
    <div className="prose-table-wrap">
      <table {...props} />
    </div>
  );
}

/** Renderer overrides safe for both the published page and the admin preview. */
export const sharedMarkdownComponents = {
  table: MarkdownTable,
};
