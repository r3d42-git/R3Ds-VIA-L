type Tool = 'via' | 'vial';
export {};
interface ChoiceSnapshot {
  token: number;
  devices: Array<{ deviceId: string; name: string; vendorId: number; productId: number }>;
}

interface AppState {
  tool: Tool;
  status: string;
  loading: boolean;
  zoom: number;
  picker: ChoiceSnapshot | null;
  external: { id: number; url: string } | null;
}

interface AppApi {
  state(): Promise<AppState>;
  selectTool(tool: Tool): Promise<void>;
  reload(): Promise<void>;
  setZoom(zoom: number): Promise<void>;
  reset(tool: Tool, phrase: string): Promise<void>;
  settings(visible: boolean): Promise<void>;
  pick(token: number, deviceId: string): Promise<void>;
  cancelPick(token: number): Promise<void>;
  decideExternal(id: number, open: boolean): Promise<void>;
  onState(listener: (state: AppState) => void): void;
}

const api = (window as unknown as { keyboardTools: AppApi }).keyboardTools;
const $ = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;
const via = $<HTMLButtonElement>('via');
const vial = $<HTMLButtonElement>('vial');
const status = $('status');
const zoom = $<HTMLSelectElement>('zoom');
const overlay = $('overlay');
const overlayTitle = $('overlay-title');
const overlayText = $('overlay-text');
const choices = $('choices');
const cancel = $<HTMLButtonElement>('cancel');
const open = $<HTMLButtonElement>('open');
const grant = $<HTMLButtonElement>('grant');
const settings = $('settings');
const settingsButton = $<HTMLButtonElement>('settings-button');
const reset = $<HTMLButtonElement>('reset');
const resetConfirmation = $('reset-confirmation');
const resetLabel = $('reset-label');
const resetPhrase = $<HTMLInputElement>('reset-phrase');
const resetCancel = $<HTMLButtonElement>('reset-cancel');
const resetConfirm = $<HTMLButtonElement>('reset-confirm');
let latest: AppState | null = null;
let selectedDevice: string | null = null;
let selectionToken: number | null = null;

function deviceLabel(device: ChoiceSnapshot['devices'][number]): string {
  const ids = `${device.vendorId.toString(16).padStart(4, '0')}:${device.productId.toString(16).padStart(4, '0')}`;
  return `${device.name} · ${ids}`;
}

function render(state: AppState): void {
  const overlayWasHidden = overlay.hidden;
  const oldTool = latest?.tool;
  latest = state;
  if (state.picker || state.external || (oldTool && oldTool !== state.tool)) closeSettingsLocally();
  via.classList.toggle('selected', state.tool === 'via');
  vial.classList.toggle('selected', state.tool === 'vial');
  via.setAttribute('aria-pressed', String(state.tool === 'via'));
  vial.setAttribute('aria-pressed', String(state.tool === 'vial'));
  status.textContent = state.status;
  status.classList.toggle('busy', state.loading);
  zoom.value = String(state.zoom);
  reset.textContent = `${state.tool === 'via' ? 'VIA' : 'Vial'}-Daten und Gerätefreigaben löschen`;
  const picker = state.picker;
  const external = state.external;
  settingsButton.disabled = !!picker || !!external;
  overlay.hidden = !picker && !external;
  choices.replaceChildren();
  grant.hidden = !picker;
  if (selectionToken !== picker?.token) selectedDevice = null;
  selectionToken = picker?.token ?? null;
  if (!picker?.devices.some(device => device.deviceId === selectedDevice)) selectedDevice = null;
  grant.disabled = !selectedDevice;
  if (picker) {
    overlayTitle.textContent = 'HID-Gerät auswählen';
    overlayText.textContent = `Die Webseite „${state.tool === 'via' ? 'https://usevia.app/' : 'https://vial.rocks/'}“ möchte auf HID-Geräte zugreifen. Wähle ein Gerät und klicke auf „Verbinden“.`;
    cancel.textContent = 'Abbrechen';
    open.hidden = true;
    if (!picker.devices.length) {
      const empty = document.createElement('p');
      empty.className = 'empty';
      empty.textContent = 'Keine passenden Geräte gefunden. Du kannst ein Gerät anschließen oder abbrechen.';
      choices.append(empty);
    }
    for (const device of picker.devices) {
      const label = document.createElement('label');
      label.className = 'device';
      const radio = document.createElement('input');
      radio.type = 'radio';
      radio.name = 'hid-device';
      radio.checked = selectedDevice === device.deviceId;
      radio.addEventListener('change', () => {
        selectedDevice = device.deviceId;
        grant.disabled = false;
      });
      const text = document.createElement('span');
      text.textContent = deviceLabel(device);
      label.append(radio, text);
      choices.append(label);
    }
  } else if (external) {
    overlayTitle.textContent = 'Externen Link öffnen?';
    overlayText.textContent = 'Diese Adresse wird im Standardbrowser geöffnet:';
    const address = document.createElement('code');
    address.className = 'address';
    address.textContent = external.url;
    choices.append(address);
    cancel.textContent = 'Nicht öffnen';
    open.hidden = false;
  }
  if (overlayWasHidden && !overlay.hidden) cancel.focus();
}

