/**
 * Time Support Zones API for employer (and candidate) dropdowns.
 * List all / create new when user clicks "+ Add Time Zone".
 * @see docs/TIME_SUPPORT_ZONES_USAGE_COUNT_BACKEND_CONTRACT.md
 */

import { apiGet, apiPost } from "@/lib/api-client"
import {
  normalizeTimeSupportZoneLookupItem,
  normalizeTimeSupportZoneLookupList,
  sortTimeSupportZoneLookupItems,
  type TimeSupportZoneLookupItem,
} from "@/lib/utils/time-support-zone-lookup"

export type { TimeSupportZoneLookupItem }
export type TimeSupportZoneDto = TimeSupportZoneLookupItem

const LIST_PATH = "/api/timesupportzones"
const REBUILD_USAGE_PATH = "/api/timesupportzones/rebuild-usage-counts"

export async function fetchTimeSupportZones(): Promise<TimeSupportZoneLookupItem[]> {
  const raw = await apiGet<unknown>(LIST_PATH)
  return sortTimeSupportZoneLookupItems(normalizeTimeSupportZoneLookupList(raw))
}

export async function createTimeSupportZone(name: string): Promise<TimeSupportZoneLookupItem> {
  const raw = await apiPost<unknown>(LIST_PATH, { name: name.trim() })
  const created = normalizeTimeSupportZoneLookupItem(raw)
  if (!created) {
    throw new Error("Invalid time support zone create response.")
  }
  return created
}

/** Admin + Super Admin — recompute all zone usage counts (on-call / post-deploy sanity). */
export async function rebuildTimeSupportZoneUsageCounts(): Promise<void> {
  await apiPost<unknown>(REBUILD_USAGE_PATH, {})
}
