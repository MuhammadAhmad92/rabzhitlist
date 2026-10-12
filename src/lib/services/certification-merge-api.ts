import { apiPost } from "@/lib/api-client"
import type {
  CertificationMergeImpact,
  CertificationMergeIssuerPreview,
  CertificationMergePreviewResponse,
  CertificationMergeRequest,
  CertificationMergeResponse,
  CertificationMergeFieldPreview,
} from "@/lib/types/certification-merge"

const PREVIEW_PATH = "/api/certifications/merge/preview"
const MERGE_PATH = "/api/certifications/merge"

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value == null || typeof value !== "object" || Array.isArray(value)) return null
  return value as Record<string, unknown>
}

function pickNumber(obj: Record<string, unknown>, camel: string, pascal: string): number | null {
  const raw = obj[camel] ?? obj[pascal]
  if (typeof raw === "number" && Number.isFinite(raw)) return raw
  if (typeof raw === "string" && raw.trim()) {
    const n = Number(raw)
    if (Number.isFinite(n)) return n
  }
  return null
}

function pickString(obj: Record<string, unknown>, camel: string, pascal: string): string {
  const raw = obj[camel] ?? obj[pascal]
  return typeof raw === "string" ? raw : ""
}

function mapIssuer(raw: unknown): CertificationMergeIssuerPreview | null {
  const obj = asRecord(raw)
  if (!obj) return null
  const id = pickNumber(obj, "id", "Id")
  const nameRaw = pickString(obj, "name", "Name").trim()
  return {
    id: id != null && id > 0 ? id : null,
    name: nameRaw || null,
  }
}

function mapImpact(raw: unknown): CertificationMergeImpact {
  const obj = asRecord(raw) ?? {}
  return {
    distinctCandidatesAffected:
      pickNumber(obj, "distinctCandidatesAffected", "DistinctCandidatesAffected") ?? 0,
    distinctCandidateCertificationLinksAffected:
      pickNumber(
        obj,
        "distinctCandidateCertificationLinksAffected",
        "DistinctCandidateCertificationLinksAffected",
      ) ?? 0,
    duplicateLinksRemoved:
      pickNumber(obj, "duplicateLinksRemoved", "DuplicateLinksRemoved") ?? 0,
  }
}

function mapFieldPreview(raw: unknown): CertificationMergeFieldPreview {
  const obj = asRecord(raw) ?? {}
  const modeRaw = pickString(obj, "mode", "Mode").trim()
  const mode = modeRaw === "fromSource" ? "fromSource" : "keepTarget"
  const value = pickString(obj, "value", "Value").trim()
  const fromSourceId = pickNumber(obj, "fromSourceId", "FromSourceId")
  const issuerId = pickNumber(obj, "issuerId", "IssuerId")
  const issuerNameRaw = pickString(obj, "issuerName", "IssuerName").trim()
  return {
    mode,
    value: value || undefined,
    fromSourceId: fromSourceId ?? undefined,
    issuerId: issuerId ?? undefined,
    issuerName: issuerNameRaw || null,
  }
}

function mapSourcePreview(
  raw: unknown,
): CertificationMergePreviewResponse["sources"][number] | null {
  const obj = asRecord(raw)
  if (!obj) return null
  const certificationId = pickNumber(obj, "certificationId", "CertificationId")
  const name = pickString(obj, "name", "Name").trim()
  if (certificationId == null || certificationId <= 0 || !name) return null
  return {
    certificationId,
    name,
    usageCountBefore: pickNumber(obj, "usageCountBefore", "UsageCountBefore") ?? 0,
    issuer: mapIssuer(obj.issuer ?? obj.Issuer),
  }
}

function mapTargetPreview(
  raw: unknown,
  usageKey: "usageCountAfter" | "usageCount",
): CertificationMergePreviewResponse["target"] | CertificationMergeResponse["target"] | null {
  const obj = asRecord(raw)
  if (!obj) return null
  const certificationId = pickNumber(obj, "certificationId", "CertificationId")
  const name = pickString(obj, "name", "Name").trim()
  if (certificationId == null || certificationId <= 0 || !name) return null
  const usage =
    usageKey === "usageCountAfter"
      ? pickNumber(obj, "usageCountAfter", "UsageCountAfter") ??
        pickNumber(obj, "usageCount", "UsageCount") ??
        0
      : pickNumber(obj, "usageCount", "UsageCount") ??
        pickNumber(obj, "usageCountAfter", "UsageCountAfter") ??
        0

  if (usageKey === "usageCountAfter") {
    return {
      certificationId,
      name,
      issuer: mapIssuer(obj.issuer ?? obj.Issuer),
      usageCountAfter: usage,
    }
  }
  return {
    certificationId,
    name,
    issuer: mapIssuer(obj.issuer ?? obj.Issuer),
    usageCount: usage,
  }
}

function mapPreviewResponse(raw: unknown): CertificationMergePreviewResponse {
  const root = asRecord(raw)
  if (!root) throw new Error("Invalid preview response.")
  const targetRaw = mapTargetPreview(root.target ?? root.Target, "usageCountAfter")
  if (!targetRaw || !("usageCountAfter" in targetRaw)) {
    throw new Error("Invalid preview response: missing target.")
  }
  const sourcesRaw = root.sources ?? root.Sources
  const sources = Array.isArray(sourcesRaw)
    ? sourcesRaw
        .map(mapSourcePreview)
        .filter((row): row is NonNullable<typeof row> => row != null)
    : []
  const frObj = asRecord(root.fieldResolutionPreview ?? root.FieldResolutionPreview) ?? {}
  return {
    target: targetRaw,
    sources,
    fieldResolutionPreview: {
      name: mapFieldPreview(frObj.name ?? frObj.Name),
      issuer: mapFieldPreview(frObj.issuer ?? frObj.Issuer),
    },
    impact: mapImpact(root.impact ?? root.Impact),
  }
}

function mapMergeResponse(raw: unknown): CertificationMergeResponse {
  const root = asRecord(raw)
  if (!root) throw new Error("Invalid merge response.")
  const targetRaw = mapTargetPreview(root.target ?? root.Target, "usageCount")
  if (!targetRaw || !("usageCount" in targetRaw)) {
    throw new Error("Invalid merge response: missing target.")
  }
  const mergedRaw = root.mergedSourceIds ?? root.MergedSourceIds
  const mergedSourceIds = Array.isArray(mergedRaw)
    ? mergedRaw
        .map((id) => (typeof id === "number" ? id : Number(id)))
        .filter((id) => Number.isInteger(id) && id > 0)
    : []

  return {
    target: targetRaw,
    mergedSourceIds,
    impact: mapImpact(root.impact ?? root.Impact),
  }
}

export function serializeCertificationMergeRequest(body: CertificationMergeRequest): string {
  return JSON.stringify(body)
}

export async function previewCertificationMerge(
  body: CertificationMergeRequest,
): Promise<CertificationMergePreviewResponse> {
  const raw = await apiPost<unknown>(PREVIEW_PATH, body)
  return mapPreviewResponse(raw)
}

export async function executeCertificationMerge(
  body: CertificationMergeRequest,
): Promise<CertificationMergeResponse> {
  const raw = await apiPost<unknown>(MERGE_PATH, body)
  return mapMergeResponse(raw)
}
