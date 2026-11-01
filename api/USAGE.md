# API Usage Guide

This document describes how to use the Intergas API client, extracted from decompiled Dart bytecode in `asm/openapi/src/`.

## Prerequisites

The API client is built using the Dio HTTP client library. All request bodies and responses use JSON format (`application/json`). Models are serialized/deserialized using `built_value` serializers registered in `asm/openapi/src/serializers.dart`.

## Initialization

### Creating an Openapi Client

```dart
import 'package:openapi/openapi.dart';

// Create with a default Dio instance
final openapi = Openapi(Dio());

// Or with a pre-configured Dio instance
final dio = Dio(BaseOptions(
  baseUrl: 'https://api.example.com',  // Replace with actual API URL
  connectTimeout: 5000,
  receiveTimeout: 3000,
));
final openapi = Openapi(dio);

// Or with custom interceptors (including BearerAuthInterceptor)
final interceptors = [BearerAuthInterceptor()];
final openapi = Openapi(dio, interceptors: interceptors);
```

The `Openapi` constructor (from `asm/openapi/src/api/api.dart`):
1. Stores the serializers from `standardSerializers` into the Dio instance.
2. If no `dio` is provided, creates a default `BaseOptions` with connect/receive timeouts and calls `createDio()`.
3. Adds any provided interceptors to `dio.interceptors`.

## Authentication

### 1. Obtain a JWT Token

#### Register a New Account
```dart
final authApi = openapi.getAccountsApi();

final createAccount = CreateAccount(
  // ... account creation fields
);
final response = await authApi.registerAccount(createAccount);
final token = response.data;  // Token object containing JWT
```

#### Authenticate with Email and Password
```dart
final authApi = openapi.getAccountsApi();

final emailAndPassword = EmailAndPassword(
  email: 'user@example.com',
  password: 'your-password',
);
final response = await authApi.authenticateAccount(emailAndPassword);
final token = response.data;  // Token object containing JWT
```

#### Refresh an Existing Token
```dart
final authApi = openapi.getAccountsApi();

final refreshToken = Token(
  // ... token refresh fields
);
final response = await authApi.refreshAuthenticationToken(refreshToken);
final newToken = response.data;
```

### 2. Set the Bearer Token

After obtaining a JWT token, register it with the API client:

```dart
openapi.setBearerAuth('HTTPBearer', jwtTokenString);
```

This method (defined in `api.dart`):
1. Searches `dio.interceptors` for a `BearerAuthInterceptor`.
2. If found, stores the token in the interceptor's auth map under key `"HTTPBearer"`.
3. If not found, creates a `BearerAuthInterceptor` and adds it to the interceptors list.

The `BearerAuthInterceptor` (from `asm/openapi/src/auth/bearer_auth.dart`) then automatically adds the `Authorization: Bearer <token>` header to all requests that have `secure: true` in their Options.

### 3. Check User Platform (Optional)

Before authenticating, you may check platform compatibility:

```dart
final authApi = openapi.getAccountsApi();
final platformCheck = PlatformCheck(
  // ... platform info fields
);
final response = await authApi.checkUserPlatform(platformCheck);
```

## API Endpoints Reference

All authenticated endpoints require a valid JWT Bearer token. The two EULA endpoints (`getEulaByCountry`, `getEulaByCountryLanguage`) do not require authentication.

### Accounts API (`openapi.getAccountsApi()`)

| Method | Endpoint | Operation ID | Requires Auth |
|--------|----------|-------------|---------------|
| POST | `/v1/accounts/refresh` | `refreshAuthenticationToken` | Yes |
| POST | `/v1/accounts/platform_check` | `checkUserPlatform` | Yes |
| POST | `/v1/accounts` | `registerAccount` | No |
| GET | `/v1/accounts/{account_id}` | `getAccount` | Yes |
| POST | `/v1/accounts/authenticate` | `authenticateAccount` | No |
| DELETE | `/v1/accounts/{account_id}` | `deleteAccount` | Yes |
| PUT | `/v1/accounts/{account_id}/password_change` | `passwordChangeAccount` | Yes |
| PUT | `/v1/accounts/{account_id}` | `updateAccount` | Yes |

### Account Settings API (`openapi.getAccountSettingsApi()`)

| Method | Endpoint | Operation ID | Requires Auth |
|--------|----------|-------------|---------------|
| PATCH | `/v1/accounts/{account_id}/settings` | `patchAccountSettings` | Yes |
| GET | `/v1/accounts/{account_id}/settings` | `getAccountSettings` | Yes |