function closeSettingsLocally(): void {
  settings.hidden = true;
  resetConfirmation.hidden = true;
  resetPhrase.value = '';
  resetConfirm.disabled = true;
}

function toolbarClick(button: HTMLElement, handler: () => void): void {
  button.addEventListener('click', event => {
    // A key tester can send Enter/Space while Chromium has local focus.
    if (event.detail === 0) return;
    handler();
  });
}

toolbarClick(via, () => { closeSettingsLocally(); void api.selectTool('via'); });
toolbarClick(vial, () => { closeSettingsLocally(); void api.selectTool('vial'); });
toolbarClick($('reload'), () => void api.reload());
zoom.addEventListener('change', () => void api.setZoom(Number(zoom.value)));
toolbarClick(settingsButton, () => {
  settings.hidden = !settings.hidden;
  if (settings.hidden) closeSettingsLocally();
  else reset.focus();
  void api.settings(!settings.hidden);
});
reset.addEventListener('click', () => {
  if (!latest) return;
  resetConfirmation.hidden = false;
  resetLabel.textContent = `Zum Löschen „${latest.tool === 'via' ? 'VIA' : 'Vial'}“ eingeben:`;
  resetPhrase.value = '';
  resetConfirm.disabled = true;
  resetPhrase.focus();
});
resetPhrase.addEventListener('input', () => {
  resetConfirm.disabled = resetPhrase.value !== (latest?.tool === 'via' ? 'VIA' : 'Vial');
});
resetCancel.addEventListener('click', () => {
  resetConfirmation.hidden = true;
  resetPhrase.value = '';
  resetConfirm.disabled = true;
  reset.focus();
});
resetConfirm.addEventListener('click', () => {
  if (!latest || resetConfirm.disabled) return;
  const tool = latest.tool;
  const phrase = resetPhrase.value;
  closeSettingsLocally();
  void api.reset(tool, phrase);
});
cancel.addEventListener('click', () => {
  if (latest?.picker) void api.cancelPick(latest.picker.token);
  else if (latest?.external) void api.decideExternal(latest.external.id, false);
});
open.addEventListener('click', () => {
  if (latest?.external) void api.decideExternal(latest.external.id, true);
});
grant.addEventListener('click', () => {
  if (latest?.picker && selectedDevice) {
    grant.disabled = true;
    void api.pick(latest.picker.token, selectedDevice);
  }
});
document.addEventListener('keydown', event => {
  if (event.key !== 'Escape') return;
  if (latest?.picker) void api.cancelPick(latest.picker.token);
  else if (latest?.external) void api.decideExternal(latest.external.id, false);
  else if (!settings.hidden) {
    closeSettingsLocally();
    void api.settings(false);
  }
});
api.onState(render);
void api.state().then(render);
