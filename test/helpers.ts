import type { Locator, Page } from '@playwright/test';
import { childOrigin } from '../playwright.config';

export { childOrigin };

export interface ParentEvent {
  type: string;
  height?: number;
  width?: number;
  message?: unknown;
  hasAccess?: boolean;
}

declare global {
  interface Window {
    __events: ParentEvent[];
    __handle: {
      disconnect(): void;
      sendMessage(message: unknown, targetOrigin?: string): void;
    };
    __frame: HTMLElement & {
      sendMessage(message: unknown, targetOrigin?: string): void;
    };
    parentIframe: {
      autoResize(state?: boolean): boolean;
      resize(): void;
      sendMessage(message: unknown, targetOrigin?: string): void;
      hasStorageAccess(): Promise<boolean>;
      requestStorageAccess(): Promise<boolean>;
    };
  }
}

type Params = Record<string, string | number>;

const url = (page: string, params: Params) =>
  `/test/pages/${page}?${new URLSearchParams(
    Object.entries(params).map(([key, value]) => [key, String(value)])
  )}`;

/** Opens the iframeResize() parent page and returns the iframe it binds. */
export async function openParent(page: Page, params: Params = {}): Promise<Locator> {
  await page.goto(url('parent.html', params));
  return page.locator('#frame');
}

/** Opens the <resize-iframe> parent page and returns the iframe inside its shadow root. */
export async function openElement(page: Page, params: Params = {}): Promise<Locator> {
  await page.goto(url('element.html', params));
  return page.locator('resize-iframe iframe');
}

/** Restyles an element inside the child frame — cross-origin, so only Playwright can. */
export const styleInChild = (page: Page, selector: string, style: Record<string, string>) =>
  page
    .frameLocator('#frame, resize-iframe iframe')
    .locator(selector)
    .evaluate((element, style) => Object.assign(element.style, style), style);

export const events = (page: Page) => page.evaluate(() => window.__events);

export const eventTypes = async (page: Page) => (await events(page)).map((event) => event.type);

/** Inline height the library set, or '' when it has not touched the dimension. */
export const inlineHeight = (frame: Locator) =>
  frame.evaluate((element: HTMLElement) => element.style.height);

export const inlineWidth = (frame: Locator) =>
  frame.evaluate((element: HTMLElement) => element.style.width);
