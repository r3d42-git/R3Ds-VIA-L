export interface HidChoice {
  deviceId: string;
  name: string;
  vendorId: number;
  productId: number;
}

export interface ChoiceSnapshot {
  token: number;
  devices: HidChoice[];
}

/** One outstanding request. A token prevents delayed UI actions from selecting a later request. */
export class HidChooser {
  private serial = 0;
  private pending: { token: number; devices: Map<string, HidChoice>; finish: (deviceId?: string) => void } | null = null;

  get snapshot(): ChoiceSnapshot | null {
    const active = this.pending;
    return active ? { token: active.token, devices: [...active.devices.values()] } : null;
  }

  begin(devices: HidChoice[], finish: (deviceId?: string) => void): ChoiceSnapshot {
    this.cancel();
    const token = ++this.serial;
    this.pending = { token, devices: new Map(devices.map(device => [device.deviceId, device])), finish };
    return this.snapshot!;
  }

  add(device: HidChoice): ChoiceSnapshot | null {
    if (!this.pending) return null;
    this.pending.devices.set(device.deviceId, device);
    return this.snapshot;
  }

  remove(deviceId: string): ChoiceSnapshot | null {
    if (!this.pending) return null;
    this.pending.devices.delete(deviceId);
    return this.snapshot;
  }

  choose(token: number, deviceId: string): boolean {
    const active = this.pending;
    if (!active || active.token !== token || !active.devices.has(deviceId)) return false;
    this.pending = null;
    active.finish(deviceId);
    return true;
  }

  cancel(token?: number): boolean {
    const active = this.pending;
    if (!active || (token !== undefined && token !== active.token)) return false;
    this.pending = null;
    active.finish();
    return true;
  }
}
