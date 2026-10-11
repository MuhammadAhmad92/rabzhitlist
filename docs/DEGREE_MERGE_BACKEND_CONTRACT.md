# Backend contract: Degree catalog merge

**Status:** Backend **Implemented** (preview + merge, FK rewrite on visible educations, D1 usage recompute, DM10 preview parity). **Merge smoke: QA verified** (§9).

**Roles:** Super Admin `0`, Admin `1`. Recruiter `2` → **403** on merge routes. UI hides Catalog nav for Recruiter.

**Scope (v1):** Degree catalog only (`degrees`). Rewrites **`candidate_educations.degree_id`** only.

**Related docs:**

| Doc | Notes |
|-----|--------|
| `DEGREES_USAGE_COUNT_BACKEND_CONTRACT.md` | **D1** formula; merge recomputes survivor **`usageCount`** (**DM10**). |
| `TIME_SUPPORT_ZONE_MERGE_BACKEND_CONTRACT.md` | UI/API template (preview/merge, preview parity). |

**Out of scope v1:** Audit log, undo, suggested duplicates (v2).

---

## 1. Locked product decisions

| # | Topic | Decision |
|---|--------|----------|
| **DM1** | Cardinality | Many **source** degree ids → one **target** per request. |
| **DM2** | Sources | **`sourceDegreeIds`** required, **≥ 1** unique id. |
| **DM3** | Target vs sources | Target id **must not** be in `sourceDegreeIds` → **400**. |
| **DM4** | Target resolution | **`existing`:** given id. **`new`:** trim name; reuse row by name (same as `POST /api/degrees`, citext); else create with **`usageCount: 0`**. |
| **DM5** | Source rows | **Hard-delete** source `degrees` after rewrite. |
| **DM6** | Rewrite | **`UPDATE candidate_educations SET degree_id = target`** where `degree_id IN sources` and row is **visible** per **D2** (`candidate_id IS NOT NULL`, join `candidates.deleted_at IS NULL`). Each row has at most one `degree_id` — **no junction dedupe** (unlike TSZ). |
| **DM7** | Preview | Required; same body as merge. |
| **DM8** | Counters | Recompute **`usageCount`** (D1) for survivor in same transaction; clear materialized counts for deleted source ids. |
| **DM9** | UI | Clients refetch **`GET /api/degrees`** after merge. |
| **DM10** | Preview parity | Same body → preview **`impact`** + **`usageCountAfter`** = merge **`impact`** + **`target.usageCount`**. |
| **DM11** | Missing ids | Unknown source/target id → **404**; validation → **400**. |

---

## 2. API surface

| Method | Path | Who |
|--------|------|-----|
| **POST** | `/api/degrees/merge/preview` | Admin, Super Admin |
| **POST** | `/api/degrees/merge` | Admin, Super Admin |

---

## 3. Request body

```jsonc
{
  "sourceDegreeIds": [6, 12],
  "target": { "mode": "existing", "degreeId": 14 }
}
```

```jsonc
{
  "sourceDegreeIds": [6],
  "target": { "mode": "new", "name": "Bachelor of Science" }
}
```

| Field | Rules |
|-------|--------|
| `sourceDegreeIds` | Required, unique, ≥ 1; each exists or **404** |
| `target.degreeId` | Required when `mode: "existing"` |
| `target.name` | Required when `mode: "new"`; trim; empty → **400** |

---

## 4. Merge algorithm (single transaction)

1. Resolve target id (**DM4**).
2. Validate sources exist.
3. Count impact on visible education rows (§6).
4. **UPDATE** educations per **DM6**.
5. **Hard-delete** source degrees (**DM5**).
6. **Rebuild** survivor **`usageCount`** (**DM8**).

---

## 5. Preview / merge response

```jsonc
{
  "target": {
    "degreeId": 14,
    "name": "Bachelor of Science",
    "usageCountAfter": 6
  },
  "sources": [
    { "degreeId": 6, "name": "BSc", "usageCountBefore": 2 }
  ],
  "impact": {
    "distinctCandidatesAffected": 2,
    "distinctEducationRowsAffected": 3,
    "distinctEducationsAffected": 3
  }
}
```

