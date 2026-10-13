"use client"

import * as React from "react"
import { useState, useMemo, useEffect, useRef } from "react"
import {
  ChevronUpIcon,
  ChevronDownIcon,
  MoreHorizontalIcon,
  SearchIcon,
  PlusIcon,
  Plus,
  EyeIcon,
  EditIcon,
  TrashIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
  UsersIcon,
  TagIcon,
  ExternalLinkIcon,
  ShieldCheck,
  Pencil,
  Check,
  Save,
  X,
  Loader2,
  ChevronsUpDown,
  CalendarIcon,
} from "lucide-react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { VerificationBadge } from "@/components/ui/verification-badge"
import { FieldHistoryPopover } from "@/components/ui/field-history-popover"
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Calendar } from "@/components/ui/calendar"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Switch } from "@/components/ui/switch"
import { MultiSelect, MultiSelectOption } from "@/components/ui/multi-select"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { buildTechStackMultiSelectOptions } from "@/lib/utils/tech-stack-lookup"
import {
  formatProjectDataProgress,
  getDataProgressBadgeClasses,
  getDataProgressStatus,
  normalizeProgress,
} from "@/lib/utils/project-data-progress"

import {
  Project,
  PROJECT_STATUS_COLORS,
  PROJECT_STATUS_LABELS,
  PROJECT_TYPES,
  PUBLISH_PLATFORM_FILTER_OPTIONS,
  type ProjectDetail,
  type ProjectStatus,
} from "@/lib/types/project"
import { EntityAuditFields } from "@/components/entity-audit-fields"
import {
  fetchProjectById,
  projectDtoToProject,
} from "@/lib/services/projects-api"
import {
  searchEmployers,
  fetchEmployerById,
  createEmployer,
  buildCreateEmployerDto,
} from "@/lib/services/employers-api"
import type { EmployerLookupDto } from "@/lib/services/employers-api"
import { fetchAwards, createAward } from "@/lib/services/awards-api"
import type { LookupItem } from "@/lib/services/lookups-api"
import { catalogLabelForValue, catalogLabelsForValues, catalogToSelectOptions } from "@/lib/utils/domain-catalog"
import type { ProjectLookups, SelectedEmployer } from "@/components/project-creation-dialog"
import { ProjectModulesSection } from "@/components/project-modules-section"
import { EmployerCreationDialog } from "@/components/employer-creation-dialog"
import { 
  getVerificationsForProject,
  calculateProjectVerificationSummary,
  getProjectAuditLogsForVerification,
  sampleVerificationUsers 
} from "@/lib/sample-data/verification"

// Utility functions
const formatDate = (date: Date | undefined) => {
  if (!date) return "Ongoing"
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

// Validation functions
const validateURL = (url: string): string | null => {
  if (!url) return null // Optional field
  try {
    new URL(url)
    return null
  } catch {
    return 'Invalid URL format'
  }
}

const validateTeamSize = (size: string): string | null => {
  if (!size) return null // Optional
  
  // Check if single number
  if (/^\d+$/.test(size)) {
    const num = parseInt(size)
    if (num < 1) return 'Team size must be at least 1'
    if (num > 1000) return 'Team size seems too large'
    return null
  }
  
  // Check if range (e.g., "20-30")
  const rangeMatch = size.match(/^(\d+)-(\d+)$/)
  if (rangeMatch) {
    const [, min, max] = rangeMatch
    const minNum = parseInt(min)
    const maxNum = parseInt(max)
    
    if (minNum >= maxNum) {
      return 'Maximum must be greater than minimum'
    }
    if (minNum < 1) {
      return 'Team size must be at least 1'
    }
    if (maxNum > 1000) {
      return 'Team size seems too large'
    }
    return null
  }
  
  return 'Invalid format. Use "5" or "20-30"'
}

const validateLatestUpdate = (value: string): string | null => {
  if (value.length > 500) {
    return 'Latest Update must be less than 500 characters'
  }
  return null
}

const publishPlatformOptions: MultiSelectOption[] = PUBLISH_PLATFORM_FILTER_OPTIONS.map((o) => ({
  value: o.value,
  label: o.label,
}))

const projectTypeOptions = PROJECT_TYPES.map((type) => ({
  label: type,
  value: type,
}))

// Status options
const statusOptions = Object.entries(PROJECT_STATUS_LABELS).map(([value, label]) => ({
  label,
  value: value as ProjectStatus
}))

/** Sticky right columns: Actions (far right) + Team (beside Actions). */
const projectsTableStickyActionsHeadClass = cn(
  "sticky right-0 z-20 w-[70px] min-w-[70px] max-w-[70px] bg-background",
)
const projectsTableStickyTeamHeadClass = cn(
  "sticky right-[70px] z-20 w-[60px] min-w-[60px] max-w-[60px] bg-background border-l border-border shadow-[-4px_0_6px_-4px_rgba(0,0,0,0.08)] dark:shadow-[-4px_0_6px_-4px_rgba(0,0,0,0.35)]",
)
const projectsTableStickyActionsCellClass = cn(
  "sticky right-0 z-10 w-[70px] min-w-[70px] max-w-[70px] bg-background group-hover:bg-muted/50",
)
const projectsTableStickyTeamCellClass = cn(
  "sticky right-[70px] z-10 w-[60px] min-w-[60px] max-w-[60px] bg-background group-hover:bg-muted/50 border-l border-border shadow-[-4px_0_6px_-4px_rgba(0,0,0,0.08)] dark:shadow-[-4px_0_6px_-4px_rgba(0,0,0,0.35)]",
)

interface ProjectsTableProps {
  projects: Project[]
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
  onView?: (project: Project) => void
  onEdit?: (project: Project) => void
  onDelete?: (project: Project) => void
  onVerify?: (project: Project) => void
  /** From GET /api/TechnicalDomains; empty until parent loads catalog. */
  technicalDomainOptions?: MultiSelectOption[]
  lookups?: ProjectLookups
  onCreateTechStack?: (name: string, context?: { aspectTypeId: number }) => Promise<void>
  onCreateTechnicalAspect?: (name: string) => Promise<void>
  onCreateClientLocation?: (name: string) => Promise<LookupItem | void>
}

type SortKey = keyof Project
type SortDirection = "asc" | "desc"

const ITEMS_PER_PAGE_OPTIONS = [5, 10, 20, 50]

function coerceProjectStatusForDisplay(raw: string): ProjectStatus | null {
  if (raw in PROJECT_STATUS_LABELS) return raw as ProjectStatus
  const t = raw.trim().toLowerCase()
  if (t === "development") return "Development"
  if (t === "maintenance") return "Maintenance"
  if (t === "closed") return "Closed"
  return null
}

function ProjectDataProgressBadge({ project }: { project: Project }) {
  const normalized = normalizeProgress(project.dataProgressPercentage)
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
      onClick={(e) => e.stopPropagation()}
    >
      {formatProjectDataProgress(project.dataProgressPercentage)}
    </div>
  )
}

