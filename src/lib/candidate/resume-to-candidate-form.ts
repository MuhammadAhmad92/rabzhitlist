import type {
  CandidateFormData,
  WorkExperience,
  CandidateCertification,
  CandidateEducation,
  ProjectExperience,
} from "@/components/candidate-creation-dialog"
import type { Achievement, AchievementType } from "@/lib/types/candidate"
import type { CertificationLevelDb } from "@/lib/constants/candidate-enums"
import { CERTIFICATION_LEVEL_DB } from "@/lib/constants/candidate-enums"
import { unwrapResumeParsedRoot } from "@/lib/services/resume-parser-api"
import { dedupeTechStackNames } from "@/lib/utils/tech-stack-lookup"

function asRecord(v: unknown): Record<string, unknown> | null {
  return v != null && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : null
}

function str(v: unknown): string {
  if (v == null) return ""
  if (typeof v === "string") return v.trim()
  if (typeof v === "number" && Number.isFinite(v)) return String(v)
  return String(v).trim()
}

function numStr(v: unknown): string {
  const s = str(v)
  return s
}

/** Month name/abbrev → 0–11 (resume text like "SEPT 2023", "Feb 2021"). */
const RESUME_MONTH_TO_INDEX: Record<string, number> = {
  jan: 0,
  january: 0,
  feb: 1,
  february: 1,
  mar: 2,
  march: 2,
  apr: 3,
  april: 3,
  may: 4,
  jun: 5,
  june: 5,
  jul: 6,
  july: 6,
  aug: 7,
  august: 7,
  sep: 8,
  sept: 8,
  september: 8,
  oct: 9,
  october: 9,
  nov: 10,
  november: 10,
  dec: 11,
  december: 11,
}

function parseFlexibleMonthYearString(v: unknown): Date | undefined {
  const raw = str(v).replace(/\./g, "").replace(/\s+/g, " ").trim()
  if (!raw) return undefined
  const parts = raw.split(" ")
  if (parts.length < 2) return undefined
  const yearStr = parts[parts.length - 1]
  if (!/^\d{4}$/.test(yearStr)) return undefined
  const y = parseInt(yearStr, 10)
  if (y < 1900 || y > 2100) return undefined
  const monKey = parts[0].toLowerCase()
  const monthIdx = RESUME_MONTH_TO_INDEX[monKey]
  if (monthIdx === undefined) return undefined
  return new Date(y, monthIdx, 1)
}

/** Parses employment dates from LLM/resume JSON (month+year, CURRENT, ISO, etc.). */
function parseEmploymentDate(raw: unknown, kind: "start" | "end"): Date | undefined {
  if (raw == null || raw === "") return undefined
  const s = str(raw)
  if (!s) return undefined
  const u = s.toUpperCase().replace(/\s+/g, " ").trim()
  if (
    kind === "end" &&
    (u === "CURRENT" || u === "PRESENT" || u === "ONGOING" || u === "NOW" || u === "TILL DATE" || u === "TODAY")
  ) {
    return undefined
  }
  const my = parseFlexibleMonthYearString(raw)
  if (my) return my
  return parseFlexibleDate(raw)
}

function parseFlexibleDate(v: unknown): Date | undefined {
  if (v == null || v === "") return undefined
  if (typeof v === "number" && Number.isFinite(v) && v >= 1900 && v <= 2100) {
    return new Date(v, 0, 1)
  }
  if (v instanceof Date && !Number.isNaN(v.getTime())) return v
  const s = str(v)
  if (!s) return undefined
  if (/^\d{4}$/.test(s)) {
    const y = parseInt(s, 10)
    if (y >= 1900 && y <= 2100) return new Date(y, 0, 1)
  }
  const d = new Date(s)
  if (!Number.isNaN(d.getTime())) return d
  if (/^\d{4}-\d{2}$/.test(s)) {
    const d2 = new Date(`${s}-01`)
    if (!Number.isNaN(d2.getTime())) return d2
  }
  if (/^\d{1,2}\/\d{4}$/.test(s)) {
    const d3 = new Date(`01/${s}`)
    if (!Number.isNaN(d3.getTime())) return d3
  }
  const my = parseFlexibleMonthYearString(v)
  if (my) return my
  return undefined
}

