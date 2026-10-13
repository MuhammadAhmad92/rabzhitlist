import type { CandidateFormData } from "@/components/candidate-creation-dialog"

export const EMPTY_CANDIDATE_FORM: CandidateFormData = {
  name: "",
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
  callStatus: "",
  callDate: undefined,
  workExperiences: [],
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

/** True when form JSON differs from the empty create baseline (used for local draft prompts and autosave). */
export function isMeaningfulFormChange(
  form: CandidateFormData,
  baseline: CandidateFormData = EMPTY_CANDIDATE_FORM,
): boolean {
  return JSON.stringify(form) !== JSON.stringify(baseline)
}
