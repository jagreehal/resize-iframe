# resize-iframe

Iframes that size themselves to their content, cross-origin included. One script on
each page, no build step, no dependencies, MIT.

- 📐 Auto-resizes on content, DOM, style, font, image and viewport changes
- ↔️ Vertical, horizontal, or both
- 🔒 Messages matched against the frame's own window, which cannot be forged
- 🍪 Storage Access API support for third-party embeds
- 🧩 Use `iframeResize()` or the `<resize-iframe>` element
- 📦 ~5KB unminified, across both files

## Installation

```bash
npm install resize-iframe
```

Or from a CDN — the parent page needs `resize-iframe.js`, the framed page needs
`resize-iframe-child.js`:

```html
<script type="module" src="https://unpkg.com/resize-iframe/resize-iframe.js"></script>
<script src="https://unpkg.com/resize-iframe/resize-iframe-child.js"></script>
```

## Setting up the parent page

Give the iframe a percentage width and an initial height, then let the library
control the other dimension. Starting at `100vh` makes loading look smoother — the
content below the iframe only appears once it has sized itself.

```html
<style>
  #myIframe { width: 100%; height: 100vh; }
</style>

<iframe id="myIframe" src="https://anotherdomain.com/iframe.html"></iframe>

<script type="module">
  import { iframeResize } from 'resize-iframe';

  const [frame] = iframeResize({ direction: 'vertical' }, '#myIframe');
</script>
```

`iframeResize(options, target)` takes a CSS selector, an element, or a list of
elements, and returns one handle per iframe. Both arguments are optional — with no
target it binds every iframe on the page.

Or use the element, which calls `iframeResize` for you:

```html
<script type="module" src="https://unpkg.com/resize-iframe/resize-iframe.js"></script>

<resize-iframe src="https://anotherdomain.com/iframe.html" title="Pricing table"></resize-iframe>
```

## Setting up the child page

```html
<script src="https://unpkg.com/resize-iframe/resize-iframe-child.js"></script>
```

That alone auto-resizes the frame. A cross-origin parent cannot measure your
content, so without this script nothing happens — the parent logs a warning after
five seconds saying exactly that.

The script tag takes two optional attributes:

| Attribute            | Default              | Description                                          |
| -------------------- | -------------------- | ---------------------------------------------------- |
| `data-parent-origin` | `*`                  | Only report size to this embedder                    |
| `data-size-selector` | `[data-iframe-size]` | Measure these elements instead of the body's children |

Marking your content wrapper with `data-iframe-size` is the fix for a page that
measures larger than it looks — an overlay, a decorative element, a stray margin.

## Third-party embedding and cookies

