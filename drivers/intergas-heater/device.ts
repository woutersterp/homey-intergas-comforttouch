import Homey from 'homey';

import IntergasApi from '../../lib/api.js';
import UnauthorizedError from '../../lib/errors.js';
import { HeaterStatistics, Zone, ZoneUpdate } from '../../lib/types.js';

const POLL_INTERVAL = 60 * 1000;
const TOKEN_REFRESH_INTERVAL = 30 * 60 * 1000;

interface DeviceStore {
  jwt?: string;
  account_id?: string;
  heater_id?: string;
  zone_number?: number;
  email?: string;
  password?: string;
}

export default class IntergasHeaterDevice extends Homey.Device {
  private readonly api = new IntergasApi();

  private pollTimer?: NodeJS.Timeout;

  private tokenUpdatedAt = 0;

  async onInit() {
    this.log(`Intergas heater "${this.getName()}" has been initialized`);

    this.registerCapabilityListener('target_temperature', async (value: number) => {
      await this.setTargetTemperature(value);
    });

    await this.syncData().catch((err) => this.error('Initial data sync failed', err));

    this.pollTimer = this.homey.setInterval(() => {
      this.syncData().catch((err) => this.error('Polling failed', err));
    }, POLL_INTERVAL);
  }

  async onUninit() {
    if (this.pollTimer) this.homey.clearInterval(this.pollTimer);
  }

  async onDeleted() {
    if (this.pollTimer) this.homey.clearInterval(this.pollTimer);
  }

  private getDeviceStore(): DeviceStore {
    return this.getStore() as DeviceStore;
  }

  private getContext() {
    const store = this.getDeviceStore();
    return {
      accountId: store.account_id ?? '',
      heaterId: store.heater_id ?? (this.getData() as { id: string }).id,
      zoneNumber: Number(store.zone_number ?? 1),
    };
  }

  private async reauthenticate(): Promise<void> {
    const { email, password } = this.getDeviceStore();
    if (!email || !password) {
      throw new Error('Missing credentials, please re-pair this device');
    }

    const token = await this.api.authenticate({ email, password });
    await this.setStoreValue('jwt', token.jwt);
    await this.setStoreValue('account_id', token.account_id);
    this.api.setToken(token.jwt);
    this.tokenUpdatedAt = Date.now();
  }

  private async ensureToken(force = false): Promise<void> {
    const { jwt, account_id: accountId } = this.getDeviceStore();
    const stale = Date.now() - this.tokenUpdatedAt > TOKEN_REFRESH_INTERVAL;

    if (jwt && !force && !stale) {
      this.api.setToken(jwt);
      return;
    }

    if (jwt) {
      this.api.setToken(jwt);
      try {
        const refreshed = await this.api.refresh({ jwt, account_id: accountId ?? '' });
        await this.setStoreValue('jwt', refreshed.jwt);
        this.api.setToken(refreshed.jwt);
        this.tokenUpdatedAt = Date.now();
        return;
      } catch (err) {
        this.log('Token refresh failed, falling back to re-authentication', err);
      }
    }

    await this.reauthenticate();
  }

  private async withAuth<T>(fn: () => Promise<T>): Promise<T> {
    await this.ensureToken();

    try {
      return await fn();
    } catch (err) {
      if (err instanceof UnauthorizedError) {
        this.log('Received 401, refreshing token and retrying');
        await this.ensureToken(true);
        return fn();
      }
      throw err;
    }
  }

  private async setCapabilityValueSafe(
    capabilityId: string,
    value: number | null | undefined,
  ): Promise<void> {
    if (value === null || value === undefined) return;
    if (!this.hasCapability(capabilityId)) return;

    await this.setCapabilityValue(capabilityId, value).catch((err) => {
      this.error(`Failed to update ${capabilityId}`, err);
    });
  }

  private async syncData(): Promise<void> {
    const { accountId, heaterId, zoneNumber } = this.getContext();

    const zones = await this.withAuth(() => this.api.getZones(accountId, heaterId));
    const zone: Zone | undefined = zones.find((candidate) => candidate.zone_number === zoneNumber) ?? zones[0];

    if (zone) {
      await this.setCapabilityValueSafe('measure_temperature', zone.temperature_room);
      await this.setCapabilityValueSafe('target_temperature', zone.temperature_heater_setpoint);
    }

    const stats = await this.withAuth(() => this.api.getHeaterStatistics(accountId, heaterId)).catch((err) => {
      this.error('Failed to fetch statistics', err);
      return null as HeaterStatistics | null;
    });

    if (!stats) return;

    const pressure = stats.heating_water_pressure ?? stats.ch_water_pressure;
    await this.setCapabilityValueSafe('measure_water_pressure', pressure);
    await this.setCapabilityValueSafe('meter_gas_ch', stats.ch_gas_consumption);
    await this.setCapabilityValueSafe(
      'meter_gas_dhw',
      stats.dhw_gas_consumption ?? stats.hot_water_gas_consumption,
    );
  }

  private async setTargetTemperature(value: number): Promise<void> {
    const { accountId, heaterId, zoneNumber } = this.getContext();

    const zones = await this.withAuth(() => this.api.getZones(accountId, heaterId));
    const zone: Zone | undefined = zones.find((candidate) => candidate.zone_number === zoneNumber) ?? zones[0];

    if (!zone) throw new Error('No zone found for this heater');

    const update: ZoneUpdate = {
      name: zone.name,
      temperature_heater_setpoint: value,
    };

    const updatedZone = await this.withAuth(() => this.api.patchZoneSettings(accountId, heaterId, zone.zone_number, update));

    await this.setCapabilityValueSafe(
      'target_temperature',
      updatedZone?.temperature_heater_setpoint ?? value,
    );
  }
}
