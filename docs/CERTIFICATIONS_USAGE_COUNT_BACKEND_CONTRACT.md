# Backend Contract: `usageCount` on Certification Catalog (`GET /api/certifications`)

Handoff for the **backend agent** implementing **`usageCount`** on the certification lookup catalog so the Next.js frontend can sort certification comboboxes and filters by popularity (same pattern as countries and degrees).

**Prerequisite for (later):** `CERTIFICATION_MERGE_BACKEND_CONTRACT.md` (preview `usageCountBefore` / `usageCountAfter` on catalog rows).

**Frontend reference (today — no `usageCount` on list):**

| File | Purpose |
|------|---------|
| `src/lib/types/certification.ts` | `{ id, name, issuer, … }` |
| `src/lib/services/certifications-api.ts` | `fetchCertificationsPage`, `createCertification`, … |

**Planned FE (after backend ships):** `certification-lookup.ts`, extend certifications API, wire combobox/filter consumers.

---

## 1. Goal

Extend **`GET /api/certifications`** (list) so each row includes non-negative **`usageCount`**, reflecting **distinct candidates** linked in **`candidate_certifications`**.

Frontend uses **`usageCount` only for dropdown ordering** — not filter badge text or display labels.

**Out of scope for counts:** Per-candidate link fields (`issueDate`, `url`, `level`, etc.) on `candidate_certifications`.

---

## 2. Locked product decisions

| # | Topic | Decision |
|---|--------|----------|
| **CE1** | **Global formula** | `usageCount(C)` = **count of distinct `candidate_id`** in **`candidate_certifications`** where **`certification_id = C`** and visibility (**CE2**) holds. One candidate with two link rows to the same **C** (if possible) still counts **once**. |
| **CE2** | **Visibility** | Join **`candidates`** where **`deleted_at IS NULL`**. Soft-deleted candidates **do not** contribute. Match existing candidate list/filter behavior. |
| **CE3** | **Zero usage** | Certifications with `usageCount = 0` **remain in the response** and sort **last**. |
| **CE4** | **Sort order** | Primary: **`usageCount DESC`**. Tie-break: **`name ASC`** (case-insensitive). |
| **CE5** | **Caching** | **Materialized** `usage_count` on `certifications`, updated **synchronously on write** when `candidate_certifications` links change; **nightly full rebuild** for drift. |
| **CE6** | **POST create** | **`POST /api/certifications`** response includes **`usageCount: 0`**. |
| **CE7** | **Scoped lists** | **N/A** — global catalog (paged list still includes `usageCount` per item). |
| **CE8** | **Out of scope** | Issuer catalog merge, certification catalog field merge UI (separate merge contract), data-progress recompute rules (existing hooks). |

---

## 3. API surface

| Method | Path | Change |
|--------|------|--------|
| **GET** | `/api/certifications` | Add `usageCount` per list item; pre-sort per **CE4** (optional — FE re-sorts if absent) |
| **POST** | `/api/certifications` | Response includes **`usageCount: 0`** |
| **POST** | `/api/certifications/rebuild-usage-counts` | Admin + Super Admin: recompute all certifications from source tables |

**Auth for rebuild:** Super Admin `0`, Admin `1`. Recruiter → **403**.

### Response shape (list item + create)

```jsonc
{
  "id": 7,
  "name": "Claude 101",
  "issuer": { "id": 2, "name": "Anthropic", "websiteUrl": null },
  "usageCount": 12,
  "dataProgressPercentage": 80
}
```

| Field | Type | Rules |
|-------|------|--------|
| `usageCount` | `int` | **≥ 0** |

PascalCase tolerance optional (`UsageCount`) — FE normalizes both.

---

## 4. Global `usageCount` definition (locked — CE1, CE2)

```text
usageCount(C) =
  COUNT(DISTINCT cc.candidate_id)
    FROM candidate_certifications cc
    INNER JOIN candidates c ON c.id = cc.candidate_id
    WHERE cc.certification_id = C
      AND c.deleted_at IS NULL
```

Align **`deleted_at`** column naming with existing candidate queries if mixed casing.

---

## 5. Write hooks (CE5)

| Event | Action |
|-------|--------|
| **Insert/update/delete** `candidate_certifications` (`certification_id` set or changed) | **`RebuildForCertification(certificationId)`** for old and new ids |
| Candidate **soft delete** / restore | Rebuild all certification ids on that candidate’s links |
| Bulk import / migration | **`RebuildAllCertificationUsageCounts()`** once at end |

**Acceptance:** After linking a certification on a candidate, the next **`GET /api/certifications`** shows updated counts and sort order without waiting for nightly job.

---

## 6. Rebuild / backfill

| Operation | When |
|-----------|------|
| **`RebuildAllCertificationUsageCounts()`** | Migration backfill; nightly drift repair |
| **`POST /api/certifications/rebuild-usage-counts`** | On-demand post-deploy / support. **200** when complete. |

---

## 7. Tests (minimum)

| Case | Expected |
|------|----------|
| Certification linked from 5 candidates (one candidate two rows if schema allows) | `usageCount = 5` (distinct candidates) |
| Links on soft-deleted candidate | **Not counted** |
| Zero links | `usageCount = 0`, still in list |
| After candidate cert link save | GET order updates without rebuild POST |
| POST create certification | `usageCount: 0` |
| Rebuild POST | All rows match live aggregate |

---

## 8. Status

| Layer | Status |
|-------|--------|
| **Backend** | **Implemented** |
| **Frontend** | **Pending** — after backend ships (see §9) |

### Post-deploy smoke (Admin / QA)

1. **GET `/api/certifications`** — rows include `usageCount`; highest usage first (**CE4**).
2. **Candidate create/edit** — certification combobox order matches GET.
3. **Candidates filter** — certification-related filters use same catalog order where applicable.
4. Link a certification on a candidate → refresh → that certification moves up on next GET.

---

## 9. Frontend integration (planned — this repo)

| File | Purpose |
|------|---------|
| `src/lib/utils/certification-lookup.ts` | Normalize, sort **CE4**, combobox helpers |
| `src/lib/services/certifications-api.ts` | List/create + `rebuildCertificationUsageCounts()` |

**Consumers (non-exhaustive):** `certification-combobox.tsx`, `candidate-creation-dialog.tsx`, `candidate-details-modal.tsx`, `candidates-filter-dialog.tsx`, `certifications-page-client.tsx`.

Cross-read: `CERTIFICATION_MERGE_BACKEND_CONTRACT.md`.
