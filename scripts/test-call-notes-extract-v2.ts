/**
 * Call Notes Extract v2 — apply engine smoke tests.
 * Run: npx tsx scripts/test-call-notes-extract-v2.ts
 */

import type { CandidateFormData } from "../src/components/candidate-creation-dialog"
import type { Candidate } from "../src/lib/types/candidate"
import type { AllowedEmptyField, CallNotesExtraction } from "../src/types/call-notes-extraction"
import { applyCallNotesExtractionsToFormData } from "../src/lib/utils/call-notes-apply-extractions"
import { buildCallNotesAllowedEmptyFields } from "../src/lib/utils/call-notes-allowed-empty-fields"
import {
  isCallNotesExtractApiFieldAllowed,
  isQuestionFieldAllowed,
} from "../src/lib/utils/question-field-allowlist"
import type { CallNotesCatalogResolution } from "../src/lib/utils/call-notes-extract-lookup"
import { hasUnresolvedCheckedCatalogIdRows } from "../src/lib/utils/call-notes-extract-catalog"
import { buildCallNotesExtractCandidateSnapshot } from "../src/lib/utils/call-notes-extract-snapshot"
import {
  buildEmployerCreatePrefillFromExtractRows,
  buildEmployerCreatePrefillFromWorkExperience,
  buildProjectCreatePrefillFromExtractRows,
  buildProjectCreatePrefillFromProjectExperience,
} from "../src/lib/utils/call-notes-extract-create-prefill"
import { resolveLookupIdsByName } from "../src/lib/utils/lookup-ids-by-name"
import { formatQgDisplayValue } from "../src/lib/utils/qg-value"

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message)
}

const baseForm: CandidateFormData = {
  name: "Test",
  postingTitle: "",
  city: "",
  currentSalary: "",
  expectedSalary: "",
  cnic: "",
  contactNumber: "",
  email: "",
  linkedinUrl: "",
  githubUrl: "",
  source: "",
  callStatus: "pending",
  callDate: undefined,
  workExperiences: [
    {
      id: "we-1",
      employerId: null,
      employerLocationId: null,
      employerName: "",
      jobTitle: "Engineer",
      projects: [
        {
          id: "proj-1",
          projectId: null,
          projectName: "",
          contributionNotes: "",
          isMainContribution: false,
        },
      ],
      startDate: undefined,
      endDate: undefined,
      techStacks: [],
      shiftType: "",
      workMode: "",
      salaryPolicy: "",
      minimumSalary: "",
      maximumSalary: "",
      timeSupportZones: [],
      benefits: [],
      modules: [],
    },
  ],
  certifications: [],
  educations: [],
  techStacks: [],
  personalityType: "",
  achievements: [],
  competitions: [],
  callNotes: "",
  finalRemarks: "",
  mentors: [],
}

const headcountMeta: AllowedEmptyField = {
  fieldPath: "workExperiences[we-1].headcount",
  apiFieldName: "work_experience_0_headcount",
  fieldLabel: "Headcount",
  fieldType: "number",
  requiresLinkedCatalogId: "employer",
}

const headcountExtraction: CallNotesExtraction = {
  fieldPath: "workExperiences[we-1].headcount",
  apiFieldName: "work_experience_0_headcount",
  value: 500,
  sourceText: "about 500 employees",
  confidence: 0.9,
}

// Block apply when employer not linked
assert(
  hasUnresolvedCheckedCatalogIdRows(
    new Set([headcountExtraction.fieldPath]),
    [{ fieldPath: headcountExtraction.fieldPath, requiresLinkedCatalogId: "employer" }],
    baseForm,
    new Map(),
  ),
  "expected catalog ID gate when employer unlinked",
)

const employerResolution: CallNotesCatalogResolution = {
  kind: "employer",
  catalogId: 42,
  catalogName: "Acme Corp",
}

const lookupResolutions = new Map<string, CallNotesCatalogResolution>([
  ["workExperiences[we-1].employerName", employerResolution],
])

const applied = applyCallNotesExtractionsToFormData(
  baseForm,
  [headcountExtraction],
  [headcountMeta],
  lookupResolutions,
)

assert(applied.applied.length === 1, "expected headcount applied with employer resolution")
assert(
  applied.formData.workExperiences[0].employerId === 42,
  "expected employerId from resolution",
)
assert(
  applied.formData.workExperiences[0].headcount === "500",
  "expected headcount on form",
)
assert(
  applied.formData.workExperiences[0].employerCatalogDirty === true,
  "expected employer catalog dirty flag",
)

const officeMeta: AllowedEmptyField = {
  fieldPath: "workExperiences[we-1].locations[0].country",
  apiFieldName: "work_experience_0_office_0_country",
  fieldLabel: "Country",
  fieldType: "text",
  requiresLinkedCatalogId: "employer",
}

const officeApplied = applyCallNotesExtractionsToFormData(
  applied.formData,
  [
    {
      fieldPath: officeMeta.fieldPath,
      apiFieldName: officeMeta.apiFieldName,
      value: "Pakistan",
      sourceText: "Lahore office in Pakistan",
      confidence: 0.85,
    },
  ],
  [officeMeta],
  lookupResolutions,
)

assert(officeApplied.applied.length === 1, "expected office country applied")
assert(
  officeApplied.formData.workExperiences[0].locations?.[0]?.country === "Pakistan",
  "expected auto-created office row",
)

