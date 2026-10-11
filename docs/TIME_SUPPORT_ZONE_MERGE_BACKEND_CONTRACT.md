# Backend contract: Time support zone catalog merge

**Status:** Backend **Implemented** (preview + merge routes, PK-safe junction rewrite, Z1 usage recompute, T10 preview parity).

**Roles:** Super Admin `0`, Admin `1`. Recruiter `2` → **403** on merge routes. UI hides Catalog nav for Recruiter.

**Scope (v1):** Time support zone catalog only (`time_support_zones`). No projects, tech stacks, or other domains.

**Related docs:**

| Doc | Notes |
|-----|--------|
| `TIME_SUPPORT_ZONES_USAGE_COUNT_BACKEND_CONTRACT.md` | Global **Z1** formula; merge recomputes survivor **`usageCount`** (Option B — **T10**). |
| `TECH_STACK_MERGE_BACKEND_CONTRACT.md` | Structural template (preview/merge, PK-safe dedupe, preview parity). |

**Out of scope v1:** Audit log, undo, suggested-duplicate discovery (v2).

---

## 1. Locked product decisions

| # | Topic | Decision |
|---|--------|----------|
| **T1** | Cardinality | One operation: **many source catalog ids → one target** per request. |
| **T2** | Sources | **`sourceTimeSupportZoneIds`** required, **≥ 1** id. |
| **T3** | Target vs sources | Resolved target id **must not** appear in `sourceTimeSupportZoneIds` → **400**. |
| **T4** | Target resolution | **`existing`:** use given catalog id. **`new`:** trim name; if a catalog row with that name already exists, **reuse** that id (same idempotency as `POST /api/timesupportzones`). Otherwise create row with **`usageCount: 0`**. No optional metadata on create (catalog is **id + name** only). |
| **T5** | Source rows | **Hard-delete** source `time_support_zones` rows after successful rewrite. |
| **T6** | Dedupe | **At most one link** per parent + target in each junction table (§5.1.1). PK-safe per parent (composite PK includes `time_support_zone_id`). |
| **T7** | Preview | **Required in v1:** read-only preview with the **same request body** as merge (§3). |
| **T8** | Counters | Recompute **global** materialized **`usageCount`** (Z1) for the survivor in the **same transaction** as merge. Drop counters for deleted source ids. |
| **T9** | Filters / UI | Clients refetch `GET /api/timesupportzones` after merge. |
| **T10** | Preview accuracy | For the same request body, **`impact`** and **`usageCountAfter`** on preview **must equal** post-merge **`impact`** and **`target.usageCount`** (M12 parity). |
| **T11** | Missing ids | Unknown or already-deleted **source** or **target** catalog id → **404**. Invalid JSON / business rules → **400** (§3.1). |

---

## 2. API surface

| Method | Path | Who | Effect |
|--------|------|-----|--------|
| **POST** | `/api/timesupportzones/merge/preview` | Super Admin, Admin | Read-only impact (§6); **T10** |
| **POST** | `/api/timesupportzones/merge` | Super Admin, Admin | Execute merge (§5) |

Unauthenticated → **401**. Recruiter → **403**:

```json
{
  "status": 403,
  "message": "You do not have permission to perform this action."
}
```

---

## 3. Request body (preview and merge)

```jsonc
{
  "sourceTimeSupportZoneIds": [2, 10],
  "target": {
    "mode": "existing",
    "timeSupportZoneId": 1
  }
}
```

```jsonc
{
  "sourceTimeSupportZoneIds": [2, 10],
  "target": {
    "mode": "new",
    "name": "USA"
  }
}
```

| Field | Type | Rules |
|-------|------|--------|
| `sourceTimeSupportZoneIds` | `long[]` | Required, length ≥ 1. **Unique** ids. Each id must exist → else **404** (T11). |
| `target.mode` | `"existing"` \| `"new"` | Required. |
| `target.timeSupportZoneId` | `long` | Required when `mode` is `"existing"`. Must exist → else **404**. Must not be in `sourceTimeSupportZoneIds` → **400**. |
| `target.name` | `string` | Required when `mode` is `"new"`. Trim; empty → **400**. Resolve or create (§4). |

