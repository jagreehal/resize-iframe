# resize-iframe

## 0.4.0

### Minor Changes

- 1268651: Make the main entry SSR-safe by moving `<resize-iframe>` to `resize-iframe/element`.

  `import { iframeResize } from 'resize-iframe'` no longer evaluates `class extends HTMLElement` or `customElements.define` at module scope, so Next, Astro and Remix can import it on the server. Register the element with `import 'resize-iframe/element'` (or load `element.js` from a CDN). That entry is a no-op when `HTMLElement` / `customElements` are missing, and skips re-defining the tag if another copy already registered it.

  **Breaking.** `import 'resize-iframe'` and a bare `resize-iframe.js` script tag no longer register the custom element. Switch element users to `resize-iframe/element` / `element.js`.

## 0.3.0

### Minor Changes

- e0996b5: `srcdoc` support, for inline HTML the host owns.

  `withResizeChild(html)` from `resize-iframe/inject` inlines the child script into
  HTML you generate — report embeds, quizzes, model output — so the document you hand
  to `srcdoc` stays self-contained: no CDN, no relative path back to the package. It
  is idempotent, and wraps a fragment in a minimal document with a measurable box, so
  anything from a bare string of text upwards sizes correctly. `childScriptTag()` and
  `childScriptSource` are exported too, for hosts that place the script themselves.

  The `<resize-iframe>` element now accepts `srcdoc` alongside `src`, applies
  `sandbox` and `allow` before either so the first load carries them, and takes a
  `warning-timeout` attribute (`0` silences the missing-child warning).

## 0.2.0

### Minor Changes

- f2e12a7: Give the framed page a way to receive what the parent sends.

  `parentIframe.onMessage = (message) => …` delivers whatever the embedder posted with `sendMessage`. Until now the channel was send-only: the parent could post into the frame, but the child script never listened, so every embedded page had to hand-roll a `message` listener and work out for itself which messages came from the embedder.

  Both directions now travel in the same `resize-iframe-message` envelope, and the child checks `event.source === parent` the same way the parent checks the frame's own window. Unrelated postMessage traffic aimed at your frame no longer reaches the callback.

  **Breaking for hand-rolled child listeners.** A child page reading `event.data` directly now sees `{ 'resize-iframe-message': … }` rather than the bare payload. Use `parentIframe.onMessage` instead.

### Patch Changes

- f2e12a7: Document the third-party embedding flow and cover the library with a Playwright suite.

  - README: Storage Access API setup for cross-site embeds, including the `allow="storage-access"` and `allow-storage-access-by-user-activation` requirements, and why the request has to come from a click inside the frame.
  - README: note that `sendMessage` is dropped if the frame is still on `about:blank`, so send it after `ready`.
  - 33 specs across Chromium, Firefox and WebKit, served from two origins so they run against real cross-site restrictions rather than same-document shortcuts.

## 0.1.1

### Patch Changes

- d9fd60f: Document the third-party embedding flow and cover the library with a Playwright suite.

  - README: Storage Access API setup for cross-site embeds, including the `allow="storage-access"` and `allow-storage-access-by-user-activation` requirements, and why the request has to come from a click inside the frame.
  - README: note that `sendMessage` is dropped if the frame is still on `about:blank`, so send it after `ready`.
  - 33 specs across Chromium, Firefox and WebKit, served from two origins so they run against real cross-site restrictions rather than same-document shortcuts.