const multiOfficeMeta: AllowedEmptyField[] = [0, 1, 2].map((i) => ({
  fieldPath: `workExperiences[we-1].locations[${i}].city`,
  apiFieldName: `work_experience_0_office_${i}_city`,
  fieldLabel: "City",
  fieldType: "text" as const,
  requiresLinkedCatalogId: "employer" as const,
}))
const multiOfficeApplied = applyCallNotesExtractionsToFormData(
  baseForm,
  [
    {
      fieldPath: multiOfficeMeta[0].fieldPath,
      apiFieldName: multiOfficeMeta[0].apiFieldName,
      value: "Islamabad",
      sourceText: "Islamabad head office",
      confidence: 1,
    },
    {
      fieldPath: multiOfficeMeta[1].fieldPath,
      apiFieldName: multiOfficeMeta[1].apiFieldName,
      value: "Lahore",
      sourceText: "Lahore office",
      confidence: 1,
    },
    {
      fieldPath: multiOfficeMeta[2].fieldPath,
      apiFieldName: multiOfficeMeta[2].apiFieldName,
      value: "Karachi",
      sourceText: "Karachi office",
      confidence: 1,
    },
  ],
  multiOfficeMeta,
  lookupResolutions,
  { deferCatalogLinking: true },
)
assert(multiOfficeApplied.applied.length === 3, "expected three office cities applied")
assert(
  multiOfficeApplied.formData.workExperiences[0].locations?.[0]?.city === "Islamabad",
  "expected office 0 Islamabad",
)
assert(
  multiOfficeApplied.formData.workExperiences[0].locations?.[1]?.city === "Lahore",
  "expected office 1 Lahore",
)
assert(
  multiOfficeApplied.formData.workExperiences[0].locations?.[2]?.city === "Karachi",
  "expected office 2 Karachi",
)

const multiOfficePrefillPaths = new Set(multiOfficeMeta.map((m) => m.fieldPath))
const multiOfficePrefill = buildEmployerCreatePrefillFromExtractRows(
  [
    {
      fieldPath: multiOfficeMeta[0].fieldPath,
      apiFieldName: multiOfficeMeta[0].apiFieldName,
      value: "Islamabad",
      sourceText: "Islamabad",
      confidence: 1,
    },
    {
      fieldPath: multiOfficeMeta[1].fieldPath,
      apiFieldName: multiOfficeMeta[1].apiFieldName,
      value: "Lahore",
      sourceText: "Lahore",
      confidence: 1,
    },
    {
      fieldPath: multiOfficeMeta[2].fieldPath,
      apiFieldName: multiOfficeMeta[2].apiFieldName,
      value: "Karachi",
      sourceText: "Karachi",
      confidence: 1,
    },
  ],
  multiOfficePrefillPaths,
  "we-1",
  new Map(
    multiOfficeMeta.map((m) => [
      m.fieldPath,
      { ...m, fieldType: "text" as const },
    ]),
  ),
)
assert(multiOfficePrefill.locations?.length === 3, "expected three employer prefill offices")
assert(multiOfficePrefill.locations?.[0]?.city === "Islamabad", "prefill office 0")
assert(multiOfficePrefill.locations?.[1]?.city === "Lahore", "prefill office 1")
assert(multiOfficePrefill.locations?.[2]?.city === "Karachi", "prefill office 2")

// Headquarters: office rows default isHeadquarters to false; extract true must still apply,
// then employer-create prefill from the WE row must copy the HQ switch.
const hqOfficeMeta: AllowedEmptyField[] = [
  {
    fieldPath: "workExperiences[we-1].locations[0].city",
    apiFieldName: "work_experience_0_office_0_city",
    fieldLabel: "City",
    fieldType: "text",
    requiresLinkedCatalogId: "employer",
  },
  {
    fieldPath: "workExperiences[we-1].locations[0].isHeadquarters",
    apiFieldName: "work_experience_0_office_0_isHeadquarters",
    fieldLabel: "Headquarters",
    fieldType: "boolean",
    requiresLinkedCatalogId: "employer",
  },
  {
    fieldPath: "workExperiences[we-1].locations[1].city",
    apiFieldName: "work_experience_0_office_1_city",
    fieldLabel: "City",
    fieldType: "text",
    requiresLinkedCatalogId: "employer",
  },
  {
    fieldPath: "workExperiences[we-1].locations[1].isHeadquarters",
    apiFieldName: "work_experience_0_office_1_isHeadquarters",
    fieldLabel: "Headquarters",
    fieldType: "boolean",
    requiresLinkedCatalogId: "employer",
  },
]
const hqOfficeApplied = applyCallNotesExtractionsToFormData(
  baseForm,
  [
    {
      fieldPath: hqOfficeMeta[0].fieldPath,
      apiFieldName: hqOfficeMeta[0].apiFieldName,
      value: "Islamabad",
      sourceText: "Islamabad head office",
      confidence: 1,
    },
    {
      fieldPath: hqOfficeMeta[1].fieldPath,
      apiFieldName: hqOfficeMeta[1].apiFieldName,
      value: true,
      sourceText: "this is Head office",
      confidence: 1,
    },
    {
      fieldPath: hqOfficeMeta[2].fieldPath,
      apiFieldName: hqOfficeMeta[2].apiFieldName,
      value: "Lahore",
      sourceText: "Lahore office",
      confidence: 1,
    },
    {
      fieldPath: hqOfficeMeta[3].fieldPath,
      apiFieldName: hqOfficeMeta[3].apiFieldName,
      value: false,
      sourceText: "Lahore office",
      confidence: 1,
    },
  ],
  hqOfficeMeta,
  lookupResolutions,
  { deferCatalogLinking: true },
)
assert(
  hqOfficeApplied.applied.some((p) => p === hqOfficeMeta[1].fieldPath),
  "expected office 0 isHeadquarters true to apply over default false",
)
assert(
  hqOfficeApplied.formData.workExperiences[0].locations?.[0]?.isHeadquarters === true,
  "expected Islamabad office HQ true on form after apply",
)
assert(
  hqOfficeApplied.formData.workExperiences[0].locations?.[1]?.isHeadquarters === false,
  "expected Lahore office HQ false on form after apply",
)
const hqCreatePrefill = buildEmployerCreatePrefillFromWorkExperience(
  hqOfficeApplied.formData.workExperiences[0],
)
assert(hqCreatePrefill.locations?.[0]?.city === "Islamabad", "WE prefill Islamabad city")
assert(
  hqCreatePrefill.locations?.[0]?.isHeadquarters === true,
  "WE prefill must copy HQ true onto employer create Islamabad office",
)
assert(hqCreatePrefill.locations?.[1]?.isHeadquarters === false, "WE prefill Lahore HQ false")

