/** Aligns with docs/COUNTRY_MERGE_BACKEND_CONTRACT.md */

export type CountryMergeTargetExisting = {
  mode: "existing"
  countryId: number
}

export type CountryMergeTargetNew = {
  mode: "new"
  name: string
}

export type CountryMergeTarget = CountryMergeTargetExisting | CountryMergeTargetNew

export type CountryMergeRequest = {
  sourceCountryIds: number[]
  target: CountryMergeTarget
}

export type CountryMergeImpact = {
  distinctUniversitiesAffected: number
  distinctEmployerLocationsAffected: number
  distinctEmployersAffected: number
}

export type CountryMergeSourcePreview = {
  countryId: number
  name: string
  usageCountBefore: number
}

export type CountryMergePreviewResponse = {
  target: {
    countryId: number
    name: string
    usageCountAfter: number
  }
  sources: CountryMergeSourcePreview[]
  impact: CountryMergeImpact
}

export type CountryMergeResponse = {
  target: {
    countryId: number
    name: string
    usageCount: number
  }
  mergedSourceIds: number[]
  impact: CountryMergeImpact
}
