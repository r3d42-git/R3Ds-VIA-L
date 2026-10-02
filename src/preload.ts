import { contextBridge, ipcRenderer } from 'electron';
import type { ChoiceSnapshot } from './chooser';
import type { Tool } from './policy';

interface AppState {
  tool: Tool;
  status: string;
  loading: boolean;
  zoom: number;
  picker: ChoiceSnapshot | null;
  external: { id: number; url: string } | null;
}

const api = {
  state: (): Promise<AppState> => ipcRenderer.invoke('app:action', 'state'),
  selectTool: (tool: Tool): Promise<void> => ipcRenderer.invoke('app:action', 'tool', tool),
  reload: (): Promise<void> => ipcRenderer.invoke('app:action', 'reload'),
  setZoom: (zoom: number): Promise<void> => ipcRenderer.invoke('app:action', 'zoom', zoom),
  reset: (tool: Tool, phrase: string): Promise<void> => ipcRenderer.invoke('app:action', 'reset', { tool, phrase }),
  settings: (visible: boolean): Promise<void> => ipcRenderer.invoke('app:action', 'settings', visible),
  pick: (token: number, deviceId: string): Promise<void> => ipcRenderer.invoke('app:action', 'pick', { token, deviceId }),
  cancelPick: (token: number): Promise<void> => ipcRenderer.invoke('app:action', 'cancel-pick', token),
  decideExternal: (id: number, open: boolean): Promise<void> => ipcRenderer.invoke('app:action', 'external', { id, open }),
  onState: (listener: (state: AppState) => void): void => {
    ipcRenderer.on('app:state', (_event, state: AppState) => listener(state));
  },
};

contextBridge.exposeInMainWorld('keyboardTools', api);