const hqAlreadyTrueForm: CandidateFormData = {
  ...hqOfficeApplied.formData,
  workExperiences: hqOfficeApplied.formData.workExperiences.map((we, i) =>
    i !== 0
      ? we
      : {
          ...we,
          locations: we.locations?.map((loc, li) =>
            li === 0 ? { ...loc, isHeadquarters: true } : loc,
          ),
        },
  ),
}
const hqOverwriteBlocked = applyCallNotesExtractionsToFormData(
  hqAlreadyTrueForm,
  [
    {
      fieldPath: hqOfficeMeta[1].fieldPath,
      apiFieldName: hqOfficeMeta[1].apiFieldName,
      value: false,
      sourceText: "not HQ",
      confidence: 1,
    },
  ],
  [hqOfficeMeta[1]],
  lookupResolutions,
  { deferCatalogLinking: true },
)
assert(
  hqOverwriteBlocked.applied.length === 0,
  "empty-only apply must not turn HQ off when it is already true",
)
assert(
  hqOverwriteBlocked.formData.workExperiences[0].locations?.[0]?.isHeadquarters === true,
  "expected HQ to stay true when extract sends false",
)

// Employer create prefill from selected extract rows
const weId = "we-1"
const selectedPaths = new Set([
  "workExperiences[we-1].employerName",
  "workExperiences[we-1].headcount",
  "workExperiences[we-1].foundedYear",
  "workExperiences[we-1].status",
  "workExperiences[we-1].locations[0].city",
  "workExperiences[we-1].layoffs[0].affectedEmployees",
])

const employerPrefillRows: CallNotesExtraction[] = [
  {
    fieldPath: "workExperiences[we-1].employerName",
    apiFieldName: "work_experience_0_employerName",
    value: "Acme Corp",
    sourceText: "works at Acme",
    confidence: 0.9,
  },
  {
    fieldPath: "workExperiences[we-1].headcount",
    apiFieldName: "work_experience_0_headcount",
    value: 1200,
    sourceText: "1200 employees",
    confidence: 0.85,
  },
  {
    fieldPath: "workExperiences[we-1].foundedYear",
    apiFieldName: "work_experience_0_foundedYear",
    value: 1998,
    sourceText: "founded 1998",
    confidence: 0.8,
  },
  {
    fieldPath: "workExperiences[we-1].status",
    apiFieldName: "work_experience_0_status",
    value: "Open",
    sourceText: "still active",
    confidence: 0.75,
  },
  {
    fieldPath: "workExperiences[we-1].locations[0].city",
    apiFieldName: "work_experience_0_office_0_city",
    value: "Karachi",
    sourceText: "Karachi office",
    confidence: 0.7,
  },
  {
    fieldPath: "workExperiences[we-1].layoffs[0].affectedEmployees",
    apiFieldName: "work_experience_0_layoff_0_affectedEmployees",
    value: 50,
    sourceText: "laid off 50",
    confidence: 0.65,
  },
]

const employerMeta = new Map<string, AllowedEmptyField>(
  employerPrefillRows.map((r) => [
    r.fieldPath,
    { fieldPath: r.fieldPath, apiFieldName: r.apiFieldName, fieldLabel: r.fieldPath, fieldType: "text" },
  ]),
)

const employerPrefill = buildEmployerCreatePrefillFromExtractRows(
  employerPrefillRows,
  selectedPaths,
  weId,
  employerMeta,
)

assert(employerPrefill.name === "Acme Corp", "employer prefill name")
assert(employerPrefill.headcount === "1200", "employer prefill headcount")
assert(employerPrefill.foundedYear === "1998", "employer prefill foundedYear")
assert(employerPrefill.status === "open", "employer prefill status db value")
assert(employerPrefill.locations?.[0]?.city === "Karachi", "employer prefill office city")
assert(
  employerPrefill.layoffs?.[0]?.numberOfEmployeesLaidOff === "50",
  "employer prefill layoff count",
)

// Project create prefill
const projId = "proj-1"
const projectSelectedPaths = new Set([
  "workExperiences[we-1].projects[proj-1].projectName",
  "workExperiences[we-1].projects[proj-1].description",
  "workExperiences[we-1].projects[proj-1].averageTeamSize",
  "workExperiences[we-1].employerName",
])

const projectPrefillRows: CallNotesExtraction[] = [
  {
    fieldPath: "workExperiences[we-1].projects[proj-1].projectName",
    apiFieldName: "work_experience_0_project_0_projectName",
    value: "Payments Platform",
    sourceText: "payments platform",
    confidence: 0.9,
  },
  {
    fieldPath: "workExperiences[we-1].projects[proj-1].description",
    apiFieldName: "work_experience_0_project_0_description",
    value: "Core billing system",
    sourceText: "billing system",
    confidence: 0.85,
  },
  {
    fieldPath: "workExperiences[we-1].projects[proj-1].averageTeamSize",
    apiFieldName: "work_experience_0_project_0_averageTeamSize",
    value: 8,
    sourceText: "team of 8",
    confidence: 0.8,
  },
  {
    fieldPath: "workExperiences[we-1].employerName",
    apiFieldName: "work_experience_0_employerName",
    value: "Acme Corp",
    sourceText: "at Acme",
    confidence: 0.75,
  },
]

const projectMeta = new Map<string, AllowedEmptyField>(
  projectPrefillRows.map((r) => [
    r.fieldPath,
    { fieldPath: r.fieldPath, apiFieldName: r.apiFieldName, fieldLabel: r.fieldPath, fieldType: "text" },
  ]),
)

const projectPrefill = buildProjectCreatePrefillFromExtractRows(
  projectPrefillRows,
  projectSelectedPaths,
  weId,
  projId,
  projectMeta,
)

