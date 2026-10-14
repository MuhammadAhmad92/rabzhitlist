# Backend contract: Project modules

**Status:** Implemented. Migration `20261002063900_AddProjectModules` adds `project_modules`, `project_module_tech_stacks`, and `candidate_work_experience_modules`. Section 4 (`GET /api/modules` and `moduleCount` on each `GET /api/projects` list item) is implemented.

**Frontend (Modules catalog create/edit/delete):** [MODULES_PAGE_CREATE_EDIT_UI.md](./MODULES_PAGE_CREATE_EDIT_UI.md) — uses the project-scoped routes in §3, not new catalog APIs.

**Roles:** Super Admin `0`, Admin `1`, Recruiter `2`. All three may call every route in this contract. These routes do not return **403** for Recruiter.

The candidate create and edit screen is still limited to Super Admin and Admin. That screen is where a candidate link is added or removed. Recruiter edits and deletes the shared module from the project detail dialog. The API still accepts Recruiter link writes.

Question generation and call-notes extract do not read or write modules. `GET /api/projects` does not return module rows. Each list item includes `moduleCount`. Projects table search stays a match on the project name only. A module name does not find the project.

---

## 1. Locked decisions

| # | Topic | Decision |
|---|--------|----------|
| **P1** | What a module is | A shared child of one existing project. It is not a second project and not a row in the projects list. |
| **P2** | Module fields | `name` required. `description` optional. Tech stacks optional, from the same catalog as projects. No employer, status, dates, or other project fields. |
| **P3** | Candidate link | One link belongs to one work experience. It stores that candidate’s `contribution`, which is optional. |
| **P4** | Same work experience | The work experience may also link the main project directly. It may link more than one module. The same module cannot be linked twice on one work experience. Two work experiences may link the same module. |
| **P5** | Create vs link | The candidate form either creates a new module under the selected project, or links one that already exists. The same name may exist on more than one module. |
| **P6** | After save | Name, description, and tech stacks change only from the main project detail. The candidate form can still change the contribution, or remove the link. |
| **P7** | Remove link | Removes only that candidate’s contribution. The module stays, even when no candidate remains. |
| **P8** | Delete module | From the main project detail. Removes the module and every candidate link to it. The main project stays. |
| **P9** | Delete project | Deleting a project also deletes its modules and those candidate links. |
| **P10** | Where it is shown | Main project detail: the project first, then each module, then the candidates on that module. The modules catalog (`GET /api/modules`) lists every module. Each projects list row includes `moduleCount`. Candidate details show the link read-only under the work experience. |

---

## 2. Module JSON

```json
{
  "id": 8,
  "name": "Payments",
  "description": "Checkout and refunds",
  "techStacks": ["C#", "SQL"],
  "contributors": [
    {
      "linkId": 15,
      "candidateId": 42,
      "candidateName": "Ayesha Khan",
      "contribution": "Built the refund flow."
    }
  ]
}
```

| Field | Type |
|-------|------|
| `id` | number |
| `name` | string, trimmed, non-empty |
| `description` | string or `null` |
| `techStacks` | array of catalog names. Empty array when none. Not `null`. |
| `contributors` | array. Empty array when nobody is linked. Not `null`. |

`contributors` is ordered by `linkId`. Include a candidate only when that candidate is still returned by the candidate list.

Write body for create and update. Do not send `techStacks` names. Send ids:

```json
{
  "name": "Payments",
  "description": null,
  "techStackIds": [3, 9]
}
```

Blank, omit, or `null` description stores `null`. Omit or `[]` for `techStackIds` stores no stacks. An unknown tech stack id → **400** `{ "status": 400, "message": "techStackIds must refer to existing tech stacks." }`. Empty or whitespace `name` → **400** `{ "status": 400, "message": "Module name is required." }`.

---

## 3. Routes

| Method | Path | Result |
|--------|------|--------|
| `GET` | `/api/projects/{projectId}/modules/search?search&limit` | JSON array of `{ id, projectId, name, description, techStacks }`. No `contributors`. |
| `POST` | `/api/projects/{projectId}/modules` | **201** and the module JSON. `contributors` is `[]`. |
| `PUT` | `/api/projects/{projectId}/modules/{moduleId}` | **200** and the module JSON, including current `contributors`. |
| `DELETE` | `/api/projects/{projectId}/modules/{moduleId}` | **204**. Deletes the module and every link to it. |
| `POST` | `/api/candidates/{candidateId}/work-experiences/{workExperienceId}/modules` | **201**. Request body `{ moduleId, contribution }`. Response is the work-experience module object below, including the new link `id`. |
| `PUT` | `/api/candidates/{candidateId}/work-experiences/{workExperienceId}/modules/{linkId}` | **200**. Request body `{ contribution }`. Response is the same work-experience module object, including the link `id`. |
| `DELETE` | `/api/candidates/{candidateId}/work-experiences/{workExperienceId}/modules/{linkId}` | **204**. The module stays. |

