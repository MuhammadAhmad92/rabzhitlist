"use client"

import * as React from "react"
import { useCallback, useEffect, useMemo, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { MultiSelect, type MultiSelectOption } from "@/components/ui/multi-select"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { ProjectCombobox, type SelectedProject } from "@/components/project-combobox"
import type { ProjectLookups } from "@/components/project-creation-dialog"
import type { LookupItem } from "@/lib/services/lookups-api"
import { fetchProjectById, projectDtoToProject } from "@/lib/services/projects-api"
import type { ProjectModuleListItem } from "@/lib/types/project-module"

export interface ModuleFormData {
  projectId: number
  projectName: string
  moduleId?: number
  name: string
  description: string
  techStackIds: number[]
}

type DialogMode = "create" | "edit"

interface ModuleCreationDialogProps {
  mode?: DialogMode
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Required for edit mode — list row seed (description loaded from project detail). */
  moduleListItem?: ProjectModuleListItem | null
  projectLookups: ProjectLookups
  techStacksLookup: LookupItem[]
  onCreateTechStack?: (name: string, context?: { aspectTypeId: number }) => Promise<void>
  onCreateTechnicalAspect?: (name: string) => Promise<void>
  onCreateClientLocation?: (name: string) => Promise<LookupItem | void>
  onSubmit: (data: ModuleFormData) => Promise<void> | void
}

const emptyForm = {
  selectedProject: null as SelectedProject,
  name: "",
  description: "",
  techStacks: [] as string[],
}

function techStackNamesToSelectedIds(names: string[], lookup: LookupItem[]): string[] {
  return names
    .map((name) => lookup.find((item) => item.name === name)?.id)
    .filter((id): id is number => id != null)
    .map(String)
}

function selectedIdsToTechStackIds(selected: string[]): number[] {
  return selected
    .map((value) => Number.parseInt(value, 10))
    .filter((id) => Number.isInteger(id) && id > 0)
}

export function ModuleCreationDialog({
  mode = "create",
  open,
  onOpenChange,
  moduleListItem = null,
  projectLookups,
  techStacksLookup,
  onCreateTechStack,
  onCreateTechnicalAspect,
  onCreateClientLocation,
  onSubmit,
}: ModuleCreationDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [detailLoading, setDetailLoading] = useState(false)
  const [readOnlyProjectName, setReadOnlyProjectName] = useState("")
  const [readOnlyProjectId, setReadOnlyProjectId] = useState<number | null>(null)
  const [editModuleId, setEditModuleId] = useState<number | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [errors, setErrors] = useState<{ project?: string; name?: string }>({})

  const techStackOptions = useMemo<MultiSelectOption[]>(
    () => techStacksLookup.map((item) => ({ value: String(item.id), label: item.name })),
    [techStacksLookup],
  )

  const resetCreateForm = useCallback(() => {
    setForm(emptyForm)
    setReadOnlyProjectName("")
    setReadOnlyProjectId(null)
    setEditModuleId(null)
    setErrors({})
  }, [])

  useEffect(() => {
    if (!open) {
      resetCreateForm()
      setDetailLoading(false)
      return
    }

    if (mode === "create") {
      resetCreateForm()
      return
    }

    if (!moduleListItem) return

    let cancelled = false
    setDetailLoading(true)
    setReadOnlyProjectId(moduleListItem.projectId)
    setReadOnlyProjectName(moduleListItem.projectName)
    setEditModuleId(moduleListItem.id)
    setForm({
      selectedProject: { id: moduleListItem.projectId, name: moduleListItem.projectName },
      name: moduleListItem.name,
      description: "",
      techStacks: techStackNamesToSelectedIds(moduleListItem.techStacks, techStacksLookup),
    })
    setErrors({})

    fetchProjectById(moduleListItem.projectId)
      .then((dto) => {
        if (cancelled) return
        const project = projectDtoToProject(dto)
        const mod = project.modules?.find((m) => m.id === moduleListItem.id)
        if (mod) {
          setForm({
            selectedProject: { id: moduleListItem.projectId, name: moduleListItem.projectName },
            name: mod.name,
            description: mod.description ?? "",
            techStacks: techStackNamesToSelectedIds(mod.techStacks, techStacksLookup),
          })
        }
      })
      .catch((error: unknown) => {
        if (cancelled) return
        toast.error(error instanceof Error ? error.message : "Failed to load module details.")
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [open, mode, moduleListItem, techStacksLookup, resetCreateForm])

  const validate = (): boolean => {
    const next: { project?: string; name?: string } = {}
    if (mode === "create" && !form.selectedProject) {
      next.project = "Main project is required"
    }
    if (!form.name.trim()) {
      next.name = "Module name is required"
    }
    setErrors(next)
    return Object.keys(next).length === 0
  }

  const buildPayload = (): ModuleFormData => {
    const projectId =
      mode === "edit" && readOnlyProjectId != null
        ? readOnlyProjectId
        : form.selectedProject!.id
    const projectName =
      mode === "edit"
        ? readOnlyProjectName
        : form.selectedProject!.name
    return {
      projectId,
      projectName,
      moduleId: mode === "edit" ? editModuleId ?? undefined : undefined,
      name: form.name.trim(),
      description: form.description.trim() ? form.description.trim() : "",
      techStackIds: selectedIdsToTechStackIds(form.techStacks),
    }
  }

  const handleSave = async () => {
    if (!validate()) return
    setIsLoading(true)
    try {
      await onSubmit(buildPayload())
      onOpenChange(false)
    } catch (error) {
      console.error(error)
      toast.error(error instanceof Error ? error.message : "Failed to save module.")
    } finally {
      setIsLoading(false)
    }
  }

  const formId = React.useId().replace(/:/g, "")

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[520px] [&>button]:cursor-pointer">
          <DialogHeader>
            <DialogTitle>{mode === "edit" ? "Edit Module" : "Create Module"}</DialogTitle>
          </DialogHeader>

          {detailLoading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Loading module…
            </div>
          ) : (
            <form
              id={formId}
              className="space-y-4"
              onSubmit={(event) => {
                event.preventDefault()
                void handleSave()
              }}
            >
              {mode === "edit" ? (
                <div className="space-y-2">
                  <Label>Main project</Label>
                  <Input value={readOnlyProjectName || "—"} readOnly disabled className="bg-muted/40" />
                </div>
              ) : (
                <ProjectCombobox
                  id="module-main-project"
                  label="Main project *"
                  value={form.selectedProject}
                  onChange={(project) => {
                    setForm((prev) => ({ ...prev, selectedProject: project }))
                    if (errors.project) setErrors((prev) => ({ ...prev, project: undefined }))
                  }}
                  error={!!errors.project}
                  projectLookups={projectLookups}
                  onCreateTechStack={onCreateTechStack}
                  onCreateTechnicalAspect={onCreateTechnicalAspect}
                  onCreateClientLocation={onCreateClientLocation}
                />
              )}
              {errors.project && <p className="text-sm text-red-500">{errors.project}</p>}

              <div className="space-y-2">
                <Label htmlFor="module-name">Module name *</Label>
                <Input
                  id="module-name"
                  value={form.name}
                  onChange={(event) => {
                    setForm((prev) => ({ ...prev, name: event.target.value }))
                    if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }))
                  }}
                  placeholder="e.g. Payments"
                  className={errors.name ? "border-red-500" : ""}
                />
                {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="module-description">Description</Label>
                <Textarea
                  id="module-description"
                  value={form.description}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, description: event.target.value }))
                  }
                  placeholder="What this module covers"
                  className="min-h-[80px] resize-none"
                />
              </div>

              <div className="space-y-2">
                <MultiSelect
                  label="Tech Stacks"
                  items={techStackOptions}
                  selected={form.techStacks}
                  onChange={(techStacks) => setForm((prev) => ({ ...prev, techStacks }))}
                  placeholder="Select technologies..."
                  searchPlaceholder="Search technologies..."
                  creatable={!!onCreateTechStack}
                  createLabel="Add Technology"
                  onCreateNew={
                    onCreateTechStack
                      ? async (name) => {
                          await onCreateTechStack(name)
                        }
                      : undefined
                  }
                />
              </div>
            </form>
          )}

          <DialogFooter className="gap-2 border-t border-border pt-4">
            <Button
              type="button"
              variant="outline"
              disabled={isLoading || detailLoading}
              onClick={() => onOpenChange(false)}
              className="transition-all duration-150 ease-in-out hover:bg-accent hover:text-accent-foreground hover:border-accent cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form={formId}
              disabled={isLoading || detailLoading}
              className="transition-all duration-200 ease-in-out hover:scale-[1.02] hover:shadow-sm cursor-pointer disabled:hover:scale-100 disabled:hover:shadow-none"
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isLoading ? "Saving…" : mode === "edit" ? "Save" : "Create Module"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
  )
}
