"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { Plus } from "lucide-react"
import { toast } from "sonner"
import { ModuleCreationDialog, type ModuleFormData } from "@/components/module-creation-dialog"
import { ModulesFilterDialog, emptyModuleFilters, type ModuleFilters } from "@/components/modules-filter-dialog"
import { ModulesTable } from "@/components/modules-table"
import { ProjectDetailDialog } from "@/components/projects-table"
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
import { Button } from "@/components/ui/button"
import type { ProjectLookups } from "@/components/project-creation-dialog"
import type { MultiSelectOption } from "@/components/ui/multi-select"
import {
  createClientLocation,
  createTechStack,
  ensureDomainCatalogsLoaded,
  fetchClientLocations,
  fetchTechnicalAspectTypes,
  fetchTechStacks,
  type LookupItem,
} from "@/lib/services/lookups-api"
import {
  createProjectModule,
  deleteProjectModule,
  fetchProjectModulesPage,
  updateProjectModule,
} from "@/lib/services/project-modules-api"
import { catalogToSelectOptions } from "@/lib/utils/domain-catalog"
import type { Project } from "@/lib/types/project"
import type { ProjectModuleListItem } from "@/lib/types/project-module"

const DEFAULT_PAGE_SIZE = 20

function projectShell(projectId: number, projectName: string): Project {
  return {
    id: String(projectId),
    projectName: projectName || "Project",
    employerName: null,
    techStacks: [],
    verticalDomains: [],
    horizontalDomains: [],
    technicalDomains: [],
    technicalAspects: [],
    aspectTypeLabels: [],
    teamSize: null,
    startDate: null,
    endDate: null,
    status: null,
    description: null,
    latestUpdate: null,
    projectLink: null,
    projectType: null,
    isPublished: false,
    publishPlatforms: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  }
}

function idsFromFilter(values: string[]): number[] {
  return values
    .map((value) => Number.parseInt(value, 10))
    .filter((id) => Number.isInteger(id) && id > 0)
}

