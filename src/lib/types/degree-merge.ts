/** Aligns with docs/DEGREE_MERGE_BACKEND_CONTRACT.md */

export type DegreeMergeTargetExisting = {
  mode: "existing"
  degreeId: number
}

export type DegreeMergeTargetNew = {
  mode: "new"
  name: string
}

export type DegreeMergeTarget = DegreeMergeTargetExisting | DegreeMergeTargetNew

export type DegreeMergeRequest = {
  sourceDegreeIds: number[]
  target: DegreeMergeTarget
}

export type DegreeMergeImpact = {
  distinctCandidatesAffected: number
  distinctEducationRowsAffected: number
}

export type DegreeMergeSourcePreview = {
  degreeId: number
  name: string
  usageCountBefore: number
}

export type DegreeMergePreviewResponse = {
  target: {
    degreeId: number
    name: string
    usageCountAfter: number
  }
  sources: DegreeMergeSourcePreview[]
  impact: DegreeMergeImpact
}

export type DegreeMergeResponse = {
  target: {
    degreeId: number
    name: string
    usageCount: number
  }
  mergedSourceIds: number[]
  impact: DegreeMergeImpact
}
