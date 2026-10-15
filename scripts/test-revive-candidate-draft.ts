/**
 * Local draft date revival — smoke test (JSON round-trip).
 * Run: npx tsx scripts/test-revive-candidate-draft.ts
 */

import type { CandidateFormData } from "../src/components/candidate-creation-dialog"
import { EMPTY_CANDIDATE_FORM } from "../src/lib/candidate/candidate-draft-payload"
import {
  reviveCandidateFormFromLocalStorage,
  reviveDateFieldFromLocalStorage,
} from "../src/lib/candidate/revive-candidate-form-from-local-storage"
import { toLocalDateOnlyKey } from "../src/lib/utils/work-experience-dates"

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message)
}

const isoStart = "2023-04-01T00:00:00.000Z"
const isoEnd = "2024-06-15T00:00:00.000Z"

const withDates: CandidateFormData = {
  ...EMPTY_CANDIDATE_FORM,
  name: "Draft User",
  callDate: isoStart as unknown as Date,
  workExperiences: [
    {
      ...EMPTY_CANDIDATE_FORM.workExperiences[0],
      id: "we-1",
      employerName: "Acme",
      jobTitle: "Dev",
      startDate: isoStart as unknown as Date,
      endDate: isoEnd as unknown as Date,
      projects: [
        {
          id: "p-1",
          projectId: null,
          projectName: "Proj",
          contributionNotes: "",
          isMainContribution: false,
          startDate: isoStart as unknown as Date,
          endDate: isoEnd as unknown as Date,
        },
      ],
      layoffs: [
        {
          id: "l-1",
          layoffDate: isoEnd as unknown as Date,
          affectedEmployees: "",
          reason: "",
        },
      ],
    },
  ],
  certifications: [
    {
      id: "c-1",
      certificationId: null,
      certificationName: "Cert",
      certificationIssuerName: null,
      certificationLevel: "",
      issueDate: isoStart as unknown as Date,
      expiryDate: isoEnd as unknown as Date,
      certificationUrl: "",
    },
  ],
  educations: [
    {
      id: "e-1",
      universityLocationId: "",
      universityLocationName: "",
      campusLocationId: null,
      degreeName: "",
      majorName: "",
      startMonth: isoStart as unknown as Date,
      endMonth: isoEnd as unknown as Date,
      grades: "",
      isTopper: false,
      isCheetah: false,
    },
  ],
}

const serialized = JSON.parse(JSON.stringify(withDates)) as CandidateFormData
const revived = reviveCandidateFormFromLocalStorage(serialized)

const we = revived.workExperiences[0]
assert(we.startDate instanceof Date, "WE startDate should be Date")
assert(we.endDate instanceof Date, "WE endDate should be Date")
assert(typeof we.startDate!.getFullYear === "function", "startDate.getFullYear")
assert(typeof we.endDate!.getFullYear === "function", "endDate.getFullYear")

// Same path as CandidateCreationDialog workExperienceDateIssues useMemo
toLocalDateOnlyKey(we.startDate!)
toLocalDateOnlyKey(we.endDate!)

assert(reviveDateFieldFromLocalStorage(isoStart) instanceof Date, "ISO string revives")
assert(reviveDateFieldFromLocalStorage("2024-03-15") instanceof Date, "date-only revives")
assert(reviveDateFieldFromLocalStorage(undefined) === undefined, "undefined stays undefined")

console.log("revive-candidate-draft: ok")
