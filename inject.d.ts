/** Source of resize-iframe-child.js, for hosts that want to inject it themselves. */
export const childScriptSource: string;

/** The inline `<script data-resize-iframe-child>…</script>` tag. */
export function childScriptTag(): string;

/**
 * Returns HTML that includes the child script exactly once, ready for srcdoc.
 * Fragments are wrapped in a minimal document with a measurable box to sit in.
 */
export function withResizeChild(html: string): string;
