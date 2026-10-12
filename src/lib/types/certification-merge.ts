/** Aligns with docs/CERTIFICATION_MERGE_BACKEND_CONTRACT.md */

export type CertificationFieldResolution =
  | "keepTarget"
  | { fromSourceId: number }

export type CertificationMergeTargetExisting = {
  mode: "existing"
  certificationId: number
}

export type CertificationMergeTargetNew = {
  mode: "new"
  name: string
}

export type CertificationMergeTarget =
  | CertificationMergeTargetExisting
  | CertificationMergeTargetNew

export type CertificationMergeRequest = {
  sourceCertificationIds: number[]
  target: CertificationMergeTarget
  fieldResolution: {
    name: CertificationFieldResolution
    issuer: CertificationFieldResolution
  }
}

export type CertificationMergeIssuerPreview = {
  id: number | null
  name: string | null
}

export type CertificationMergeImpact = {
  distinctCandidatesAffected: number
  distinctCandidateCertificationLinksAffected: number
  duplicateLinksRemoved: number
}

export type CertificationMergeSourcePreview = {
  certificationId: number
  name: string
  usageCountBefore: number
  issuer: CertificationMergeIssuerPreview | null
}

export type CertificationMergeFieldPreview = {
  mode: "keepTarget" | "fromSource"
  value?: string
  fromSourceId?: number
  issuerId?: number | null
  issuerName?: string | null
}

export type CertificationMergePreviewResponse = {
  target: {
    certificationId: number
    name: string
    issuer: CertificationMergeIssuerPreview | null
    usageCountAfter: number
  }
  sources: CertificationMergeSourcePreview[]
  fieldResolutionPreview: {
    name: CertificationMergeFieldPreview
    issuer: CertificationMergeFieldPreview
  }
  impact: CertificationMergeImpact
}

export type CertificationMergeResponse = {
  target: {
    certificationId: number
    name: string
    issuer: CertificationMergeIssuerPreview | null
    usageCount: number
  }
  mergedSourceIds: number[]
  impact: CertificationMergeImpact
}
