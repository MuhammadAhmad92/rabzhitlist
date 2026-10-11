# Backend Contract: `usageCount` on Time Support Zone Catalog (`GET /api/timesupportzones`)

Handoff for the **backend agent** implementing **`usageCount`** on the time support zone lookup catalog so the Next.js frontend can sort multi-selects by popularity (same pattern as tech stacks).

**Frontend reference (implements normalization + sort; tolerates missing `usageCount` as `0`):**

| File | Purpose |
|------|---------|
| `src/lib/utils/time-support-zone-lookup.ts` | Normalizes `usageCount`, sorts `usageCount DESC`, `name ASC`; `buildTimeSupportZoneMultiSelectOptions` for all TSZ multi-selects |
| `src/lib/services/tags-timesupportzones-api.ts` | `fetchTimeSupportZones()`, `rebuildTimeSupportZoneUsageCounts()` |

**Related:** `TIME_SUPPORT_ZONE_MERGE_BACKEND_CONTRACT.md` — merge preview uses `usageCountBefore` / `usageCountAfter` (Option B).

---

## 1. Goal

Extend **`GET /api/timesupportzones`** so each row includes non-negative **`usageCount`**, reflecting links on **employers** and **candidate work experiences**.

Frontend uses **`usageCount` only for dropdown ordering** — not filter badges or display text.

---

## 2. Locked product decisions

| # | Topic | Decision |
|---|--------|----------|
| **Z1** | **Global formula** | `usageCount(Z)` = **distinct employers** with a link to **Z** on `employer_time_support_zones` **plus** **distinct work experiences** with a link to **Z** on `candidate_work_experience_time_support_zones`. Two additive buckets (analogous to candidates + project-side for tech stacks). |
| **Z2** | **Soft delete** | Exclude links whose parent **employer** or **work experience** (and candidate, if WE queries require `candidates.DeletedAt IS NULL`) is soft-deleted — match existing list/filter queries. |
| **Z3** | **Zero usage** | Zones with `usageCount = 0` **remain in the response** and sort **last**. |
| **Z4** | **Sort order** | Primary: **`usageCount DESC`**. Tie-break: **`name ASC`** (case-insensitive). Same as tech stacks **L10** — *not* ascending by usage. |
| **Z5** | **Caching** | **Materialized** `usage_count` on `time_support_zones` (or side table), updated **synchronously on write** in the same transaction as junction changes; **nightly full rebuild** for drift only. |
| **Z6** | **POST create** | **`POST /api/timesupportzones`** response includes **`usageCount: 0`**. |
| **Z7** | **Scoped lists** | **N/A** — single global catalog (no aspect-type filter). |
| **Z8** | **Out of scope** | Projects, tech stacks, catalog merge admin tooling. |

---

## 3. API surface

| Method | Path | Change |
|--------|------|--------|
| **GET** | `/api/timesupportzones` | Add `usageCount` per row; pre-sort per **Z4** |
| **POST** | `/api/timesupportzones` | Response `{ id, name, usageCount: 0 }` |
| **POST** | `/api/timesupportzones/rebuild-usage-counts` | Admin + Super Admin: recompute all zones from source tables (**one-time backfill** + manual repair) |

**Auth for rebuild:** Same as catalog maintenance — Super Admin `0`, Admin `1`. Recruiter → **403**.

### Response shape (list + create)

```jsonc
[
  { "id": 1, "name": "UAE", "usageCount": 42 }
]
```

| Field | Type | Rules |
|-------|------|--------|
| `id` | `long` | Catalog id |
| `name` | `string` | Trimmed |
| `usageCount` | `int` | **≥ 0** |

PascalCase tolerance optional for JSON (`UsageCount`) — FE normalizes both.

---

## 4. Global `usageCount` definition (locked — Z1)

```text
distinct_employers(Z) =
  COUNT(DISTINCT employer_id
    FROM employer_time_support_zones ets
    INNER JOIN employers e ON e.id = ets.employer_id
    WHERE ets.time_support_zone_id = Z
      AND e.DeletedAt IS NULL)

distinct_work_experiences(Z) =
  COUNT(DISTINCT work_experience_id
    FROM candidate_work_experience_time_support_zones wets
    INNER JOIN candidate_work_experiences we ON we.id = wets.work_experience_id
    INNER JOIN candidates c ON c.id = we.candidate_id
    WHERE wets.time_support_zone_id = Z
      AND c.DeletedAt IS NULL
      AND we deleted/null rules match existing WE APIs)

usageCount(Z) = distinct_employers(Z) + distinct_work_experiences(Z)
```

**Note:** Same candidate with two WEs both linked to **Z** contributes **2** to the WE bucket (junction parent is `work_experience_id`). Employer + WE links are **independent** (no cross-bucket dedupe).

---

## 5. Write hooks (Z5)

| Event | Action |
|-------|--------|
| Insert/delete/replace **employer** time support zone links | **`RebuildForZone(zoneId)`** for each affected zone id (simplest correct distinct counts) |
| Insert/delete/replace **work experience** time support zone links | Same |
| Hard-delete employer / WE / candidate (cascade removes links) | Rebuild affected zone ids |
| Bulk import / migration | **`RebuildAllTimeSupportZoneUsageCounts()`** once at end |

**Acceptance:** After saving employer or WE with a new zone link, the next **`GET /api/timesupportzones`** shows updated counts and sort order without waiting for nightly job.

---

## 6. Rebuild / backfill

| Operation | When |
|-----------|------|
| **`RebuildAllTimeSupportZoneUsageCounts()`** | Migration backfill; **nightly** drift repair |
| **`POST /api/timesupportzones/rebuild-usage-counts`** | On-demand (deploy backfill, support incidents). **200** when complete. |

Implementation may run rebuild synchronously for catalog size expected today; return **202 + job id** only if needed.

---

## 7. Tests (minimum)

| Case | Expected |
|------|----------|
| Zone on 3 employers and 5 WEs | `usageCount = 8` |
| Same zone, zero links | `usageCount = 0`, still in GET list |
| After link insert | GET order moves zone up without rebuild POST |
| POST create zone | `usageCount: 0` |
| Rebuild POST | All rows match live aggregate formula |

---

## 8. Status

| Layer | Status |
|-------|--------|
| **Frontend** | **Implemented** — all time support zone multi-selects sort via `usageCount DESC`, `name ASC` (see § Frontend reference). `rebuildTimeSupportZoneUsageCounts()` is available for admin tooling; **backfill is a backend/on-call action**, not invoked on every page load (same as tech stacks). |
| **Backend** | **Implemented** — `TimeSupportZone.UsageCount` → `usage_count`; `TimeSupportZoneUsageRepository` (Z1); `GetAllForListAsync` (Z4); GET/POST + **`POST /api/timesupportzones/rebuild-usage-counts`**; Z5 hooks on employer / WE / candidate services; nightly `TimeSupportZoneUsageReconciliationHostedService`; migration `20261006180000_AddTimeSupportZoneUsageCount`. |

### Post-deploy

| Step | Owner |
|------|--------|
| Apply migration (`dotnet ef database update` or usual path) | Backend / ops |
| Optional **`POST /api/timesupportzones/rebuild-usage-counts`** once (sanity; migration backfill matches Z1) | Admin |
| Smoke: employer + candidate TSZ multi-selects show **most-used zones first**; create zone → appears at bottom with count 0; after link save, order updates on next GET | FE / QA |
