import type { CandidateFormData } from "@/components/candidate-creation-dialog"
import { reviveCandidateFormFromLocalStorage } from "@/lib/candidate/revive-candidate-form-from-local-storage"

const KEY_PREFIX = "candidate-create-draft-local:"

export interface CandidateDraftLocalPayload {
  formSnapshot: CandidateFormData
  savedAt: string
}

export function getCandidateDraftLocalStorageKey(userKey: string): string {
  return `${KEY_PREFIX}${userKey || "anonymous"}`
}

export function readCandidateDraftLocal(userKey: string): CandidateDraftLocalPayload | null {
  if (typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem(getCandidateDraftLocalStorageKey(userKey))
    if (!raw) return null
    const parsed = JSON.parse(raw) as CandidateDraftLocalPayload
    if (!parsed?.formSnapshot || typeof parsed.formSnapshot !== "object") return null
    return {
      formSnapshot: reviveCandidateFormFromLocalStorage(
        parsed.formSnapshot as CandidateFormData,
      ),
      savedAt: typeof parsed.savedAt === "string" ? parsed.savedAt : new Date().toISOString(),
    }
  } catch {
    return null
  }
}

export function writeCandidateDraftLocal(
  userKey: string,
  payload: CandidateDraftLocalPayload,
): void {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(getCandidateDraftLocalStorageKey(userKey), JSON.stringify(payload))
  } catch {
    // quota exceeded — ignore
  }
}

export function clearCandidateDraftLocal(userKey: string): void {
  if (typeof window === "undefined") return
  try {
    localStorage.removeItem(getCandidateDraftLocalStorageKey(userKey))
  } catch {
    // ignore
  }
}