### 3.1 Validation errors (**400**)

- Missing/empty `sourceTimeSupportZoneIds`
- Duplicate ids in `sourceTimeSupportZoneIds`
- Resolved or explicit target id listed in `sourceTimeSupportZoneIds`
- Invalid `target.mode` or missing required target fields
- `target.name` whitespace-only

### 3.2 Not found (**404**) — T11

- Any id in `sourceTimeSupportZoneIds` not found
- `target.timeSupportZoneId` not found when `mode` is `"existing"`

---

## 4. Target resolution (`mode: "new"`)

1. Trim `name`.
2. If catalog already has that name (**same rules as `POST /api/timesupportzones`**), set `targetId` to that row’s id.
3. Else insert new `time_support_zones` row (`usageCount` / `usage_count` = 0).
4. If `targetId ∈ sourceTimeSupportZoneIds` → **400** (T3).
5. Proceed with merge into `targetId`.

---

## 5. Merge algorithm (single transaction)

1. Resolve `targetId` (§4).
2. Validate every source id exists (**404** if not).
3. **Rewrite + dedupe (T6)** junction rows per §5.1.1.
4. **Hard-delete** source catalog rows (T5).
5. Recompute **`usageCount`** for `targetId` only (Z1); remove materialized values for deleted source ids if stored separately.

### 5.1 Junction tables

| Table | Parent key | Composite PK (typical) | Notes |
|-------|------------|------------------------|--------|
| `employer_time_support_zones` | `employer_id` | `(employer_id, time_support_zone_id)` | Exclude soft-deleted employers. |
| `candidate_work_experience_time_support_zones` | `work_experience_id` | `(work_experience_id, time_support_zone_id)` | Same parent soft-delete rules as existing WE APIs (`candidates.DeletedAt IS NULL`, etc.). |

### 5.1.1 PK-safe rewrite + dedupe (T6 — required)

Same algorithm as tech merge §5.1.1, **per parent** (employer, work experience):

1. If the parent **already** has a link to **`targetId`**: **delete** all junction rows for that parent where `time_support_zone_id` is in `sourceTimeSupportZoneIds`.
2. Else: **repoint one** source link to `targetId` (delete source row + insert `(parent, targetId)` when using EF composite keys), then **delete** remaining source rows for that parent.

Count rows removed toward **`impact.duplicateLinksRemoved.*`** (T10).

### 5.2 Global `usageCount` after merge

Use **Z1** from `TIME_SUPPORT_ZONES_USAGE_COUNT_BACKEND_CONTRACT.md`:

```text
usageCount(Z) = distinct_employers(Z) + distinct_work_experiences(Z)
```

**`usageCountAfter`** (preview) and post-merge **`target.usageCount`** use this formula on the post-merge link graph.

---

## 6. Preview response (`POST .../merge/preview`)

**200** — no mutations. **T10:** counts must match merge outcome for the same body.

```jsonc
{
  "target": {
    "timeSupportZoneId": 1,
    "name": "USA",
    "usageCountAfter": 8
  },
  "sources": [
    { "timeSupportZoneId": 2, "name": "uss", "usageCountBefore": 1 },
    { "timeSupportZoneId": 10, "name": "USA", "usageCountBefore": 0 }
  ],
  "impact": {
    "distinctEmployersAffected": 3,
    "distinctWorkExperiencesAffected": 5,
    "duplicateLinksRemoved": {
      "employerTimeSupportZones": 1,
      "workExperienceTimeSupportZones": 2
    }
  }
}
```

## 7. Merge response (`POST .../merge`)

**200** when complete.

```jsonc
{
  "target": {
    "timeSupportZoneId": 1,
    "name": "USA",
    "usageCount": 8
  },
  "mergedSourceIds": [2, 10],
  "impact": { /* same shape as preview */ }
}
```

