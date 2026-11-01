import { API_BASE_URL, EmailAndPassword, Heater, HeaterStatistics, Token, Zone, ZoneUpdate } from "./types.js";

export class IntergasApi {
  private token?: string;

  setToken(token: string) {
    this.token = token;
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string> || {}),
    };

    if (this.token) {
      headers["Authorization"] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
    });

    if (response.status === 401) {
      throw new Error("UNAUTHORIZED");
    }

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(`API error ${response.status}: ${text}`);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return response.json() as Promise<T>;
  }

  async authenticate(emailAndPassword: EmailAndPassword): Promise<Token> {
    return this.request<Token>("/accounts/authenticate", {
      method: "POST",
      body: JSON.stringify(emailAndPassword),
    });
  }

  async refresh(token: Token): Promise<Token> {
    return this.request<Token>("/accounts/refresh", {
      method: "POST",
      body: JSON.stringify(token),
    });
  }

  async getAccount(accountId: string): Promise<any> {
    return this.request<any>(`/accounts/${accountId}`, {
      method: "GET",
    });
  }

  async getHeaters(accountId: string): Promise<Heater[]> {
    return this.request<Heater[]>(`/accounts/${accountId}/heaters`, {
      method: "GET",
    });
  }

  async getHeater(accountId: string, heaterId: string): Promise<Heater> {
    return this.request<Heater>(`/accounts/${accountId}/heaters/${heaterId}`, {
      method: "GET",
    });
  }

  async getZones(accountId: string, heaterId: string): Promise<Zone[]> {
    return this.request<Zone[]>(`/accounts/${accountId}/heaters/${heaterId}/zones`, {
      method: "GET",
    });
  }

  async getZone(accountId: string, heaterId: string, zoneNumber: number): Promise<Zone> {
    return this.request<Zone>(`/accounts/${accountId}/heaters/${heaterId}/zones/${zoneNumber}`, {
      method: "GET",
    });
  }

  async patchZoneSettings(accountId: string, heaterId: string, zoneNumber: number, zoneUpdate: ZoneUpdate): Promise<Zone> {
    return this.request<Zone>(`/accounts/${accountId}/heaters/${heaterId}/zones/${zoneNumber}`, {
      method: "PATCH",
      body: JSON.stringify(zoneUpdate),
    });
  }

  async getHeaterStatistics(accountId: string, heaterId: string): Promise<HeaterStatistics> {
    return this.request<HeaterStatistics>(`/accounts/${accountId}/heaters/${heaterId}/statistics`, {
      method: "GET",
    });
  }
}

export const api = new IntergasApi();