Search uses a case-insensitive substring on the module **name** under that project only. `limit` is from 1 to 20. The client sends at most 10. Results are ordered by `name`, then `id`.

Unknown project, module, candidate, work experience, or link → **404**. A module id that belongs to a different project → **404**.

Duplicate link of the same module on the same work experience → **400** `{ "status": 400, "message": "This module is already linked." }`.

`contribution` blank, omit, or `null` stores `null`. Do not **400** because a string is long.

`GET /api/projects/{id}` includes `modules` on the project object, ordered by module `id`. The projects list does not include that array. Each list item includes `moduleCount` (section 4).

`GET /api/candidates/{id}` includes `modules` on each work experience:

```json
{
  "id": 15,
  "moduleId": 8,
  "projectId": 4,
  "projectName": "Northbay Portal",
  "name": "Payments",
  "description": "Checkout and refunds",
  "techStacks": ["C#", "SQL"],
  "contribution": "Built the refund flow."
}
```

`id` is the link id. Ordered by link id. The candidate list does not include `modules`. `POST /api/candidates` and `PUT /api/candidates/{id}` ignore `modules` if present. Links are saved only through the routes above.

Unauthenticated calls stay **401**.

---

## 4. Modules catalog list

The modules page at `/projects/modules` lists and filters via `GET /api/modules`. This section does not add **catalog-scoped** create, update, or delete routes (e.g. no `POST /api/modules`). Create/update/delete on the catalog UI use §3 project routes — see [MODULES_PAGE_CREATE_EDIT_UI.md](./MODULES_PAGE_CREATE_EDIT_UI.md). Candidate-name filtering is not in this version.

All three roles may call `GET /api/modules`. It does not return **403** for Recruiter.

### `GET /api/modules`

Paged result, same envelope as `GET /api/projects`:

| Field | Type |
|-------|------|
| `items` | array. Empty array when nothing matches. Not `null`. |
| `pageNumber` | number |
| `pageSize` | number |
| `totalCount` | number |
| `totalPages` | number |
| `hasPrevious` | boolean |
| `hasNext` | boolean |

Each item:

```json
{
  "id": 8,
  "projectId": 4,
  "projectName": "Northbay Portal",
  "name": "Payments",
  "techStacks": ["C#", "SQL"],
  "candidateCount": 2
}
```

| Field | Type |
|-------|------|
| `id` | number |
| `projectId` | number. The main project. |
| `projectName` | string. The main project's current name. |
| `name` | string |
| `techStacks` | array of catalog names. Empty array when none. Not `null`. |
| `candidateCount` | number, `0` or greater. Count of candidate links whose candidate is still returned by the candidate list. Do not return the contributor list. |

Do not include `description` or `contributors` on these rows.

Order is module `name` ascending, then `id` ascending. The client does not send a sort parameter.

Query:

| Param | Rule |
|-------|------|
| `name` | Optional. Case-insensitive substring on the module name. Omit when blank. |
| `projectIds` | Optional. Repeated query key. A module matches when its project id is any of these. |
| `techStackIds` | Optional. Repeated query key. A module matches when it has any of these catalog ids. |
| `pageNumber` | Optional. Default `1`. |
| `pageSize` | Optional. Default `20`. Allow `1` through `100`. |

Filled groups combine with AND. Example: `name=pay&projectIds=4&projectIds=9&techStackIds=3&techStackIds=9` returns modules whose name contains `pay`, whose project is `4` or `9`, and which have tech stack `3` or `9`.

An unknown `projectIds` or `techStackIds` value matches nothing for that value. It does not return **400**. When every supplied project id is unknown, `items` is empty and `totalCount` is `0`.

An empty catalog is **200** with `items: []` and `totalCount: 0`. It is not **404**.

### `moduleCount` on `GET /api/projects`

Every list item includes `moduleCount`: a number, `0` when the project has no modules. This is the count of that project's modules, not the candidate links.

`GET /api/projects/{id}` is unchanged. It still includes the `modules` array and does not need `moduleCount`.

Project list search stays a match on the project name only. A module name does not find the project. The list still does not return module rows.
