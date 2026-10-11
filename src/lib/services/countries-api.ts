import { apiGet, apiPost } from "@/lib/api-client"
import type { Country } from "@/lib/types/country"
import {
  mergeCountryIntoCatalog,
  normalizeCountryLookupItem,
  normalizeCountryLookupList,
  sortCountryLookupItems,
  type CountryLookupItem,
} from "@/lib/utils/country-lookup"

export type { CountryLookupItem }

const COUNTRIES_PATH = "/api/countries"
const REBUILD_PATH = "/api/countries/rebuild-usage-counts"

export async function fetchCountries(): Promise<Country[]> {
  const raw = await apiGet<unknown>(COUNTRIES_PATH)
  return sortCountryLookupItems(normalizeCountryLookupList(raw))
}

export async function createCountry(name: string): Promise<Country> {
  const raw = await apiPost<unknown>(COUNTRIES_PATH, { name: name.trim() })
  const created = normalizeCountryLookupItem(raw)
  if (!created) {
    throw new Error("Invalid country create response.")
  }
  return created
}

/** Admin + Super Admin — recompute all country usage counts. */
export async function rebuildCountryUsageCounts(): Promise<void> {
  await apiPost<unknown>(REBUILD_PATH, {})
}

export { mergeCountryIntoCatalog }
