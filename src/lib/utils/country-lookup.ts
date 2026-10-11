/**
 * Country catalog helpers — usage-based ordering for comboboxes and filters.
 * @see docs/COUNTRIES_USAGE_COUNT_BACKEND_CONTRACT.md
 */

import type { MultiSelectOption } from "@/components/ui/multi-select"

export interface CountryLookupItem {
  id: number
  name: string
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

export function normalizeCountryLookupItem(raw: unknown): CountryLookupItem | null {
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

export function normalizeCountryLookupList(raw: unknown): CountryLookupItem[] {
  if (!Array.isArray(raw)) return []
  const out: CountryLookupItem[] = []
  const seen = new Set<number>()
  for (const item of raw) {
    const normalized = normalizeCountryLookupItem(item)
    if (!normalized || seen.has(normalized.id)) continue
    seen.add(normalized.id)
    out.push(normalized)
  }
  return out
}

export function compareCountriesByUsage(
  a: Pick<CountryLookupItem, "name" | "usageCount">,
  b: Pick<CountryLookupItem, "name" | "usageCount">,
): number {
  const usageDiff = normalizeUsageCount(b.usageCount) - normalizeUsageCount(a.usageCount)
  if (usageDiff !== 0) return usageDiff
  return a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
}

export function sortCountryLookupItems(
  items: ReadonlyArray<CountryLookupItem>,
): CountryLookupItem[] {
  return [...items].sort(compareCountriesByUsage)
}

export function mergeCountryIntoCatalog(
  prev: ReadonlyArray<CountryLookupItem>,
  created: CountryLookupItem,
): CountryLookupItem[] {
  return sortCountryLookupItems([
    ...prev.filter((c) => c.id !== created.id && c.name.toLowerCase() !== created.name.toLowerCase()),
    created,
  ])
}

export function countryLookupItemsToMultiSelectOptions(
  items: ReadonlyArray<CountryLookupItem>,
): MultiSelectOption[] {
  return sortCountryLookupItems(items).map((item) => ({
    value: item.name,
    label: item.name,
  }))
}
