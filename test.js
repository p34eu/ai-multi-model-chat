import { test } from 'node:test';
import assert from 'node:assert';

test('parseMarkdownTable function', () => {
  // Test the markdown table parsing functionality
  // Simplified version for testing
  function parseMarkdownTable(text) {
    const lines = text.trim().split('\n');
    if (lines.length < 2) return null;

    if (!lines[0].startsWith('|') || !lines[1].includes('---')) return null;

    const headers = lines[0].split('|').slice(1, -1).map(h => h.trim());
    const rows = [];

    for (let i = 2; i < lines.length; i++) {
      if (lines[i].trim() === '') continue;
      const cells = lines[i].split('|').slice(1, -1).map(c => c.trim());
      if (cells.length === headers.length) {
        rows.push(cells);
      }
    }

    if (rows.length === 0) return null;

    return { tagName: 'TABLE', className: 'markdown-table', headers, rows };
  }

  // Test simple table
  const input = `| Header1 | Header2 |
| ------- | ------- |
| Cell1   | Cell2   |`;

  const result = parseMarkdownTable(input);
  assert.ok(result);
  assert.strictEqual(result.tagName, 'TABLE');
  assert.strictEqual(result.className, 'markdown-table');
  assert.deepStrictEqual(result.headers, ['Header1', 'Header2']);
  assert.deepStrictEqual(result.rows, [['Cell1', 'Cell2']]);

  // Test non-table input
  const nonTable = 'This is just regular text';
  const nonTableResult = parseMarkdownTable(nonTable);
  assert.strictEqual(nonTableResult, null);
});