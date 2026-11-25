# Mogu project guidelines

- Read docs/mogu-v1-spec.md and README.md before expanding scope. README distinguishes implemented features from the full v1 scope.
- Keep apps independent. Shared domain code must not import React Native, Expo, HTTP frameworks, or application internals.
- Use Expo Router for navigation. Read apps/mobile/AGENTS.md before editing mobile code and use SDK-matched documentation and expo install for native dependencies.
- All user-owned persistence must be scoped by the active local user ID. Local identity is not authentication. Preserve the ability to add authenticated account links later.
- LocalStore owns its SQLite connection and serializes all operations. Use transactions for composite writes, preserve failed migrations, and retain dated goal history.
- Keep unknown nutrition null rather than zero. Scale from the original reference snapshot without repeated rounding. Do not assume ml equals g.
- BYOK credentials must never appear in source, SQLite, backups, logs, serialized UI state, or Mogu API traffic. AI analysis will call Gemini directly from the app.
- The API is for public product metadata. Do not add user, diary, or AI proxy endpoints without revisiting the spec.
- Run pnpm lint, pnpm typecheck, and pnpm test after substantive changes. Run bundle:ios for mobile changes. A bundle export does not establish native runtime correctness.
- Update README's implementation status when completing features. Keep the reference repository separate; do not copy its code or assets into Mogu.