### Beta Features API (`openapi.getBetaFeaturesApi()`)

| Method | Endpoint | Operation ID | Requires Auth |
|--------|----------|-------------|---------------|
| GET | `/v1/accounts/{account_id}/beta-features` | `getBetaFeatures` | Yes |

### DHW Buffer Tank API (`openapi.getDhwBufferTankApi()`)

| Method | Endpoint | Operation ID | Requires Auth |
|--------|----------|-------------|---------------|
| GET | `/v1/accounts/{account_id}/heaters/{heater_id}/dhw-buffer-tank` | `getDHWTankStatus` | Yes |

### EULA API (`openapi.getEulaApi()`)

| Method | Endpoint | Operation ID | Requires Auth |
|--------|----------|-------------|---------------|
| GET | `/v1/accounts/{account_id}/eula` | `getUserAcceptedEula` | Yes |
| GET | `/v1/eula/{country_code}` | `getEulaByCountry` | No |
| GET | `/v1/eula/{country_code}/{language_code}` | `getEulaByCountryLanguage` | No |
| PUT | `/v1/accounts/{account_id}/eula/{eula_id}/accept` | `acceptEula` | Yes |

### Gateway API (`openapi.getGatewayApi()`)

| Method | Endpoint | Operation ID | Requires Auth |
|--------|----------|-------------|---------------|
| GET | `/v1/accounts/{account_id}/gateways/{gateway_id}` | `getGateway` | Yes |
| GET | `/v1/accounts/{account_id}/gateways/{gateway_id}/pairing-status` | `getPairingActionStatus` | Yes |
| DELETE | `/v1/accounts/{account_id}/gateways/{gateway_id}/pairing-status` | `cancelPairingAction` | Yes |
| PATCH | `/v1/accounts/{account_id}/gateways/{gateway_id}/pairing-status` | `patchPairingActionSerialNumber` | Yes |

### Heater API (`openapi.getHeaterApi()`)

| Method | Endpoint | Operation ID | Requires Auth |
|--------|----------|-------------|---------------|
| POST | `/v1/accounts/{account_id}/heaters/pair-using-wifi-qr-code` | `pairHeaterUsingWifiQRCode` | Yes |
| GET | `/v1/accounts/{account_id}/heaters/{heater_id}` | `getHeater` | Yes |
| GET | `/v1/accounts/{account_id}/heaters` | `getHeaters` | Yes |
| PATCH | `/v1/accounts/{account_id}/heaters/{heater_id}` | `patchHeaterSettings` | Yes |
| DELETE | `/v1/accounts/{account_id}/heaters/{heater_id}` | `deleteHeater` | Yes |
| PATCH | `/v1/accounts/{account_id}/heaters/{heater_id}/parameters` | `patchHeaterParameters` | Yes |
| GET | `/v1/accounts/{account_id}/heaters/{heater_id}/parameters` | `getHeaterParameters` | Yes |
| POST | `/v1/accounts/{account_id}/heaters/pair-using-gateway-data-matrix` | `pairHeaterUsingGatewayDataMatrix` | Yes |
| POST | `/v1/accounts/{account_id}/heaters/pair-using-mqtt-gateway-barcode` | `pairHeaterUsingMQTTGatewayBarcode` | Yes |

### Heater Capabilities API (`openapi.getHeaterCapabilitiesApi()`)

| Method | Endpoint | Operation ID | Requires Auth |
|--------|----------|-------------|---------------|
| GET | `/v1/accounts/{account_id}/heaters/{heater_id}/capabilities` | `getHeaterCapabilities` | Yes |

### Heater Statistics API (`openapi.getHeaterStatisticsApi()`)

| Method | Endpoint | Operation ID | Requires Auth |
|--------|----------|-------------|---------------|
| GET | `/v1/accounts/{account_id}/heaters/{heater_id}/statistics` | `getHeaterStatistics` | Yes |

### Installer Association API (`openapi.getInstallerAssociationApi()`)

| Method | Endpoint | Operation ID | Requires Auth |
|--------|----------|-------------|---------------|
| GET | `/v1/accounts/{account_id}/heaters/{heater_id}/installer` | `getInstallerAssociation` | Yes |
| DELETE | `/v1/accounts/{account_id}/heaters/{heater_id}/installer` | `revokeInstallerAssociation` | Yes |
| POST | `/v1/accounts/{account_id}/heaters/{heater_id}/installer` | `requestInstallerAssociation` | Yes |

### Presets API (`openapi.getPresetsApi()`)

