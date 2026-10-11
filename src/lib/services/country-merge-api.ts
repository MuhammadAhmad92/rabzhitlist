import { apiPost } from "@/lib/api-client"
import type {
  CountryMergeImpact,
  CountryMergePreviewResponse,
  CountryMergeRequest,
  CountryMergeResponse,
} from "@/lib/types/country-merge"

const PREVIEW_PATH = "/api/countries/merge/preview"
const MERGE_PATH = "/api/countries/merge"

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

function mapImpact(raw: unknown): CountryMergeImpact {
  const obj = asRecord(raw) ?? {}
  return {
    distinctUniversitiesAffected:
      pickNumber(obj, "distinctUniversitiesAffected", "DistinctUniversitiesAffected") ?? 0,
    distinctEmployerLocationsAffected:
      pickNumber(obj, "distinctEmployerLocationsAffected", "DistinctEmployerLocationsAffected") ??
      0,
    distinctEmployersAffected:
      pickNumber(obj, "distinctEmployersAffected", "DistinctEmployersAffected") ?? 0,
  }
}

function mapSourcePreview(
  raw: unknown,
): CountryMergePreviewResponse["sources"][number] | null {
  const obj = asRecord(raw)
  if (!obj) return null
  const countryId = pickNumber(obj, "countryId", "CountryId")
  const name = pickString(obj, "name", "Name").trim()
  if (countryId == null || countryId <= 0 || !name) return null
  return {
    countryId,
    name,
    usageCountBefore: pickNumber(obj, "usageCountBefore", "UsageCountBefore") ?? 0,
  }
}

function mapPreviewResponse(raw: unknown): CountryMergePreviewResponse {
  const root = asRecord(raw)
  if (!root) throw new Error("Invalid preview response.")
  const targetObj = asRecord(root.target ?? root.Target)
  if (!targetObj) throw new Error("Invalid preview response: missing target.")
  const countryId = pickNumber(targetObj, "countryId", "CountryId")
  const name = pickString(targetObj, "name", "Name").trim()
  if (countryId == null || countryId <= 0 || !name) {
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
      countryId,
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

function mapMergeResponse(raw: unknown): CountryMergeResponse {
  const root = asRecord(raw)
  if (!root) throw new Error("Invalid merge response.")
  const targetObj = asRecord(root.target ?? root.Target)
  if (!targetObj) throw new Error("Invalid merge response: missing target.")
  const countryId = pickNumber(targetObj, "countryId", "CountryId")
  const name = pickString(targetObj, "name", "Name").trim()
  if (countryId == null || countryId <= 0 || !name) {
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
      countryId,
      name,
      usageCount: pickNumber(targetObj, "usageCount", "UsageCount") ?? 0,
    },
    mergedSourceIds,
    impact: mapImpact(root.impact ?? root.Impact),
  }
}

export async function previewCountryMerge(
  body: CountryMergeRequest,
): Promise<CountryMergePreviewResponse> {
  const raw = await apiPost<unknown>(PREVIEW_PATH, body)
  return mapPreviewResponse(raw)
}

export async function executeCountryMerge(body: CountryMergeRequest): Promise<CountryMergeResponse> {
  const raw = await apiPost<unknown>(MERGE_PATH, body)
  return mapMergeResponse(raw)
}