function pick(obj: Record<string, unknown> | null, keys: string[]): unknown {
  if (!obj) return undefined
  for (const k of keys) {
    if (k in obj && obj[k] != null && obj[k] !== "") return obj[k]
  }
  return undefined
}

function mapCertLevel(raw: unknown): CertificationLevelDb | "" {
  const s = str(raw).toLowerCase().replace(/\s+/g, "")
  if (!s) return ""
  const map: Record<string, CertificationLevelDb> = {
    foundation: "foundation",
    associate: "associate",
    professional: "professional",
    expert: "expert",
    master: "master",
  }
  if (map[s]) return map[s]
  for (const lvl of CERTIFICATION_LEVEL_DB) {
    if (s.includes(lvl)) return lvl
  }
  return ""
}

function mapAchievementType(raw: unknown): AchievementType {
  const s = str(raw).toLowerCase().replace(/\s+/g, "")
  const allowed: AchievementType[] = [
    "competition",
    "openSource",
    "award",
    "medal",
    "publication",
    "certification",
    "recognition",
    "other",
  ]
  const aliases: Record<string, AchievementType> = {
    competition: "competition",
    opensource: "openSource",
    award: "award",
    medal: "medal",
    publication: "publication",
    certification: "certification",
    recognition: "recognition",
    other: "other",
    hackathon: "competition",
    bugbounty: "competition",
  }
  if (aliases[s]) return aliases[s]
  if (allowed.includes(s as AchievementType)) return s as AchievementType
  return "other"
}

function newProjectRow(name: string, notes: string): ProjectExperience {
  return {
    id: crypto.randomUUID(),
    projectId: null,
    projectName: name,
    contributionNotes: notes,
    isMainContribution: false,
  }
}

function mapWorkExperiences(raw: unknown): WorkExperience[] {
  if (!Array.isArray(raw)) return []
  const out: WorkExperience[] = []
  for (const item of raw) {
    const o = asRecord(item)
    if (!o) continue
    const employer =
      str(pick(o, ["employerName", "employer", "company", "companyName", "organization"])) || ""
    const jobTitle =
      str(pick(o, ["jobTitle", "job_title", "title", "role", "position"])) || ""
    if (!employer && !jobTitle) continue

    const projectsRaw = pick(o, ["projects", "projectList", "roles"])
    const projectRows: ProjectExperience[] = []
    if (Array.isArray(projectsRaw)) {
      for (const p of projectsRaw) {
        const pr = asRecord(p)
        const pname = str(
          pr ? pick(pr, ["name", "projectName", "project_name", "title", "project"]) : p
        )
        const notes = str(
          pr ? pick(pr, ["description", "contribution", "contributionNotes", "contribution_notes", "summary"]) : ""
        )
        if (pname) projectRows.push(newProjectRow(pname, notes))
      }
    }

    const techRaw = pick(o, ["techStacks", "tech_stacks", "technologies", "skills", "tech"])
    const techStacks = Array.isArray(techRaw)
      ? dedupeTechStackNames(techRaw.map((t) => str(t)).filter(Boolean))
      : []

    out.push({
      id: crypto.randomUUID(),
      employerId: null,
      employerLocationId: null,
      employerName: employer,
      jobTitle,
      projects: projectRows,
      startDate: parseEmploymentDate(pick(o, ["startDate", "start_date", "start", "from"]), "start"),
      endDate: parseEmploymentDate(pick(o, ["endDate", "end_date", "end", "to"]), "end"),
      techStacks,
      shiftType: str(pick(o, ["shiftType", "shift_type"])),
      workMode: str(pick(o, ["workMode", "work_mode"])),
      salaryPolicy: "",
      minimumSalary: "",
      maximumSalary: "",
      timeSupportZones: [],
      benefits: [],
      modules: [],
    })
  }
  return out
}

