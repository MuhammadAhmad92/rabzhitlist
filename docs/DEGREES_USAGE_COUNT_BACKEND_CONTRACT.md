# Backend Contract: `usageCount` on Degree Catalog (`GET /api/degrees`)

Handoff for the **backend agent** implementing **`usageCount`** on the degree lookup catalog so the Next.js frontend can sort education comboboxes and filters by popularity (same pattern as time support zones and tech stacks).

**Prerequisite for (later):** `DEGREE_MERGE_BACKEND_CONTRACT.md` (preview `usageCountBefore` / `usageCountAfter`).

**Frontend reference:** `degree-lookup.ts`, `majors-degrees-api.ts` (see §9).

**Related:** `DEGREE_MERGE_BACKEND_CONTRACT.md` — preview uses `usageCountBefore` / `usageCountAfter`.

---

## 1. Goal

Extend **`GET /api/degrees`** so each row includes non-negative **`usageCount`**, reflecting **candidate education rows** that reference the degree.

Frontend uses **`usageCount` only for dropdown ordering** — not filter badge text or combobox labels.

---

## 2. Locked product decisions

| # | Topic | Decision |
|---|--------|----------|
| **D1** | **Global formula** | `usageCount(D)` = **count of rows** in `candidate_educations` where `degree_id = D` and visibility rules (**D2**) hold. One row = one education (`CandidateEducation.id`). Same candidate with **two** rows both using **D** contributes **2**. |
| **D2** | **Visibility** | **Education rows:** no soft-delete on `candidate_educations` (hard delete only via `DELETE /api/candidates/{id}/educations/{id}`). **Candidates:** count only rows with **`candidate_id IS NOT NULL`** joined to **`candidates`** where **`deleted_at IS NULL`** (matches list/filter behavior). Soft-deleted candidates keep education rows in DB but those rows **do not** count. |
| **D3** | **Zero usage** | Degrees with `usageCount = 0` **remain in the response** and sort **last**. |
| **D4** | **Sort order** | Primary: **`usageCount DESC`**. Tie-break: **`name ASC`** (case-insensitive). |
| **D5** | **Caching** | **Materialized** `usage_count` on `degrees` (or side table), updated **synchronously on write** when education `degree_id` changes; **nightly full rebuild** for drift. |
| **D6** | **POST create** | **`POST /api/degrees`** response includes **`usageCount: 0`**. |
| **D7** | **Scoped lists** | **N/A** — single global catalog. |
| **D8** | **Out of scope** | Majors (separate contract), catalog merge (later), universities. |

---

## 3. API surface

| Method | Path | Change |
|--------|------|--------|
| **GET** | `/api/degrees` | Add `usageCount` per row; pre-sort per **D4** (optional — FE re-sorts if absent) |
| **POST** | `/api/degrees` | Response `{ id, name, usageCount: 0 }` |
| **POST** | `/api/degrees/rebuild-usage-counts` | Admin + Super Admin: recompute all degrees from source tables |

**Auth for rebuild:** Super Admin `0`, Admin `1`. Recruiter → **403**.

### Response shape (list + create)

```jsonc
[
  { "id": 1, "name": "Bachelor of Science", "usageCount": 42 }
]
```

| Field | Type | Rules |
|-------|------|--------|
| `id` | `long` | Catalog id |
| `name` | `string` | Trimmed |
| `usageCount` | `int` | **≥ 0** |

PascalCase tolerance optional (`UsageCount`) — FE normalizes both.

---

## 3.1 Domain model (this repo — locked)

| Layer | Name |
|--------|------|
| **PostgreSQL** | `candidate_educations` |
| **EF** | `CandidateEducation` / `CandidateEducations`; `Candidate.CandidateEducations` |
| **PK** | `candidate_educations.id` (`bigint`) — one row = one education |
| **Nested API** | `GET/POST /api/candidates/{candidateId}/educations`; `GET/PUT/DELETE …/educations/{id}` |

