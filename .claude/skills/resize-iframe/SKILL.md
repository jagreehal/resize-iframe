---
name: resize-iframe
description: Make an embedded iframe size itself to its content. Use when generating HTML that will be shown inside an iframe (report embeds, quizzes, previews, generated pages), when a host page needs a frame that grows and shrinks with its content, or when the user mentions resize-iframe, withResizeChild, srcdoc sizing, or an iframe stuck at the wrong height.
---

# Self-sizing iframes

A cross-origin or sandboxed parent cannot measure the page it frames — the browser
forbids it. So the framed page measures itself and posts the number up. Every
solution below is a variation on getting `resize-iframe-child.js` to run *inside*
the frame.

Pick the case that matches, write the code, stop.

## Case 1 — you generate the HTML (most common)

Inline the child script with `withResizeChild` and hand the result to `srcdoc`.
The document stays self-contained: no CDN, no path back to the package.

```html
<script type="module">
  import 'resize-iframe/element';
  import { withResizeChild } from 'resize-iframe/inject';

  const frame = document.createElement('resize-iframe');
  frame.setAttribute('sandbox', 'allow-scripts'); // opaque origin — keep it
  frame.setAttribute('min-h', '200px');           // avoids a jump on first paint
  frame.setAttribute('srcdoc', withResizeChild(generatedHtml));
  document.body.append(frame);
</script>
```

`withResizeChild` is idempotent, so calling it on already-prepared HTML is safe. It
accepts a full document or a bare fragment.

## Case 2 — you control the framed page

Add one script tag to that page. Nothing else.

```html
<script src="https://unpkg.com/resize-iframe/resize-iframe-child.js"></script>
```

Then on the host page, either the element or the function:

```html
<script type="module" src="https://unpkg.com/resize-iframe/element.js"></script>
<resize-iframe src="https://embed.example/widget" title="Pricing table"></resize-iframe>
```

```javascript
import { iframeResize } from 'resize-iframe';
const [frame] = iframeResize({ onResized: ({ height }) => … }, '#myIframe');
```

## Case 3 — a third-party page you do not control

Not solvable. Nobody can measure a cross-origin document from outside. Say so and
offer a fixed height or a scrollable frame instead of reaching for a workaround.

## Rules that matter

- **Keep `sandbox="allow-scripts"` without `allow-same-origin`.** Generated HTML
  gets an opaque origin, so it cannot touch the host page. Sizing still works.
- **Set `min-h`** on anything that loads asynchronously, or the frame flashes at
  its default 150px.
- **Never set a fixed `height`** on a frame you want to self-size.
- **Mark a wrapper with `data-iframe-size`** when the page measures taller than it
  looks — an overlay, a decorative absolute element, a stray margin.
- **Two-way messaging** travels in the library's own envelope: `frame.sendMessage()`
  from the parent, `parentIframe.onMessage` in the child, and back via
  `parentIframe.sendMessage()`. Do not hand-roll `postMessage` around it.
- **Call `frame.disconnect()`** before removing an iframe bound with `iframeResize`.
