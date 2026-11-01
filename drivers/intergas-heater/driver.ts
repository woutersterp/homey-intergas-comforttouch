import Homey from 'homey';
import { api } from '../../lib/api.js';
import { Zone, ZoneUpdate } from '../../lib/types.js';

export default class IntergasHeaterDriver extends Homey.Driver {
  async onInit() {
    this.log('IntergasHeaterDriver has been initialized');
  }

  async onPair(session: any) {
    let email: string = '';
    let password: string = '';
    let accountId: string = '';
    let tokens: any = null;

    session.setHandler('login', async (data: any) => {
      email = data.username;
      password = data.password;

      try {
        const token = await api.authenticate({ email, password });
        api.setToken(token.jwt);
        tokens = token;
        accountId = token.account_id;

        const heaters = await api.getHeaters(accountId);
        if (!heaters || heaters.length === 0) {
          throw new Error('No heaters found for this account');
        }

        const devices = [];
        for (const heater of heaters) {
          try {
            const zones = await api.getZones(accountId, heater.heater_id);
            const primaryZone = zones && zones.length > 0 ? zones[0] : null;
            devices.push({
              name: heater.name || 'Intergas Heater',
              data: {
                id: heater.heater_id,
              },
              settings: {
                email,
                account_id: accountId,
                heater_id: heater.heater_id,
                zone_number: primaryZone ? primaryZone.zone_number : 1,
              },
              store: {
                jwt: token.jwt,
                account_id: accountId,
                heater_id: heater.heater_id,
                zone_number: primaryZone ? primaryZone.zone_number : 1,
              },
            });
          } catch (err) {
            this.error(err);
            devices.push({
              name: heater.name || 'Intergas Heater',
              data: {
                id: heater.heater_id,
              },
              settings: {
                email,
                account_id: accountId,
                heater_id: heater.heater_id,
                zone_number: 1,
              },
              store: {
                jwt: token.jwt,
                account_id: accountId,
                heater_id: heater.heater_id,
                zone_number: 1,
              },
            });
          }
        }

        return devices;
      } catch (err: any) {
        this.error(err);
        throw new Error(err.message || 'Login failed');
      }
    });

    session.setHandler('list_devices', async () => {
      const heaters = await api.getHeaters(accountId);
      const devices = [];
      for (const heater of heaters) {
        try {
          const zones = await api.getZones(accountId, heater.heater_id);
          const primaryZone = zones && zones.length > 0 ? zones[0] : null;
          devices.push({
            name: heater.name || 'Intergas Heater',
            data: {
              id: heater.heater_id,
            },
            settings: {
              email,
              account_id: accountId,
              heater_id: heater.heater_id,
              zone_number: primaryZone ? primaryZone.zone_number : 1,
            },
            store: {
              jwt: tokens?.jwt,
              account_id: accountId,
              heater_id: heater.heater_id,
              zone_number: primaryZone ? primaryZone.zone_number : 1,
            },
          });
        } catch (err) {
          this.error(err);
        }
      }
      return devices;
    });
  }
}
