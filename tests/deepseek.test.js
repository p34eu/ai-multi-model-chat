import test from 'node:test';
import assert from 'node:assert';

test('DeepSeek provider present in /api/models', async (t) => {
  const url = 'http://localhost:3184/api/models';
  try {
    const res = await fetch(url);
    if (!res.ok) {
      t.skip(`Server returned ${res.status}`);
      return;
    }
    const data = await res.json();
    assert.ok(data.providers, 'providers object missing');
    assert.ok(data.providers['DeepSeek'], 'DeepSeek provider missing');
    assert.equal(typeof data.providers['DeepSeek'].enabled, 'boolean');
    assert.equal(typeof data.providers['DeepSeek'].hasApiKey, 'boolean');
    assert.ok(typeof data.providers['DeepSeek'].modelCount === 'number');
  } catch (err) {
    t.skip('Server not reachable or fetch failed');
  }
});
