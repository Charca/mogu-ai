# Mogu

A local-first calorie diary for iPhone, built with React Native, Expo, and a Turborepo workspace. The initial implementation focuses on the manual diary. The full v1 scope lives in [the product and technical specification](docs/mogu-v1-spec.md).

## What works in this first implementation

- A local user with no login, plus calculated or manual onboarding targets.
- Multi-item manual meals with editable reference nutrition, serving quantities, and live totals.
- Meal editing, deletion, backdating, history calendar, and daily calorie/macro summaries.
- Dated targets that preserve earlier goals.
- Weight entry in kg or lb and basic 7/30-day progress charts.
- SQLite persistence, migrations, transactional writes, user ownership checks, duplicate-save protection, and revision checks.
- Mogu's blue mascot, pastel cards, lime accents, and rounded dark navigation, adapted from the [design reference](docs/assets/mogu-design-reference.png).
- A separate Hono API with a public health endpoint and shared product/analysis contracts.

**Not implemented yet:** Gemini/key management, photo/text analysis, barcode lookup, saved drafts, backup/restore, data deletion, and complete profile/unit preferences. The provider interface is ready; there is no working Gemini adapter yet. Manual editor changes are currently discarded when leaving the editor. Onboarding creates the user immediately, but unfinished form fields are not restored after a restart. The app currently uses metric inputs for calculated targets and kg on weight charts; weight entry also accepts pounds.

## Run locally

Requirements: Node.js 24 and pnpm 12.21.0. Dependencies are already installed on the development machine.

```sh
cd ~/Sites/mogu-ai
pnpm install --frozen-lockfile
pnpm dev:mobile
```

This starts Metro for a **development build**, not Expo Go. Before opening the app, either build it locally with a full Xcode installation or create an Expo cloud development build.

Local simulator build, after selecting a full Xcode installation in Xcode Settings → Locations:

```sh
pnpm --filter @mogu/mobile ios
```

Cloud simulator build, after signing into your Expo account and configuring this project's Expo identity:

```sh
cd apps/mobile
pnpm dlx eas-cli@latest build --platform ios --profile development
```

The development profile targets the simulator. The preview profile creates a development client for a registered physical device and requires Apple signing setup. The bundle identifier is provisionally com.moguai.app; change it before registering your app if needed. No Expo project, signing account, or production deployment has been registered by this scaffold.

This machine currently selects /Library/Developer/CommandLineTools and has no available simctl. Install/select full Xcode and an iOS runtime to run the app locally. An iOS JavaScript export is a bundling check, not a native compilation or device test.

Run the public API separately when developing its next milestone:

```sh
pnpm dev:api
curl http://localhost:3001/health
```

The manual diary needs neither the API nor an AI key. PORT defaults to 3001. There are no other API endpoints yet.

## Workspace

| Path               | Responsibility                                                             |
| ------------------ | -------------------------------------------------------------------------- |
| apps/mobile        | Expo Router screens, UI, SQLite store, migrations, and device integrations |
| apps/api           | Public food metadata service; no private diary storage                     |
| packages/domain    | Nutrition, target/date rules, models, and repository interface             |
| packages/contracts | Validated public product and AI response schemas                           |
| packages/ai        | Provider abstraction; Gemini implementation is next                        |
| packages/config    | Shared strict TypeScript configuration                                     |
| docs               | Product spec and design reference                                          |

User IDs identify local ownership. They are not authentication tokens. User-owned reads and writes require the active user ID; future account links can map that ID to a verified server identity without rewriting diary IDs. Keep AI requests direct to the provider and keep user keys out of Mogu's API.

The SQLite connection belongs exclusively to LocalStore. All reads and writes go through its serial queue so unrelated queries cannot enter an asynchronous transaction. Keep foreign keys enabled. Never query this connection directly from a screen or reset a database to recover from a migration error.

## Validate

```sh
pnpm lint
pnpm typecheck
pnpm test
pnpm format:check
pnpm --filter @mogu/api build
pnpm --filter @mogu/mobile bundle:ios
pnpm --filter @mogu/mobile exec expo install --check
```

Tests use Node's real SQLite engine through the same repository SQL, alongside pure domain and HTTP tests. They exercise reopen behavior, user isolation, atomic rollback, duplicate saves, stale revisions, missing nutrients, calendar dates, and target history. They do not validate the Expo native SQLite binding, navigation, accessibility, keyboard behavior, or visual layout on a device. Those remain required before beta.

For an Expo dependency/configuration audit, run pnpm dlx expo-doctor@latest from apps/mobile. Native build profiles are in apps/mobile/eas.json. Root pnpm build includes a cloud native build and therefore needs Expo project/account setup; use the explicit API build and bundle commands for local checks without cloud credentials.

## Next implementation steps

1. Validate onboarding and manual diary flows on an iPhone/simulator; add a Maestro smoke flow.
2. Persist onboarding and meal drafts; finish preferences and profile editing.
3. Implement Gemini BYOK via SecureStore, direct REST requests, structured analysis, and editable review.
4. Add the public product endpoint and barcode scanner/cache.
5. Add validated export/restore and delete data, then complete the v1 acceptance checks.

Expo template assets and its license are retained under apps/mobile. Replace the template app icon with a production Mogu icon before release. No Fud AI application code was copied into this project.
