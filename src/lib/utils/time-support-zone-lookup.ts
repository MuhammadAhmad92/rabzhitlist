/**
 * Time support zone catalog helpers — usage-based ordering for multi-select dropdowns.
 * Backend: GET /api/timesupportzones returns { id, name, usageCount } (Z1, Z4).
 * @see docs/TIME_SUPPORT_ZONES_USAGE_COUNT_BACKEND_CONTRACT.md
 */

import type { LookupItem } from "@/lib/services/lookups-api"
import type { MultiSelectOption } from "@/components/ui/multi-select"

export interface TimeSupportZoneLookupItem extends LookupItem {
  usageCount?: number
}

function normalizeUsageCount(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return Math.max(0, value)
  if (typeof value === "string") {
    const n = Number(value.trim())
    if (Number.isFinite(n)) return Math.max(0, n)
  }
  return 0
}

export function normalizeTimeSupportZoneLookupItem(raw: unknown): TimeSupportZoneLookupItem | null {
  if (!raw || typeof raw !== "object") return null
  const row = raw as Record<string, unknown>
  const id = row.id ?? row.Id
  const name = row.name ?? row.Name
  if (typeof id !== "number" || !Number.isFinite(id)) return null
  if (typeof name !== "string" || !name.trim()) return null
  return {
    id,
    name: name.trim(),
    usageCount: normalizeUsageCount(row.usageCount ?? row.UsageCount),
  }
}

export function normalizeTimeSupportZoneLookupList(raw: unknown): TimeSupportZoneLookupItem[] {
  if (!Array.isArray(raw)) return []
  const out: TimeSupportZoneLookupItem[] = []
  const seen = new Set<number>()
  for (const item of raw) {
    const normalized = normalizeTimeSupportZoneLookupItem(item)
    if (!normalized || seen.has(normalized.id)) continue
    seen.add(normalized.id)
    out.push(normalized)
  }
  return out
}

/** Sort by usageCount descending, then name A–Z (Z4). */
export function compareTimeSupportZonesByUsage(
  a: Pick<TimeSupportZoneLookupItem, "name" | "usageCount">,
  b: Pick<TimeSupportZoneLookupItem, "name" | "usageCount">,
): number {
  const usageDiff =
    normalizeUsageCount(b.usageCount) - normalizeUsageCount(a.usageCount)
  if (usageDiff !== 0) return usageDiff
  return a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
}

export function sortTimeSupportZoneLookupItems(
  items: ReadonlyArray<TimeSupportZoneLookupItem>,
): TimeSupportZoneLookupItem[] {
  return [...items].sort(compareTimeSupportZonesByUsage)
}

export function mergeTimeSupportZoneIntoCatalog(
  prev: ReadonlyArray<TimeSupportZoneLookupItem>,
  created: TimeSupportZoneLookupItem,
): TimeSupportZoneLookupItem[] {
  return sortTimeSupportZoneLookupItems([
    ...prev.filter((l) => l.id !== created.id && l.name !== created.name),
    created,
  ])
}

export function timeSupportZoneLookupItemsToMultiSelectOptions(
  items: ReadonlyArray<TimeSupportZoneLookupItem | LookupItem>,
): MultiSelectOption[] {
  return sortTimeSupportZoneLookupItems(
    items.map((item) => ({
      id: item.id,
      name: item.name.trim(),
      usageCount: normalizeUsageCount(
        (item as TimeSupportZoneLookupItem).usageCount,
      ),
    })),
  ).map((item) => ({ value: item.name, label: item.name }))
}

/**
 * Build sorted multi-select options from catalog + extra names (usage 0 when not in catalog).
 */
export function buildTimeSupportZoneMultiSelectOptions(
  catalog: ReadonlyArray<TimeSupportZoneLookupItem | LookupItem>,
  extraNames?: Iterable<string>,
): MultiSelectOption[] {
  const usageByKey = new Map<string, number>()
  const optionByKey = new Map<string, MultiSelectOption>()

  for (const item of catalog) {
    const name = item.name?.trim()
    if (!name) continue
    const key = name.toLowerCase()
    usageByKey.set(
      key,
      normalizeUsageCount((item as TimeSupportZoneLookupItem).usageCount),
    )
    optionByKey.set(key, { value: name, label: name })
  }

  for (const raw of extraNames ?? []) {
    const name = raw?.trim()
    if (!name) continue
    const key = name.toLowerCase()
    if (optionByKey.has(key)) continue
    usageByKey.set(key, 0)
    optionByKey.set(key, { value: name, label: name })
  }

  return Array.from(optionByKey.values()).sort((a, b) => {
    const ua = usageByKey.get(a.value.toLowerCase()) ?? 0
    const ub = usageByKey.get(b.value.toLowerCase()) ?? 0
    if (ub !== ua) return ub - ua
    return a.label.localeCompare(b.label, undefined, { sensitivity: "base" })
  })
}
