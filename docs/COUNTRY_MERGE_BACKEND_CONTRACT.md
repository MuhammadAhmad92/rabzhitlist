# Backend contract: Country catalog merge

**Status:** Backend **Implemented** (preview + merge, CM6 rewrites, CM12 rewrite-only, CN1 recompute, CM10 parity). **Merge smoke: QA verified** (§9). **FK note:** DB uses `ON DELETE Restrict`; orphan CM6-excluded rows are **hard-deleted** before source country delete (**CM13**).

**Roles:** Super Admin `0`, Admin `1`. Recruiter `2` → **403** on merge routes. UI hides Catalog nav for Recruiter.

**Scope (v1):** Country catalog only (`countries`). Rewrites:

| Table | Column |
|-------|--------|
| `universities` | `country_id` |
| `employer_locations` | `country_id` |

**No junction dedupe** on employer locations (**CM12** — rewrite only).

**Related docs:**

| Doc | Notes |
|-----|--------|
| `COUNTRIES_USAGE_COUNT_BACKEND_CONTRACT.md` | **CN1** formula; merge recomputes survivor **`usageCount`** (**CM10**). |
| `DEGREE_MERGE_BACKEND_CONTRACT.md` | Visibility + orphan handling template (**CN2** / **CM6**). |
| `TIME_SUPPORT_ZONE_MERGE_BACKEND_CONTRACT.md` | Preview/merge API shape, preview parity (**CM10**). |

**Out of scope v1:** Audit log, undo, suggested duplicates, deduplicating duplicate employer locations after merge (v2).

---

## 1. Locked product decisions

| # | Topic | Decision |
|---|--------|----------|
| **CM1** | Cardinality | Many **source** country ids → one **target** per request. |
| **CM2** | Sources | **`sourceCountryIds`** required, **≥ 1** unique id. |
| **CM3** | Target vs sources | Target id **must not** be in `sourceCountryIds` → **400**. |
| **CM4** | Target resolution | **`existing`:** given id. **`new`:** trim name; reuse row by name (same as **`POST /api/countries`**, citext if used elsewhere); else create with **`usageCount: 0`**. |
| **CM5** | Source rows | **Hard-delete** source `countries` after rewrite. |
| **CM6** | Rewrite visibility | **Same grain as CN2:** update **`universities.country_id`** only where **`deleted_at IS NULL`**. Update **`employer_locations.country_id`** only where joined **`employers.deleted_at IS NULL`**. Rows on soft-deleted universities/employers are **not** rewritten. |
| **CM7** | Preview | Required; same body as merge. |
| **CM8** | Counters | Recompute **`usageCount`** (**CN1**) for survivor in same transaction; clear materialized counts for deleted source ids if stored separately. |
| **CM9** | UI | Clients refetch **`GET /api/countries`** after merge. |
| **CM10** | Preview parity | Same body → preview **`impact`** + **`usageCountAfter`** = merge **`impact`** + **`target.usageCount`**. Preview runs full merge in a transaction and **rolls back** (TSZ **T10** / **DM10** pattern). |
| **CM11** | Missing ids | Unknown source/target id → **404**; validation → **400**. |
| **CM12** | Employer location dedupe | **Rewrite only** — **`UPDATE country_id`**; **do not** merge/delete duplicate `(employer_id, country_id, city)` rows. Duplicates after merge are **allowed** if DB/UI tolerate them. |
| **CM13** | Orphan FK | Non-**CM6** rows not rewritten. DB FKs are **`ON DELETE Restrict`**. Before source country hard-delete, **`RemoveOrphanReferencesAsync`** **hard-deletes** orphan rows still pointing at sources (soft-deleted universities + locations on soft-deleted employers). **QA:** orphans **disappear** after confirm — **expected pass** (same product outcome as degree merge §8, different mechanism). |

---

## 2. API surface

| Method | Path | Who |
|--------|------|-----|
| **POST** | `/api/countries/merge/preview` | Admin, Super Admin |
| **POST** | `/api/countries/merge` | Admin, Super Admin |

---

## 3. Request body

```jsonc
{
  "sourceCountryIds": [6, 12],
  "target": { "mode": "existing", "countryId": 840 }
}
```

```jsonc
{
  "sourceCountryIds": [6],
  "target": { "mode": "new", "name": "United States" }
}
```

| Field | Rules |
|-------|--------|
| `sourceCountryIds` | Required, unique, ≥ 1; each exists or **404** |
| `target.countryId` | Required when `mode: "existing"` |
| `target.name` | Required when `mode: "new"`; trim; empty → **400** |

---

## 4. Merge algorithm (single transaction)

1. Resolve target id (**CM4**).
2. Validate sources exist.
3. Count impact on **CM6-visible** rows (§6).
4. **`UPDATE universities SET country_id = target`** per **CM6**.
5. **`UPDATE employer_locations SET country_id = target`** per **CM6**.
6. **`RemoveOrphanReferencesAsync`** — hard-delete non-**CM6** rows still referencing any source id (**CM13**).
7. **Hard-delete** source countries (**CM5**).
8. **Rebuild** survivor **`usageCount`** (**CM8** / **CN1**).

---

## 5. Preview / merge response

