"use client"

import * as React from "react"
import {
  Award,
  Building2,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Loader2,
  SlidersHorizontal,
  Target,
} from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { cn } from "@/lib/utils"

const MERGE_SECTION_TARGET = "target"
const MERGE_SECTION_FIELDS = "fields"
const MERGE_SECTION_PREVIEW = "preview"

function defaultExpandedMergeSections(): Set<string> {
  return new Set([MERGE_SECTION_TARGET, MERGE_SECTION_FIELDS])
}
import { fetchCertificationDetail } from "@/lib/services/certifications-api"
import {
  executeCertificationMerge,
  previewCertificationMerge,
  serializeCertificationMergeRequest,
} from "@/lib/services/certification-merge-api"
import type { CertificationDetail } from "@/lib/types/certification"
import type {
  CertificationFieldResolution,
  CertificationMergePreviewResponse,
  CertificationMergeRequest,
} from "@/lib/types/certification-merge"

type TargetMode = "existing" | "new"

type FieldChoice = "keepTarget" | number

function errorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message.trim()) return err.message.trim()
  return fallback
}

function IssuingBodyValue({
  name,
  className,
}: {
  name: string | null | undefined
  className?: string
}) {
  const trimmed = name?.trim()
  if (trimmed) return <span className={className}>{trimmed}</span>
  return <span className={cn("italic", className)}>N/A</span>
}

function buildFieldResolution(choice: FieldChoice): CertificationFieldResolution {
  if (choice === "keepTarget") return "keepTarget"
  return { fromSourceId: choice }
}

function buildMergeRequest(
  sourceIds: number[],
  targetMode: TargetMode,
  existingTargetId: number,
  newTargetName: string,
  nameChoice: FieldChoice,
  issuerChoice: FieldChoice,
): CertificationMergeRequest {
  const target =
    targetMode === "existing"
      ? { mode: "existing" as const, certificationId: existingTargetId }
      : { mode: "new" as const, name: newTargetName.trim() }

  return {
    sourceCertificationIds: [...sourceIds].sort((a, b) => a - b),
    target,
    fieldResolution: {
      name: buildFieldResolution(nameChoice),
      issuer: buildFieldResolution(issuerChoice),
    },
  }
}

function formatKeepTargetName(
  targetMode: TargetMode,
  existingTarget: CertificationDetail | null,
  newTargetName: string,
): string {
  if (targetMode === "new") return newTargetName.trim() || "—"
  return existingTarget?.name?.trim() || "—"
}

export type CertificationMergeDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  sourceIds: number[]
  existingTargetId: number
  onMergeSuccess: () => void
}

