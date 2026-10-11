# Backend Contract: `usageCount` on Country Catalog (`GET /api/countries`)

Handoff for the **backend agent** implementing **`usageCount`** on the country lookup catalog so the Next.js frontend can sort country comboboxes and filters by popularity (same pattern as degrees, majors, and time support zones).

**Prerequisite for (later):** `COUNTRY_MERGE_BACKEND_CONTRACT.md` (preview `usageCountBefore` / `usageCountAfter`).

**Frontend reference (today — no `usageCount` yet):**

| File | Purpose |
|------|---------|
| `src/lib/types/country.ts` | `{ id, name }` |
| `src/lib/services/countries-api.ts` | `fetchCountries()`, `createCountry()` → **`GET/POST /api/countries`** |

**Planned FE (after backend ships):** `country-lookup.ts` (normalize + sort), extend `countries-api.ts`, wire all country catalog consumers.

---

## 1. Goal

Extend **`GET /api/countries`** so each row includes non-negative **`usageCount`**, reflecting **universities** and **employers** (via **employer locations**) that reference the country.

Frontend uses **`usageCount` only for dropdown ordering** — not filter badge text or combobox labels.

**In scope for counts:** **`universities.country_id`** and **`employer_locations.country_id`** only (v1).

---

## 2. Locked product decisions

| # | Topic | Decision |
|---|--------|----------|
| **CN1** | **Global formula** | `usageCount(C)` = **`distinct_visible_universities(C)`** + **`distinct_visible_employers(C)`** (two additive buckets, analogous to TSZ **Z1**). |
| **CN2** | **Visibility** | **Universities:** count only rows with **`country_id = C`**, **`country_id IS NOT NULL`**, and **`universities.deleted_at IS NULL`** (match list/filter active set). **Employers:** count each employer **at most once** per country if it has **≥ 1** **`employer_locations`** row with **`country_id = C`** and parent **`employers.deleted_at IS NULL`**. Soft-deleted universities/employers **do not** contribute. |
| **CN3** | **Zero usage** | Countries with `usageCount = 0` **remain in the response** and sort **last**. |
| **CN4** | **Sort order** | Primary: **`usageCount DESC`**. Tie-break: **`name ASC`** (case-insensitive). |
| **CN5** | **Caching** | **Materialized** `usage_count` on `countries` (or side table), updated **synchronously on write** when university `country_id` or employer location `country_id` changes; **nightly full rebuild** for drift. |
| **CN6** | **POST create** | **`POST /api/countries`** response includes **`usageCount: 0`**. |
| **CN7** | **Scoped lists** | **N/A** — single global catalog. |
| **CN8** | **Out of scope** | Candidates, education campuses, merge admin UI (separate merge contract), any FK outside universities + employer locations. |

---

## 3. API surface

| Method | Path | Change |
|--------|------|--------|
| **GET** | `/api/countries` | Add `usageCount` per row; pre-sort per **CN4** (optional — FE re-sorts if absent) |
| **POST** | `/api/countries` | Response `{ id, name, usageCount: 0 }` |
| **POST** | `/api/countries/rebuild-usage-counts` | Admin + Super Admin: recompute all countries from source tables |

**Auth for rebuild:** Super Admin `0`, Admin `1`. Recruiter → **403**.

### Response shape (list + create)

```jsonc
[
  { "id": 840, "name": "United States", "usageCount": 12 }
]
```

| Field | Type | Rules |
|-------|------|--------|
| `id` | `long` / `smallint` | Catalog id (match existing API) |
| `name` | `string` | Trimmed |
| `usageCount` | `int` | **≥ 0** |

PascalCase tolerance optional (`UsageCount`) — FE normalizes both.

---

## 4. Global `usageCount` definition (locked — CN1, CN2)

```text
distinct_visible_universities(C) =
  COUNT(*)
    FROM universities u
    WHERE u.country_id = C
      AND u.deleted_at IS NULL

distinct_visible_employers(C) =
  COUNT(DISTINCT el.employer_id)
    FROM employer_locations el
    INNER JOIN employers e ON e.id = el.employer_id
    WHERE el.country_id = C
      AND e.deleted_at IS NULL

usageCount(C) = distinct_visible_universities(C) + distinct_visible_employers(C)
```