| Method | Endpoint | Operation ID | Requires Auth |
|--------|----------|-------------|---------------|
| GET | `/v1/accounts/{account_id}/heaters/{heater_id}/presets` | `getAllTemperaturePresets` | Yes |
| POST | `/v1/accounts/{account_id}/heaters/{heater_id}/presets` | `createTemperaturePreset` | Yes |
| PATCH | `/v1/accounts/{account_id}/heaters/{heater_id}/presets/{preset_id}` | `updateTemperaturePreset` | Yes |
| DELETE | `/v1/accounts/{account_id}/heaters/{heater_id}/presets/{preset_id}` | `deleteTemperaturePreset` | Yes |

### Weather API (`openapi.getWeatherApi()`)

| Method | Endpoint | Operation ID | Requires Auth |
|--------|----------|-------------|---------------|
| GET | `/v1/accounts/{account_id}/heaters/{heater_id}/weather` | `getWeather` | Yes |

### Week Scheme API (`openapi.getWeekschemeApi()`)

| Method | Endpoint | Operation ID | Requires Auth |
|--------|----------|-------------|---------------|
| GET | `/v1/accounts/{account_id}/heaters/{heater_id}/zones/{zone_number}/scheme/week` | `getWeekScheme` | Yes |
| PATCH | `/v1/accounts/{account_id}/heaters/{heater_id}/zones/{zone_number}/scheme/week` | `patchWeekSchemeSettings` | Yes |

### Zones API (`openapi.getZonesApi()`)

| Method | Endpoint | Operation ID | Requires Auth |
|--------|----------|-------------|---------------|
| PATCH | `/v1/accounts/{account_id}/heaters/{heater_id}/zones/{zone_number}` | `patchZoneSettings` | Yes |
| GET | `/v1/accounts/{account_id}/heaters/{heater_id}/zones/{zone_number}` | `getZone` | Yes |
| GET | `/v1/accounts/{account_id}/heaters/{heater_id}/zones` | `getZones` | Yes |

## Usage Examples

### Fetching Heater Data

```dart
// After setting Bearer auth token
final heaterApi = openapi.getHeaterApi();
final response = await heaterApi.getHeater(accountId, heaterId);
final heater = response.data;
```

### Updating Heater Settings

```dart
final heaterApi = openapi.getHeaterApi();
final settings = HeaterSettings(
  // ... configuration fields
);
final response = await heaterApi.patchHeaterSettings(accountId, heaterId, settings);
```

### Managing Presets

```dart
final presetsApi = openapi.getPresetsApi();

// List all presets
final listResponse = await presetsApi.getAllTemperaturePresets(accountId, heaterId);

// Create a new preset
final newPreset = PresetCreate(/* ... */);
final createResponse = await presetsApi.createTemperaturePreset(accountId, heaterId, newPreset);

// Update a preset
final update = PresetEdit(/* ... */);
await presetsApi.updateTemperaturePreset(accountId, heaterId, presetId, update);

// Delete a preset
await presetsApi.deleteTemperaturePreset(accountId, heaterId, presetId);
```

### Getting Zone Information

```dart
final zonesApi = openapi.getZonesApi();

// Get all zones
final zones = await zonesApi.getZones(accountId, heaterId);

// Get specific zone
final zone = await zonesApi.getZone(accountId, heaterId, zoneNumber);

// Update zone settings
final update = ZoneUpdate(/* ... */);
await zonesApi.patchZoneSettings(accountId, heaterId, zoneNumber, update);
```

### Working with Week Schedule

```dart
final weekschemeApi = openapi.getWeekschemeApi();

// Get current week scheme
final scheme = await weekschemeApi.getWeekScheme(accountId, heaterId, zoneNumber);

// Update week scheme settings
final settings = WeekSchemeSettings(/* ... */);
await weekschemeApi.patchWeekSchemeSettings(accountId, heaterId, zoneNumber, settings);
```

### Fetching EULA (No Auth Required)

```dart
final eulaApi = openapi.getEulaApi();

// Get EULA by country code
final eula = await eulaApi.getEulaByCountry('NL');

// Get EULA by country and language
final eulaEn = await eulaApi.getEulaByCountryLanguage('NL', 'en');
```

## API Accessors

The `Openapi` class provides the following accessor methods to obtain API instances:

