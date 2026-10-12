"use client"

import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Award, Combine, Globe, X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CertificationMergeDialog } from "@/components/certification-merge-dialog"
import { CertificationsTable } from "@/components/certifications-table"
import { CertificationCreationDialog, CertificationFormData, CertificationVerificationState } from "@/components/certification-creation-dialog"
import { CertificationsFilterDialog, CertificationFilters } from "@/components/certifications-filter-dialog"
import { useGlobalFilters } from "@/contexts/global-filter-context"
import { useCreatedByUserIdListFilter } from "@/hooks/useCreatedByUserIdListFilter"
import { deleteCreatedByUserIdParam } from "@/lib/utils/created-by-user-id"
import { getGlobalFilterCount } from "@/lib/types/global-filters"
import type { Certification, CertificationIssuer } from "@/lib/types/certification"
import { fetchCertificationsPage, fetchCertificationIssuers, createCertification, updateCertification, deleteCertification } from "@/lib/services/certifications-api"
import { useNavigationAccess } from "@/components/role-route-guard"
import { toast } from "sonner"

const DEFAULT_PAGE_SIZE = 20

const initialFilters: CertificationFilters = {
  certificationNameSearch: "",
  issuerIds: [],
  dataProgressMin: "",
  dataProgressMax: "",
}

function parseCertificationFilterFromSearchParams(
  searchParams: Pick<URLSearchParams, "get">
): { name: string; id: string } | null {
  const certificationFilterName =
    searchParams.get("certificationFilter")?.trim() ??
    searchParams.get("certificationName")?.trim()
  const certificationId = searchParams.get("certificationId")?.trim()
  if (!certificationFilterName || !certificationId || !/^\d+$/.test(certificationId)) return null
  return { name: certificationFilterName, id: certificationId }
}

