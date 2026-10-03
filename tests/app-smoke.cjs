const { _electron: electron, expect } = require('@playwright/test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const output = path.join(root, 'output/playwright');
fs.mkdirSync(output, {recursive:true});
const data = fs.mkdtempSync(path.join(output, 'profile-'));
const env = {...process.env, KEYBOARD_WEB_TOOLS_DATA_DIR:data};
delete env.ELECTRON_RUN_AS_NODE;
const checks = [];
let app;
async function check(name, run) {
  await run(); checks.push(name); console.log(`PASS ${name}`);
}
async function remoteInfo() {
  return app.evaluate(({webContents}) => webContents.getAllWebContents()
    .filter(w => /^https:\/\/(usevia\.app|vial\.rocks)(\/|$)/.test(w.getURL()))
    .map(w => ({id:w.id, url:w.getURL(), prefs:w.getLastWebPreferences()})));
}
async function remoteJS(js, gesture=false) {
  return app.evaluate(({webContents}, {js, gesture}) => {
    const w = webContents.getAllWebContents().find(w => /^https:\/\/(usevia\.app|vial\.rocks)(\/|$)/.test(w.getURL()));
    if (!w) throw new Error('No remote tool');
    return w.executeJavaScript(js, gesture);
  }, {js, gesture});
}

(async () => {
  try {
    app = await electron.launch({args:[root], cwd:root, env, timeout:30000});
    const ui = await app.firstWindow();
    await ui.waitForLoadState('domcontentloaded');
    await expect.poll(async () => (await remoteInfo()).length, {timeout:60000}).toBe(1);
    await expect.poll(() => remoteJS('document.readyState'), {timeout:60000}).toBe('complete');
    await check('VIA live loaded; sandbox, isolation, no Node or remote preload', async () => {
      const [r] = await remoteInfo();
      assert.ok(r.url.startsWith('https://usevia.app/'));
      assert.equal(r.prefs.sandbox, true);
      assert.equal(r.prefs.contextIsolation, true);
      assert.equal(r.prefs.nodeIntegration, false);
      assert.ok(!r.prefs.preload);
      assert.deepEqual(await remoteJS('[typeof require, typeof process, typeof navigator.hid, typeof window.keyboardTools]'), ['undefined','undefined','object','undefined']);
      fs.writeFileSync(path.join(output,'via-body.txt'), await remoteJS('document.body.innerText'));
    });
    await check('WebHID request reaches local chooser; cancel grants nothing', async () => {
      const via = app.context().pages().find(p => p.url().startsWith('https://usevia.app/'));
      const authorize = via.getByRole('button',{name:/Gerät autorisieren|Authorize device/i});
      await expect(authorize).toBeVisible({timeout:60000});
      await via.screenshot({path:path.join(output,'via-ready.png')});
      fs.writeFileSync(path.join(output,'via-body.txt'), await via.locator('body').innerText());
      await authorize.click();
      await expect(ui.getByRole('button',{name:'Abbrechen',exact:true})).toBeVisible({timeout:15000});
      await ui.screenshot({path:path.join(output,'hid-chooser.png')});
      await ui.getByRole('button',{name:'Abbrechen',exact:true}).click();
      await expect(ui.getByRole('button',{name:'Abbrechen',exact:true})).not.toBeVisible();
      assert.deepEqual(await remoteJS('navigator.hid.getDevices().then(d => d.length)'), 0);
    });
    await check('external navigation blocked and waits for local confirmation', async () => {
      await remoteJS("location.href='https://example.com/help'; 'requested'");
      await expect(ui.getByRole('button',{name:'Im Browser öffnen',exact:true})).toBeVisible();
      assert.ok((await remoteInfo())[0].url.startsWith('https://usevia.app/'));
      await ui.getByRole('button',{name:'Nicht öffnen',exact:true}).click();
    });
    await check('chooser requires separate selection and Connect; removed device cannot be granted (simulated)', async () => {
      await app.evaluate(({webContents}) => {
        const w=webContents.getAllWebContents().find(w=>w.getURL().startsWith('https://usevia.app/'));
        global.__kwtChoice='pending';
        const device={deviceId:'TEST_ONLY_NOT_HARDWARE', name:'Test Keyboard',vendorId:1,productId:2,collections:[]};
        w.session.emit('select-hid-device', {preventDefault(){}}, {frame:w.mainFrame,deviceList:[device]}, id=>{global.__kwtChoice=id || 'cancelled';});
      });
      await expect(ui.getByRole('button',{name:'Verbinden',exact:true})).toBeDisabled();
      await ui.getByRole('radio',{name:/Test Keyboard/}).check();
      assert.equal(await app.evaluate(()=>global.__kwtChoice), 'pending');
      await expect(ui.getByRole('button',{name:'Verbinden',exact:true})).toBeEnabled();
      await app.evaluate(({webContents}) => {
        const w=webContents.getAllWebContents().find(w=>w.getURL().startsWith('https://usevia.app/'));
        w.session.emit('hid-device-removed', {}, {frame:w.mainFrame,device:{deviceId:'TEST_ONLY_NOT_HARDWARE'}});
      });
      await expect(ui.getByRole('button',{name:'Verbinden',exact:true})).toBeDisabled();
      await ui.getByRole('button',{name:'Abbrechen',exact:true}).click();
      assert.equal(await app.evaluate(()=>global.__kwtChoice), 'cancelled');
    });
    await check('unsafe popup denied without new window', async () => {
      await remoteJS("window.open('file:///tmp/kwt-forbidden.html'); 'requested'");
      assert.equal(await app.evaluate(({BrowserWindow}) => BrowserWindow.getAllWindows().length), 1);
    });
    await check('redirect to other origin stays blocked', async () => {
      await app.context().route('https://usevia.app/__kwt_redirect', route => route.fulfill({status:302, headers:{location:'https://example.com/redirect'}}));
      await remoteJS("location.href='https://usevia.app/__kwt_redirect'; 'requested'");
      await expect(ui.getByRole('button',{name:'Im Browser öffnen',exact:true})).toBeVisible();
      assert.ok((await remoteInfo())[0].url.startsWith('https://usevia.app/'));
      await ui.getByRole('button',{name:'Nicht öffnen',exact:true}).click();
      await app.context().unroute('https://usevia.app/__kwt_redirect');
    });
    const old = (await remoteInfo())[0].id;
    await check('switch destroys previous WebContents and loads live Vial', async () => {
      await ui.getByRole('button',{name:'Vial',exact:true}).click();
      await expect.poll(async () => (await remoteInfo())[0]?.url, {timeout:60000}).toBe('https://vial.rocks/');
      assert.equal(await app.evaluate(({webContents}, id) => !!webContents.fromId(id), old), false);
      await expect.poll(() => remoteJS('document.readyState'), {timeout:60000}).toBe('complete');
      fs.writeFileSync(path.join(output,'vial-body.txt'), await remoteJS('document.body.innerText'));
      await ui.screenshot({path:path.join(output,'vial-toolbar.png')});
    });
    await check('Vial WebHID request and explicit cancellation', async () => {
      const vial = app.context().pages().find(p => p.url().startsWith('https://vial.rocks/'));
      await vial.getByRole('button',{name:'Start Vial'}).click();
      await expect(ui.getByRole('button',{name:'Abbrechen',exact:true})).toBeVisible({timeout:15000});
      await ui.getByRole('button',{name:'Abbrechen',exact:true}).click();
      await expect(ui.getByRole('button',{name:'Abbrechen',exact:true})).not.toBeVisible();
      assert.equal(await remoteJS('navigator.hid.getDevices().then(d => d.length)'), 0);
    });
    await check('zoom and settings work in local UI', async () => {
      await ui.getByRole('combobox',{name:'Zoom'}).selectOption('1.1');
      assert.equal(await app.evaluate(({webContents}) => webContents.getAllWebContents().find(w => w.getURL().startsWith('https://vial.rocks/')).getZoomFactor()), 1.1);
      await ui.getByRole('button',{name:'Einstellungen',exact:true}).click();
      await expect(ui.getByRole('button',{name:'Vial-Daten und Gerätefreigaben löschen',exact:true})).toBeVisible();
      await ui.screenshot({path:path.join(output,'settings.png')});
      await ui.getByRole('button',{name:'Einstellungen',exact:true}).click();
    });
    await check('site data isolated; Vial cannot see VIA localStorage', async () => {
      await remoteJS("localStorage.setItem('kwt-smoke','vial'); true");
      await ui.getByRole('button',{name:'VIA',exact:true}).click();
      await expect.poll(async () => (await remoteInfo())[0]?.url, {timeout:60000}).toBe('https://usevia.app/');
      assert.equal(await remoteJS("localStorage.getItem('kwt-smoke')"), null);
    });
    await check('file input accepts user-selected JSON without filesystem bridge', async () => {
      const fixture = path.join(output, 'import-fixture.json');
      fs.writeFileSync(fixture, '{"keyboard-web-tools":"browser-file-input-smoke"}\n');
      await remoteJS("const input=document.createElement('input'); input.type='file'; input.id='kwt-test-file'; document.body.append(input); true");
      const remote = app.context().pages().find(p => p.url().startsWith('https://usevia.app/'));
      assert.ok(remote, 'remote page accessible to test driver');
      await remote.locator('#kwt-test-file').setInputFiles(fixture);
      assert.equal(await remoteJS("document.querySelector('#kwt-test-file').files[0].text()"), fs.readFileSync(fixture, 'utf8'));
      await remoteJS("document.querySelector('#kwt-test-file').remove(); true");
    });
    await check('blob export enters Save dialog configuration and writes exact bytes', async () => {
      const destination = path.join(output, 'export-fixture.json');
      await app.evaluate(({webContents}, destination) => {
        const w = webContents.getAllWebContents().find(w => w.getURL().startsWith('https://usevia.app/'));
        global.__kwtDownload = null;
        w.session.once('will-download', (_event, item) => {
          global.__kwtDialogOptions = item.getSaveDialogOptions();
          item.setSavePath(destination); // Test-only selection in place of native user dialog.
          item.once('done', (_event, state) => { global.__kwtDownload = state; });
        });
      }, destination);
      await remoteJS("const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob(['{\"export\":true}'],{type:'application/json'})); a.download='layout.json'; a.click(); true");
      await expect.poll(() => app.evaluate(() => global.__kwtDownload)).toBe('completed');
      const opts = await app.evaluate(() => global.__kwtDialogOptions);
      assert.equal(opts.title, 'Datei speichern');
      assert.equal(fs.readFileSync(destination,'utf8'), '{"export":true}');
    });
    await check('unrequested notification permission denied', async () => {
      assert.equal(await remoteJS('Notification.requestPermission()'), 'denied');
    });
    await check('per-tool reset creates a new session and preserves the other tool', async () => {
      await remoteJS("localStorage.setItem('kwt-reset','must disappear'); true");
      await app.evaluate(({webContents}) => {
        global.__kwtOldSession = webContents.getAllWebContents().find(w => w.getURL().startsWith('https://usevia.app/')).session;
      });
      // Live pages may have a pending chooser after file/input interactions.
      // Close it explicitly before testing the independent settings/reset flow.
      const pending = await ui.evaluate(() => window.keyboardTools.state());
      if (pending.picker) {
        await expect(ui.getByRole('button',{name:'Einstellungen',exact:true})).toBeDisabled();
        await ui.getByRole('button',{name:'Abbrechen',exact:true}).click();
      }
      await ui.getByRole('button',{name:'Einstellungen',exact:true}).click();
      await ui.getByRole('button',{name:'VIA-Daten und Gerätefreigaben löschen',exact:true}).click();
      await ui.getByRole('textbox',{name:/Zum Löschen/}).fill('VIA');
      await ui.getByRole('button',{name:'Jetzt löschen',exact:true}).click();
      await expect.poll(() => app.evaluate(({webContents}) => {
        const current = webContents.getAllWebContents().find(w => w.getURL().startsWith('https://usevia.app/'));
        return !!current && current.session !== global.__kwtOldSession;
      }), {timeout:30000}).toBe(true);
      assert.equal(await app.evaluate(({webContents}) => webContents.getAllWebContents().find(w => w.getURL().startsWith('https://usevia.app/')).session === global.__kwtOldSession), false);
      assert.equal(await remoteJS("localStorage.getItem('kwt-reset')"), null);
      await ui.getByRole('button',{name:'Vial',exact:true}).click();
      await expect.poll(async () => (await remoteInfo())[0]?.url, {timeout:60000}).toBe('https://vial.rocks/');
      assert.equal(await remoteJS("localStorage.getItem('kwt-smoke')"), 'vial');
      await ui.getByRole('button',{name:'VIA',exact:true}).click();
      await expect.poll(async () => (await remoteInfo())[0]?.url, {timeout:60000}).toBe('https://usevia.app/');
    });
    await check('window can be resized during the session', async () => {
      await app.evaluate(({BrowserWindow}) => BrowserWindow.getAllWindows()[0].setSize(980,720));
      await expect.poll(() => app.evaluate(({BrowserWindow}) => BrowserWindow.getAllWindows()[0].getSize())).toEqual([980,720]);
      await ui.screenshot({path:path.join(output,'compact-toolbar.png')});
    });
    await app.close(); app = null;
    const preferences = JSON.parse(fs.readFileSync(path.join(data,'preferences.json'),'utf8'));
    assert.equal(preferences.tool,'via');
    checks.push('preferences saved on disk');
    // A profile from an older version may still contain window bounds.
    preferences.bounds = {width:980, height:720};
    fs.writeFileSync(path.join(data,'preferences.json'), JSON.stringify(preferences));
    app = await electron.launch({args:[root], cwd:root, env, timeout:30000});
    const restored = await app.firstWindow();
    await expect(restored.getByRole('button',{name:'VIA',exact:true})).toHaveAttribute('aria-pressed','true');
    const geometry = await app.evaluate(({BrowserWindow, screen}) => {
      const bounds = BrowserWindow.getAllWindows()[0].getBounds();
      return { bounds, workArea: screen.getDisplayMatching(bounds).workArea };
    });
    assert.equal(geometry.bounds.width, Math.min(1676, geometry.workArea.width));
    assert.equal(geometry.bounds.height, Math.min(1124, geometry.workArea.height));
    assert.ok(geometry.bounds.x >= geometry.workArea.x && geometry.bounds.y >= geometry.workArea.y);
    assert.ok(geometry.bounds.x + geometry.bounds.width <= geometry.workArea.x + geometry.workArea.width);
    assert.ok(geometry.bounds.y + geometry.bounds.height <= geometry.workArea.y + geometry.workArea.height);
    checks.push('last tool restored; legacy window size ignored after restart');
  } catch (error) {
    if (app) {
      const local = app.context().pages().find(page => page.url().startsWith('file:'));
      if (local) {
        console.error('Local UI at failure:', await local.locator('body').innerText().catch(() => 'unavailable'));
        await local.screenshot({path:path.join(output,'failure.png')}).catch(()=>{});
      }
    }
    console.error(error); process.exitCode=1;
  } finally {
    if (app) await app.close().catch(()=>{});
    fs.writeFileSync(path.join(output,'smoke-results.json'), JSON.stringify({checks, passed:!process.exitCode, data, timestamp:new Date().toISOString()},null,2));
  }
})();
