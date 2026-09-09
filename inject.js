/**
 * Prepare HTML so a parent using resize-iframe can size a srcdoc frame.
 *
 * A cross-origin (or opaque-origin sandboxed) parent cannot measure the framed
 * page. The child script has to run inside it. For HTML the host owns — skill
 * output, quizzes, inlined report fragments — call this before setting srcdoc
 * and the script is inlined, so the report stays self-contained: no CDN, no
 * relative path to the package.
 *
 * Remote `src` pages are not covered: only that page's author can include
 * resize-iframe-child.js.
 */
import { childScriptSource } from "./child-source.js";

export { childScriptSource };

const MARKER = "data-resize-iframe-child";

/** The inline script tag `withResizeChild` inserts. */
export function childScriptTag() {
  // A literal </script> anywhere in the source — even inside a JS comment —
  // closes an HTML <script> element. Break the sequence for the parser; JS
  // still sees <\/script> as </script>.
  const safe = childScriptSource.replace(/<\/(script)/gi, "<\\/$1");
  return `<script ${MARKER}>${safe}</script>`;
}

/**
 * Returns HTML that includes the child script exactly once.
 *
 * - Full documents: script inserted before `</body>` (or `</html>`).
 * - Fragments: wrapped in a minimal document so `document.body` exists for
 *   the child (it waits on body before measuring).
 * - Idempotent: HTML that already carries the marker is returned unchanged.
 */
export function withResizeChild(html) {
  const source = typeof html === "string" ? html : String(html ?? "");
  if (source.includes(MARKER)) return source;

  const tag = childScriptTag();
  if (/<\/body>/i.test(source)) return source.replace(/<\/body>/i, `${tag}</body>`);
  if (/<\/html>/i.test(source)) return source.replace(/<\/html>/i, `${tag}</html>`);
  // The child measures body's element children, so bare text needs a box around
  // it, and the default body margin would land inside the measured top edge
  // while its counterpart fell outside the bottom one.
  return `<!doctype html><html><head><style>body{margin:0}</style></head><body><div>${source}</div>${tag}</body></html>`;
}
