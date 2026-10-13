import type { CandidateFormData } from "@/components/candidate-creation-dialog"
import { mergeCandidatePrefill } from "@/lib/candidate/resume-to-candidate-form"
import type {
  Candidate,
  CandidateCertification,
  CandidateEducation,
  ProjectExperience,
  ShiftType,
  WorkExperience,
  WorkMode,
} from "@/lib/types/candidate"
import type { EmployerBenefit } from "@/lib/types/benefits"
import type { CertificationLevel } from "@/lib/types/certification"

const EMPTY_FORM: CandidateFormData = {
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
  mentors: [],
  competitions: [],
  callNotes: "",
  finalRemarks: "",
}

function parseOptionalNumber(raw: string | undefined): number | null {
  if (raw == null || !String(raw).trim()) return null
  const n = Number(String(raw).replace(/,/g, "").trim())
  return Number.isFinite(n) ? n : null
}

function mapFormProjects(
  projects: CandidateFormData["workExperiences"][number]["projects"],
): ProjectExperience[] {
  return (projects ?? []).map((p) => ({
    id: p.id,
    projectId: p.projectId ?? null,
    projectName: p.projectName || "",
    contributionNotes: p.contributionNotes ?? null,
    isMainContribution: p.isMainContribution === true,
  }))
}

function mapFormBenefits(
  benefits: CandidateFormData["workExperiences"][number]["benefits"],
): EmployerBenefit[] {
  return (benefits ?? []).map((b) => ({
    id: b.id,
    name: b.name,
    hasValue: b.hasValue,
    amount: b.amount,
    unit: b.unit,
  }))
}

function mapFormWorkExperiences(
  rows: CandidateFormData["workExperiences"],
): WorkExperience[] {
  return (rows ?? []).map((we) => ({
    id: we.id,
    employerId: we.employerId ?? null,
    employerLocationId: we.employerLocationId ?? null,
    employerName: we.employerName || "",
    jobTitle: we.jobTitle || "",
    projects: mapFormProjects(we.projects),
    startDate: we.startDate,
    endDate: we.endDate,
    techStacks: we.techStacks || [],
    shiftType: (we.shiftType || "") as ShiftType | "",
    workMode: (we.workMode || "") as WorkMode | "",
    timeSupportZones: we.timeSupportZones || [],
    benefits: mapFormBenefits(we.benefits),
  }))
}

function mapFormCertifications(
  rows: CandidateFormData["certifications"],
): CandidateCertification[] {
  return (rows ?? []).map((c) => ({
    id: c.id,
    certificationId: c.certificationId ?? null,
    certificationName: c.certificationName || "",
    certificationIssuerName: c.certificationIssuerName ?? null,
    certificationLevel: (c.certificationLevel || null) as CertificationLevel | "" | null,
    issueDate: c.issueDate,
    expiryDate: c.expiryDate,
    certificationUrl: c.certificationUrl || null,
  }))
}

function mapFormEducations(
  rows: CandidateFormData["educations"],
): CandidateEducation[] {
  return (rows ?? []).map((e) => ({
    id: e.id,
    universityLocationId: e.universityLocationId || "",
    universityLocationName: e.universityLocationName || "",
    campusLocationId: e.campusLocationId ?? null,
    degreeName: e.degreeName || "",
    majorName: e.majorName || "",
    startMonth: e.startMonth,
    endMonth: e.endMonth,
    grades: e.grades || null,
    isTopper: e.isTopper ?? null,
    isCheetah: e.isCheetah ?? null,
  }))
}

/** Merge Auto-Profiler partial into a full form snapshot used for Create Candidate prefill. */
export function buildDraftCreateFormSnapshot(
  partial: Partial<CandidateFormData>,
): CandidateFormData {
  return mergeCandidatePrefill(EMPTY_FORM, partial)
}

export interface BuildDraftColdCallerCandidateInput {
  form: CandidateFormData
  resumeFile?: File | null
  /** Client-only id (non-numeric) so call-notes GET/PATCH are skipped. */
  draftId?: string
}

/**
 * Builds an in-memory {@link Candidate} for draft Cold Caller (no DB row).
 * Uses a non-numeric `id` so saved-candidate call-notes APIs are not called.
 */
export function buildDraftColdCallerCandidate({
  form,
  resumeFile = null,
  draftId = `draft-${crypto.randomUUID()}`,
}: BuildDraftColdCallerCandidateInput): Candidate {
  const now = new Date()
  const hasResume = !!resumeFile

  return {
    id: draftId,
    name: form.name.trim() || "Unnamed candidate",
    postingTitle: form.postingTitle.trim() || null,
    email: form.email.trim(),
    mobileNo: form.contactNumber.trim(),
    cnic: form.cnic.trim() || null,
    currentSalary: parseOptionalNumber(form.currentSalary),
    expectedSalary: parseOptionalNumber(form.expectedSalary),
    city: form.city.trim(),
    githubUrl: form.githubUrl.trim() || null,
    linkedinUrl: form.linkedinUrl.trim() || null,
    source: form.source.trim() || "",
    status: "sourced",
    hasResume,
    resumeFileName: resumeFile?.name ?? null,
    resumeContentType: resumeFile?.type || null,
    resumeFileSizeBytes: resumeFile?.size ?? null,
    resumeUploadedAt: null,
    workExperiences: mapFormWorkExperiences(form.workExperiences),
    certifications: mapFormCertifications(form.certifications),
    educations: mapFormEducations(form.educations),
    techStacks: form.techStacks ?? [],
    personalityType: form.personalityType.trim() || null,
    achievements: form.achievements ?? [],
    competitions: form.competitions ?? [],
    createdAt: now,
    updatedAt: now,
  }
}

/** True when the candidate id is a client draft (not a persisted DB id). */
export function isDraftColdCallerCandidateId(candidateId: string): boolean {
  return !Number.isFinite(Number(candidateId))
}
