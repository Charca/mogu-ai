# Mogu v1 product and technical specification

Mogu helps people log meals with a photo, text, a barcode, or manual entry, review the estimated nutrition, and track daily intake and weight. Version 1 is an iPhone app built with React Native and Expo, with a separate public-food API in a Turborepo monorepo.

The app works without an account. Each installation has one local user who owns all diary records. Gemini is the only AI provider at launch, accessed directly with the user's own key. Diary data and photos stay on the device unless the user explicitly sends a meal for analysis or exports a backup.

# Product scope

## Included in v1

- Photo logging from the camera or photo library, one image per analysis, with an optional note.
- Text meal descriptions containing one or more foods.
- Barcode scanning and Open Food Facts product lookup.
- Manual calorie and macro entry.
- Review before saving, ingredient edits, portion adjustment, meal categorization, and backdating.
- A daily calorie and macro dashboard, meal history, and calendar navigation.
- Weight logging and basic weekly and monthly progress charts.
- Calculated calorie and macro targets from a short profile, with manual overrides.
- Gemini key setup, validation, replacement, and deletion.
- Local backup export, restore, and complete data deletion.
- An adapter boundary for future AI providers and an identity boundary for future authentication.

## Deferred

Android release, voice input, AR measurement, Apple Intelligence, subscriptions, hosted AI, login, cloud sync, HealthKit, exercise tracking, reminders, nutrition-label OCR, restaurant search, a general food-search catalog, micronutrients, recipe management, a general AI coach, and social features.

The interface must not show inactive microphone, subscription, account, or cloud-sync controls. Android portability influences package boundaries but does not require Android release testing for v1.

## Release audience

English-language iPhone app for adults tracking general nutrition. Support metric and imperial profile/weight inputs, kcal for energy, and grams for macros. Keep canonical profile units in kilograms and centimeters. Use the minimum iOS version required by the selected stable Expo SDK; record the actual minimum in the repository when dependencies are pinned.

# Experience and visual direction

Use Mogu as the working product name and the supplied design as the visual reference. Preserve the friendly blue mascot, pale lavender background, lime accents, rounded white cards, soft shadows, dark rounded bottom navigation, and pastel macro indicators. Adapt the five reference screens into a smaller, coherent v1 flow.

Treat the reference as visual direction rather than an exact layout contract. Create reusable assets rather than cropping text or controls from the composite. Keep the mascot decorative and supportive; avoid guilt, food morality, or praise for unusually low intake.

## Navigation

Four tabs: Today, Log, History, and Progress. A profile/settings button is available from Today and Progress. Log opens a conversation-like meal entry screen with structured cards; it is a logging interface, not an open-ended chatbot.

## Today

- Selected date, greeting, and a compact mascot.
- Calories consumed and the day's goal; protein, carbs, and fat totals.
- Clear indication when a total is incomplete because nutrients are unknown.
- Meals grouped into Breakfast, Lunch, Dinner, and Snacks.
- Primary Log meal action, weight shortcut, and entry edit/delete actions.
- Empty state inviting the first meal without displaying an inferred zero-intake success.

## Log

The empty state asks “What did you eat today?” and offers Photo, Text, Barcode, and Manual. A text composer remains available at the bottom. Use a focused action sheet for camera versus photo library.

After submission, show the input and analysis state, followed by an editable meal card. The user must tap Save meal before anything affects the diary. The mascot's success message appears only after the database commit succeeds. A deterministic confirmation can say “Saved lunch: approximately 520 kcal”; it must not claim clinical certainty or invent personalized advice.

Conversation bubbles represent the current draft and outcome. Persistent chat history and conversational memory are outside v1. Previous saved meals belong in History. Leaving a draft offers Keep draft or Discard; reopening restores it.

## Review meal

