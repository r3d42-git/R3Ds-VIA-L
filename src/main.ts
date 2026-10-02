import { app, BrowserWindow, dialog, ipcMain, Menu, session, shell, WebContentsView, type Session, type WebContents } from 'electron';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { HidChooser, type ChoiceSnapshot, type HidChoice } from './chooser';
import { isAllowedDocument, isExternalHttpUrl, isTool, mayUseHid, TOOLS, type Tool } from './policy';

interface Preferences {
  tool: Tool;
  bounds: { width: number; height: number };
  zoom: Record<Tool, number>;
  generation: Record<Tool, number>;
}

interface PublicState {
  tool: Tool;
  status: string;
  loading: boolean;
  zoom: number;
  picker: ChoiceSnapshot | null;
  external: { id: number; url: string } | null;
}

const DEFAULTS: Preferences = {
  tool: 'via', bounds: { width: 1676, height: 1124 },
  zoom: { via: 1, vial: 1 }, generation: { via: 0, vial: 0 },
};
const TOOLBAR_HEIGHT = 70;
const chooser = new HidChooser();
const configuredSessions = new Set<string>();
let window: BrowserWindow | null = null;
let remoteView: WebContentsView | null = null;
let activeTool: Tool = 'via';
let preferences: Preferences = structuredClone(DEFAULTS);
let status = 'Bereit';
let loading = false;
let external: { id: number; url: string } | null = null;
let externalSerial = 0;
let changing = false;
let quitting = false;
let settingsOpen = false;

// Keep the existing profile location when the packaged app name changes.
// Development-only data isolation remains available for automated and manual testing.
if (!app.isPackaged && process.env.KEYBOARD_WEB_TOOLS_DATA_DIR) {
  const dataPath = resolve(process.env.KEYBOARD_WEB_TOOLS_DATA_DIR);
  mkdirSync(dataPath, { recursive: true });
  app.setPath('userData', dataPath);
} else {
  app.setPath('userData', join(app.getPath('appData'), 'Keyboard Web Tools'));
}
app.setName('VIA-L');

const preferencesPath = () => join(app.getPath('userData'), 'preferences.json');
const localPageUrl = () => pathToFileURL(join(__dirname, 'index.html')).href;

function readPreferences(): Preferences {
  try {
    const data = JSON.parse(readFileSync(preferencesPath(), 'utf8')) as Partial<Preferences>;
    return {
      tool: isTool(data.tool) ? data.tool : DEFAULTS.tool,
      bounds: {
        width: Math.max(800, Math.min(3000, Number(data.bounds?.width) || DEFAULTS.bounds.width)),
        height: Math.max(620, Math.min(2200, Number(data.bounds?.height) || DEFAULTS.bounds.height)),
      },
      zoom: {
        via: validZoom(data.zoom?.via), vial: validZoom(data.zoom?.vial),
      },
      generation: {
        via: validGeneration(data.generation?.via), vial: validGeneration(data.generation?.vial),
      },
    };
  } catch {
    return structuredClone(DEFAULTS);
  }
}

function validZoom(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0.75 && value <= 1.5 ? value : 1;
}

function validGeneration(value: unknown): number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : 0;
}

function savePreferences(): void {
  mkdirSync(app.getPath('userData'), { recursive: true });
  const temporary = `${preferencesPath()}.tmp`;
  writeFileSync(temporary, JSON.stringify(preferences, null, 2), { mode: 0o600 });
  renameSync(temporary, preferencesPath());
}

function currentContents(): WebContents | null {
  return remoteView && !remoteView.webContents.isDestroyed() ? remoteView.webContents : null;
}

function focusRemote(): void {
  if (!settingsOpen && !chooser.snapshot && !external && window?.isFocused()) currentContents()?.focus();
}

function localContents(): WebContents | null {
  return window && !window.isDestroyed() && !window.webContents.isDestroyed() ? window.webContents : null;
}

function sendState(): void {
  const state: PublicState = {
    tool: activeTool, status, loading, zoom: preferences.zoom[activeTool],
    picker: chooser.snapshot, external,
  };
  const contents = localContents();
  if (contents && !contents.isLoadingMainFrame()) contents.send('app:state', state);
  remoteView?.setVisible(!state.picker && !state.external && !settingsOpen);
}

