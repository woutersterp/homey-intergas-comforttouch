# Homey Intergas Comfort Touch App Plan

## Goal
Recreate Intergas Comfort Touch as a Homey app: cloud-connected heater device with thermostat heating control and statistics capabilities.

## Context
- API docs in `api/` (OpenAPI + AUTH/USAGE). Base URL static: `https://app-api.orion.intergas.nl/v1`.
- Auth: email/password -> JWT; refresh via `/v1/accounts/refresh`. Bearer token stored in device/app store.
- Relevant data:
  - Zone: `temperature_room` (current), `temperature_heater_setpoint` (target). Update via `patchZoneSettings`.
  - Statistics: `ch_water_pressure`/`heating_water_pressure`, `ch_gas_consumption`, `hot_water_gas_consumption`/`dhw_gas_consumption`.

## Implementation Steps
1. Scaffold Homey app (`homey app create` style): `app.mts`, app manifest, one driver `intergas-heater`, device class `thermostat`.
2. Add Intergas API client module (fetch/axios) wrapping endpoints: authenticate, refresh, getAccount, getHeaters, getZones, patchZoneSettings, getHeaterStatistics.
3. Pairing flow: email/password login in pairing view; fetch heaters; create one device per heater (store accountId, heaterId, zoneNumber, tokens).
4. Device init: load tokens, refresh if expired/near expiry, fetch zones+stats, set capabilities.
5. Capabilities:
   - `measure_temperature` (current room temp)
   - `target_temperature` (setpoint, min 5 max 35)
   - custom capabilities: `measure_water_pressure`, `meter_gas_ch`, `meter_gas_dhw` (or use `measure_gas` variants)
6. Capability listeners: `target_temperature` -> patchZoneSettings.
7. Polling: onInit interval (e.g. 60s) refresh tokens, fetch zone + statistics, update capabilities; handle 401 -> refresh -> retry.
8. Settings page for credentials/re-pair; repair flow.
9. Locales nl/en; icons/assets.
10. Validation: `homey app validate`, `tsc`, lint.

## Risks
- Actual API host and token expiry semantics not in docs; implement refresh on 401 and periodic refresh.
- Capability naming must match Homey system/custom capability definitions.
- Cloud vs local platform considerations.

## Open Questions
- Token TTL unknown; implement refresh on 401 and periodic refresh.
- Whether one device per heater or per zone; plan assumes heater with primary zone (zone 1) and expose zone-level temps.