| Accessor Method | API Class |
|----------------|-----------|
| `openapi.getAccountsApi()` | `AccountsApi` |
| `openapi.getAccountSettingsApi()` | `AccountSettingsApi` |
| `openapi.getBetaFeaturesApi()` | `BetaFeaturesApi` |
| `openapi.getDhwBufferTankApi()` | `DhwBufferTankApi` |
| `openapi.getEulaApi()` | `EulaApi` |
| `openapi.getGatewayApi()` | `GatewayApi` |
| `openapi.getHeaterApi()` | `HeaterApi` |
| `openapi.getHeaterCapabilitiesApi()` | `HeaterCapabilitiesApi` |
| `openapi.getHeaterStatisticsApi()` | `HeaterStatisticsApi` |
| `openapi.getInstallerAssociationApi()` | `InstallerAssociationApi` |
| `openapi.getPresetsApi()` | `PresetsApi` |
| `openapi.getWeatherApi()` | `WeatherApi` |
| `openapi.getWeekschemeApi()` | `WeekschemeApi` |
| `openapi.getZonesApi()` | `ZonesApi` |

## Error Handling

All API methods return `Future<Response<T>>` where `T` is the response body type. Dio exceptions are thrown as `DioException` and contain:
- `error` — The original error
- `response` — The HTTP response (if available)
- `stackTrace` — Stack trace
- `type` — The `DioExceptionType` (e.g., `connectionError`, `badResponse`, `unauthorized`)

```dart
try {
  final response = await heaterApi.getHeater(accountId, heaterId);
} on DioException catch (e) {
  if (e.type == DioExceptionType.badResponse) {
    print('HTTP ${e.response?.statusCode}: ${e.response?.data}');
  } else if (e.type == DioExceptionType.unauthorized) {
    print('Authentication failed. Please refresh your token.');
  }
}
```

## Model Reference

Key model files (inferred from `asm/openapi/src/model/`):

| Model | File | Used By |
|-------|------|---------|
| `Token` | `token.dart` | Authentication responses |
| `CreateAccount` | `create_account.dart` | `registerAccount` |
| `EmailAndPassword` | `email_and_password.dart` | `authenticateAccount` |
| `PasswordChange` | `password_change.dart` | `passwordChangeAccount` |
| `PlatformCheck` | `platform_check.dart` | `checkUserPlatform` |
| `Account` | `account.dart` | `getAccount`, `updateAccount` |
| `AccountSettings` | `account_settings.dart` | `getAccountSettings` |
| `AccountSettingsUpdate` | `account_settings_update.dart` | `patchAccountSettings` |
| `Heater` | `heater.dart` | `getHeater`, `getHeaters` |
| `HeaterSettings` | `heater_settings.dart` | `patchHeaterSettings` |
| `HeaterSerialUpdate` | `heater_serial_update.dart` | `patchPairingActionSerialNumber` |
| `HeaterStatistics` | `heater_statistics.dart` | `getHeaterStatistics` |
| `APIParameter` | `api_parameter.dart` | `getHeaterParameters` (response) |
| `APIParameterUpdate` | `api_parameter_update.dart` | `patchHeaterParameters` |
| `WifiPairingData` | `wifi_pairing_data.dart` | `pairHeaterUsingWifiQRCode` |
| `WifiPairResult` | `wifi_pair_result.dart` | `pairHeaterUsingWifiQRCode` (response) |
| `GatewayDataMatrix` | `gateway_data_matrix.dart` | `pairHeaterUsingGatewayDataMatrix` |
| `GatewayQRBarcode` | `gateway_qr_barcode.dart` | `pairHeaterUsingMQTTGatewayBarcode` |
| `PairAddResult` | `pair_add_result.dart` | Pairing responses |
| `Gateway` | `gateway.dart` | `getGateway` |
| `GatewayPairingStatus` | `gateway_pairing_status.dart` | `getPairingActionStatus` |
| `Zone` | `zone.dart` | `getZone`, `getZones` |
| `ZoneUpdate` | `zone_update.dart` | `patchZoneSettings` |
| `WeekScheme` | `week_scheme.dart` | `getWeekScheme` |
| `WeekSchemeSettings` | `week_scheme_settings.dart` | `patchWeekSchemeSettings` |
| `Preset` | `preset.dart` | Preset CRUD |
| `PresetCreate` | `preset_create.dart` | `createTemperaturePreset` |
| `PresetEdit` | `preset_edit.dart` | `updateTemperaturePreset` |
| `Eula` | `eula.dart` | EULA endpoints |
| `Weather` | `weather.dart` | `getWeather` |
| `HeaterStatistics` | `heater_statistics.dart` | `getHeaterStatistics` |
| `InstallerDeviceAssociation` | `installer_device_association.dart` | `getInstallerAssociation`, `requestInstallerAssociation` |