assert(
  projectPrefill.formPrefill.projectName === "Payments Platform",
  "project prefill name",
)
assert(
  projectPrefill.formPrefill.description === "Core billing system",
  "project prefill description",
)
assert(
  projectPrefill.formPrefill.averageTeamSize === "8",
  "project prefill team size",
)
assert(projectPrefill.employerNameHint === "Acme Corp", "project prefill employer hint")

// Nested project apply: combobox name + description (not contribution) on projects[0]
const jazzProjectMeta: AllowedEmptyField[] = [
  {
    fieldPath: "workExperiences[we-1].projects[0].projectName",
    apiFieldName: "work_experience_0_project_0_projectName",
    fieldLabel: "Name",
    fieldType: "combobox",
    requiresLookupResolution: true,
  },
  {
    fieldPath: "workExperiences[we-1].projects[0].description",
    apiFieldName: "work_experience_0_project_0_description",
    fieldLabel: "Description",
    fieldType: "textarea",
    requiresLinkedCatalogId: "project",
  },
  {
    fieldPath: "workExperiences[we-1].projects[0].contributionNotes",
    apiFieldName: "work_experience_0_project_0_contributionNotes",
    fieldLabel: "Contribution",
    fieldType: "textarea",
  },
]
const jazzDescription =
  "Pakistan Mobile Communications Limited) is the largest mobile network and digital services operator in Pakistan, serving over 75 million subscribers"
const jazzContribution = "Owned WSO2 integration delivery on Jazz."
const jazzProjectApplied = applyCallNotesExtractionsToFormData(
  {
    ...baseForm,
    workExperiences: baseForm.workExperiences.map((we) => ({
      ...we,
      projects: we.projects.map((p) => ({
        ...p,
        projectName: "",
        contributionNotes: "",
        description: "",
      })),
    })),
  },
  [
    {
      fieldPath: jazzProjectMeta[0].fieldPath,
      apiFieldName: jazzProjectMeta[0].apiFieldName,
      value: "Jazz Project",
      sourceText: "Working on Jazz Project.",
      confidence: 1,
    },
    {
      fieldPath: jazzProjectMeta[1].fieldPath,
      apiFieldName: jazzProjectMeta[1].apiFieldName,
      value: jazzDescription,
      sourceText: "Project Discription:  Pakistan Mobile Communications Limited)",
      confidence: 1,
    },
    {
      fieldPath: jazzProjectMeta[2].fieldPath,
      apiFieldName: jazzProjectMeta[2].apiFieldName,
      value: jazzContribution,
      sourceText: "Contribution: Owned WSO2 integration delivery on Jazz.",
      confidence: 1,
    },
  ],
  jazzProjectMeta,
  lookupResolutions,
  { deferCatalogLinking: true },
)
assert(
  jazzProjectApplied.applied.includes(jazzProjectMeta[0].fieldPath),
  "expected projectName applied with deferCatalogLinking despite requiresLookupResolution",
)
assert(
  jazzProjectApplied.applied.includes(jazzProjectMeta[1].fieldPath),
  "expected description applied",
)
assert(
  jazzProjectApplied.applied.includes(jazzProjectMeta[2].fieldPath),
  "expected contributionNotes applied when extract returns contribution-specific text",
)
assert(
  jazzProjectApplied.formData.workExperiences[0].projects[0].projectName === "Jazz Project",
  "expected Jazz Project name on WE project row",
)
assert(
  jazzProjectApplied.formData.workExperiences[0].projects[0].description === jazzDescription,
  "expected Jazz description on WE project row",
)
assert(
  jazzProjectApplied.formData.workExperiences[0].projects[0].contributionNotes === jazzContribution,
  "expected contributionNotes to stay separate from description",
)
assert(
  jazzProjectApplied.formData.workExperiences[0].projects[0].contributionNotes !==
    jazzDescription,
  "description paragraph must not be stored as contributionNotes",
)

const jazzEmptyProjectsApplied = applyCallNotesExtractionsToFormData(
  {
    ...baseForm,
    workExperiences: baseForm.workExperiences.map((we) => ({ ...we, projects: [] })),
  },
  [
    {
      fieldPath: jazzProjectMeta[0].fieldPath,
      apiFieldName: jazzProjectMeta[0].apiFieldName,
      value: "Jazz Project",
      sourceText: "Working on Jazz Project.",
      confidence: 1,
    },
    {
      fieldPath: jazzProjectMeta[1].fieldPath,
      apiFieldName: jazzProjectMeta[1].apiFieldName,
      value: jazzDescription,
      sourceText: "Project Discription:",
      confidence: 1,
    },
  ],
  jazzProjectMeta,
  lookupResolutions,
  { deferCatalogLinking: true },
)
assert(
  jazzEmptyProjectsApplied.formData.workExperiences[0].projects[0]?.projectName === "Jazz Project",
  "expected auto-created project row from projects[0] path",
)
assert(
  jazzEmptyProjectsApplied.formData.workExperiences[0].projects[0]?.description === jazzDescription,
  "expected description on auto-created project row",
)
assert(
  !jazzEmptyProjectsApplied.formData.workExperiences[0].projects[0]?.contributionNotes?.trim(),
  "expected contributionNotes empty when extract did not return it",
)

const extractSnap = buildCallNotesExtractCandidateSnapshot({
  id: "1",
  workExperiences: [
    {
      id: "4ae422ac-1c93-48d9-bb7b-137045314df1",
      employerName: "Arcana Info",
      jobTitle: "Senior WSO2 Integration / Middleware Engineer",
      projects: [],
    },
  ],
} as unknown as Candidate)
assert(
  extractSnap.workExperiences?.[0]?.projects?.length === 1,
  "extract snapshot pads synthetic project slot when WE has no projects",
)
assert(
  extractSnap.workExperiences?.[0]?.projects?.[0]?.id === "0",
  "extract snapshot synthetic project id is 0",
)

