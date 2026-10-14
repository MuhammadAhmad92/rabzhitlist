# Modules catalog — Create / Edit / Delete UI (locked)

**Status:** Implemented (frontend).  
**Route:** `/projects/modules` (`ModulesPageClient`).  
**API:** Uses existing routes in [PROJECT_MODULES_BACKEND_CONTRACT_v1.md](./PROJECT_MODULES_BACKEND_CONTRACT_v1.md) — **no new backend endpoints** for this feature.

---

## 1. Goal

From **All Modules**, users can **create**, **edit**, and **delete** shared project modules without opening project detail first. The catalog table refreshes after each successful mutation.

Candidate **work-experience links** (contribution) remain on the candidate create/edit flow and separate link APIs — not in this dialog.

---

## 2. Entry points

| Action | UI | Opens |
|--------|-----|--------|
| **Create** | Header **Create Module** (`Plus` icon, same hover as Create Candidate) | `ModuleCreationDialog` `mode="create"` |
| **Edit** | Actions **⋯** menu → **Edit** (does not trigger row click / view) | `ModuleCreationDialog` `mode="edit"` |
| **Delete** | Actions **⋯** menu → **Delete** (Projects/Candidates-style confirm on page) | Page-level `AlertDialog` → `deleteProjectModule` |
| **View** | Row **eye** or row click | `ProjectDetailDialog` with modules section focused (unchanged) |

---

## 3. `ModuleCreationDialog`

**File:** `src/components/module-creation-dialog.tsx`

### Create mode

| Field | Required | Notes |
|-------|----------|--------|
| **Main project** | Yes | `ProjectCombobox` — search existing projects (≥2 chars) |
| **Nested Create Project** | Optional | Same as candidate WE flow: **Create New Project** in combobox → `ProjectCreationDialog` → `POST /api/projects`, then selects new project |
| **Module name** | Yes | Trimmed non-empty |
| **Description** | No | Stored as `null` when blank |
| **Tech stacks** | No | Catalog multiselect → `techStackIds`; creatable tech stack via lookup API |

Submit → parent calls `createProjectModule(projectId, body)`.

### Edit mode

| Field | Behavior |
|-------|----------|
| **Main project** | **Read-only** (display name; `projectId` fixed) |
| **Name / description / tech stacks** | Editable |

On open, seed from list row (`ProjectModuleListItem`), then **`GET /api/projects/{projectId}`** to load **description** and full module tech stack names (mapped to ids via tech stack lookup).

Submit → `updateProjectModule(projectId, moduleId, body)`.

Edit footer: **Cancel** + **Save** only (same button hover pattern as `ProjectCreationDialog`). **No delete** in the dialog.

### Delete (row menu only)

- Actions **⋯** → **Delete** → page-level confirm (aligned with Projects/Candidates):
  - **Title:** `Are you sure?`
  - **Description:** This will permanently delete **{module name}** and all candidate links to it. This action cannot be undone.
  - **Delete** button: destructive styling + `hover:scale-105` transition (same as projects/candidates tables).
- Confirm → `deleteProjectModule(projectId, moduleId)`.

### After success

- Toast (create / update / delete).
- **`GET /api/modules`** list refresh only — **no** navigation to project detail.

---

## 4. Permissions (frontend)

No extra role gate on the Modules page beyond “user can open `/projects/modules`”. Aligns with contract: Super Admin, Admin, and Recruiter may call module CRUD routes.

(Candidate **create/edit** screen module link UI may still be role-limited separately — see backend contract intro.)

---

## 5. Frontend wiring

| Piece | Location |
|-------|----------|
| Page + button + handlers | `src/components/modules-page-client.tsx` |
| Table edit action | `src/components/modules-table.tsx` |
| Dialog | `src/components/module-creation-dialog.tsx` |
| List | `fetchProjectModulesPage` → `GET /api/modules` |
| Create / update / delete | `createProjectModule`, `updateProjectModule`, `deleteProjectModule` in `src/lib/services/project-modules-api.ts` |
| Edit prefill | `fetchProjectById` → `project.modules[]` in `src/lib/services/projects-api.ts` |
| Nested project create | `ProjectCombobox` + lookups / `createTechStack`, `createClientLocation` on page |

---

## 6. Backend changes required?

**No new API routes or DTO changes** are required for this UI if [PROJECT_MODULES_BACKEND_CONTRACT_v1.md](./PROJECT_MODULES_BACKEND_CONTRACT_v1.md) is already deployed.

| Operation | Existing API |
|-----------|----------------|
| List (table) | `GET /api/modules` |
| Create | `POST /api/projects/{projectId}/modules` |
| Update | `PUT /api/projects/{projectId}/modules/{moduleId}` |
| Delete | `DELETE /api/projects/{projectId}/modules/{moduleId}` |
| Edit load (description) | `GET /api/projects/{id}` (includes `modules[]`) |
| Nested project | `POST /api/projects` (and existing lookup/catalog routes) |

### Contract vs product wording (doc only)

Older locked rows **P6** and **P8** in the backend contract say name/description/stacks and delete happen from **main project detail**. This feature uses the **same** PUT/DELETE routes from the **Modules catalog**. That is a **product/doc** update, not a new backend capability.

Optional backend-repo follow-up (not blocking FE):

- Amend **P6 / P8 / P10** in `PROJECT_MODULES_BACKEND_CONTRACT_v1.md` to mention Modules page CRUD.
- §4 text (“browse and filter only”) refers to **not adding catalog-scoped** `POST /api/modules` — create remains under **`/api/projects/{id}/modules`**.

### When backend work *would* be needed

- Contract routes missing or returning different shapes → implement/fix per contract.
- New requirements **not** in contract (e.g. `POST /api/modules` without `projectId`, move module between projects, edit `projectId`) → **new** API design.

---

## 7. Out of scope (this feature)

- Module CRUD inside **Project detail** UI (section remains read-only for modules).
- Candidate **contribution** / link create-update on this dialog.
- Automated tests / E2E specs (not documented here).
- `onCreateTechnicalAspect` on nested project create (Modules page passes tech stack + client location handlers only; Projects page may pass more).

---

## 8. Write body (reference)

Same as contract §2:

```json
{
  "name": "Payments",
  "description": null,
  "techStackIds": [3, 9]
}
```

Frontend sends `description: null` when the field is empty after trim.
