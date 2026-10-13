"use client"

import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Building2, FolderIcon, Globe, Plus, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ProjectsTable } from "@/components/projects-table"
import { ProjectCreationDialog, ProjectFormData, ProjectVerificationState } from "@/components/project-creation-dialog"
import { toast } from "sonner"
import { ProjectsFilterDialog, ProjectFilters } from "@/components/projects-filter-dialog"
import { useGlobalFilters } from "@/contexts/global-filter-context"
import { useCreatedByUserIdListFilter } from "@/hooks/useCreatedByUserIdListFilter"
import { deleteCreatedByUserIdParam } from "@/lib/utils/created-by-user-id"
import { getGlobalFilterCount } from "@/lib/types/global-filters"
import type { Project } from "@/lib/types/project"
import {
  fetchProjectsFiltered,
  fetchProjectById,
  createProject,
  updateProject,
  deleteProject,
  projectListItemDtoToProject,
  projectDtoToProject,
  buildFetchProjectsParams,
  buildCreateProjectDto,
  buildUpdateProjectDto,
  type CreateProjectOptions,
} from "@/lib/services/projects-api"
import type { LookupItem } from "@/lib/services/lookups-api"
import {
  fetchTechStacks,
  fetchTechnicalAspectTypes,
  fetchClientLocations,
  createTechStack,
  createClientLocation,
  ensureDomainCatalogsLoaded,
} from "@/lib/services/lookups-api"
import { buildTechStackMultiSelectOptions } from "@/lib/utils/tech-stack-lookup"
import { catalogIdStringsToInts, catalogToSelectOptions } from "@/lib/utils/domain-catalog"
import type { MultiSelectOption } from "@/components/ui/multi-select"

const DEFAULT_PAGE_SIZE = 20

const initialFilters: ProjectFilters = {
  status: [],
  projectTypes: [],
  employers: [],
  clientLocations: [],
  verticalDomains: [],
  horizontalDomains: [],
  technicalDomains: [],
  technicalAspects: [],
  technicalAspectTypeIds: [],
  techStacksByAspectType: {},
  techStacks: [],
  completionDateStart: null,
  completionDateEnd: null,
  startEndDateStart: null,
  startEndDateEnd: null,
  startDateStart: null,
  startDateEnd: null,
  averageTeamSizeMin: "",
  averageTeamSizeMax: "",
  projectName: "",
  projectLink: "",
  isPublished: null,
  publishPlatforms: [],
  minDownloadCount: "",
  dataProgressMin: "",
  dataProgressMax: "",
}

function namesToIds(names: string[], lookup: LookupItem[]): number[] {
  return names
    .map((n) => lookup.find((l) => l.name === n)?.id)
    .filter((id): id is number => id != null)
}

/**
 * `technicalAspectTypeIds` are aspect-type catalog ids used only to scope the
 * tech-stack picker. They must not be merged into project `technicalAspects`
 * (GET /api/TechnicalAspects).
 */

function parseEmployerFilterFromSearchParams(
  searchParams: Pick<URLSearchParams, "get">
): { name: string; id: string } | null {
  const employerFilterName = searchParams.get("employerFilter")?.trim()
  const employerId = searchParams.get("employerId")?.trim()
  if (!employerFilterName || !employerId || !/^\d+$/.test(employerId)) return null
  return { name: employerFilterName, id: employerId }
}

function parseProjectFilterFromSearchParams(
  searchParams: Pick<URLSearchParams, "get">
): { name: string; id: string } | null {
  const projectFilterName = searchParams.get("projectFilter")?.trim()
  const projectId = searchParams.get("projectId")?.trim()
  if (!projectFilterName || !projectId || !/^\d+$/.test(projectId)) return null
  return { name: projectFilterName, id: projectId }
}