function setStatus(message: string, busy = false): void {
  status = message;
  loading = busy;
  sendState();
}

function isTrustedLocalRequest(event: Electron.IpcMainInvokeEvent): boolean {
  const contents = localContents();
  return !!contents && event.sender === contents && event.senderFrame === contents.mainFrame
    && event.senderFrame.url === localPageUrl();
}

function boundsRemote(): void {
  if (!window || !remoteView) return;
  const { width, height } = window.getContentBounds();
  remoteView.setBounds({ x: 0, y: TOOLBAR_HEIGHT, width, height: Math.max(1, height - TOOLBAR_HEIGHT) });
}

function closeRemote(): void {
  chooser.cancel();
  external = null;
  settingsOpen = false;
  const old = remoteView;
  remoteView = null;
  if (!old) return;
  if (window && !window.isDestroyed()) window.contentView.removeChildView(old);
  if (!old.webContents.isDestroyed()) old.webContents.close({ waitForBeforeUnload: false });
}

function hidChoice(device: Electron.HIDDevice): HidChoice {
  return {
    deviceId: device.deviceId,
    name: device.name || 'Unbenanntes Gerät',
    vendorId: device.vendorId,
    productId: device.productId,
  };
}

function isActiveHidFrame(frame: Electron.WebFrameMain | null, ses: Session): boolean {
  const contents = currentContents();
  return !!contents && !!frame && contents.session === ses && frame === contents.mainFrame
    && isAllowedDocument(activeTool, frame.url)
    && mayUseHid(activeTool, frame.url, new URL(frame.url).origin, true, true)
    && isAllowedDocument(activeTool, contents.getURL());
}

function configureSession(ses: Session, key: string): void {
  if (configuredSessions.has(key)) return;
  configuredSessions.add(key);
  ses.setPermissionCheckHandler((contents, permission, requestingOrigin, details) => {
    if (permission !== 'hid' || !contents || contents !== currentContents() || contents.session !== ses) return false;
    return mayUseHid(activeTool, details.requestingUrl || '', requestingOrigin, details.isMainFrame, true)
      && isAllowedDocument(activeTool, contents.getURL());
  });
  ses.setPermissionRequestHandler((contents, permission, callback, details) => {
    const allow = permission === 'hid' && contents === currentContents() && contents.session === ses
      && mayUseHid(activeTool, details.requestingUrl, TOOLS[activeTool].origin, details.isMainFrame, true)
      && isAllowedDocument(activeTool, contents.getURL());
    callback(allow);
  });
  // Deliberately no setDevicePermissionHandler: Electron stores selections in memory.
  ses.on('select-hid-device', (event, details, callback) => {
    event.preventDefault();
    if (!isActiveHidFrame(details.frame, ses) || changing || quitting) {
      callback();
      return;
    }
    settingsOpen = false;
    chooser.begin(details.deviceList.map(hidChoice), callback);
    sendState();
    localContents()?.focus();
  });
  ses.on('hid-device-added', (_event, details) => {
    if (isActiveHidFrame(details.frame, ses) && chooser.snapshot) {
      chooser.add(hidChoice(details.device));
      sendState();
    }
  });
  ses.on('hid-device-removed', (_event, details) => {
    if (isActiveHidFrame(details.frame, ses) && chooser.snapshot) {
      chooser.remove(details.device.deviceId);
      sendState();
    }
  });
  ses.on('will-download', (event, item, contents) => {
    if (contents !== currentContents() || contents.session !== ses) {
      event.preventDefault();
      return;
    }
    item.setSaveDialogOptions({ title: 'Datei speichern', defaultPath: item.getFilename() });
    item.on('done', (_doneEvent, result) => {
      setStatus(result === 'completed' ? 'Download gespeichert' : 'Download beendet');
    });
  });
}

function askExternal(url: string): void {
  if (!isExternalHttpUrl(url) || isAllowedDocument(activeTool, url)) return;
  settingsOpen = false;
  external = { id: ++externalSerial, url };
  sendState();
  localContents()?.focus();
}

