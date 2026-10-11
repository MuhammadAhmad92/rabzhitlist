import { apiPost } from "@/lib/api-client"
import type {
  TimeSupportZoneMergeImpact,
  TimeSupportZoneMergePreviewResponse,
  TimeSupportZoneMergeRequest,
  TimeSupportZoneMergeResponse,
} from "@/lib/types/time-support-zone-merge"

const PREVIEW_PATH = "/api/timesupportzones/merge/preview"
const MERGE_PATH = "/api/timesupportzones/merge"

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

function mapDuplicateLinksRemoved(
  raw: unknown,
): TimeSupportZoneMergeImpact["duplicateLinksRemoved"] {
  const obj = asRecord(raw) ?? {}
  return {
    employerTimeSupportZones:
      pickNumber(obj, "employerTimeSupportZones", "EmployerTimeSupportZones") ?? 0,
    workExperienceTimeSupportZones:
      pickNumber(obj, "workExperienceTimeSupportZones", "WorkExperienceTimeSupportZones") ?? 0,
  }
}

function mapImpact(raw: unknown): TimeSupportZoneMergeImpact {
  const obj = asRecord(raw) ?? {}
  return {
    distinctEmployersAffected:
      pickNumber(obj, "distinctEmployersAffected", "DistinctEmployersAffected") ?? 0,
    distinctWorkExperiencesAffected:
      pickNumber(obj, "distinctWorkExperiencesAffected", "DistinctWorkExperiencesAffected") ?? 0,
    duplicateLinksRemoved: mapDuplicateLinksRemoved(
      obj.duplicateLinksRemoved ?? obj.DuplicateLinksRemoved,
    ),
  }
}

function mapSourcePreview(
  raw: unknown,
): TimeSupportZoneMergePreviewResponse["sources"][number] | null {
  const obj = asRecord(raw)
  if (!obj) return null
  const timeSupportZoneId = pickNumber(obj, "timeSupportZoneId", "TimeSupportZoneId")
  const name = pickString(obj, "name", "Name").trim()
  if (timeSupportZoneId == null || timeSupportZoneId <= 0 || !name) return null
  return {
    timeSupportZoneId,
    name,
    usageCountBefore: pickNumber(obj, "usageCountBefore", "UsageCountBefore") ?? 0,
  }
}

function mapPreviewResponse(raw: unknown): TimeSupportZoneMergePreviewResponse {
  const root = asRecord(raw)
  if (!root) throw new Error("Invalid preview response.")
  const targetObj = asRecord(root.target ?? root.Target)
  if (!targetObj) throw new Error("Invalid preview response: missing target.")
  const timeSupportZoneId = pickNumber(targetObj, "timeSupportZoneId", "TimeSupportZoneId")
  const name = pickString(targetObj, "name", "Name").trim()
  if (timeSupportZoneId == null || timeSupportZoneId <= 0 || !name) {
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
      timeSupportZoneId,
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

function mapMergeResponse(raw: unknown): TimeSupportZoneMergeResponse {
  const root = asRecord(raw)
  if (!root) throw new Error("Invalid merge response.")
  const targetObj = asRecord(root.target ?? root.Target)
  if (!targetObj) throw new Error("Invalid merge response: missing target.")
  const timeSupportZoneId = pickNumber(targetObj, "timeSupportZoneId", "TimeSupportZoneId")
  const name = pickString(targetObj, "name", "Name").trim()
  if (timeSupportZoneId == null || timeSupportZoneId <= 0 || !name) {
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
      timeSupportZoneId,
      name,
      usageCount: pickNumber(targetObj, "usageCount", "UsageCount") ?? 0,
    },
    mergedSourceIds,
    impact: mapImpact(root.impact ?? root.Impact),
  }
}

export async function previewTimeSupportZoneMerge(
  body: TimeSupportZoneMergeRequest,
): Promise<TimeSupportZoneMergePreviewResponse> {
  const raw = await apiPost<unknown>(PREVIEW_PATH, body)
  return mapPreviewResponse(raw)
}

export async function executeTimeSupportZoneMerge(
  body: TimeSupportZoneMergeRequest,
): Promise<TimeSupportZoneMergeResponse> {
  const raw = await apiPost<unknown>(MERGE_PATH, body)
  return mapMergeResponse(raw)
}
