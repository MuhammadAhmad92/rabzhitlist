# Candidate draft save & resume — Locked requirements (v2, local-only)

**Status:** Locked (2026-10-13). Supersedes server-backed draft layers in v1 for **frontend** behavior.  
**Audience:** Product, backend, frontend.

---

## 1. Goal

Save **Create Candidate** progress on **this device** while typing so users can recover after refresh or accidental close — without server draft rows or draft APIs from the FE.

---

## 2. Architecture

| Layer | Behavior |
|-------|----------|
| **Local** | Throttled (~400 ms) **`localStorage`** snapshot of **full** `CandidateFormData`. One draft per user key; overwrite on save. |
| **Server** | **None** from FE — no POST/PUT/GET draft calls. |
| **Create** | **Create Candidate** → full **`validateForm`** + **`prepareCandidateCreateLookups`** + **`POST /api/candidates`** (`createCandidate`). Resume upload **after** create succeeds. |

---

## 3. Scope

| In | Out |
|----|-----|
| **Create Candidate** dialog | Draft while editing **published** candidates |
| **Create Candidate** entry with **Continue draft / Start new** prompt when a meaningful local draft exists | Separate **Continue last draft** button |
| Close prompt: **Keep editing / Close / Discard draft** | Server draft sync, conflict UI, expiry UX |
| Cold Caller Apply → Create (no auto draft row) | Resume file in `localStorage` |
| Multiple drafts per user | Call notes persisted before create (via create body when submitted) |

**Create UX:** Section tabs + verification UI (verification progress session-only, not in snapshot).

---

## 4. Save UX

| Topic | Decision |
|--------|----------|
| Auto-save | ~400 ms throttle after form change; write **full** form when **meaningful** |
| **Create Candidate** | Enabled when validation passes (not gated on server sync) |
| **Close** (from warning) | Flush to **localStorage**, close dialog |
| **Discard draft** | Clear **localStorage** for user key, reset form, close |
| **Start new** (entry prompt) | Clear local draft, open empty Create |
| **After successful create** | Clear local draft |
| Catalog | **`prepareCandidateCreateLookups` on create only** |

---

## 5. Draft validation

| Topic | Decision |
|--------|----------|
| Local storage | **Full** form JSON — no sanitize-on-save; **`Date` fields revived on read** (`reviveCandidateFormFromLocalStorage`) after `JSON.parse` |
| Create | Full **`validateForm`** + create DTO rules |

---

## 6. Resume

- **Not** stored in `localStorage`.
- User **re-uploads** resume after continuing a draft post-refresh.
- Upload runs **only after** successful **`createCandidate`**.

---

## 7. Backend (same release as FE v2)

- This web app is the **only** consumer of candidate draft APIs; FE v2 **does not** call them.
- **No** migration of existing server draft rows — delete via TTL/one-off cleanup or let expiry run before deploy.
- **Backend repo (same release):** remove `/api/candidates/drafts/*`, finalize-from-draft, `is_draft` draft flow, draft expiry job, and resume-on-draft-id paths. Create remains **`POST /api/candidates`** only.
- **`CANDIDATE_DRAFT_BACKEND_CONTRACT.md`** was removed from this repo with FE cleanup; implement backend removal from your backend codebase / release notes, not from a doc in this FE repo.

---

## 8. Cold Caller

Parallel **`draftColdCallerSession`**; Apply to Create does **not** create a server or local draft automatically — local autosave begins while Create dialog is open.

---

## 9. Frontend reference (this repo)

| Piece | Location |
|-------|----------|
| Local buffer | `src/lib/utils/candidate-draft-local-storage.ts` |
| Meaningful-change helper | `src/lib/candidate/candidate-draft-payload.ts` |
| Sync hook | `src/hooks/useCandidateDraftSync.ts` |
| UI | `src/components/candidate-creation-dialog.tsx`, `src/components/candidates-page-client.tsx` |
