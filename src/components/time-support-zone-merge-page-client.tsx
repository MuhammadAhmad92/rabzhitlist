"use client"

import * as React from "react"
import { Clock, Search } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  fetchTimeSupportZones,
  type TimeSupportZoneLookupItem,
} from "@/lib/services/tags-timesupportzones-api"
import {
  executeTimeSupportZoneMerge,
  previewTimeSupportZoneMerge,
} from "@/lib/services/time-support-zone-merge-api"
import type {
  TimeSupportZoneMergePreviewResponse,
  TimeSupportZoneMergeRequest,
} from "@/lib/types/time-support-zone-merge"

type TargetMode = "existing" | "new"

function usageCount(row: TimeSupportZoneLookupItem): number {
  return row.usageCount ?? 0
}

function errorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message.trim()) return err.message.trim()
  return fallback
}

function buildRequest(
  sourceIds: number[],
  targetMode: TargetMode,
  existingTargetId: string,
  newTargetName: string,
): TimeSupportZoneMergeRequest {
  if (targetMode === "existing") {
    return {
      sourceTimeSupportZoneIds: sourceIds,
      target: {
        mode: "existing",
        timeSupportZoneId: Number.parseInt(existingTargetId, 10),
      },
    }
  }
  return {
    sourceTimeSupportZoneIds: sourceIds,
    target: { mode: "new", name: newTargetName.trim() },
  }
}