// Draft create flow: defer catalog linking — apply without employer/project IDs
const employerNameMeta: AllowedEmptyField = {
  fieldPath: "workExperiences[we-1].employerName",
  apiFieldName: "work_experience_0_employerName",
  fieldLabel: "Employer",
  fieldType: "text",
  requiresLookupResolution: true,
}

const deferApplied = applyCallNotesExtractionsToFormData(
  baseForm,
  [
    {
      fieldPath: employerNameMeta.fieldPath,
      apiFieldName: employerNameMeta.apiFieldName,
      value: "NovaTech",
      sourceText: "works at NovaTech",
      confidence: 0.9,
    },
    headcountExtraction,
  ],
  [employerNameMeta, headcountMeta],
  undefined,
  { deferCatalogLinking: true },
)

assert(deferApplied.applied.length === 2, "defer mode applies name + headcount without lookup")
assert(
  deferApplied.formData.workExperiences[0].employerName === "NovaTech",
  "defer mode employer name only",
)
assert(deferApplied.formData.workExperiences[0].employerId == null, "defer mode employerId stays null")
assert(
  deferApplied.formData.workExperiences[0].headcount === "500",
  "defer mode headcount without linked employer",
)

const wePrefill = buildEmployerCreatePrefillFromWorkExperience(
  deferApplied.formData.workExperiences[0],
)
assert(wePrefill.headcount === "500", "form-state employer prefill headcount")

import {
  callNotesExtractEmployerOfficeSlotCount,
  generateQuestionsEmployerOfficeSlotCount,
} from "../src/lib/utils/qg-field-weights"
import { buildMissingOnlyQuestionRequest } from "../src/lib/utils/missing-only-question-request"
import {
  filterRecruiterQgFieldsToGenerate,
} from "../src/lib/utils/recruiter-candidate-access"
import { UserRole } from "../src/lib/types/user-role"

assert(generateQuestionsEmployerOfficeSlotCount(0) === 1, "generate-questions: synthetic office_0 when empty")
assert(generateQuestionsEmployerOfficeSlotCount(2) === 2, "generate-questions: two existing offices")
assert(generateQuestionsEmployerOfficeSlotCount(7) === 7, "generate-questions: keep all existing offices")

const compensationQgFields = [
  "currentSalary",
  "expectedSalary",
  "work_experience_0_salaryPolicy",
  "work_experience_0_benefits",
  "resume",
]
assert(
  filterRecruiterQgFieldsToGenerate(UserRole.Recruiter, compensationQgFields).join(",") === "resume",
  "recruiter generate-questions omits compensation fields",
)
assert(
  filterRecruiterQgFieldsToGenerate(UserRole.Admin, compensationQgFields).length ===
    compensationQgFields.length,
  "admin generate-questions keeps compensation fields",
)

assert(callNotesExtractEmployerOfficeSlotCount(0) === 5, "call-notes-extract: pad empty to five slots")
assert(callNotesExtractEmployerOfficeSlotCount(2) === 5, "call-notes-extract: pad partial list to five slots")
assert(callNotesExtractEmployerOfficeSlotCount(7) === 7, "call-notes-extract: keep offices above cap")

const qgOffices = buildMissingOnlyQuestionRequest({ workExperiences: [{}] })
assert(
  qgOffices.fieldsToGenerate.includes("work_experience_0_office_0_city"),
  "generate-questions includes first office slot",
)
assert(
  !qgOffices.fieldsToGenerate.includes("work_experience_0_office_1_city"),
  "generate-questions does not add a second empty office slot",
)

const extractOffices = buildMissingOnlyQuestionRequest(
  { workExperiences: [{}] },
  { employerOfficeSlots: "call-notes-extract" },
)
assert(
  extractOffices.fieldsToGenerate.includes("work_experience_0_office_4_city"),
  "call-notes-extract includes fifth office slot",
)
assert(
  !extractOffices.fieldsToGenerate.includes("work_experience_0_office_5_city"),
  "call-notes-extract does not add a sixth office slot",
)

assert(
  isCallNotesExtractApiFieldAllowed("work_experience_0_project_0_isMainContribution"),
  "extract allowlist accepts isMainContribution",
)
assert(
  !isQuestionFieldAllowed("work_experience", "work_experience_0_project_0_isMainContribution"),
  "generate-questions still rejects isMainContribution",
)

const jazzMainContributorMeta: AllowedEmptyField[] = [
  ...jazzProjectMeta,
  {
    fieldPath: "workExperiences[we-1].projects[0].isMainContribution",
    apiFieldName: "work_experience_0_project_0_isMainContribution",
    fieldLabel: "Main Contributor",
    fieldType: "boolean",
    options: [
      { value: "true", label: "Yes" },
      { value: "false", label: "No" },
    ],
  },
]
const jazzMainContributorApplied = applyCallNotesExtractionsToFormData(
  {
    ...baseForm,
    workExperiences: baseForm.workExperiences.map((we) => ({
      ...we,
      projects: we.projects.map((p) => ({
        ...p,
        isMainContribution: false,
      })),
    })),
  },
  [
    {
      fieldPath: jazzMainContributorMeta[3].fieldPath,
      apiFieldName: jazzMainContributorMeta[3].apiFieldName,
      value: true,
      sourceText: "Was Main Contributor in the project",
      confidence: 1,
    },
  ],
  jazzMainContributorMeta,
  lookupResolutions,
  { deferCatalogLinking: true },
)
assert(
  jazzMainContributorApplied.formData.workExperiences[0].projects[0].isMainContribution === true,
  "expected isMainContribution true to apply over default false",
)

const jazzMainContributorYesApplied = applyCallNotesExtractionsToFormData(
  {
    ...baseForm,
    workExperiences: baseForm.workExperiences.map((we) => ({
      ...we,
      projects: we.projects.map((p) => ({
        ...p,
        isMainContribution: false,
      })),
    })),
  },
  [
    {
      fieldPath: jazzMainContributorMeta[3].fieldPath,
      apiFieldName: jazzMainContributorMeta[3].apiFieldName,
      value: "yes",
      sourceText: "Was Main Contributor in the project",
      confidence: 1,
    },
  ],
  jazzMainContributorMeta,
  lookupResolutions,
  { deferCatalogLinking: true },
)
assert(
  jazzMainContributorYesApplied.formData.workExperiences[0].projects[0].isMainContribution ===
    true,
  "expected isMainContribution yes string to apply as true",
)

