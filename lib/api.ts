import axios, { AxiosInstance } from 'axios';

import UnauthorizedError from './errors.js';
import {
  API_BASE_URL,
  EmailAndPassword,
  Heater,
  HeaterStatistics,
  Token,
  Zone,
  ZoneUpdate,
} from './types.js';

export default class IntergasApi {
  private readonly client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 15000,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  setToken(token: string) {
    this.client.defaults.headers.common.Authorization = `Bearer ${token}`;
  }

  private async request<T>(method: string, url: string, body?: unknown): Promise<T> {
    try {
      const response = await this.client.request<T>({
        method,
        url,
        data: body,
      });
      return response.data;
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        if (err.response?.status === 401) {
          throw new UnauthorizedError();
        }
        if (err.response) {
          throw new Error(
            `Intergas API error ${err.response.status}: ${JSON.stringify(err.response.data)}`,
          );
        }
        throw new Error(`Intergas API request failed: ${err.message}`);
      }
      throw err;
    }
  }

  async authenticate(body: EmailAndPassword): Promise<Token> {
    return this.request<Token>('post', '/accounts/authenticate', body);
  }

  async refresh(body: Token): Promise<Token> {
    return this.request<Token>('post', '/accounts/refresh', body);
  }

  async getAccount(accountId: string): Promise<unknown> {
    return this.request<unknown>('get', `/accounts/${accountId}`);
  }

  async getHeaters(accountId: string): Promise<Heater[]> {
    return this.request<Heater[]>('get', `/accounts/${accountId}/heaters`);
  }

  async getHeater(accountId: string, heaterId: string): Promise<Heater> {
    return this.request<Heater>('get', `/accounts/${accountId}/heaters/${heaterId}`);
  }

  async getZones(accountId: string, heaterId: string): Promise<Zone[]> {
    return this.request<Zone[]>('get', `/accounts/${accountId}/heaters/${heaterId}/zones`);
  }

  async getZone(accountId: string, heaterId: string, zoneNumber: number): Promise<Zone> {
    return this.request<Zone>(
      'get',
      `/accounts/${accountId}/heaters/${heaterId}/zones/${zoneNumber}`,
    );
  }

  async patchZoneSettings(
    accountId: string,
    heaterId: string,
    zoneNumber: number,
    body: ZoneUpdate,
  ): Promise<Zone> {
    return this.request<Zone>(
      'patch',
      `/accounts/${accountId}/heaters/${heaterId}/zones/${zoneNumber}`,
      body,
    );
  }

  async getHeaterStatistics(accountId: string, heaterId: string): Promise<HeaterStatistics> {
    return this.request<HeaterStatistics>(
      'get',
      `/accounts/${accountId}/heaters/${heaterId}/statistics`,
    );
  }
}
