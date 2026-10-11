/** Aligns with docs/TIME_SUPPORT_ZONE_MERGE_BACKEND_CONTRACT.md */

export type TimeSupportZoneMergeTargetExisting = {
  mode: "existing"
  timeSupportZoneId: number
}

export type TimeSupportZoneMergeTargetNew = {
  mode: "new"
  name: string
}

export type TimeSupportZoneMergeTarget =
  | TimeSupportZoneMergeTargetExisting
  | TimeSupportZoneMergeTargetNew

export type TimeSupportZoneMergeRequest = {
  sourceTimeSupportZoneIds: number[]
  target: TimeSupportZoneMergeTarget
}

export type TimeSupportZoneMergeDuplicateLinksRemoved = {
  employerTimeSupportZones: number
  workExperienceTimeSupportZones: number
}

export type TimeSupportZoneMergeImpact = {
  distinctEmployersAffected: number
  distinctWorkExperiencesAffected: number
  duplicateLinksRemoved: TimeSupportZoneMergeDuplicateLinksRemoved
}

export type TimeSupportZoneMergeSourcePreview = {
  timeSupportZoneId: number
  name: string
  usageCountBefore: number
}

export type TimeSupportZoneMergePreviewResponse = {
  target: {
    timeSupportZoneId: number
    name: string
    usageCountAfter: number
  }
  sources: TimeSupportZoneMergeSourcePreview[]
  impact: TimeSupportZoneMergeImpact
}

export type TimeSupportZoneMergeResponse = {
  target: {
    timeSupportZoneId: number
    name: string
    usageCount: number
  }
  mergedSourceIds: number[]
  impact: TimeSupportZoneMergeImpact
}
