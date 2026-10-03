# VK Helpers

Helpers for VK Mini Apps, with ESM and CommonJS exports. Requires Node >=22.12
for server use and the external ESM-only VK Bridge 3 dependency.

## Browser

```javascript
import { parseLaunchParams, getHashForParamsFromVK } from 'vk-helpers/browser';
const launch = parseLaunchParams();
const { sign, ts } = await getHashForParamsFromVK({ action: 'example' });
```

The browser entrypoint contains no Node crypto dependency. `parseLaunchParams('')`
returns an empty object even when the current URL has parameters. An explicit
query can also be parsed in Node; omitting it requires a browser. Duplicate keys
retain the last value, matching the existing URLSearchParams loop.

## Server

```javascript
import { checkRequestSignature } from 'vk-helpers/server';
const valid = checkRequestSignature({
  signature: 'received-signature', secretKey: 'your-server-secret',
  app_id: '123', params: { action: 'example' }, user_id: '456', ts: '1700000000'
});
```

The server entrypoint does not import Bridge. Existing root imports of
`checkRequestSignature`, `generateSignature`, `sortParams`, and
`getHashForParamsFromVK` still work. Bridge is external instead of embedded, so
applications should align their Bridge dependency with major 3 to share an instance.
The former README's `getUserId`/`initBridge` examples were not implemented exports.

## Wire compatibility

Signature encoding and boolean verification results are unchanged: sort keys with
`localeCompare`, format `key_encodeURIComponent(String(value))`, join with `;`,
base64 without padding, then HMAC-SHA256 over the original app/request/time/user
string and base64url without padding. Never replace this with form encoding:
spaces must remain `%20`, not `+`. Verification now compares exact UTF-8 bytes
with a length check and `timingSafeEqual`. No signature normalization is applied.

The browser helper still returns exactly `{ sign, ts }` and rejects Bridge errors.
Tests exercise these contracts using an independent copy of the 1.0.3 algorithm,
synthetic Unicode/space/punctuation values, fake secrets, and a mocked Bridge.
Existing Unicode-key limitations of browser `btoa` are intentionally unchanged.

## Development

`npm ci --ignore-scripts`, `npm test`, `npm run typecheck`.
Tests check ESM/CJS root and isolated exports, bundle boundaries and declarations.
PR CI runs on Node 22 and 24 with read-only permissions, uploading logs and built
files. It does not publish the package.

### Dependency compatibility (2026-10-03)

Rollup 4.64.0, plugin-typescript 12.3.0, tslib 2.8.1 and Bridge 3.0.2 are current.
Node types follow the tested Node 24 line (24.19.1). TypeScript is held at 6.0.3:
7.0.2 reproducibly fails plugin-typescript 12.3.0 before compilation because
`ScriptTarget.ES2015` is unavailable. Upgrade only when the plugin supports the
new compiler API; this is not a source type error.
