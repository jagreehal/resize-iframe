# resize-iframe

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
