export const API_BASE_URL = "https://app-api.orion.intergas.nl/v1";

export interface Token {
  jwt: string;
  account_id: string;
  role?: string;
}

export interface EmailAndPassword {
  email: string;
  password: string;
}

export interface Zone {
  name: string;
  temperature_heater_setpoint: number;
  zone_number: number;
  temperature_room: number;
  thermostat_type: string;
}

export interface ZoneUpdate {
  name: string;
  temperature_heater_setpoint: number;
}

export interface Heater {
  name: string;
  heater_id: string;
  linked_gateway_id?: string | null;
  last_seen?: string | null;
  state: any;
  hardware: any;
  number_of_zones: number;
  radio_frequency_performance: any;
  connection_type: string;
}

export interface HeaterStatistics {
  heater_id: string;
  heating_water_pressure?: number;
  heating_hours?: number;
  hot_water_hours?: number;
  heating_gas_consumption?: number;
  hot_water_gas_consumption?: number;
  ch_water_pressure?: number;
  device_poweron_hours?: number;
  ch_gas_consumption?: number;
  ch_gas_operational_hours?: number;
  ch_electricity_consumption?: number;
  ch_electric_operational_hours?: number;
  ch_thermal_energy?: number;
  cooling_electricity_consumption?: number;
  cooling_electric_operational_hours?: number;
  cooling_thermal_energy?: number;
  cooling_electric_energy_consumption_yesterday?: number;
  cooling_thermal_energy_yesterday?: number;
  cooling_cop_yesterday?: number;
  dhw_gas_consumption?: number;
  dhw_gas_operational_hours?: number;
  dhw_electricity_consumption?: number;
  dhw_electric_operational_hours?: number;
  dhw_thermal_energy?: number;
  ch_electric_energy_consumption_yesterday?: number;
  ch_thermal_energy_yesterday?: number;
  ch_cop_yesterday?: number;
  dhw_electric_energy_consumption_yesterday?: number;
  dhw_thermal_energy_yesterday?: number;
  dhw_cop_yesterday?: number;
}