---

## 8. Tests (minimum)

| Case | Expected |
|------|----------|
| Merge two sources into existing target | Sources hard-deleted; links repointed; survivor `usageCount` matches Z1 |
| Parent already linked to target + source | Source link removed; counted in `duplicateLinksRemoved` |
| Preview then merge same body | `usageCountAfter` = merge `target.usageCount`; `impact` identical |
| Recruiter POST | **403** |
| Source id not found | **404** |

---

## 9. Frontend integration (this repo)

| Piece | Location |
|-------|----------|
| Route | `/catalog/merge-time-support-zones` → `src/app/(dashboard)/catalog/merge-time-support-zones/page.tsx` |
| UI | `src/components/time-support-zone-merge-page-client.tsx` |
| API client | `src/lib/services/time-support-zone-merge-api.ts` |
| Types | `src/lib/types/time-support-zone-merge.ts` |
| Nav | **Catalog** → **Merge time support zones** (Admin + Super Admin) |

| Layer | Status |
|-------|--------|
| **Frontend** | **Implemented** — merge page, API client, Catalog nav |
| **Backend** | **Implemented** — preview (transaction + rollback, T10), merge, PK-safe junction rewrite, hard-delete sources, Z1 recompute on survivor. No migration. |

---

## 10. Backend agent handoff (completed)

Shipped behavior (for regression):

- **400:** empty/duplicate sources, target in sources, bad `mode`, missing fields, blank `name`
- **404:** missing source or existing target id
- **T6:** PK-safe rewrite on `employer_time_support_zones` and `candidate_work_experience_time_support_zones` (delete + insert; dedupe when parent already has target)
- **T5:** hard-delete source catalog rows after junction rewrite
- **T8 / Z1:** `RebuildForZoneAsync` on survivor in the same DB transaction
- **T10:** preview runs the full merge in a transaction and **rolls back**; `impact` and `usageCountAfter` match merge for the same body
- **`mode: "new"`:** trim name, reuse existing row by name (citext), else create with `usageCount = 0`

Backend touchpoints (reference): `TimeSupportZoneMergeRepository`, `TimeSupportZoneMergeService`, DTOs, `TimeSupportZonesController` merge routes, DI in `Program.cs`.

---

## 11. Post-deploy smoke test (Admin)

**Status:** **QA verified** (Admin UI + API, post-backend deploy).

1. **Catalog → Merge time support zones** — pick ≥1 source, existing or new target.
2. **Preview** — note `usageCountAfter`, `impact`, source `usageCountBefore`.
3. **Confirm merge** — `mergedSourceIds` match sources; `target.usageCount` equals preview `usageCountAfter`; `impact` matches preview.
4. **GET `/api/timesupportzones`** — sources gone; survivor name/count/sort correct.
5. Open an **employer** and **candidate work experience** that had source zones — dropdowns show survivor only.
6. Optional: preview+merge where a parent already had **both** target and source — check `duplicateLinksRemoved` counts.

If preview and merge disagree on counts or impact, capture both request/response JSON for T10 tracing.

### QA record (verified)

| Scenario | Source → target | T10 | Notes |
|----------|-----------------|-----|--------|
| Unused source | KSA (8) → USA (14) | `usageCountAfter` **4** = merge `usageCount` **4**; `impact` all zeros | Source `usageCountBefore: 0`; PAK absent from GET after later merge |
| Linked source | PAK (6) → USA (14) | **6** = **6**; `impact` identical on preview and merge | `distinctEmployersAffected: 1`, `distinctWorkExperiencesAffected: 1`, `workExperienceTimeSupportZones` duplicate removed: **1**; survivor tops GET sort |

**v2 (optional API polish):** Omit null `usageCount` on preview `target` and null `usageCountAfter` on merge `target` (FE tolerates both today).

Cross-read: `TIME_SUPPORT_ZONES_USAGE_COUNT_BACKEND_CONTRACT.md`.
