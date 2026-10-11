export interface Country {
  id: number
  name: string
  /** @see docs/COUNTRIES_USAGE_COUNT_BACKEND_CONTRACT.md */
  usageCount?: number
}