export function ProjectsPageClient() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { createdByUserId, dismissCreatedByUserId, markCreatedByUserIdDismissed } =
    useCreatedByUserIdListFilter()
  const { filters: globalFilters, isActive: hasGlobalFilters } = useGlobalFilters()
  const [filters, setFilters] = useState<ProjectFilters>(initialFilters)

  const employerFilterFromUrl = useMemo(
    () => parseEmployerFilterFromSearchParams(searchParams),
    [searchParams]
  )

  const projectFilterFromUrl = useMemo(
    () => parseProjectFilterFromSearchParams(searchParams),
    [searchParams]
  )

  const employerIdFromUrl = useMemo(() => {
    const raw = employerFilterFromUrl?.id ?? searchParams.get("employerId")
    if (!raw || !/^\d+$/.test(raw.trim())) return null
    const n = Number.parseInt(raw.trim(), 10)
    return Number.isFinite(n) && n > 0 ? n : null
  }, [employerFilterFromUrl, searchParams])

  const projectIdFromUrl = useMemo(() => {
    const raw = projectFilterFromUrl?.id ?? searchParams.get("projectId")
    if (!raw || !/^\d+$/.test(raw.trim())) return null
    const n = Number.parseInt(raw.trim(), 10)
    return Number.isFinite(n) && n > 0 ? n : null
  }, [projectFilterFromUrl, searchParams])

  const combinedFilters = useMemo((): ProjectFilters => {
    let next = filters
    if (employerIdFromUrl != null) {
      const idStr = String(employerIdFromUrl)
      next = {
        ...next,
        employers: next.employers.includes(idStr)
          ? next.employers
          : [...next.employers, idStr],
      }
    }
    if (projectFilterFromUrl != null) {
      const nameFromUrl = projectFilterFromUrl.name.trim()
      if (nameFromUrl) {
        next = { ...next, projectName: nameFromUrl }
      }
    }
    return next
  }, [filters, employerIdFromUrl, projectFilterFromUrl])

  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pageNumber, setPageNumber] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [totalCount, setTotalCount] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [hasNext, setHasNext] = useState(false)
  const [hasPrevious, setHasPrevious] = useState(false)

  const listFilterKey = `${employerIdFromUrl ?? ""}|${projectIdFromUrl ?? ""}|${projectFilterFromUrl?.name ?? ""}`
  const prevListFilterKeyRef = useRef<string | null>(null)
  useEffect(() => {
    if (prevListFilterKeyRef.current === listFilterKey) return
    const isFilterChange = prevListFilterKeyRef.current !== null
    prevListFilterKeyRef.current = listFilterKey
    setPageNumber(1)
    if (isFilterChange) {
      setProjects([])
      setLoading(true)
    }
  }, [listFilterKey])

  // Lookup data for dropdowns (prefetched on mount)
  const [techStacksLookup, setTechStacksLookup] = useState<LookupItem[]>([])
  const [technicalAspectsLookup, setTechnicalAspectsLookup] = useState<LookupItem[]>([])
  const [clientLocationsLookup, setClientLocationsLookup] = useState<LookupItem[]>([])
  const [verticalDomainSelectOptions, setVerticalDomainSelectOptions] = useState<MultiSelectOption[]>([])
  const [horizontalDomainSelectOptions, setHorizontalDomainSelectOptions] = useState<MultiSelectOption[]>([])
  const [technicalDomainSelectOptions, setTechnicalDomainSelectOptions] = useState<MultiSelectOption[]>([])
  const [technicalAspectSelectOptions, setTechnicalAspectSelectOptions] = useState<MultiSelectOption[]>([])
  const [technicalAspectTypeSelectOptions, setTechnicalAspectTypeSelectOptions] = useState<MultiSelectOption[]>([])

  // `technicalAspectTypeIds` are not sent on GET /api/projects.
  const filterIds = useMemo(() => {
    const stackNamesFromAspects = filters.technicalAspectTypeIds.flatMap((id) =>
      (filters.techStacksByAspectType?.[id] ?? []).map((n) => n.trim()).filter(Boolean)
    )
    const stackNamesForApi = [
      ...new Set([
        ...filters.techStacks.map((n) => n.trim()).filter(Boolean),
        ...stackNamesFromAspects,
      ]),
    ]
    return {
      techStackIds: namesToIds(stackNamesForApi, techStacksLookup),
      verticalDomains: catalogIdStringsToInts(filters.verticalDomains),
      horizontalDomains: catalogIdStringsToInts(filters.horizontalDomains),
      technicalDomains: catalogIdStringsToInts(filters.technicalDomains),
      technicalAspectEnumValues: catalogIdStringsToInts(filters.technicalAspects),
      clientLocationIds: namesToIds(filters.clientLocations, clientLocationsLookup),
    }
  }, [
    filters.techStacks,
    filters.techStacksByAspectType,
    filters.technicalAspectTypeIds,
    filters.verticalDomains,
    filters.horizontalDomains,
    filters.technicalDomains,
    filters.technicalAspects,
    filters.clientLocations,
    techStacksLookup,
    clientLocationsLookup,
  ])

  // Client-side filter for `technicalAspectTypeIds`. Server doesn't support
  // this query parameter, but the project DTO now ships server-derived
  // `aspectTypeLabels`, so we filter the already-loaded page here. Pagination
  // counts therefore reflect the server result, not the post-filter set --
  // acceptable trade-off given this is a UI-only refinement.
  const visibleProjects = useMemo(() => {
    const ids = filters.technicalAspectTypeIds
    let list = projects
    if (ids?.length) {
      const idToLabel = new Map(technicalAspectTypeSelectOptions.map((o) => [o.value, o.label]))
      const wantedLabels = new Set(
        ids.map((id) => idToLabel.get(id)).filter((label): label is string => Boolean(label))
      )
      if (wantedLabels.size > 0) {
        list = list.filter((p) => p.aspectTypeLabels.some((label) => wantedLabels.has(label)))
      }
    }
    if (projectIdFromUrl != null) {
      const idStr = String(projectIdFromUrl)
      const byId = list.filter((p) => p.id === idStr)
      if (byId.length > 0) list = byId
    }
    return list
  }, [projects, filters.technicalAspectTypeIds, technicalAspectTypeSelectOptions, projectIdFromUrl])

  // Fetch lookups once on mount (technical domains from GET /api/TechnicalDomains)
  useEffect(() => {
    let cancelled = false
    Promise.all([
      fetchTechStacks(),
      fetchClientLocations(),
      fetchTechnicalAspectTypes(),
      ensureDomainCatalogsLoaded(),
    ]).then(([tech, clientLocs, aspectTypes, catalogs]) => {
      if (cancelled) return
      setTechStacksLookup(tech)
      setTechnicalAspectsLookup(catalogs.technicalAspects)
      setClientLocationsLookup(clientLocs)
      setTechnicalAspectTypeSelectOptions(
        aspectTypes.map((a) => ({ value: String(a.id), label: a.name }))
      )
      setVerticalDomainSelectOptions(catalogToSelectOptions(catalogs.verticalDomains))
      setHorizontalDomainSelectOptions(catalogToSelectOptions(catalogs.horizontalDomains))
      setTechnicalDomainSelectOptions(catalogToSelectOptions(catalogs.technicalDomains))
      setTechnicalAspectSelectOptions(catalogToSelectOptions(catalogs.technicalAspects))
    })
      .catch(() => {
        if (!cancelled) {
          setTechStacksLookup([])
          setTechnicalAspectsLookup([])
          setClientLocationsLookup([])
          setTechnicalAspectTypeSelectOptions([])
          setVerticalDomainSelectOptions([])
          setHorizontalDomainSelectOptions([])
          setTechnicalDomainSelectOptions([])
          setTechnicalAspectSelectOptions([])
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

  // Load projects when filters or page change; use current lookups only to resolve filter names to IDs
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)

    ;(async () => {
      try {
        await ensureDomainCatalogsLoaded()
        if (cancelled) return
        const params = {
          ...buildFetchProjectsParams(combinedFilters, pageNumber, pageSize, {
          techStackIds: filterIds.techStackIds.length ? filterIds.techStackIds : undefined,
          verticalDomains: filterIds.verticalDomains.length ? filterIds.verticalDomains : undefined,
          horizontalDomains: filterIds.horizontalDomains.length ? filterIds.horizontalDomains : undefined,
          technicalDomains: filterIds.technicalDomains.length ? filterIds.technicalDomains : undefined,
          technicalAspectEnumValues: filterIds.technicalAspectEnumValues.length
            ? filterIds.technicalAspectEnumValues
            : undefined,
          clientLocationIds: filterIds.clientLocationIds.length ? filterIds.clientLocationIds : undefined,
        }),
          ...(createdByUserId != null ? { createdByUserId } : {}),
        }
        const result = await fetchProjectsFiltered(params)
        if (cancelled) return
        const items = result?.items ?? []
        setProjects(items.map(projectListItemDtoToProject))
        setTotalCount(result?.totalCount ?? 0)
        setTotalPages(result?.totalPages ?? 0)
        setHasNext(result?.hasNext ?? false)
        setHasPrevious(result?.hasPrevious ?? false)
      } catch (e) {
        if (cancelled) return
        const message = e instanceof Error ? e.message : "Failed to load projects"
        setError(message)
        toast.error(message)
        setProjects([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [combinedFilters, pageNumber, pageSize, filterIds, createdByUserId])

  const loadProjects = useCallback(async () => {
    await ensureDomainCatalogsLoaded()
    const params = {
      ...buildFetchProjectsParams(combinedFilters, pageNumber, pageSize, {
      techStackIds: filterIds.techStackIds.length ? filterIds.techStackIds : undefined,
      verticalDomains: filterIds.verticalDomains.length ? filterIds.verticalDomains : undefined,
      horizontalDomains: filterIds.horizontalDomains.length ? filterIds.horizontalDomains : undefined,
      technicalDomains: filterIds.technicalDomains.length ? filterIds.technicalDomains : undefined,
      technicalAspectEnumValues: filterIds.technicalAspectEnumValues.length
        ? filterIds.technicalAspectEnumValues
        : undefined,
      clientLocationIds: filterIds.clientLocationIds.length ? filterIds.clientLocationIds : undefined,
    }),
      ...(createdByUserId != null ? { createdByUserId } : {}),
    }
    const result = await fetchProjectsFiltered(params)
    const items = result?.items ?? []
    setProjects(items.map(projectListItemDtoToProject))
    setTotalCount(result?.totalCount ?? 0)
    setTotalPages(result?.totalPages ?? 0)
    setHasNext(result?.hasNext ?? false)
    setHasPrevious(result?.hasPrevious ?? false)
  }, [combinedFilters, pageNumber, pageSize, filterIds, createdByUserId])

  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [projectToEdit, setProjectToEdit] = useState<Project | null>(null)
  const [verifyDialogOpen, setVerifyDialogOpen] = useState(false)
  const [projectToVerify, setProjectToVerify] = useState<Project | null>(null)

  const handleProjectSubmit = async (data: ProjectFormData, _verificationState?: ProjectVerificationState) => {
    const employerId = data.selectedEmployer?.id ?? null
    const options: CreateProjectOptions = {
      techStackIds: namesToIds(data.techStacks, techStacksLookup),
      verticalDomains: catalogIdStringsToInts(data.verticalDomains),
      horizontalDomains: catalogIdStringsToInts(data.horizontalDomains),
      technicalDomains: catalogIdStringsToInts(data.technicalDomains),
      technicalAspects: catalogIdStringsToInts(data.technicalAspects),
      clientLocationIds: namesToIds(data.clientLocations, clientLocationsLookup),
      employerId,
    }
    try {
      if (projectToEdit) {
        const body = buildUpdateProjectDto(data, {
          ...options,
          employerId,
        })
        await updateProject(Number(projectToEdit.id), body)
        toast.success("Project updated successfully!")
        setEditDialogOpen(false)
        setProjectToEdit(null)
      } else {
        const body = buildCreateProjectDto(data, options)
        await createProject(body)
        toast.success("Project created successfully!")
        setCreateDialogOpen(false)
      }
      await loadProjects()
    } catch (e) {
      const message = e instanceof Error ? e.message : "Request failed"
      toast.error(message)
      throw e
    }
  }

  const handleVerifySubmit = async (formData: ProjectFormData, verificationState?: ProjectVerificationState) => {
    if (!projectToVerify) return
    const employerId = formData.selectedEmployer?.id ?? null
    const options: CreateProjectOptions = {
      techStackIds: namesToIds(formData.techStacks, techStacksLookup),
      verticalDomains: catalogIdStringsToInts(formData.verticalDomains),
      horizontalDomains: catalogIdStringsToInts(formData.horizontalDomains),
      technicalDomains: catalogIdStringsToInts(formData.technicalDomains),
      technicalAspects: catalogIdStringsToInts(formData.technicalAspects),
      clientLocationIds: namesToIds(formData.clientLocations, clientLocationsLookup),
      employerId,
    }
    try {
      const body = buildUpdateProjectDto(formData, {
        ...options,
        employerId,
      })
      await updateProject(Number(projectToVerify.id), body)
      const verifiedCount = verificationState?.verifiedFields.size || 0
      const modifiedCount = verificationState?.modifiedFields.size || 0
      toast.success(
        `Project updated! ${verifiedCount} field(s) verified${modifiedCount > 0 ? `, ${modifiedCount} field(s) modified` : ""}.`,
        { duration: 4000 }
      )
      setVerifyDialogOpen(false)
      setProjectToVerify(null)
      await loadProjects()
    } catch (e) {
      const message = e instanceof Error ? e.message : "Request failed"
      toast.error(message)
      throw e
    }
  }

  const handleEdit = async (project: Project) => {
    try {
      await ensureDomainCatalogsLoaded()
      const dto = await fetchProjectById(Number(project.id))
      const full = projectDtoToProject(dto)
      setProjectToEdit(full)
      setEditDialogOpen(true)
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to load project"
      toast.error(message)
    }
  }

  const handleVerify = async (project: Project) => {
    try {
      await ensureDomainCatalogsLoaded()
      const dto = await fetchProjectById(Number(project.id))
      const full = projectDtoToProject(dto)
      setProjectToVerify(full)
      setVerifyDialogOpen(true)
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to load project"
      toast.error(message)
    }
  }

  const handleDelete = async (project: Project) => {
    try {
      await deleteProject(Number(project.id))
      toast.success("Project deleted.")
      await loadProjects()
    } catch (e) {
      const message = e instanceof Error ? e.message : "Failed to delete project"
      toast.error(message)
    }
  }

  const handleFiltersChange = (newFilters: ProjectFilters) => {
    dismissCreatedByUserId()
    setFilters(newFilters)
    setPageNumber(1)
  }

  // Create lookup handlers: POST new value, add to state so dropdown and submit have it
  const handleCreateTechStack = useCallback(async (name: string, context?: { aspectTypeId: number }) => {
    try {
      const ids = context?.aspectTypeId != null ? [context.aspectTypeId] : undefined
      const created = await createTechStack(name, ids)
      setTechStacksLookup((prev) => [...prev.filter((l) => l.id !== created.id && l.name !== created.name), created])
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to add technology")
      throw e
    }
  }, [])

  const handleCreateClientLocation = useCallback(async (name: string) => {
    try {
      const created = await createClientLocation(name)
      setClientLocationsLookup((prev) => [...prev.filter((l) => l.id !== created.id && l.name !== created.name), created])
      return created
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to add client location")
      throw e
    }
  }, [])

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize)
    setPageNumber(1)
  }

  const handleClearEmployerFilter = () => {
    markCreatedByUserIdDismissed()
    const params = new URLSearchParams(searchParams.toString())
    params.delete("employerFilter")
    params.delete("employerId")
    deleteCreatedByUserIdParam(params)
    const q = params.toString()
    router.push(q ? `/projects?${q}` : "/projects")
  }

  const handleClearProjectFilter = () => {
    markCreatedByUserIdDismissed()
    const params = new URLSearchParams(searchParams.toString())
    params.delete("projectFilter")
    params.delete("projectId")
    deleteCreatedByUserIdParam(params)
    const q = params.toString()
    router.push(q ? `/projects?${q}` : "/projects")
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
          <h2 className="text-3xl font-bold tracking-tight">All Projects</h2>
        </div>
        <div className="flex items-center gap-2">
          <ProjectsFilterDialog
            filters={filters}
            onFiltersChange={handleFiltersChange}
            onClearFilters={handleClearFilters}
            lookupOptions={{
              techStacks: buildTechStackMultiSelectOptions(techStacksLookup),
              verticalDomains: verticalDomainSelectOptions,
              horizontalDomains: horizontalDomainSelectOptions,
              technicalDomains: technicalDomainSelectOptions,
              technicalAspectTypes: technicalAspectTypeSelectOptions,
              technicalAspects: technicalAspectSelectOptions,
              clientLocations: clientLocationsLookup.map((l) => ({ value: l.name, label: l.name })),
            }}
          />
          <Button
            onClick={() => setCreateDialogOpen(true)}
            className="transition-all duration-200 ease-in-out hover:scale-105 hover:shadow-md cursor-pointer"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Project
          </Button>
          <ProjectCreationDialog
            mode="create"
            open={createDialogOpen}
            onOpenChange={setCreateDialogOpen}
            onSubmit={handleProjectSubmit}
            lookups={{
              techStacks: techStacksLookup,
              technicalAspects: technicalAspectsLookup,
              clientLocations: clientLocationsLookup,
              verticalDomains: verticalDomainSelectOptions,
              horizontalDomains: horizontalDomainSelectOptions,
              technicalDomains: technicalDomainSelectOptions,
              technicalAspectTypes: technicalAspectTypeSelectOptions,
            }}
            onCreateTechStack={handleCreateTechStack}
            onCreateClientLocation={handleCreateClientLocation}
          />
          {projectToEdit && (
            <ProjectCreationDialog
              mode="edit"
              projectData={projectToEdit}
              open={editDialogOpen}
              onOpenChange={(open) => {
                setEditDialogOpen(open)
                if (!open) setProjectToEdit(null)
              }}
              onSubmit={handleProjectSubmit}
              lookups={{
                techStacks: techStacksLookup,
                technicalAspects: technicalAspectsLookup,
                clientLocations: clientLocationsLookup,
                verticalDomains: verticalDomainSelectOptions,
                horizontalDomains: horizontalDomainSelectOptions,
                technicalDomains: technicalDomainSelectOptions,
                technicalAspectTypes: technicalAspectTypeSelectOptions,
              }}
              onCreateTechStack={handleCreateTechStack}
              onCreateClientLocation={handleCreateClientLocation}
            />
          )}
          {projectToVerify && (
            <ProjectCreationDialog
              mode="edit"
              projectData={projectToVerify}
              showVerification={false} /* VERIFICATION_UI_DISABLED */
              open={verifyDialogOpen}
              onOpenChange={(open) => {
                setVerifyDialogOpen(open)
                if (!open) setProjectToVerify(null)
              }}
              onSubmit={handleVerifySubmit}
              lookups={{
                techStacks: techStacksLookup,
                technicalAspects: technicalAspectsLookup,
                clientLocations: clientLocationsLookup,
                verticalDomains: verticalDomainSelectOptions,
                horizontalDomains: horizontalDomainSelectOptions,
                technicalDomains: technicalDomainSelectOptions,
                technicalAspectTypes: technicalAspectTypeSelectOptions,
              }}
              onCreateTechStack={handleCreateTechStack}
              onCreateClientLocation={handleCreateClientLocation}
            />
          )}
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

      {(employerFilterFromUrl || projectFilterFromUrl) && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">Active filters:</span>
          {employerFilterFromUrl && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <Building2 className="h-3 w-3" />
              Employer: {employerFilterFromUrl.name}
              <Button
                variant="ghost"
                size="sm"
                className="h-4 w-4 p-0 hover:bg-transparent"
                onClick={handleClearEmployerFilter}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          )}
          {projectFilterFromUrl && (
            <Badge variant="secondary" className="flex items-center gap-1">
              <FolderIcon className="h-3 w-3" />
              Project: {projectFilterFromUrl.name}
              <Button
                variant="ghost"
                size="sm"
                className="h-4 w-4 p-0 hover:bg-transparent"
                onClick={handleClearProjectFilter}
              >
                <X className="h-3 w-3" />
              </Button>
            </Badge>
          )}
        </div>
      )}

      {error && (
        <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
          {error}
        </div>
      )}

      <ProjectsTable
        projects={visibleProjects}
        isLoading={loading}
        totalCount={totalCount}
        pageNumber={pageNumber}
        pageSize={pageSize}
        totalPages={totalPages}
        hasPrevious={hasPrevious}
        hasNext={hasNext}
        onPageChange={setPageNumber}
        onPageSizeChange={handlePageSizeChange}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onVerify={handleVerify}
        technicalDomainOptions={technicalDomainSelectOptions}
        lookups={{
          techStacks: techStacksLookup,
          technicalAspects: technicalAspectsLookup,
          clientLocations: clientLocationsLookup,
          verticalDomains: verticalDomainSelectOptions,
          horizontalDomains: horizontalDomainSelectOptions,
          technicalDomains: technicalDomainSelectOptions,
          technicalAspectTypes: technicalAspectTypeSelectOptions,
        }}
        onCreateTechStack={handleCreateTechStack}
        onCreateClientLocation={handleCreateClientLocation}
      />
    </div>
  )
}
