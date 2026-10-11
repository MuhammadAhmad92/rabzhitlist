# Backend contract: Major catalog merge

**Status:** Backend **Implemented** (preview + merge, FK rewrite on visible educations, M1 usage recompute, MM10 preview parity). **Merge smoke: QA verified** (§8).

**Roles:** Super Admin `0`, Admin `1`. Recruiter `2` → **403** on merge routes.

**Scope (v1):** Major catalog only (`majors`). Rewrites **`candidate_educations.major_id`** only.

**Related docs:**

| Doc | Notes |
|-----|--------|
| `MAJORS_USAGE_COUNT_BACKEND_CONTRACT.md` | **M1** formula; merge recomputes survivor **`usageCount`** (**MM10**). |
| `DEGREE_MERGE_BACKEND_CONTRACT.md` | Parallel shape on `degree_id`. |

**Out of scope v1:** Audit log, undo, suggested duplicates (v2).

---

## 1. Locked product decisions

| # | Topic | Decision |
|---|--------|----------|
| **MM1** | Cardinality | Many source major ids → one target. |
| **MM2** | Sources | **`sourceMajorIds`**, ≥ 1 unique. |
| **MM3** | Target not in sources | **400** |
| **MM4** | Target **`new`** | Same as **`POST /api/majors`** name reuse / create. |
| **MM5** | Sources | Hard-delete after rewrite. |
| **MM6** | Rewrite | **`UPDATE candidate_educations SET major_id = target`** where `major_id IN sources`, visible per **M2** (same visibility as degree merge / usage count). |
| **MM7–MM9** | Preview, counters, refetch | Same as **DM7–DM9** |
| **MM10** | Preview parity | Same as **DM10** |
| **MM11** | **404** / **400** | Same as **DM11** |

---

## 2. API surface

| Method | Path |
|--------|------|
| **POST** | `/api/majors/merge/preview` |
| **POST** | `/api/majors/merge` |

---

## 3. Request body

```jsonc
{
  "sourceMajorIds": [3, 8],
  "target": { "mode": "existing", "majorId": 1 }
}
```

```jsonc
{
  "sourceMajorIds": [3],
  "target": { "mode": "new", "name": "Computer Science" }
}
```

---

## 4–6. Algorithm, response, impact

Same structure as **`DEGREE_MERGE_BACKEND_CONTRACT.md`**, substituting **`majorId`**, **`sourceMajorIds`**, **`major_id`**, and **`GET /api/majors`**.

```jsonc
"impact": {
  "distinctCandidatesAffected": 2,
  "distinctEducationRowsAffected": 3,
  "distinctEducationsAffected": 3
}
```

**`distinctEducationsAffected`** — legacy alias (same as **`distinctEducationRowsAffected`**).

---

## 7. Frontend integration

| Piece | Location |
|-------|----------|
| Route | `/catalog/merge-majors` |
| UI | `src/components/major-merge-page-client.tsx` |
| API | `src/lib/services/major-merge-api.ts` |
| Nav | Catalog → **Merge majors** |

| Layer | Status |
|-------|--------|
| **Frontend** | **Implemented** — merge page, API client, Catalog nav |
| **Backend** | **Implemented** — `MajorMergeRepository`, merge service, controller routes, DI; no new migration |

### Schema note (CASCADE) — locked product decision

Same as **`DEGREE_MERGE_BACKEND_CONTRACT.md` §8** — **`major_id`** orphan rows on soft-deleted candidates are **not rewritten**; **CASCADE** on source major hard-delete **may delete** those education rows.

**Accepted (v1):** Allow CASCADE for **both** degree and major merge. Revisit only if product changes (**v2**).

**QA (expected pass):** Orphan major rows CASCADE-deleted on source hard-delete is **correct**; verified in merge smoke (§8 QA record).

---

## 8. Post-deploy smoke test (Admin)

**Status:** **QA verified** (Admin UI + API, post-backend deploy).

1. **Catalog → Merge majors** — pick ≥1 source, existing or new target.
2. **Preview** — note `usageCountAfter`, `impact`, source `usageCountBefore`.
3. **Confirm merge** — `mergedSourceIds` match sources; `target.usageCount` equals preview `usageCountAfter`; `impact` matches preview (**MM10**).
4. **GET `/api/majors`** — sources gone; survivor name/count/sort correct.
5. **Create Candidate / candidate details** — education major combobox shows **survivor** only for merged names.
6. If env has **orphan** educations on soft-deleted candidates still referencing a source major — CASCADE removal after source hard-delete is an **expected pass** (§7 schema note).

If preview and merge disagree on counts or impact, capture both request/response JSON for **MM10** tracing.

### QA record (verified)

| Scenario | Source → target | MM10 | Notes |
|----------|-----------------|------|--------|
| Admin merge smoke | ≥1 source major → existing or **`new`** target | Preview `usageCountAfter` / `impact` = merge `target.usageCount` / `impact` | Steps 1–5; sources absent from GET; comboboxes show survivor |
| CASCADE orphans (when present) | Source catalog row hard-deleted after merge | N/A | Non-visible educations referencing source **deleted** — **expected pass**, not a defect |

Cross-read: `MAJORS_USAGE_COUNT_BACKEND_CONTRACT.md`.
