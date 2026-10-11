/**
 * Degree catalog helpers — usage-based ordering for education comboboxes and filters.
 * @see docs/DEGREES_USAGE_COUNT_BACKEND_CONTRACT.md
 */

import type { MultiSelectOption } from "@/components/ui/multi-select"

type ComboboxOption = { value: string; label: string }
import type { LookupItem } from "@/lib/services/lookups-api"

export interface DegreeLookupItem extends LookupItem {
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

export function normalizeDegreeLookupItem(raw: unknown): DegreeLookupItem | null {
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

export function normalizeDegreeLookupList(raw: unknown): DegreeLookupItem[] {
  if (!Array.isArray(raw)) return []
  const out: DegreeLookupItem[] = []
  const seen = new Set<number>()
  for (const item of raw) {
    const normalized = normalizeDegreeLookupItem(item)
    if (!normalized || seen.has(normalized.id)) continue
    seen.add(normalized.id)
    out.push(normalized)
  }
  return out
}

export function compareDegreesByUsage(
  a: Pick<DegreeLookupItem, "name" | "usageCount">,
  b: Pick<DegreeLookupItem, "name" | "usageCount">,
): number {
  const usageDiff = normalizeUsageCount(b.usageCount) - normalizeUsageCount(a.usageCount)
  if (usageDiff !== 0) return usageDiff
  return a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
}

export function sortDegreeLookupItems(
  items: ReadonlyArray<DegreeLookupItem>,
): DegreeLookupItem[] {
  return [...items].sort(compareDegreesByUsage)
}

export function mergeDegreeIntoCatalog(
  prev: ReadonlyArray<DegreeLookupItem>,
  created: DegreeLookupItem,
): DegreeLookupItem[] {
  return sortDegreeLookupItems([
    ...prev.filter((l) => l.id !== created.id && l.name !== created.name),
    created,
  ])
}

export function degreeLookupItemsToMultiSelectOptions(
  items: ReadonlyArray<DegreeLookupItem | LookupItem>,
): MultiSelectOption[] {
  return sortDegreeLookupItems(
    items.map((item) => ({
      id: item.id,
      name: item.name.trim(),
      usageCount: normalizeUsageCount((item as DegreeLookupItem).usageCount),
    })),
  ).map((item) => ({ value: item.name, label: item.name }))
}

export function buildDegreeComboboxOptions(
  catalog: ReadonlyArray<DegreeLookupItem | LookupItem>,
  extraNames?: Iterable<string>,
): ComboboxOption[] {
  const usageByKey = new Map<string, number>()
  const optionByKey = new Map<string, ComboboxOption>()

  for (const item of catalog) {
    const name = item.name?.trim()
    if (!name) continue
    const key = name.toLowerCase()
    usageByKey.set(key, normalizeUsageCount((item as DegreeLookupItem).usageCount))
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
