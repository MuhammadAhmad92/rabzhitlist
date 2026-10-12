# Backend contract: Certification catalog merge

**Status:** Backend implemented.

**Roles:** Super Admin `0`, Admin `1`. Recruiter `2` → **403** on merge routes. UI hides Catalog nav for Recruiter.

**Scope (v1):** Certification catalog (`certifications`) plus **`candidate_certifications`** rewrite/dedupe only.

**Differentiator vs TSZ/degrees:** Survivor catalog row **Name** and **Issuing body** (`issuer_id`) are resolved from admin **field selections** (keep target vs take from a specific source) before links are repointed.

**Related docs:**

| Doc | Notes |
|-----|--------|
| `CERTIFICATIONS_USAGE_COUNT_BACKEND_CONTRACT.md` | **CE1** formula; merge recomputes survivor **`usageCount`** (**CertM10**). |
| `COUNTRY_MERGE_BACKEND_CONTRACT.md` | Orphan cleanup pattern (**CertM13**). |
| `TIME_SUPPORT_ZONE_MERGE_BACKEND_CONTRACT.md` | Junction dedupe template (**CertM12**). |

**Out of scope v1:** Per-candidate link fields on `candidate_certifications` (`issueDate`, `expiryDate`, `url`, `level`) — merge does **not** copy or merge those; catalog field picker is **name + issuer only**; issuer catalog merge; audit log / undo (v2).

---

## 1. Locked product decisions

| # | Topic | Decision |
|---|--------|----------|
| **CertM1** | Cardinality | Many **source** certification ids → one **target** per request. |
| **CertM2** | Sources | **`sourceCertificationIds`** required, **≥ 1** unique id. |
| **CertM3** | Target vs sources | Target id **must not** be in `sourceCertificationIds` → **400**. |
| **CertM4** | Target resolution | **`existing`:** given id. **`new`:** trim name; reuse row by name (same as **`POST /api/certifications`**, citext); else create with **`usageCount: 0`**, default issuer null unless field resolution sets it. |
| **CertM5** | Source rows | **Hard-delete** source `certifications` after merge. |
| **CertM6** | Link visibility | Rewrite/dedupe **`candidate_certifications`** only where joined **`candidates.deleted_at IS NULL`** (**CE2**). |
| **CertM7** | Catalog fields (picker) | **Name** and **`issuer_id`** (Issuing body) only. Admin chooses per field: **keep target** or **take from** one **`sourceCertificationId`**. |
| **CertM8** | Multi-source fields | **Per field, one source:** each of `name` and `issuer` independently either `keepTarget` or `{ fromSourceId }` where `fromSourceId ∈ sourceCertificationIds`. |
| **CertM8b** | **No backend default fill** | Backend **never** infers issuer (or name) from sources when the request says **`keepTarget`**. **`issuer_id` null** on target + **`issuer: "keepTarget"`** → survivor stays **null** (1 source or many). To copy an issuing body from a source, the request **must** include **`issuer: { fromSourceId }`**. **FE** may pre-select that in the merge UI before preview/merge; that is client-only, not API default fill. |
| **CertM9** | Apply field resolution | **Before** junction rewrite: **`UPDATE certifications`** survivor row with resolved **`name`** and **`issuer_id`** (nullable). |
| **CertM10** | Preview parity | Same body → preview **`impact`**, resolved **target preview** (name, issuer, `usageCountAfter`), and **`fieldResolutionPreview`** match merge outcome (**CertM10**). Preview runs full merge in a transaction and **rolls back**. |
| **CertM11** | Missing ids | Unknown source/target id → **404**; invalid field source id → **400**. |
| **CertM12** | Junction dedupe | **TSZ-style per candidate:** if candidate already has a link to **target** certification id, **delete** link(s) where `certification_id ∈ sources`; else **repoint** source link(s) to target (PK-safe delete+insert if needed). Count toward **`impact.duplicateLinksRemoved`**. |
| **CertM13** | Orphans | Non-**CertM6** rows still referencing sources: same as **country merge CM13** — **`ON DELETE Restrict`** expected; **`RemoveOrphanReferencesAsync`** (or equivalent) **hard-deletes** orphan link rows before source catalog hard-delete. **Expected pass** on QA. |

---

## 2. API surface

| Method | Path | Who |
|--------|------|-----|
| **POST** | `/api/certifications/merge/preview` | Admin, Super Admin |
| **POST** | `/api/certifications/merge` | Admin, Super Admin |

---

## 3. Request body

```jsonc
{
  "sourceCertificationIds": [12, 15],
  "target": { "mode": "existing", "certificationId": 7 },
  "fieldResolution": {
    "name": "keepTarget",
    "issuer": { "fromSourceId": 12 }
  }
}
```

```jsonc
{
  "sourceCertificationIds": [12],
  "target": { "mode": "new", "name": "Claude 101" },
  "fieldResolution": {
    "name": { "fromSourceId": 12 },
    "issuer": "keepTarget"
  }
}
```

| Field | Rules |
|-------|--------|
| `sourceCertificationIds` | Required, unique, ≥ 1; each exists or **404** |
| `target.certificationId` | Required when `mode: "existing"` |
| `target.name` | Required when `mode: "new"`; trim; empty → **400** |
| `fieldResolution.name` | `"keepTarget"` **or** `{ "fromSourceId": number }` ∈ sources |
| `fieldResolution.issuer` | Same; maps to survivor **`issuer_id`** (null allowed) |

**Resolved values:**

| Field | `keepTarget` | `{ fromSourceId: S }` |
|-------|----------------|-------------------------|
| **name** | Target row’s current **`name`** (after target resolution for `mode: "new"`, use created/reused row). **No** empty-name fallback from sources. | Source **S** row’s **`name`** |
| **issuer** | Target row’s current **`issuer_id`** (**CertM8b** — null stays null) | Source **S** row’s **`issuer_id`** |

