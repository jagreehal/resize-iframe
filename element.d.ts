/**
 * Registers the `<resize-iframe>` custom element.
 *
 * Side-effect import — call from browser code (or a client-only bundle):
 *
 * ```ts
 * import 'resize-iframe/element';
 * ```
 *
 * Safe to import under SSR: registration is a no-op when `HTMLElement` /
 * `customElements` are missing. Attribute and JSX types live on the main
 * `resize-iframe` entry.
 */
export {};
