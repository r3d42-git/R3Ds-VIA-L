# Maintainer release procedure

The initial distribution profile is Apple Silicon, macOS 13+, ZIP. Build on macOS using the pinned dependencies (`npm ci`). Signing is local; CI receives no signing credentials.

1. Run `npm test`, `npm run test:app` and `npm run test:focus`. Runtime tests use isolated profiles and do not authorize real hardware.
2. Set `SIGNING_IDENTITY` to an installed Developer ID Application identity. Store notarization credentials in Keychain using Apple's `notarytool`; pass only the profile name through `NOTARY_PROFILE` (default `VIA-L`). Never put credentials in this repository.
3. Run `node scripts/release.mjs`. This builds from an explicit package allowlist, signs nested code with Hardened Runtime, notarizes the app, requires `Accepted`, staples the app, and only then creates the final ZIP. A read-only extracted-artifact check verifies version, bundle ID, signature, stapled ticket, Gatekeeper and architecture. The SHA-256 file is written after verification.
4. Review and commit the exact source on `main`; push it and wait for its CI `test` check. Keep local notes, profiles and outputs ignored.
5. Run `node scripts/publish-release.mjs --dry-run`, then `node scripts/publish-release.mjs --publish` only when publication is authorized. The latter creates an annotated version tag, publishes the ZIP/checksum using `RELEASE_NOTES.md`, downloads the public asset afresh, compares local and GitHub digests and repeats verification.

Stop on any failed check. Preserve logs and notarization submission IDs; inspect Apple's result before retrying. Final artifacts are not silently overwritten. The local packaging command `npm run package:mac` intentionally produces a development app without distribution signing/notarization.

Independent verification: `node scripts/verify-release.mjs path/to/VIA-L-VERSION-macOS-arm64.zip` from the matching source checkout. A verified signature is distinct from a manual launch on a clean Mac and real-device compatibility testing.
