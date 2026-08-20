// Load this inside the framed page:
//   <script src=".../resize-iframe-child.js"></script>
// Optional attributes on that script tag:
//   data-parent-origin="https://parent.example"  report size only to that embedder
//   data-size-selector=".content"                measure these elements instead
// Or mark elements in the page with data-iframe-size to the same effect.
const config = document.currentScript?.dataset ?? {};
const targetOrigin = config.parentOrigin || '*';
const sizeSelector = config.sizeSelector || '[data-iframe-size]';

const start = () => {
  let last = { height: 0, width: 0 };
  let queued = false;
  let auto = true;
  let inbound = null;

  // Measure the bottom and right edges of the marked elements, or of body's
  // children. Never body itself: it stretches to fill the frame in quirks mode
  // or under `body { height: 100% }`, which ratchets the frame larger and never
  // lets it shrink back.
  // ponytail: body's own bottom/right padding and margin are ignored — zero them
  // if that gap matters, or wrap your content and mark it with data-iframe-size.
  const measure = () => {
    const marked = document.querySelectorAll(sizeSelector);
    const elements = marked.length ? marked : document.body.children;
    if (!elements.length) {
      const body = document.body.getBoundingClientRect();
      return { height: Math.ceil(body.bottom), width: Math.ceil(body.right) };
    }
    let height = 0;
    let width = 0;
    for (const element of elements) {
      const box = element.getBoundingClientRect();
      height = Math.max(height, box.bottom);
      width = Math.max(width, box.right);
    }
    return { height: Math.ceil(height), width: Math.ceil(width) };
  };

  const post = () => {
    queued = false;
    const size = measure();
    if (size.height === last.height && size.width === last.width) return;
    last = size;
    parent.postMessage({ 'resize-iframe': size }, targetOrigin);
  };

  // Batch to one measurement per frame: mutations arrive in bursts and every
  // measure() forces a layout.
  const schedule = () => {
    if (queued || !auto) return;
    queued = true;
    requestAnimationFrame(post);
  };

  // ResizeObserver catches reflow (images, fonts, viewport). MutationObserver
  // catches DOM and style changes, which the observer misses entirely whenever
  // body is stretched to the frame and so never changes size itself.
  new ResizeObserver(schedule).observe(document.body);
  new MutationObserver(schedule).observe(document.body, {
    subtree: true,
    childList: true,
    attributes: true,
    characterData: true,
  });
  addEventListener('load', schedule); // images and fonts landing late

  // Messages from the embedder. event.source is set by the browser and cannot be
  // forged, so this is the same guard the parent uses in the other direction, and
  // the envelope keeps unrelated postMessage traffic (analytics, wallets, other
  // embeds) out of the callback.
  addEventListener('message', (event) => {
    if (event.source !== parent) return;
    const data = event.data;
    if (data && typeof data === 'object' && 'resize-iframe-message' in data) {
      inbound?.(data['resize-iframe-message']);
    }
  });

  // Third-party cookies: an embedded page gets partitioned storage until the user
  // grants access. Probe the API rather than sniffing the browser — Safari and
  // Chrome both partition, and which browsers do is not a stable list.
  const hasStorageAccess = () =>
    document.hasStorageAccess?.().catch(() => false) ?? Promise.resolve(true);

  const reportStorageAccess = async () => {
    const access = await hasStorageAccess();
    parent.postMessage({ 'resize-iframe-storage': { hasAccess: access } }, targetOrigin);
    return access;
  };

  window.parentIframe = {
    // Assign a function to receive what the parent sends with sendMessage().
    get onMessage() {
      return inbound;
    },
    set onMessage(fn) {
      inbound = fn;
    },
    autoResize(state) {
      if (state !== undefined) auto = state;
      if (auto) schedule();
      return auto;
    },
    resize() {
      post(); // nudge, for the rare change neither observer sees
    },
    sendMessage(message, origin = targetOrigin) {
      parent.postMessage({ 'resize-iframe-message': message }, origin);
    },
    hasStorageAccess,
    // MUST be called from a click or tap handler in this page: the browser denies
    // the request without a user gesture here, and the parent cannot supply one.
    // Reload afterwards if your page reads cookies during startup.
    async requestStorageAccess() {
      if (!document.requestStorageAccess) return true;
      try {
        await document.requestStorageAccess();
      } catch {
        // Denied, or the user has never visited this site first-party.
      }
      return reportStorageAccess();
    },
  };

  reportStorageAccess();
  post();
};

if (parent !== window) {
  if (document.body) start();
  else addEventListener('DOMContentLoaded', start);
}