function mapStandaloneProjectsAsWeProjects(raw: unknown): ProjectExperience[] {
  if (!Array.isArray(raw)) return []
  const out: ProjectExperience[] = []
  for (const item of raw) {
    const o = asRecord(item)
    // Flask / LLM schema uses project_name + contribution_notes (see API_DOCUMENTATION.md).
    const name = str(
      o ? pick(o, ["name", "projectName", "project_name", "title", "project"]) : item
    )
    if (!name) continue
    const notes = str(
      o
        ? pick(o, [
            "contribution_notes",
            "contributionNotes",
            "contribution",
            "description",
            "summary",
            "notes",
          ])
        : ""
    )
    out.push(newProjectRow(name, notes))
  }
  return out
}

function mapCertifications(raw: unknown): CandidateCertification[] {
  if (!Array.isArray(raw)) return []
  const out: CandidateCertification[] = []
  for (const item of raw) {
    const o = asRecord(item)
    if (!o) continue
    const certificationName =
      str(
        pick(o, [
          "certification_name",
          "certificationName",
          "name",
          "title",
          "certificate_name",
          "certificateName",
        ])
      ) || ""
    if (!certificationName) continue
    const certificationUrl = str(
      pick(o, [
        "certification_url",
        "certificationUrl",
        "url",
        "link",
        "credentialUrl",
        "credential_url",
      ])
    )
    const certificationIssuerWebsiteUrl =
      str(pick(o, ["issuing_body_url", "issuingBodyUrl", "issuer_website_url", "issuerWebsiteUrl"])) ||
      null
    out.push({
      id: crypto.randomUUID(),
      certificationId: null,
      certificationName,
      certificationIssuerName:
        str(
          pick(o, [
            "issuing_body",
            "issuingBody",
            "issuer",
            "issuerName",
            "organization",
            "issuing_organization",
          ])
        ) || null,
      certificationIssuerWebsiteUrl,
      certificationLevel: mapCertLevel(
        pick(o, ["certification_level", "certificationLevel", "level"])
      ),
      issueDate: parseFlexibleDate(
        pick(o, ["issue_date", "issueDate", "issued", "date", "issued_date"])
      ),
      expiryDate: parseFlexibleDate(
        pick(o, ["expiry_date", "expiryDate", "expirationDate", "expires", "expiration_date"])
      ),
      certificationUrl,
    })
  }
  return out
}

function mapEducation(raw: unknown): CandidateEducation[] {
  if (!Array.isArray(raw)) return []
  const out: CandidateEducation[] = []
  for (const item of raw) {
    const o = asRecord(item)
    if (!o) continue
    const universityLocationName = str(
      pick(o, ["university", "universityName", "school", "institution", "college"])
    )
    const degreeName = str(pick(o, ["degree", "degreeName"]))
    const majorName = str(pick(o, ["major", "majorName", "fieldOfStudy", "field"]))
    if (!universityLocationName && !degreeName && !majorName) continue
    const topperRaw = pick(o, ["topper", "isTopper"])
    const isTopper =
      topperRaw === true ||
      str(topperRaw).toLowerCase() === "true" ||
      str(topperRaw).toLowerCase() === "yes"
    out.push({
      id: crypto.randomUUID(),
      universityLocationId: "",
      universityLocationName,
      campusLocationId: null,
      degreeName,
      majorName,
      startMonth: parseFlexibleDate(pick(o, ["startDate", "start", "start_year", "startYear"])),
      endMonth: parseFlexibleDate(pick(o, ["endDate", "end", "graduationDate", "end_year", "endYear"])),
      grades: str(pick(o, ["gpa", "grades", "grade"])),
      isTopper,
      isCheetah: false,
    })
  }
  return out
}

