"use client"

import * as React from "react"
import { useState, useMemo } from "react"
import {
  ChevronUpIcon,
  ChevronDownIcon,
  MoreHorizontalIcon,
  PlusIcon,
  EditIcon,
  TrashIcon,
  EyeIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
  UsersIcon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

import { Certification } from "@/lib/types/certification"
import { CertificationDetailsDialog } from "@/components/certification-details-dialog"
import Link from "next/link"
import { cn } from "@/lib/utils"
import {
  formatDataProgressPercentage,
  getDataProgressBadgeClasses,
  getDataProgressStatus,
  normalizeProgress,
} from "@/lib/utils/data-progress"

interface CertificationsTableProps {
  certifications: Certification[]
  isLoading?: boolean
  totalCount: number
  pageNumber: number
  pageSize: number
  totalPages: number
  hasPrevious: boolean
  hasNext: boolean
  onPageChange: (page: number) => void
  onPageSizeChange: (pageSize: number) => void
  onAdd?: () => void
  onEdit?: (certification: Certification) => void
  onDelete?: (certification: Certification) => void | Promise<void>
  showMergeUi?: boolean
  selectedSourceIds?: ReadonlySet<number>
  targetCertificationId?: number | null
  onSourceCheckedChange?: (certificationId: number, checked: boolean) => void
  onTargetSelect?: (certificationId: number) => void
}

type SortKey = keyof Certification | "issuerName"
type SortDirection = "asc" | "desc"

const ITEMS_PER_PAGE_OPTIONS = [10, 20, 50, 100]

function CertificationDataProgressBadge({ certification }: { certification: Certification }) {
  const normalized = normalizeProgress(certification.dataProgressPercentage)
  const badgeColors = getDataProgressBadgeClasses(normalized)

  return (
    <div
      className={cn(
        "inline-flex items-center justify-center",
        "h-7 min-w-[44px] px-2 rounded-full",
        "text-xs font-semibold border",
        "cursor-default transition-colors",
        badgeColors.bg,
        badgeColors.border,
        badgeColors.text,
      )}
      title={`Data progress: ${getDataProgressStatus(normalized)}`}
    >
      {formatDataProgressPercentage(certification.dataProgressPercentage)}
    </div>
  )
}

export function CertificationsTable({
  certifications,
  isLoading = false,
  totalCount,
  pageNumber,
  pageSize,
  totalPages,
  hasPrevious,
  hasNext,
  onPageChange,
  onPageSizeChange,
  onAdd,
  onEdit,
  onDelete,
  showMergeUi = false,
  selectedSourceIds,
  targetCertificationId = null,
  onSourceCheckedChange,
  onTargetSelect,
}: CertificationsTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("name")
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc")
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [certificationToDelete, setCertificationToDelete] = useState<Certification | null>(null)
  const [selectedCertification, setSelectedCertification] = useState<Certification | null>(null)
  const getSortValue = (cert: Certification, key: SortKey): string | number => {
    if (key === "issuerName") return cert.issuer?.name ?? ""
    if (key === "dataProgressPercentage") {
      return normalizeProgress(cert.dataProgressPercentage)
    }
    const val = cert[key as keyof Certification]
    if (val === null || val === undefined) return ""
    if (typeof val === "object") return ""
    return val as string | number
  }

  const sortedCertifications = useMemo(() => {
    return [...certifications].sort((a, b) => {
      const aValue = getSortValue(a, sortKey)
      const bValue = getSortValue(b, sortKey)

      if (aValue === bValue) return 0

      const comparison = typeof aValue === "number" && typeof bValue === "number"
        ? aValue - bValue
        : String(aValue).localeCompare(String(bValue))

      return sortDirection === "asc" ? comparison : -comparison
    })
  }, [certifications, sortKey, sortDirection])

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortKey(key)
      setSortDirection("asc")
    }
  }

  const startIndex = totalCount === 0 ? 0 : (pageNumber - 1) * pageSize + 1
  const endIndex = Math.min(pageNumber * pageSize, totalCount)

  const handleDeleteClick = (certification: Certification) => {
    setCertificationToDelete(certification)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!certificationToDelete) return
    try {
      await onDelete?.(certificationToDelete)
      setDeleteDialogOpen(false)
      setCertificationToDelete(null)
    } catch {
      setDeleteDialogOpen(false)
      setCertificationToDelete(null)
    }
  }

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false)
    setCertificationToDelete(null)
  }

  const SortButton = ({ column, children }: { column: SortKey; children: React.ReactNode }) => (
    <Button
      variant="ghost"
      onClick={() => handleSort(column)}
      className="h-8 data-[state=open]:bg-accent flex items-center gap-2 hover:bg-accent/50"
    >
      {children}
      {sortKey === column &&
        (sortDirection === "asc" ? (
          <ChevronUpIcon className="h-4 w-4" />
        ) : (
          <ChevronDownIcon className="h-4 w-4" />
        ))}
    </Button>
  )

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-10 w-[300px] bg-muted animate-pulse rounded"></div>
          <div className="h-10 w-[130px] bg-muted animate-pulse rounded"></div>
        </div>
        <div className="rounded-md border">
          <div className="h-[400px] bg-muted animate-pulse"></div>
        </div>
      </div>
    )
  }

  if (certifications.length === 0 && !isLoading) {
    return (
      <div className="space-y-4">
        <div className="rounded-md border">
          <div className="flex items-center justify-center h-[400px] text-center">
            <p className="text-lg font-semibold text-muted-foreground">No certifications found</p>
          </div>
        </div>
      </div>
    )
  }

  const certificationsTable = (
          <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[60px]">No.</TableHead>
              {showMergeUi ? (
                <>
                  <TableHead className="w-[72px] text-center">Source</TableHead>
                  <TableHead className="w-[72px] text-center">Target</TableHead>
                </>
              ) : null}
              <TableHead>
                <SortButton column="name">Name</SortButton>
              </TableHead>
              <TableHead>
                <SortButton column="issuerName">Issuing Body</SortButton>
              </TableHead>
              <TableHead className="hidden lg:table-cell w-[88px]">
                <SortButton column="dataProgressPercentage">Data Progress</SortButton>
              </TableHead>
              <TableHead className="w-[60px]" title="View Candidates">Candidates</TableHead>
              <TableHead className="w-[96px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedCertifications.map((certification, index) => (
              <TableRow
                key={certification.id}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => setSelectedCertification(certification)}
              >
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {(pageNumber - 1) * pageSize + index + 1}
                </TableCell>
                {showMergeUi ? (
                  <>
                    <TableCell
                      className="text-center"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Checkbox
                        checked={selectedSourceIds?.has(certification.id) ?? false}
                        disabled={targetCertificationId === certification.id}
                        aria-label={`Select ${certification.name} as merge source`}
                        onCheckedChange={(checked) => {
                          onSourceCheckedChange?.(certification.id, checked === true)
                        }}
                      />
                    </TableCell>
                    <TableCell
                      className="text-center"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <RadioGroupItem
                        value={String(certification.id)}
                        aria-label={`Select ${certification.name} as merge target`}
                        disabled={selectedSourceIds?.has(certification.id) ?? false}
                      />
                    </TableCell>
                  </>
                ) : null}
                <TableCell className="font-medium">
                  {certification.name}
                </TableCell>
                <TableCell>
                  {certification.issuer ? (
                    certification.issuer.name
                  ) : (
                    <span className="text-muted-foreground text-sm">N/A</span>
                  )}
                </TableCell>
                <TableCell className="hidden lg:table-cell">
                  <CertificationDataProgressBadge certification={certification} />
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 transition-colors hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-950 dark:hover:text-blue-400 cursor-pointer"
                    asChild
                  >
                    <Link
                      href={`/candidates?certificationId=${certification.id}&certificationName=${encodeURIComponent(certification.name)}`}
                      title={`View candidates for ${certification.name}`}
                      aria-label={`View candidates with this certification: ${certification.name}`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <UsersIcon className="h-4 w-4" aria-hidden />
                    </Link>
                  </Button>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedCertification(certification)
                      }}
                      title={`View ${certification.name}`}
                      aria-label={`View ${certification.name}`}
                    >
                      <EyeIcon className="h-4 w-4" />
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          className="h-8 w-8 p-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontalIcon className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={(e) => {
                          e.stopPropagation()
                          onEdit?.(certification)
                        }}
                        className="cursor-pointer"
                      >
                        <EditIcon className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDeleteClick(certification)
                        }}
                        className="text-red-600 focus:text-red-600 cursor-pointer"
                      >
                        <TrashIcon className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
  )

  const targetRadioGroup =
    showMergeUi ? (
      <RadioGroup
        value={targetCertificationId != null ? String(targetCertificationId) : ""}
        onValueChange={(value) => {
          if (!value || !onTargetSelect) return
          const id = Number.parseInt(value, 10)
          if (Number.isFinite(id)) onTargetSelect(id)
        }}
        className="contents"
      >
        {certificationsTable}
      </RadioGroup>
    ) : (
      certificationsTable
    )

  return (
    <div className="space-y-4">
      {/* Table */}
      <div className="rounded-md border">{targetRadioGroup}</div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center space-x-2">
          <p className="text-sm font-medium">Rows per page</p>
          <Select
            value={pageSize.toString()}
            onValueChange={(value) => onPageSizeChange(parseInt(value))}
          >
            <SelectTrigger className="h-8 w-[70px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent side="top">
              {ITEMS_PER_PAGE_OPTIONS.map((size) => (
                <SelectItem key={size} value={size.toString()}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center space-x-6 lg:space-x-8">
          <div className="flex w-[100px] items-center justify-center text-sm font-medium">
            Page {pageNumber} of {totalPages || 1}
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              className="hidden h-8 w-8 p-0 lg:flex"
              onClick={() => onPageChange(1)}
              disabled={!hasPrevious}
            >
              <span className="sr-only">Go to first page</span>
              <ChevronsLeftIcon className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={() => onPageChange(pageNumber - 1)}
              disabled={!hasPrevious}
            >
              <span className="sr-only">Go to previous page</span>
              <ChevronLeftIcon className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={() => onPageChange(pageNumber + 1)}
              disabled={!hasNext}
            >
              <span className="sr-only">Go to next page</span>
              <ChevronRightIcon className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="hidden h-8 w-8 p-0 lg:flex"
              onClick={() => onPageChange(totalPages)}
              disabled={!hasNext}
            >
              <span className="sr-only">Go to last page</span>
              <ChevronsRightIcon className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Results Info */}
      <div className="text-xs text-muted-foreground">
        Showing {totalCount === 0 ? 0 : startIndex} to {endIndex} of {totalCount} certifications
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{certificationToDelete?.name}</strong>. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleDeleteCancel} className="cursor-pointer">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 cursor-pointer transition-transform duration-200 hover:scale-105"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {selectedCertification ? (
        <CertificationDetailsDialog
          certification={selectedCertification}
          open
          onOpenChange={(open) => {
            if (!open) setSelectedCertification(null)
          }}
          onEdit={onEdit}
        />
      ) : null}
    </div>
  )
}