Once your page is embedded on someone else's domain, browsers partition its
storage: cookies set first-party are invisible, so sessions and logins break before
sizing is ever the problem. The
[Storage Access API](https://developer.mozilla.org/en-US/docs/Web/API/Storage_Access_API)
is the way back, and the child script wires it up.

**Parent** — grant the permission and, if you sandbox, the matching token:

```html
<resize-iframe
  src="https://embed.example.com/app"
  allow="storage-access"
  sandbox="allow-scripts allow-same-origin allow-storage-access-by-user-activation">
</resize-iframe>
```

**Child** — probe on load and, if access is missing, ask for it from a click:

```html
<button id="continue" hidden>Continue</button>

<script>
  addEventListener('load', async () => {
    if (await parentIframe.hasStorageAccess()) return;

    continue.hidden = false;
    continue.onclick = async () => {
      if (await parentIframe.requestStorageAccess()) location.reload();
    };
  });
</script>
```

Three things decide whether this works, none of them optional:

1. **A user gesture inside the frame.** The request is denied outright without a
   click or tap in the embedded page. The parent cannot supply one for you, which
   is why the button has to live in the child.
2. **A prior first-party visit.** Browsers only grant access to sites the user has
   used directly. If your embed can be a user's first contact with your domain,
   open it in a popup or new tab first, let them interact, then request access.
3. **Reload after granting.** Anything your page read at startup ran without
   cookies. Reloading is cruder than re-fetching, and far easier to get right.

Probe the API, never the browser. Safari and Chrome both partition storage, and a
`/safari/i.test(navigator.userAgent)` gate silently skips the prompt everywhere
else — the failure is invisible, because the page loads fine and just acts logged
out.

The parent is told the outcome and can render its own fallback:

```javascript
iframeResize({
  onStorageAccess: ({ hasAccess }) => {
    if (!hasAccess) showOpenInNewTabLink();
  },
});
```

## Options

| Option            | Default      | Description                                                           |
| ----------------- | ------------ | --------------------------------------------------------------------- |
| `direction`       | `'vertical'` | `'vertical'`, `'horizontal'`, `'both'`, or `'none'`                    |
| `offsetSize`      | `0`          | Pixels added to the computed size, positive or negative                |
| `warningTimeout`  | `5000`       | Warn if the frame has not responded in this many ms; `0` to silence it |
| `onReady`         | —            | `(iframe) => void`, called on the first size message                   |
| `onResized`       | —            | `({ iframe, height, width }) => void`                                  |
| `onMessage`       | —            | `({ iframe, message }) => void`                                        |
| `onStorageAccess` | —            | `({ iframe, hasAccess }) => void`                                      |

With `direction: 'both'` give your content an intrinsic width, or a `width: 100%`
layout will chase the frame it is being measured in.

There is no `checkOrigin` option. Messages are matched against the frame's own
window, which the browser sets and a page cannot forge, and that holds even after
the frame navigates to another domain — the case an origin allowlist has to be
turned off for.

## Element attributes

| Attribute     | Default            | Description                              |
| ------------- | ------------------ | ---------------------------------------- |
| `src`         | —                  | URL to embed                             |
| `title`       | `Embedded content` | Accessible name for the iframe           |
| `direction`   | `vertical`         | As above                                 |
| `offset-size` | `0`                | As above                                 |
| `min-h`       | —                  | Minimum height constraint                |
| `max-h`       | —                  | Maximum height constraint                |
| `allow`       | —                  | Passed through, e.g. `storage-access`    |
| `sandbox`     | —                  | Passed through                           |

## Methods and events

Parent, on the handle returned by `iframeResize` (also at `iframe.iframeResizer`):

```javascript
// Wait for ready first: a message posted at a frame still on about:blank is
// dropped, and nothing retries it.
frame.sendMessage({ hello: 'world' }, 'https://anotherdomain.com');
frame.disconnect(); // call before removing the iframe from the page
```

Child, on `window.parentIframe`:

```javascript
parentIframe.sendMessage('ping'); // → parent's onMessage / 'frame-message' event
parentIframe.autoResize(false); // pause resizing; returns the current state
parentIframe.resize(); // nudge, for a change neither observer sees
parentIframe.hasStorageAccess(); // → Promise<boolean>
parentIframe.requestStorageAccess(); // → Promise<boolean>, from a click handler
```

Events fire on the iframe and bubble, so `<resize-iframe>` re-emits them:

```javascript
document.querySelector('resize-iframe').addEventListener('resize', (e) => {
  console.log(`Frame is now ${e.detail.height}px tall`);
});
```

`ready`, `resize`, `frame-message`, and `storage-access` are available.

## TypeScript

Types ship with the package. JSX typing for the element is picked up automatically
by React 18 and below, Preact, and Solid. React 19 reads `React.JSX` instead, so
add this once:

```ts
import type { ResizeIframeAttributes } from 'resize-iframe';

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'resize-iframe': ResizeIframeAttributes;
    }
  }
}
```

## Testing

```bash
pnpm install
pnpm exec playwright install
pnpm test
```

33 Playwright specs across Chromium, Firefox and WebKit. The suite serves the
parent page and the child pages from two different origins — `localhost` and
`127.0.0.1`, which are cross-*site*, not merely cross-origin — so every test runs
against the same partitioning and `contentDocument` restrictions as production.

## Testing

```bash
pnpm install
pnpm exec playwright install
pnpm test
```

21 Playwright specs, run across Chromium, Firefox and WebKit.

## Browser Support

- Chrome/Edge 80+
- Firefox 75+
- Safari 13.1+

Storage Access API support is probed at runtime, so browsers without it simply
report access as granted.

## Licence

MIT
