# AGENTS.md —

These rules are MANDATORY for every session. Read PROJECT.md before writing any code.
When a rule below conflicts with your habit, the rule wins.

---

## 0. Core behavior

- **NEVER guess. NEVER assume.** If you are not certain about a file's content, READ it.
  If you are not certain about a library API, check the installed version in
  `package.json` / `gradle/libs.versions.toml` and read `node_modules` typings or official
  docs for THAT version. If certainty is impossible, STOP and ask the user — a question
  costs seconds, a wrong assumption costs hours.
- Never invent endpoints, table columns, env variables, or library methods. Everything
  must trace back to PROJECT.md, an existing file, or an explicit user instruction.
- Before implementing any task: state a short plan (files to create/modify, tests to add).
  After implementing: run the verification commands (section 7) and show real output.
- Do exactly what was asked — nothing extra. No unrequested refactors, no drive-by
  changes in unrelated files, no "while I was here" edits. If you see a problem outside
  the task, report it in one sentence; do not fix it silently.
- If a task is ambiguous, ask ONE precise question instead of producing two half-guesses.
- Scope discipline: features listed as "KIRMAYDI" in PROJECT.md §6 must not be built,
  scaffolded, or stubbed unless the user explicitly asks.

## 1. Git rules

- Commit after each completed, working unit of work. Small, atomic commits — one logical
  change per commit. Never bundle schema change + feature + fix into one commit.
- Commit messages: short imperative English, like a normal developer writes.
  Examples: `add poi batch upsert endpoint`, `fix gps accuracy check on form screen`,
  `setup typeorm with postgis`, `room entities and dao for poi`.
- **NEVER mention AI in any form.** No "Co-Authored-By: Claude", no "Generated with",
  no robot emoji, no AI signatures or trailers of any kind. The history must read as if
  the project owner wrote every line.
- No emojis in commits. No conventional-commit prefixes (`feat:`, `chore:`) — plain
  lowercase imperative messages only, matching the examples above.
- Tests and lint MUST pass before committing. A failing state is never committed.
- Never commit: `.env*` (except `.env.example`), `uploads/`, build artifacts, keystores,
  `local.properties`. Maintain `.gitignore` accordingly from the first commit.
- Never run `git push --force`, never rewrite history, never amend a commit that was
  already pushed.

## 2. Repository order

- Respect the monorepo layout in PROJECT.md §1. Never create files at random paths.
- One class/component per file. Filename matches the export:
  `poi.service.ts` → `PoiService`; `PoiFormScreen.kt` → `PoiFormScreen`.
- A file longer than ~300 lines is a smell: split it before it grows.
- No dead code, no commented-out blocks, no `console.log` left behind, no `TODO`
  without an explanation of who/when.
- Every module/package gets created ONLY when first needed — no empty placeholder trees.

## 3. Backend rules (NestJS) — `backend/`

### 3.1 Folder layout (fixed)

```
backend/src/
├── main.ts
├── app.module.ts
├── libs/                     # SHARED — the only home for cross-cutting declarations
│   ├── enums/                # message.enum.ts, poi-status.enum.ts, media-type.enum.ts ...
│   ├── interfaces/           # api-response.interface.ts ...
│   ├── types/
│   ├── constants/
│   └── index.ts              # barrel export
├── common/                   # filters/, interceptors/, guards/, pipes/, decorators/
├── config/                   # typed config modules; ONLY place process.env is read
├── database/                 # data-source.ts, migrations/, seeds/
└── modules/
    └── poi/
        ├── poi.module.ts
        ├── poi.controller.ts
        ├── poi.service.ts
        ├── poi.repository.ts
        ├── dto/
        ├── entities/
        └── tests/            # poi.service.spec.ts, poi.controller.spec.ts
backend/test/                 # e2e: poi.e2e-spec.ts per controller
```

### 3.2 Hard rules

- **Enums, interfaces, types, constants live in `src/libs` ONLY** and are imported from
  `@libs`. NEVER declare an enum/interface/type inside a controller, service, or DTO file.
  If a new one is needed — create it in `libs` first, then import.
- **No raw string literals for messages or error codes.** Every response message and
  error code comes from `MessageEnum` / `ErrorCodeEnum` in `@libs/enums`. Writing
  `throw new BadRequestException('Invalid data')` is forbidden; correct form references
  the enum. This applies to logs intended for operators as well.
- Path aliases configured in tsconfig and used everywhere: `@libs`, `@common`, `@config`,
  `@modules`. Deep relative imports (`../../../libs`) are forbidden.
- Controllers are thin: validate input (DTO), call ONE service method, return.
  No business logic, no repository access, no try/catch in controllers — the global
  exception filter handles errors.
- Services hold business logic; they never touch the ORM directly. All DB access goes
  through the module's repository class.
- Every endpoint has a request DTO with class-validator decorators on every field.
  `any` is forbidden across the codebase (`@typescript-eslint/no-explicit-any: error`).
  Response shape always matches `ApiResponse<T>` from `@libs/interfaces`.
- TypeORM: `synchronize: false` always. Every schema change = a generated migration in
  `database/migrations` committed in the same commit as the entity change. Never edit an
  applied migration; write a new one.
- Geo columns use `geography(Point, 4326)`; spatial queries use PostGIS functions through
  the repository — never compute distance in JS.
- Config: a typed config module with Joi validation of env vars at boot.
  `process.env` is read ONLY inside `src/config`. `.env.example` is updated in the same
  commit whenever a variable is added.
- Logging via Nest `Logger` only. Uploaded files validated by mime + size before saving.
- Swagger decorators on every controller method — endpoint, body, and response documented.

### 3.3 Backend testing

- **Every new endpoint = e2e test in `backend/test/` in the same commit.** Covers the
  success path, validation failure, auth failure (missing/wrong `X-Collector-Code`), and
  idempotency where relevant (sending the same `client_uuid` twice must not duplicate).
- Every service = unit spec with mocked repository. Every repository with custom logic =
  spec against a test database.
- e2e runs against a dedicated Postgres+PostGIS test container (docker compose service),
  never against the dev database.
- Command `npm run test && npm run test:e2e` green is a precondition for every commit.
