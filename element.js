// Browser-only: registers the <resize-iframe> custom element.
// Import this entry when you want the element; the main package entry is
// side-effect-free so SSR (Next, Astro, Remix) can import iframeResize safely.
import { iframeResize } from './resize-iframe.js';

if (typeof HTMLElement !== 'undefined' && typeof customElements !== 'undefined') {
  class ResizeIframe extends HTMLElement {
    static get observedAttributes() {
      // src / srcdoc last: setting either starts the navigation, and sandbox/allow
      // have to be on the element before that or the first load runs without them.
      return ['min-h', 'max-h', 'allow', 'sandbox', 'warning-timeout', 'srcdoc', 'src'];
    }

    connectedCallback() {
      if (!this.shadowRoot) {
        this.attachShadow({ mode: 'open' }).innerHTML = `
          <style>
            :host { display: block; }
            iframe { display: block; width: 100%; border: 0; }
          </style>
          <iframe part="frame"></iframe>`;
        this.iframe = this.shadowRoot.querySelector('iframe');
        // An iframe without an accessible name is a screen reader dead end.
        this.iframe.title = this.getAttribute('title') || 'Embedded content';
        for (const name of ResizeIframe.observedAttributes) {
          this.attributeChangedCallback(name, null, this.getAttribute(name));
        }
      }
      const warningTimeoutAttr = this.getAttribute('warning-timeout');
      iframeResize(
        {
          direction: this.getAttribute('direction') || 'vertical',
          offsetSize: Number(this.getAttribute('offset-size')) || 0,
          ...(warningTimeoutAttr !== null
            ? { warningTimeout: Number(warningTimeoutAttr) }
            : {}),
        },
        this.iframe
      );
    }

    disconnectedCallback() {
      this.iframe?.iframeResizer?.disconnect();
    }

    attributeChangedCallback(name, oldValue, newValue) {
      if (!this.iframe || newValue === null) return;
      // srcdoc wins over src when both are set (HTML behaviour). Prefer one.
      if (name === 'srcdoc') this.iframe.srcdoc = newValue;
      if (name === 'src') this.iframe.src = newValue;
      if (name === 'min-h') this.iframe.style.minHeight = newValue;
      if (name === 'max-h') this.iframe.style.maxHeight = newValue;
      // Passed through because third-party embeds need them: storage access is
      // denied outright unless the frame carries allow="storage-access", and a
      // sandboxed frame also needs allow-storage-access-by-user-activation.
      if (name === 'allow' || name === 'sandbox') this.iframe.setAttribute(name, newValue);
      // warning-timeout is read once, in connectedCallback.
    }

    get height() {
      return this.iframe?.style.height;
    }

    sendMessage(message, targetOrigin) {
      this.iframe?.iframeResizer?.sendMessage(message, targetOrigin);
    }
  }

  if (!customElements.get('resize-iframe')) {
    customElements.define('resize-iframe', ResizeIframe);
  }
}