```jsonc
{
  "target": {
    "countryId": 840,
    "name": "United States",
    "usageCountAfter": 15
  },
  "sources": [
    { "countryId": 6, "name": "USA", "usageCountBefore": 4 }
  ],
  "impact": {
    "distinctUniversitiesAffected": 2,
    "distinctEmployerLocationsAffected": 5,
    "distinctEmployersAffected": 3
  }
}
```

Merge response adds **`mergedSourceIds`** and uses **`target.usageCount`** (not `usageCountAfter`). **`impact`** shape unchanged (**CM10**).

---

## 6. Impact definitions

| Field | Meaning |
|-------|---------|
| **`distinctUniversitiesAffected`** | **CM6-visible** universities with `country_id` in `sourceCountryIds` (will be updated). |
| **`distinctEmployerLocationsAffected`** | **CM6-visible** `employer_locations` rows with `country_id` in `sourceCountryIds` (will be updated). |
| **`distinctEmployersAffected`** | Distinct `employer_id` among those location rows. |

---

## 7. Tests (minimum)

| Case | Expected |
|------|----------|
| Merge source with 2 universities + 5 location rows (3 employers) | Impact counts match; all **CM6-visible** rows repointed; survivor **CN1** count recomputed |
| Soft-deleted university / employer location parent | **Not** rewritten; **not** in impact |
| Two source locations on same employer → same target country | **Two rows remain** (possibly duplicate city) — **CM12** |
| Preview then merge same body | **CM10** |
| Recruiter | **403** |

---

## 8. Frontend integration (this repo)

| Piece | Location |
|-------|----------|
| Route | `/catalog/merge-countries` |
| UI | `src/components/country-merge-page-client.tsx` |
| API | `src/lib/services/country-merge-api.ts` |
| Nav | Catalog → **Merge countries** |

| Layer | Status |
|-------|--------|
| **Frontend** | **Implemented** — merge page, API client, Catalog nav; **CN4** via `country-lookup.ts` + `countries-api.ts` |
| **Backend** | **Implemented** — merge service, `RemoveOrphanReferencesAsync`, CN1 recompute; migration `20261009180000_AddCountryUsageCount` |

### Schema note (orphans) — locked product decision (**CM13**)

**CM6** does not rewrite `country_id` on soft-deleted **universities** or on **`employer_locations`** whose **employer** is soft-deleted.

FKs: `universities.country_id` → `countries.id`; `employer_locations.country_id` → `countries.id` — both **`ON DELETE Restrict`** (implemented).

| Case | Behavior |
|------|----------|
| **Visible** universities / employer locations (**CM6** / **CN2**) | **`country_id` rewritten** to survivor. |
| **Orphan** rows (soft-deleted university or location on soft-deleted employer still holding `country_id` = source) | **Not rewritten**. **`RemoveOrphanReferencesAsync`** **hard-deletes** these rows before source country delete so **Restrict** is satisfied. |

**Accepted (v1):** Orphan data on soft-deleted parents may be **removed** on merge confirm — **expected pass**, not a defect (same product outcome as degree merge §8). **No null-before-delete** unless product revisits (**v2**).

**QA (expected pass):** Active universities/employers show **survivor** only; orphan rows gone after confirm.

---

## 9. Post-deploy smoke test (Admin)

**Status:** **QA verified** (Admin UI + API, post-backend deploy).

1. **Catalog → Merge countries** — pick ≥1 source, existing or new target.
2. **Preview** — note `usageCountAfter`, `impact`, source `usageCountBefore`.
3. **Confirm merge** — `mergedSourceIds` match sources; `target.usageCount` equals preview `usageCountAfter`; `impact` matches preview (**CM10**).
4. **GET `/api/countries`** — sources gone; survivor name/count/sort correct (**CN4**).
5. **Universities / employer locations** on active records — country comboboxes show **survivor** only.
6. Optional: merge that would create duplicate employer locations (**CM12**) — confirm UI/DB still acceptable.
7. If env has **orphan** rows on soft-deleted universities/employers still referencing a source — **hard-delete via CM13** after confirm is an **expected pass** (§8).

If preview and merge disagree on counts or impact, capture both request/response JSON for **CM10** tracing.

### QA record (verified)

| Scenario | Source → target | CM10 | Notes |
|----------|-----------------|------|--------|
| Linked source | **United States (4)** → **Pakistan (1)** | Preview `usageCountAfter` **6** = merge `target.usageCount` **6**; `impact` identical on preview and merge | `usageCountBefore: 3`; `distinctUniversitiesAffected: 1`, `distinctEmployerLocationsAffected: 3`, `distinctEmployersAffected: 2`; `mergedSourceIds: [4]`; **GET** — id **4** absent; Pakistan **`usageCount: 6`** tops list |
| Orphans (when present) | Source country hard-deleted after merge | N/A | Non-visible rows **hard-deleted** by **CM13** — **expected pass** |

**v2 (optional API polish):** Omit null `usageCount` on preview `target` and null `usageCountAfter` on merge `target` (FE reads `usageCountAfter` on preview and `usageCount` on merge today).

Cross-read: `COUNTRIES_USAGE_COUNT_BACKEND_CONTRACT.md`.