const jazzMainContributorOverwriteBlocked = applyCallNotesExtractionsToFormData(
  {
    ...baseForm,
    workExperiences: baseForm.workExperiences.map((we) => ({
      ...we,
      projects: we.projects.map((p) => ({
        ...p,
        isMainContribution: true,
      })),
    })),
  },
  [
    {
      fieldPath: jazzMainContributorMeta[3].fieldPath,
      apiFieldName: jazzMainContributorMeta[3].apiFieldName,
      value: false,
      sourceText: "Was Main Contributor in the project",
      confidence: 1,
    },
  ],
  jazzMainContributorMeta,
  lookupResolutions,
  { deferCatalogLinking: true },
)
assert(
  jazzMainContributorOverwriteBlocked.formData.workExperiences[0].projects[0]
    .isMainContribution === true,
  "expected already-true isMainContribution not to be overwritten",
)

const extractWhitelistCandidate = {
  id: "1",
  workExperiences: [
    {
      id: "5cbf0838-66a3-4df1-a457-6fdbb2a65287",
      employerName: "Arcana Info",
      jobTitle: "Senior WSO2 Integration / Middleware Engineer",
      projects: [],
    },
  ],
} as unknown as Candidate
const extractWhitelist = buildCallNotesAllowedEmptyFields(extractWhitelistCandidate)
const mainContributorRow = extractWhitelist.find(
  (row) => row.apiFieldName === "work_experience_0_project_0_isMainContribution",
)
assert(mainContributorRow != null, "expected extract whitelist to inject isMainContribution")
assert(
  mainContributorRow?.fieldPath ===
    "workExperiences[5cbf0838-66a3-4df1-a457-6fdbb2a65287].projects[0].isMainContribution",
  "expected synthetic projects[0] isMainContribution path",
)
assert(mainContributorRow?.fieldType === "boolean", "expected isMainContribution boolean type")
assert(
  mainContributorRow?.requiresLinkedCatalogId == null,
  "expected isMainContribution not to require a linked project catalog id",
)

const whitelistApiNames = new Set(extractWhitelist.map((row) => row.apiFieldName))
assert(
  whitelistApiNames.has("work_experience_0_project_0_averageTeamSize"),
  "expected extract whitelist to include averageTeamSize",
)
assert(
  whitelistApiNames.has("work_experience_0_project_0_clientLocations"),
  "expected extract whitelist to include clientLocations",
)
assert(
  !whitelistApiNames.has("work_experience_0_project_0_projectLink"),
  "expected extract whitelist to omit projectLink",
)
assert(
  !whitelistApiNames.has("work_experience_0_project_0_isPublished"),
  "expected extract whitelist to omit isPublished",
)
assert(
  !whitelistApiNames.has("work_experience_0_project_0_publishPlatforms"),
  "expected extract whitelist to omit publishPlatforms",
)
assert(
  !whitelistApiNames.has("work_experience_0_project_0_downloadCount"),
  "expected extract whitelist to omit downloadCount",
)
assert(
  !isCallNotesExtractApiFieldAllowed("work_experience_0_project_0_projectLink"),
  "extract allowlist rejects projectLink",
)
assert(
  !isCallNotesExtractApiFieldAllowed("work_experience_0_project_0_isPublished"),
  "extract allowlist rejects isPublished",
)
assert(
  !isCallNotesExtractApiFieldAllowed("work_experience_0_project_0_publishPlatforms"),
  "extract allowlist rejects publishPlatforms",
)
assert(
  !isCallNotesExtractApiFieldAllowed("work_experience_0_project_0_downloadCount"),
  "extract allowlist rejects downloadCount",
)
assert(
  isQuestionFieldAllowed("work_experience", "work_experience_0_project_0_averageTeamSize"),
  "generate-questions still allows averageTeamSize",
)
const verticalDomainWhitelist = extractWhitelist.find(
  (row) => row.apiFieldName === "work_experience_0_project_0_verticalDomains",
)
assert(
  verticalDomainWhitelist != null,
  "expected extract whitelist to include verticalDomains",
)
assert(
  (verticalDomainWhitelist?.options?.length ?? 0) === 0,
  "CNE19: extract whitelist must omit domain catalog options so review stays spoken",
)
const horizontalDomainWhitelist = extractWhitelist.find(
  (row) => row.apiFieldName === "work_experience_0_project_0_horizontalDomains",
)
assert(
  (horizontalDomainWhitelist?.options?.length ?? 0) === 0,
  "CNE19: extract whitelist must omit horizontalDomains catalog options",
)
const technicalDomainWhitelist = extractWhitelist.find(
  (row) => row.apiFieldName === "work_experience_0_project_0_technicalDomains",
)
assert(
  (technicalDomainWhitelist?.options?.length ?? 0) === 0,
  "CNE19: extract whitelist must omit technicalDomains catalog options",
)