export function ProjectsTable({
  projects,
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
  onView,
  onEdit,
  onDelete,
  onVerify,
  technicalDomainOptions = [],
  lookups,
  onCreateTechStack,
  onCreateClientLocation,
}: ProjectsTableProps) {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")
  const [sortKey, setSortKey] = useState<SortKey>("projectName")
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc")
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [focusModules, setFocusModules] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null)

  const verticalDomainOptions = lookups?.verticalDomains ?? []
  const horizontalDomainOptions = lookups?.horizontalDomains ?? []
  // const technicalAspectCatalogOptions = lookups?.technicalAspects?.length
  //   ? catalogToSelectOptions(lookups.technicalAspects)
  //   : []
  const q = searchQuery.toLowerCase()
  const matchesCatalog = (values: string[], options: MultiSelectOption[]) =>
    catalogLabelsForValues(values, options).some((label) => label.toLowerCase().includes(q)) ||
    values.some((value) => value.toLowerCase().includes(q))

  const handleDeleteClick = (project: Project) => {
    setProjectToDelete(project)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = () => {
    if (projectToDelete) {
      // Call onDelete if provided, otherwise just show toast
      onDelete?.(projectToDelete)
      
      // Show success toast
      toast.success(`Project "${projectToDelete.projectName}" has been deleted successfully.`)
      
      // Close dialog and reset state
      setDeleteDialogOpen(false)
      setProjectToDelete(null)
    }
  }

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false)
    setProjectToDelete(null)
  }

  // Filtering (including all project data)
  const filteredProjects = useMemo(() => {
    if (!searchQuery) return projects

    return projects.filter(
      (project) =>
        project.projectName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (project.employerName !== null && project.employerName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (project.status !== null && project.status.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (project.teamSize !== null && project.teamSize.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (project.description !== null && project.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
        project.techStacks.some(tech => tech.toLowerCase().includes(searchQuery.toLowerCase())) ||
        matchesCatalog(project.verticalDomains, verticalDomainOptions) ||
        matchesCatalog(project.horizontalDomains, horizontalDomainOptions) ||
        matchesCatalog(project.technicalDomains, technicalDomainOptions) ||
        // matchesCatalog(project.technicalAspects, technicalAspectCatalogOptions) ||
        project.aspectTypeLabels.some(label => label.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (project.isPublished && "published".includes(searchQuery.toLowerCase())) ||
        (project.publishPlatforms && project.publishPlatforms.some(platform => platform.toLowerCase().includes(searchQuery.toLowerCase())))
    )
  // }, [projects, searchQuery, verticalDomainOptions, horizontalDomainOptions, technicalDomainOptions, technicalAspectCatalogOptions])
}, [projects, searchQuery, verticalDomainOptions, horizontalDomainOptions, technicalDomainOptions])
  // Sorting
  const sortedProjects = useMemo(() => {
    return [...filteredProjects].sort((a, b) => {
      if (sortKey === "dataProgressPercentage") {
        const aNum = normalizeProgress(a.dataProgressPercentage)
        const bNum = normalizeProgress(b.dataProgressPercentage)
        if (aNum === bNum) return 0
        return sortDirection === "asc" ? aNum - bNum : bNum - aNum
      }

      const aValue = a[sortKey]
      const bValue = b[sortKey]

      if (aValue === bValue) return 0

      let comparison = 0
      if (aValue instanceof Date && bValue instanceof Date) {
        comparison = aValue.getTime() - bValue.getTime()
      } else {
        comparison = String(aValue).localeCompare(String(bValue))
      }

      return sortDirection === "asc" ? comparison : -comparison
    })
  }, [filteredProjects, sortKey, sortDirection])

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortKey(key)
      setSortDirection("asc")
    }
  }

  const handleViewTeam = (project: Project) => {
    // Navigate to candidates page with project filter
    const params = new URLSearchParams({
      projectFilter: project.projectName,
      projectId: project.id
    })
    router.push(`/candidates?${params.toString()}`)
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


  const renderTags = (tags: string[], maxDisplay: number = 2, colorClass?: string) => {
    const displayTags = tags.slice(0, maxDisplay)
    const remainingCount = tags.length - maxDisplay

    return (
      <div className="flex flex-wrap gap-1">
        {displayTags.map((tag, index) => (
          <Badge
            key={index}
            variant="secondary"
            className={`text-xs ${colorClass || ""}`}
          >
            {tag}
          </Badge>
        ))}
        {remainingCount > 0 && (
          <Badge variant="outline" className="text-xs">
            +{remainingCount} more
          </Badge>
        )}
      </div>
    )
  }

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

  if (projects.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="relative">
            <SearchIcon className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 w-[300px]"
            />
          </div>
          {onAdd && (
            <Button onClick={onAdd}>
              <PlusIcon className="mr-2 h-4 w-4" />
              Add Project
            </Button>
          )}
        </div>
        <div className="rounded-md border">
          <div className="flex items-center justify-center h-[400px] text-center">
            <div className="space-y-2">
              <p className="text-lg font-semibold">No projects found</p>
              <p className="text-muted-foreground">Get started by adding your first project.</p>
              {onAdd && (
                <Button 
                  onClick={onAdd} 
                  className="mt-4 transition-all duration-200 ease-in-out hover:scale-105 hover:shadow-md cursor-pointer"
                >
                  <PlusIcon className="mr-2 h-4 w-4" />
                  Create Project
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[120px] max-w-[240px] w-[240px]">
                <SortButton column="projectName">Project Name</SortButton>
              </TableHead>
              <TableHead className="w-[140px]">
                <SortButton column="employerName">Employer</SortButton>
              </TableHead>
              <TableHead className="w-[120px] min-w-[110px]">
                <SortButton column="status">Status</SortButton>
              </TableHead>
              <TableHead className="w-[88px]">Modules</TableHead>
              <TableHead className="w-[180px]">Tech Stacks</TableHead>
              <TableHead className="w-[160px]">Horizontal Domains</TableHead>
              <TableHead className="w-[160px]">Vertical Domains</TableHead>
              <TableHead className="w-[160px]">Technical Domains</TableHead>
              {/* <TableHead className="w-[180px]">Technical Aspect Types</TableHead> */}
              <TableHead className="w-[180px]">Technical Aspects</TableHead>
              <TableHead className="w-[100px]">
                <SortButton column="teamSize">Team Size</SortButton>
              </TableHead>
              <TableHead className="hidden lg:table-cell w-[88px]">
                <SortButton column="dataProgressPercentage">Data Progress</SortButton>
              </TableHead>
              <TableHead
                className={projectsTableStickyTeamHeadClass}
                title="View Team Members"
              >
                Team
              </TableHead>
              <TableHead className={projectsTableStickyActionsHeadClass}>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedProjects.map((project) => (
              <TableRow 
                key={project.id}
                className="group hover:bg-muted/50 cursor-pointer"
                onClick={() => {
                  setFocusModules(false)
                  setSelectedProject(project)
                }}
              >
                <TableCell className="font-medium max-w-[240px] w-[240px]">
                  <div className="truncate" title={project.projectName}>
                    {project.projectName}
                  </div>
                </TableCell>
                <TableCell>
                  {project.employerName ? (
                    project.employerName
                  ) : (
                    <span className="text-muted-foreground text-sm">N/A</span>
                  )}
                </TableCell>
                <TableCell>
                  {(() => {
                    const status = coerceProjectStatusForDisplay(String(project.status ?? ""))
                    if (!status) {
                      return <span className="text-muted-foreground text-sm">N/A</span>
                    }
                    return (
                      <Badge
                        variant="outline"
                        className={`text-xs font-medium whitespace-nowrap ${PROJECT_STATUS_COLORS[status]}`}
                      >
                        {PROJECT_STATUS_LABELS[status]}
                      </Badge>
                    )
                  })()}
                </TableCell>
                <TableCell>
                  <button
                    type="button"
                    className="cursor-pointer text-sm font-medium tabular-nums hover:text-primary hover:underline"
                    onClick={(event) => {
                      event.stopPropagation()
                      setFocusModules(true)
                      setSelectedProject(project)
                    }}
                  >
                    {project.moduleCount ?? 0}
                  </button>
                </TableCell>
                <TableCell>
                  {renderTags(project.techStacks, 2, "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200")}
                </TableCell>
                <TableCell>
                  {renderTags(catalogLabelsForValues(project.horizontalDomains, horizontalDomainOptions), 2, "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200")}
                </TableCell>
                <TableCell>
                  {renderTags(catalogLabelsForValues(project.verticalDomains, verticalDomainOptions), 2, "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200")}
                </TableCell>
                <TableCell>
                  {renderTags(
                    catalogLabelsForValues(project.technicalDomains, technicalDomainOptions),
                    2,
                    "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200"
                  )}
                </TableCell>
                <TableCell>
                  {renderTags(project.aspectTypeLabels, 2, "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200")}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1">
                    <UsersIcon className="h-3 w-3 text-muted-foreground shrink-0" />
                    <span>{project.teamSize ?? "N/A"}</span>
                  </div>
                </TableCell>
                <TableCell className="hidden lg:table-cell">
                  <ProjectDataProgressBadge project={project} />
                </TableCell>
                <TableCell className={projectsTableStickyTeamCellClass}>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 transition-colors hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-950 dark:hover:text-blue-400 cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleViewTeam(project)
                    }}
                    title={`View team members for ${project.projectName}`}
                  >
                    <UsersIcon className="h-4 w-4" />
                  </Button>
                </TableCell>
                <TableCell className={projectsTableStickyActionsCellClass}>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={(e) => {
                        e.stopPropagation()
                        setFocusModules(false)
                        setSelectedProject(project)
                      }}
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
                          className="cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation()
                            onEdit?.(project)
                          }}
                        >
                          <EditIcon className="mr-2 h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="cursor-pointer text-red-600 focus:text-red-600"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteClick(project)
                          }}
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
      </div>

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
        Showing {totalCount === 0 ? 0 : (pageNumber - 1) * pageSize + 1} to{" "}
        {Math.min(pageNumber * pageSize, totalCount)} of {totalCount} projects
        {searchQuery && " (local sort applied)"}
      </div>

      {/* Project Detail Dialog */}
      {selectedProject && (
        <ProjectDetailDialog
          project={selectedProject}
          open={!!selectedProject}
          focusModules={focusModules}
          onOpenChange={(open) => {
            if (!open) {
              setSelectedProject(null)
            }
          }}
          onVerify={onVerify ? (project) => {
            setSelectedProject(null) // Close detail dialog
            onVerify(project)
          } : undefined}
          technicalDomainOptions={technicalDomainOptions}
          lookups={lookups}
          onCreateTechStack={onCreateTechStack}
          onCreateClientLocation={onCreateClientLocation}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{projectToDelete?.projectName}</strong>. This action cannot be undone.
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
    </>
  )
}

// Inline Edit Field Component
interface InlineEditFieldProps {
  label: string
  value: string | number | null | undefined
  fieldName: string
  fieldType: 'text' | 'number' | 'url' | 'select'
  options?: { label: string; value: string }[]
  validation?: (value: string) => string | null
  onSave: (fieldName: string, newValue: string | number, verify: boolean) => Promise<void>
  placeholder?: string
  getFieldVerification?: (fieldName: string) => 'verified' | 'unverified' | undefined
  className?: string
}

const InlineEditField: React.FC<InlineEditFieldProps> = ({
  label,
  value,
  fieldName,
  fieldType,
  options,
  validation,
  onSave,
  placeholder,
  getFieldVerification,
  className
}) => {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(value !== null && value !== undefined ? String(value) : '')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [willVerify, setWillVerify] = useState(true)
  
  const verificationStatus = getFieldVerification?.(fieldName)
  
  const handleEdit = () => {
    setIsEditing(true)
    setEditValue(value !== null && value !== undefined ? String(value) : '')
    setWillVerify(true)
    setError(null)
  }
  
  const handleCancel = () => {
    setIsEditing(false)
    setEditValue(value !== null && value !== undefined ? String(value) : '')
    setWillVerify(true)
    setError(null)
  }
  
  const handleSave = async () => {
    // Validate
    if (validation) {
      const validationError = validation(editValue)
      if (validationError) {
        setError(validationError)
        return
      }
    }
    
    // No change
    if (editValue === (value !== null && value !== undefined ? String(value) : '')) {
      setIsEditing(false)
      return
    }
    
    // Save
    setIsSaving(true)
    try {
      await onSave(fieldName, editValue, willVerify)
      setIsEditing(false)
      setError(null)
    } catch (err) {
      setError('Failed to save. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSave()
    } else if (e.key === 'Escape') {
      handleCancel()
    }
  }
  
  const displayValue = (() => {
    // Check if value is null, undefined, or empty string
    const isEmpty = value === null || value === undefined || String(value).trim() === ''
    
    if (isEmpty) {
      // Special case: show "Not Linked" for employer field
      if (fieldName === 'employerName') {
        return 'Not Linked'
      }
      // Default: show "N/A" for other fields
      return 'N/A'
    }
    
    return String(value)
  })()

  const isEmptyDisplay =
    value === null || value === undefined || String(value).trim() === ""
  
  // Verification indicator component
  const VerificationIndicator = ({ 
    fieldName: fName
  }: { 
    fieldName: string
  }) => {
    const verification = getFieldVerification?.(fName)
    const status = verification || 'unverified'
    
    return (
      <div className="flex items-center gap-1 shrink-0">
        <VerificationBadge 
          status={status}
          size="sm"
        />
      </div>
    )
  }
  
  return (
    <div className={cn("min-w-0 space-y-1 py-2 px-3 rounded-md hover:bg-muted/50 transition-colors", className)}>
      <div className="flex items-center justify-between mb-1 gap-2">
        <Label className="text-sm font-medium text-muted-foreground truncate">{label}</Label>
        {!isEditing && (
          <div className="flex items-center gap-1 shrink-0">
            <VerificationIndicator fieldName={fieldName} />
            <Button
              size="sm"
              variant="ghost"
              onClick={handleEdit}
              className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              type="button"
              title="Edit field"
            >
              <Pencil className="w-3.5 h-3.5" />
            </Button>
          </div>
        )}
      </div>
      
      {isEditing ? (
        <div className="space-y-2">
          <div className="flex items-start gap-2">
            <div className="flex-1 space-y-2">
              {fieldType === 'select' ? (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      className={cn("w-full justify-between", error && "border-red-500")}
                      disabled={isSaving}
                    >
                      {editValue
                        ? options?.find((option) => option.value === editValue)?.label
                        : placeholder || "Select option..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                    <Command>
                      <CommandInput placeholder={`Search ${label.toLowerCase()}...`} className="h-9" />
                      <CommandList>
                        <CommandEmpty>No option found.</CommandEmpty>
                        <CommandGroup>
                          {options?.map((option) => (
                            <CommandItem
                              key={option.value}
                              value={option.value}
                              onSelect={(currentValue) => {
                                setEditValue(currentValue === editValue ? "" : currentValue)
                              }}
                              className="cursor-pointer"
                            >
                              {option.label}
                              <Check
                                className={cn(
                                  "ml-auto h-4 w-4",
                                  editValue === option.value ? "opacity-100" : "opacity-0"
                                )}
                              />
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              ) : (
                <Input
                  type={fieldType}
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={placeholder}
                  className={cn("w-full min-w-0 text-sm", error && "border-red-500")}
                  autoFocus
                  disabled={isSaving}
                />
              )}
              
              {/* Mark as verified checkbox */}
              <div className="flex items-center gap-2 pl-1">
                <Checkbox
                  id={`verify-${fieldName}`}
                  checked={willVerify}
                  onCheckedChange={(checked) => setWillVerify(checked as boolean)}
                  disabled={isSaving}
                  className="h-4 w-4"
                />
                <Label 
                  htmlFor={`verify-${fieldName}`}
                  className={cn(
                    "text-xs cursor-pointer",
                    willVerify ? 'text-green-600 dark:text-green-400 font-medium' : 'text-muted-foreground'
                  )}
                >
                  {willVerify ? '✓ Verified' : 'Mark as verified'}
                </Label>
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex gap-1 shrink-0">
              <Button
                size="sm"
                onClick={handleSave}
                disabled={isSaving}
                className="h-8 w-8 p-0"
                title={willVerify ? "Save & Verify" : "Save"}
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleCancel}
                disabled={isSaving}
                className="h-8 w-8 p-0"
                title="Cancel"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
          
          {/* Error Message */}
          {error && (
            <p className="text-xs text-red-500">{error}</p>
          )}
        </div>
      ) : (
        <div className="min-w-0">
          <span
            className={cn(
              "text-sm block min-w-0",
              fieldType === "url" && !isEmptyDisplay && "break-all",
              isEmptyDisplay && "text-muted-foreground italic"
            )}
            title={fieldType === "url" && !isEmptyDisplay ? String(value) : undefined}
          >
            {displayValue}
          </span>
        </div>
      )}
    </div>
  )
}

// Inline Edit Date Field Component
interface InlineEditDateFieldProps {
  label: string
  value: Date | null | undefined
  fieldName: string
  onSave: (fieldName: string, newValue: Date | null | undefined, verify: boolean) => Promise<void>
  placeholder?: string
  getFieldVerification?: (fieldName: string) => 'verified' | 'unverified' | undefined
  className?: string
  otherDate?: Date | null | undefined // For date range validation (e.g., endDate for startDate validation)
  otherDateFieldName?: string // Name of the other date field for error messages
  validateDateRange?: (date: Date | null | undefined, otherDate: Date | null | undefined, fieldName: string) => string | null
}

const InlineEditDateField: React.FC<InlineEditDateFieldProps> = ({
  label,
  value,
  fieldName,
  onSave,
  placeholder,
  getFieldVerification,
  className,
  otherDate,
  otherDateFieldName,
  validateDateRange
}) => {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState<Date | null | undefined>(value)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [willVerify, setWillVerify] = useState(true)
  const [open, setOpen] = useState(false)
  
  const verificationStatus = getFieldVerification?.(fieldName)
  const isCurrentlyVerified = verificationStatus === 'verified'
  
  // Update editValue when value prop changes (but not when editing)
  React.useEffect(() => {
    if (!isEditing) {
      setEditValue(value)
    }
  }, [value, isEditing])
  
  // Initialize willVerify based on current verification status when entering edit mode
  React.useEffect(() => {
    if (isEditing) {
      setWillVerify(isCurrentlyVerified)
    }
  }, [isEditing, isCurrentlyVerified])
  
  const handleEdit = () => {
    setIsEditing(true)
    setEditValue(value)
    setWillVerify(isCurrentlyVerified)
    setError(null)
  }
  
  const handleCancel = () => {
    setIsEditing(false)
    setEditValue(value)
    setWillVerify(isCurrentlyVerified)
    setError(null)
    setOpen(false)
  }
  
  const handleSave = async () => {
    // Validate date range if validation function provided
    if (validateDateRange) {
      const validationError = validateDateRange(editValue, otherDate, fieldName)
      if (validationError) {
        setError(validationError)
        return
      }
    }
    
    // No change check
    const verificationChanged = willVerify !== isCurrentlyVerified
    const dateChanged = editValue?.getTime() !== value?.getTime()
    if (!dateChanged && !verificationChanged) {
      setIsEditing(false)
      setOpen(false)
      return
    }
    
    // Save
    setIsSaving(true)
    try {
      await onSave(fieldName, editValue, willVerify)
      setIsEditing(false)
      setError(null)
      setOpen(false)
    } catch (err) {
      setError('Failed to save. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }
  
  const displayValue = value ? formatDate(value) : (fieldName === 'endDate' ? 'Ongoing' : 'N/A')
  
  // Verification indicator component
  const VerificationIndicator = ({ 
    fieldName: fName
  }: { 
    fieldName: string
  }) => {
    const verification = getFieldVerification?.(fName)
    const status = verification || 'unverified'
    
    return (
      <div className="flex items-center gap-1 shrink-0">
        <VerificationBadge 
          status={status}
          size="sm"
        />
      </div>
    )
  }
  
  return (
    <div className={cn("space-y-1 py-2 px-3 rounded-md hover:bg-muted/50 transition-colors", className)}>
      <div className="flex items-center justify-between mb-1">
        <Label className="text-sm font-medium text-muted-foreground">{label}</Label>
        {!isEditing && (
          <div className="flex items-center gap-1 shrink-0">
            <VerificationIndicator fieldName={fieldName} />
            <Button
              size="sm"
              variant="ghost"
              onClick={handleEdit}
              className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              type="button"
              title="Edit field"
            >
              <Pencil className="w-3.5 h-3.5" />
            </Button>
          </div>
        )}
      </div>
      
      {isEditing ? (
        <div className="space-y-2">
          <div className="flex items-start gap-2">
            <div className="flex-1 space-y-2">
              <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn("w-full justify-between font-normal", error && "border-red-500")}
                    disabled={isSaving}
                  >
                    {editValue 
                      ? editValue.toLocaleDateString()
                      : placeholder || `Select ${label.toLowerCase()}`}
                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={editValue || undefined}
                    onSelect={(date) => {
                      setEditValue(date || null)
                      setOpen(false)
                    }}
                    captionLayout="dropdown"
                    disabled={isSaving}
                  />
                </PopoverContent>
              </Popover>
              
              {/* Mark as verified checkbox */}
              <div className="flex items-center gap-2 pl-1">
                <Checkbox
                  id={`verify-${fieldName}`}
                  checked={willVerify}
                  onCheckedChange={(checked) => setWillVerify(checked as boolean)}
                  disabled={isSaving}
                  className="h-4 w-4"
                />
                <Label 
                  htmlFor={`verify-${fieldName}`}
                  className={cn(
                    "text-xs cursor-pointer",
                    willVerify ? 'text-green-600 dark:text-green-400 font-medium' : 'text-muted-foreground'
                  )}
                >
                  {willVerify ? '✓ Verified' : 'Mark as verified'}
                </Label>
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex gap-1 shrink-0">
              <Button
                size="sm"
                onClick={handleSave}
                disabled={isSaving}
                className="h-8 w-8 p-0"
                title={willVerify ? "Save & Verify" : "Save"}
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleCancel}
                disabled={isSaving}
                className="h-8 w-8 p-0"
                title="Cancel"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
          
          {/* Error Message */}
          {error && (
            <p className="text-xs text-red-500">{error}</p>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <span className={`text-sm ${
            (value === null || value === undefined || String(value).trim() === '') 
              ? 'text-muted-foreground italic' 
              : ''
          }`}>
            {displayValue}
          </span>
        </div>
      )}
    </div>
  )
}

// Inline Editable Multi-Select Component
interface InlineEditableMultiSelectProps {
  label: string
  value: string[]
  fieldName: string
  options: MultiSelectOption[]
  onSave: (fieldName: string, newValue: string[], shouldVerify: boolean) => Promise<void>
  getFieldVerification?: (fieldName: string) => 'verified' | 'unverified' | undefined
  className?: string
  placeholder?: string
  searchPlaceholder?: string
  badgeColorClass?: string
  maxDisplay?: number
  creatable?: boolean
  createLabel?: string
  onCreateNew?: (name: string) => Promise<unknown>
}

const InlineEditableMultiSelect: React.FC<InlineEditableMultiSelectProps> = ({
  label,
  value,
  fieldName,
  options,
  onSave,
  getFieldVerification,
  className = "",
  placeholder = "Select options...",
  searchPlaceholder = "Search...",
  badgeColorClass = "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  maxDisplay = 4,
  creatable = false,
  createLabel = "Add new",
  onCreateNew,
}) => {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState<string[]>(value || [])
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [willVerify, setWillVerify] = useState(true)
  const [isExpanded, setIsExpanded] = useState(false)

  // Get current verification status
  const verificationStatus = getFieldVerification?.(fieldName)
  const isCurrentlyVerified = verificationStatus === 'verified'

  // Update editValue when value prop changes (but not when editing)
  React.useEffect(() => {
    if (!isEditing) {
      setEditValue(value || [])
    }
  }, [value, isEditing])

  // Initialize willVerify based on current verification status when entering edit mode
  React.useEffect(() => {
    if (isEditing) {
      setWillVerify(isCurrentlyVerified)
    }
  }, [isEditing, isCurrentlyVerified])

  const handleEdit = () => {
    setIsEditing(true)
    setEditValue(value || [])
    setWillVerify(isCurrentlyVerified)
    setError(null)
  }

  const handleCancel = () => {
    setIsEditing(false)
    setEditValue(value || [])
    setWillVerify(isCurrentlyVerified)
    setError(null)
  }

  const handleSave = async () => {
    // No change check
    const currentValue = value || []
    const verificationChanged = willVerify !== isCurrentlyVerified
    const arraysEqual = currentValue.length === editValue.length && 
      currentValue.every((val, idx) => val === editValue[idx])
    
    if (arraysEqual && !verificationChanged) {
      setIsEditing(false)
      return
    }

    // Save
    setIsSaving(true)
    try {
      await onSave(fieldName, editValue, willVerify)
      setIsEditing(false)
      setError(null)
    } catch (err) {
      setError('Failed to save. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  // Verification indicator component
  const VerificationIndicator = ({ 
    fieldName: fName
  }: { 
    fieldName: string
  }) => {
    const verification = getFieldVerification?.(fName)
    const status = verification || 'unverified'
    
    return (
      <div className="flex items-center gap-1 shrink-0">
        <VerificationBadge 
          status={status}
          size="sm"
        />
      </div>
    )
  }

  const displayItems = value || []
  const shouldTruncate = displayItems.length > maxDisplay
  const displayItemsToShow = shouldTruncate && !isExpanded 
    ? displayItems.slice(0, maxDisplay)
    : displayItems
  const remainingCount = shouldTruncate && !isExpanded 
    ? displayItems.length - maxDisplay
    : 0

  if (isEditing) {
    return (
      <div className={cn("space-y-3 py-3 px-3 rounded-md bg-muted/30 border", className)}>
        <div className="flex items-center justify-between mb-2">
          <Label className="text-sm font-semibold text-muted-foreground">{label}</Label>
        </div>
        <div className="space-y-3">
          <div className="w-full">
            <MultiSelect
              items={options}
              selected={editValue}
              onChange={(values) => setEditValue(values)}
              placeholder={placeholder}
              searchPlaceholder={searchPlaceholder}
              maxDisplay={maxDisplay}
              creatable={creatable}
              createLabel={createLabel}
              onCreateNew={onCreateNew}
            />
          </div>
          
          {/* Mark as verified checkbox */}
          <div className="flex items-center gap-2 pl-1">
            <Checkbox
              id={`verify-${fieldName}`}
              checked={willVerify}
              onCheckedChange={(checked) => setWillVerify(checked as boolean)}
              disabled={isSaving}
              className="h-4 w-4"
            />
            <Label 
              htmlFor={`verify-${fieldName}`}
              className={cn(
                "text-xs cursor-pointer",
                willVerify ? 'text-green-600 dark:text-green-400 font-medium' : 'text-muted-foreground'
              )}
            >
              {willVerify ? '✓ Mark as verified' : 'Mark as verified'}
            </Label>
          </div>
          
          <div className="flex gap-1 shrink-0">
            <Button
              size="sm"
              onClick={handleSave}
              disabled={isSaving}
              className="h-8 w-8 p-0"
              title={willVerify ? "Save & Verify" : "Save"}
            >
              {isSaving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleCancel}
              disabled={isSaving}
              className="h-8 w-8 p-0"
              title="Cancel"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          
          {/* Error Message */}
          {error && (
            <p className="text-xs text-red-500">{error}</p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className={cn("py-2 px-3 rounded-md hover:bg-muted/50 transition-colors", className)}>
      <div className="flex items-center justify-between mb-3">
        <Label className="text-sm font-semibold text-muted-foreground">{label}</Label>
        <div className="flex items-center gap-1 shrink-0">
          <VerificationIndicator fieldName={fieldName} />
          <Button
            size="sm"
            variant="ghost"
            onClick={handleEdit}
            className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            type="button"
            title="Edit field"
          >
            <Pencil className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
      {displayItems.length > 0 ? (
        <div className="flex flex-wrap gap-2 min-h-[2rem]">
          {displayItemsToShow.map((item, index) => (
            <Badge
              key={index}
              variant="secondary"
              className={cn(badgeColorClass, "text-xs")}
            >
              {catalogLabelForValue(item, options)}
            </Badge>
          ))}
          {remainingCount > 0 && !isExpanded && (
            <Badge 
              variant="outline" 
              className="text-xs cursor-pointer hover:bg-accent hover:text-accent-foreground transition-colors"
              onClick={() => setIsExpanded(true)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  setIsExpanded(true)
                }
              }}
            >
              +{remainingCount} more
            </Badge>
          )}
          {isExpanded && shouldTruncate && (
            <Badge 
              variant="outline" 
              className="text-xs cursor-pointer hover:bg-accent hover:text-accent-foreground transition-colors"
              onClick={() => setIsExpanded(false)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  setIsExpanded(false)
                }
              }}
            >
              Show less
            </Badge>
          )}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground italic">No items selected</p>
      )}
    </div>
  )
}

// Date range validation function
const validateDateRange = (
  date: Date | null | undefined, 
  otherDate: Date | null | undefined, 
  fieldName: string
): string | null => {
  if (!date || !otherDate) return null // Allow empty dates
  
  if (fieldName === 'startDate' && otherDate && date > otherDate) {
    return 'Start date must be before end date'
  }
  
  if (fieldName === 'endDate' && otherDate && date < otherDate) {
    return 'End date must be after start date'
  }
  
  return null
}

// Inline Editable Textarea Component for long text fields
interface InlineEditableTextareaProps {
  label: string
  value: string | null | undefined
  fieldName: string
  onSave: (fieldName: string, newValue: string, shouldVerify: boolean) => Promise<void>
  maxLength?: number
  getFieldVerification?: (fieldName: string) => 'verified' | 'unverified' | undefined
  className?: string
  placeholder?: string
}

const InlineEditableTextarea: React.FC<InlineEditableTextareaProps> = ({
  label,
  value,
  fieldName,
  onSave,
  maxLength = 150,
  getFieldVerification,
  className = "",
  placeholder
}) => {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(value || '')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [willVerify, setWillVerify] = useState(true)
  const [isExpanded, setIsExpanded] = useState(false)

  // Get current verification status
  const verificationStatus = getFieldVerification?.(fieldName)
  const isCurrentlyVerified = verificationStatus === 'verified'

  // Update editValue when value prop changes (but not when editing)
  React.useEffect(() => {
    if (!isEditing) {
      setEditValue(value || '')
    }
  }, [value, isEditing])

  // Initialize willVerify based on current verification status when entering edit mode
  React.useEffect(() => {
    if (isEditing) {
      setWillVerify(isCurrentlyVerified)
    }
  }, [isEditing, isCurrentlyVerified])

  const handleEdit = () => {
    setIsEditing(true)
    setEditValue(value || '')
    setWillVerify(isCurrentlyVerified)
    setError(null)
  }

  const handleCancel = () => {
    setIsEditing(false)
    setEditValue(value || '')
    setWillVerify(isCurrentlyVerified)
    setError(null)
  }

  const handleSave = async () => {
    // No change check
    const currentValue = value || ''
    const verificationChanged = willVerify !== isCurrentlyVerified
    if (editValue === currentValue && !verificationChanged) {
      setIsEditing(false)
      return
    }

    // Save
    setIsSaving(true)
    try {
      await onSave(fieldName, editValue, willVerify)
      setIsEditing(false)
      setError(null)
    } catch (err) {
      setError('Failed to save. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Allow Shift+Enter for new lines, but Ctrl/Cmd+Enter to save
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault()
      handleSave()
    } else if (e.key === 'Escape') {
      e.preventDefault()
      handleCancel()
    }
  }

  const displayText = value || ''
  const shouldTruncate = displayText.length > maxLength
  const truncatedText = shouldTruncate && !isExpanded 
    ? `${displayText.slice(0, maxLength)}...` 
    : displayText

  // Verification indicator component
  const VerificationIndicator = ({ 
    fieldName: fName
  }: { 
    fieldName: string
  }) => {
    const verification = getFieldVerification?.(fName)
    const status = verification || 'unverified'
    
    return (
      <div className="flex items-center gap-1 shrink-0">
        <VerificationBadge 
          status={status}
          size="sm"
        />
      </div>
    )
  }

  if (isEditing) {
    return (
      <div className={cn("space-y-2 py-2 px-3 rounded-md", className)}>
        <div className="flex items-center justify-between mb-1">
          <Label className="text-sm font-medium text-muted-foreground">{label}</Label>
        </div>
        <div className="space-y-2">
          <div className="flex items-start gap-2">
            <div className="flex-1 space-y-2">
              <Textarea
                value={editValue}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setEditValue(e.target.value)}
                onKeyDown={handleKeyDown}
                className={cn("min-h-[120px] resize-none text-sm", error && "border-red-500")}
                autoFocus
                disabled={isSaving}
                placeholder={placeholder}
              />
              
              {/* Mark as verified checkbox */}
              <div className="flex items-center gap-2 pl-1">
                <Checkbox
                  id={`verify-${fieldName}`}
                  checked={willVerify}
                  onCheckedChange={(checked) => setWillVerify(checked as boolean)}
                  disabled={isSaving}
                  className="h-4 w-4"
                />
                <Label 
                  htmlFor={`verify-${fieldName}`}
                  className={cn(
                    "text-xs cursor-pointer",
                    willVerify ? 'text-green-600 dark:text-green-400 font-medium' : 'text-muted-foreground'
                  )}
                >
                  {willVerify ? '✓ Verified' : 'Mark as verified'}
                </Label>
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex gap-1 shrink-0">
              <Button
                size="sm"
                onClick={handleSave}
                disabled={isSaving}
                className="h-8 w-8 p-0"
                title={willVerify ? "Save & Verify" : "Save"}
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleCancel}
                disabled={isSaving}
                className="h-8 w-8 p-0"
                title="Cancel"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
          
          {/* Error Message */}
          {error && (
            <p className="text-xs text-red-500">{error}</p>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className={cn("space-y-1 py-2 px-3 rounded-md hover:bg-muted/50 transition-colors", className)}>
      <div className="flex items-center justify-between mb-1">
        <Label className="text-sm font-medium text-muted-foreground">{label}</Label>
        <div className="flex items-center gap-1 shrink-0">
          <VerificationIndicator fieldName={fieldName} />
          <Button
            size="sm"
            variant="ghost"
            onClick={handleEdit}
            className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            type="button"
            title="Edit field"
          >
            <Pencil className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
      {displayText ? (
        <div className="space-y-1">
          <span className="text-sm leading-relaxed whitespace-pre-wrap block">
            {truncatedText}
          </span>
          {shouldTruncate && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-7 px-0 text-xs text-muted-foreground hover:text-foreground"
            >
              {isExpanded ? "Show less" : "Show more"}
            </Button>
          )}
        </div>
      ) : (
        <span className="text-sm text-muted-foreground italic">N/A</span>
      )}
    </div>
  )
}

// Inline Editable Checkbox Component
interface InlineEditableCheckboxProps {
  label: string
  value: boolean
  fieldName: string
  onSave: (fieldName: string, newValue: boolean, verify: boolean) => Promise<void>
  getFieldVerification?: (fieldName: string) => 'verified' | 'unverified' | undefined
  className?: string
  description?: string
}

const InlineEditableCheckbox: React.FC<InlineEditableCheckboxProps> = ({
  label,
  value,
  fieldName,
  onSave,
  getFieldVerification,
  className = "",
  description
}) => {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(value)
  const [isSaving, setIsSaving] = useState(false)
  const [willVerify, setWillVerify] = useState(true)
  
  const verification = getFieldVerification?.(fieldName)
  const isCurrentlyVerified = verification === 'verified'
  
  React.useEffect(() => {
    if (isEditing) {
      setWillVerify(isCurrentlyVerified)
    }
  }, [isEditing, isCurrentlyVerified])
  
  const handleEdit = () => {
    setIsEditing(true)
    setEditValue(value)
    setWillVerify(isCurrentlyVerified)
  }
  
  const handleCancel = () => {
    setIsEditing(false)
    setEditValue(value)
    setWillVerify(isCurrentlyVerified)
  }
  
  const handleSave = async () => {
    const verificationChanged = willVerify !== isCurrentlyVerified
    const valueChanged = editValue !== value
    
    if (!valueChanged && !verificationChanged) {
      setIsEditing(false)
      return
    }
    
    setIsSaving(true)
    try {
      await onSave(fieldName, editValue, willVerify)
      setIsEditing(false)
    } catch (err) {
      setEditValue(value)
      setWillVerify(isCurrentlyVerified)
    } finally {
      setIsSaving(false)
    }
  }
  
  const VerificationIndicator = ({ 
    fieldName: fName
  }: { 
    fieldName: string
  }) => {
    const verificationData = getFieldVerification?.(fName)
    const status = verificationData || 'unverified'
    
    return (
      <div className="flex items-center gap-1 shrink-0">
        <VerificationBadge 
          status={status}
          size="sm"
        />
      </div>
    )
  }
  
  return (
    <div className={cn("space-y-1 py-2 px-3 rounded-md hover:bg-muted/50 transition-colors", className)}>
      <div className="flex items-center justify-between mb-1">
        <Label className="text-sm font-medium text-muted-foreground">{label}</Label>
        {!isEditing && (
          <div className="flex items-center gap-1 shrink-0">
            <VerificationIndicator fieldName={fieldName} />
            <Button
              size="sm"
              variant="ghost"
              onClick={handleEdit}
              className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              type="button"
              title="Edit field"
            >
              <Pencil className="w-3.5 h-3.5" />
            </Button>
          </div>
        )}
      </div>
      
      {isEditing ? (
        <div className="space-y-2">
          <div className="flex items-start gap-2">
            <div className="flex-1 space-y-3">
              {/* Switch for Published App, Checkbox for others */}
              {label === "Published" || label === "Published App" ? (
                <div className="flex items-center gap-2 pl-1">
                  <Switch
                    id={`switch-${fieldName}`}
                    checked={editValue}
                    onCheckedChange={(checked) => setEditValue(checked as boolean)}
                    disabled={isSaving}
                  />
                  <Label 
                    htmlFor={`switch-${fieldName}`}
                    className="text-sm font-medium cursor-pointer"
                  >
                    {label}
                  </Label>
                </div>
              ) : (
                <div className="flex items-center gap-2 pl-1">
                  <Checkbox
                    id={`checkbox-${fieldName}`}
                    checked={editValue}
                    onCheckedChange={(checked) => setEditValue(checked as boolean)}
                    disabled={isSaving}
                    className="h-4 w-4"
                  />
                  <Label 
                    htmlFor={`checkbox-${fieldName}`}
                    className="text-sm font-medium cursor-pointer"
                  >
                    {label}
                  </Label>
                </div>
              )}
              
              {description && (
                <p className="text-xs text-muted-foreground pl-6 -mt-1">{description}</p>
              )}
              
              {/* Mark as verified checkbox */}
              <div className="flex items-center gap-2 pl-1">
                <Checkbox
                  id={`verify-${fieldName}`}
                  checked={willVerify}
                  onCheckedChange={(checked) => setWillVerify(checked as boolean)}
                  disabled={isSaving}
                  className="h-4 w-4"
                />
                <Label 
                  htmlFor={`verify-${fieldName}`}
                  className={cn(
                    "text-xs cursor-pointer",
                    willVerify ? 'text-green-600 dark:text-green-400 font-medium' : 'text-muted-foreground'
                  )}
                >
                  {willVerify ? '✓ Verified' : 'Mark as verified'}
                </Label>
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex gap-1 shrink-0">
              <Button
                size="sm"
                onClick={handleSave}
                disabled={isSaving}
                className="h-8 w-8 p-0"
                title={willVerify ? "Save & Verify" : "Save"}
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleCancel}
                disabled={isSaving}
                className="h-8 w-8 p-0"
                title="Cancel"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {label === "Published" || label === "Published App" ? (
              <>
                <Switch
                  checked={value}
                  disabled
                  className="opacity-50"
                />
                <span className={cn(
                  "text-sm",
                  value ? "font-medium" : "text-muted-foreground"
                )}>
                  {value ? 'Yes' : 'No'}
                </span>
              </>
            ) : (
              <>
                <Checkbox
                  checked={value}
                  disabled
                  className="h-4 w-4 opacity-50"
                />
                <span className={cn(
                  "text-sm",
                  value ? "font-medium" : "text-muted-foreground"
                )}>
                  {value ? 'Yes' : 'No'}
                </span>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// Inline Editable Combobox Component (similar to checkbox style)
interface InlineEditableComboboxProps {
  label: string
  value: string
  fieldName: string
  options: { value: string; label: string }[]
  onSave: (fieldName: string, newValue: string, verify: boolean) => Promise<void>
  getFieldVerification?: (fieldName: string) => 'verified' | 'unverified' | undefined
  placeholder?: string
  className?: string
}

const InlineEditableCombobox: React.FC<InlineEditableComboboxProps> = ({
  label,
  value,
  fieldName,
  options,
  onSave,
  getFieldVerification,
  placeholder = "Select option...",
  className = ""
}) => {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(value || '')
  const [isSaving, setIsSaving] = useState(false)
  const [willVerify, setWillVerify] = useState(true)
  const [open, setOpen] = useState(false)
  
  const verification = getFieldVerification?.(fieldName)
  const isCurrentlyVerified = verification === 'verified'
  
  React.useEffect(() => {
    if (isEditing) {
      setWillVerify(isCurrentlyVerified)
    }
  }, [isEditing, isCurrentlyVerified])
  
  const handleEdit = () => {
    setIsEditing(true)
    setEditValue(value || '')
    setWillVerify(isCurrentlyVerified)
  }
  
  const handleCancel = () => {
    setIsEditing(false)
    setEditValue(value || '')
    setWillVerify(isCurrentlyVerified)
    setOpen(false)
  }
  
  const handleSave = async () => {
    const verificationChanged = willVerify !== isCurrentlyVerified
    const valueChanged = editValue !== value
    
    if (!valueChanged && !verificationChanged) {
      setIsEditing(false)
      return
    }
    
    setIsSaving(true)
    try {
      await onSave(fieldName, editValue, willVerify)
      setIsEditing(false)
    } catch (err) {
      setEditValue(value || '')
      setWillVerify(isCurrentlyVerified)
    } finally {
      setIsSaving(false)
    }
  }
  
  const VerificationIndicator = ({ 
    fieldName: fName
  }: { 
    fieldName: string
  }) => {
    const verificationData = getFieldVerification?.(fName)
    const status = verificationData || 'unverified'
    
    return (
      <div className="flex items-center gap-1 shrink-0">
        <VerificationBadge 
          status={status}
          size="sm"
        />
      </div>
    )
  }
  
  const displayValue = value 
    ? (options.find(opt => opt.value === value)?.label || value)
    : 'N/A'
  
  return (
    <div className={cn("space-y-1 py-2 px-3 rounded-md hover:bg-muted/50 transition-colors", className)}>
      <div className="flex items-center justify-between mb-1">
        <Label className="text-sm font-medium text-muted-foreground">{label}</Label>
        {!isEditing && (
          <div className="flex items-center gap-1 shrink-0">
            <VerificationIndicator fieldName={fieldName} />
            <Button
              size="sm"
              variant="ghost"
              onClick={handleEdit}
              className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              type="button"
              title="Edit field"
            >
              <Pencil className="w-3.5 h-3.5" />
            </Button>
          </div>
        )}
      </div>
      
      {isEditing ? (
        <div className="space-y-2">
          <div className="flex items-start gap-2">
            <div className="flex-1 space-y-3">
              <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className="w-full justify-between text-sm"
                    disabled={isSaving}
                  >
                    {editValue
                      ? options.find((option) => option.value === editValue)?.label
                      : placeholder}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                  <Command>
                    <CommandInput placeholder={`Search ${label.toLowerCase()}...`} className="h-9" />
                    <CommandList>
                      <CommandEmpty>No option found.</CommandEmpty>
                      <CommandGroup>
                        {options.map((option) => (
                          <CommandItem
                            key={option.value}
                            value={option.value}
                            onSelect={(currentValue) => {
                              setEditValue(currentValue === editValue ? "" : currentValue)
                              setOpen(false)
                            }}
                            className="cursor-pointer"
                          >
                            {option.label}
                            <Check
                              className={cn(
                                "ml-auto h-4 w-4",
                                editValue === option.value ? "opacity-100" : "opacity-0"
                              )}
                            />
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              
              {/* Mark as verified checkbox */}
              <div className="flex items-center gap-2 pl-1">
                <Checkbox
                  id={`verify-${fieldName}`}
                  checked={willVerify}
                  onCheckedChange={(checked) => setWillVerify(checked as boolean)}
                  disabled={isSaving}
                  className="h-4 w-4"
                />
                <Label 
                  htmlFor={`verify-${fieldName}`}
                  className={cn(
                    "text-xs cursor-pointer",
                    willVerify ? 'text-green-600 dark:text-green-400 font-medium' : 'text-muted-foreground'
                  )}
                >
                  {willVerify ? '✓ Verified' : 'Mark as verified'}
                </Label>
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex gap-1 shrink-0">
              <Button
                size="sm"
                onClick={handleSave}
                disabled={isSaving}
                className="h-8 w-8 p-0"
                title={willVerify ? "Save & Verify" : "Save"}
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleCancel}
                disabled={isSaving}
                className="h-8 w-8 p-0"
                title="Cancel"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <span className="text-sm">{displayValue}</span>
        </div>
      )}
    </div>
  )
}

// Inline Editable Select Component (Select dropdown like Create Project dialog)
interface InlineEditableSelectProps {
  label: string
  value: string
  fieldName: string
  options: { value: string; label: string }[]
  onSave: (fieldName: string, newValue: string, verify: boolean) => Promise<void>
  getFieldVerification?: (fieldName: string) => 'verified' | 'unverified' | undefined
  placeholder?: string
  className?: string
}

const InlineEditableSelect: React.FC<InlineEditableSelectProps> = ({
  label,
  value,
  fieldName,
  options,
  onSave,
  getFieldVerification,
  placeholder = "Select option...",
  className = ""
}) => {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(value || '')
  const [isSaving, setIsSaving] = useState(false)
  const [willVerify, setWillVerify] = useState(true)

  const verification = getFieldVerification?.(fieldName)
  const isCurrentlyVerified = verification === 'verified'

  React.useEffect(() => {
    if (!isEditing) setEditValue(value || '')
  }, [value, isEditing])

  React.useEffect(() => {
    if (isEditing) setWillVerify(isCurrentlyVerified)
  }, [isEditing, isCurrentlyVerified])

  const handleEdit = () => {
    setIsEditing(true)
    setEditValue(value || '')
    setWillVerify(isCurrentlyVerified)
  }

  const handleCancel = () => {
    setIsEditing(false)
    setEditValue(value || '')
    setWillVerify(isCurrentlyVerified)
  }

  const handleSave = async () => {
    const verificationChanged = willVerify !== isCurrentlyVerified
    const valueChanged = editValue !== value
    if (!valueChanged && !verificationChanged) {
      setIsEditing(false)
      return
    }
    setIsSaving(true)
    try {
      await onSave(fieldName, editValue, willVerify)
      setIsEditing(false)
    } catch (err) {
      setEditValue(value || '')
      setWillVerify(isCurrentlyVerified)
    } finally {
      setIsSaving(false)
    }
  }

  const VerificationIndicator = ({ fieldName: fName }: { fieldName: string }) => {
    const status = getFieldVerification?.(fName) || 'unverified'
    return (
      <div className="flex items-center gap-1 shrink-0">
        <VerificationBadge status={status} size="sm" />
      </div>
    )
  }

  const displayValue = value ? (options.find(opt => opt.value === value)?.label || value) : 'N/A'

  return (
    <div className={cn("space-y-1 py-2 px-3 rounded-md hover:bg-muted/50 transition-colors", className)}>
      <div className="flex items-center justify-between mb-1">
        <Label className="text-sm font-medium text-muted-foreground">{label}</Label>
        {!isEditing && (
          <div className="flex items-center gap-1 shrink-0">
            <VerificationIndicator fieldName={fieldName} />
            <Button
              size="sm"
              variant="ghost"
              onClick={handleEdit}
              className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              type="button"
              title="Edit field"
            >
              <Pencil className="w-3.5 h-3.5" />
            </Button>
          </div>
        )}
      </div>
      {isEditing ? (
        <div className="space-y-2">
          <div className="flex items-start gap-2">
            <div className="flex-1 space-y-3">
              <Select value={editValue || undefined} onValueChange={setEditValue} disabled={isSaving}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={placeholder} />
                </SelectTrigger>
                <SelectContent>
                  {options.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex items-center gap-2 pl-1">
                <Checkbox
                  id={`verify-select-${fieldName}`}
                  checked={willVerify}
                  onCheckedChange={(c) => setWillVerify(c as boolean)}
                  disabled={isSaving}
                  className="h-4 w-4"
                />
                <Label htmlFor={`verify-select-${fieldName}`} className={cn("text-xs cursor-pointer", willVerify ? 'text-green-600 dark:text-green-400 font-medium' : 'text-muted-foreground')}>
                  {willVerify ? '✓ Verified' : 'Mark as verified'}
                </Label>
              </div>
            </div>
            <div className="flex gap-1 shrink-0">
              <Button size="sm" onClick={handleSave} disabled={isSaving} className="h-8 w-8 p-0" title={willVerify ? "Save & Verify" : "Save"}>
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              </Button>
              <Button size="sm" variant="ghost" onClick={handleCancel} disabled={isSaving} className="h-8 w-8 p-0" title="Cancel">
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <span className="text-sm">{displayValue}</span>
        </div>
      )}
    </div>
  )
}

// Inline editable employer (server-driven combobox, same as ProjectCreationDialog)
interface InlineEditableEmployerFieldProps {
  selectedEmployer: SelectedEmployer
  displayNameFallback?: string | null
  onSave: (employer: SelectedEmployer, verify: boolean) => Promise<void>
  getFieldVerification?: (fieldName: string) => "verified" | "unverified" | undefined
  preloadEmployerId?: number
}

const InlineEditableEmployerField: React.FC<InlineEditableEmployerFieldProps> = ({
  selectedEmployer,
  displayNameFallback,
  onSave,
  getFieldVerification,
  preloadEmployerId,
}) => {
  const fieldName = "selectedEmployer"
  const [isEditing, setIsEditing] = useState(false)
  const [editEmployer, setEditEmployer] = useState<SelectedEmployer>(selectedEmployer)
  const [isSaving, setIsSaving] = useState(false)
  const [willVerify, setWillVerify] = useState(true)
  const [employerComboboxOpen, setEmployerComboboxOpen] = useState(false)
  const [employerSearchQuery, setEmployerSearchQuery] = useState("")
  const [employerSearchResults, setEmployerSearchResults] = useState<EmployerLookupDto[]>([])
  const [employerSearchLoading, setEmployerSearchLoading] = useState(false)
  const [addEmployerDialogOpen, setAddEmployerDialogOpen] = useState(false)
  const [awardsLookup, setAwardsLookup] = useState<LookupItem[]>([])
  const employerDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const employerAbortRef = useRef<AbortController | null>(null)

  const verificationStatus = getFieldVerification?.(fieldName)
  const isCurrentlyVerified = verificationStatus === "verified"

  useEffect(() => {
    if (!addEmployerDialogOpen) return
    let cancelled = false
    fetchAwards()
      .then((awards) => {
        if (!cancelled) setAwardsLookup(awards)
      })
      .catch(() => {
        if (!cancelled) setAwardsLookup([])
      })
    return () => {
      cancelled = true
    }
  }, [addEmployerDialogOpen])

  const handleCreateAward = React.useCallback(async (name: string) => {
    try {
      const created = await createAward(name)
      setAwardsLookup((prev) => [
        ...prev.filter((l) => l.id !== created.id && l.name !== created.name),
        created,
      ])
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to add award")
      throw e
    }
  }, [])

  useEffect(() => {
    if (!isEditing) {
      setEditEmployer(selectedEmployer)
    }
  }, [selectedEmployer, isEditing])

  useEffect(() => {
    if (isEditing) {
      setWillVerify(isCurrentlyVerified)
    }
  }, [isEditing, isCurrentlyVerified])

  useEffect(() => {
    if (!isEditing || !preloadEmployerId || editEmployer) return
    fetchEmployerById(preloadEmployerId)
      .then((emp) => setEditEmployer({ id: emp.id, name: emp.name }))
      .catch(() => {
        // Keep fallback display name if fetch fails
      })
  }, [isEditing, preloadEmployerId, editEmployer])

  useEffect(() => {
    if (!isEditing) return
    if (employerDebounceRef.current) {
      clearTimeout(employerDebounceRef.current)
      employerDebounceRef.current = null
    }
    if (employerSearchQuery.trim().length < 2) {
      if (employerAbortRef.current) {
        employerAbortRef.current.abort()
        employerAbortRef.current = null
      }
      setEmployerSearchResults([])
      setEmployerSearchLoading(false)
      return
    }
    employerDebounceRef.current = setTimeout(() => {
      employerDebounceRef.current = null
      if (employerAbortRef.current) {
        employerAbortRef.current.abort()
      }
      const controller = new AbortController()
      employerAbortRef.current = controller
      setEmployerSearchLoading(true)
      const query = employerSearchQuery.trim()
      searchEmployers(query, 10, controller.signal)
        .then((list) => {
          if (employerAbortRef.current !== controller) return
          setEmployerSearchResults(list)
        })
        .catch((err: unknown) => {
          if (err instanceof Error && err.name === "AbortError") return
          setEmployerSearchResults([])
        })
        .finally(() => {
          if (employerAbortRef.current === controller) {
            setEmployerSearchLoading(false)
          }
        })
    }, 300)
    return () => {
      if (employerDebounceRef.current) {
        clearTimeout(employerDebounceRef.current)
      }
      if (employerAbortRef.current) {
        employerAbortRef.current.abort()
      }
    }
  }, [employerSearchQuery, isEditing])

  const handleEdit = () => {
    setIsEditing(true)
    setEditEmployer(selectedEmployer)
    setWillVerify(isCurrentlyVerified)
    setEmployerSearchQuery("")
    setEmployerSearchResults([])
  }

  const handleCancel = () => {
    setIsEditing(false)
    setEditEmployer(selectedEmployer)
    setWillVerify(isCurrentlyVerified)
    setEmployerComboboxOpen(false)
    setEmployerSearchQuery("")
    setEmployerSearchResults([])
  }

  const handleSave = async () => {
    const employerChanged =
      (editEmployer?.id ?? null) !== (selectedEmployer?.id ?? null) ||
      (editEmployer?.name ?? "") !== (selectedEmployer?.name ?? "")
    const verificationChanged = willVerify !== isCurrentlyVerified
    if (!employerChanged && !verificationChanged) {
      setIsEditing(false)
      return
    }
    setIsSaving(true)
    try {
      await onSave(editEmployer, willVerify)
      setIsEditing(false)
      setEmployerComboboxOpen(false)
      setEmployerSearchQuery("")
      setEmployerSearchResults([])
    } finally {
      setIsSaving(false)
    }
  }

  const displayName = selectedEmployer?.name ?? displayNameFallback
  const isEmpty = !displayName?.trim()

  return (
    <div className="min-w-0 space-y-1 py-2 px-3 rounded-md hover:bg-muted/50 transition-colors">
      <div className="flex items-center justify-between mb-1 gap-2">
        <Label className="text-sm font-medium text-muted-foreground">Employer</Label>
        {!isEditing && (
          <div className="flex items-center gap-1 shrink-0">
            <VerificationBadge status={verificationStatus || "unverified"} size="sm" />
            <Button
              size="sm"
              variant="ghost"
              onClick={handleEdit}
              className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              type="button"
              title="Edit field"
            >
              <Pencil className="w-3.5 h-3.5" />
            </Button>
          </div>
        )}
      </div>
      {isEditing ? (
        <div className="min-w-0 space-y-2">
          {editEmployer ? (
            <div className="flex items-center gap-1 border rounded-md bg-background px-3 py-2 min-h-9">
              <span className="flex-1 truncate text-sm">{editEmployer.name}</span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0"
                disabled={isSaving}
                onClick={() => {
                  setEditEmployer(null)
                  setEmployerSearchQuery("")
                  setEmployerSearchResults([])
                }}
                aria-label="Clear employer"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <Popover
              open={employerComboboxOpen}
              onOpenChange={(open) => {
                setEmployerComboboxOpen(open)
                if (!open) {
                  setEmployerSearchQuery("")
                  setEmployerSearchResults([])
                }
              }}
            >
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  className="w-full min-w-0 justify-between font-normal"
                  disabled={isSaving}
                >
                  <span className={employerSearchQuery ? "text-foreground" : "text-muted-foreground"}>
                    {employerSearchQuery || "Search employers..."}
                  </span>
                  <ChevronsUpDown className="opacity-50 shrink-0" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                <Command shouldFilter={false}>
                  <CommandInput
                    placeholder="Search employers..."
                    value={employerSearchQuery}
                    onValueChange={setEmployerSearchQuery}
                    className="h-9"
                  />
                  <CommandList>
                    {employerSearchLoading && (
                      <div className="py-6 text-center text-sm text-muted-foreground">Searching...</div>
                    )}
                    {!employerSearchLoading && employerSearchQuery.trim().length < 2 && (
                      <div className="py-6 text-center text-sm text-muted-foreground">Type to search</div>
                    )}
                    {!employerSearchLoading &&
                      employerSearchQuery.trim().length >= 2 &&
                      employerSearchResults.length === 0 && (
                        <CommandGroup>
                          <div className="py-2 px-2 text-center text-sm text-muted-foreground">No employers found</div>
                          <CommandItem
                            value="__add_new_employer__"
                            onSelect={() => {
                              setEmployerComboboxOpen(false)
                              setAddEmployerDialogOpen(true)
                            }}
                            className="cursor-pointer font-medium text-primary"
                          >
                            <Plus className="mr-2 h-4 w-4" />
                            Add New Employer
                          </CommandItem>
                        </CommandGroup>
                      )}
                    {!employerSearchLoading && employerSearchResults.length > 0 && (
                      <CommandGroup>
                        {employerSearchResults.map((emp) => (
                          <CommandItem
                            key={emp.id}
                            value={String(emp.id)}
                            onSelect={() => {
                              setEditEmployer({ id: emp.id, name: emp.name })
                              setEmployerComboboxOpen(false)
                              setEmployerSearchQuery("")
                              setEmployerSearchResults([])
                            }}
                            className="cursor-pointer"
                          >
                            {emp.name}
                            <Check className="ml-auto opacity-100" />
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    )}
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          )}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 pl-1 min-w-0">
              <Checkbox
                id="verify-selectedEmployer"
                checked={willVerify}
                onCheckedChange={(c) => setWillVerify(c as boolean)}
                disabled={isSaving}
                className="h-4 w-4 shrink-0"
              />
              <Label
                htmlFor="verify-selectedEmployer"
                className={cn(
                  "text-xs cursor-pointer truncate",
                  willVerify ? "text-green-600 dark:text-green-400 font-medium" : "text-muted-foreground"
                )}
              >
                {willVerify ? "✓ Verified" : "Mark as verified"}
              </Label>
            </div>
            <div className="flex gap-1 shrink-0">
              <Button size="sm" onClick={handleSave} disabled={isSaving} className="h-8 w-8 p-0">
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              </Button>
              <Button size="sm" variant="ghost" onClick={handleCancel} disabled={isSaving} className="h-8 w-8 p-0">
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <span className={cn("text-sm block", isEmpty && "text-muted-foreground italic")}>
          {isEmpty ? "Not Linked" : displayName}
        </span>
      )}

      <EmployerCreationDialog
        mode="create"
        open={addEmployerDialogOpen}
        onOpenChange={setAddEmployerDialogOpen}
        initialName={employerSearchQuery}
        lookups={{ awards: awardsLookup }}
        onCreateAward={handleCreateAward}
        onSubmit={async (formData) => {
          const dto = buildCreateEmployerDto(formData, {
            timeSupportZonesLookup: [],
            awardsLookup,
          })
          const created = await createEmployer(dto)
          return created ? { id: created.id, name: created.name } : undefined
        }}
        onSuccess={(employer) => {
          setEditEmployer(employer)
          setAddEmployerDialogOpen(false)
          setEmployerSearchQuery("")
          setEmployerSearchResults([])
          setEmployerComboboxOpen(false)
        }}
      />
    </div>
  )
}

// Project Detail Dialog Component
interface ProjectDetailDialogProps {
  project: Project
  open: boolean
  onOpenChange: (open: boolean) => void
  /** After the project loads, scroll the Modules section into view. */
  focusModules?: boolean
  onVerify?: (project: Project) => void
  technicalDomainOptions: MultiSelectOption[]
  lookups?: ProjectLookups
  onCreateTechStack?: (name: string, context?: { aspectTypeId: number }) => Promise<void>
  onCreateTechnicalAspect?: (name: string) => Promise<void>
  onCreateClientLocation?: (name: string) => Promise<LookupItem | void>
}

export function ProjectDetailDialog({
  project,
  open,
  onOpenChange,
  focusModules = false,
  onVerify,
  technicalDomainOptions: technicalDomainOptionsForDetail,
  lookups,
  onCreateTechStack,
  onCreateClientLocation,
}: ProjectDetailDialogProps) {
  const [localProject, setLocalProject] = useState<ProjectDetail>({
    ...project,
    createdBy: null,
    updatedBy: null,
    modules: [],
  })
  const [detailLoading, setDetailLoading] = useState(false)
  const modulesSectionRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open || !project?.id) {
      setDetailLoading(false)
      return
    }

    setLocalProject({
      ...project,
      createdBy: null,
      updatedBy: null,
      modules: [],
    })

    let cancelled = false
    setDetailLoading(true)

    fetchProjectById(Number(project.id))
      .then((dto) => {
        if (!cancelled) setLocalProject(projectDtoToProject(dto))
      })
      .catch((err) => {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : String(err)
          if (message === "Not found") {
            toast.error("Project not found.")
          } else {
            toast.error(message || "Failed to load project details.")
          }
        }
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [open, project])

  useEffect(() => {
    if (!open || detailLoading || !focusModules) return
    modulesSectionRef.current?.scrollIntoView({ block: "start" })
  }, [open, detailLoading, focusModules, localProject.id])

  const techStackOptions = useMemo<MultiSelectOption[]>(
    () => buildTechStackMultiSelectOptions(lookups?.techStacks ?? []),
    [lookups?.techStacks],
  )

  const clientLocationOptions = useMemo<MultiSelectOption[]>(
    () => lookups?.clientLocations?.map((l) => ({ value: l.name, label: l.name })) ?? [],
    [lookups?.clientLocations]
  )

  const verticalDomainOptions = lookups?.verticalDomains ?? []
  const horizontalDomainOptions = lookups?.horizontalDomains ?? []
  // const technicalAspectCatalogOptions = lookups?.technicalAspects?.length
  //   ? catalogToSelectOptions(lookups.technicalAspects)
  //   : []

  const technicalDomainOptionsResolved = useMemo(
    () => lookups?.technicalDomains ?? technicalDomainOptionsForDetail,
    [lookups?.technicalDomains, technicalDomainOptionsForDetail]
  )

  const selectedEmployer: SelectedEmployer = useMemo(() => {
    if (localProject.employerId != null && localProject.employerName?.trim()) {
      return { id: localProject.employerId, name: localProject.employerName.trim() }
    }
    return null
  }, [localProject.employerId, localProject.employerName])
  
  // Get verification data for this project
  const verifications = useMemo(() => 
    getVerificationsForProject(localProject.id),
    [localProject.id]
  )
  
  const verificationSummary = useMemo(() => 
    calculateProjectVerificationSummary(localProject.id),
    [localProject.id]
  )

  // Helper to get verification status for a field
  const getFieldVerification = (fieldName: string): 'verified' | 'unverified' | undefined => {
    const verification = verifications.find(v => v.fieldName === fieldName)
    return verification?.status as 'verified' | 'unverified' | undefined
  }
  
  // Helper to get audit history for a field
  const getFieldHistory = (fieldName: string) => {
    const verification = verifications.find(v => v.fieldName === fieldName)
    if (!verification) return []
    return getProjectAuditLogsForVerification(verification.id)
  }
  
  // Get user name from ID
  const getVerifiedByName = (userId: string | undefined) => {
    if (!userId) return undefined
    const user = sampleVerificationUsers.find(u => u.id === userId)
    return user?.name
  }

  // Handle field save
  const handleFieldSave = async (fieldName: string, newValue: string | number | Date | string[] | boolean | null | undefined, verify: boolean = false) => {
    try {
      let processedValue: string | number | Date | string[] | boolean | null | undefined = newValue
      if (fieldName === 'downloadCount' && typeof newValue === 'string') {
        processedValue = newValue.trim() === '' ? undefined : parseInt(newValue, 10)
      }
      if (fieldName === 'averageTeamSize') {
        processedValue = typeof newValue === 'string'
          ? (newValue.trim() === '' ? null : parseInt(newValue, 10))
          : newValue
      }

      // Optimistic update; when average team size changes, also update teamSize display
      setLocalProject(prev => {
        const next = { ...prev, [fieldName]: processedValue }
        if (fieldName === 'averageTeamSize') {
          const average = processedValue as number | null
          next.teamSize = average != null ? String(average) : null
        }
        return next
      })
      
      // TODO: Wire inline save to PUT /api/projects/{id} via buildUpdateProjectDto when API inline saves are enabled.
      
      toast.success(`${fieldName} updated${verify ? ' and verified' : ''}`)
    } catch (error) {
      // Revert on error
      setLocalProject((prev) => ({
        ...project,
        createdBy: prev.createdBy,
        updatedBy: prev.updatedBy,
        modules: prev.modules,
      }))
      toast.error('Failed to save field')
      throw error
    }
  }
  
  // Handle date field save (wrapper for type safety)
  const handleDateFieldSave = async (fieldName: string, newValue: Date | null | undefined, verify: boolean) => {
    await handleFieldSave(fieldName, newValue, verify)
  }
  
  // Handle multi-select field save (wrapper for type safety)
  const handleMultiSelectFieldSave = async (fieldName: string, newValue: string[], verify: boolean) => {
    await handleFieldSave(fieldName, newValue, verify)
  }

  const handleEmployerSave = async (employer: SelectedEmployer, verify: boolean) => {
    try {
      setLocalProject((prev) => ({
        ...prev,
        employerId: employer?.id,
        employerName: employer?.name ?? null,
      }))
      // TODO: Wire inline save to PUT /api/projects/{id} via buildUpdateProjectDto when API inline saves are enabled.
      toast.success(`Employer updated${verify ? " and verified" : ""}`)
    } catch (error) {
      setLocalProject((prev) => ({
        ...project,
        createdBy: prev.createdBy,
        updatedBy: prev.updatedBy,
        modules: prev.modules,
      }))
      toast.error("Failed to save field")
      throw error
    }
  }

  // Verification indicator component - shows badge and history together
  const VerificationIndicator = ({ 
    fieldName: fName, 
    className = "",
    getFieldVerification: getVerification
  }: { 
    fieldName: string
    className?: string
    getFieldVerification?: (fieldName: string) => 'verified' | 'unverified' | undefined
  }) => {
    const verification = verifications.find(v => v.fieldName === fName)
    const history = getFieldHistory(fName)
    
    // If no verification data exists, show unverified badge
    const status = verification?.status || 'unverified'
    
    return (
      <div className={`flex items-center gap-1 shrink-0 ${className}`}>
        <VerificationBadge 
          status={status}
          source={verification?.source}
          verifiedBy={getVerifiedByName(verification?.verifiedBy)}
          verifiedAt={verification?.verifiedAt}
          size="sm"
        />
        {history.length > 0 && (
          <FieldHistoryPopover 
            fieldName={fName}
            history={history}
          />
        )}
      </div>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] lg:max-w-[800px] max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border">
          <div className="flex items-start justify-between">
            <DialogTitle className="flex items-center gap-2 text-xl">
              <TagIcon className="h-5 w-5 text-blue-600" />
              {localProject.projectName}
            </DialogTitle>
            <div className="flex gap-2 mr-8">
              {onVerify && (
                <Button 
                  variant="default" 
                  size="sm" 
                  onClick={() => onVerify(localProject)}
                  className="gap-1.5"
                >
                  Edit & Verify
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden px-6 py-6 space-y-6">
          {detailLoading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading project details…
            </div>
          ) : (
          <>
          {/* Verification Summary Bar */}
          {verificationSummary && verificationSummary.totalFields > 0 && (
            <div className="flex items-center gap-4 p-4 bg-muted/30 rounded-lg border">
              <ShieldCheck className="size-5 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-medium">Data Verification</span>
                  <Badge variant={verificationSummary.verificationPercentage === 100 ? 'default' : 'secondary'}>
                    {verificationSummary.verificationPercentage}% Verified
                  </Badge>
                </div>
                <Progress value={verificationSummary.verificationPercentage} className="h-2" />
                <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                  <span>{verificationSummary.verifiedFields} verified</span>
                  <span>{verificationSummary.unverifiedFields} unverified</span>
                </div>
              </div>
            </div>
          )}

          {/* Project Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="min-w-0 space-y-1">
              <InlineEditField
                label="Project Name"
                value={localProject.projectName ?? ""}
                fieldName="projectName"
                fieldType="text"
                validation={(value) => (!value?.trim() ? "Project name is required" : null)}
                onSave={handleFieldSave}
                placeholder="Project name"
                getFieldVerification={getFieldVerification}
              />

              <InlineEditableEmployerField
                selectedEmployer={selectedEmployer}
                displayNameFallback={localProject.employerName}
                preloadEmployerId={localProject.employerId}
                onSave={handleEmployerSave}
                getFieldVerification={getFieldVerification}
              />

              <InlineEditableMultiSelect
                label="Client Locations"
                value={localProject.clientLocations ?? []}
                fieldName="clientLocations"
                options={clientLocationOptions}
                onSave={handleMultiSelectFieldSave}
                getFieldVerification={getFieldVerification}
                placeholder="Select client locations..."
                searchPlaceholder="Search locations..."
                badgeColorClass="bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200"
                maxDisplay={4}
                creatable={!!onCreateClientLocation}
                createLabel="Add Client Location"
                onCreateNew={onCreateClientLocation}
              />
              
              <InlineEditableSelect
                label="Project Type"
                value={localProject.projectType ?? ""}
                fieldName="projectType"
                options={projectTypeOptions}
                onSave={handleFieldSave}
                getFieldVerification={getFieldVerification}
                placeholder="Select project type..."
              />
              </div>

            <div className="min-w-0 space-y-1">
              <InlineEditDateField
                label="Start Date"
                value={localProject.startDate}
                fieldName="startDate"
                onSave={handleDateFieldSave}
                placeholder="Select start date"
                getFieldVerification={getFieldVerification}
                otherDate={localProject.endDate}
                otherDateFieldName="endDate"
                validateDateRange={validateDateRange}
              />
              
              <InlineEditDateField
                label="End Date"
                value={localProject.endDate}
                fieldName="endDate"
                onSave={handleDateFieldSave}
                placeholder="Select end date"
                getFieldVerification={getFieldVerification}
                otherDate={localProject.startDate}
                otherDateFieldName="startDate"
                validateDateRange={validateDateRange}
              />
              
              <div className="min-w-0 space-y-2">
                <InlineEditField
                  label="Project Link"
                  value={localProject.projectLink || ""}
                  fieldName="projectLink"
                  fieldType="url"
                  validation={validateURL}
                  onSave={handleFieldSave}
                  placeholder="https://example.com"
                  getFieldVerification={getFieldVerification}
                />
                {localProject.projectLink && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => localProject.projectLink && window.open(localProject.projectLink, '_blank')}
                    className="h-7 text-xs"
                  >
                    <ExternalLinkIcon className="h-3 w-3 mr-1" />
                    Visit Project
                  </Button>
                )}
              </div>

              <InlineEditableCheckbox
                label="Published"
                value={localProject.isPublished || false}
                fieldName="isPublished"
                onSave={handleFieldSave}
                getFieldVerification={getFieldVerification}
              />
            </div>

            <InlineEditField
              label="Average Team Size"
              value={localProject.averageTeamSize != null ? String(localProject.averageTeamSize) : ""}
              fieldName="averageTeamSize"
              fieldType="number"
              onSave={handleFieldSave}
              placeholder="e.g., 15"
              getFieldVerification={getFieldVerification}
            />

            <InlineEditableSelect
              label="Status"
              value={localProject.status ?? ""}
              fieldName="status"
              options={statusOptions}
              onSave={handleFieldSave}
              getFieldVerification={getFieldVerification}
              placeholder="Select status..."
            />

            <InlineEditableMultiSelect
              label="Publish Platforms"
              value={localProject.publishPlatforms || []}
              fieldName="publishPlatforms"
              options={publishPlatformOptions}
              onSave={handleMultiSelectFieldSave}
              getFieldVerification={getFieldVerification}
              placeholder="Select platforms"
              searchPlaceholder="Search platforms..."
              badgeColorClass="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
              maxDisplay={4}
            />

            <InlineEditableMultiSelect
              label="Technology Stack"
              value={localProject.techStacks || []}
              fieldName="techStacks"
              options={techStackOptions}
              onSave={handleMultiSelectFieldSave}
              getFieldVerification={getFieldVerification}
              placeholder="Select technologies..."
              searchPlaceholder="Search technologies..."
              badgeColorClass="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
              maxDisplay={4}
              creatable={!!onCreateTechStack}
              createLabel="Add Technology"
              onCreateNew={onCreateTechStack ? (name) => onCreateTechStack(name) : undefined}
            />

              <InlineEditField
                label="Download Count"
                value={localProject.downloadCount ? localProject.downloadCount.toString() : ""}
                fieldName="downloadCount"
                fieldType="number"
                validation={(value) => {
                  if (!value.trim()) return null // Optional field
                  const num = parseInt(value)
                  if (isNaN(num) || num < 0) {
                    return "Download count must be a positive number"
                  }
                  return null
                }}
                onSave={handleFieldSave}
                placeholder="e.g., 100000"
                getFieldVerification={getFieldVerification}
              />
            <EntityAuditFields
              createdBy={localProject.createdBy}
              updatedBy={localProject.updatedBy}
            />
          </div>

          {/* Domains */}
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InlineEditableMultiSelect
                  label="Vertical Domains"
                  value={localProject.verticalDomains || []}
                  fieldName="verticalDomains"
                  options={verticalDomainOptions}
                  onSave={handleMultiSelectFieldSave}
                  getFieldVerification={getFieldVerification}
                  placeholder="Select vertical domains..."
                  searchPlaceholder="Search vertical domains..."
                  badgeColorClass="bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200"
                  maxDisplay={4}
                />

                <InlineEditableMultiSelect
                  label="Horizontal Domains"
                  value={localProject.horizontalDomains || []}
                  fieldName="horizontalDomains"
                  options={horizontalDomainOptions}
                  onSave={handleMultiSelectFieldSave}
                  getFieldVerification={getFieldVerification}
                  placeholder="Select horizontal domains..."
                  searchPlaceholder="Search horizontal domains..."
                  badgeColorClass="bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
                  maxDisplay={4}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InlineEditableMultiSelect
                label="Technical Domains"
                value={localProject.technicalDomains || []}
                fieldName="technicalDomains"
                  options={technicalDomainOptionsResolved}
                onSave={handleMultiSelectFieldSave}
                getFieldVerification={getFieldVerification}
                placeholder="Select technical domains..."
                searchPlaceholder="Search technical domains..."
                badgeColorClass="bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200"
                maxDisplay={4}
              />

                {/*
                  Technical Aspect Types is a server-derived, read-only summary of the
                  `TechnicalAspectType` rows whose tech stacks the project uses
                  (server projects `aspectTypeLabels`). Change tech stacks to change this list.
                */}
                <div className="py-2 px-3 rounded-md">
                  <div className="mb-3">
                    <Label className="text-sm font-semibold text-muted-foreground">Technical Aspects</Label>
                  </div>
                  {localProject.aspectTypeLabels && localProject.aspectTypeLabels.length > 0 ? (
                    <div className="flex flex-wrap gap-2 min-h-[2rem]">
                      {localProject.aspectTypeLabels.map((label) => (
                        <Badge
                          key={label}
                          variant="secondary"
                          className={cn(
                            "text-xs bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200"
                          )}
                        >
                          {label}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">
                      Derived from selected tech stacks.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Description */}
          <InlineEditableTextarea
            label="Description"
            value={localProject.description || ""}
            fieldName="description"
            onSave={async (fieldName, newValue, verify) => {
              await handleFieldSave(fieldName, newValue, verify)
            }}
            maxLength={150}
            getFieldVerification={getFieldVerification}
            placeholder="Provide a detailed description of the project, its goals, and key features..."
          />

            <InlineEditField
            label="Latest Update"
            value={localProject.latestUpdate || ""}
            fieldName="latestUpdate"
              fieldType="text"
            validation={validateLatestUpdate}
              onSave={handleFieldSave}
            placeholder="Recent project updates or comments"
              getFieldVerification={getFieldVerification}
            />

          <div ref={modulesSectionRef} className="scroll-mt-4">
            <ProjectModulesSection modules={localProject.modules} />
          </div>

          {/* Project Metadata */}
          <div className="pt-4 border-t border-border">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-muted-foreground">
              <div>Created At: {localProject.createdAt?.toLocaleDateString?.() ?? "—"}</div>
              <div>Updated At: {localProject.updatedAt?.toLocaleDateString?.() ?? "—"}</div>
            </div>
          </div>
          </>
          )}
        </div>

        <DialogFooter className="px-6 py-4 border-t border-border">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="cursor-pointer">
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