function mapAchievements(raw: unknown): Achievement[] {
  if (!Array.isArray(raw)) return []
  const out: Achievement[] = []
  for (const item of raw) {
    const o = asRecord(item)
    const name = str(o ? pick(o, ["name", "title", "achievement"]) : item)
    if (!name) continue
    const yearRaw = o ? pick(o, ["year"]) : undefined
    let year: number | undefined
    if (typeof yearRaw === "number" && Number.isFinite(yearRaw)) year = yearRaw
    else {
      const ys = str(yearRaw)
      if (ys && /^\d{4}$/.test(ys)) year = parseInt(ys, 10)
    }
    out.push({
      id: crypto.randomUUID(),
      name,
      achievementType: mapAchievementType(o ? pick(o, ["type", "achievementType", "category"]) : undefined),
      ranking: o ? str(pick(o, ["ranking", "rank", "award"])) || undefined : undefined,
      year,
      url: o ? str(pick(o, ["url", "link"])) || undefined : undefined,
      description: o ? str(pick(o, ["description", "summary"])) || undefined : undefined,
    })
  }
  return out
}

function mapTechStacks(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  const names = raw.map((t) => str(t)).filter(Boolean)
  return dedupeTechStackNames(names).sort((a, b) => a.localeCompare(b))
}

/**
 * Maps arbitrary JSON from an external resume / LLM pipeline into a partial candidate form.
 * Employer, project, and certification catalog IDs stay null — user links them in the UI.
 */
export function resumeJsonToPartialCandidateForm(raw: unknown): Partial<CandidateFormData> {
  const root = unwrapResumeParsedRoot(raw)
  if (!root) return {}

  const basic =
    asRecord(
      pick(root, [
        "basicInformation",
        "basicInfo",
        "basic",
        "basic_information",
        "candidate",
        "personal",
      ])
    ) ?? root

  const partial: Partial<CandidateFormData> = {}

  const name = str(pick(basic, ["name", "fullName"]))
  if (name) partial.name = name
  const email = str(pick(basic, ["email", "emailAddress", "email_address"]))
  if (email) partial.email = email
  const contactNumber = str(pick(basic, ["phone", "mobile", "contactNumber", "telephone", "number"]))
  if (contactNumber) partial.contactNumber = contactNumber
  const city = str(pick(basic, ["city", "location", "residential_city_or_full_address"]))
  if (city) partial.city = city
  const postingTitle = str(pick(basic, ["postingTitle", "headline", "title"]))
  if (postingTitle) partial.postingTitle = postingTitle
  const linkedinUrl = str(
    pick(basic, ["linkedinUrl", "linkedin_url", "linkedInUrl", "linkedin", "linkedIn"])
  )
  if (linkedinUrl) partial.linkedinUrl = linkedinUrl
  const githubUrl = str(pick(basic, ["githubUrl", "github_url", "gitHubUrl", "github", "gitHub"]))
  if (githubUrl) partial.githubUrl = githubUrl
  const cnic = str(pick(basic, ["cnic", "nationalId", "ssn"]))
  if (cnic) partial.cnic = cnic
  const currentSalary = numStr(pick(basic, ["currentSalary", "current_salary"]))
  if (currentSalary) partial.currentSalary = currentSalary
  const expectedSalary = numStr(pick(basic, ["expectedSalary", "expected_salary"]))
  if (expectedSalary) partial.expectedSalary = expectedSalary

  const work = pick(root, [
    "workExperiences",
    "workExperience",
    "work_experience",
    "employment",
    "experiences",
    "jobs",
  ])
  const workRows = mapWorkExperiences(work ?? [])

  const projectsRaw = pick(root, ["projects", "standaloneProjects", "standalone_projects", "personalProjects"])
  const orphanWeProjects = mapStandaloneProjectsAsWeProjects(projectsRaw ?? [])
  if (orphanWeProjects.length > 0) {
    workRows.push({
      id: crypto.randomUUID(),
      employerId: null,
      employerLocationId: null,
      employerName: "",
      jobTitle: "",
      projects: orphanWeProjects,
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
    })
  }
  if (workRows.length) partial.workExperiences = workRows

  const tech = pick(root, ["techStacks", "skills", "technologies", "technicalSkills", "technical_skills"])
  const techList = mapTechStacks(tech ?? [])
  if (techList.length) partial.techStacks = techList

  const edu = pick(root, ["education", "educations", "degrees"])
  const eduRows = mapEducation(edu ?? [])
  if (eduRows.length) partial.educations = eduRows

  const certs = pick(root, ["certifications", "certificates", "licenses"])
  const certRows = mapCertifications(certs ?? [])
  if (certRows.length) partial.certifications = certRows

  const ach = pick(root, ["achievements", "awards", "honors"])
  const achRows = mapAchievements(ach ?? [])
  if (achRows.length) partial.achievements = achRows

  return partial
}

