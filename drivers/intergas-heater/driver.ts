import Homey from 'homey';

import IntergasApi from '../../lib/api.js';
import { Heater, Token } from '../../lib/types.js';

export default class IntergasHeaterDriver extends Homey.Driver {
  async onInit() {
    this.log('IntergasHeaterDriver has been initialized');
  }

  async onPair(session: Homey.Driver.PairSession) {
    const api = new IntergasApi();
    let token: Token | null = null;
    let accountId = '';
    let email = '';
    let password = '';

    session.setHandler('login', async (data: { username: string; password: string }) => {
      email = data.username;
      password = data.password;

      try {
        token = await api.authenticate({ email, password });
        accountId = token.account_id;
        api.setToken(token.jwt);
        return true;
      } catch (err) {
        this.error('Pairing login failed', err);
        throw new Error('Login failed, please check your e-mail address and password');
      }
    });

    session.setHandler('list_devices', async () => {
      if (!token) throw new Error('Not logged in');

      const heaters = await api.getHeaters(accountId);
      const devices = [];

      for (const heater of heaters) {
        const zoneNumber = await this.getPrimaryZoneNumber(api, accountId, heater);
        devices.push({
          name: heater.name,
          data: { id: heater.heater_id },
          settings: {
            email,
            account_id: accountId,
            heater_id: heater.heater_id,
            zoneNumber: zoneNumber,
          },
          store: {
            jwt: token.jwt,
            account_id: accountId,
            heater_id: heater.heater_id,
            zoneNumber: zoneNumber,
            email,
            password,
          },
        });
      }

      return devices;
    });
  }

  private async getPrimaryZoneNumber(
    api: IntergasApi,
    accountId: string,
    heater: Heater,
  ): Promise<number> {
    try {
      const zones = await api.getZones(accountId, heater.heater_id);
      return zones.length > 0 ? zones[0].zone_number : 1;
    } catch (err) {
      this.error(`Failed to fetch zones for heater ${heater.heater_id}`, err);
      return 1;
    }
  }
}
