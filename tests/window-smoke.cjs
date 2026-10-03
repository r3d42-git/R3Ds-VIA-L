const { _electron: electron } = require('@playwright/test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const output = path.join(root, 'output/playwright');
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'via-l-window-'));
const results = [];

async function run(name, simulatedSize) {
  const profile = path.join(temporary, name);
  fs.mkdirSync(profile);
  // A stale oversized preference must not override the new startup policy.
  fs.writeFileSync(path.join(profile, 'preferences.json'), JSON.stringify({
    tool: 'vial', bounds: { width: 3000, height: 2200 },
    zoom: { via: 1, vial: 1 }, generation: { via: 0, vial: 0 },
  }));
  const bootstrap = path.join(temporary, `${name}.cjs`);
  fs.writeFileSync(bootstrap, `
    const { app, screen } = require('electron');
    app.whenReady().then(() => {
      const display = screen.getDisplayNearestPoint(screen.getCursorScreenPoint());
      const area = { ...display.workArea };
      const simulated = ${JSON.stringify(simulatedSize)};
      if (simulated) {
        area.width = Math.min(area.width, simulated.width);
        area.height = Math.min(area.height, simulated.height);
        screen.getDisplayNearestPoint = () => ({ ...display, workArea: area });
      }
      global.__windowTestArea = area;
      require(${JSON.stringify(path.join(root, 'dist/main.js'))});
    });
  `);
  const env = { ...process.env, KEYBOARD_WEB_TOOLS_DATA_DIR: profile };
  delete env.ELECTRON_RUN_AS_NODE;
  let app;
  try {
    app = await electron.launch({ args: [bootstrap], cwd: root, env, timeout: 30000 });
    const ui = await app.firstWindow();
    await ui.waitForLoadState('domcontentloaded');
    const actual = await app.evaluate(({ BrowserWindow }) => {
      const win = BrowserWindow.getAllWindows()[0];
      return {
        bounds: win.getBounds(), minimum: win.getMinimumSize(),
        area: global.__windowTestArea,
      };
    });
    const { bounds, area, minimum } = actual;
    assert.equal(bounds.width, Math.min(1676, area.width));
    assert.equal(bounds.height, Math.min(1124, area.height));
    assert.ok(bounds.x >= area.x && bounds.y >= area.y);
    assert.ok(bounds.x + bounds.width <= area.x + area.width);
    assert.ok(bounds.y + bounds.height <= area.y + area.height);
    assert.deepEqual(minimum, [Math.min(800, bounds.width), Math.min(620, bounds.height)]);
    await ui.screenshot({ path: path.join(output, `window-${name}.png`) });
    results.push({ name, simulated: !!simulatedSize, ...actual });
    console.log(`PASS ${name}: ${bounds.width} × ${bounds.height}, within work area`);
  } finally {
    if (app) await app.close();
  }
}

(async () => {
  fs.mkdirSync(output, { recursive: true });
  try {
    await run('actual-display', null);
    await run('small-display', { width: 1280, height: 720 });
    await run('below-old-minimum', { width: 720, height: 500 });
    fs.writeFileSync(path.join(output, 'window-results.json'), JSON.stringify(results, null, 2));
  } finally {
    fs.rmSync(temporary, { recursive: true, force: true });
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
