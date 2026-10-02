const { _electron: electron, expect } = require('@playwright/test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const data = fs.mkdtempSync(path.join(os.tmpdir(), 'kwt-focus-'));
const env = { ...process.env, KEYBOARD_WEB_TOOLS_DATA_DIR: data };
delete env.ELECTRON_RUN_AS_NODE;
let app;

async function remoteContents() {
  return app.evaluate(({ webContents }) => webContents.getAllWebContents()
    .filter(contents => contents.getURL().startsWith('https://usevia.app/'))
    .map(contents => ({ id: contents.id, focused: contents.isFocused() })));
}

async function generation() {
  return JSON.parse(fs.readFileSync(path.join(data, 'preferences.json'), 'utf8')).generation.via;
}

(async () => {
  try {
    app = await electron.launch({ args: [root], cwd: root, env, timeout: 30000 });
    const ui = await app.firstWindow();
    await ui.waitForLoadState('domcontentloaded');
    await expect.poll(async () => (await remoteContents()).length, { timeout: 30000 }).toBe(1);
    await expect.poll(() => app.evaluate(({ webContents }) => webContents.getAllWebContents()
      .find(contents => contents.getURL().startsWith('https://usevia.app/'))?.isLoadingMainFrame()), { timeout: 30000 }).toBe(false);
    await app.context().route('https://usevia.app/__kwt_focus_fixture', route => route.fulfill({
      contentType: 'text/html', body: '<!doctype html><title>Focus fixture</title><body tabindex="-1"><input id="tester" aria-label="Tastaturtester"><script>localStorage.setItem("kwt-focus", "kept")</script></body>',
    }));
    await app.evaluate(({ webContents }) => webContents.getAllWebContents()
      .find(contents => contents.getURL().startsWith('https://usevia.app/'))
      .loadURL('https://usevia.app/__kwt_focus_fixture'));
    await app.evaluate(({ app, BrowserWindow }) => {
      app.focus({ steal: true });
      BrowserWindow.getAllWindows()[0].focus();
    });
    const remote = app.context().pages().find(page => page.url().includes('__kwt_focus_fixture'));
    assert.ok(remote, 'test page exists in remote WebContentsView');
    await expect.poll(async () => (await remoteContents())[0]?.focused).toBe(true);
    await remote.locator('#tester').focus();
    const initialGeneration = await generation();
    assert.equal(await remote.evaluate(() => localStorage.getItem('kwt-focus')), 'kept');

    await app.evaluate(({ webContents }) => {
      const contents = webContents.getAllWebContents().find(item => item.getURL().startsWith('https://usevia.app/'));
      global.__kwtFocusChoice = 'pending';
      contents.session.emit('select-hid-device', { preventDefault() {} }, { frame: contents.mainFrame, deviceList: [] }, id => {
        global.__kwtFocusChoice = id || 'cancelled';
      });
    });
    await expect(ui.getByRole('button', { name: 'Abbrechen', exact: true })).toBeVisible();
    await ui.getByRole('button', { name: 'Abbrechen', exact: true }).click();
    await expect.poll(async () => (await remoteContents())[0]?.focused).toBe(true);
    assert.equal(await app.evaluate(() => global.__kwtFocusChoice), 'cancelled');

    await app.evaluate(({ webContents }) => {
      const contents = webContents.getAllWebContents().find(item => item.getURL().startsWith('https://usevia.app/'));
      global.__kwtFocusChoice = 'pending';
      contents.session.emit('select-hid-device', { preventDefault() {} }, {
        frame: contents.mainFrame,
        deviceList: [{ deviceId: 'FAKE_FOCUS_ONLY', name: 'Fake Focus Device', vendorId: 1, productId: 2, collections: [] }],
      }, id => { global.__kwtFocusChoice = id || 'cancelled'; });
    });
    await ui.getByRole('radio', { name: /Fake Focus Device/ }).check();
    await ui.getByRole('button', { name: 'Verbinden', exact: true }).click();
    await expect.poll(async () => (await remoteContents())[0]?.focused).toBe(true);
    assert.equal(await app.evaluate(() => global.__kwtFocusChoice), 'FAKE_FOCUS_ONLY');

    for (let i = 0; i < 4; i++) {
      for (const key of ['Tab', 'Shift+Tab', 'Enter', 'Space']) await remote.keyboard.press(key);
    }
    assert.equal(await ui.locator('#settings').isVisible(), false);
    assert.equal(await generation(), initialGeneration);
    assert.equal(await remote.evaluate(() => localStorage.getItem('kwt-focus')), 'kept');

    // Even if local Chromium gets focus, the toolbar cannot be reached by Tab.
    await ui.evaluate(() => document.body.focus());
    for (let i = 0; i < 4; i++) {
      for (const key of ['Tab', 'Shift+Tab', 'Enter', 'Space']) await ui.keyboard.press(key);
    }
    assert.equal(await ui.locator('#settings').isVisible(), false);
    assert.equal(await generation(), initialGeneration);
    assert.equal(await remote.evaluate(() => localStorage.getItem('kwt-focus')), 'kept');
    assert.deepEqual(await ui.locator('.toolbar :is(button, select)').evaluateAll(elements => elements.map(element => element.tabIndex)), [-1, -1, -1, -1, -1]);
    await ui.locator('#settings-button').evaluate(button => button.focus());
    await ui.keyboard.press('Enter');
    await ui.keyboard.press('Space');
    assert.equal(await ui.locator('#settings').isVisible(), false, 'keyboard click on settings is ignored');
    await ui.evaluate(() => window.keyboardTools.settings(false));
    await expect.poll(async () => (await remoteContents())[0]?.focused).toBe(true);

    await ui.evaluate(() => window.keyboardTools.reset('via', 'VIA'));
    assert.equal(await generation(), initialGeneration, 'reset denied when local settings are closed');
    await ui.getByRole('button', { name: 'Einstellungen', exact: true }).click();
    await expect(ui.locator('#settings')).toBeVisible();
    await ui.locator('#settings').screenshot({ path: path.join(data, 'settings.png') });
    await ui.getByRole('button', { name: 'VIA-Daten und Gerätefreigaben löschen' }).click();
    await expect(ui.getByRole('button', { name: 'Jetzt löschen' })).toBeDisabled();
    await ui.keyboard.press('Enter');
    await ui.keyboard.press('Space');
    assert.equal(await generation(), initialGeneration);
    await ui.getByRole('textbox', { name: /Zum Löschen/ }).fill('Vial');
    await expect(ui.getByRole('button', { name: 'Jetzt löschen' })).toBeDisabled();
    await ui.evaluate(() => window.keyboardTools.reset('via', 'Vial'));
    assert.equal(await generation(), initialGeneration, 'main process denies wrong phrase');
    await ui.getByRole('textbox', { name: /Zum Löschen/ }).fill('VIA');
    await ui.getByRole('button', { name: 'Jetzt löschen' }).click();
    await expect.poll(generation, { timeout: 30000 }).toBe(initialGeneration + 1);
    console.log(`PASS focus routing, toolbar keyboard safety, and explicit reset; settings screenshot: ${path.join(data, 'settings.png')}`);
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  } finally {
    if (app) await app.close().catch(() => {});
  }
})();