export function CertificationMergeDialog({
  open,
  onOpenChange,
  sourceIds,
  existingTargetId,
  onMergeSuccess,
}: CertificationMergeDialogProps) {
  const [detailsLoading, setDetailsLoading] = React.useState(false)
  const [detailsError, setDetailsError] = React.useState<string | null>(null)
  const [sourceDetails, setSourceDetails] = React.useState<CertificationDetail[]>([])
  const [existingTarget, setExistingTarget] = React.useState<CertificationDetail | null>(null)

  const [targetMode, setTargetMode] = React.useState<TargetMode>("existing")
  const [newTargetName, setNewTargetName] = React.useState("")
  const [nameChoice, setNameChoice] = React.useState<FieldChoice>("keepTarget")
  const [issuerChoice, setIssuerChoice] = React.useState<FieldChoice>("keepTarget")

  const [previewData, setPreviewData] = React.useState<CertificationMergePreviewResponse | null>(
    null,
  )
  const [previewRequestKey, setPreviewRequestKey] = React.useState<string | null>(null)
  const [previewBusy, setPreviewBusy] = React.useState(false)
  const [mergeBusy, setMergeBusy] = React.useState(false)
  const [expandedSections, setExpandedSections] = React.useState<Set<string>>(() =>
    defaultExpandedMergeSections(),
  )
  const sortedSources = React.useMemo(
    () => [...sourceDetails].sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" })),
    [sourceDetails],
  )

  const loadDetails = React.useCallback(async () => {
    setDetailsLoading(true)
    setDetailsError(null)
    try {
      const uniqueSourceIds = [...new Set(sourceIds)].filter((id) => id > 0)
      const [targetRow, ...sources] = await Promise.all([
        fetchCertificationDetail(existingTargetId),
        ...uniqueSourceIds.map((id) => fetchCertificationDetail(id)),
      ])
      setExistingTarget(targetRow)
      setSourceDetails(sources)
    } catch (err) {
      setDetailsError(errorMessage(err, "Could not load certification details."))
      setExistingTarget(null)
      setSourceDetails([])
    } finally {
      setDetailsLoading(false)
    }
  }, [sourceIds, existingTargetId])

  const toggleSection = React.useCallback((sectionKey: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev)
      if (next.has(sectionKey)) next.delete(sectionKey)
      else next.add(sectionKey)
      return next
    })
  }, [])

  React.useEffect(() => {
    if (!open) return
    setTargetMode("existing")
    setNewTargetName("")
    setNameChoice("keepTarget")
    setIssuerChoice("keepTarget")
    setPreviewData(null)
    setPreviewRequestKey(null)
    setExpandedSections(defaultExpandedMergeSections())
    void loadDetails()
  }, [open, loadDetails])

  React.useEffect(() => {
    if (!previewData) return
    let innerRaf = 0
    const outerRaf = requestAnimationFrame(() => {
      innerRaf = requestAnimationFrame(() => {
        document
          .getElementById("cert-merge-preview")
          ?.scrollIntoView({ behavior: "smooth", block: "nearest" })
      })
    })
    return () => {
      cancelAnimationFrame(outerRaf)
      if (innerRaf) cancelAnimationFrame(innerRaf)
    }
  }, [previewData])

  const invalidatePreview = React.useCallback(() => {
    setPreviewData(null)
    setPreviewRequestKey(null)
  }, [])

  const currentRequest = React.useMemo(() => {
    if (sourceIds.length < 1) return null
    if (targetMode === "existing" && existingTargetId <= 0) return null
    if (targetMode === "new" && !newTargetName.trim()) return null
    return buildMergeRequest(
      sourceIds,
      targetMode,
      existingTargetId,
      newTargetName,
      nameChoice,
      issuerChoice,
    )
  }, [
    sourceIds,
    targetMode,
    existingTargetId,
    newTargetName,
    nameChoice,
    issuerChoice,
  ])

  const canPreview =
    !detailsLoading &&
    !detailsError &&
    currentRequest != null &&
    !previewBusy &&
    !mergeBusy

  const previewMatchesForm =
    currentRequest != null &&
    previewRequestKey != null &&
    previewRequestKey === serializeCertificationMergeRequest(currentRequest)

  const canConfirmMerge = previewMatchesForm && previewData != null && !mergeBusy && !previewBusy

  const handlePreview = async () => {
    if (!currentRequest) return
    setPreviewBusy(true)
    try {
      const preview = await previewCertificationMerge(currentRequest)
      setPreviewData(preview)
      setPreviewRequestKey(serializeCertificationMergeRequest(currentRequest))
      setExpandedSections((prev) => new Set([...prev, MERGE_SECTION_PREVIEW]))
    } catch (err) {
      invalidatePreview()
      toast.error(errorMessage(err, "Could not preview merge."))
    } finally {
      setPreviewBusy(false)
    }
  }

  const handleConfirmMerge = async () => {
    if (!currentRequest || !previewMatchesForm) return
    setMergeBusy(true)
    try {
      const result = await executeCertificationMerge(currentRequest)
      toast.success(
        `Merged ${result.mergedSourceIds.length} certification${result.mergedSourceIds.length === 1 ? "" : "s"} into "${result.target.name}".`,
      )
      onMergeSuccess()
      onOpenChange(false)
    } catch (err) {
      toast.error(errorMessage(err, "Merge failed."))
    } finally {
      setMergeBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "gap-0 p-0",
          "!flex max-h-[95vh] w-full max-w-[calc(100%-2rem)] flex-col overflow-hidden sm:max-w-2xl",
        )}
      >
        <DialogHeader className="shrink-0 border-b border-border px-6 pb-4 pt-6 pr-12 text-left">
          <DialogTitle>Merge certifications</DialogTitle>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-6">
          <div className="space-y-4">
            {detailsLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-8 justify-center">
                <Loader2 className="size-4 animate-spin" aria-hidden />
                Loading certification details…
              </div>
            ) : detailsError ? (
              <div className="rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm space-y-3">
                <p className="text-destructive">{detailsError}</p>
                <Button type="button" variant="outline" size="sm" onClick={() => void loadDetails()}>
                  Retry
                </Button>
              </div>
            ) : (
              <>
                <MergeDialogSectionStatic
                  id="cert-merge-sources"
                  icon={Award}
                  title="Source certifications"
                  description={`${sortedSources.length} certification${sortedSources.length === 1 ? "" : "s"} will be removed from the catalog after merge.`}
                >
                  <ul className="text-sm space-y-2">
                    {sortedSources.map((s) => (
                      <li
                        key={s.id}
                        className="rounded-md border bg-muted/30 px-3 py-2"
                      >
                        <span className="font-medium text-foreground">{s.name}</span>
                        <span className="mt-0.5 block text-xs text-muted-foreground">
                          Issuing body:{" "}
                          <IssuingBodyValue name={s.issuer?.name} />
                        </span>
                      </li>
                    ))}
                  </ul>
                </MergeDialogSectionStatic>

                <MergeDialogSectionCollapsible
                  id="cert-merge-target"
                  sectionKey={MERGE_SECTION_TARGET}
                  expanded={expandedSections.has(MERGE_SECTION_TARGET)}
                  onToggleSection={toggleSection}
                  icon={Target}
                  title="Merge target"
                  description="Choose the catalog row that will survive, or create/reuse one by name."
                >
                  <RadioGroup
                    value={targetMode}
                    onValueChange={(v) => {
                      setTargetMode(v as TargetMode)
                      invalidatePreview()
                    }}
                    className="space-y-4"
                  >
                    <div className="flex items-start gap-3 rounded-md border p-3">
                      <RadioGroupItem value="existing" id="cert-merge-target-existing" className="mt-1 shrink-0" />
                      <div className="min-w-0 flex-1 space-y-1">
                        <Label htmlFor="cert-merge-target-existing" className="font-medium">
                          Existing certification
                        </Label>
                        {existingTarget ? (
                          <p className="text-sm text-muted-foreground">
                            <span className="font-medium text-foreground">{existingTarget.name}</span>
                            <span className="mt-0.5 block text-xs">
                              Issuing body:{" "}
                              <IssuingBodyValue name={existingTarget.issuer?.name} />
                            </span>
                          </p>
                        ) : null}
                      </div>
                    </div>
                    <div className="flex items-start gap-3 rounded-md border p-3">
                      <RadioGroupItem value="new" id="cert-merge-target-new" className="mt-1 shrink-0" />
                      <div className="min-w-0 flex-1 space-y-2">
                        <Label htmlFor="cert-merge-target-new" className="font-medium">
                          New standardized name
                        </Label>
                        <Input
                          placeholder="e.g. Claude 101"
                          value={newTargetName}
                          onChange={(e) => {
                            setNewTargetName(e.target.value)
                            invalidatePreview()
                          }}
                          disabled={targetMode !== "new"}
                        />
                        <p className="text-xs text-muted-foreground">
                          If the name already exists, the merge reuses that catalog row.
                        </p>
                      </div>
                    </div>
                  </RadioGroup>
                </MergeDialogSectionCollapsible>

                <MergeDialogSectionCollapsible
                  id="cert-merge-fields"
                  sectionKey={MERGE_SECTION_FIELDS}
                  expanded={expandedSections.has(MERGE_SECTION_FIELDS)}
                  onToggleSection={toggleSection}
                  icon={SlidersHorizontal}
                  title="Survivor catalog fields"
                  description="Set the name and issuing body stored on the target certification after merge."
                >
                  <div className="space-y-6">
                    <div className="space-y-3">
                      <h4 className="text-sm font-medium flex items-center gap-2">
                        <Award className="size-4 text-muted-foreground" aria-hidden />
                        Certification name
                      </h4>
                      <RadioGroup
                        value={nameChoice === "keepTarget" ? "keepTarget" : String(nameChoice)}
                        onValueChange={(v) => {
                          setNameChoice(v === "keepTarget" ? "keepTarget" : Number.parseInt(v, 10))
                          invalidatePreview()
                        }}
                        className="space-y-3"
                      >
                        <MergeFieldOption
                          id="cert-merge-name-keep"
                          value="keepTarget"
                          title="Keep target name"
                          detail={formatKeepTargetName(targetMode, existingTarget, newTargetName)}
                        />
                        {sortedSources.map((s) => (
                          <MergeFieldOption
                            key={s.id}
                            id={`cert-merge-name-${s.id}`}
                            value={String(s.id)}
                            title={`Use name from ${s.name}`}
                          />
                        ))}
                      </RadioGroup>
                    </div>
                    <div className="border-t border-border pt-6 space-y-3">
                      <h4 className="text-sm font-medium flex items-center gap-2">
                        <Building2 className="size-4 text-muted-foreground" aria-hidden />
                        Issuing body
                      </h4>
                      <RadioGroup
                        value={issuerChoice === "keepTarget" ? "keepTarget" : String(issuerChoice)}
                        onValueChange={(v) => {
                          setIssuerChoice(v === "keepTarget" ? "keepTarget" : Number.parseInt(v, 10))
                          invalidatePreview()
                        }}
                        className="space-y-3"
                      >
                        <MergeFieldOption
                          id="cert-merge-issuer-keep"
                          value="keepTarget"
                          title="Keep target issuing body"
                          detail={
                            <IssuingBodyValue
                              name={
                                targetMode === "new"
                                  ? null
                                  : existingTarget?.issuer?.name ?? null
                              }
                            />
                          }
                        />
                        {sortedSources.map((s) => (
                          <MergeFieldOption
                            key={s.id}
                            id={`cert-merge-issuer-${s.id}`}
                            value={String(s.id)}
                            title={`Use issuing body from ${s.name}`}
                            detail={<IssuingBodyValue name={s.issuer?.name} />}
                          />
                        ))}
                      </RadioGroup>
                    </div>
                  </div>
                </MergeDialogSectionCollapsible>

                {previewData ? (
                  <MergeDialogSectionCollapsible
                    id="cert-merge-preview"
                    sectionKey={MERGE_SECTION_PREVIEW}
                    expanded={expandedSections.has(MERGE_SECTION_PREVIEW)}
                    onToggleSection={toggleSection}
                    icon={ClipboardList}
                    title="Preview & impact"
                    description="Review the outcome of your last preview before confirming."
                  >
                    <div className="space-y-4 text-sm">
                      <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
                        <p className="font-medium text-foreground">Target after merge</p>
                        <p>
                          {previewData.target.name}{" "}
                          <span className="text-muted-foreground">
                            (id {previewData.target.certificationId})
                          </span>
                        </p>
                        <p className="text-muted-foreground">
                          Issuing body:{" "}
                          <IssuingBodyValue
                            name={previewData.target.issuer?.name}
                            className="text-foreground"
                          />
                        </p>
                        <p className="text-muted-foreground">
                          Usage after merge:{" "}
                          <span className="font-medium text-foreground tabular-nums">
                            {previewData.target.usageCountAfter}
                          </span>
                        </p>
                      </div>
                      <div>
                        <p className="font-medium mb-2 text-foreground">Sources</p>
                        <ul className="space-y-1.5">
                          {previewData.sources.map((s) => (
                            <li
                              key={s.certificationId}
                              className="flex justify-between gap-2 text-muted-foreground"
                            >
                              <span>{s.name}</span>
                              <span className="shrink-0 tabular-nums">
                                usage before{" "}
                                <span className="text-foreground">{s.usageCountBefore}</span>
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
                        <p className="font-medium text-foreground">Estimated impact</p>
                        <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
                          <dt className="text-muted-foreground">Candidates affected</dt>
                          <dd className="tabular-nums text-right font-medium">
                            {previewData.impact.distinctCandidatesAffected}
                          </dd>
                          <dt className="text-muted-foreground">Certification links affected</dt>
                          <dd className="tabular-nums text-right font-medium">
                            {previewData.impact.distinctCandidateCertificationLinksAffected}
                          </dd>
                          <dt className="text-muted-foreground">Duplicate links removed</dt>
                          <dd className="tabular-nums text-right font-medium">
                            {previewData.impact.duplicateLinksRemoved}
                          </dd>
                        </dl>
                      </div>
                      {!previewMatchesForm ? (
                        <p className="text-xs text-amber-600 dark:text-amber-500">
                          Options changed since last preview. Run preview again before confirming.
                        </p>
                      ) : null}
                    </div>
                  </MergeDialogSectionCollapsible>
                ) : null}
              </>
            )}
          </div>
        </div>

        <DialogFooter className="relative z-10 shrink-0 gap-2 border-t border-border bg-background px-6 py-4 sm:flex-row sm:justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={mergeBusy}
            className="w-full sm:w-auto"
          >
            Cancel
          </Button>
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <Button
              type="button"
              disabled={!canPreview}
              onClick={() => void handlePreview()}
              className="w-full transition-all duration-200 ease-in-out hover:scale-105 hover:shadow-md cursor-pointer sm:w-auto"
            >
              {previewBusy ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  Loading preview…
                </>
              ) : (
                "Preview impact"
              )}
            </Button>
            <Button
              type="button"
              disabled={!canConfirmMerge}
              onClick={() => void handleConfirmMerge()}
              className="w-full transition-all duration-200 ease-in-out hover:scale-105 hover:shadow-md cursor-pointer sm:w-auto"
            >
              {mergeBusy ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  Merging…
                </>
              ) : (
                "Confirm merge"
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function MergeSectionHeader({
  id,
  icon: Icon,
  title,
  description,
  expanded,
  collapsible,
}: {
  id: string
  icon: React.ComponentType<{ className?: string }>
  title: string
  description?: string
  expanded?: boolean
  collapsible: boolean
}) {
  return (
    <div className="flex w-full items-start justify-between gap-3">
      <div className="min-w-0 flex-1 text-left">
        <CardTitle id={`${id}-title`} className="flex items-center gap-2 text-base">
          <Icon className="size-5 shrink-0 text-primary" aria-hidden />
          {title}
        </CardTitle>
        {description ? <CardDescription className="mt-1.5">{description}</CardDescription> : null}
      </div>
      {collapsible ? (
        expanded ? (
          <ChevronDown className="size-4 shrink-0 text-muted-foreground mt-1" aria-hidden />
        ) : (
          <ChevronRight className="size-4 shrink-0 text-muted-foreground mt-1" aria-hidden />
        )
      ) : null}
    </div>
  )
}

/** Sources — always expanded; not collapsible. */
function MergeDialogSectionStatic({
  id,
  icon,
  title,
  description,
  children,
}: {
  id: string
  icon: React.ComponentType<{ className?: string }>
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <section id={id} aria-labelledby={`${id}-title`}>
      <Card className="gap-0 py-0 shadow-sm">
        <CardHeader className="border-b border-border pb-4 pt-4">
          <MergeSectionHeader
            id={id}
            icon={icon}
            title={title}
            description={description}
            collapsible={false}
          />
        </CardHeader>
        <CardContent className="py-4">{children}</CardContent>
      </Card>
    </section>
  )
}

function MergeDialogSectionCollapsible({
  id,
  sectionKey,
  expanded,
  onToggleSection,
  icon,
  title,
  description,
  children,
}: {
  id: string
  sectionKey: string
  expanded: boolean
  onToggleSection: (sectionKey: string) => void
  icon: React.ComponentType<{ className?: string }>
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <section id={id} aria-labelledby={`${id}-title`}>
      <Collapsible open={expanded} onOpenChange={() => onToggleSection(sectionKey)}>
        <Card className="gap-0 py-0 shadow-sm">
          <CollapsibleTrigger className="w-full">
            <CardHeader className="cursor-pointer pb-4 pt-4 transition-colors hover:bg-accent/50">
              <MergeSectionHeader
                id={id}
                icon={icon}
                title={title}
                description={description}
                expanded={expanded}
                collapsible
              />
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent className="border-t border-border py-4">{children}</CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </section>
  )
}

function MergeFieldOption({
  id,
  value,
  title,
  detail,
}: {
  id: string
  value: string
  title: string
  detail?: React.ReactNode
}) {
  return (
    <div className="flex items-start gap-3">
      <RadioGroupItem value={value} id={id} className="mt-1 shrink-0" />
      <Label htmlFor={id} className="min-w-0 flex-1 cursor-pointer text-left font-normal leading-snug">
        <span className="block">{title}</span>
        {detail != null && detail !== "" ? (
          <span className="mt-0.5 block text-muted-foreground text-xs">{detail}</span>
        ) : null}
      </Label>
    </div>
  )
}