export function hasPrefillContent(p: Partial<CandidateFormData>): boolean {
  if (str(p.name)) return true
  if (str(p.email)) return true
  if (str(p.contactNumber)) return true
  if ((p.workExperiences?.length ?? 0) > 0) return true
  if ((p.techStacks?.length ?? 0) > 0) return true
  if ((p.educations?.length ?? 0) > 0) return true
  if ((p.certifications?.length ?? 0) > 0) return true
  if ((p.achievements?.length ?? 0) > 0) return true
  if (str(p.city)) return true
  if (str(p.postingTitle)) return true
  if (str(p.linkedinUrl) || str(p.githubUrl)) return true
  if (str(p.callNotes)) return true
  return false
}

/** Deep-enough merge for create flow: `partial` overwrites scalar fields; arrays replaced when partial has length. */
export function mergeCandidatePrefill(
  base: CandidateFormData,
  partial: Partial<CandidateFormData>
): CandidateFormData {
  return {
    ...base,
    ...partial,
    workExperiences:
      partial.workExperiences && partial.workExperiences.length > 0
        ? partial.workExperiences
        : base.workExperiences,
    certifications:
      partial.certifications && partial.certifications.length > 0
        ? partial.certifications
        : base.certifications,
    educations:
      partial.educations && partial.educations.length > 0 ? partial.educations : base.educations,
    techStacks:
      partial.techStacks && partial.techStacks.length > 0 ? partial.techStacks : base.techStacks,
    achievements:
      partial.achievements && partial.achievements.length > 0
        ? partial.achievements
        : base.achievements,
    competitions:
      partial.competitions && partial.competitions.length > 0
        ? partial.competitions
        : base.competitions,
  }
}

export type UnresolvedCatalogRef = {
  id: string
  label: string
  anchorId: string
}

/**
 * Catalog fields that need linking (ID) before save: employer, project, university, certification.
 * Used by Create Candidate "Link catalog records" panel after resume prefill.
 */
export function collectUnresolvedCatalogRefs(data: CandidateFormData): UnresolvedCatalogRef[] {
  const out: UnresolvedCatalogRef[] = []

  data.workExperiences.forEach((we, i) => {
    if (we.employerId == null && we.employerName?.trim()) {
      out.push({
        id: `we-${i}-employer`,
        label: `Experience ${i + 1}: Employer — ${we.employerName.trim()}`,
        anchorId: `prefill-anchor-we-${i}-employer`,
      })
    }
    we.projects.forEach((p, j) => {
      if (p.projectId == null && p.projectName?.trim()) {
        out.push({
          id: `we-${i}-proj-${j}`,
          label: `Experience ${i + 1}: Project — ${p.projectName.trim()}`,
          anchorId: `prefill-anchor-we-${i}-project-${j}`,
        })
      }
    })
  })

  data.educations.forEach((edu, i) => {
    const idEmpty = !String(edu.universityLocationId ?? "").trim()
    if (idEmpty && edu.universityLocationName?.trim()) {
      out.push({
        id: `edu-${i}-uni`,
        label: `Education ${i + 1}: University — ${edu.universityLocationName.trim()}`,
        anchorId: `prefill-anchor-edu-${i}-university`,
      })
    }
  })

  data.certifications.forEach((c, i) => {
    if (c.certificationId == null && c.certificationName?.trim()) {
      out.push({
        id: `cert-${i}`,
        label: `Certification — ${c.certificationName.trim()}`,
        anchorId: `prefill-anchor-cert-${i}`,
      })
    }
  })

  return out
}