function guardRemote(contents: WebContents, tool: Tool): void {
  let loadFailed = false;
  const guardNavigation = (event: { preventDefault(): void }, url: string) => {
    if (isAllowedDocument(tool, url)) return;
    event.preventDefault();
    if (contents === currentContents()) askExternal(url);
  };
  contents.on('will-frame-navigate', event => guardNavigation(event, event.url));
  contents.on('will-redirect', event => guardNavigation(event, event.url));
  contents.setWindowOpenHandler(details => {
    if (contents === currentContents()) askExternal(details.url);
    return { action: 'deny' };
  });
  contents.on('content-bounds-updated', event => event.preventDefault());
  contents.on('did-start-navigation', (_event, _url, _isInPlace, isMainFrame) => {
    if (contents === currentContents() && isMainFrame) {
      chooser.cancel();
      loadFailed = false;
      sendState();
    }
  });
  contents.on('did-start-loading', () => {
    if (contents === currentContents()) setStatus(`${TOOLS[tool].label} lädt …`, true);
  });
  contents.on('did-stop-loading', () => {
    if (contents === currentContents() && !loadFailed) setStatus(`${TOOLS[tool].label} bereit`);
  });
  contents.on('did-fail-load', (_event, code, description, _url, isMainFrame) => {
    if (contents === currentContents() && isMainFrame && code !== -3) {
      loadFailed = true;
      setStatus(`Ladefehler: ${description}`);
    }
  });
  contents.on('render-process-gone', () => {
    if (contents === currentContents()) setStatus('Webseite abgestürzt. Bitte neu laden.');
  });
}

async function showTool(tool: Tool): Promise<void> {
  if (!window || window.isDestroyed() || changing) return;
  changing = true;
  closeRemote();
  activeTool = tool;
  preferences.tool = tool;
  savePreferences();
  setStatus(`${TOOLS[tool].label} lädt …`, true);
  const partition = `persist:keyboard-web-tools-${tool}-${preferences.generation[tool]}`;
  const ses = session.fromPartition(partition);
  configureSession(ses, partition);
  const view = new WebContentsView({ webPreferences: {
    partition, sandbox: true, contextIsolation: true, nodeIntegration: false,
    webSecurity: true, allowRunningInsecureContent: false, webviewTag: false,
  } });
  remoteView = view;
  const contents = view.webContents;
  guardRemote(contents, tool);
  if (tool === 'via') {
    const browserUserAgent = ses.getUserAgent().replace(/\s(?:Electron|KeyboardWebTools|VIA-L)\/[^\s]+/g, '');
    contents.setUserAgent(browserUserAgent);
  }
  contents.setZoomFactor(preferences.zoom[tool]);
  window.contentView.addChildView(view);
  boundsRemote();
  sendState();
  changing = false;
  try {
    await contents.loadURL(TOOLS[tool].url);
    if (contents === currentContents()) focusRemote();
  } catch (error) {
    if (contents === currentContents()) setStatus(`Ladefehler: ${String(error)}`);
    if (contents === currentContents()) focusRemote();
  }
}

async function resetTool(tool: Tool): Promise<void> {
  if (changing) return;
  changing = true;
  const wasActive = tool === activeTool;
  try {
    if (wasActive) closeRemote();
    const oldPartition = `persist:keyboard-web-tools-${tool}-${preferences.generation[tool]}`;
    const oldSession = session.fromPartition(oldPartition);
    await oldSession.clearStorageData();
    await oldSession.clearCache();
    preferences.generation[tool] += 1;
    savePreferences();
  } finally {
    changing = false;
  }
  if (wasActive) await showTool(tool);
  else setStatus(`${TOOLS[tool].label}-Daten gelöscht`);
}

