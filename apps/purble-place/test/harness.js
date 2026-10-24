// A tiny test runner (describe / it / assert) that works in a browser tab, so the
// project needs no Node toolchain. Open test/index.html through any static server.

const suites = [];
let current = null;

export function describe(name, fn) {
  const suite = { name, tests: [] };
  suites.push(suite);
  const prev = current;
  current = suite;
  fn();
  current = prev;
}

export function it(name, fn) {
  current.tests.push({ name, fn });
}

const show = (v) => { try { return JSON.stringify(v); } catch { return String(v); } };

export const assert = {
  ok(value, msg = 'expected truthy') { if (!value) throw new Error(msg); },
  equal(actual, expected, msg) { if (actual !== expected) throw new Error(`${msg ? msg + ': ' : ''}expected ${show(expected)}, got ${show(actual)}`); },
  deepEqual(actual, expected, msg) { if (show(actual) !== show(expected)) throw new Error(`${msg ? msg + ': ' : ''}expected ${show(expected)}, got ${show(actual)}`); },
  closeTo(actual, expected, eps = 1e-6, msg) { if (Math.abs(actual - expected) > eps) throw new Error(`${msg ? msg + ': ' : ''}expected ≈${expected}, got ${actual}`); },
  throws(fn, msg = 'expected a throw') { let threw = false; try { fn(); } catch { threw = true; } if (!threw) throw new Error(msg); },
};

export async function run(root = document.body) {
  const results = [];
  let passed = 0;
  let failed = 0;
  const out = document.createElement('div');
  out.style.cssText = 'font:13px/1.5 Consolas,monospace;padding:12px';
  root.append(out);
  // ?grep=text runs only the suites whose name contains the text
  const grep = (new URLSearchParams(location.search).get('grep') || '').toLowerCase();
  for (const suite of suites) {
    if (grep && !suite.name.toLowerCase().includes(grep)) continue;
    const h = document.createElement('div');
    h.style.cssText = 'font-weight:700;margin-top:10px';
    h.textContent = suite.name;
    out.append(h);
    for (const test of suite.tests) {
      const row = document.createElement('div');
      try {
        await test.fn();
        passed++;
        row.textContent = `  ✓ ${test.name}`;
        row.style.color = '#1a7f37';
        results.push({ suite: suite.name, name: test.name, ok: true });
      } catch (err) {
        failed++;
        row.textContent = `  ✗ ${test.name} — ${err.message}`;
        row.style.color = '#c62828';
        results.push({ suite: suite.name, name: test.name, ok: false, error: err.message, stack: err.stack });
      }
      out.append(row);
    }
  }
  const summary = document.createElement('div');
  summary.style.cssText = `margin-top:14px;font-weight:700;color:${failed ? '#c62828' : '#1a7f37'}`;
  summary.textContent = `${passed} passed, ${failed} failed`;
  out.prepend(summary);
  window.__results = { passed, failed, results };
  document.title = `${failed ? 'FAIL' : 'PASS'} ${passed}/${passed + failed}`;
  return window.__results;
}
