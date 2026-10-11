import { apiPost } from "@/lib/api-client"
import type {
  MajorMergeImpact,
  MajorMergePreviewResponse,
  MajorMergeRequest,
  MajorMergeResponse,
} from "@/lib/types/major-merge"

const PREVIEW_PATH = "/api/majors/merge/preview"
const MERGE_PATH = "/api/majors/merge"

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

function mapImpact(raw: unknown): MajorMergeImpact {
  const obj = asRecord(raw) ?? {}
  return {
    distinctCandidatesAffected:
      pickNumber(obj, "distinctCandidatesAffected", "DistinctCandidatesAffected") ?? 0,
    distinctEducationRowsAffected:
      pickNumber(obj, "distinctEducationRowsAffected", "DistinctEducationRowsAffected") ??
      pickNumber(obj, "distinctEducationsAffected", "DistinctEducationsAffected") ??
      0,
  }
}

function mapSourcePreview(raw: unknown): MajorMergePreviewResponse["sources"][number] | null {
  const obj = asRecord(raw)
  if (!obj) return null
  const majorId = pickNumber(obj, "majorId", "MajorId")
  const name = pickString(obj, "name", "Name").trim()
  if (majorId == null || majorId <= 0 || !name) return null
  return {
    majorId,
    name,
    usageCountBefore: pickNumber(obj, "usageCountBefore", "UsageCountBefore") ?? 0,
  }
}

function mapPreviewResponse(raw: unknown): MajorMergePreviewResponse {
  const root = asRecord(raw)
  if (!root) throw new Error("Invalid preview response.")
  const targetObj = asRecord(root.target ?? root.Target)
  if (!targetObj) throw new Error("Invalid preview response: missing target.")
  const majorId = pickNumber(targetObj, "majorId", "MajorId")
  const name = pickString(targetObj, "name", "Name").trim()
  if (majorId == null || majorId <= 0 || !name) {
    throw new Error("Invalid preview response: target id or name.")
  }
  const sourcesRaw = root.sources ?? root.Sources
  const sources = Array.isArray(sourcesRaw)
    ? sourcesRaw
        .map(mapSourcePreview)
        .filter((row): row is NonNullable<typeof row> => row != null)
    : []

  return {
    target: {
      majorId,
      name,
      usageCountAfter:
        pickNumber(targetObj, "usageCountAfter", "UsageCountAfter") ??
        pickNumber(targetObj, "usageCount", "UsageCount") ??
        0,
    },
    sources,
    impact: mapImpact(root.impact ?? root.Impact),
  }
}

function mapMergeResponse(raw: unknown): MajorMergeResponse {
  const root = asRecord(raw)
  if (!root) throw new Error("Invalid merge response.")
  const targetObj = asRecord(root.target ?? root.Target)
  if (!targetObj) throw new Error("Invalid merge response: missing target.")
  const majorId = pickNumber(targetObj, "majorId", "MajorId")
  const name = pickString(targetObj, "name", "Name").trim()
  if (majorId == null || majorId <= 0 || !name) {
    throw new Error("Invalid merge response: target id or name.")
  }
  const mergedRaw = root.mergedSourceIds ?? root.MergedSourceIds
  const mergedSourceIds = Array.isArray(mergedRaw)
    ? mergedRaw
        .map((id) => (typeof id === "number" ? id : Number(id)))
        .filter((id) => Number.isInteger(id) && id > 0)
    : []

  return {
    target: {
      majorId,
      name,
      usageCount: pickNumber(targetObj, "usageCount", "UsageCount") ?? 0,
    },
    mergedSourceIds,
    impact: mapImpact(root.impact ?? root.Impact),
  }
}

export async function previewMajorMerge(body: MajorMergeRequest): Promise<MajorMergePreviewResponse> {
  const raw = await apiPost<unknown>(PREVIEW_PATH, body)
  return mapPreviewResponse(raw)
}

export async function executeMajorMerge(body: MajorMergeRequest): Promise<MajorMergeResponse> {
  const raw = await apiPost<unknown>(MERGE_PATH, body)
  return mapMergeResponse(raw)
}