const jazzCatalogExtrasMeta: AllowedEmptyField[] = [
  {
    fieldPath: "workExperiences[we-1].projects[0].averageTeamSize",
    apiFieldName: "work_experience_0_project_0_averageTeamSize",
    fieldLabel: "Average Team Size",
    fieldType: "number",
    requiresLinkedCatalogId: "project",
  },
  {
    fieldPath: "workExperiences[we-1].projects[0].clientLocations",
    apiFieldName: "work_experience_0_project_0_clientLocations",
    fieldLabel: "Client Location",
    fieldType: "multiselect",
    requiresLinkedCatalogId: "project",
  },
  {
    fieldPath: "workExperiences[we-1].projects[0].verticalDomains",
    apiFieldName: "work_experience_0_project_0_verticalDomains",
    fieldLabel: "Vertical Domains",
    fieldType: "multiselect",
    requiresLinkedCatalogId: "project",
  },
  {
    fieldPath: "workExperiences[we-1].projects[0].horizontalDomains",
    apiFieldName: "work_experience_0_project_0_horizontalDomains",
    fieldLabel: "Horizontal Domains",
    fieldType: "multiselect",
    requiresLinkedCatalogId: "project",
  },
  {
    fieldPath: "workExperiences[we-1].projects[0].technicalDomains",
    apiFieldName: "work_experience_0_project_0_technicalDomains",
    fieldLabel: "Technical Domains",
    fieldType: "multiselect",
    requiresLinkedCatalogId: "project",
  },
]
const jazzCatalogExtrasApplied = applyCallNotesExtractionsToFormData(
  {
    ...baseForm,
    workExperiences: baseForm.workExperiences.map((we) => ({
      ...we,
      projects: we.projects.map((p) => ({
        ...p,
        averageTeamSize: "",
        clientLocations: [],
        verticalDomains: [],
        horizontalDomains: [],
        technicalDomains: [],
      })),
    })),
  },
  [
    {
      fieldPath: jazzCatalogExtrasMeta[0].fieldPath,
      apiFieldName: jazzCatalogExtrasMeta[0].apiFieldName,
      value: 15,
      sourceText: "Team size is 15",
      confidence: 1,
    },
    {
      fieldPath: jazzCatalogExtrasMeta[1].fieldPath,
      apiFieldName: jazzCatalogExtrasMeta[1].apiFieldName,
      value: ["USA"],
      sourceText: "Client is located in USA",
      confidence: 1,
    },
    {
      fieldPath: jazzCatalogExtrasMeta[2].fieldPath,
      apiFieldName: jazzCatalogExtrasMeta[2].apiFieldName,
      value: ["gaming"],
      sourceText: "Vertical Domain is gaming",
      confidence: 1,
    },
    {
      fieldPath: jazzCatalogExtrasMeta[3].fieldPath,
      apiFieldName: jazzCatalogExtrasMeta[3].apiFieldName,
      value: ["ERP"],
      sourceText: "Horizontal Domain is ERP",
      confidence: 1,
    },
    {
      fieldPath: jazzCatalogExtrasMeta[4].fieldPath,
      apiFieldName: jazzCatalogExtrasMeta[4].apiFieldName,
      value: "AI, ML, Devops",
      sourceText: "Technical Domain is AI, ML, Devops",
      confidence: 1,
    },
  ],
  jazzCatalogExtrasMeta,
  lookupResolutions,
  { deferCatalogLinking: true },
)
const jazzExtrasProject = jazzCatalogExtrasApplied.formData.workExperiences[0].projects[0]
assert(jazzExtrasProject.averageTeamSize === "15", "expected averageTeamSize 15")
assert(
  JSON.stringify(jazzExtrasProject.clientLocations) === JSON.stringify(["USA"]),
  "expected clientLocations USA",
)
assert(
  JSON.stringify(jazzExtrasProject.verticalDomains) === JSON.stringify(["Gaming"]),
  "expected verticalDomains mapped to catalog Gaming",
)
assert(
  JSON.stringify(jazzExtrasProject.horizontalDomains) ===
    JSON.stringify(["ERP (Enterprise Resource Planning)"]),
  "expected horizontalDomains mapped to catalog ERP label",
)
assert(
  JSON.stringify(jazzExtrasProject.technicalDomains) ===
    JSON.stringify([
      "Artificial Intelligence (AI)",
      "Machine Learning (ML)",
      "DevOps",
    ]),
  "expected technicalDomains mapped to catalog AI/ML/DevOps labels",
)
const jazzProjectCreatePrefill = buildProjectCreatePrefillFromProjectExperience(jazzExtrasProject)
assert(
  JSON.stringify(jazzProjectCreatePrefill.clientLocations) === JSON.stringify(["USA"]),
  "expected + Add New Project prefill to keep clientLocations USA",
)
assert(
  JSON.stringify(jazzProjectCreatePrefill.verticalDomains) === JSON.stringify(["Gaming"]),
  "expected + Add New Project prefill to select catalog Gaming",
)
assert(
  JSON.stringify(jazzProjectCreatePrefill.horizontalDomains) ===
    JSON.stringify(["ERP (Enterprise Resource Planning)"]),
  "expected + Add New Project prefill to select catalog ERP",
)
assert(
  JSON.stringify(jazzProjectCreatePrefill.technicalDomains) ===
    JSON.stringify([
      "Artificial Intelligence (AI)",
      "Machine Learning (ML)",
      "DevOps",
    ]),
  "expected + Add New Project prefill to select catalog technical domains",
)
const spokenDomainPrefill = buildProjectCreatePrefillFromProjectExperience({
  ...jazzExtrasProject,
  verticalDomains: ["gaming"],
  horizontalDomains: ["ERP"],
  technicalDomains: ["AI", "ML", "Devops"],
})
assert(
  JSON.stringify(spokenDomainPrefill.verticalDomains) === JSON.stringify(["Gaming"]),
  "expected spoken gaming to pre-select catalog Gaming",
)
assert(
  JSON.stringify(spokenDomainPrefill.horizontalDomains) ===
    JSON.stringify(["ERP (Enterprise Resource Planning)"]),
  "expected spoken ERP to pre-select catalog ERP label",
)
assert(
  JSON.stringify(spokenDomainPrefill.technicalDomains) ===
    JSON.stringify([
      "Artificial Intelligence (AI)",
      "Machine Learning (ML)",
      "DevOps",
    ]),
  "expected spoken AI/ML/Devops to pre-select catalog technical domains",
)
assert(
  formatQgDisplayValue(["gaming", "ERP", "AI", "ML", "Devops"]) ===
    "gaming, ERP, AI, ML, Devops",
  "CNE19: Analyze Notes review must show spoken domain tokens, not catalog labels",
)

