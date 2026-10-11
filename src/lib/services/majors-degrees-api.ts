/**
 * Majors and Degrees APIs for candidate education comboboxes.
 * @see docs/DEGREES_USAGE_COUNT_BACKEND_CONTRACT.md
 * @see docs/MAJORS_USAGE_COUNT_BACKEND_CONTRACT.md
 */

import { apiGet, apiPost } from "@/lib/api-client"
import {
  normalizeDegreeLookupItem,
  normalizeDegreeLookupList,
  sortDegreeLookupItems,
  type DegreeLookupItem,
} from "@/lib/utils/degree-lookup"
import {
  normalizeMajorLookupItem,
  normalizeMajorLookupList,
  sortMajorLookupItems,
  type MajorLookupItem,
} from "@/lib/utils/major-lookup"

export type { DegreeLookupItem, MajorLookupItem }
export type MajorDto = MajorLookupItem
export type DegreeDto = DegreeLookupItem

const DEGREES_PATH = "/api/degrees"
const MAJORS_PATH = "/api/majors"
const DEGREES_REBUILD_PATH = "/api/degrees/rebuild-usage-counts"
const MAJORS_REBUILD_PATH = "/api/majors/rebuild-usage-counts"

export async function fetchMajors(): Promise<MajorLookupItem[]> {
  const raw = await apiGet<unknown>(MAJORS_PATH)
  return sortMajorLookupItems(normalizeMajorLookupList(raw))
}

export async function createMajor(name: string): Promise<MajorLookupItem> {
  const raw = await apiPost<unknown>(MAJORS_PATH, { name: name.trim() })
  const created = normalizeMajorLookupItem(raw)
  if (!created) {
    throw new Error("Invalid major create response.")
  }
  return created
}

export async function fetchDegrees(): Promise<DegreeLookupItem[]> {
  const raw = await apiGet<unknown>(DEGREES_PATH)
  return sortDegreeLookupItems(normalizeDegreeLookupList(raw))
}

export async function createDegree(name: string): Promise<DegreeLookupItem> {
  const raw = await apiPost<unknown>(DEGREES_PATH, { name: name.trim() })
  const created = normalizeDegreeLookupItem(raw)
  if (!created) {
    throw new Error("Invalid degree create response.")
  }
  return created
}

/** Admin + Super Admin — recompute all degree usage counts. */
export async function rebuildDegreeUsageCounts(): Promise<void> {
  await apiPost<unknown>(DEGREES_REBUILD_PATH, {})
}

/** Admin + Super Admin — recompute all major usage counts. */
export async function rebuildMajorUsageCounts(): Promise<void> {
  await apiPost<unknown>(MAJORS_REBUILD_PATH, {})
}