### 3.1 Explicit resolution only (**CertM8b**)

| Request | Survivor `issuer_id` after merge |
|---------|----------------------------------|
| **`issuer: "keepTarget"`** | Target’s current value (may be **null**), regardless of source count |
| **`issuer: { fromSourceId: S }`** | Source **S**’s **`issuer_id`** (may be **null**) |

**Multi-source:** If target has no issuer and admin wants a source’s issuing body, **`fieldResolution.issuer`** must be **`{ fromSourceId }`** — there is **no** server-side “pick a source” fallback.

**Preview:** **`fieldResolutionPreview`** echoes what was requested and the **resulting** `target.issuer` / **`issuer_id`** after apply — **not** a separate “default fill” mode.

---

## 4. Merge algorithm (single transaction)

1. Resolve target certification id (**CertM4**).
2. Validate sources exist; validate **fieldResolution** (**CertM11**).
3. Load target + source catalog rows; compute resolved **name** / **issuer_id** (**CertM8–CertM9**).
4. **`UPDATE certifications SET name = ?, issuer_id = ? WHERE id = target`**.
5. Count impact on **CertM6-visible** `candidate_certifications` rows with `certification_id ∈ sources`.
6. **Per candidate** (**CertM12**): dedupe or repoint links to **target**.
7. **`RemoveOrphanReferencesAsync`** for non-visible links still on sources (**CertM13**).
8. **Hard-delete** source certifications (**CertM5**).
9. **Rebuild** survivor **`usageCount`** (**CE1** / **CertM10**).

---

## 5. Preview / merge response

```jsonc
{
  "target": {
    "certificationId": 7,
    "name": "Claude 101",
    "issuer": { "id": 2, "name": "Anthropic", "websiteUrl": null },
    "usageCountAfter": 18
  },
  "sources": [
    { "certificationId": 12, "name": "AI Fluency", "usageCountBefore": 5, "issuer": { "id": 1, "name": "OpenAI", "websiteUrl": null } }
  ],
  "fieldResolutionPreview": {
    "name": { "mode": "keepTarget", "value": "Claude 101" },
    "issuer": { "mode": "fromSource", "fromSourceId": 12, "issuerId": 1, "issuerName": "OpenAI" }
  },
  "impact": {
    "distinctCandidatesAffected": 5,
    "distinctCandidateCertificationLinksAffected": 6,
    "duplicateLinksRemoved": 1
  }
}
```

**Merge response:** same shape; **`target.usageCount`** instead of `usageCountAfter`; add **`mergedSourceIds`**. **`impact`** unchanged (**CertM10**).

---

## 6. Impact definitions

| Field | Meaning |
|-------|---------|
| **`distinctCandidatesAffected`** | Distinct **CertM6-visible** candidates with ≥1 link to any source id (will be deduped or repointed). |
| **`distinctCandidateCertificationLinksAffected`** | **CertM6-visible** link rows with `certification_id ∈ sources` that are deleted or repointed. |
| **`duplicateLinksRemoved`** | Subset removed only because candidate already had target link (**CertM12**). |

---

## 7. Tests (minimum)

| Case | Expected |
|------|----------|
| AI Fluency (12) → Claude 101 (7), name keepTarget, issuer from 12 | Survivor name unchanged; issuer_id from 12; sources deleted |
| Candidate with both 7 and 12 | One link to 7; `duplicateLinksRemoved ≥ 1` |
| Preview then merge same body | **CertM10** |
| Soft-deleted candidate still on source id only | Not in impact; orphan cleanup **CertM13** before source delete |
| Recruiter | **403** |

---

## 8. Frontend integration (this repo)

| Piece | Location |
|-------|----------|
| Route | **`/certifications`** (Admin / Super Admin) — inline **Source** (multi) and **Target** (single) columns on the list; **Merge Certification** in page header (phase 2+: preview / field picker / confirm). |
| UI (phase 1) | `src/components/certifications-page-client.tsx`, `src/components/certifications-table.tsx` — selection only; merge button enabled when ≥1 source + target (**CertM3** mutual exclusion in UI). |
| UI (phase 2) | `src/components/certification-merge-dialog.tsx` — target existing (table) or **new** name; field picker (name / issuer); manual **Preview impact**; **Confirm merge** after successful preview (**CertM10**). |
| API | `src/lib/services/certification-merge-api.ts` — `POST /api/certifications/merge/preview`, `POST /api/certifications/merge` |

| Layer | Status |
|-------|--------|
| **Frontend** | **Phase 2 implemented** (dialog preview + merge); optional **CE1** on list table **pending** |
| **Backend** | **Implemented** |

### Schema note (orphans) — locked (**CertM13**)

Same product outcome as **`COUNTRY_MERGE_BACKEND_CONTRACT.md` §8** — orphan **`candidate_certifications`** on soft-deleted candidates may be **hard-deleted** during merge cleanup; **expected pass**.

---

## 9. Post-deploy smoke test (Admin)

**Status:** Pending.

1. **Certifications** — select sources (e.g. AI Fluency), target (Claude 101), set field picker (name / issuer).
2. **Preview** — `fieldResolutionPreview`, `usageCountAfter`, `impact`, source `usageCountBefore`.
3. **Confirm merge** — **CertM10**; **GET `/api/certifications`** — sources gone; survivor fields match preview.
4. **Candidate** with old source id — combobox/shows **survivor** name; link points at target id.
5. Optional: candidate had **both** source and target — one link remains.

### QA record (verified)

*(Empty until post-deploy smoke.)*

Cross-read: `CERTIFICATIONS_USAGE_COUNT_BACKEND_CONTRACT.md`.
