# Backend Contract: `usageCount` on Major Catalog (`GET /api/majors`)

Handoff for the **backend agent** implementing **`usageCount`** on the major lookup catalog so the Next.js frontend can sort education comboboxes and filters by popularity (same pattern as degrees and time support zones).

**Prerequisite for (later):** `MAJOR_MERGE_BACKEND_CONTRACT.md` (preview `usageCountBefore` / `usageCountAfter`).

**Frontend reference:** `major-lookup.ts`, `majors-degrees-api.ts` (see §9).

**Related:** `MAJOR_MERGE_BACKEND_CONTRACT.md` — preview uses `usageCountBefore` / `usageCountAfter`.

---

## 1. Goal

Extend **`GET /api/majors`** so each row includes non-negative **`usageCount`**, reflecting **candidate education rows** that reference the major.

Frontend uses **`usageCount` only for dropdown ordering** — not filter badge text or combobox labels.

---

## 2. Locked product decisions

| # | Topic | Decision |
|---|--------|----------|
| **M1** | **Global formula** | `usageCount(M)` = **count of distinct candidate education rows** where `major_id = M`. Same candidate with **two** education rows both using **M** contributes **2**. (**Same rule as degrees — D1.**) |
| **M2** | **Visibility** | Same as **D2** in `DEGREES_USAGE_COUNT_BACKEND_CONTRACT.md` (`candidate_educations`, non-null `candidate_id`, `candidates.deleted_at IS NULL`; education hard-delete only). |
| **M3** | **Zero usage** | Majors with `usageCount = 0` **remain in the response** and sort **last**. |
| **M4** | **Sort order** | Primary: **`usageCount DESC`**. Tie-break: **`name ASC`** (case-insensitive). |
| **M5** | **Caching** | **Materialized** `usage_count` on `majors`, synchronous on education `major_id` writes; nightly rebuild. |
| **M6** | **POST create** | **`POST /api/majors`** response includes **`usageCount: 0`**. |
| **M7** | **Scoped lists** | **N/A** |
| **M8** | **Out of scope** | Degrees (separate contract), catalog merge (later). |

---

## 3. API surface

| Method | Path | Change |
|--------|------|--------|
| **GET** | `/api/majors` | Add `usageCount` per row; pre-sort per **M4** |
| **POST** | `/api/majors` | Response `{ id, name, usageCount: 0 }` |
| **POST** | `/api/majors/rebuild-usage-counts` | Admin + Super Admin: recompute all majors |

**Auth for rebuild:** Super Admin `0`, Admin `1`. Recruiter → **403**.

### Response shape (list + create)

```jsonc
[
  { "id": 1, "name": "Computer Science", "usageCount": 28 }
]
```

| Field | Type | Rules |
|-------|------|--------|
| `id` | `long` | Catalog id |
| `name` | `string` | Trimmed |
| `usageCount` | `int` | **≥ 0** |

PascalCase tolerance optional — FE normalizes both.

---

## 3.1 Domain model (this repo — locked)

Same as **`DEGREES_USAGE_COUNT_BACKEND_CONTRACT.md` §3.1** — table `candidate_educations`, entity `CandidateEducation`, nested under `/api/candidates/{candidateId}/educations`.

---

## 4. Global `usageCount` definition (locked — M1, M2)

```text
usageCount(M) =
  COUNT(*)
    FROM candidate_educations edu
    INNER JOIN candidates c ON c.id = edu.candidate_id
    WHERE edu.major_id = M
      AND edu.candidate_id IS NOT NULL
      AND c.deleted_at IS NULL
```

**Null `major_id`:** Rows with `major_id IS NULL` do not contribute to any catalog row.

---

## 5. Write hooks (M5)

| Event | Action |
|-------|--------|
| Insert/update/delete **`candidate_educations`** (`major_id` set, cleared, or changed) | **`RebuildForMajor(majorId)`** for old and new ids |
| **Hard delete** education row | Rebuild former `major_id` if any |
| **Soft delete** candidate | Rebuild all `major_id` values on that candidate’s education rows |
| Bulk import / migration | **`RebuildAllMajorUsageCounts()`** |

---

## 6. Rebuild / backfill

| Operation | When |
|-----------|------|
| **`RebuildAllMajorUsageCounts()`** | Migration backfill; nightly drift |
| **`POST /api/majors/rebuild-usage-counts`** | On-demand. **200** when complete. |

---

## 7. Tests (minimum)

| Case | Expected |
|------|----------|
| Major on 4 education rows | `usageCount = 4` |
| Educations on soft-deleted candidate / null `candidate_id` | **Not counted** |
| Zero links | `usageCount = 0`, still in GET |
| POST create major | `usageCount: 0` |
| Rebuild POST | All rows match live aggregate |

---

## 8. Status

| Layer | Status |
|-------|--------|
| **Backend** | **Implemented** — `usage_count` on `majors`, GET/POST `usageCount`, write hooks (M5), nightly reconciliation, migration `20261008180000_AddDegreeMajorUsageCounts`. After deploy: apply migration; optionally `POST /api/majors/rebuild-usage-counts`. |
| **Frontend** | **Implemented** — `major-lookup.ts`, `majors-degrees-api.ts`, education comboboxes + candidates filter (M4). |

### Post-deploy smoke (Admin / QA)

1. **GET `/api/majors`** — `usageCount` present; M4 sort.
2. **Create Candidate → Education** — major combobox usage order; new major at bottom.
3. **Candidates filter** — major multi-select order.
4. **Candidate details** — major combobox order.
5. Save education with major → count/order updates on next GET.

---

## 9. Frontend integration

| File | Purpose |
|------|---------|
| `src/lib/utils/major-lookup.ts` | Normalize, sort M4, `buildMajorComboboxOptions`, filter helpers |
| `src/lib/services/majors-degrees-api.ts` | `fetchMajors()`, `createMajor()`, `rebuildMajorUsageCounts()` |

Consumers: `candidate-creation-dialog.tsx`, `candidate-details-modal.tsx`, `candidates-filter-dialog.tsx`, `candidates-page-client.tsx`.

Cross-read: `DEGREES_USAGE_COUNT_BACKEND_CONTRACT.md`.