**Notes:**

- One employer with **three** locations in country **C** contributes **1** to **`distinct_visible_employers(C)`**, not 3.
- **`distinct_visible_universities(C)`** is a row count (each university has at most one `country_id`).
- Align **`deleted_at`** column names with existing employer/university queries if the codebase uses mixed casing (`DeletedAt` vs `deleted_at`).

---

## 5. Write hooks (CN5)

| Event | Action |
|-------|--------|
| University **create** / **update** (`country_id` set, cleared, or changed) | **`RebuildForCountry(countryId)`** for old and new ids when changed |
| Employer location **create** / **update** / **hard delete** (`country_id` changed or row removed) | Rebuild affected **`country_id`** value(s) |
| Employer **soft delete** (`deleted_at` set) | Rebuild all **`country_id`** values on that employer’s locations |
| Employer **restore** / hard-delete (if applicable) | Rebuild affected country ids |
| University **soft delete** / restore | Rebuild former `country_id` if any |
| Bulk import / migration | **`RebuildAllCountryUsageCounts()`** once at end |

**Acceptance:** After saving a university country or an employer location, the next **`GET /api/countries`** shows updated counts and sort order without waiting for nightly job.

---

## 6. Rebuild / backfill

| Operation | When |
|-----------|------|
| **`RebuildAllCountryUsageCounts()`** | Migration backfill; nightly drift repair |
| **`POST /api/countries/rebuild-usage-counts`** | On-demand post-deploy / support. **200** when complete. |

---

## 7. Tests (minimum)

| Case | Expected |
|------|----------|
| Country on 2 active universities + 3 distinct employers (one employer has 2 locations in C) | `usageCount = 2 + 3 = 5` |
| University or employer soft-deleted | Its links **not counted** |
| University with `country_id IS NULL` | Does not contribute to any country |
| Zero links | `usageCount = 0`, still in GET list |
| After location/university save | GET order updates without rebuild POST |
| POST create country | `usageCount: 0` |
| Rebuild POST | All rows match live aggregate |

---

## 8. Status

| Layer | Status |
|-------|--------|
| **Backend** | **Implemented** — `usage_count` on `countries`, GET/POST `usageCount`, write hooks (CN5), nightly reconciliation, migration `20261009180000_AddCountryUsageCount`. After deploy: apply migration; optionally `POST /api/countries/rebuild-usage-counts`. |
| **Frontend** | **Implemented** — `country-lookup.ts`, `countries-api.ts` (see §9) |

### Post-deploy smoke (Admin / QA)

**Status:** **QA verified** (GET includes `usageCount`, **CN4** sort; verified with country merge smoke §9 in `COUNTRY_MERGE_BACKEND_CONTRACT.md`).

1. **GET `/api/countries`** — rows include `usageCount`; highest usage first (**CN4**).
2. **Universities** create/edit — country combobox order matches GET.
3. **Employers** — location country picker order matches GET.
4. **Candidates / employers / universities filters** — country multi-select order matches GET.
5. Change a university’s country or add an employer location → refresh → affected countries move on next GET.

---

## 9. Frontend integration (this repo)

| File | Purpose |
|------|---------|
| `src/lib/utils/country-lookup.ts` | Normalize, sort **CN4**, combobox/filter helpers |
| `src/lib/services/countries-api.ts` | `fetchCountries()`, `createCountry()`, `rebuildCountryUsageCounts()` |

**Consumers (non-exhaustive):** `university-creation-dialog.tsx`, `university-details-modal.tsx`, `employer-details-modal.tsx`, `employers-page-client.tsx`, `universities-page-client.tsx`, `universities-filter-dialog.tsx`, `candidates-page-client.tsx`, `candidates-filter-dialog.tsx`, `candidate-details-modal.tsx`, `mentors-page-client.tsx`, office-location create dialogs.

Cross-read: `COUNTRY_MERGE_BACKEND_CONTRACT.md`.
