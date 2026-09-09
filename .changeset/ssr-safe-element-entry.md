---
"resize-iframe": minor
---

Make the main entry SSR-safe by moving `<resize-iframe>` to `resize-iframe/element`.

`import { iframeResize } from 'resize-iframe'` no longer evaluates `class extends HTMLElement` or `customElements.define` at module scope, so Next, Astro and Remix can import it on the server. Register the element with `import 'resize-iframe/element'` (or load `element.js` from a CDN). That entry is a no-op when `HTMLElement` / `customElements` are missing, and skips re-defining the tag if another copy already registered it.

**Breaking.** `import 'resize-iframe'` and a bare `resize-iframe.js` script tag no longer register the custom element. Switch element users to `resize-iframe/element` / `element.js`.
