import type { CandidateFormData } from "@/components/candidate-creation-dialog"
import { parseLocalDateFromApi } from "@/lib/utils/work-experience-dates"

/** Restore `Date` fields after `JSON.parse` (dates are stored as ISO strings). */
export function reviveDateFieldFromLocalStorage(value: unknown): Date | undefined {
  if (value == null || value === "") return undefined
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? undefined : value
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    const d = new Date(value)
    return Number.isNaN(d.getTime()) ? undefined : d
  }
  if (typeof value === "string") {
    const trimmed = value.trim()
    if (!trimmed) return undefined
    const dateOnly = /^(\d{4}-\d{2}-\d{2})/.exec(trimmed)
    if (dateOnly) {
      const fromApi = parseLocalDateFromApi(dateOnly[1])
      if (fromApi) return fromApi
    }
    const d = new Date(trimmed)
    return Number.isNaN(d.getTime()) ? undefined : d
  }
  return undefined
}

/** Deep-enough revival for local draft snapshots (full `CandidateFormData` JSON). */
export function reviveCandidateFormFromLocalStorage(
  snapshot: CandidateFormData,
): CandidateFormData {
  return {
    ...snapshot,
    callDate: reviveDateFieldFromLocalStorage(snapshot.callDate),
    workExperiences: (snapshot.workExperiences ?? []).map((we) => ({
      ...we,
      startDate: reviveDateFieldFromLocalStorage(we.startDate),
      endDate: reviveDateFieldFromLocalStorage(we.endDate),
      projects: (we.projects ?? []).map((proj) => ({
        ...proj,
        startDate: reviveDateFieldFromLocalStorage(proj.startDate),
        endDate: reviveDateFieldFromLocalStorage(proj.endDate),
      })),
      layoffs: (we.layoffs ?? []).map((row) => ({
        ...row,
        layoffDate: reviveDateFieldFromLocalStorage(row.layoffDate),
      })),
    })),
    certifications: (snapshot.certifications ?? []).map((cert) => ({
      ...cert,
      issueDate: reviveDateFieldFromLocalStorage(cert.issueDate),
      expiryDate: reviveDateFieldFromLocalStorage(cert.expiryDate),
    })),
    educations: (snapshot.educations ?? []).map((edu) => ({
      ...edu,
      startMonth: reviveDateFieldFromLocalStorage(edu.startMonth),
      endMonth: reviveDateFieldFromLocalStorage(edu.endMonth),
    })),
  }
}