export function ModulesPageClient() {
  const [filters, setFilters] = useState<ModuleFilters>(emptyModuleFilters)
  const [modules, setModules] = useState<ProjectModuleListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [pageNumber, setPageNumber] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [totalCount, setTotalCount] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [hasNext, setHasNext] = useState(false)
  const [hasPrevious, setHasPrevious] = useState(false)
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [techStacksLookup, setTechStacksLookup] = useState<LookupItem[]>([])
  const [lookups, setLookups] = useState<ProjectLookups>({
    techStacks: [],
    technicalAspects: [],
    clientLocations: [],
  })
  const [technicalDomainOptions, setTechnicalDomainOptions] = useState<MultiSelectOption[]>([])
  const [moduleDialogOpen, setModuleDialogOpen] = useState(false)
  const [moduleDialogMode, setModuleDialogMode] = useState<"create" | "edit">("create")
  const [moduleToEdit, setModuleToEdit] = useState<ProjectModuleListItem | null>(null)
  const [rowDeleteOpen, setRowDeleteOpen] = useState(false)
  const [modulePendingDelete, setModulePendingDelete] = useState<ProjectModuleListItem | null>(
    null,
  )
  const [rowDeleteLoading, setRowDeleteLoading] = useState(false)

  const techStackOptions = useMemo<MultiSelectOption[]>(
    () => techStacksLookup.map((item) => ({ value: String(item.id), label: item.name })),
    [techStacksLookup],
  )

  useEffect(() => {
    let cancelled = false
    Promise.all([
      fetchTechStacks(),
      fetchClientLocations(),
      fetchTechnicalAspectTypes(),
      ensureDomainCatalogsLoaded(),
    ])
      .then(([tech, clientLocations, aspectTypes, catalogs]) => {
        if (cancelled) return
        setTechStacksLookup(tech)
        setTechnicalDomainOptions(catalogToSelectOptions(catalogs.technicalDomains))
        setLookups({
          techStacks: tech,
          technicalAspects: catalogs.technicalAspects,
          clientLocations,
          verticalDomains: catalogToSelectOptions(catalogs.verticalDomains),
          horizontalDomains: catalogToSelectOptions(catalogs.horizontalDomains),
          technicalDomains: catalogToSelectOptions(catalogs.technicalDomains),
          technicalAspectTypes: aspectTypes.map((item) => ({ value: String(item.id), label: item.name })),
        })
      })
      .catch(() => {
        if (!cancelled) {
          setTechStacksLookup([])
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

  const loadModules = useCallback(async () => {
    setLoading(true)
    try {
      const page = await fetchProjectModulesPage({
        name: filters.name,
        projectIds: idsFromFilter(filters.projectIds),
        techStackIds: idsFromFilter(filters.techStackIds),
        pageNumber,
        pageSize,
      })
      setModules(page.items)
      setTotalCount(page.totalCount)
      setTotalPages(page.totalPages)
      setHasNext(page.hasNext)
      setHasPrevious(page.hasPrevious)
    } catch (error) {
      setModules([])
      setTotalCount(0)
      setTotalPages(0)
      setHasNext(false)
      setHasPrevious(false)
      toast.error(error instanceof Error ? error.message : "Failed to load modules.")
    } finally {
      setLoading(false)
    }
  }, [filters, pageNumber, pageSize])

  useEffect(() => {
    void loadModules()
  }, [loadModules])

  const handleFiltersChange = (next: ModuleFilters) => {
    setFilters(next)
    setPageNumber(1)
  }

  const handleClearFilters = () => {
    setFilters(emptyModuleFilters)
    setPageNumber(1)
  }

  const handleCreateTechStack = useCallback(async (name: string) => {
    try {
      const created = await createTechStack(name)
      setTechStacksLookup((prev) => [
        ...prev.filter((item) => item.id !== created.id && item.name !== created.name),
        created,
      ])
      setLookups((prev) => ({
        ...prev,
        techStacks: [
          ...prev.techStacks.filter((item) => item.id !== created.id && item.name !== created.name),
          created,
        ],
      }))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to add technology")
      throw error
    }
  }, [])

  const handleCreateClientLocation = useCallback(async (name: string) => {
    try {
      const created = await createClientLocation(name)
      setLookups((prev) => ({
        ...prev,
        clientLocations: [
          ...prev.clientLocations.filter(
            (item) => item.id !== created.id && item.name !== created.name,
          ),
          created,
        ],
      }))
      return created
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to add client location")
      throw error
    }
  }, [])

  const openCreateModule = () => {
    setModuleDialogMode("create")
    setModuleToEdit(null)
    setModuleDialogOpen(true)
  }

  const openEditModule = (module: ProjectModuleListItem) => {
    setModuleDialogMode("edit")
    setModuleToEdit(module)
    setModuleDialogOpen(true)
  }

  const handleModuleSubmit = async (data: ModuleFormData) => {
    const body = {
      name: data.name,
      description: data.description.trim() ? data.description.trim() : null,
      techStackIds: data.techStackIds,
    }
    if (moduleDialogMode === "create") {
      await createProjectModule(data.projectId, body)
      toast.success(`Module "${data.name}" created successfully.`)
    } else {
      if (data.moduleId == null) throw new Error("Module id is missing.")
      await updateProjectModule(data.projectId, data.moduleId, body)
      toast.success(`Module "${data.name}" updated successfully.`)
    }
    await loadModules()
  }

  const openRowDeleteConfirm = (module: ProjectModuleListItem) => {
    setModulePendingDelete(module)
    setRowDeleteOpen(true)
  }

  const confirmRowDelete = async () => {
    if (!modulePendingDelete) return
    setRowDeleteLoading(true)
    try {
      await deleteProjectModule(modulePendingDelete.projectId, modulePendingDelete.id)
      toast.success(`Module "${modulePendingDelete.name}" deleted.`)
      if (moduleToEdit?.id === modulePendingDelete.id) {
        setModuleDialogOpen(false)
        setModuleToEdit(null)
      }
      setRowDeleteOpen(false)
      setModulePendingDelete(null)
      await loadModules()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete module.")
    } finally {
      setRowDeleteLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-3xl font-bold tracking-tight">All Modules</h2>
        <div className="flex flex-wrap items-center gap-2">
          <ModulesFilterDialog
            filters={filters}
            techStackOptions={techStackOptions}
            onFiltersChange={handleFiltersChange}
            onClearFilters={handleClearFilters}
          />
          <Button
            type="button"
            onClick={openCreateModule}
            className="transition-all duration-200 ease-in-out hover:scale-105 hover:shadow-md cursor-pointer"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Module
          </Button>
        </div>
      </div>
      <ModulesTable
        modules={modules}
        isLoading={loading}
        totalCount={totalCount}
        pageNumber={pageNumber}
        pageSize={pageSize}
        totalPages={totalPages}
        hasPrevious={hasPrevious}
        hasNext={hasNext}
        onPageChange={setPageNumber}
        onPageSizeChange={(size) => {
          setPageSize(size)
          setPageNumber(1)
        }}
        onOpen={(module) => setSelectedProject(projectShell(module.projectId, module.projectName))}
        onEdit={openEditModule}
        onDelete={openRowDeleteConfirm}
      />
      <AlertDialog
        open={rowDeleteOpen}
        onOpenChange={(open) => {
          setRowDeleteOpen(open)
          if (!open && !rowDeleteLoading) setModulePendingDelete(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete{" "}
              <strong>{modulePendingDelete?.name ?? "this module"}</strong> and all candidate links
              to it. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={rowDeleteLoading} className="cursor-pointer">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              disabled={rowDeleteLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 cursor-pointer transition-transform duration-200 hover:scale-105"
              onClick={(event) => {
                event.preventDefault()
                void confirmRowDelete()
              }}
            >
              {rowDeleteLoading ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <ModuleCreationDialog
        mode={moduleDialogMode}
        open={moduleDialogOpen}
        onOpenChange={(open) => {
          setModuleDialogOpen(open)
          if (!open) setModuleToEdit(null)
        }}
        moduleListItem={moduleToEdit}
        projectLookups={lookups}
        techStacksLookup={techStacksLookup}
        onCreateTechStack={handleCreateTechStack}
        onCreateClientLocation={handleCreateClientLocation}
        onSubmit={handleModuleSubmit}
      />
      {selectedProject && (
        <ProjectDetailDialog
          project={selectedProject}
          open={selectedProject != null}
          focusModules
          onOpenChange={(open) => {
            if (!open) setSelectedProject(null)
          }}
          technicalDomainOptions={technicalDomainOptions}
          lookups={lookups}
        />
      )}
    </div>
  )
}