- Meal title, image if present, date/time, and meal category.
- Ingredient rows with quantity, unit, calories, macros, source, and estimate status.
- Add, remove, and edit ingredients.
- Whole-meal portion multiplier and item-level quantity controls.
- Direct nutrition correction with a clear reference quantity.
- Save, discard, and retry analysis actions.
- A short explanation of assumptions, such as an estimated cooked weight or unverified added oil.

## History and Progress

History shows a calendar and the selected day's meal list. A calendar marker means at least one saved meal, not goal compliance. Selecting a meal opens its details and edit flow.

Progress supports week and month ranges. Show intake by day against the applicable goal and a separate weight chart. Do not connect missing weight readings as if they were daily measurements. Intake averages use only dates with saved meals and display the denominator, such as “5 logged days”; those days may still be partially logged. Missing diary dates are gaps rather than zero intake. No “percent on track” or medical forecast in v1.

If a logging streak is shown, define it as consecutive local calendar dates with at least one saved meal, ending today or yesterday. It measures logging consistency only.

## Profile and settings

Profile includes optional display name, body measurements used for calculation, goal, unit preferences, AI access, export/restore, delete data, privacy, and about. Replace the reference's Account and Backup & Sync rows with “Your data” and “Export or restore backup.”

## Accessibility

Use at least 44-point touch targets, meaningful accessibility labels, Dynamic Type support, and sufficient text contrast. Pair macro colors with text. Respect Reduce Motion. Handle keyboard/safe areas, smaller iPhones, permission denial, empty states, and large text without clipped controls.

# Onboarding and targets

Create the local user on first launch and make onboarding resumable. Explain local storage, optional Gemini access, and estimated photo nutrition. Allow manual logging without a key.

Offer two routes: calculate targets from a profile, or enter targets manually. Calculated targets require age, height, current weight, activity category, weight goal, and a clearly explained formula coefficient selection. Do not infer this selection from a name or gender identity. Display name is optional.

Use the Mifflin–St Jeor equation as the initial resting-energy estimate:

- Base = 10 × weightKg + 6.25 × heightCm − 5 × ageYears.
- Add 5 for the male equation or subtract 161 for the female equation.
- Activity multipliers: sedentary 1.2, lightly active 1.375, moderately active 1.55, very active 1.725.
- Maintenance estimate = resting estimate × activity multiplier.
- Proposed v1 goal adjustment: maintain 0%, lose −10%, gain +10%.
- Round suggested calories to the nearest 10 kcal.
- Suggested protein = 1.2 g/kg; fat = 30% of target calories divided by 9; carbs = the remaining calories divided by 4. Round grams for display and retain calculation precision internally.

These macro defaults and goal adjustments are product starting values, not outputs of the Mifflin paper or personalized prescriptions. Explain that calculated targets are estimates and require confirmation. Automated targets are for the stated adult audience; users outside that audience use manually supplied targets. Do not generate negative targets, negative remainder macros, or automated aggressive weight-loss rates.

Allow independent manual calorie and macro targets; show their approximate energy equivalence without forcing calorie equality, since label conventions and rounding vary. Validate finite positive calorie goals and finite nonnegative macro goals. Invalid calculations fall back to manual entry.

Changing profile measurements or weight must not silently change an accepted target. Offer Recalculate targets, preview the result, and require Apply. Store dated goal versions. A new target applies from today by default and does not rewrite historical goals. Historical dates use the latest goal effective on or before that date; dates before the first goal show no target.

# System architecture

Use pnpm workspaces and Turborepo. Mobile is the source of truth for user data. The API serves public product metadata and never acts as a Gemini proxy.

- Mobile → SQLite and app-private files: users, profile, goals, meals, weight, drafts, cached products, photos.
- Mobile → iOS Keychain through SecureStore: Gemini key only.
- Mobile → Google Gemini: selected meal image/text and schema instructions.
- Mobile → Mogu API → Open Food Facts: barcode lookup and normalized public nutrition.
- Mobile → system Files/share sheet: explicit backup export and import.