There is **no** `CandidateUniversity` / `candidate_universities` table. Older docs that say “CandidateUniversity” mean the same **grain** as `CandidateEducation`.

**Education delete:** hard delete (row removed). **Candidate delete:** soft delete (`candidates.deleted_at`); education rows remain. Nested education GET does not filter `deleted_at` on the parent, but **catalog usage counts must** (D2).

---

## 4. Global `usageCount` definition (locked — D1, D2)

```text
usageCount(D) =
  COUNT(*)
    FROM candidate_educations edu
    INNER JOIN candidates c ON c.id = edu.candidate_id
    WHERE edu.degree_id = D
      AND edu.candidate_id IS NOT NULL
      AND c.deleted_at IS NULL
```

**Null `degree_id`:** Rows with `degree_id IS NULL` do not contribute to any catalog row.

---

## 5. Write hooks (D5)

| Event | Action |
|-------|--------|
| Insert/update/delete **`candidate_educations`** (`degree_id` set, cleared, or changed) | **`RebuildForDegree(degreeId)`** for old and new degree ids when changed |
| **Hard delete** education row | Rebuild former `degree_id` if any |
| **Soft delete** candidate (`deleted_at` set) | Rebuild all `degree_id` values on that candidate’s education rows (counts drop) |
| Restore / hard-delete candidate (if applicable) | Rebuild affected degree ids |
| Bulk import / migration | **`RebuildAllDegreeUsageCounts()`** once at end |

**Acceptance:** After saving a candidate education with a degree, the next **`GET /api/degrees`** shows updated counts and sort order without waiting for nightly job.

---

## 6. Rebuild / backfill

| Operation | When |
|-----------|------|
| **`RebuildAllDegreeUsageCounts()`** | Migration backfill; nightly drift repair |
| **`POST /api/degrees/rebuild-usage-counts`** | On-demand post-deploy / support. **200** when complete. |

---

## 7. Tests (minimum)

| Case | Expected |
|------|----------|
| Degree on 5 education rows (3 candidates, one with 2 rows) | `usageCount = 5` |
| Education rows on soft-deleted candidate | **Not counted** |
| Education row with `candidate_id IS NULL` | **Not counted** |
| Zero links | `usageCount = 0`, still in GET list |
| After education save | GET order updates without rebuild POST |
| POST create degree | `usageCount: 0` |
| Rebuild POST | All rows match live aggregate |

---

## 8. Status

| Layer | Status |
|-------|--------|
| **Backend** | **Implemented** — `usage_count` on `degrees`, GET/POST `usageCount`, write hooks (D5), nightly reconciliation, migration `20261008180000_AddDegreeMajorUsageCounts`. After deploy: apply migration; optionally `POST /api/degrees/rebuild-usage-counts`. |
| **Frontend** | **Implemented** — `degree-lookup.ts`, `majors-degrees-api.ts`, education comboboxes + candidates filter (D4). |

### Post-deploy smoke (Admin / QA)

1. **GET `/api/degrees`** — rows include `usageCount`; highest usage first (D4).
2. **Create Candidate → Education** — degree combobox shows most-used degrees first; **+ Add** new degree → `usageCount 0`, sorts last.
3. **Candidates filter** — degree name multi-select order matches GET.
4. **Candidate details** — inline education degree combobox same order.
5. Save education with a degree → refresh lookups → that degree moves up on next GET.

---

## 9. Frontend integration

| File | Purpose |
|------|---------|
| `src/lib/utils/degree-lookup.ts` | Normalize, sort D4, `buildDegreeComboboxOptions`, filter helpers |
| `src/lib/services/majors-degrees-api.ts` | `fetchDegrees()`, `createDegree()`, `rebuildDegreeUsageCounts()` |

Consumers: `candidate-creation-dialog.tsx`, `candidate-details-modal.tsx`, `candidates-filter-dialog.tsx`, `candidates-page-client.tsx`.

Cross-read: `MAJORS_USAGE_COUNT_BACKEND_CONTRACT.md`.
