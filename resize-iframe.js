// Iframes that size themselves to their content, cross-origin included.
// Side-effect-free: import { iframeResize } from 'resize-iframe' is safe under
// SSR. For the <resize-iframe> element, import 'resize-iframe/element' instead.
// Both need resize-iframe-child.js in the framed page — a cross-origin parent
// cannot measure the content itself.
const DEFAULTS = {
  direction: 'vertical', // 'vertical' | 'horizontal' | 'both' | 'none'
  offsetSize: 0,
  warningTimeout: 5000,
  onReady: null,
  onResized: null,
  onMessage: null,
  onStorageAccess: null,
};

const toIframes = (target) => {
  if (target == null) return [...document.querySelectorAll('iframe')];
  if (typeof target === 'string') return [...document.querySelectorAll(target)];
  return Array.isArray(target) || target instanceof NodeList ? [...target] : [target];
};

export function iframeResize(options = {}, target) {
  const settings = { ...DEFAULTS, ...options };
  return toIframes(target).map((iframe) => connect(iframe, settings));
}

function connect(iframe, settings) {
  const { direction, offsetSize } = settings;
  let ready = false;

  const warning = settings.warningTimeout
    ? setTimeout(() => {
        if (!ready) {
          console.warn(
            `[resize-iframe] no response from ${iframe.src || 'iframe'} — is resize-iframe-child.js loaded in the framed page?`
          );
        }
      }, settings.warningTimeout)
    : 0;

  const emit = (type, detail) =>
    iframe.dispatchEvent(new CustomEvent(type, { detail, bubbles: true, composed: true }));

  const onMessage = (event) => {
    // The browser sets event.source, so it cannot be forged: only messages from
    // this frame's own window get through, wherever it has navigated to. That
    // covers what iframe-resizer's checkOrigin option does, without the config.
    if (event.source !== iframe.contentWindow) return;
    if (typeof event.data !== 'object' || event.data === null) return;

    if ('resize-iframe-message' in event.data) {
      const message = event.data['resize-iframe-message'];
      settings.onMessage?.({ iframe, message });
      emit('frame-message', message);
      return;
    }

    if ('resize-iframe-storage' in event.data) {
      const { hasAccess } = event.data['resize-iframe-storage'];
      settings.onStorageAccess?.({ iframe, hasAccess });
      emit('storage-access', { hasAccess });
      return;
    }

    const size = event.data['resize-iframe'];
    if (!size) return;
    const height = size.height + offsetSize;
    const width = size.width + offsetSize;

    if (direction === 'vertical' || direction === 'both') iframe.style.height = `${height}px`;
    if (direction === 'horizontal' || direction === 'both') iframe.style.width = `${width}px`;

    if (!ready) {
      ready = true;
      clearTimeout(warning);
      settings.onReady?.(iframe);
      emit('ready', { iframe });
    }
    settings.onResized?.({ iframe, height, width });
    emit('resize', { height, width });
  };

  addEventListener('message', onMessage);

  // Call disconnect() before removing the iframe, or the listener leaks.
  iframe.iframeResizer = {
    disconnect() {
      removeEventListener('message', onMessage);
      clearTimeout(warning);
      delete iframe.iframeResizer;
    },
    // Same envelope the child sends back in, so the framed page can tell an
    // embedder message from every other script posting at it.
    sendMessage(message, targetOrigin = '*') {
      iframe.contentWindow?.postMessage({ 'resize-iframe-message': message }, targetOrigin);
    },
  };
  return iframe.iframeResizer;
}