No server-side user record, anonymous registration, API login token, or meal upload exists in v1. A local user ID is a database ownership key and is never accepted as proof of authorization.

## Monorepo layout

Suggested repository structure:

- apps/mobile: Expo app, Expo Router routes, feature screens, mobile repositories, SQLite migrations, device services, and native integrations.
- apps/api: Hono HTTP service on a supported Node.js LTS runtime, packaged independently for deployment.
- packages/domain: pure TypeScript models, nutrition arithmetic, target calculations, date policies, and repository interfaces.
- packages/contracts: Zod schemas and versioned public API DTOs.
- packages/ai: provider interface, Gemini REST adapter, prompt versions, response validation, and normalization.
- packages/config: shared TypeScript and lint configuration.
- docs: this spec, architecture decisions, reference assets, and implementation notes.

Keep mobile UI components and SQLite implementations inside apps/mobile until there is a concrete second consumer. Do not build unused web UI or backend diary packages. Do not nest workspaces. Packages depend on declared workspace exports rather than importing another app's source.

Domain imports neither React Native nor server frameworks. Contracts import no app code. The AI package contains no persistence or UI; a runtime credential callback supplies the key without making it part of serializable state. The API must not import mobile or the Gemini adapter.

## Stack and delivery

- React Native, TypeScript strict mode, stable Expo SDK, Expo Router, and Expo development builds.
- expo-camera for capture and barcode scanning; expo-image-picker and expo-image-manipulator for library import and image preparation.
- expo-sqlite with explicit versioned SQL migrations and repository functions.
- expo-secure-store for credentials.
- Expo filesystem, sharing, and document-picker modules for images and backup files.
- React Native StyleSheet and centralized design tokens; chart rendering through react-native-svg or a small compatible chart library selected during the foundation milestone.
- Hono, Zod, and native fetch for the API; no production database needed for public lookups.
- Vitest for pure domain/API tests, a compatible React Native component test setup, and Maestro for essential device flows.

Select mutually compatible current versions when scaffolding, use Expo's supported React Native version, and commit the lockfile. Do not independently upgrade React Native beyond the selected Expo SDK's compatibility range.

Root tasks: dev, lint, typecheck, test, and build, with explicit mobile and API filters. Mobile build means an actual development/release binary workflow rather than TypeScript compilation. CI runs affected checks; native build validation runs on dependency/native configuration changes and release candidates. Turbo caches must exclude credentials, local databases, photos, backups, and private environment files.

# Local identity and data model

Use UUIDs for IDs and one active local user. No email, password, or remote account identifier is required.

Every user-owned entity has userId. Repository methods take the active user explicitly, including draft, photo, and weight operations. Restrict reads and writes to that user even though only one user exists in v1.

Common mutable fields: id, userId, createdAt, updatedAt, deletedAt where applicable, and a local revision counter. Timestamps are UTC ISO strings. Revisions support local change detection; they are not a complete sync protocol.

Core tables and records:

- User: id, optional displayName, createdAt, updatedAt. Identity is separate from profile and provider settings.
- Profile: userId, age input and its capture date, heightCm, startingWeightKg, optional formula coefficient, activity category, goal, and unit preferences.
- GoalVersion: id, userId, effectiveLocalDate, caloriesKcal, proteinG, carbsG, fatG, source calculated/manual, formulaVersion, and the inputs used.
- Meal: id, userId, title, occurredAt, timeZone, localDate, category, logMethod, status, optional notes, and timestamps.
- MealItem: id, mealId, userId, name, reference quantity/unit, consumed quantity, reference nutrients, source metadata, estimate flags, and user correction metadata.
- Photo: id, userId, mealId or draftId, relative file path, MIME type, pixel dimensions, and byte size.
- WeightEntry: id, userId, measuredAt, timeZone, localDate, weightKg, optional note, and timestamps.
- Draft: id, userId, input text, image reference, draft state, validated analysis if available, and timestamps.
- ProductCache: barcode, normalized payload, source version, fetchedAt, and expiresAt; public data without user ownership.
- AppSettings: activeUserId, units, onboarding state, and nonsecret provider/model configuration.

