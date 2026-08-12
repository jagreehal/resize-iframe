# resize-iframe

## 0.1.1

### Patch Changes

- d9fd60f: Document the third-party embedding flow and cover the library with a Playwright suite.

  - README: Storage Access API setup for cross-site embeds, including the `allow="storage-access"` and `allow-storage-access-by-user-activation` requirements, and why the request has to come from a click inside the frame.
  - README: note that `sendMessage` is dropped if the frame is still on `about:blank`, so send it after `ready`.
  - 33 specs across Chromium, Firefox and WebKit, served from two origins so they run against real cross-site restrictions rather than same-document shortcuts.
