# Authentication Guide

This document describes the authorization mechanism used by the Intergas API, as extracted from the decompiled Dart bytecode in `asm/openapi/src/`.

## Overview

All API endpoints use **Bearer token (JWT) authentication**. The authentication is implemented through a Dio `Interceptor` chain that automatically injects the JWT token into HTTP request headers.

## Auth Components

### AuthInterceptor (abstract base class)

**Source:** `asm/openapi/src/auth/auth.dart`

`AuthInterceptor` extends Dio's `Interceptor` class and provides the `getAuthInfo()` method. This method:

1. Checks the request `Options.extra` map for the key `"secure"`.
2. If `"secure"` is present and truthy, retrieves the authentication settings from `Options.extra["security"]`.
3. The auth settings are stored in `Options.extra["security"]` as a `List<Map<String, String>>`.
4. If the security settings contain an entry with `type: "http"`, `scheme: "bearer"`, `name: "HTTPBearer"`, it matches the Bearer auth.
5. If `"secure"` is not present, returns an empty list (no auth applied).

The options for secure endpoints are constructed as:
```dart
Options(
  method: "POST",  // or GET, PUT, DELETE, PATCH
  extra: {"secure": true},
  headers: {"Authorization": "Bearer <token>"},
  responseType: ResponseType.json,
  contentType: "application/json",
)
```

### BearerAuthInterceptor

**Source:** `asm/openapi/src/auth/bearer_auth.dart`

`BearerAuthInterceptor` extends `AuthInterceptor` and overrides the `onRequest()` method. This interceptor:

1. Calls `getAuthInfo()` (inherited from `AuthInterceptor`) to retrieve the list of applicable auth schemes.
2. Iterates through the auth schemes, checking each one's `type` field (expected `"http"`) and `scheme` field (expected `"bearer"`).
3. If a matching scheme is found, retrieves the `name` field (expected `"HTTPBearer"`).
4. Constructs the authorization header value as `"Bearer " + token` using string interpolation.
5. Sets the `Authorization` header on the request: `options.headers["Authorization"] = "Bearer <token>"`.
6. Calls `handler.next(options)` to continue processing the request.

The token value is retrieved from the auth info map using the key `"HTTPBearer"`.

### Openapi.setBearerAuth()

**Source:** `asm/openapi/src/api/api.dart`

The `Openapi` class provides the `setBearerAuth(String name, String? token)` method:

1. Searches the Dio instance's `interceptors` list for a `BearerAuthInterceptor` using `firstWhere()`.
2. The matching check compares interceptor class IDs to `4156` (the class ID for `BearerAuthInterceptor`).
3. Once found, stores the token in the interceptor's internal auth map: `interceptor.authInfo["HTTPBearer"] = token`.
4. If no `BearerAuthInterceptor` is found, creates one and adds it to the Dio interceptors.

The constructor `Openapi(Dio dio, {List<Interceptor>? interceptors})` accepts:
- A `dio` instance (required for HTTP operations)
- An optional `interceptors` list (added via `dio.interceptors.addAll()`)

## Auth Flow

1. **Initialize:** Create an `Openapi` instance with a configured Dio client. The `BearerAuthInterceptor` is either passed in the interceptors list or added automatically by `setBearerAuth()`.

2. **Authenticate:** Call an authentication endpoint to obtain a JWT token:
   - `POST /v1/accounts/authenticate` with `EmailAndPassword` body → returns `Token`
   - `POST /v1/accounts` with `CreateAccount` body → returns `Token`
   - `POST /v1/accounts/refresh` with `Token` body → returns refreshed `Token`

3. **Set Bearer Token:** Call `openapi.setBearerAuth("HTTPBearer", jwtToken)` to register the token. This stores it in the `BearerAuthInterceptor`'s auth info map under the key `"HTTPBearer"`.

4. **Make Authenticated Requests:** The `BearerAuthInterceptor` automatically checks each request's `Options`:
   - If `Options.extra["secure"]` is `true`, the `BearerAuthInterceptor` adds `Authorization: Bearer <jwtToken>` to the request headers.
   - If `Options.extra["secure"]` is not set or false, no auth header is added.

## Auth Scheme Summary

| Property        | Value        |
|-----------------|-------------|
| Scheme          | HTTP Bearer |
| Bearer Format   | JWT         |
| Auth Key Name   | `HTTPBearer` |
| Header          | `Authorization` |
| Header Format   | `Bearer <JWT>` |
| Secure Flag     | `Options.extra["secure"] = true` |
| Auth Method     | `Openapi.setBearerAuth("HTTPBearer", token)` |

## Endpoints Requiring Authentication

All 44 API endpoints have `secure: true` in their Options and require Bearer authentication, **except** for the following unauthenticated endpoints:

- `GET /v1/eula/{country_code}` — `getEulaByCountry`
- `GET /v1/eula/{country_code}/{language_code}` — `getEulaByCountryLanguage`

## Security Configuration in OpenAPI Spec

The `openapi.yaml` file in this directory defines the `BearerAuth` security scheme:

```yaml
components:
  securitySchemes:
    BearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
```

All paths specify `security: - BearerAuth: []` at the operation level, except for the two EULA endpoints which specify `security: []` (no auth required).