const lockedOutApply = applyCallNotesExtractionsToFormData(
  {
    ...baseForm,
    workExperiences: baseForm.workExperiences.map((we) => ({
      ...we,
      projects: we.projects.map((p) => ({
        ...p,
        link: "",
        publishPlatforms: [],
        downloadCount: "",
      })),
    })),
  },
  [
    {
      fieldPath: "workExperiences[we-1].projects[0].link",
      apiFieldName: "work_experience_0_project_0_projectLink",
      value: "https://www.google.com",
      sourceText: "Here's the link: https://www.google.com",
      confidence: 1,
    },
    {
      fieldPath: "workExperiences[we-1].projects[0].publishPlatforms",
      apiFieldName: "work_experience_0_project_0_publishPlatforms",
      value: ["Play Store", "App Store"],
      sourceText: "The App is Published on Play Store and App Store",
      confidence: 1,
    },
    {
      fieldPath: "workExperiences[we-1].projects[0].downloadCount",
      apiFieldName: "work_experience_0_project_0_downloadCount",
      value: 350000,
      sourceText: "It has 350000 active users",
      confidence: 1,
    },
  ],
  jazzCatalogExtrasMeta,
  lookupResolutions,
  { deferCatalogLinking: true },
)
const lockedOutProject = lockedOutApply.formData.workExperiences[0].projects[0]
assert(!lockedOutProject.link, "expected project link not mapped from extract")
assert(
  (lockedOutProject.publishPlatforms ?? []).length === 0,
  "expected publish platforms not mapped from extract",
)
assert(!lockedOutProject.downloadCount, "expected download count not mapped from extract")
assert(
  lockedOutApply.skipped.some((row) => row.fieldPath.endsWith(".link")),
  "expected projectLink extraction skipped as not in whitelist",
)

const alreadyMainContributorWhitelist = buildCallNotesAllowedEmptyFields({
  id: "1",
  workExperiences: [
    {
      id: "5cbf0838-66a3-4df1-a457-6fdbb2a65287",
      employerName: "Arcana Info",
      jobTitle: "Senior WSO2 Integration / Middleware Engineer",
      projects: [
        {
          id: "proj-1",
          projectId: null,
          projectName: "Jazz Project",
          contributionNotes: "",
          isMainContribution: true,
        },
      ],
    },
  ],
} as unknown as Candidate)
assert(
  !alreadyMainContributorWhitelist.some((row) =>
    row.apiFieldName.endsWith("_isMainContribution"),
  ),
  "expected isMainContribution omitted when already true",
)

async function testUsaClientLocationLookup(): Promise<void> {
  const existingUnitedStates = [{ id: 5, name: "United States" }]
  const createdUsaIds = await resolveLookupIdsByName(
    ["USA"],
    existingUnitedStates,
    async (name) => ({ id: 99, name }),
  )
  assert(
    JSON.stringify(createdUsaIds) === JSON.stringify([99]),
    "expected USA to create a new client location id, not map to United States",
  )
  const reusedUsaIds = await resolveLookupIdsByName(
    ["USA"],
    [{ id: 7, name: "USA" }, ...existingUnitedStates],
  )
  assert(
    JSON.stringify(reusedUsaIds) === JSON.stringify([7]),
    "expected existing USA lookup row to be reused",
  )
}

const achievementTypeExtractMeta: AllowedEmptyField[] = [
  {
    fieldPath: "achievements[0].name",
    apiFieldName: "achievement_0_name",
    fieldLabel: "Name",
    fieldType: "text",
    requiresLookupResolution: false,
  },
  {
    fieldPath: "achievements[0].achievementType",
    apiFieldName: "achievement_0_achievementType",
    fieldLabel: "Achievement Type",
    fieldType: "select",
    requiresLookupResolution: false,
    options: [
      { value: "competition", label: "Competition" },
      { value: "medal", label: "Medal" },
    ],
  },
]
const achievementTypeExtractApplied = applyCallNotesExtractionsToFormData(
  { ...baseForm, achievements: [] },
  [
    {
      fieldPath: "achievements[0].name",
      apiFieldName: "achievement_0_name",
      value: "Gold Medal",
      sourceText: "Achieved Gold Medal in 2025",
      confidence: 1,
    },
    {
      fieldPath: "achievements[0].achievementType",
      apiFieldName: "achievement_0_achievementType",
      value: "Medal",
      sourceText: "Achieved Gold Medal in 2025",
      confidence: 1,
    },
  ],
  achievementTypeExtractMeta,
  lookupResolutions,
  { deferCatalogLinking: true },
)
assert(
  achievementTypeExtractApplied.formData.achievements[0]?.name === "Gold Medal",
  "expected achievement name Gold Medal",
)
assert(
  achievementTypeExtractApplied.formData.achievements[0]?.achievementType === "medal",
  "expected extract Medal to select catalog medal, not leftover competition",
)

const competitionPlaceholderForm: CandidateFormData = {
  ...baseForm,
  achievements: [
    {
      id: "0",
      name: "",
      achievementType: "competition",
      ranking: "",
      year: undefined,
      url: "",
      description: "",
    },
  ],
}
const medalOverPlaceholder = applyCallNotesExtractionsToFormData(
  competitionPlaceholderForm,
  [
    {
      fieldPath: "achievements[0].achievementType",
      apiFieldName: "achievement_0_achievementType",
      value: "Medal",
      sourceText: "Achieved Gold Medal in 2025",
      confidence: 1,
    },
  ],
  achievementTypeExtractMeta,
  lookupResolutions,
  { deferCatalogLinking: true },
)
assert(
  medalOverPlaceholder.formData.achievements[0]?.achievementType === "medal",
  "expected placeholder competition to be treated as unset for extract apply",
)

testUsaClientLocationLookup()
  .then(() => {
    console.log("call-notes-extract-v2: all tests passed")
  })
  .catch((error: unknown) => {
    console.error(error)
    process.exitCode = 1
  })
