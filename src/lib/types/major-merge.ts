/** Aligns with docs/MAJOR_MERGE_BACKEND_CONTRACT.md */

export type MajorMergeTargetExisting = {
  mode: "existing"
  majorId: number
}

export type MajorMergeTargetNew = {
  mode: "new"
  name: string
}

export type MajorMergeTarget = MajorMergeTargetExisting | MajorMergeTargetNew

export type MajorMergeRequest = {
  sourceMajorIds: number[]
  target: MajorMergeTarget
}

export type MajorMergeImpact = {
  distinctCandidatesAffected: number
  distinctEducationRowsAffected: number
}

export type MajorMergeSourcePreview = {
  majorId: number
  name: string
  usageCountBefore: number
}

export type MajorMergePreviewResponse = {
  target: {
    majorId: number
    name: string
    usageCountAfter: number
  }
  sources: MajorMergeSourcePreview[]
  impact: MajorMergeImpact
}

export type MajorMergeResponse = {
  target: {
    majorId: number
    name: string
    usageCount: number
  }
  mergedSourceIds: number[]
  impact: MajorMergeImpact
}