Reference nutrients contain caloriesKcal, proteinG, carbsG, and fatG, each nullable. Unknown is not zero. Reference unit is g, ml, or serving. Human-readable units such as piece can map to a known reference quantity.

Source metadata records manual, Gemini estimate, or Open Food Facts, plus provider/model/prompt/schema version for AI and barcode/source product ID/retrievedAt for products. Store the exact nutrition snapshot used for the entry so later provider or database changes do not rewrite meals.

Store localDate and IANA timeZone at logging. Travel does not regroup old meals. Editing meal date/time explicitly recomputes those fields. Dates and charts use the saved local date; streak “today” follows the device's current timezone.

## Future authentication and sync

Later, introduce a server account ID and a UserAccountLink mapping localUserId to serverUserId and provider identity. Keep local IDs and ownership intact. Account linking requires an explicit authenticated migration and must not overwrite the local diary.

Future servers derive ownership from verified authentication, never from a caller-supplied local userId. Define merge rules, cross-device conflict resolution, tombstone retention, encryption, and sync cursors in the later sync specification. Existing UUIDs, revisions, ownership, and repository boundaries reduce migration work without pretending sync is already implemented.

# Nutrition and portion calculations

Persist reference nutrition and consumed quantity; derive totals in code:

Nutrient consumed = reference nutrient × consumed quantity / reference quantity.

Example: 200 kcal per 100 g with 150 g consumed yields 300 kcal. Apply the same ratio to known macros. Sum item totals for meals and saved-meal totals for each day. Drafts and deleted records never contribute.

Keep full numeric precision in storage and calculations; round calories to whole kcal and macros to one decimal for display. Repeated edits must scale from the reference snapshot, not from already-rounded totals.

Use 4 kcal/g protein, 4 kcal/g carbs, and 9 kcal/g fat as a reasonableness check, not a forced replacement for label/database calories. Flag large discrepancies for review without rejecting otherwise usable label data.

Do not convert ml to g using a blanket 1:1 assumption. Keep liquid nutrition per ml when supported. If a product supplies only per-serving nutrition with no mass, use servings and do not invent grams.

An item correction updates the reference snapshot at the explicitly shown reference quantity. Later portion changes scale from the correction. A whole-meal multiplier applies to all consumed quantities. Changing a unit preserves the equivalent amount where a conversion is known; unknown conversions require user input.

For AI results with a positive estimated mass, normalize to per-100-g reference nutrition while preserving the original estimated mass. If only serving count is supported, retain a serving basis. Never convert missing quantities into plausible-looking grams.

Calories may be saved when macros are partially unknown. A missing calorie value requires correction before saving that item. Daily macro displays sum known values and visibly indicate incompleteness instead of treating unknown fields as zero.

# Gemini BYOK analysis

## Provider setup

Settings explains where to obtain a Gemini key, that Google may charge the user's account, and what selected content is sent to Google. A key is optional for manual and barcode logging.

Validate a key through a small request to the configured supported model after the user taps Test key. The test may consume provider quota. Mask saved keys, never log them, and let the user replace or delete them. No keys in SQLite, AsyncStorage, backups, URLs, crash reports, analytics, source code, or app-wide serialized state.

Store the key in SecureStore with device-only accessibility appropriate for foreground analysis. Read it only when making a request. Handle Keychain persistence across reinstall: if a fresh database has no onboarding marker, remove any stale Mogu key before starting a new setup. Delete all data must explicitly remove the key.

## Adapter contract

Define an AIProvider interface with validateCredential, analyzeMeal, and a capabilities description. analyzeMeal accepts text and/or a prepared image, AbortSignal, and schema/prompt version; it returns a validated MealAnalysisDraft. Inject credentials at runtime.

