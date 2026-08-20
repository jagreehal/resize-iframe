export interface ResizeIframeOptions {
  /** Which dimension the library controls. Default 'vertical'. */
  direction?: 'vertical' | 'horizontal' | 'both' | 'none';
  /** Pixels added to the computed size, positive or negative. Default 0. */
  offsetSize?: number;
  /** Warn if the frame has not responded in this many ms. 0 disables. Default 5000. */
  warningTimeout?: number;
  onReady?: (iframe: HTMLIFrameElement) => void;
  onResized?: (data: {
    iframe: HTMLIFrameElement;
    height: number;
    width: number;
  }) => void;
  onMessage?: (data: { iframe: HTMLIFrameElement; message: unknown }) => void;
  onStorageAccess?: (data: {
    iframe: HTMLIFrameElement;
    hasAccess: boolean;
  }) => void;
}

export interface ResizeIframeHandle {
  /** Call before removing the iframe from the page, or the listener leaks. */
  disconnect(): void;
  sendMessage(message: unknown, targetOrigin?: string): void;
}

/** Binds to a selector, an element, a list of elements, or every iframe on the page. */
export function iframeResize(
  options?: ResizeIframeOptions,
  target?: string | HTMLIFrameElement | HTMLIFrameElement[] | NodeList
): ResizeIframeHandle[];

/** Available inside the framed page once resize-iframe-child.js has loaded. */
export interface ParentIframe {
  /** Called with whatever the parent sends via `sendMessage`. Assign to subscribe. */
  onMessage: ((message: unknown) => void) | null;
  autoResize(state?: boolean): boolean;
  resize(): void;
  sendMessage(message: unknown, targetOrigin?: string): void;
  hasStorageAccess(): Promise<boolean>;
  /** Must be called from a click or tap handler in the framed page. */
  requestStorageAccess(): Promise<boolean>;
}

/** Attributes of the <resize-iframe> element. */
export interface ResizeIframeAttributes {
  src?: string;
  title?: string;
  direction?: 'vertical' | 'horizontal' | 'both' | 'none';
  'offset-size'?: number | string;
  'min-h'?: string;
  'max-h'?: string;
  allow?: string;
  sandbox?: string;
  /** Whatever else the host framework puts on an element: class, ref, key. */
  [attribute: string]: unknown;
}

declare global {
  interface Window {
    parentIframe?: ParentIframe;
  }

  interface HTMLElementTagNameMap {
    'resize-iframe': HTMLElement & {
      readonly height: string | undefined;
      sendMessage(message: unknown, targetOrigin?: string): void;
    };
  }

  // Picked up by React 18 and below, Preact, and Solid. React 19 moved to
  // React.JSX — see the README for the one-line augmentation it needs.
  namespace JSX {
    interface IntrinsicElements {
      'resize-iframe': ResizeIframeAttributes;
    }
  }
}
