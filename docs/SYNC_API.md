# Sync API Specification

This document defines the **delta sync API** used by the Windows and Android native apps to push local changes and pull cloud changes. Implement this contract on the server (Supabase Edge Functions or PostgREST/RPC) and on the clients.

**Related:** [MASTER_ARCHITECTURE_DIRECTIVE.md](./MASTER_ARCHITECTURE_DIRECTIVE.md) §5, [LOCAL_DATABASE_SCHEMA_AND_SYNC.md](./LOCAL_DATABASE_SCHEMA_AND_SYNC.md) §5.

---

## 1. Sync columns (server and client)

Every synced table MUST have (or accept in payloads):

| Column       | Type        | Required | Notes |
| ------------ | ----------- | -------- | ----- |
| `id`         | UUID        | Yes      | Primary key (or composite for a few tables). |
| `created_at` | Timestamptz | Yes      | Set on insert. |
| `updated_at` | Timestamptz | Yes      | Set on insert and every update; used for delta pull and conflict. |
| `deleted_at` | Timestamptz | No       | Non-null = soft delete. |
| `version`    | Integer     | Yes      | Incremented on each update. |
| `device_id`  | Text        | No       | Set by client on push; stored for auditing. |

Client-only: `synced` (boolean) — not stored on server; client uses it to mark rows that have been successfully pushed.

---

## 2. Authentication and school-scoping

- All sync endpoints MUST require a valid Supabase auth session (JWT).
- Every request MUST be scoped to one or more `school_id` values that the authenticated user can access (e.g. from `users.school_id` or a role mapping). Rows for other schools MUST NOT be returned or updated.

---

## 3. Push (client → server)

**Purpose:** Upload local changes (rows with `synced = false`).

**Endpoint:** e.g. `POST /rest/v1/rpc/sync_push` or `POST /sync/push`.

**Request body:**

```json
{
  "device_id": "uuid-or-string",
  "payloads": {
    "schools": [ { "school_id": "...", "name": "...", "updated_at": "...", "version": 1, "device_id": "..." } ],
    "school_terms": [ ... ],
    "students": [ ... ]
  }
}
```

- Keys of `payloads` are **table names** in the dependency order of [LOCAL_DATABASE_SCHEMA_AND_SYNC.md](./LOCAL_DATABASE_SCHEMA_AND_SYNC.md) §3 and §5 (e.g. schools first, then school_terms, classes, …).
- Each array contains full row objects for that table. Client sends only rows that are unsynced (`synced = false`).
- Server MUST validate `school_id` on each row against the authenticated user’s allowed schools.

**Processing:**

- For each table in order, for each row:
  - If row with same primary key exists: update it, set `updated_at = now()`, `version = version + 1`, `device_id = request.device_id`. If the row has `deleted_at` set, treat as soft delete (update `deleted_at = now()`).
  - Else: insert row, set `created_at` and `updated_at`, `version = 1`, `device_id`.
- Return success and the updated rows (with new `version`, `updated_at`) so the client can set `synced = true` and update local `version`/`updated_at`.

**Response:**

```json
{
  "ok": true,
  "updated": {
    "schools": [ { "school_id": "...", "version": 2, "updated_at": "..." } ],
    "students": [ ... ]
  }
}
```

On error (e.g. conflict, validation, auth): return `{ "ok": false, "error": "message" }` and appropriate HTTP status.

---

## 4. Pull (server → client)

**Purpose:** Download all changes since `last_sync_timestamp` for the user’s school(s).

**Endpoint:** e.g. `POST /rest/v1/rpc/sync_pull` or `POST /sync/pull`.

**Request body:**

```json
{
  "school_id": "uuid",
  "last_sync_timestamp": "2025-01-15T12:00:00Z"
}
```

- `last_sync_timestamp` may be null for initial full pull.
- `school_id` MUST be one of the schools the user can access.

**Processing:**

- For the given `school_id`, query all synced tables in the **dependency order** from the schema doc (§3, §5).
- For each table: return rows where `school_id` = request school (or table has no school_id but is global) and `updated_at > last_sync_timestamp` (or all rows if `last_sync_timestamp` is null).
- Return rows in a structure that preserves table order so the client can apply in order (parents before children).

**Response:**

```json
{
  "ok": true,
  "data": {
    "global_terms": [ ... ],
    "schools": [ ... ],
    "school_terms": [ ... ],
    "classes": [ ... ],
    "students": [ ... ]
  },
  "server_timestamp": "2025-01-15T12:05:00Z"
}
```

- Client applies each table’s rows: upsert by primary key; if `deleted_at` is set, apply as soft delete (update local row or hide).
- After successful apply, client stores `server_timestamp` as the new `last_sync_timestamp`.

On error: return `{ "ok": false, "error": "message" }`.

---

## 5. Conflict resolution

- **Push:** Server accepts client rows. If the server already has a row with a higher `version` or newer `updated_at`, server may either reject the push for that row (return error) or apply last-write-wins (overwrite with client data and bump version). Document the chosen behavior; recommended: **last-write-wins** (server overwrites with client data and increments `version`).
- **Pull:** Client applies server rows. If local row has `synced = false` and is newer (higher version or newer updated_at), client may keep local and push later; otherwise client overwrites with server row. Recommended: **server wins on pull** unless local row is unsynced and newer — then keep local and push in next cycle.

---

## 6. Table order for push and pull

Use the order defined in [LOCAL_DATABASE_SCHEMA_AND_SYNC.md](./LOCAL_DATABASE_SCHEMA_AND_SYNC.md) §3.2 and §3.3 (and §3.4 for library). Push and pull MUST send/receive tables in this order so that foreign keys are satisfied when applying.

---

## 7. Composite primary key tables

For `invoice_sequences`, `receipt_sequences`, `receipt_sequences_per_term`, `parents`: identify rows by the full primary key. Push payloads must include all PK columns; pull must return them. Upsert/apply logic on server and client must use the full key.

---

## 8. Implementation notes

- **Supabase:** Implement push and pull as Edge Functions (or PostgREST RPC) that run with the authenticated user’s JWT and enforce RLS / school checks. Alternatively, use a single RPC that accepts a JSON payload and returns JSON.
- **Clients:** Use the same table order when building push payloads and when applying pull responses. Persist `last_sync_timestamp` and `device_id` locally; run push before pull when syncing.

This API ensures offline-first apps can sync reliably when online and stay consistent with the cloud.