The Gemini implementation calls Google's REST API directly over HTTPS. Pin one tested stable multimodal model in versioned application configuration; record its exact ID during the integration milestone. Do not guess a model ID or silently choose the latest alias. Changing provider models must pass the same fixture evaluation.

## Request and response

Prepare a single image with orientation normalized, metadata stripped, a longest edge of at most 1600 px, and a target encoded size of at most 2 MB. Remove location metadata and upload only the prepared copy. Keep a local optimized copy for the meal; don't retain a second full-resolution original by default.

Use Gemini's supported structured-output schema mode, then validate independently with Zod. The response contains meal title, 1–20 item candidates, quantities/bases, estimated calories/macros, assumptions, and clarification-needed fields. All amounts must be finite, nonnegative, and bounded; quantity/reference denominators must be positive. Reject malformed structure and bound string lengths and item counts.

The prompt asks for visible foods and user-provided quantities, distinguishes raw/cooked preparation where supported, and marks uncertainty about sauces/oils. It must not claim to read an unseen label, retrieve a verified food record, or physically measure weight. User text and text visible in images are meal data, not instructions to change the output contract.

For photo and text entries, nutrition is labeled “AI estimate.” V1 does not automatically match AI ingredients to a generic nutrition database. Barcode nutrition has a database source and manual entries have a user source. The UI preserves those distinctions.

## Reliability and cost

States: drafting, preparing, analyzing, review, saving, saved, and error/cancelled. Keep the draft on timeout, background interruption, offline failure, invalid key, quota exhaustion, or malformed response.

Allow one active analysis per draft. Disable duplicate submissions, use request IDs, and discard results from cancelled or superseded requests. Use a 60-second timeout. No automatic paid analysis retries; offer an explicit retry with a short rate-limit cooldown when applicable. Retrying or editing a portion never silently makes an extra AI call.

Successful analysis does not save a meal. Save uses a local transaction and a stable draft-to-meal ID so repeated taps cannot create duplicates. Once saved, remove the draft atomically. AI cannot edit or delete existing diary entries.

# Barcode and public food API

Use expo-camera's native barcode detection for retail EAN/UPC codes. Debounce repeated callbacks, pause scanning after detection, support torch, and offer manual code entry. Keep codes as strings to preserve leading zeros. Normalize equivalent UPC/EAN representations deliberately and validate supported length/check digits.

Lookup order: local product cache, then Mogu API. The API calls the currently supported Open Food Facts product endpoint and normalizes the result into a stable contract. Use the current documented API generation when implementing; keep upstream version handling inside the adapter.

Product result fields: barcode, name, brand if available, source URL, reference nutrition basis, known serving conversion, retrievedAt, and missing-field status. Product photos are optional and can be omitted from v1 to simplify licensing and image caching. Show source attribution on review/detail screens and in About.

Default consumed quantity is one known label serving; otherwise use the documented reference amount. Never assume the scanned item was eaten or that the whole package equals one serving. Product not found or unusable nutrition leads to manual entry or photo/text analysis.

## API contract

- GET /health: service health only, no private environment values.
- GET /v1/products/:barcode: normalized public product response.
- Success includes schemaVersion, requestId, data, and cache metadata.
- Errors use stable codes: INVALID_BARCODE, PRODUCT_NOT_FOUND, INCOMPLETE_PRODUCT, UPSTREAM_UNAVAILABLE, and RATE_LIMITED.
- Return 400 for invalid input, 404 for a missing product, 422 for unusable nutrition, 429 for throttling, and 503 for upstream failure.

No POST meal endpoint, AI proxy, auth endpoint, or user endpoint in v1. Public endpoints must not accept user keys, images, profiles, or diary payloads.

Use a descriptive application User-Agent for upstream calls, bounded response size, fixed upstream host, timeouts, and normalized units. Identify upstream kJ explicitly before converting to kcal; do not infer energy units from a number.

