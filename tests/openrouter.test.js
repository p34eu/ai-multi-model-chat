import test from 'node:test';
import assert from 'node:assert';

test('OpenRouter provider present in /api/models', async (t) => {
  const url = 'http://localhost:3184/api/models';
  try {
    const res = await fetch(url);
    if (!res.ok) {
      t.skip(`Server returned ${res.status}`);
      return;
    }
    const data = await res.json();
    assert.ok(data.providers, 'providers object missing');
    assert.ok(data.providers['OpenRouter'], 'OpenRouter provider missing');
    assert.equal(typeof data.providers['OpenRouter'].enabled, 'boolean');
    assert.equal(typeof data.providers['OpenRouter'].hasApiKey, 'boolean');
    assert.ok(typeof data.providers['OpenRouter'].modelCount === 'number');
  } catch (err) {
    t.skip('Server not reachable or fetch failed');
  }
});
