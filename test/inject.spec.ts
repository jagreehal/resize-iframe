import { expect, test } from '@playwright/test';
import { withResizeChild, childScriptTag, childScriptSource } from '../inject.js';

test.describe('withResizeChild', () => {
  test('inlines the child script before </body>', () => {
    const out = withResizeChild('<!doctype html><html><body><p>hi</p></body></html>');

    expect(out).toContain('data-resize-iframe-child');
    expect(out).toContain('data-parent-origin');
    expect(out.indexOf('data-resize-iframe-child')).toBeLessThan(out.indexOf('</body>'));
  });

  test('wraps a fragment so the child has a body to measure', () => {
    const out = withResizeChild('<p>hi</p>');

    expect(out).toMatch(/^<!doctype html>/i);
    expect(out).toContain('<body><div><p>hi</p></div>');
    expect(out).toContain('data-resize-iframe-child');
  });

  test('gives bare text a box to be measured in', () => {
    // body's element children are what the child measures, so text with no
    // element around it would report zero height and the frame would never size.
    const out = withResizeChild('just text');

    expect(out).toContain('<div>just text</div>');
    expect(out).toContain('body{margin:0}');
  });

  test('is idempotent', () => {
    const once = withResizeChild('<p>hi</p>');
    expect(withResizeChild(once)).toBe(once);
  });

  test('escapes </script> so the HTML parser cannot close the tag early', () => {
    const tag = childScriptTag();
    const open = tag.indexOf('>');
    const close = tag.lastIndexOf('</script>');
    const inner = tag.slice(open + 1, close);
    // Exactly one real closer — the one that ends the tag.
    expect(tag.slice(0, close).toLowerCase()).not.toContain('</script');
    expect(inner.includes(childScriptSource.slice(0, 30)) || inner.includes('<\\/script')).toBe(true);
  });
});