Use a bounded public response cache: successful products for 24 hours and not-found results for 15 minutes. Persist a mobile cache for offline reuse, mark expired offline data, and preserve the entry's chosen nutrition snapshot. Server cache is best effort and may reset on deploy; it is never user storage.

Configure edge/IP throttling with deployment-configured limits, respect upstream Retry-After, and avoid exposing upstream error bodies. Health and public barcode requests need no shared client secret. Log request ID, status, duration, and cache outcome; omit barcode and raw request paths where infrastructure permits.

# Persistence and backup

Use SQLite foreign keys, transactions for composite writes, prepared/parameterized statements, and versioned migrations. A migration failure preserves the existing database and offers recovery/export rather than resetting it.

Store images in app-private durable storage with relative paths. Only transient preparation files belong in cache. Delete unreferenced draft images and orphaned files after interrupted operations; ensure cleanup never removes a photo referenced by a saved meal.

## Export

Export a versioned .mogu.zip containing manifest.json, validated JSON records, and referenced optimized photos. Include schemaVersion, application version, creation timestamp, record counts, and photo checksums. Exclude credentials, transient analysis buffers, logs, and public caches.

Use a consistent database snapshot and manifest so editing during export cannot produce mismatched data. Pause mutations briefly or use an appropriate snapshot strategy. Explain that the archive contains personal nutrition information and is not encrypted by Mogu; the user chooses a storage destination.

## Restore

V1 restore replaces the current diary after an explicit preview and confirmation; merging archives is deferred. Preview counts and archive date. Keep the current local user ID, remap imported ownership to it, retain imported record UUIDs, and reject duplicate IDs or invalid foreign keys within the archive.

Validate schema version, all records, checksum/asset references, file count, expanded archive size, and paths before mutation. Reject path traversal, unsupported future versions, and oversized archives. Adopt initial limits of 250 MB compressed and 1 GB expanded; make limits explicit in UI errors.

Stage assets in a new directory, keep a local recovery snapshot, and switch database records/assets atomically with a recovery journal. A failed restore must leave the previous diary usable after relaunch. Restoring does not import or replace a Gemini key. Show the existing key state afterward and invite setup if missing.

## Delete data

A destructive confirmation removes all local users, diary data, drafts, images, caches, recovery files, settings, and the Gemini key, then starts fresh onboarding. Retain no hidden cloud copy. User-exported backups outside the app remain under the user's control.

# Privacy and offline behavior

Before the first AI submission, clearly state that selected meal content goes to Google. Store acknowledgment and show a route to provider terms/data-use information. Do not describe BYOK as guaranteeing that provider-side processing is private.

No ads, subscriptions, third-party behavioral analytics, or meal-content telemetry. If crash reporting is added later, scrub keys, body measurements, food text, images, and database content.

Manual logging, diary edits, existing history/charts, weight entry, targets, and backup work offline. Gemini analysis and uncached barcode lookup require connectivity. Network failure preserves drafts and offers manual entry. Do not queue AI requests that might incur charges unexpectedly on reconnection.

The database is in the iOS app sandbox and benefits from platform file protection; v1 does not claim independent database encryption or end-to-end cloud encryption.

# Acceptance criteria and validation

