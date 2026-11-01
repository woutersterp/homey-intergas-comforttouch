import Homey from 'homey';
import { api } from '../../lib/api.js';
import { ZoneUpdate } from '../../lib/types.js';

export default class IntergasHeaterDevice extends Homey.Device {
  private pollInterval?: NodeJS.Timeout;

  async onInit() {
    this.log('IntergasHeaterDevice has been initialized');

    // Ensure capabilities exist
    const requiredCapabilities = [
      'target_temperature',
      'measure_temperature',
      'measure_water_pressure',
      'meter_gas_ch',
      'meter_gas_dhw',
    ];

    for (const cap of requiredCapabilities) {
      if (!this.hasCapability(cap)) {
        try {
          await this.addCapability(cap);
        } catch (err) {
          this.error(`Failed to add capability ${cap}`, err);
        }
      }
    }

    // Set capability listeners
    if (this.hasCapability('target_temperature')) {
      this.registerCapabilityListener('target_temperature', async (value) => {
        await this.setTargetTemperature(value);
      });
    }

    await this.refreshData();
    this.pollInterval = setInterval(() => {
      this.refreshData().catch((err) => this.error(err));
    }, 60000);
  }

  async onUninit() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
    }
  }

  async onDeleted() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
    }
  }

  async onSettings({ oldSettings, newSettings, changedKeys }: any) {
    // Allow re-saving credentials - they'll be used on next refresh
    this.log('Settings changed');
  }

  private async getCredentials() {
    const store = this.getStore();
    const settings = this.getSettings();
    let jwt = store.jwt;
    const accountId = store.account_id || settings.account_id;
    const heaterId = store.heater_id || this.getData().id;
    const zoneNumber = store.zone_number || settings.zone_number || 1;

    if (!jwt || !accountId) {
      throw new Error('Missing credentials');
    }

    api.setToken(jwt);
    return { jwt, accountId, heaterId, zoneNumber };
  }

  private async ensureValidToken(creds: any) {
    try {
      // Try to refresh to ensure token is valid
      const token = await api.refresh({ jwt: creds.jwt, account_id: creds.accountId });
      api.setToken(token.jwt);
      this.setStoreValue('jwt', token.jwt);
      return { ...creds, jwt: token.jwt };
    } catch (err: any) {
      if (err.message === 'UNAUTHORIZED') {
        throw err;
      }
      // If refresh fails for other reasons, try with current token
      api.setToken(creds.jwt);
      return creds;
    }
  }

  private async refreshData() {
    try {
      let creds = await this.getCredentials();
      try {
        creds = await this.ensureValidToken(creds);
      } catch (err: any) {
        if (err.message === 'UNAUTHORIZED') {
          // Try to re-authenticate using stored email/password if available
          const settings = this.getSettings();
          if (settings.email) {
            // We don't store password, but try with existing token flow
            throw err;
          }
          throw err;
        }
        throw err;
      }

      const [zones, stats] = await Promise.all([
        api.getZones(creds.accountId, creds.heaterId),
        api.getHeaterStatistics(creds.accountId, creds.heaterId).catch((e) => {
          this.error('Failed to get statistics', e);
          return null;
        }),
      ]);

      const zone = zones.find((z: any) => z.zone_number === Number(creds.zoneNumber)) || zones[0];
      if (zone) {
        if (this.hasCapability('measure_temperature')) {
          await this.setCapabilityValue('measure_temperature', zone.temperature_room).catch((e) =>
            this.error(e)
          );
        }
        if (this.hasCapability('target_temperature')) {
          await this.setCapabilityValue('target_temperature', zone.temperature_heater_setpoint).catch(
            (e) => this.error(e)
          );
        }
      }

      if (stats) {
        if (this.hasCapability('measure_water_pressure')) {
          const pressure = stats.heating_water_pressure ?? stats.ch_water_pressure;
          if (pressure !== undefined && pressure !== null) {
            await this.setCapabilityValue('measure_water_pressure', pressure).catch((e) =>
              this.error(e)
            );
          }
        }
        if (this.hasCapability('meter_gas_ch')) {
          if (stats.ch_gas_consumption !== undefined && stats.ch_gas_consumption !== null) {
            await this.setCapabilityValue('meter_gas_ch', stats.ch_gas_consumption).catch((e) =>
              this.error(e)
            );
          }
        }
        if (this.hasCapability('meter_gas_dhw')) {
          const dhwGas = stats.dhw_gas_consumption ?? stats.hot_water_gas_consumption;
          if (dhwGas !== undefined && dhwGas !== null) {
            await this.setCapabilityValue('meter_gas_dhw', dhwGas).catch((e) => this.error(e));
          }
        }
      }
    } catch (err: any) {
      this.error('Failed to refresh data', err);
      throw err;
    }
  }

  private async setTargetTemperature(value: number) {
    try {
      let creds = await this.getCredentials();
      try {
        creds = await this.ensureValidToken(creds);
      } catch (err) {
        throw err;
      }

      const zones = await api.getZones(creds.accountId, creds.heaterId);
      const zone = zones.find((z: any) => z.zone_number === Number(creds.zoneNumber)) || zones[0];
      if (!zone) throw new Error('Zone not found');

      const update: ZoneUpdate = {
        name: zone.name,
        temperature_heater_setpoint: value,
      };

      await api.patchZoneSettings(creds.accountId, creds.heaterId, zone.zone_number, update);
      await this.refreshData();
    } catch (err: any) {
      this.error('Failed to set target temperature', err);
      throw err;
    }
  }
}