**`distinctEducationsAffected`** is a **legacy alias** (same value as **`distinctEducationRowsAffected`**). Frontend reads **`distinctEducationRowsAffected`** only.

Merge response adds **`mergedSourceIds`** and uses **`target.usageCount`** (not `usageCountAfter`). **`impact`** shape unchanged (**DM10**).

Preview runs merge in a transaction and **rolls back** (same pattern as TSZ **T10**).

---

## 6. Impact definitions

| Field | Meaning |
|-------|---------|
| **`distinctEducationRowsAffected`** | Visible `candidate_educations` rows with `degree_id` in `sourceDegreeIds` (will be updated). |
| **`distinctCandidatesAffected`** | Distinct `candidate_id` among those rows. |

---

## 7. Tests (minimum)

| Case | Expected |
|------|----------|
| Merge source with 3 education rows | 3 rewrites; survivor usageCount += 3 (D1) |
| Soft-deleted candidate’s educations | Not counted or rewritten |
| Preview then merge same body | **DM10** |
| Recruiter | **403** |

---

## 8. Frontend integration (this repo)

| Piece | Location |
|-------|----------|
| Route | `/catalog/merge-degrees` |
| UI | `src/components/degree-merge-page-client.tsx` |
| API | `src/lib/services/degree-merge-api.ts` |
| Nav | Catalog → **Merge degrees** |

| Layer | Status |
|-------|--------|
| **Frontend** | **Implemented** — merge page, API client, Catalog nav |
| **Backend** | **Implemented** — `DegreeMergeRepository`, merge service, controller routes, DI; no new migration |

### Schema note (CASCADE) — locked product decision

`candidate_educations` → `degrees` uses **ON DELETE CASCADE**.

| Case | Behavior |
|------|----------|
| **Visible** educations (`candidate_id` set, candidate not soft-deleted) | **Rewritten** to survivor (`degree_id` **DM6**). |
| **Orphan** educations (e.g. soft-deleted candidate still holding `degree_id` = source) | **Not rewritten** (D2 visibility). When the **source** degree row is **hard-deleted**, FK **CASCADE** may **delete** those education rows. |

**Accepted (v1):** Allow CASCADE — data on soft-deleted candidates may be lost when merging away a source degree they still reference. **No backend null-before-delete** unless product revisits after merge smoke (**v2** track only if requirements change).

**QA (expected pass):** Orphan educations on soft-deleted candidates **removed by CASCADE** when the source degree is hard-deleted is **correct**, not a defect. Verified in merge smoke (§9 QA record).

Cross-read: `MAJOR_MERGE_BACKEND_CONTRACT.md` (parallel on `major_id`).

---

## 9. Post-deploy smoke test (Admin)

**Status:** **QA verified** (Admin UI + API, post-backend deploy).

1. **Catalog → Merge degrees** — pick ≥1 source, existing or new target.
2. **Preview** — note `usageCountAfter`, `impact`, source `usageCountBefore`.
3. **Confirm merge** — `mergedSourceIds` match sources; `target.usageCount` equals preview `usageCountAfter`; `impact` matches preview (**DM10**).
4. **GET `/api/degrees`** — sources gone; survivor name/count/sort correct.
5. **Create Candidate / candidate details** — education degree combobox shows **survivor** only for merged names.
6. If env has **orphan** educations on soft-deleted candidates still referencing a source — after confirm, those rows **removed by CASCADE** on source hard-delete is an **expected pass** (§8 schema note).

If preview and merge disagree on counts or impact, capture both request/response JSON for **DM10** tracing.

### QA record (verified)

| Scenario | Source → target | DM10 | Notes |
|----------|-----------------|------|--------|
| Admin merge smoke | ≥1 source degree → existing or **`new`** target | Preview `usageCountAfter` / `impact` = merge `target.usageCount` / `impact` | Steps 1–5; sources absent from GET; comboboxes show survivor |
| CASCADE orphans (when present) | Source catalog row hard-deleted after merge | N/A | Non-visible educations referencing source **deleted** — **expected pass**, not a defect |

Cross-read: `DEGREES_USAGE_COUNT_BACKEND_CONTRACT.md`.