1. A fresh install creates one local user, completes or resumes onboarding, and works without login or a Gemini key.
2. The user can add, edit, backdate, and delete a manual meal offline; totals survive force-quit and relaunch.
3. A valid Gemini key analyzes a photo or text description into reviewable items. Invalid keys, malformed responses, quota errors, timeouts, and cancellation preserve the draft.
4. No analysis affects totals before explicit Save meal. Double taps and relaunch recovery cannot duplicate meals.
5. Editing a 100 g, 200 kcal item to 150 g yields 300 kcal. Repeated quantity changes, nutrient overrides, serving units, liquids, and null macros remain correct.
6. A known barcode produces attributed nutrition with an editable quantity. An unknown barcode, denied camera permission, or failed API lookup has a manual fallback.
7. UTC boundaries, daylight-saving changes, travel, backdating, and dated target changes produce the specified diary grouping and goal history.
8. Progress shows gaps and incomplete totals honestly; unlogged days do not count as zero-calorie days.
9. Export followed by restore reproduces meals, profile, dated goals, weights, and photos. Invalid archives and injected restore failures preserve the old diary.
10. Credential checks verify no Gemini key reaches Mogu API, backups, logs, repository files, or serialized state. Delete data removes Keychain credentials.
11. Repository tests verify every user-owned query is scoped by userId, including imported records and photos.
12. Core flows pass on a physical iPhone, including camera, Keychain, permissions, background interruption, large text, and VoiceOver.

Use domain unit tests for arithmetic, date/target policy, null handling, and goal formulas; API contract tests with recorded public fixtures; migration/restore failure tests; and device flow tests for the primary journey. Provider CI tests use mocks. Live Gemini evaluation is opt-in with a developer key and a fixed consented dataset.

Before release, evaluate at least 30 weighed meals across simple foods, mixed dishes, liquids, and visually ambiguous portions. Record item-recognition errors, portion-weight error, calorie error, rejected outputs, latency, and request cost separately. Establish and record acceptable accuracy for the intended product claims before beta approval; structured-output success alone cannot satisfy this gate. Do not publish an accuracy percentage without those results.

# Implementation sequence

## Milestone 1 Foundation and manual diary

Create the monorepo, Expo development build, API skeleton, design tokens, navigation, user/repository boundaries, migrations, and fixture data. Implement onboarding, manual meals, portions, daily totals, and dated targets. Exit when the manual diary works offline across relaunch.

## Milestone 2 Gemini logging

Implement SecureStore key management, provider adapter, image preparation, draft state machine, structured analysis, and editable review cards. Exit when photo/text flows and failure recovery pass on a physical iPhone, and the exact model ID is pinned.

## Milestone 3 Barcode and history

Implement normalized product lookup/cache, scanner, source attribution, history calendar, and meal editing. Exit when cached and uncached products, missing products, permission denial, and offline behavior pass.

## Milestone 4 Progress and data recovery

Implement weight entry, charts, dated goal display, export, validated replace-restore, and delete data. Exit when round-trip backups and migration/restore failure tests pass.

## Milestone 5 Release validation

Apply final Mogu assets and accessibility polish, run device/regression checks and the weighed-meal evaluation, review provider/data disclosures and food-source attribution obligations, and prepare TestFlight. No subscription or auth implementation is a prerequisite.

# Implementation references

- [Expo custom native code](https://docs.expo.dev/workflow/customizing/) explains development builds and native extension options for later AR or on-device AI.
- [Expo SQLite](https://docs.expo.dev/versions/latest/sdk/sqlite/) provides the persistent local database API.
- [Expo SecureStore](https://docs.expo.dev/versions/latest/sdk/securestore/) documents iOS Keychain storage and uninstall persistence.
- [Expo Camera](https://docs.expo.dev/versions/latest/sdk/camera/) supports capture and native barcode detection.
- [Gemini structured outputs](https://ai.google.dev/gemini-api/docs/structured-output) documents schema-constrained responses; the app must still validate quantities and nutritional meaning.
- [Turborepo repository structure](https://turborepo.com/docs/crafting-your-repository/structuring-a-repository) documents apps and shared workspace packages.
- [Open Food Facts API documentation](https://openfoodfacts.github.io/openfoodfacts-server/api/) covers product data, supported API generations, identification, and rate limits. Verify applicable data/asset attribution and redistribution requirements before distribution.
- [Mifflin et al original equation](https://pubmed.ncbi.nlm.nih.gov/2305711/) is the source of the resting-energy formula, not the app's activity, macro, or goal-adjustment defaults.