function installIpc(): void {
  ipcMain.handle('app:action', async (event, action: unknown, value: unknown) => {
    if (!isTrustedLocalRequest(event) || typeof action !== 'string') return null;
    switch (action) {
      case 'state':
        return { tool: activeTool, status, loading, zoom: preferences.zoom[activeTool], picker: chooser.snapshot, external } satisfies PublicState;
      case 'tool':
        if (isTool(value)) await showTool(value);
        break;
      case 'reload':
        if (!chooser.snapshot && !external) {
          currentContents()?.reload();
          focusRemote();
        }
        break;
      case 'zoom':
        if (typeof value === 'number' && Number.isFinite(value) && value >= 0.75 && value <= 1.5) {
          preferences.zoom[activeTool] = Math.round(value * 20) / 20;
          currentContents()?.setZoomFactor(preferences.zoom[activeTool]);
          savePreferences();
          sendState();
          focusRemote();
        }
        break;
      case 'reset':
        if (value && typeof value === 'object') {
          const request = value as { tool?: unknown; phrase?: unknown };
          if (settingsOpen && isTool(request.tool) && request.tool === activeTool
            && request.phrase === TOOLS[request.tool].label) {
            settingsOpen = false;
            await resetTool(request.tool);
          }
        }
        break;
      case 'settings':
        if (typeof value === 'boolean' && (!value || (!chooser.snapshot && !external))) {
          settingsOpen = value;
          sendState();
          if (!value) focusRemote();
        }
        break;
      case 'pick':
        if (value && typeof value === 'object') {
          const request = value as { token?: unknown; deviceId?: unknown };
          if (typeof request.token === 'number' && typeof request.deviceId === 'string') {
            const contents = currentContents();
            if (contents && isActiveHidFrame(contents.mainFrame, contents.session)) chooser.choose(request.token, request.deviceId);
            else chooser.cancel(request.token);
            sendState();
            focusRemote();
          }
        }
        break;
      case 'cancel-pick':
        if (typeof value === 'number') {
          chooser.cancel(value);
          sendState();
          focusRemote();
        }
        break;
      case 'external':
        if (value && typeof value === 'object') {
          const request = value as { id?: unknown; open?: unknown };
          const pending = external;
          if (pending && request.id === pending.id && typeof request.open === 'boolean') {
            external = null;
            sendState();
            focusRemote();
            if (request.open && isExternalHttpUrl(pending.url)) {
              try { await shell.openExternal(pending.url); }
              catch { setStatus('Externer Link konnte nicht geöffnet werden'); }
            }
          }
        }
        break;
    }
    return null;
  });
}

function createWindow(): void {
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    { label: 'VIA-L', submenu: [{ role: 'about' }, { type: 'separator' }, { role: 'hide' }, { role: 'hideOthers' }, { role: 'unhide' }, { type: 'separator' }, { role: 'quit' }] },
    { label: 'Bearbeiten', submenu: [{ role: 'undo' }, { role: 'redo' }, { type: 'separator' }, { role: 'cut' }, { role: 'copy' }, { role: 'paste' }, { role: 'selectAll' }] },
  ]));
  preferences = readPreferences();
  activeTool = preferences.tool;
  const win = new BrowserWindow({
    title: 'R3Ds VIA-L', width: preferences.bounds.width, height: preferences.bounds.height,
    minWidth: 800, minHeight: 620, backgroundColor: '#101923',
    webPreferences: {
      preload: join(__dirname, 'preload.js'), sandbox: true, contextIsolation: true,
      nodeIntegration: false, webSecurity: true, webviewTag: false,
    },
  });
  window = win;
  win.on('focus', focusRemote);
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-frame-navigate', event => {
    if (event.url !== localPageUrl()) event.preventDefault();
  });
  win.webContents.on('will-redirect', event => event.preventDefault());
  win.on('resize', () => {
    boundsRemote();
    if (!win.isDestroyed() && !win.isMinimized()) {
      const size = win.getSize();
      preferences.bounds = { width: size[0], height: size[1] };
      savePreferences();
    }
  });
  win.on('closed', () => {
    closeRemote();
    window = null;
  });
  void win.loadFile(join(__dirname, 'index.html')).then(() => {
    sendState();
    void showTool(activeTool);
  });
}

app.on('window-all-closed', () => app.quit());
app.on('before-quit', () => { quitting = true; chooser.cancel(); });
app.whenReady().then(() => {
  app.setAboutPanelOptions({
    applicationName: 'R3Ds VIA-L',
    applicationVersion: app.getVersion(),
    copyright: 'Copyright © 2026 r3d42-git',
    credits: 'Unabhängige App für VIA und Vial. GPL-3.0-or-later. Keine Verbindung zu den Originalprojekten.',
    iconPath: join(__dirname, 'AppIcon.png'),
  });
  installIpc();
  createWindow();
}).catch(error => {
  dialog.showErrorBox('Start fehlgeschlagen', String(error));
  app.quit();
});