export function CertificationsPageClient() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { canAccessCatalog } = useNavigationAccess()
  const { createdByUserId, dismissCreatedByUserId, markCreatedByUserIdDismissed } =
    useCreatedByUserIdListFilter()
  const { filters: globalFilters, isActive: hasGlobalFilters } = useGlobalFilters()
  const [filters, setFilters] = useState<CertificationFilters>(initialFilters)

  const certificationFilterFromUrl = useMemo(
    () => parseCertificationFilterFromSearchParams(searchParams),
    [searchParams]
  )

  const certificationIdFromUrl = useMemo(() => {
    const raw = certificationFilterFromUrl?.id ?? searchParams.get("certificationId")
    if (!raw || !/^\d+$/.test(raw.trim())) return null
    const n = Number.parseInt(raw.trim(), 10)
    return Number.isFinite(n) && n > 0 ? n : null
  }, [certificationFilterFromUrl, searchParams])

  const combinedFilters = useMemo((): CertificationFilters => {
    if (certificationFilterFromUrl == null) return filters
    const nameFromUrl = certificationFilterFromUrl.name.trim()
    if (!nameFromUrl) return filters
    return { ...filters, certificationNameSearch: nameFromUrl }
  }, [filters, certificationFilterFromUrl])

  const listFilterKey = `${certificationIdFromUrl ?? ""}|${certificationFilterFromUrl?.name ?? ""}`
  const prevListFilterKeyRef = useRef<string | null>(null)

  const [selectedSourceIds, setSelectedSourceIds] = useState<Set<number>>(() => new Set())
  const [targetCertificationId, setTargetCertificationId] = useState<number | null>(null)

  const dialogFilterKey = useMemo(
    () =>
      JSON.stringify({
        certificationNameSearch: filters.certificationNameSearch,
        issuerIds: filters.issuerIds,
        dataProgressMin: filters.dataProgressMin,
        dataProgressMax: filters.dataProgressMax,
      }),
    [filters]
  )
  const prevDialogFilterKeyRef = useRef<string | null>(null)

  const resetMergeSelection = useCallback(() => {
    setSelectedSourceIds(new Set())
    setTargetCertificationId(null)
  }, [])

  const [items, setItems] = useState<Certification[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [pageNumber, setPageNumber] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [totalPages, setTotalPages] = useState(0)
  const [hasPrevious, setHasPrevious] = useState(false)
  const [hasNext, setHasNext] = useState(false)
  const [certificationsLoading, setCertificationsLoading] = useState(true)

  const [issuers, setIssuers] = useState<CertificationIssuer[]>([])
  const [issuersLoading, setIssuersLoading] = useState(true)

  useEffect(() => {
    if (prevListFilterKeyRef.current === listFilterKey) return
    const isFilterChange = prevListFilterKeyRef.current !== null
    prevListFilterKeyRef.current = listFilterKey
    setPageNumber(1)
    if (isFilterChange) {
      setItems([])
      setCertificationsLoading(true)
      resetMergeSelection()
    }
  }, [listFilterKey, resetMergeSelection])

  useEffect(() => {
    if (prevDialogFilterKeyRef.current === null) {
      prevDialogFilterKeyRef.current = dialogFilterKey
      return
    }
    if (prevDialogFilterKeyRef.current !== dialogFilterKey) {
      prevDialogFilterKeyRef.current = dialogFilterKey
      resetMergeSelection()
    }
  }, [dialogFilterKey, resetMergeSelection])

  const loadCertifications = useCallback(async (page: number, size: number) => {
    try {
      setCertificationsLoading(true)
      const minDataProgress = combinedFilters.dataProgressMin.trim()
        ? parseFloat(combinedFilters.dataProgressMin)
        : undefined
      const maxDataProgress = combinedFilters.dataProgressMax.trim()
        ? parseFloat(combinedFilters.dataProgressMax)
        : undefined
      const data = await fetchCertificationsPage({
        name: combinedFilters.certificationNameSearch.trim() || undefined,
        issuerIds: combinedFilters.issuerIds.length > 0 ? combinedFilters.issuerIds : undefined,
        pageNumber: page,
        pageSize: size,
        minDataProgressPercentage:
          minDataProgress != null && !Number.isNaN(minDataProgress)
            ? minDataProgress
            : undefined,
        maxDataProgressPercentage:
          maxDataProgress != null && !Number.isNaN(maxDataProgress)
            ? maxDataProgress
            : undefined,
        createdByUserId: createdByUserId ?? undefined,
      })
      setItems(data.items)
      setTotalCount(data.totalCount)
      setPageNumber(data.pageNumber)
      setPageSize(data.pageSize)
      setTotalPages(data.totalPages)
      setHasPrevious(data.hasPrevious)
      setHasNext(data.hasNext)
    } catch (error) {
      console.error("Failed to fetch certifications:", error)
      const message = error instanceof Error ? error.message : "Failed to load certifications."
      toast.error(message)
    } finally {
      setCertificationsLoading(false)
    }
  }, [
    combinedFilters.certificationNameSearch,
    combinedFilters.issuerIds,
    combinedFilters.dataProgressMin,
    combinedFilters.dataProgressMax,
    createdByUserId,
  ])

  useEffect(() => {
    loadCertifications(pageNumber, pageSize)
  }, [loadCertifications, pageNumber, pageSize])

  useEffect(() => {
    let cancelled = false
    async function loadIssuers() {
      try {
        const data = await fetchCertificationIssuers()
        if (!cancelled) setIssuers(data)
      } catch (error) {
        console.error("Failed to fetch certification issuers:", error)
        if (!cancelled) toast.error("Failed to load certification issuers.")
      } finally {
        if (!cancelled) setIssuersLoading(false)
      }
    }
    loadIssuers()
    return () => { cancelled = true }
  }, [])

  const visibleCertifications = useMemo(() => {
    if (certificationIdFromUrl == null) return items
    const byId = items.filter((c) => c.id === certificationIdFromUrl)
    return byId.length > 0 ? byId : items
  }, [items, certificationIdFromUrl])

  const handleFiltersChange = (newFilters: CertificationFilters) => {
    dismissCreatedByUserId()
    setFilters(newFilters)
    setPageNumber(1)
  }

  const handlePageChange = (page: number) => {
    setPageNumber(page)
  }

  const handlePageSizeChange = (size: number) => {
    setPageSize(size)
    setPageNumber(1)
  }

  const handleClearCertificationFilter = () => {
    markCreatedByUserIdDismissed()
    const params = new URLSearchParams(searchParams.toString())
    params.delete("certificationFilter")
    params.delete("certificationId")
    params.delete("certificationName")
    deleteCreatedByUserIdParam(params)
    const q = params.toString()
    router.push(q ? `/certifications?${q}` : "/certifications")
  }

  const [mergeDialogOpen, setMergeDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [certificationToEdit, setCertificationToEdit] = useState<Certification | null>(null)

  const handleCertificationSubmit = async (data: CertificationFormData, verificationState?: CertificationVerificationState) => {
    if (certificationToEdit) {
      try {
        await updateCertification(certificationToEdit.id, {
          name: data.certificationName,
          issuerId: data.issuerId ?? null,
        })
        toast.success(`Certification "${data.certificationName}" has been updated${verificationState ? ' and verified' : ''} successfully.`)
        setEditDialogOpen(false)
        setCertificationToEdit(null)
        await loadCertifications(pageNumber, pageSize)
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err)
        if (message === 'Not found') {
          toast.error('Certification not found.')
          setEditDialogOpen(false)
          setCertificationToEdit(null)
        } else {
          toast.error(message || 'Failed to update certification.')
        }
      }
    } else {
      await createCertification({
        name: data.certificationName,
        issuerId: data.issuerId ?? null,
      })
      toast.success(`Certification "${data.certificationName}" has been created successfully.`)
      loadCertifications(pageNumber, pageSize)
    }
  }

  const handleEditCertification = (certification: Certification) => {
    setCertificationToEdit(certification)
    setEditDialogOpen(true)
  }

  const handleSourceCheckedChange = useCallback((certificationId: number, checked: boolean) => {
    setSelectedSourceIds((prev) => {
      const next = new Set(prev)
      if (checked) {
        next.add(certificationId)
      } else {
        next.delete(certificationId)
      }
      return next
    })
    if (checked) {
      setTargetCertificationId((prev) => (prev === certificationId ? null : prev))
    }
  }, [])

  const handleTargetSelect = useCallback((certificationId: number) => {
    setTargetCertificationId(certificationId)
    setSelectedSourceIds((prev) => {
      if (!prev.has(certificationId)) return prev
      const next = new Set(prev)
      next.delete(certificationId)
      return next
    })
  }, [])

  const mergeSelectionReady = useMemo(() => {
    if (selectedSourceIds.size < 1 || targetCertificationId == null) return false
    return !selectedSourceIds.has(targetCertificationId)
  }, [selectedSourceIds, targetCertificationId])

  const mergeButtonDisabledTitle = useMemo(() => {
    if (certificationsLoading) return "Loading certifications…"
    if (selectedSourceIds.size < 1) return "Select at least one source certification."
    if (targetCertificationId == null) return "Select a target certification."
    if (selectedSourceIds.has(targetCertificationId)) {
      return "Target cannot also be a source."
    }
    return undefined
  }, [certificationsLoading, selectedSourceIds, targetCertificationId])

  const handleDeleteCertification = async (certification: Certification) => {
    try {
      await deleteCertification(certification.id)
      toast.success(`Certification "${certification.name}" has been deleted successfully.`)
      setSelectedSourceIds((prev) => {
        if (!prev.has(certification.id)) return prev
        const next = new Set(prev)
        next.delete(certification.id)
        return next
      })
      setTargetCertificationId((prev) => (prev === certification.id ? null : prev))
      await loadCertifications(pageNumber, pageSize)
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      if (message === 'Not found') {
        toast.error('Certification not found.')
      } else {
        toast.error(message || 'Failed to delete certification.')
      }
      throw err
    }
  }

  const handleClearFilters = () => {
    dismissCreatedByUserId()
    setFilters(initialFilters)
    setPageNumber(1)
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">All Certifications</h2>
        </div>
        <div className="flex items-center gap-2">
          <CertificationsFilterDialog
            filters={filters}
            onFiltersChange={handleFiltersChange}
            onClearFilters={handleClearFilters}
            issuers={issuers}
          />
          {canAccessCatalog ? (
            <Button
              type="button"
              disabled={!mergeSelectionReady || certificationsLoading}
              title={mergeButtonDisabledTitle}
              className="transition-all duration-200 ease-in-out hover:scale-105 hover:shadow-md cursor-pointer"
              onClick={() => setMergeDialogOpen(true)}
            >
              <Combine className="h-4 w-4" />
              Merge Certification
            </Button>
          ) : null}
          <CertificationCreationDialog
            onSubmit={handleCertificationSubmit}
            issuers={issuers}
            issuersLoading={issuersLoading}
          />
        </div>
      </div>

      {hasGlobalFilters && (
        <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <Globe className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
            Global filters active ({getGlobalFilterCount(globalFilters)} filters applied across all tables)
          </span>
        </div>
      )}

      {certificationFilterFromUrl && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">Active filters:</span>
          <Badge variant="secondary" className="flex items-center gap-1">
            <Award className="h-3 w-3" />
            Certification: {certificationFilterFromUrl.name}
            <Button
              variant="ghost"
              size="sm"
              className="h-4 w-4 p-0 hover:bg-transparent"
              onClick={handleClearCertificationFilter}
            >
              <X className="h-3 w-3" />
            </Button>
          </Badge>
        </div>
      )}

      <CertificationsTable
        certifications={visibleCertifications}
        isLoading={certificationsLoading}
        totalCount={totalCount}
        pageNumber={pageNumber}
        pageSize={pageSize}
        totalPages={totalPages}
        hasPrevious={hasPrevious}
        hasNext={hasNext}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
        onEdit={handleEditCertification}
        onDelete={handleDeleteCertification}
        showMergeUi={canAccessCatalog}
        selectedSourceIds={selectedSourceIds}
        targetCertificationId={targetCertificationId}
        onSourceCheckedChange={handleSourceCheckedChange}
        onTargetSelect={handleTargetSelect}
      />

      {canAccessCatalog && targetCertificationId != null && selectedSourceIds.size > 0 ? (
        <CertificationMergeDialog
          open={mergeDialogOpen}
          onOpenChange={setMergeDialogOpen}
          sourceIds={Array.from(selectedSourceIds)}
          existingTargetId={targetCertificationId}
          onMergeSuccess={() => {
            resetMergeSelection()
            void loadCertifications(pageNumber, pageSize)
          }}
        />
      ) : null}

      {certificationToEdit && (
        <CertificationCreationDialog
          mode="edit"
          certificationData={certificationToEdit}
          showVerification={true}
          onSubmit={handleCertificationSubmit}
          issuers={issuers}
          issuersLoading={issuersLoading}
          open={editDialogOpen}
          onOpenChange={(open) => {
            setEditDialogOpen(open)
            if (!open) {
              setCertificationToEdit(null)
            }
          }}
        />
      )}
    </div>
  )
}