export function TimeSupportZoneMergePageClient() {
  const [catalog, setCatalog] = React.useState<TimeSupportZoneLookupItem[]>([])
  const [catalogLoading, setCatalogLoading] = React.useState(true)
  const [catalogError, setCatalogError] = React.useState<string | null>(null)
  const [search, setSearch] = React.useState("")
  const [selectedSourceIds, setSelectedSourceIds] = React.useState<Set<number>>(new Set())
  const [targetMode, setTargetMode] = React.useState<TargetMode>("existing")
  const [existingTargetId, setExistingTargetId] = React.useState<string>("")
  const [newTargetName, setNewTargetName] = React.useState("")
  const [previewOpen, setPreviewOpen] = React.useState(false)
  const [previewData, setPreviewData] = React.useState<TimeSupportZoneMergePreviewResponse | null>(
    null,
  )
  const [previewBusy, setPreviewBusy] = React.useState(false)
  const [mergeBusy, setMergeBusy] = React.useState(false)

  const loadCatalog = React.useCallback(async () => {
    setCatalogLoading(true)
    setCatalogError(null)
    try {
      const rows = await fetchTimeSupportZones()
      setCatalog(rows)
    } catch (err) {
      setCatalogError(errorMessage(err, "Could not load time support zone catalog."))
    } finally {
      setCatalogLoading(false)
    }
  }, [])

  React.useEffect(() => {
    void loadCatalog()
  }, [loadCatalog])

  const filteredCatalog = React.useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return catalog
    return catalog.filter((row) => row.name.toLowerCase().includes(q))
  }, [catalog, search])

  const targetCandidates = React.useMemo(
    () => catalog.filter((row) => !selectedSourceIds.has(row.id)),
    [catalog, selectedSourceIds],
  )

  React.useEffect(() => {
    if (targetMode !== "existing") return
    if (existingTargetId && targetCandidates.some((row) => String(row.id) === existingTargetId)) {
      return
    }
    const first = targetCandidates[0]
    setExistingTargetId(first ? String(first.id) : "")
  }, [targetMode, targetCandidates, existingTargetId])

  const toggleSource = (id: number, checked: boolean) => {
    setSelectedSourceIds((prev) => {
      const next = new Set(prev)
      if (checked) next.add(id)
      else next.delete(id)
      return next
    })
    setPreviewData(null)
  }

  const allVisibleSelected =
    filteredCatalog.length > 0 && filteredCatalog.every((row) => selectedSourceIds.has(row.id))

  const toggleAllVisible = (checked: boolean) => {
    setSelectedSourceIds((prev) => {
      const next = new Set(prev)
      for (const row of filteredCatalog) {
        if (checked) next.add(row.id)
        else next.delete(row.id)
      }
      return next
    })
    setPreviewData(null)
  }

  const handlePreview = async () => {
    setPreviewBusy(true)
    try {
      const request = buildRequest(
        Array.from(selectedSourceIds),
        targetMode,
        existingTargetId,
        newTargetName,
      )
      const preview = await previewTimeSupportZoneMerge(request)
      setPreviewData(preview)
      setPreviewOpen(true)
    } catch (err) {
      toast.error(errorMessage(err, "Could not preview merge."))
    } finally {
      setPreviewBusy(false)
    }
  }

  const handleConfirmMerge = async () => {
    if (!previewData) return
    setMergeBusy(true)
    try {
      const request = buildRequest(
        Array.from(selectedSourceIds),
        targetMode,
        existingTargetId,
        newTargetName,
      )
      const result = await executeTimeSupportZoneMerge(request)
      setSelectedSourceIds(new Set())
      setPreviewData(null)
      setPreviewOpen(false)
      setNewTargetName("")
      await loadCatalog()
      toast.success(
        `Merged ${result.mergedSourceIds.length} zone${result.mergedSourceIds.length === 1 ? "" : "s"} into "${result.target.name}".`,
      )
    } catch (err) {
      toast.error(errorMessage(err, "Merge failed."))
    } finally {
      setMergeBusy(false)
    }
  }

  const canPreview =
    !catalogLoading &&
    !catalogError &&
    selectedSourceIds.size > 0 &&
    (targetMode === "new" ? newTargetName.trim().length > 0 : Boolean(existingTargetId))

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold tracking-tight">Merge time support zones</h2>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="space-y-4 rounded-lg border bg-card p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <Clock className="size-5 text-muted-foreground" />
              <h3 className="text-lg font-semibold">Catalog</h3>
              <Badge variant="secondary">{catalogLoading ? "…" : catalog.length}</Badge>
            </div>
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input
                placeholder="Search by name…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
                disabled={catalogLoading || Boolean(catalogError)}
              />
            </div>
          </div>

          {catalogError ? (
            <div className="flex flex-col gap-3 rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm">
              <p className="text-destructive">{catalogError}</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-fit"
                onClick={() => void loadCatalog()}
              >
                Retry
              </Button>
            </div>
          ) : (
            <ScrollArea className="h-[min(32rem,calc(100vh-12rem))] rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="sticky top-0 z-10 w-10 bg-card">
                      <Checkbox
                        checked={allVisibleSelected}
                        onCheckedChange={(v) => toggleAllVisible(v === true)}
                        aria-label="Select all visible zones as sources"
                        disabled={catalogLoading || filteredCatalog.length === 0}
                      />
                    </TableHead>
                    <TableHead className="sticky top-0 z-10 bg-card">Name</TableHead>
                    <TableHead className="sticky top-0 z-10 w-28 bg-card text-right">Usage</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {catalogLoading ? (
                    Array.from({ length: 8 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell>
                          <Skeleton className="size-4" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-40" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="ml-auto h-4 w-10" />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : filteredCatalog.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                        {catalog.length === 0
                          ? "No time support zones in the catalog."
                          : "No zones match your search."}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredCatalog.map((row) => (
                      <TableRow
                        key={row.id}
                        data-state={selectedSourceIds.has(row.id) ? "selected" : undefined}
                      >
                        <TableCell>
                          <Checkbox
                            checked={selectedSourceIds.has(row.id)}
                            onCheckedChange={(v) => toggleSource(row.id, v === true)}
                            aria-label={`Select ${row.name} as source`}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{row.name}</TableCell>
                        <TableCell className="text-right tabular-nums">{usageCount(row)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
          <p className="text-xs text-muted-foreground">
            Selected sources: {selectedSourceIds.size}. Check rows to merge <strong>from</strong>;
            choose the survivor on the right.
          </p>
        </div>

        <div className="space-y-4 rounded-lg border bg-card p-4 h-fit">
          <h3 className="text-lg font-semibold">Merge into (target)</h3>
          <RadioGroup
            value={targetMode}
            onValueChange={(v) => {
              setTargetMode(v as TargetMode)
              setPreviewData(null)
            }}
            className="space-y-3"
          >
            <div className="flex items-start gap-2">
              <RadioGroupItem value="existing" id="tsz-target-existing" className="mt-1" />
              <div className="space-y-2 flex-1">
                <Label htmlFor="tsz-target-existing">Existing zone</Label>
                <Select
                  value={existingTargetId}
                  onValueChange={(v) => {
                    setExistingTargetId(v)
                    setPreviewData(null)
                  }}
                  disabled={targetMode !== "existing" || targetCandidates.length === 0 || catalogLoading}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select target…" />
                  </SelectTrigger>
                  <SelectContent>
                    {targetCandidates.map((row) => (
                      <SelectItem key={row.id} value={String(row.id)}>
                        {row.name} ({usageCount(row)})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <RadioGroupItem value="new" id="tsz-target-new" className="mt-1" />
              <div className="space-y-2 flex-1">
                <Label htmlFor="tsz-target-new">New standardized name</Label>
                <Input
                  placeholder="e.g. USA"
                  value={newTargetName}
                  onChange={(e) => {
                    setNewTargetName(e.target.value)
                    setPreviewData(null)
                  }}
                  disabled={targetMode !== "new"}
                />
                <p className="text-xs text-muted-foreground">
                  If the name already exists, the merge reuses that catalog row (same as the API
                  contract).
                </p>
              </div>
            </div>
          </RadioGroup>

          <Button
            type="button"
            className="w-full"
            disabled={!canPreview || previewBusy}
            onClick={() => void handlePreview()}
          >
            {previewBusy ? "Loading preview…" : "Preview impact"}
          </Button>
        </div>
      </div>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Merge preview</DialogTitle>
            <DialogDescription>
              Review impact before confirming. This action cannot be undone (audit log planned for
              v2).
            </DialogDescription>
          </DialogHeader>
          {previewData && (
            <div className="space-y-4 text-sm">
              <div className="rounded-md border p-3 space-y-1">
                <p className="font-medium">Target</p>
                <p>
                  {previewData.target.name}{" "}
                  <span className="text-muted-foreground">
                    (id {previewData.target.timeSupportZoneId})
                  </span>
                </p>
                <p className="text-muted-foreground">
                  Usage after merge:{" "}
                  <span className="font-medium text-foreground tabular-nums">
                    {previewData.target.usageCountAfter}
                  </span>
                </p>
              </div>
              <div>
                <p className="font-medium mb-2">Sources ({previewData.sources.length})</p>
                <ul className="list-disc pl-5 space-y-1 text-muted-foreground">
                  {previewData.sources.map((s) => (
                    <li key={s.timeSupportZoneId}>
                      {s.name} — usage {s.usageCountBefore}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="rounded-md bg-muted/50 p-3 space-y-2">
                <p className="font-medium">Estimated impact</p>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-1">
                  <dt className="text-muted-foreground">Employers</dt>
                  <dd className="tabular-nums text-right">
                    {previewData.impact.distinctEmployersAffected}
                  </dd>
                  <dt className="text-muted-foreground">Work experiences</dt>
                  <dd className="tabular-nums text-right">
                    {previewData.impact.distinctWorkExperiencesAffected}
                  </dd>
                </dl>
                <p className="text-xs text-muted-foreground pt-1">Duplicate links removed</p>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                  <dt>Employer links</dt>
                  <dd className="text-right tabular-nums">
                    {previewData.impact.duplicateLinksRemoved.employerTimeSupportZones}
                  </dd>
                  <dt>Work experience links</dt>
                  <dd className="text-right tabular-nums">
                    {previewData.impact.duplicateLinksRemoved.workExperienceTimeSupportZones}
                  </dd>
                </dl>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setPreviewOpen(false)} disabled={mergeBusy}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => void handleConfirmMerge()}
              disabled={mergeBusy}
            >
              {mergeBusy ? "Merging…" : "Confirm merge"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
