"use client"

import * as React from "react"
import { useState, useRef, useMemo, useCallback, useEffect } from "react"
import { useScrollSpySection } from "@/hooks/use-scroll-spy-section"
// import { Field, FieldDescription, FieldLabel } from "@/components/ui/form"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
// import { Combobox, ComboboxOption } from "@/components/ui/combobox"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import {
  Loader2,
  Plus,
  User,
  Briefcase,
  Trash2,
  ChevronDown,
  Award,
  GraduationCap,
  Trophy,
  MessageSquare,
  FolderOpen,
  Check,
  ChevronsUpDown,
  X,
  ShieldCheck,
  Code,
  Building2,
  ListTodo,
  Users,
} from "lucide-react"
import { CalendarIcon } from "lucide-react"
import { MentorCombobox } from "@/components/mentor-combobox"
import {
  WorkExperienceModulesFields,
  type WorkExperienceModuleFormRow,
} from "@/components/work-experience-modules-fields"
import type { CandidateMentorFormRow } from "@/lib/types/mentor"
import { MultiSelect, MultiSelectOption } from "@/components/ui/multi-select"
import { BenefitsSelector } from "@/components/ui/benefits-selector"
import type { EmployerBenefit } from "@/lib/types/benefits"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Candidate, Competition, Achievement, AchievementType } from "@/lib/types/candidate"
import { parseLocalDateFromApi } from "@/lib/utils/work-experience-dates"
import { salaryRangeOrderError, wholeSalaryFieldError } from "@/lib/utils/qg-value"
import {
  SHIFT_TYPE_LABELS,
  WORK_MODE_LABELS,
  MBTI_TYPES,
  CERTIFICATION_LEVEL_LABELS_DB,
  CertificationLevelDb,
  ACHIEVEMENT_TYPE_LABELS,
  AchievementTypeDb,
  CANDIDATE_SOURCE_DB,
  CANDIDATE_SOURCE_LABELS,
  type CandidateSourceDb,
  parseCandidateSource,
  CALL_STATUS_DB,
  CALL_STATUS_UI_ORDER,
  CALL_STATUS_LABELS,
  type CallStatusDb,
} from "@/lib/constants/candidate-enums"
import { SALARY_POLICY_DB_LABELS, type SalaryPolicyDb } from "@/lib/types/employer"
import { salaryPolicyToSelectValue } from "@/lib/utils/salary-policy-display"
import {
  shiftTypeToSelectValue,
  workModeToSelectValue,
} from "@/lib/utils/shift-work-mode-display"
import {
  EmployerCombobox,
  type EmployerComboboxNestedCreationProps,
  type SelectedEmployer as WorkExperienceSelectedEmployer,
} from "@/components/employer-combobox"
import { fetchEmployerById, type BuildCreateEmployerDtoOptions } from "@/lib/services/employers-api"
import { fetchProjectById } from "@/lib/services/projects-lookup-api"
import { fetchCertificationById } from "@/lib/services/certifications-lookup-api"
import { ProjectCombobox, type SelectedProject } from "@/components/project-combobox"
import type { ProjectLookups } from "@/components/project-creation-dialog"
import {
  CertificationCombobox,
  type SelectedCertification,
} from "@/components/certification-combobox"
import { UniversityCombobox } from "@/components/university-combobox"
import { EducationCampusLocationSelect } from "@/components/candidates/education-campus-location-select"
import { WorkExperienceOfficeLocationSelect } from "@/components/candidates/work-experience-office-location-select"
import {
  collectUnresolvedCatalogRefs,
  hasPrefillContent,
  mergeCandidatePrefill,
} from "@/lib/candidate/resume-to-candidate-form"
import {
  buildEmployerCreatePrefillFromWorkExperience,
  buildProjectCreatePrefillFromProjectExperience,
} from "@/lib/utils/call-notes-extract-create-prefill"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CheckCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  CANDIDATE_FORM_DIALOG_SHELL_CLASS,
} from "@/lib/utils/candidate-form-dialog-layout"
import { toast } from "sonner"
import {
  getWorkExperienceDateFieldErrors,
  getWorkExperienceDateSuggestion,
  getWorkExperienceDateWarningMessage,
} from "@/lib/utils/work-experience-dates"
import {
  showCandidateCreationValidationToast,
  type CandidateCreationValidationErrors,
} from "@/lib/utils/candidate-creation-validation-toast"
import type { LookupItem } from "@/lib/services/lookups-api"
import type { CertificationIssuer } from "@/lib/types/certification"
import type {
  CandidateCreateSubmitResult,
  CandidateSubmitOptions,
  PendingResumeRetry,
  ResumeUploadStage,
} from "@/lib/contracts/candidate-resume"
import { uploadCandidateResume } from "@/lib/services/candidate-resume-api"
import { ResumeFileInput } from "@/components/candidates/resume-file-input"
import { ResumeUploadStatus } from "@/components/candidates/resume-upload-status"
import { ResumeOpenButton } from "@/components/candidates/resume-open-button"
import { formatResumeFileSize } from "@/lib/utils/candidate-resume"
import { format } from "date-fns"
import { buildTechStackMultiSelectOptions } from "@/lib/utils/tech-stack-lookup"
import { buildTimeSupportZoneMultiSelectOptions } from "@/lib/utils/time-support-zone-lookup"
import { buildDegreeComboboxOptions } from "@/lib/utils/degree-lookup"
import { buildMajorComboboxOptions } from "@/lib/utils/major-lookup"

/** Lookups from backend for candidate form dropdowns (aligned with employer/project dialogs). */
export interface CandidateLookups {
  techStacks: LookupItem[]
  /** From `/api/timesupportzones` — same as EmployerCreationDialog. */
  timeSupportZones?: LookupItem[]
  /** From `/api/benefits` — same as EmployerCreationDialog. */
  benefits?: LookupItem[]
  /** From `/api/degrees` — education combobox. */
  degrees?: LookupItem[]
  /** From `/api/majors` — education combobox. */
  majors?: LookupItem[]
  /** From GET `/api/CertificationIssuers` — certification create / issuing body. */
  certificationIssuers?: CertificationIssuer[]
}

// Option interface for comboboxes
interface ComboboxOption {
  value: string
  label: string
}

export interface ProjectExperience {
  id: string
  projectId: number | null
  projectName: string
  contributionNotes: string
  /** Candidate was the main owner of delivery on this WE project. Default false. */
  isMainContribution: boolean
  /** Linked project catalog fields (persisted via PATCH /api/projects/{id}). */
  projectType?: string
  status?: string
  description?: string
  latestUpdate?: string
  startDate?: Date | undefined
  endDate?: Date | undefined
  link?: string
  averageTeamSize?: string
  verticalDomains?: string[]
  horizontalDomains?: string[]
  technicalDomains?: string[]
  technicalAspects?: string[]
  clientLocations?: string[]
  publishPlatforms?: string[]
  downloadCount?: string
  /** Set when project catalog fields change and need explicit catalog save. */
  projectCatalogDirty?: boolean
}

export interface WorkExperienceOfficeLocation {
  id: string
  country: string
  city: string
  address: string
  isHeadquarters: boolean
}

export interface WorkExperienceLayoffRow {
  id: string
  layoffDate: Date | undefined
  affectedEmployees: string
  reason: string
}

export interface WorkExperienceBenefit {
  id: string
  name: string
  hasValue: boolean
  amount: number | null
  unit: "PKR" | "percent" | null
}

export interface WorkExperience {
  id: string
  /** Numeric employer ID for API payloads; null if none selected. */
  employerId: number | null
  /** Office PK (`employerLocationId` on the WE API). Null = unknown office. */
  employerLocationId: number | null
  employerName: string
  jobTitle: string
  projects: ProjectExperience[]
  modules: WorkExperienceModuleFormRow[]
  startDate: Date | undefined
  endDate: Date | undefined
  techStacks: string[]
  shiftType: string
  workMode: string
  /** WE-owned salary policy display label (optional). */
  salaryPolicy: string
  /** Whole-number PKR string. Empty when unset. */
  minimumSalary: string
  maximumSalary: string
  timeSupportZones: string[]
  benefits: WorkExperienceBenefit[]
  /** Employer catalog scalars (persisted via PATCH /api/employers/{id}). */
  headcount?: string
  foundedYear?: string
  types?: string[]
  status?: string
  /** Employer catalog LinkedIn URL. */
  linkedinUrl?: string
  locations?: WorkExperienceOfficeLocation[]
  layoffs?: WorkExperienceLayoffRow[]
  /** Set when employer catalog fields change and need explicit catalog save. */
  employerCatalogDirty?: boolean
}

export interface CandidateCertification {
  id: string
  certificationId: number | null
  certificationName: string
  certificationIssuerName: string | null
  /** Resume parser: prefill Issuing Body / Create Issuer website when linking catalog. */
  certificationIssuerWebsiteUrl?: string | null
  /** DB enum certification_level_enum (lowercase) */
  certificationLevel: CertificationLevelDb | ""
  issueDate: Date | undefined
  expiryDate: Date | undefined
  certificationUrl: string
}

export interface CandidateEducation {
  id: string
  universityLocationId: string
  universityLocationName: string
  campusLocationId: number | null
  degreeName: string
  majorName: string
  startMonth: Date | undefined
  endMonth: Date | undefined
  grades: string
  isTopper: boolean
  isCheetah: boolean
}

export interface CandidateFormData {
  // Basic Information
  name: string
  postingTitle: string  // Add this
  city: string
  currentSalary: string
  expectedSalary: string
  cnic: string
  contactNumber: string
  email: string
  linkedinUrl: string
  githubUrl: string
  source: string
  callStatus: CallStatusDb | ""
  callDate: Date | undefined
  
  // Work Experience - dynamic array (includes orphan WE rows with nested projects)
  workExperiences: WorkExperience[]
  
  // Certifications - dynamic array
  certifications: CandidateCertification[]
  
  // Education - dynamic array
  educations: CandidateEducation[]
  
  // Standalone Tech Stacks - overall technical skills (not tied to specific employer)
  techStacks: string[]
  // Personality Type
  personalityType: string
  // Achievements - dynamic array (renamed from competitions)
  achievements: Achievement[]
  // Competitions - DEPRECATED: Use achievements instead. Kept for backward compatibility
  competitions: Competition[]
  finalRemarks: string
  mentors: CandidateMentorFormRow[]
}

// Option lists will be populated from backend APIs (employers, projects, tech stacks, etc.)
// Reusable Combobox component following Shadcn/ui pattern
interface ComboboxProps {
  options: ComboboxOption[]
  value: string
  onValueChange: (value: string) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyMessage?: string
  className?: string
  disabled?: boolean
  creatable?: boolean
  onCreateNew?: (value: string) => void | Promise<void>
  createLabel?: string
  /** When value is empty (e.g. resume import with only a university name), show on trigger and seed list search on open. */
  parsedSearchHint?: string
  /** API catalog only — used for create/exists checks so resume-prefilled names are not treated as catalog hits. */
  catalogOptions?: ComboboxOption[]
}

function ReusableCombobox({
  options,
  value,
  onValueChange,
  placeholder = "Select option...",
  searchPlaceholder = "Search...",
  emptyMessage = "No option found.",
  className,
  disabled = false,
  creatable = false,
  onCreateNew,
  createLabel,
  parsedSearchHint,
  catalogOptions,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [searchValue, setSearchValue] = React.useState("")

  // Handle wheel and touch events to enable scrolling
  const handleWheel = React.useCallback((e: React.WheelEvent) => {
    e.stopPropagation()
  }, [])

  // Filter options based on search
  const filteredOptions = React.useMemo(() => {
    if (!searchValue.trim()) return options
    const searchLower = searchValue.toLowerCase()
    return options.filter(option => 
      option.label.toLowerCase().includes(searchLower) ||
      option.value.toLowerCase().includes(searchLower)
    )
  }, [options, searchValue])

  const existenceSource = catalogOptions ?? options

  const valueExistsInCatalog = React.useMemo(() => {
    if (!value?.trim()) return false
    const v = value.trim().toLowerCase()
    return existenceSource.some(
      (option) =>
        option.value.toLowerCase() === v || option.label.toLowerCase() === v
    )
  }, [existenceSource, value])

  // Check if search value already exists in catalog (or full options when catalogOptions omitted)
  const searchValueExists = React.useMemo(() => {
    if (!searchValue.trim()) return false
    const searchLower = searchValue.trim().toLowerCase()
    const existsInSource = existenceSource.some(
      (option) =>
      option.value.toLowerCase() === searchLower ||
      option.label.toLowerCase() === searchLower
    )
    if (catalogOptions) return existsInSource
    return (
      existsInSource ||
      (!!value?.trim() && value.trim().toLowerCase() === searchLower)
    )
  }, [catalogOptions, existenceSource, value, searchValue])

  // Show create when query has no exact catalog match (degree/major); legacy comboboxes also require empty filter list
  const shouldShowCreate =
    creatable &&
    searchValue.trim().length >= 2 && 
    !searchValueExists && 
    (catalogOptions != null || filteredOptions.length === 0)

  const [createInProgress, setCreateInProgress] = React.useState(false)
  const handleCreateNew = async () => {
    const trimmed = searchValue.trim()
    if (!creatable || !trimmed || createInProgress) return
    setCreateInProgress(true)
    try {
      if (onCreateNew) {
        await Promise.resolve(onCreateNew(trimmed))
      } else {
        onValueChange(trimmed)
      }
      setSearchValue("")
      setOpen(false)
    } catch {
      // Parent may toast; keep popover open for retry
    } finally {
      setCreateInProgress(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (creatable && e.key === "Enter" && shouldShowCreate) {
      e.preventDefault()
      void handleCreateNew()
    }
    if (e.key === "Escape") {
      setOpen(false)
      setSearchValue("")
    }
  }
  
  return (
    <Popover
      open={open}
      onOpenChange={(isOpen) => {
        setOpen(isOpen)
        if (isOpen) {
          const hint = parsedSearchHint?.trim()
          if (hint && (!value?.trim() || !valueExistsInCatalog)) {
            setSearchValue(hint)
          }
        } else {
          setSearchValue("")
        }
      }}
    >
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={`w-full justify-between ${className || ""}`}
          disabled={disabled || createInProgress}
        >
          {value?.trim()
            ? (options.find((option) => option.value === value)?.label ?? value)
            : parsedSearchHint?.trim()
              ? parsedSearchHint.trim()
              : placeholder}
          <ChevronsUpDown className="opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-[--radix-popover-trigger-width] p-0"
        onWheel={handleWheel}
        >
        <Command shouldFilter={false}>
          <CommandInput 
            placeholder={searchPlaceholder} 
            className="h-9"
            value={searchValue}
            onValueChange={setSearchValue}
            onKeyDown={handleKeyDown}
          />
          <CommandList>
            {filteredOptions.length > 0 && (
              <CommandGroup>
                {filteredOptions.map((option) => (
                  <CommandItem
                    key={option.value}
                    value={option.value}
                    onSelect={(currentValue) => {
                      onValueChange(currentValue === value ? "" : currentValue)
                      setOpen(false)
                      setSearchValue("")
                    }}
                    className="cursor-pointer"
                  >
                    {option.label}
                    <Check
                      className={`ml-auto ${value === option.value ? "opacity-100" : "opacity-0"}`}
                    />
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {shouldShowCreate && filteredOptions.length === 0 && (
              <CommandEmpty>
                <div className="py-2 px-2 text-center text-sm text-muted-foreground">
                  {emptyMessage}
                </div>
              </CommandEmpty>
            )}
            {shouldShowCreate && (
              <CommandGroup>
                <CommandItem
                  value={searchValue}
                  onSelect={() => void handleCreateNew()}
                  disabled={createInProgress}
                  className={`cursor-pointer font-medium text-primary ${filteredOptions.length > 0 ? "border-t border-border" : ""}`}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  {createLabel
                    ? searchValue.trim()
                      ? `Create "${searchValue.trim()}"`
                      : createLabel
                    : `Add "${searchValue.trim()}"`}
                </CommandItem>
              </CommandGroup>
            )}
            {filteredOptions.length === 0 && !shouldShowCreate && (
              <CommandEmpty>{emptyMessage}</CommandEmpty>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

/** Preloads employer name by ID when editing a row that has employerId but no cached name. */
function WorkExperienceEmployerCombobox({
  experience,
  index,
  disabled,
  error,
  createEmployerLookups,
  nestedEmployerCreation,
  onEmployerChange,
}: {
  experience: WorkExperience
  index: number
  disabled: boolean
  error: boolean
  createEmployerLookups: BuildCreateEmployerDtoOptions
  nestedEmployerCreation?: EmployerComboboxNestedCreationProps
  onEmployerChange: (i: number, sel: WorkExperienceSelectedEmployer) => void
}) {
  const [preloadedName, setPreloadedName] = React.useState<string | null>(null)

  React.useEffect(() => {
    setPreloadedName(null)
    if (experience.employerId == null) return
    if (experience.employerName?.trim()) return
    let cancelled = false
    fetchEmployerById(experience.employerId)
      .then((e) => {
        if (!cancelled) setPreloadedName(e.name)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [experience.id, experience.employerId, experience.employerName])

  // Persist preloaded display name into form state (employerId already present from API).
  React.useEffect(() => {
    if (
      preloadedName &&
      experience.employerId != null &&
      !experience.employerName?.trim()
    ) {
      onEmployerChange(index, { id: experience.employerId, name: preloadedName })
    }
  }, [preloadedName, experience.employerId, experience.employerName, experience.id, index, onEmployerChange])

  const value: WorkExperienceSelectedEmployer =
    experience.employerId == null
      ? null
      : experience.employerName?.trim() || preloadedName
        ? {
            id: experience.employerId,
            name: (experience.employerName?.trim() || preloadedName)!,
          }
        : null

  const createEmployerPrefill = React.useMemo(
    () =>
      experience.employerId == null
        ? buildEmployerCreatePrefillFromWorkExperience(experience)
        : undefined,
    [experience],
  )

  return (
    <EmployerCombobox
      id={`work-experience-employer-${index}`}
      label="Employer *"
      value={value}
      onChange={(sel) => onEmployerChange(index, sel)}
      disabled={disabled}
      error={error}
      createEmployerLookups={createEmployerLookups}
      nestedEmployerCreation={nestedEmployerCreation}
      parsedNameHint={
        experience.employerId == null ? experience.employerName?.trim() || undefined : undefined
      }
      createEmployerPrefill={createEmployerPrefill}
    />
  )
}

/** Preloads project name by ID when editing a row that has projectId but no cached name. */
function WorkExperienceProjectCombobox({
  experience,
  experienceIndex,
  project,
  projectIndex,
  disabled,
  error,
  onLinkedProjectChange,
  projectLookups,
  onCreateTechStack,
  onCreateTechnicalAspect,
  onCreateClientLocation,
}: {
  experience: WorkExperience
  experienceIndex: number
  project: ProjectExperience
  projectIndex: number
  disabled: boolean
  error: boolean
  onLinkedProjectChange: (expIdx: number, projIdx: number, sel: SelectedProject) => void
  projectLookups?: ProjectLookups
  onCreateTechStack?: (name: string, context?: { aspectTypeId: number }) => Promise<void>
  onCreateTechnicalAspect?: (name: string) => Promise<void>
  onCreateClientLocation?: (name: string) => Promise<LookupItem | void>
}) {
  const [preloadedName, setPreloadedName] = React.useState<string | null>(null)
  const [preloadedEmployerName, setPreloadedEmployerName] = React.useState<string | null>(null)

  React.useEffect(() => {
    setPreloadedEmployerName(null)
    if (experience.employerId == null) return
    if (experience.employerName?.trim()) return
    let cancelled = false
    fetchEmployerById(experience.employerId)
      .then((e) => {
        if (!cancelled) setPreloadedEmployerName(e.name)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [experience.id, experience.employerId, experience.employerName])

  React.useEffect(() => {
    setPreloadedName(null)
    if (project.projectId == null) return
    if (project.projectName?.trim()) return
    let cancelled = false
    fetchProjectById(project.projectId)
      .then((p) => {
        if (!cancelled) setPreloadedName(p.name)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [project.id, project.projectId, project.projectName])

  React.useEffect(() => {
    if (
      preloadedName &&
      project.projectId != null &&
      !project.projectName?.trim()
    ) {
      onLinkedProjectChange(experienceIndex, projectIndex, {
        id: project.projectId,
        name: preloadedName,
      })
    }
  }, [
    preloadedName,
    project.projectId,
    project.projectName,
    project.id,
    experienceIndex,
    projectIndex,
    onLinkedProjectChange,
  ])

  const value: SelectedProject =
    project.projectId == null
      ? null
      : project.projectName?.trim() || preloadedName
        ? {
            id: project.projectId,
            name: (project.projectName?.trim() || preloadedName)!,
          }
        : null

  const resolvedEmployerName =
    experience.employerName?.trim() || preloadedEmployerName?.trim() || ""

  const createProjectInitialEmployer: WorkExperienceSelectedEmployer =
    experience.employerId != null && resolvedEmployerName
      ? { id: experience.employerId, name: resolvedEmployerName }
      : null

  const createProjectEmployerNameHint =
    experience.employerId == null ? experience.employerName?.trim() || undefined : undefined

  const createProjectPrefill = React.useMemo(
    () =>
    project.projectId == null
        ? buildProjectCreatePrefillFromProjectExperience(project)
        : undefined,
    [project],
  )

  return (
    <ProjectCombobox
      id={`work-exp-project-${experienceIndex}-${projectIndex}`}
      label="Project *"
      value={value}
      onChange={(sel) => onLinkedProjectChange(experienceIndex, projectIndex, sel)}
      disabled={disabled}
      error={error}
      parsedNameHint={project.projectId == null ? project.projectName?.trim() || undefined : undefined}
      createProjectInitialEmployer={createProjectInitialEmployer}
      createProjectEmployerNameHint={createProjectEmployerNameHint}
      createProjectPrefill={createProjectPrefill}
      projectLookups={projectLookups}
      onCreateTechStack={onCreateTechStack}
      onCreateTechnicalAspect={onCreateTechnicalAspect}
      onCreateClientLocation={onCreateClientLocation}
    />
  )
}

/** Preloads certification label/issuer by ID when editing a row that has certificationId but no cached name. */
function CandidateCertificationComboboxRow({
  index,
  cert,
  disabled,
  error,
  onCertificationChange,
  certificationIssuers,
  certificationIssuersLoading,
  onCertificationIssuerCreated,
}: {
  index: number
  cert: CandidateCertification
  disabled: boolean
  error: boolean
  onCertificationChange: (idx: number, sel: SelectedCertification) => void
  certificationIssuers?: CertificationIssuer[]
  certificationIssuersLoading?: boolean
  onCertificationIssuerCreated?: (issuer: CertificationIssuer) => void
}) {
  const [preloadedName, setPreloadedName] = React.useState<string | null>(null)
  const [preloadedIssuer, setPreloadedIssuer] = React.useState<string | null>(null)

  React.useEffect(() => {
    setPreloadedName(null)
    setPreloadedIssuer(null)
    if (cert.certificationId == null) return
    if (cert.certificationName?.trim()) return
    let cancelled = false
    fetchCertificationById(cert.certificationId)
      .then((c) => {
        if (!cancelled) {
          setPreloadedName(c.name)
          setPreloadedIssuer(c.issuerName)
        }
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [cert.id, cert.certificationId, cert.certificationName])

  React.useEffect(() => {
    if (
      preloadedName &&
      cert.certificationId != null &&
      !cert.certificationName?.trim()
    ) {
      onCertificationChange(index, {
        id: cert.certificationId,
        name: preloadedName,
        issuerName: preloadedIssuer,
      })
    }
  }, [
    preloadedName,
    preloadedIssuer,
    cert.certificationId,
    cert.certificationName,
    cert.id,
    index,
    onCertificationChange,
  ])

  const value: SelectedCertification = (() => {
    if (cert.certificationId == null) return null
    const displayName = cert.certificationName?.trim() || preloadedName
    if (!displayName) return null
    const issuerName = cert.certificationName?.trim()
      ? cert.certificationIssuerName ?? null
      : preloadedIssuer
    return {
      id: cert.certificationId,
      name: displayName,
      issuerName: issuerName ?? null,
    }
  })()

  return (
    <CertificationCombobox
      id={`candidate-certification-${index}`}
      label="Certification *"
      value={value}
      onChange={(sel) => onCertificationChange(index, sel)}
      disabled={disabled}
      error={error}
      parsedNameHint={
        cert.certificationId == null ? cert.certificationName?.trim() || undefined : undefined
      }
      parsedIssuerHint={
        cert.certificationId == null ? cert.certificationIssuerName?.trim() || undefined : undefined
      }
      parsedIssuerWebsiteHint={
        cert.certificationId == null
          ? cert.certificationIssuerWebsiteUrl?.trim() || undefined
          : undefined
      }
      issuers={certificationIssuers}
      issuersLoading={certificationIssuersLoading}
      onIssuerCreated={onCertificationIssuerCreated}
    />
  )
}

type DialogMode = "create" | "edit"

// Verification state for tracking which fields have been verified
export interface VerificationState {
  verifiedFields: Set<string>
  modifiedFields: Set<string>
}

export type { CandidateSubmitOptions, CandidateCreateSubmitResult } from "@/lib/contracts/candidate-resume"

interface CandidateCreationDialogProps {
  children?: React.ReactNode
  mode?: DialogMode
  candidateData?: Candidate
  showVerification?: boolean  // Enable verification UI mode (automatically true in edit mode, optional for create mode)
  onSubmit?: (
    data: CandidateFormData,
    options?: CandidateSubmitOptions,
  ) => Promise<CandidateCreateSubmitResult | void>
  /** Called after a resume is successfully attached (create retry or edit replacement). */
  onResumeAttached?: () => void
  onOpenChange?: (open: boolean) => void
  open?: boolean
  /** Tech stacks from `/api/techstacks`; same pattern as employer/project dialogs. */
  lookups?: CandidateLookups
  /** When set, "+ Add" creates via API and parent should refresh `lookups.techStacks`. */
  onCreateTechStack?: (name: string, context?: { aspectTypeId: number }) => Promise<void>
  /** When set, "+ Add Time Zone" persists via API; parent should refresh `lookups.timeSupportZones`. */
  onCreateTimeSupportZone?: (name: string) => Promise<void>
  /** Disable tech stack multi-selects while lookups are loading. */
  techStacksLoading?: boolean
  /** Disable time support zone multi-selects while lookups are loading. */
  timeSupportZonesLoading?: boolean
  /** When set, "Add Benefit" in work-experience BenefitsSelector calls API; parent refreshes `lookups.benefits`. */
  onCreateBenefit?: (name: string) => Promise<EmployerBenefit | null | void>
  /** Disable benefits selector while lookups are loading. */
  benefitsLoading?: boolean
  /** Create degree via POST `/api/degrees`; parent refreshes `lookups.degrees`. */
  onCreateDegree?: (name: string) => Promise<void>
  /** Create major via POST `/api/majors`; parent refreshes `lookups.majors`. */
  onCreateMajor?: (name: string) => Promise<void>
  /** After inline Create Issuer from certification combobox; parent refreshes issuer lookup. */
  onCertificationIssuerCreated?: (issuer: CertificationIssuer) => void
  /** Disable degree/major comboboxes while loading. */
  degreesMajorsLoading?: boolean
  /** Disable certification create / issuer pickers while issuers load. */
  certificationIssuersLoading?: boolean
  /** When opening Create Candidate, merge this partial snapshot (e.g. resume parser). Parent should clear after `onCreatePrefillConsumed`. */
  createPrefill?: Partial<CandidateFormData> | null
  /** Resume file that produced `createPrefill` (Auto-Profiler); attached to the Resume input so it uploads on create. */
  createPrefillResumeFile?: File | null
  /** Called after prefill is merged so parent can set `createPrefill` to null (avoids resetting form on re-render). */
  onCreatePrefillConsumed?: () => void
  /**
   * When opening Edit Candidate after Call Notes extract, use this form snapshot once
   * instead of re-deriving from `candidateData` (empty-only merges already applied).
   */
  editFormBootstrap?: CandidateFormData | null
  /** Called after edit bootstrap is consumed. */
  onEditFormBootstrapConsumed?: () => void
  /**
   * When set (Create Candidate flow), work-experience "+ Add New Employer" opens
   * {@link EmployerCreationDialog} with full lookups and create handlers.
   */
  nestedEmployerCreation?: EmployerComboboxNestedCreationProps
  /**
   * When set (Create Candidate flow), nested "+ Create New Project" opens
   * {@link ProjectCreationDialog} with client locations, technical aspects, and create handlers.
   */
  nestedProjectCreation?: NestedProjectCreationProps
  /** Recruiter: omit salary / WE compensation inputs (POST body stripped in API layer). */
  hideCompensationFields?: boolean
}

export type { EmployerComboboxNestedCreationProps as NestedEmployerCreationProps }

/** Lookups and create handlers for nested project creation from work-experience rows. */
export interface NestedProjectCreationProps {
  lookups: {
    clientLocations: LookupItem[]
    technicalAspects: LookupItem[]
    technicalAspectTypes?: MultiSelectOption[]
    verticalDomains?: MultiSelectOption[]
    horizontalDomains?: MultiSelectOption[]
    technicalDomains?: MultiSelectOption[]
  }
  onCreateTechnicalAspect?: (name: string) => Promise<void>
  onCreateClientLocation?: (name: string) => Promise<LookupItem | void>
}

const createEmptyProject = (): ProjectExperience => ({
  id: crypto.randomUUID(),
  projectId: null,
  projectName: "",
  contributionNotes: "",
  isMainContribution: false,
  projectType: "",
  status: "",
  description: "",
  latestUpdate: "",
  link: "",
  averageTeamSize: "",
  verticalDomains: [],
  horizontalDomains: [],
  technicalDomains: [],
  technicalAspects: [],
  clientLocations: [],
  publishPlatforms: [],
  downloadCount: "",
})

const createEmptyOffice = (): WorkExperienceOfficeLocation => ({
  id: crypto.randomUUID(),
  country: "",
  city: "",
  address: "",
  isHeadquarters: false,
})

const createEmptyLayoff = (): WorkExperienceLayoffRow => ({
  id: crypto.randomUUID(),
  layoffDate: undefined,
  affectedEmployees: "",
  reason: "",
})

const createEmptyWorkExperience = (): WorkExperience => ({
  id: crypto.randomUUID(),
  employerId: null,
  employerLocationId: null,
  employerName: "",
  jobTitle: "",
  projects: [],
  modules: [],
  startDate: undefined,
  endDate: undefined,
  techStacks: [],
  shiftType: "",
  workMode: "",
  salaryPolicy: "",
  minimumSalary: "",
  maximumSalary: "",
  timeSupportZones: [],
  benefits: [],
})

const createEmptyCertification = (): CandidateCertification => ({
  id: crypto.randomUUID(),
  certificationId: null,
  certificationName: "",
  certificationIssuerName: null,
  certificationIssuerWebsiteUrl: null,
  certificationLevel: "" as CertificationLevelDb | "",
  issueDate: undefined,
  expiryDate: undefined,
  certificationUrl: "",
})

/** Map API / legacy values to numeric catalog id for the certification combobox. */
function parseCertificationCatalogId(raw: unknown): number | null {
  if (raw === null || raw === undefined || raw === "") return null
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : null
  const n = Number(String(raw).trim())
  return Number.isFinite(n) ? n : null
}

// DB enums for dropdowns (shift_type_enum, work_mode_enum, mbti_type, certification_level_enum, achievement_type_enum)
const shiftTypeOptions: ComboboxOption[] = (Object.entries(SHIFT_TYPE_LABELS) as [keyof typeof SHIFT_TYPE_LABELS, string][]).map(
  ([value, label]) => ({ value, label })
)
const workModeOptions: ComboboxOption[] = (Object.entries(WORK_MODE_LABELS) as [keyof typeof WORK_MODE_LABELS, string][]).map(
  ([value, label]) => ({ value, label })
)
const salaryPolicyOptions: ComboboxOption[] = (
  Object.entries(SALARY_POLICY_DB_LABELS) as [SalaryPolicyDb, string][]
).map(([, label]) => ({ value: label, label }))
/** Labels match DB enum `mbti_type` (four-letter codes only). */
const personalityTypeOptions: ComboboxOption[] = MBTI_TYPES.map((t) => ({
  value: t,
  label: t,
}))
const certificationLevelOptions: ComboboxOption[] = (Object.entries(CERTIFICATION_LEVEL_LABELS_DB) as [CertificationLevelDb, string][]).map(
  ([value, label]) => ({ value, label })
)
const achievementTypeOptions: ComboboxOption[] = (Object.entries(ACHIEVEMENT_TYPE_LABELS) as [AchievementTypeDb, string][]).map(
  ([value, label]) => ({ value, label })
)

const createEmptyEducation = (): CandidateEducation => ({
  id: crypto.randomUUID(),
  universityLocationId: "",
  universityLocationName: "",
  campusLocationId: null,
  degreeName: "",
  majorName: "",
  startMonth: undefined,
  endMonth: undefined,
  grades: "",
  isTopper: false,
  isCheetah: false,
})

const initialFormData: CandidateFormData = {
  name: "",
  postingTitle: "",
  city: "",
  currentSalary: "",
  expectedSalary: "",
  cnic: "",
  contactNumber: "",
  email: "",
  linkedinUrl: "",
  githubUrl: "",
  source: "",
  callStatus: "",
  callDate: undefined,
  workExperiences: [],
  certifications: [],
  educations: [],
  techStacks: [],
  personalityType: "",
    achievements: [],
    competitions: [],
  finalRemarks: "",
  mentors: [],
}

// Convert Candidate to CandidateFormData for edit mode
export const candidateToFormData = (candidate: Candidate): CandidateFormData => {
  return {
    name: candidate.name || "",
    postingTitle: candidate.postingTitle || "",  // Add this
    city: candidate.city || "",
    currentSalary: candidate.currentSalary?.toString() || "",
    expectedSalary: candidate.expectedSalary?.toString() || "",
    cnic: candidate.cnic || "",
    contactNumber: candidate.mobileNo || "",
    email: candidate.email || "",
    linkedinUrl: candidate.linkedinUrl || "",
    githubUrl: candidate.githubUrl || "",
    source: parseCandidateSource(candidate.source),
    callStatus: candidate.callStatus ?? "",
    callDate: candidate.callDate ? parseLocalDateFromApi(candidate.callDate) : undefined,
    workExperiences: candidate.workExperiences?.map(we => ({
      id: we.id,
      employerId: we.employerId ?? null,
      employerLocationId: we.employerLocationId ?? null,
      employerName: we.employerName || "",
      jobTitle: we.jobTitle || "",
      projects: we.projects.map((proj) => ({
        id: proj.id,
        projectId: proj.projectId ?? null,
        projectName: proj.projectName || "",
        contributionNotes: proj.contributionNotes ?? "",
        isMainContribution: proj.isMainContribution === true,
        projectType: proj.projectType ?? "",
        status: proj.status ?? "",
        description: proj.description ?? "",
        latestUpdate: proj.latestUpdate ?? "",
        startDate: proj.startDate,
        endDate: proj.endDate,
        link: proj.link ?? "",
        averageTeamSize:
          proj.averageTeamSize != null
            ? String(proj.averageTeamSize)
            : proj.teamSize != null
              ? String(proj.teamSize)
              : "",
        verticalDomains: proj.verticalDomains ?? [],
        horizontalDomains: proj.horizontalDomains ?? [],
        technicalDomains: proj.technicalDomains ?? [],
        technicalAspects: proj.technicalAspects ?? [],
        clientLocations: proj.clientLocations ?? [],
        publishPlatforms: proj.publishPlatforms ?? [],
        downloadCount:
          proj.downloadCount != null ? String(proj.downloadCount) : "",
      })),
      startDate: we.startDate,
      endDate: we.endDate,
      techStacks: we.techStacks || [],
      shiftType: shiftTypeToSelectValue(we.shiftType || "") || "",
      workMode: workModeToSelectValue(we.workMode || "") || "",
      salaryPolicy: salaryPolicyToSelectValue(we.salaryPolicy),
      minimumSalary: we.minimumSalary != null ? String(we.minimumSalary) : "",
      maximumSalary: we.maximumSalary != null ? String(we.maximumSalary) : "",
      timeSupportZones: we.timeSupportZones || [],
      headcount: we.headcount != null ? String(we.headcount) : "",
      foundedYear: we.foundedYear != null ? String(we.foundedYear) : "",
      types: we.types ?? [],
      status: we.status ?? "",
      linkedinUrl: we.linkedinUrl ?? "",
      locations:
        we.locations?.map((loc, i) => ({
          id: `office-${we.id}-${i}`,
          country: loc.country ?? "",
          city: loc.city ?? "",
          address: loc.address ?? "",
          isHeadquarters: loc.isHeadquarters ?? false,
        })) ?? [],
      layoffs:
        we.layoffs?.map((row, i) => ({
          id: `layoff-${we.id}-${i}`,
          layoffDate: row.layoffDate ?? undefined,
          affectedEmployees:
            row.affectedEmployees != null ? String(row.affectedEmployees) : "",
          reason: row.reason ?? "",
        })) ?? [],
      benefits: we.benefits?.map(b => ({
        id: b.id,
        name: b.name,
        hasValue: b.hasValue ?? (b.amount != null || b.unit != null),
        amount: b.amount ?? null,
        unit: b.unit || null,
      })) || [],
      modules: (we.modules ?? []).map((module) => ({
        id: module.id,
        createNew: false,
        moduleId: module.moduleId,
        projectId: module.projectId,
        projectName: module.projectName,
        name: module.name,
        description: module.description ?? "",
        techStacks: module.techStacks ?? [],
        contribution: module.contribution ?? "",
      })),
      })) || [],
    certifications:
      candidate.certifications?.map((cert) => ({
        id: cert.id,
        certificationId: parseCertificationCatalogId(cert.certificationId),
        certificationName: cert.certificationName || "",
        certificationIssuerName: cert.certificationIssuerName ?? null,
        certificationLevel: (() => {
          const v = cert.certificationLevel
          if (!v) return "" as CertificationLevelDb | ""
          const lower = String(v).toLowerCase()
          return (lower in CERTIFICATION_LEVEL_LABELS_DB ? lower : "") as CertificationLevelDb | ""
        })(),
        issueDate: cert.issueDate,
        expiryDate: cert.expiryDate,
        certificationUrl: cert.certificationUrl || "",
      })) || [],
    educations: candidate.educations?.map(edu => ({
      id: edu.id,
      universityLocationId: edu.universityLocationId || "",
      universityLocationName: edu.universityLocationName || "",
      campusLocationId: edu.campusLocationId ?? null,
      degreeName: edu.degreeName || "",
      majorName: edu.majorName || "",
      startMonth: edu.startMonth,
      endMonth: edu.endMonth,
      grades: edu.grades || "",
      isTopper: edu.isTopper ?? false,
      isCheetah: edu.isCheetah ?? false,
    })) || [],
    techStacks: candidate.techStacks || [],
    personalityType: candidate.personalityType || "",
    achievements: candidate.achievements?.map(ach => ({
      id: ach.id,
      name: ach.name || "",
      achievementType: (ach.achievementType || "") as AchievementType,
      ranking: ach.ranking || "",
      year: ach.year,
      url: ach.url || "",
      description: ach.description || "",
    })) || candidate.competitions?.map(comp => ({
      id: comp.id,
      name: comp.competitionName || "",
      achievementType: "competition" as AchievementType,
      ranking: comp.ranking || "",
      year: comp.year,
      url: comp.url || "",
      description: "",
    })) || [],
    competitions: candidate.competitions?.map(comp => ({
      id: comp.id,
      competitionName: comp.competitionName || "",
      ranking: comp.ranking || "",
      year: comp.year,
      url: comp.url || "",
    })) || [],
    finalRemarks: candidate.finalRemarks ?? "",
    mentors: (candidate.mentors ?? []).map((link) => ({
      id: link.id,
      mentorId: link.mentorId,
      createNew: false,
      name: link.name,
      designation: link.designation ?? "",
      employerId: link.employerId,
      employerName: link.employerName,
      relationship: link.relationship ?? "",
      reasoning: link.reasoning ?? "",
    })),
  }
}

export function CandidateCreationDialog({
  children,
  mode = "create",
  candidateData,
  showVerification: showVerificationProp,
  onSubmit,
  onResumeAttached,
  onOpenChange,
  open: controlledOpen,
  lookups,
  onCreateTechStack,
  onCreateTimeSupportZone,
  techStacksLoading = false,
  timeSupportZonesLoading = false,
  onCreateBenefit,
  benefitsLoading = false,
  onCreateDegree,
  onCreateMajor,
  onCertificationIssuerCreated,
  degreesMajorsLoading = false,
  certificationIssuersLoading = false,
  createPrefill = null,
  createPrefillResumeFile = null,
  onCreatePrefillConsumed,
  editFormBootstrap = null,
  onEditFormBootstrapConsumed,
  nestedEmployerCreation,
  nestedProjectCreation,
  hideCompensationFields = false,
}: CandidateCreationDialogProps) {
  // Always show verification by default (both create and edit modes), allow override via prop
  const showVerification = showVerificationProp ?? true
  const [internalOpen, setInternalOpen] = useState(false)
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen
  
  // Unsaved changes warning state
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false)
  const pendingCloseRef = useRef(false)
  
  // Track initial form data for change detection
  const initialFormDataRef = useRef<CandidateFormData | null>(null)
  /** After resume (or other) prefill is applied in create mode, keep form when parent clears `createPrefill`. */
  const appliedPrefillSessionRef = useRef(false)
  /** After Call Notes extract bootstrap is applied in edit mode, keep form when parent clears `editFormBootstrap`. */
  const appliedEditBootstrapSessionRef = useRef(false)
  const createDialogPrevOpenRef = useRef(false)
  const onCreatePrefillConsumedRef = useRef(onCreatePrefillConsumed)
  onCreatePrefillConsumedRef.current = onCreatePrefillConsumed
  const onEditFormBootstrapConsumedRef = useRef(onEditFormBootstrapConsumed)
  onEditFormBootstrapConsumedRef.current = onEditFormBootstrapConsumed
  
  // Verification state - track which fields have been verified this session
  const [verifiedFields, setVerifiedFields] = useState<Set<string>>(new Set())
  const [modifiedFields, setModifiedFields] = useState<Set<string>>(new Set())

  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState<CandidateFormData>(() => {
    if (mode === "edit" && candidateData) {
      return candidateToFormData(candidateData)
    }
    return initialFormData
  })

  // Resume file state
  const [resumeFile, setResumeFile] = useState<File | null>(null)
  const [resumeUploadStage, setResumeUploadStage] = useState<ResumeUploadStage | null>(null)
  const [resumeUploadError, setResumeUploadError] = useState<string | null>(null)
  const [pendingResumeRetry, setPendingResumeRetry] = useState<PendingResumeRetry | null>(null)
  const [isCreatingCandidate, setIsCreatingCandidate] = useState(false)
  const [isRetryingResume, setIsRetryingResume] = useState(false)

  // Sticky navigation tabs state
  const [activeTab, setActiveTab] = useState<string>("basic-info")
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const isScrollingRef = useRef(false)

  // Define sections for navigation
  const sections = useMemo(() => [
    { id: "basic", sectionId: "basic-info", label: "Basic Information", shortLabel: "Basic" },
    { id: "work-experience", sectionId: "work-experience", label: "Work Experience", shortLabel: "Experience" },
    { id: "tech-stacks", sectionId: "tech-stacks", label: "Tech Stacks", shortLabel: "Tech" },
    { id: "education", sectionId: "education", label: "Education", shortLabel: "Education" },
    { id: "certifications", sectionId: "certifications", label: "Certifications", shortLabel: "Certs" },
    { id: "competitions", sectionId: "competitions", label: "Achievements", shortLabel: "Achievements" },
    { id: "mentors", sectionId: "mentors", label: "Mentors", shortLabel: "Mentors" },
    { id: "final-remarks", sectionId: "final-remarks", label: "Final Remarks", shortLabel: "Final Remarks" },
  ], [])

  const [workExperienceOpen, setWorkExperienceOpen] = useState(true)
  const [techStacksOpen, setTechStacksOpen] = useState(true)
  const [certificationsOpen, setCertificationsOpen] = useState(true)
  const [competitionsOpen, setCompetitionsOpen] = useState(true)
  const [mentorsOpen, setMentorsOpen] = useState(true)
  const [finalRemarksOpen, setFinalRemarksOpen] = useState(true)
  const [educationOpen, setEducationOpen] = useState(true)
  
  const employerCreateLookups: BuildCreateEmployerDtoOptions = useMemo(
    () => ({
      timeSupportZonesLookup:
        nestedEmployerCreation?.lookups.timeSupportZones ?? lookups?.timeSupportZones ?? [],
      awardsLookup: nestedEmployerCreation?.lookups.awards ?? [],
      getCountryId: (countryName: string) =>
        nestedEmployerCreation?.countries.find((c) => c.name === countryName)?.id ?? 0,
    }),
    [nestedEmployerCreation, lookups?.timeSupportZones]
  )

  const projectCreateLookups: ProjectLookups = useMemo(
    () => ({
      techStacks: lookups?.techStacks ?? [],
      technicalAspects: nestedProjectCreation?.lookups.technicalAspects ?? [],
      clientLocations: nestedProjectCreation?.lookups.clientLocations ?? [],
      technicalAspectTypes: nestedProjectCreation?.lookups.technicalAspectTypes,
      verticalDomains: nestedProjectCreation?.lookups.verticalDomains,
      horizontalDomains: nestedProjectCreation?.lookups.horizontalDomains,
      technicalDomains: nestedProjectCreation?.lookups.technicalDomains,
    }),
    [lookups?.techStacks, nestedProjectCreation]
  )

  /** Tech stacks: API list + any values already on the candidate (edit) or newly selected. */
  const selectedTechStackNames = useMemo(() => {
    const names = new Set<string>()
    formData.techStacks.forEach((t) => {
      if (t?.trim()) names.add(t.trim())
    })
    formData.workExperiences.forEach((we) => {
      we.techStacks.forEach((t) => {
        if (t?.trim()) names.add(t.trim())
      })
    })
    return names
  }, [formData.techStacks, formData.workExperiences])

  const techStackOptions: MultiSelectOption[] = useMemo(
    () =>
      buildTechStackMultiSelectOptions(
        lookups?.techStacks ?? [],
        selectedTechStackNames,
      ),
    [lookups?.techStacks, selectedTechStackNames],
  )

  /** Time support zones: API list + values already on work experiences. */
  const selectedTimeSupportZoneNames = useMemo(() => {
    const names = new Set<string>()
    formData.workExperiences.forEach((we) => {
      we.timeSupportZones.forEach((z) => {
        if (z?.trim()) names.add(z.trim())
      })
    })
    return names
  }, [formData.workExperiences])

  const timeSupportZoneOptions: MultiSelectOption[] = useMemo(
    () =>
      buildTimeSupportZoneMultiSelectOptions(
        lookups?.timeSupportZones ?? [],
        selectedTimeSupportZoneNames,
      ),
    [lookups?.timeSupportZones, selectedTimeSupportZoneNames],
  )

  const selectedDegreeNames = useMemo(() => {
    const names = new Set<string>()
    formData.educations.forEach((edu) => {
      const n = edu.degreeName?.trim()
      if (n) names.add(n)
    })
    return names
  }, [formData.educations])

  const selectedMajorNames = useMemo(() => {
    const names = new Set<string>()
    formData.educations.forEach((edu) => {
      const n = edu.majorName?.trim()
      if (n) names.add(n)
    })
    return names
  }, [formData.educations])

  const degreeOptions: ComboboxOption[] = useMemo(
    () => buildDegreeComboboxOptions(lookups?.degrees ?? [], selectedDegreeNames),
    [lookups?.degrees, selectedDegreeNames],
  )

  const majorOptions: ComboboxOption[] = useMemo(
    () => buildMajorComboboxOptions(lookups?.majors ?? [], selectedMajorNames),
    [lookups?.majors, selectedMajorNames],
  )

  const isDegreeInCatalog = useCallback(
    (name: string) => {
      const n = name.trim().toLowerCase()
      if (!n) return false
      return (lookups?.degrees ?? []).some(
        (d) => d?.name?.trim().toLowerCase() === n
      )
    },
    [lookups?.degrees]
  )

  const isMajorInCatalog = useCallback(
    (name: string) => {
      const n = name.trim().toLowerCase()
      if (!n) return false
      return (lookups?.majors ?? []).some(
        (m) => m?.name?.trim().toLowerCase() === n
      )
    },
    [lookups?.majors]
  )

  const [errors, setErrors] = useState<{
    basic?: Partial<Record<keyof Omit<CandidateFormData, 'workExperiences' | 'certifications' | 'educations' | 'achievements' | 'competitions' | 'mentors'>, string>>
    mentors?: { [index: number]: Partial<Record<"name" | "employerId" | "mentorId", string>> }
    workExperiences?: { 
      [index: number]: Partial<Record<keyof Omit<WorkExperience, 'projects' | 'modules'>, string>> & {
        projects?: { [projectIndex: number]: Partial<Record<keyof ProjectExperience, string>> }
        modules?: { [moduleIndex: number]: Partial<Record<"projectId" | "name" | "moduleId", string>> }
      }
    }
    achievements?: { [index: number]: Partial<Record<keyof Achievement, string>> }
    certifications?: { [index: number]: Partial<Record<keyof CandidateCertification, string>> }
    educations?: { [index: number]: Partial<Record<keyof CandidateEducation, string>> }
    competitions?: { [index: number]: Partial<Record<keyof Competition, string>> }
    techStacks?: string
  }>({})
  

  // Check if form has unsaved changes
  const hasUnsavedChanges = useMemo(() => {
    if (!initialFormDataRef.current) return false
    return JSON.stringify(formData) !== JSON.stringify(initialFormDataRef.current) || 
           verifiedFields.size > 0
  }, [formData, verifiedFields])

  const workExperienceDateIssues = useMemo(() => {
    const issues: Record<
      number,
      { warning: string; suggestion: ReturnType<typeof getWorkExperienceDateSuggestion> }
    > = {}
    formData.workExperiences.forEach((we, index) => {
      const suggestion = getWorkExperienceDateSuggestion(we.startDate, we.endDate)
      const warning = getWorkExperienceDateWarningMessage(
        index + 1,
        we.startDate,
        we.endDate,
        { hasSuggestion: suggestion != null },
      )
      if (warning) issues[index] = { warning, suggestion }
    })
    return issues
  }, [formData.workExperiences])
  
  // Calculate verification progress
  const verificationProgress = useMemo(() => {
    if (!showVerification) return { total: 0, verified: 0, percentage: 0 }
    
    // Count all verifiable fields
    const basicFields = ["name", "city", "currentSalary", "expectedSalary", "cnic", "contactNumber", "email", "linkedinUrl", "githubUrl", "personalityType", "callDate"]
    let total = basicFields.length
    let verified = basicFields.filter(f => verifiedFields.has(f)).length
    
    // Work experiences (includes nested projects)
    formData.workExperiences.forEach((_, idx) => {
      const weFields = ['employerId', 'employerName', 'employerLocationId', 'jobTitle', 'startDate', 'endDate', 'techStacks', 'shiftType', 'workMode', 'salaryPolicy', 'minimumSalary', 'maximumSalary']
      weFields.forEach(f => {
        total++
        if (verifiedFields.has(`workExperiences.${idx}.${f}`)) verified++
      })
      formData.workExperiences[idx]?.projects?.forEach((_, projIdx) => {
        total += 3 // projectId, contributionNotes, isMainContribution
        if (verifiedFields.has(`workExperiences.${idx}.projects.${projIdx}.projectId`)) verified++
        if (verifiedFields.has(`workExperiences.${idx}.projects.${projIdx}.contributionNotes`)) verified++
        if (verifiedFields.has(`workExperiences.${idx}.projects.${projIdx}.isMainContribution`)) verified++
      })
      formData.workExperiences[idx]?.modules?.forEach((moduleRow, moduleIndex) => {
        const moduleFields = [
          `workExperiences.${idx}.modules.${moduleIndex}.projectId`,
          `workExperiences.${idx}.modules.${moduleIndex}.contribution`,
          moduleRow.createNew
            ? `workExperiences.${idx}.modules.${moduleIndex}.name`
            : `workExperiences.${idx}.modules.${moduleIndex}.moduleId`,
        ]
        if (moduleRow.createNew) {
          moduleFields.push(
            `workExperiences.${idx}.modules.${moduleIndex}.description`,
            `workExperiences.${idx}.modules.${moduleIndex}.techStacks`,
          )
        }
        total += moduleFields.length
        moduleFields.forEach((field) => {
          if (verifiedFields.has(field)) verified++
        })
      })
    })
    
    // Certifications
    formData.certifications.forEach((_, idx) => {
      total += 5 // certificationId, certificationLevel, issueDate, expiryDate, certificationUrl
      if (verifiedFields.has(`certifications.${idx}.certificationId`)) verified++
      if (verifiedFields.has(`certifications.${idx}.certificationLevel`)) verified++
      if (verifiedFields.has(`certifications.${idx}.issueDate`)) verified++
      if (verifiedFields.has(`certifications.${idx}.expiryDate`)) verified++
      if (verifiedFields.has(`certifications.${idx}.certificationUrl`)) verified++
    })
    
    // Educations
    formData.educations.forEach((_, idx) => {
      total += 7 // universityLocationName, campusLocationId, degreeName, majorName, startMonth, endMonth, grades
      if (verifiedFields.has(`educations.${idx}.universityLocationName`)) verified++
      if (verifiedFields.has(`educations.${idx}.campusLocationId`)) verified++
      if (verifiedFields.has(`educations.${idx}.degreeName`)) verified++
      if (verifiedFields.has(`educations.${idx}.majorName`)) verified++
      if (verifiedFields.has(`educations.${idx}.startMonth`)) verified++
      if (verifiedFields.has(`educations.${idx}.endMonth`)) verified++
      if (verifiedFields.has(`educations.${idx}.grades`)) verified++
    })
    
    // Tech Stacks
    total += 1 // techStacks
    if (verifiedFields.has('techStacks')) verified++
    
    // Achievements
    formData.achievements.forEach((_, idx) => {
      const achievementFields = ['name', 'achievementType', 'ranking', 'year', 'url', 'description']
      achievementFields.forEach(f => {
        total++
        if (verifiedFields.has(`achievements.${idx}.${f}`)) verified++
      })
    })
    
    formData.mentors.forEach((row, idx) => {
      const mentorFields = row.createNew
        ? ["name", "designation", "employerId", "relationship", "reasoning"]
        : ["mentorId", "relationship", "reasoning"]
      mentorFields.forEach((field) => {
        total++
        if (verifiedFields.has(`mentors.${idx}.${field}`)) verified++
      })
    })

    total += 1
    if (verifiedFields.has("finalRemarks")) verified++
    
    return { 
      total, 
      verified, 
      percentage: total > 0 ? Math.round((verified / total) * 100) : 0 
    }
  }, [showVerification, verifiedFields, formData])

  const unresolvedCatalogRefs = useMemo(
    () => collectUnresolvedCatalogRefs(formData),
    [formData],
  )

  const scrollToCatalogAnchor = useCallback((anchorId: string) => {
    document.getElementById(anchorId)?.scrollIntoView({ behavior: "smooth", block: "center" })
  }, [])
  
  // Get progress color based on percentage
  const getProgressColor = (percentage: number): string => {
    if (percentage === 100) return 'bg-green-500 hover:bg-green-600'
    if (percentage >= 70) return 'bg-yellow-500 hover:bg-yellow-600'
    return 'bg-red-500 hover:bg-red-600'
  }

  // Section Progress Badge Component
  const SectionProgressBadge = ({ 
    percentage, 
    verified, 
    total 
  }: { 
    percentage: number
    verified: number
    total: number 
  }) => {
    if (!showVerification || total === 0) return null

    return (
      <Badge 
        variant="default" 
        className={`${getProgressColor(percentage)} text-white text-xs font-medium`}
      >
        {percentage}% verified ({verified}/{total})
      </Badge>
    )
  }

  // Calculate section-specific progress
  const basicInfoProgress = useMemo(() => {
    if (!showVerification) return { percentage: 0, verified: 0, total: 0 }
    const basicFields = ["name", "city", "currentSalary", "expectedSalary", "cnic", "contactNumber", "email", "linkedinUrl", "githubUrl", "personalityType", "callDate"]
    const total = basicFields.length
    const verified = basicFields.filter(f => verifiedFields.has(f)).length
    return { 
      percentage: total > 0 ? Math.round((verified / total) * 100) : 0,
      verified,
      total
    }
  }, [showVerification, verifiedFields])

  const workExperienceProgress = useMemo(() => {
    if (!showVerification) return { percentage: 0, verified: 0, total: 0 }
    let total = 0
    let verified = 0
    
    formData.workExperiences.forEach((_, idx) => {
      const weFields = ['employerId', 'employerName', 'employerLocationId', 'jobTitle', 'startDate', 'endDate', 'techStacks', 'shiftType', 'workMode', 'salaryPolicy', 'minimumSalary', 'maximumSalary', 'timeSupportZones']
      weFields.forEach(f => {
        total++
        if (verifiedFields.has(`workExperiences.${idx}.${f}`)) verified++
      })
      // Projects within work experience
      formData.workExperiences[idx]?.projects?.forEach((_, projIdx) => {
        total += 3 // projectId, contributionNotes, isMainContribution
        if (verifiedFields.has(`workExperiences.${idx}.projects.${projIdx}.projectId`)) verified++
        if (verifiedFields.has(`workExperiences.${idx}.projects.${projIdx}.contributionNotes`)) verified++
        if (verifiedFields.has(`workExperiences.${idx}.projects.${projIdx}.isMainContribution`)) verified++
      })
      formData.workExperiences[idx]?.modules?.forEach((moduleRow, moduleIndex) => {
        const moduleFields = [
          `workExperiences.${idx}.modules.${moduleIndex}.projectId`,
          `workExperiences.${idx}.modules.${moduleIndex}.contribution`,
          moduleRow.createNew
            ? `workExperiences.${idx}.modules.${moduleIndex}.name`
            : `workExperiences.${idx}.modules.${moduleIndex}.moduleId`,
        ]
        if (moduleRow.createNew) {
          moduleFields.push(
            `workExperiences.${idx}.modules.${moduleIndex}.description`,
            `workExperiences.${idx}.modules.${moduleIndex}.techStacks`,
          )
        }
        total += moduleFields.length
        moduleFields.forEach((field) => {
          if (verifiedFields.has(field)) verified++
        })
      })
    })
    
    return { 
      percentage: total > 0 ? Math.round((verified / total) * 100) : 0,
      verified,
      total
    }
  }, [showVerification, verifiedFields, formData.workExperiences])

  const educationProgress = useMemo(() => {
    if (!showVerification) return { percentage: 0, verified: 0, total: 0 }
    let total = 0
    let verified = 0
    
    formData.educations.forEach((_, idx) => {
      const eduFields = ['universityLocationName', 'campusLocationId', 'degreeName', 'majorName', 'startMonth', 'endMonth', 'grades', 'isTopper', 'isCheetah']
      eduFields.forEach(f => {
        total++
        if (verifiedFields.has(`educations.${idx}.${f}`)) verified++
      })
    })
    
    return { 
      percentage: total > 0 ? Math.round((verified / total) * 100) : 0,
      verified,
      total
    }
  }, [showVerification, verifiedFields, formData.educations])

  const certificationsProgress = useMemo(() => {
    if (!showVerification) return { percentage: 0, verified: 0, total: 0 }
    let total = 0
    let verified = 0
    
    formData.certifications.forEach((_, idx) => {
      const certFields = [
        'certificationId',
        'certificationLevel',
        'issueDate',
        'expiryDate',
        'certificationUrl',
      ]
      certFields.forEach(f => {
        total++
        if (verifiedFields.has(`certifications.${idx}.${f}`)) verified++
      })
    })
    
    return { 
      percentage: total > 0 ? Math.round((verified / total) * 100) : 0,
      verified,
      total
    }
  }, [showVerification, verifiedFields, formData.certifications])

  const achievementsProgress = useMemo(() => {
    if (!showVerification) return { percentage: 0, verified: 0, total: 0 }
    let total = 0
    let verified = 0
    
    formData.achievements.forEach((_, idx) => {
      const achievementFields = ['name', 'achievementType', 'ranking', 'year', 'url', 'description']
      achievementFields.forEach(f => {
        total++
        if (verifiedFields.has(`achievements.${idx}.${f}`)) verified++
      })
    })
    
    return { 
      percentage: total > 0 ? Math.round((verified / total) * 100) : 0,
      verified,
      total
    }
  }, [showVerification, verifiedFields, formData.achievements])

  const mentorsProgress = useMemo(() => {
    if (!showVerification) return { percentage: 0, verified: 0, total: 0 }
    let total = 0
    let verified = 0
    formData.mentors.forEach((row, idx) => {
      const mentorFields = row.createNew
        ? ["name", "designation", "employerId", "relationship", "reasoning"]
        : ["mentorId", "relationship", "reasoning"]
      mentorFields.forEach((field) => {
        total++
        if (verifiedFields.has(`mentors.${idx}.${field}`)) verified++
      })
    })
    return {
      percentage: total > 0 ? Math.round((verified / total) * 100) : 0,
      verified,
      total,
    }
  }, [showVerification, verifiedFields, formData.mentors])

  const finalRemarksProgress = useMemo(() => {
    if (!showVerification) return { percentage: 0, verified: 0, total: 0 }
    const verified = verifiedFields.has("finalRemarks") ? 1 : 0
    return {
      percentage: verified > 0 ? 100 : 0,
      verified,
      total: 1,
    }
  }, [showVerification, verifiedFields])

  const techStacksProgress = useMemo(() => {
    if (!showVerification) return { percentage: 0, verified: 0, total: 0 }
    const total = 1 // techStacks field
    const verified = verifiedFields.has('techStacks') ? 1 : 0
    return { 
      percentage: verified > 0 ? 100 : 0,
      verified,
      total
    }
  }, [showVerification, verifiedFields])

  // Helper function to get progress for a section by sectionId
  const getSectionProgress = (sectionId: string) => {
    switch (sectionId) {
      case 'basic-info':
        return basicInfoProgress
      case 'work-experience':
        return workExperienceProgress
      case 'tech-stacks':
        return techStacksProgress
      case 'education':
        return educationProgress
      case 'certifications':
        return certificationsProgress
      case 'competitions':
        return achievementsProgress
      case 'final-remarks':
        return finalRemarksProgress
      default:
        return { percentage: 0, verified: 0, total: 0 }
    }
  }

  // Helper function to get verification badge color (matches section badge styling)
  const getVerificationBadgeColor = (percentage: number): string => {
    if (percentage === 100) {
      return 'bg-green-500 hover:bg-green-600 text-white'
    } else if (percentage >= 70) {
      return 'bg-yellow-500 hover:bg-yellow-600 text-white'
    } else {
      return 'bg-red-500 hover:bg-red-600 text-white'
    }
  }

  // Helper function to scroll to element
  const scrollToElement = useCallback((element: HTMLElement, container: HTMLElement, yOffset: number, sectionId: string) => {
    // Set flag to prevent IntersectionObserver from interfering
    isScrollingRef.current = true
    
    // Update active tab immediately
    setActiveTab(sectionId)
    
    // Use double requestAnimationFrame to ensure layout is fully calculated
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        // Verify element is still within container (important for nested dialogs)
        if (!container.contains(element)) {
          isScrollingRef.current = false
          return
        }
        
        // Get current scroll position
        const currentScrollTop = container.scrollTop
        
        // Get bounding rects (relative to viewport)
        const containerRect = container.getBoundingClientRect()
        const elementRect = element.getBoundingClientRect()
        
        // Calculate element's position relative to container's scrollable content
        // For nested dialogs, we need to account for the container's position
        // elementRect.top is relative to viewport
        // containerRect.top is container's position in viewport
        // currentScrollTop is how much we've scrolled within the container
        const elementTopInContainer = elementRect.top - containerRect.top + currentScrollTop
        
        // Calculate target scroll position accounting for sticky header
        const targetScrollTop = elementTopInContainer - yOffset
        
        container.scrollTo({
          top: Math.max(0, targetScrollTop),
          behavior: 'smooth'
        })
        
        // Reset flag after scroll completes (smooth scroll takes ~500ms)
        setTimeout(() => {
          isScrollingRef.current = false
        }, 600)
      })
    })
  }, [])

  // Scroll to section function
  const scrollToSection = useCallback((sectionId: string) => {
    if (!scrollContainerRef.current) return
    
    const container = scrollContainerRef.current
    const yOffset = 80 // Account for sticky header
    
    // Find element within the container (for nested dialog support)
    const elementInContainer = container.querySelector(`#${sectionId}`) as HTMLElement
    const element = elementInContainer || (() => {
      const el = document.getElementById(sectionId)
      return el && container.contains(el) ? el : null
    })()
    
    if (!element) return
    
    // Ensure section is expanded before scrolling (for collapsible sections)
    const sectionKey = sections.find(s => s.sectionId === sectionId)?.id
    let needsExpansion = false
    
    if (sectionKey) {
      // Expand the section if it's collapsed
      if (sectionKey === "work-experience" && !workExperienceOpen) {
        setWorkExperienceOpen(true)
        needsExpansion = true
      } else if (sectionKey === "tech-stacks" && !techStacksOpen) {
        setTechStacksOpen(true)
        needsExpansion = true
      } else if (sectionKey === "education" && !educationOpen) {
        setEducationOpen(true)
        needsExpansion = true
      } else if (sectionKey === "certifications" && !certificationsOpen) {
        setCertificationsOpen(true)
        needsExpansion = true
      } else if (sectionKey === "mentors" && !mentorsOpen) {
        setMentorsOpen(true)
        needsExpansion = true
      } else if (sectionKey === "final-remarks" && !finalRemarksOpen) {
        setFinalRemarksOpen(true)
        needsExpansion = true
      }
    }
    
    // Wait for expansion animation if needed, otherwise use small delay for DOM rendering
    const delay = needsExpansion ? 350 : 100
    setTimeout(() => {
      scrollToElement(element, container, yOffset, sectionId)
    }, delay)
  }, [sections, workExperienceOpen, techStacksOpen, educationOpen, certificationsOpen, competitionsOpen, mentorsOpen, finalRemarksOpen, scrollToElement])

  // Handle tab change
  const handleTabChange = useCallback((value: string) => {
    scrollToSection(value)
  }, [scrollToSection])

  // Reset tab highlight and scroll when the dialog opens or closes
  useEffect(() => {
    if (!open) {
      setActiveTab("basic-info")
      return
    }

    setActiveTab("basic-info")
    isScrollingRef.current = false

    const frame = requestAnimationFrame(() => {
      scrollContainerRef.current?.scrollTo({ top: 0, behavior: "auto" })
    })

    return () => cancelAnimationFrame(frame)
  }, [open])

  useScrollSpySection(scrollContainerRef, {
    enabled: open,
    sectionIds: sections.map((section) => section.sectionId),
    scrollOffset: 80,
    onActiveSectionChange: setActiveTab,
    isScrollingRef,
    layoutKey: `${formData.workExperiences.length}-${formData.educations.length}-${formData.certifications.length}`,
  })
  
  // Toggle field verification
  const toggleFieldVerification = useCallback((fieldPath: string) => {
    setVerifiedFields(prev => {
      const newSet = new Set(prev)
      if (newSet.has(fieldPath)) {
        newSet.delete(fieldPath)
      } else {
        newSet.add(fieldPath)
      }
      return newSet
    })
  }, [])

  // Helper function to get all field paths for a section
  const getSectionFieldPaths = useCallback((sectionId: string): string[] => {
    const fields: string[] = []
    
    switch (sectionId) {
      case 'basic-info':
        fields.push('name', 'city', 'currentSalary', 'expectedSalary', 'cnic', 'contactNumber', 'email', 'linkedinUrl', 'githubUrl', 'callDate')
        break
      
      case 'work-experience':
        formData.workExperiences.forEach((_, idx) => {
          fields.push(
            `workExperiences.${idx}.employerId`,
            `workExperiences.${idx}.employerName`,
            `workExperiences.${idx}.employerLocationId`,
            `workExperiences.${idx}.jobTitle`,
            `workExperiences.${idx}.startDate`,
            `workExperiences.${idx}.endDate`,
            `workExperiences.${idx}.techStacks`,
            `workExperiences.${idx}.shiftType`,
            `workExperiences.${idx}.workMode`,
            `workExperiences.${idx}.salaryPolicy`,
            `workExperiences.${idx}.minimumSalary`,
            `workExperiences.${idx}.maximumSalary`,
            `workExperiences.${idx}.timeSupportZones`,
            `workExperiences.${idx}.benefits`
          )
          // Projects within work experience
          formData.workExperiences[idx]?.projects?.forEach((_, projIdx) => {
            fields.push(
              `workExperiences.${idx}.projects.${projIdx}.projectId`,
              `workExperiences.${idx}.projects.${projIdx}.contributionNotes`,
              `workExperiences.${idx}.projects.${projIdx}.isMainContribution`
            )
          })
          formData.workExperiences[idx]?.modules?.forEach((moduleRow, moduleIndex) => {
            fields.push(`workExperiences.${idx}.modules.${moduleIndex}.projectId`)
            fields.push(`workExperiences.${idx}.modules.${moduleIndex}.contribution`)
            if (moduleRow.createNew) {
              fields.push(
                `workExperiences.${idx}.modules.${moduleIndex}.name`,
                `workExperiences.${idx}.modules.${moduleIndex}.description`,
                `workExperiences.${idx}.modules.${moduleIndex}.techStacks`,
              )
            } else {
              fields.push(`workExperiences.${idx}.modules.${moduleIndex}.moduleId`)
            }
          })
        })
        break
      
      case 'tech-stacks':
        fields.push('techStacks')
        break
      
      case 'education':
        formData.educations.forEach((_, idx) => {
          fields.push(
            `educations.${idx}.universityLocationName`,
            `educations.${idx}.campusLocationId`,
            `educations.${idx}.degreeName`,
            `educations.${idx}.majorName`,
            `educations.${idx}.startMonth`,
            `educations.${idx}.endMonth`,
            `educations.${idx}.grades`,
            `educations.${idx}.isTopper`,
            `educations.${idx}.isCheetah`
          )
        })
        break
      
      case 'certifications':
        formData.certifications.forEach((_, idx) => {
          fields.push(
            `certifications.${idx}.certificationId`,
            `certifications.${idx}.certificationLevel`,
            `certifications.${idx}.issueDate`,
            `certifications.${idx}.expiryDate`,
            `certifications.${idx}.certificationUrl`
          )
        })
        break
      
      case 'competitions':
        formData.achievements.forEach((_, idx) => {
          fields.push(
            `achievements.${idx}.name`,
            `achievements.${idx}.achievementType`,
            `achievements.${idx}.ranking`,
            `achievements.${idx}.year`,
            `achievements.${idx}.url`,
            `achievements.${idx}.description`
          )
        })
        break
      
      case 'mentors':
        formData.mentors.forEach((row, idx) => {
          const mentorFields = row.createNew
            ? ["name", "designation", "employerId", "relationship", "reasoning"]
            : ["mentorId", "relationship", "reasoning"]
          mentorFields.forEach((field) => fields.push(`mentors.${idx}.${field}`))
        })
        break

      case 'final-remarks':
        fields.push('finalRemarks')
        break
    }
    
    return fields
  }, [formData])

  // Check if all fields in a section are verified
  const isSectionFullyVerified = useCallback((sectionId: string): boolean => {
    const sectionFields = getSectionFieldPaths(sectionId)
    if (sectionFields.length === 0) return false
    
    return sectionFields.every(field => verifiedFields.has(field))
  }, [getSectionFieldPaths, verifiedFields])

  // Handle verify all fields in a section
  const handleVerifyAllSection = useCallback((sectionId: string, checked: boolean) => {
    const sectionFields = getSectionFieldPaths(sectionId)
    
    setVerifiedFields(prev => {
      const newSet = new Set(prev)
      if (checked) {
        // Add all fields
        sectionFields.forEach(field => newSet.add(field))
      } else {
        // Remove all fields
        sectionFields.forEach(field => newSet.delete(field))
      }
      return newSet
    })
  }, [getSectionFieldPaths])
  
  // Mark field as modified (auto-verify on edit when showVerification is true)
  const markFieldModified = useCallback((fieldPath: string) => {
    setModifiedFields(prev => new Set(prev).add(fieldPath))
    if (showVerification) {
      setVerifiedFields(prev => new Set(prev).add(fieldPath))
    }
  }, [showVerification])
  
  // Handle dialog close with unsaved changes check
  const setOpen = (newOpen: boolean) => {
    if (!newOpen && hasUnsavedChanges) {
      // Show warning dialog
      pendingCloseRef.current = true
      setShowUnsavedWarning(true)
      return
    }
    
    if (controlledOpen === undefined) {
      setInternalOpen(newOpen)
    }
    onOpenChange?.(newOpen)
  }
  
  // Handle confirmed close (discard changes)
  const handleConfirmClose = () => {
    setShowUnsavedWarning(false)
    pendingCloseRef.current = false
    resetForm()
    if (controlledOpen === undefined) {
      setInternalOpen(false)
    }
    onOpenChange?.(false)
  }
  
  // Handle cancel close (keep editing)
  const handleCancelClose = () => {
    setShowUnsavedWarning(false)
    pendingCloseRef.current = false
  }
  
  // Get dialog title based on mode
  const getDialogTitle = () => {
    if (mode === 'create') return 'Create New Candidate'
    // In edit mode, always show "Edit Candidate" (verification is built-in)
    return 'Edit Candidate'
  }
  
  // Get submit button text based on mode
  const getSubmitButtonText = (loading: boolean) => {
    if (loading) {
      if (mode === 'create') return 'Creating...'
      return 'Saving...'
    }
    if (mode === 'create') return 'Create Candidate'
    // In edit mode, always show "Save & Verify" since verification is built-in
    return 'Save & Verify'
  }

  const handleInputChange = (field: keyof Omit<CandidateFormData, 'workExperiences' | 'certifications' | 'educations' | 'achievements' | 'competitions' | 'mentors'>, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    markFieldModified(field)
    // Clear error when user starts typing
    if (errors.basic?.[field]) {
      setErrors(prev => ({ 
        ...prev, 
        basic: { ...prev.basic, [field]: undefined }
      }))
    }
  }

  const handleWorkExperienceEmployerChange = useCallback((index: number, selected: WorkExperienceSelectedEmployer) => {
    setFormData((prev) => ({
      ...prev,
      workExperiences: prev.workExperiences.map((exp, i) =>
        i === index
          ? {
              ...exp,
              employerId: selected?.id ?? null,
              employerName: selected?.name ?? "",
              employerLocationId: null,
            }
          : exp
      ),
    }))
    markFieldModified(`workExperiences.${index}.employerId`)
    markFieldModified(`workExperiences.${index}.employerName`)
    setErrors((prev) => {
      const idxErr = prev.workExperiences?.[index]
      if (!idxErr?.employerId && !idxErr?.employerName) return prev
      return {
        ...prev,
        workExperiences: {
          ...prev.workExperiences,
          [index]: {
            ...idxErr,
            employerId: undefined,
            employerName: undefined,
          },
        },
      }
    })
  }, [markFieldModified])

  const handleWorkExperienceLinkedProjectChange = useCallback(
    (expIndex: number, projectIndex: number, sel: SelectedProject) => {
      setFormData((prev) => ({
        ...prev,
        workExperiences: prev.workExperiences.map((exp, i) =>
          i === expIndex
            ? {
                ...exp,
                projects: exp.projects.map((p, j) =>
                  j === projectIndex
                    ? {
                        ...p,
                        projectId: sel?.id ?? null,
                        projectName: sel?.name ?? "",
                      }
                    : p
                ),
              }
            : exp
        ),
      }))
      markFieldModified(`workExperiences.${expIndex}.projects.${projectIndex}.projectId`)
      markFieldModified(`workExperiences.${expIndex}.projects.${projectIndex}.projectName`)
      setErrors((prev) => {
        const we = prev.workExperiences?.[expIndex]
        const pe = we?.projects?.[projectIndex]
        if (!we || (!pe?.projectId && !pe?.projectName)) return prev
        return {
          ...prev,
          workExperiences: {
            ...prev.workExperiences,
            [expIndex]: {
              ...we,
              projects: {
                ...we.projects,
                [projectIndex]: {
                  ...pe,
                  projectId: undefined,
                  projectName: undefined,
                },
              },
            },
          },
        }
      })
    },
    [markFieldModified]
  )

  const handleCandidateCertificationSelect = useCallback(
    (index: number, sel: SelectedCertification) => {
      setFormData((prev) => ({
        ...prev,
        certifications: prev.certifications.map((c, i) =>
          i === index
            ? {
                ...c,
                certificationId: sel?.id ?? null,
                certificationName: sel?.name ?? "",
                certificationIssuerName: sel?.issuerName ?? null,
              }
            : c
        ),
      }))
      markFieldModified(`certifications.${index}.certificationId`)
      markFieldModified(`certifications.${index}.certificationName`)
      setErrors((prev) => {
        const ce = prev.certifications?.[index]
        if (!ce?.certificationId) return prev
        return {
          ...prev,
          certifications: {
            ...prev.certifications,
            [index]: {
              ...ce,
              certificationId: undefined,
            },
          },
        }
      })
    },
    [markFieldModified]
  )

  const handleWorkExperienceChange = (
    index: number, 
    field: keyof Omit<WorkExperience, 'projects' | 'modules'>, 
    value: string | string[] | Date | undefined | WorkExperienceBenefit[] | number | null
  ) => {
    setFormData(prev => ({
      ...prev,
      workExperiences: prev.workExperiences.map((exp, i) =>
        i === index ? { ...exp, [field]: value } : exp
      )
    }))
    markFieldModified(`workExperiences.${index}.${field}`)
    
    // Clear date validation errors when either date changes
    if (field === "startDate" || field === "endDate") {
      if (
        errors.workExperiences?.[index]?.startDate ||
        errors.workExperiences?.[index]?.endDate
      ) {
        setErrors((prev) => ({
          ...prev,
          workExperiences: {
            ...prev.workExperiences,
            [index]: {
              ...prev.workExperiences?.[index],
              startDate: undefined,
              endDate: undefined,
            },
          },
        }))
      }
      return
    }
    
    // Clear error when user starts typing
    if (errors.workExperiences?.[index]?.[field]) {
      setErrors(prev => ({
        ...prev,
        workExperiences: {
          ...prev.workExperiences,
          [index]: {
            ...prev.workExperiences?.[index],
            [field]: undefined
          }
        }
      }))
    }
  }

  const handleModulesChange = (index: number, modules: WorkExperienceModuleFormRow[]) => {
    setFormData((prev) => ({
      ...prev,
      workExperiences: prev.workExperiences.map((exp, i) =>
        i === index ? { ...exp, modules } : exp,
      ),
    }))
  }

  const handleProjectChange = (
    expIndex: number,
    projectIndex: number,
    field: keyof ProjectExperience,
    value: string
  ) => {
    setFormData(prev => ({
      ...prev,
      workExperiences: prev.workExperiences.map((exp, i) =>
        i === expIndex ? {
          ...exp,
          projects: exp.projects.map((project, j) =>
            j === projectIndex ? { ...project, [field]: value } : project
          )
        } : exp
      )
    }))
    
    // Clear error when user starts typing
    if (errors.workExperiences?.[expIndex]?.projects?.[projectIndex]?.[field]) {
      setErrors(prev => ({
        ...prev,
        workExperiences: {
          ...prev.workExperiences,
          [expIndex]: {
            ...prev.workExperiences?.[expIndex],
            projects: {
              ...prev.workExperiences?.[expIndex]?.projects,
              [projectIndex]: {
                ...prev.workExperiences?.[expIndex]?.projects?.[projectIndex],
                [field]: undefined
              }
            }
          }
        }
      }))
    }
  }

  const handleProjectMainContributionChange = (
    expIndex: number,
    projectIndex: number,
    checked: boolean,
  ) => {
    setFormData(prev => ({
      ...prev,
      workExperiences: prev.workExperiences.map((exp, i) =>
        i === expIndex
          ? {
              ...exp,
              projects: exp.projects.map((project, j) =>
                j === projectIndex ? { ...project, isMainContribution: checked } : project
              ),
            }
          : exp
      ),
    }))
    markFieldModified(`workExperiences.${expIndex}.projects.${projectIndex}.isMainContribution`)
  }

  const addProject = (expIndex: number) => {
    setFormData(prev => ({
      ...prev,
      workExperiences: prev.workExperiences.map((exp, i) =>
        i === expIndex ? {
          ...exp,
          projects: [...exp.projects, createEmptyProject()]
        } : exp
      )
    }))
  }

  const removeProject = (expIndex: number, projectIndex: number) => {
    setFormData(prev => ({
      ...prev,
      workExperiences: prev.workExperiences.map((exp, i) =>
        i === expIndex ? {
          ...exp,
          projects: exp.projects.filter((_, j) => j !== projectIndex)
        } : exp
      )
    }))
    
    // Clear errors for removed project
    if (errors.workExperiences?.[expIndex]?.projects?.[projectIndex]) {
      const newProjectErrors = { ...errors.workExperiences[expIndex].projects }
      delete newProjectErrors[projectIndex]
      setErrors(prev => ({
        ...prev,
        workExperiences: {
          ...prev.workExperiences,
          [expIndex]: {
            ...prev.workExperiences?.[expIndex],
            projects: newProjectErrors
          }
        }
      }))
    }
  }

  const addWorkExperience = () => {
    setFormData(prev => ({
      ...prev,
      workExperiences: [...prev.workExperiences, createEmptyWorkExperience()]
    }))
  }

  const removeWorkExperience = (index: number) => {
    setFormData(prev => ({
      ...prev,
      workExperiences: prev.workExperiences.filter((_, i) => i !== index)
    }))
    
    // Clear errors for removed experience
    if (errors.workExperiences?.[index]) {
      const newWorkExperienceErrors = { ...errors.workExperiences }
      delete newWorkExperienceErrors[index]
      setErrors(prev => ({
        ...prev,
        workExperiences: newWorkExperienceErrors
      }))
    }
  }

  const handleCertificationChange = (
    index: number,
    field: keyof CandidateCertification,
    value: string | Date | undefined
  ) => {
    setFormData(prev => ({
      ...prev,
      certifications: prev.certifications.map((cert, i) =>
        i === index ? { ...cert, [field]: value } : cert
      )
    }))
    
    // Clear error when user starts typing
    if (errors.certifications?.[index]?.[field]) {
      setErrors(prev => ({
        ...prev,
        certifications: {
          ...prev.certifications,
          [index]: {
            ...prev.certifications?.[index],
            [field]: undefined
          }
        }
      }))
    }
  }

  const addCertification = () => {
    setFormData(prev => ({
      ...prev,
      certifications: [...prev.certifications, createEmptyCertification()]
    }))
  }

  const removeCertification = (index: number) => {
    setFormData(prev => ({
      ...prev,
      certifications: prev.certifications.filter((_, i) => i !== index)
    }))
    
    // Clear errors for removed certification
    if (errors.certifications?.[index]) {
      const newCertificationErrors = { ...errors.certifications }
      delete newCertificationErrors[index]
      setErrors(prev => ({
        ...prev,
        certifications: newCertificationErrors
      }))
    }
  }

  const createEmptyAchievement = (): Achievement => ({
    id: `ach-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name: "",
    achievementType: "" as AchievementType,
    ranking: "",
    year: undefined,
    url: "",
    description: "",
  })

  const handleAchievementChange = (
    index: number,
    field: keyof Achievement,
    value: string | number | AchievementType | undefined
  ) => {
    setFormData(prev => ({
      ...prev,
      achievements: prev.achievements.map((ach, i) =>
        i === index ? { ...ach, [field]: value } : ach
      )
    }))
    
    // Clear error when user starts typing
    if (errors.achievements?.[index]?.[field]) {
      setErrors(prev => ({
        ...prev,
        achievements: {
          ...prev.achievements,
          [index]: {
            ...prev.achievements?.[index],
            [field]: undefined
          }
        }
      }))
    }
  }

  const createMentorRow = (createNew: boolean): CandidateMentorFormRow => ({
    id: crypto.randomUUID(),
    mentorId: null,
    createNew,
    name: "",
    designation: "",
    employerId: null,
    employerName: "",
    relationship: "",
    reasoning: "",
  })

  const addCreateMentor = () => {
    setFormData((prev) => ({ ...prev, mentors: [...prev.mentors, createMentorRow(true)] }))
  }

  const addLinkMentor = () => {
    setFormData((prev) => ({ ...prev, mentors: [...prev.mentors, createMentorRow(false)] }))
  }

  const removeMentor = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      mentors: prev.mentors.filter((_, rowIndex) => rowIndex !== index),
    }))
  }

  const updateMentorRow = (index: number, patch: Partial<CandidateMentorFormRow>) => {
    setFormData((prev) => ({
      ...prev,
      mentors: prev.mentors.map((row, rowIndex) => (rowIndex === index ? { ...row, ...patch } : row)),
    }))
  }

  const addAchievement = () => {
    setFormData(prev => ({
      ...prev,
      achievements: [...prev.achievements, createEmptyAchievement()]
    }))
  }

  const removeAchievement = (index: number) => {
    setFormData(prev => ({
      ...prev,
      achievements: prev.achievements.filter((_, i) => i !== index)
    }))
    
    // Clear errors for removed achievement
    if (errors.achievements?.[index]) {
      const newAchievementErrors = { ...errors.achievements }
      delete newAchievementErrors[index]
      setErrors(prev => ({
        ...prev,
        achievements: newAchievementErrors
      }))
    }
  }

  const handleEducationChange = (
    index: number,
    field: keyof CandidateEducation,
    value: string | Date | undefined | boolean
  ) => {
    setFormData(prev => ({
      ...prev,
      educations: prev.educations.map((edu, i) =>
        i === index ? { ...edu, [field]: value } : edu
      )
    }))

    // Clear error when user starts typing
    if (errors.educations?.[index]?.[field]) {
      setErrors(prev => ({
        ...prev,
        educations: {
          ...prev.educations,
          [index]: {
            ...prev.educations?.[index],
            [field]: undefined
          }
        }
      }))
    }
  }

  const handleEducationUniversityChange = useCallback(
    (index: number, selected: { id: number; name: string } | null) => {
      setFormData((prev) => ({
        ...prev,
        educations: prev.educations.map((edu, i) =>
          i === index
            ? {
                ...edu,
                universityLocationId: selected ? String(selected.id) : "",
                universityLocationName: selected?.name ?? "",
                campusLocationId: null,
              }
            : edu
        ),
      }))
      setErrors((prev) => {
        if (!prev.educations?.[index]?.universityLocationId) return prev
        return {
          ...prev,
          educations: {
            ...prev.educations,
            [index]: {
              ...prev.educations[index],
              universityLocationId: undefined,
            },
          },
        }
      })
    },
    []
  )

  const addEducation = () => {
    setFormData(prev => ({
      ...prev,
      educations: [...prev.educations, createEmptyEducation()]
    }))
  }

  const removeEducation = (index: number) => {
    setFormData(prev => ({
      ...prev,
      educations: prev.educations.filter((_, i) => i !== index)
    }))
    
    // Clear errors for removed education
    if (errors.educations?.[index]) {
      const newEducationErrors = { ...errors.educations }
      delete newEducationErrors[index]
      setErrors(prev => ({
        ...prev,
        educations: newEducationErrors
      }))
    }
  }

  const validateForm = (): boolean => {
    const basicErrors: Partial<Record<keyof Omit<CandidateFormData, 'workExperiences' | 'certifications' | 'educations' | 'achievements' | 'competitions' | 'mentors'>, string>> = {}
    const workExperienceErrors: { 
      [index: number]: Partial<Record<keyof Omit<WorkExperience, 'projects' | 'modules'>, string>> & {
        projects?: { [projectIndex: number]: Partial<Record<keyof ProjectExperience, string>> }
        modules?: { [moduleIndex: number]: Partial<Record<"projectId" | "name" | "moduleId", string>> }
      }
    } = {}
    const certificationErrors: { [index: number]: Partial<Record<keyof CandidateCertification, string>> } = {}
    const educationErrors: { [index: number]: Partial<Record<keyof CandidateEducation, string>> } = {}

    // Basic validation
    if (!formData.name.trim()) basicErrors.name = "Name is required"
    if (!formData.city.trim()) basicErrors.city = "City is required"
    if (!formData.email.trim()) basicErrors.email = "Email is required"
    else if (!/\S+@\S+\.\S+/.test(formData.email)) basicErrors.email = "Invalid email format"
    if (!formData.contactNumber.trim()) basicErrors.contactNumber = "Contact number is required"
    if (
      !formData.source ||
      !CANDIDATE_SOURCE_DB.includes(formData.source as CandidateSourceDb)
    ) {
      basicErrors.source = "Source is required"
    }
    if (
      !formData.callStatus ||
      !CALL_STATUS_DB.includes(formData.callStatus as CallStatusDb)
    ) {
      basicErrors.callStatus = "Call Status is required"
    }

    // URL validation
    if (formData.linkedinUrl && !formData.linkedinUrl.startsWith('http')) {
      basicErrors.linkedinUrl = "LinkedIn URL must start with http:// or https://"
    }
    if (formData.githubUrl && !formData.githubUrl.startsWith('http')) {
      basicErrors.githubUrl = "GitHub URL must start with http:// or https://"
    }

    // Work experience validation (only validate if experiences exist)
    formData.workExperiences.forEach((exp, index) => {
      const expErrors: Partial<Record<keyof Omit<WorkExperience, 'projects' | 'modules'>, string>> = {}
      const projectErrors: { [projectIndex: number]: Partial<Record<keyof ProjectExperience, string>> } = {}
      
      // Only validate if at least one field is filled (user started entering data)
      const hasAnyData =
        exp.employerId != null ||
        exp.employerName ||
        exp.jobTitle ||
        exp.projects.length > 0 ||
        exp.startDate ||
        exp.endDate ||
        exp.techStacks.length > 0 ||
        exp.shiftType ||
        exp.workMode ||
        exp.salaryPolicy ||
        !!exp.minimumSalary.trim() ||
        !!exp.maximumSalary.trim() ||
        exp.timeSupportZones.length > 0 ||
        (exp.modules?.length ?? 0) > 0

      // Orphan WE rows may have empty employer/jobTitle when they hold nested projects
      if (hasAnyData && exp.projects.length === 0) {
        if (exp.employerId == null) expErrors.employerId = "Employer is required"
        if (!exp.jobTitle.trim()) expErrors.jobTitle = "Job title is required"
      }

      const dateErrors = getWorkExperienceDateFieldErrors(
        index + 1,
        exp.startDate,
        exp.endDate,
      )
      if (dateErrors.startDate) expErrors.startDate = dateErrors.startDate
      if (dateErrors.endDate) expErrors.endDate = dateErrors.endDate

      if (!hideCompensationFields) {
        const minError = wholeSalaryFieldError(exp.minimumSalary)
        const maxError = wholeSalaryFieldError(exp.maximumSalary)
        if (minError) expErrors.minimumSalary = minError
        if (maxError) expErrors.maximumSalary = maxError
        const orderError = salaryRangeOrderError(exp.minimumSalary, exp.maximumSalary)
        if (orderError) {
          if (!expErrors.minimumSalary) expErrors.minimumSalary = orderError
          if (!expErrors.maximumSalary) expErrors.maximumSalary = orderError
        }
      }

      // Validate projects within each experience
      exp.projects.forEach((project, projectIndex) => {
        const projErrors: Partial<Record<keyof ProjectExperience, string>> = {}
        
        // Only validate if at least one project field is filled
        const hasProjectData =
          project.projectId != null ||
          !!(project.projectName && String(project.projectName).trim()) ||
          !!(project.contributionNotes && String(project.contributionNotes).trim())

        if (hasProjectData) {
          if (project.projectId == null) projErrors.projectId = "Project is required"
        }
        
        if (Object.keys(projErrors).length > 0) {
          projectErrors[projectIndex] = projErrors
        }
      })

      const moduleErrors: {
        [moduleIndex: number]: Partial<Record<"projectId" | "name" | "moduleId", string>>
      } = {}
      const seenModuleIds = new Set<number>()
      exp.modules.forEach((moduleRow, moduleIndex) => {
        const rowErrors: Partial<Record<"projectId" | "name" | "moduleId", string>> = {}
        if (moduleRow.projectId == null) rowErrors.projectId = "Main project is required"
        if (moduleRow.createNew) {
          if (!moduleRow.name.trim()) rowErrors.name = "Module name is required"
        } else if (moduleRow.moduleId == null) {
          rowErrors.moduleId = "Module is required"
        } else if (seenModuleIds.has(moduleRow.moduleId)) {
          rowErrors.moduleId = "This module is already linked"
        } else {
          seenModuleIds.add(moduleRow.moduleId)
        }
        if (Object.keys(rowErrors).length > 0) moduleErrors[moduleIndex] = rowErrors
      })
      
      if (Object.keys(expErrors).length > 0 || Object.keys(projectErrors).length > 0 || Object.keys(moduleErrors).length > 0) {
        workExperienceErrors[index] = {
          ...expErrors,
          ...(Object.keys(projectErrors).length > 0 ? { projects: projectErrors } : {}),
          ...(Object.keys(moduleErrors).length > 0 ? { modules: moduleErrors } : {}),
        }
      }
    })

    // Certification validation (only validate if certifications exist)
    formData.certifications.forEach((cert, index) => {
      const certErrors: Partial<Record<keyof CandidateCertification, string>> = {}
      
      // Only validate if at least one field is filled (user started entering data)
      const hasAnyData =
        cert.certificationId != null ||
        !!(cert.certificationName && String(cert.certificationName).trim()) ||
        cert.issueDate ||
        cert.expiryDate ||
        cert.certificationUrl

      if (hasAnyData) {
        if (cert.certificationId == null) certErrors.certificationId = "Certification is required"
        if (cert.certificationUrl && !cert.certificationUrl.startsWith('http')) {
          certErrors.certificationUrl = "Certification URL must start with http:// or https://"
        }
      }
      
      if (Object.keys(certErrors).length > 0) {
        certificationErrors[index] = certErrors
      }
    })

    // Education validation (only validate if educations exist)
    formData.educations.forEach((edu, index) => {
      const eduErrors: Partial<Record<keyof CandidateEducation, string>> = {}
      
      // Only validate if at least one field is filled (user started entering data)
      const hasAnyData = edu.universityLocationId || edu.degreeName || edu.majorName || 
                        edu.startMonth || edu.endMonth || edu.grades ||
                        edu.isTopper || edu.isCheetah
      
      if (hasAnyData) {
        if (!edu.universityLocationId) eduErrors.universityLocationId = "University is required"
        if (!edu.degreeName) eduErrors.degreeName = "Degree name is required"
      }
      
      if (Object.keys(eduErrors).length > 0) {
        educationErrors[index] = eduErrors
      }
    })

    const mentorErrors: { [index: number]: Partial<Record<"name" | "employerId" | "mentorId", string>> } = {}
    const mentorIds = new Set<number>()
    formData.mentors.forEach((row, index) => {
      const rowErrors: Partial<Record<"name" | "employerId" | "mentorId", string>> = {}
      if (row.createNew) {
        if (!row.name.trim()) rowErrors.name = "Name is required"
        if (row.employerId == null) rowErrors.employerId = "Organization is required"
      } else if (row.mentorId == null) {
        rowErrors.mentorId = "Select a mentor"
      }
      if (row.mentorId != null) {
        if (mentorIds.has(row.mentorId)) rowErrors.mentorId = "This mentor is already linked"
        mentorIds.add(row.mentorId)
      }
      if (Object.keys(rowErrors).length > 0) mentorErrors[index] = rowErrors
    })

    // Achievements validation
    const achievementErrors: { [index: number]: Partial<Record<keyof Achievement, string>> } = {}
    formData.achievements.forEach((achievement, index) => {
      const achErrors: Partial<Record<keyof Achievement, string>> = {}
      
      // Only validate if at least one field is filled (user started entering data)
      const hasAnyData = achievement.name || achievement.achievementType || achievement.ranking || 
                        achievement.year || achievement.url || achievement.description
      
      if (hasAnyData) {
        if (!achievement.name.trim()) achErrors.name = "Name is required"
        if (!achievement.achievementType) achErrors.achievementType = "Achievement type is required"
      }
      
      // URL validation
      if (achievement.url && !achievement.url.startsWith('http')) {
        achErrors.url = "URL must start with http:// or https://"
      }
      
      if (Object.keys(achErrors).length > 0) {
        achievementErrors[index] = achErrors
      }
    })

    const newErrors = {
      basic: Object.keys(basicErrors).length > 0 ? basicErrors : undefined,
      workExperiences: Object.keys(workExperienceErrors).length > 0 ? workExperienceErrors : undefined,
      certifications: Object.keys(certificationErrors).length > 0 ? certificationErrors : undefined,
      educations: Object.keys(educationErrors).length > 0 ? educationErrors : undefined,
      achievements: Object.keys(achievementErrors).length > 0 ? achievementErrors : undefined,
      mentors: Object.keys(mentorErrors).length > 0 ? mentorErrors : undefined,
    }

    setErrors(newErrors)
    const isValid =
      !newErrors.basic &&
      !newErrors.workExperiences &&
      !newErrors.certifications &&
      !newErrors.educations &&
      !newErrors.achievements &&
      !newErrors.mentors
    if (!isValid) {
      showCandidateCreationValidationToast(newErrors as CandidateCreationValidationErrors)
    }
    return isValid
  }

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    // Nested create dialogs portal in the DOM but remain React children of `#candidate-form`; ignore their submit bubble.
    if (e.target !== e.currentTarget) {
      return
    }

    if (!validateForm()) {
      return
    }

    setIsLoading(true)
    setResumeUploadError(null)
    setResumeUploadStage(null)
    setIsCreatingCandidate(true)

    try {
      const verificationState: VerificationState = {
        verifiedFields: new Set(verifiedFields),
        modifiedFields: new Set(modifiedFields),
      }
      const result = await onSubmit?.(formData, {
        verificationState,
        resumeFile,
        onResumeStageChange:
          mode === "create" ? setResumeUploadStage : undefined,
      })

      if (result?.status === "resume-upload-failed") {
        setPendingResumeRetry({
          candidateId: result.candidateId,
          candidateName: result.candidateName,
          file: result.file,
        })
        setResumeUploadError(result.error)
        return
      }

      resetForm()
      setPendingResumeRetry(null)
      if (controlledOpen === undefined) {
        setInternalOpen(false)
      }
      onOpenChange?.(false)
    } catch (error) {
      console.error("Error submitting form:", error)
    } finally {
      setIsLoading(false)
      setIsCreatingCandidate(false)
      setResumeUploadStage(null)
    }
  }

  const handleRetryResumeUpload = async () => {
    if (!pendingResumeRetry) return

    setIsRetryingResume(true)
    setResumeUploadError(null)
    setResumeUploadStage(null)

    try {
      await uploadCandidateResume({
        candidateId: pendingResumeRetry.candidateId,
        file: pendingResumeRetry.file,
        onStageChange: mode === "create" ? setResumeUploadStage : undefined,
      })
      onResumeAttached?.()
      toast.success(
        mode === "edit"
          ? "Candidate updated successfully."
          : "Resume uploaded successfully.",
      )
      resetForm()
      setPendingResumeRetry(null)
      if (controlledOpen === undefined) {
        setInternalOpen(false)
      }
      onOpenChange?.(false)
    } catch (error) {
      setResumeUploadError(
        error instanceof Error ? error.message : "Failed to upload resume.",
      )
    } finally {
      setIsRetryingResume(false)
      setResumeUploadStage(null)
    }
  }

  const handleCloseAfterPartialSuccess = () => {
    setPendingResumeRetry(null)
    setResumeUploadError(null)
    resetForm()
    if (controlledOpen === undefined) {
      setInternalOpen(false)
    }
    onOpenChange?.(false)
  }

  const handleCancel = () => {
    if (hasUnsavedChanges) {
      setShowUnsavedWarning(true)
      return
    }
    resetForm()
    if (controlledOpen === undefined) {
      setInternalOpen(false)
    }
    onOpenChange?.(false)
  }

  // Update form data when candidateData changes (for edit mode) or create opens (with optional resume prefill)
  React.useEffect(() => {
    if (!open) {
      appliedPrefillSessionRef.current = false
      appliedEditBootstrapSessionRef.current = false
      createDialogPrevOpenRef.current = false
      return
    }

    const justOpened = !createDialogPrevOpenRef.current
    createDialogPrevOpenRef.current = true

    if (mode === "edit" && candidateData) {
      const hadBootstrap = !!editFormBootstrap
      if (hadBootstrap) {
        setFormData(editFormBootstrap!)
        initialFormDataRef.current = editFormBootstrap!
        appliedEditBootstrapSessionRef.current = true
        onEditFormBootstrapConsumedRef.current?.()
      } else if (justOpened && !appliedEditBootstrapSessionRef.current) {
      const newFormData = candidateToFormData(candidateData)
      setFormData(newFormData)
      initialFormDataRef.current = newFormData
      }

      if (justOpened || hadBootstrap) {
      setErrors({})
      setVerifiedFields(new Set())
      setModifiedFields(new Set())
      setResumeFile(null)
        setPendingResumeRetry(null)
        setResumeUploadError(null)
      setWorkExperienceOpen(true)
      setTechStacksOpen(true)
      setCertificationsOpen(true)
      setEducationOpen(true)
        setFinalRemarksOpen(true)
      }
      return
    }

    if (mode === "create") {
      const hadPrefill = !!(createPrefill && hasPrefillContent(createPrefill))
      if (hadPrefill) {
        const merged = mergeCandidatePrefill(initialFormData, createPrefill!)
        setFormData(merged)
        initialFormDataRef.current = merged
        appliedPrefillSessionRef.current = true
        onCreatePrefillConsumedRef.current?.()
      } else if (justOpened && !appliedPrefillSessionRef.current) {
        setFormData(initialFormData)
        initialFormDataRef.current = initialFormData
      }

      if (justOpened || hadPrefill) {
        setErrors({})
        setVerifiedFields(new Set())
        setModifiedFields(new Set())
        setResumeFile(hadPrefill ? createPrefillResumeFile : null)
        setPendingResumeRetry(null)
        setResumeUploadError(null)
        setWorkExperienceOpen(true)
        setTechStacksOpen(true)
        setCertificationsOpen(true)
        setEducationOpen(true)
        setFinalRemarksOpen(true)
      }
    }
  }, [mode, candidateData, open, createPrefill, createPrefillResumeFile, editFormBootstrap])

  const resetForm = () => {
    if (mode === "edit" && candidateData) {
      const newFormData = candidateToFormData(candidateData)
      setFormData(newFormData)
      initialFormDataRef.current = newFormData
    } else {
      setFormData(initialFormData)
      initialFormDataRef.current = initialFormData
    }
    setErrors({})
    setVerifiedFields(new Set())
    setModifiedFields(new Set())
    setResumeFile(null)
    setPendingResumeRetry(null)
    setResumeUploadError(null)
    setWorkExperienceOpen(false)
    setTechStacksOpen(false)
    setCertificationsOpen(false)
    setEducationOpen(false)
    setFinalRemarksOpen(false)
    setMentorsOpen(false)
  }

  // Verification checkbox component
  const VerificationCheckbox = ({ fieldPath, label }: { fieldPath: string; label?: string }) => {
    if (!showVerification) return null
    
    const isVerified = verifiedFields.has(fieldPath)
    
    return (
      <div className="flex items-center gap-2 mt-1">
        <Checkbox
          id={`verify-${fieldPath}`}
          checked={isVerified}
          onCheckedChange={() => toggleFieldVerification(fieldPath)}
          className="cursor-pointer"
        />
        <Label 
          htmlFor={`verify-${fieldPath}`}
          className={`text-xs cursor-pointer ${isVerified ? 'text-green-600 dark:text-green-400 font-medium' : 'text-muted-foreground'}`}
        >
          {isVerified ? '✓ Verified' : label || 'Mark as verified'}
        </Label>
      </div>
    )
  }

  const isControlledOpen = controlledOpen !== undefined

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {mode === "create" && !isControlledOpen && (
        <DialogTrigger asChild>
          {children || (
            <Button className="transition-all duration-200 ease-in-out hover:scale-105 hover:shadow-md cursor-pointer">
              <Plus className="h-4 w-4" />
              Create Candidate
            </Button>
          )}
        </DialogTrigger>
      )}
      <DialogContent className={CANDIDATE_FORM_DIALOG_SHELL_CLASS}>
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border space-y-3">
          <DialogTitle className="flex items-center gap-2">
            {mode === "edit" && <ShieldCheck className="h-5 w-5 text-primary" />}
            {getDialogTitle()}
            {candidateData && mode === "edit" && (
              <span className="text-muted-foreground font-normal">: {candidateData.name}</span>
            )}
          </DialogTitle>
          
          {/* Verification Progress Bar - Always shown in edit mode */}
          {showVerification && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Verification Progress</span>
                <Badge variant={verificationProgress.percentage === 100 ? 'default' : 'secondary'}>
                  {verificationProgress.percentage}% Complete ({verificationProgress.verified}/{verificationProgress.total} fields)
                </Badge>
              </div>
              <Progress value={verificationProgress.percentage} className="h-2" />
            </div>
          )}
        </DialogHeader>

        {/* Sticky Section Navigation Tabs */}
        {showVerification && (
          <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border shadow-sm">
            <Tabs 
              value={activeTab} 
              onValueChange={handleTabChange}
              className="w-full"
            >
              <TabsList className="h-12 w-full justify-start rounded-none border-0 bg-transparent p-0 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                {sections.map((section) => {
                  const progress = getSectionProgress(section.sectionId)
                  const isFullyVerified = progress.percentage === 100
                  
                  return (
                    <TabsTrigger
                      key={section.id}
                      value={section.sectionId}
                      className={cn(
                        "px-4 py-2 text-sm font-medium rounded-t transition-colors whitespace-nowrap h-12 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none",
                        "data-[state=inactive]:text-muted-foreground data-[state=inactive]:hover:bg-muted data-[state=inactive]:hover:text-foreground",
                        "border-b-2 border-transparent",
                        "cursor-pointer flex items-center gap-2"
                      )}
                      aria-label={`Jump to ${section.label} section - ${progress.percentage}% verified (${progress.verified}/${progress.total})`}
                    >
                      <span className="hidden lg:inline">{section.label}</span>
                      <span className="lg:hidden">{section.shortLabel}</span>
                      
                      {/* Verification Badge */}
                      {progress.total > 0 && (
                        <Badge 
                          variant="default"
                          className={cn(
                            "text-xs px-1.5 py-0.5 font-medium shrink-0",
                            getVerificationBadgeColor(progress.percentage)
                          )}
                        >
                          {isFullyVerified ? (
                            <CheckCircle className="w-3 h-3" />
                          ) : (
                            `${progress.percentage}%`
                          )}
                        </Badge>
                      )}
                    </TabsTrigger>
                  )
                })}
              </TabsList>
            </Tabs>
          </div>
        )}

        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto px-6 py-6">
          {/* Nested create dialogs (portaled) stay React children of this form — see .cursor/rules/candidate-nested-dialog-forms.mdc */}
          <form id="candidate-form" onSubmit={handleSubmit} className="space-y-6">
          {unresolvedCatalogRefs.length > 0 ? (
            <Card className="border-amber-200/90 bg-amber-50/60 dark:border-amber-900/60 dark:bg-amber-950/25">
              <CardHeader className="py-3 pb-2">
                <CardTitle className="flex items-center gap-2 text-base font-semibold">
                  <ListTodo className="h-4 w-4 shrink-0 text-amber-700 dark:text-amber-400" />
                  Link catalog records
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 pt-0 text-sm">
                <p className="text-muted-foreground">
                  Imported fields filled names below, but these rows still need a matching database
                  record. Open each field to search — the parsed name is filled in when you open it.
                  Use <span className="font-medium text-foreground">Add New</span> when there is no
                  match.
                </p>
                <ul className="space-y-1.5">
                  {unresolvedCatalogRefs.map((r) => (
                    <li key={r.id}>
                      <button
                        type="button"
                        className="text-left font-medium text-primary hover:underline"
                        onClick={() => scrollToCatalogAnchor(r.anchorId)}
                      >
                        {r.label}
                      </button>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ) : null}
          {/* Section 1: Basic Information */}
          <div id="basic-info">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center justify-between text-lg">
                <div className="flex items-center gap-2">
                  <User className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  Basic Information
                  <SectionProgressBadge 
                    percentage={basicInfoProgress.percentage}
                    verified={basicInfoProgress.verified}
                    total={basicInfoProgress.total}
                  />
                </div>
                {showVerification && (
                  <div 
                    className="flex items-center gap-2" 
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Checkbox
                      id="verify-all-basic-info"
                      checked={isSectionFullyVerified('basic-info')}
                      onCheckedChange={(checked) => handleVerifyAllSection('basic-info', !!checked)}
                      aria-label="Verify all fields in Basic Information section"
                    />
                    <Label 
                      htmlFor="verify-all-basic-info"
                      className="text-sm text-muted-foreground cursor-pointer font-normal"
                    >
                      Verify All
                    </Label>
                  </div>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="John Doe"
                  value={formData.name}
                  onChange={(e) => handleInputChange("name", e.target.value)}
                  className={errors.basic?.name ? "border-red-500" : ""}
                />
                {errors.basic?.name && <p className="text-sm text-red-500">{errors.basic.name}</p>}
                <VerificationCheckbox fieldPath="name" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="city">City *</Label>
                <Input
                  id="city"
                  type="text"
                  placeholder="New York"
                  value={formData.city}
                  onChange={(e) => handleInputChange("city", e.target.value)}
                  className={errors.basic?.city ? "border-red-500" : ""}
                />
                {errors.basic?.city && <p className="text-sm text-red-500">{errors.basic.city}</p>}
                <VerificationCheckbox fieldPath="city" />
              </div>

              {!hideCompensationFields ? (
              <>
              <div className="space-y-2">
                <Label htmlFor="currentSalary">Current Salary</Label>
                <Input
                  id="currentSalary"
                  type="number"
                  placeholder="75000"
                  value={formData.currentSalary}
                  onChange={(e) => handleInputChange("currentSalary", e.target.value)}
                />
                <VerificationCheckbox fieldPath="currentSalary" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="expectedSalary">Expected Salary</Label>
                <Input
                  id="expectedSalary"
                  type="number"
                  placeholder="85000"
                  value={formData.expectedSalary}
                  onChange={(e) => handleInputChange("expectedSalary", e.target.value)}
                />
                <VerificationCheckbox fieldPath="expectedSalary" />
              </div>
              </>
              ) : null}

              <div className="space-y-2">
                <Label htmlFor="cnic">CNIC</Label>
                <Input
                  id="cnic"
                  type="text"
                  placeholder="12345-6789012-3"
                  value={formData.cnic}
                  onChange={(e) => handleInputChange("cnic", e.target.value)}
                  className={errors.basic?.cnic ? "border-red-500" : ""}
                />
                {errors.basic?.cnic && <p className="text-sm text-red-500">{errors.basic.cnic}</p>}
                <VerificationCheckbox fieldPath="cnic" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="postingTitle">Posting Title</Label>
                <Input
                  id="postingTitle"
                  type="text"
                  placeholder="Technical Lead (.NET)"
                  value={formData.postingTitle}
                  onChange={(e) => handleInputChange("postingTitle", e.target.value)}
                  className={errors.basic?.postingTitle ? "border-red-500" : ""}
                />
                {errors.basic?.postingTitle && <p className="text-sm text-red-500">{errors.basic.postingTitle}</p>}
                <VerificationCheckbox fieldPath="postingTitle" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="contactNumber">Number *</Label>
                <Input
                  id="contactNumber"
                  type="tel"
                  placeholder="+1-555-0123"
                  value={formData.contactNumber}
                  onChange={(e) => handleInputChange("contactNumber", e.target.value)}
                  className={errors.basic?.contactNumber ? "border-red-500" : ""}
                />
                {errors.basic?.contactNumber && <p className="text-sm text-red-500">{errors.basic.contactNumber}</p>}
                <VerificationCheckbox fieldPath="contactNumber" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="john.doe@email.com"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  className={errors.basic?.email ? "border-red-500" : ""}
                />
                {errors.basic?.email && <p className="text-sm text-red-500">{errors.basic.email}</p>}
                <VerificationCheckbox fieldPath="email" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="linkedinUrl">LinkedIn URL</Label>
                <Input
                  id="linkedinUrl"
                  type="url"
                  placeholder="https://linkedin.com/in/johndoe"
                  value={formData.linkedinUrl}
                  onChange={(e) => handleInputChange("linkedinUrl", e.target.value)}
                  className={errors.basic?.linkedinUrl ? "border-red-500" : ""}
                />
                {errors.basic?.linkedinUrl && <p className="text-sm text-red-500">{errors.basic.linkedinUrl}</p>}
                <VerificationCheckbox fieldPath="linkedinUrl" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="githubUrl">GitHub URL</Label>
                <Input
                  id="githubUrl"
                  type="url"
                  placeholder="https://github.com/johndoe"
                  value={formData.githubUrl}
                  onChange={(e) => handleInputChange("githubUrl", e.target.value)}
                  className={errors.basic?.githubUrl ? "border-red-500" : ""}
                />
                {errors.basic?.githubUrl && <p className="text-sm text-red-500">{errors.basic.githubUrl}</p>}
                <VerificationCheckbox fieldPath="githubUrl" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="source">Source *</Label>
                <Select
                  value={formData.source === "" ? undefined : formData.source}
                  onValueChange={(value: CandidateSourceDb) => {
                    handleInputChange("source", value)
                  }}
                >
                  <SelectTrigger
                    id="source"
                    className={`w-full ${errors.basic?.source ? "border-red-500" : ""}`}
                  >
                    <SelectValue placeholder="Select source" />
                  </SelectTrigger>
                  <SelectContent>
                    {CANDIDATE_SOURCE_DB.map((key) => (
                      <SelectItem key={key} value={key}>
                        {CANDIDATE_SOURCE_LABELS[key]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.basic?.source && <p className="text-sm text-red-500">{errors.basic.source}</p>}
                <VerificationCheckbox fieldPath="source" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="callStatus">Call Status *</Label>
                <Select
                  value={formData.callStatus === "" ? undefined : formData.callStatus}
                  onValueChange={(value: CallStatusDb) => {
                    handleInputChange("callStatus", value)
                  }}
                >
                  <SelectTrigger
                    id="callStatus"
                    className={`w-full ${errors.basic?.callStatus ? "border-red-500" : ""}`}
                  >
                    <SelectValue placeholder="Select call status" />
                  </SelectTrigger>
                  <SelectContent>
                    {CALL_STATUS_UI_ORDER.map((status) => (
                      <SelectItem key={status} value={status}>
                        {CALL_STATUS_LABELS[status]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.basic?.callStatus && (
                  <p className="text-sm text-red-500">{errors.basic.callStatus}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="callDate">Call Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      id="callDate"
                      className="w-full justify-between font-normal"
                    >
                      {formData.callDate ? formData.callDate.toLocaleDateString() : "Select call date"}
                      <CalendarIcon />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto overflow-hidden p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={formData.callDate}
                      captionLayout="dropdown"
                      onSelect={(date) => {
                        setFormData((prev) => ({ ...prev, callDate: date }))
                        markFieldModified("callDate")
                      }}
                    />
                  </PopoverContent>
                </Popover>
                <VerificationCheckbox fieldPath="callDate" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="personalityType">Personality Type</Label>
                <ReusableCombobox
                  options={personalityTypeOptions}
                  value={formData.personalityType}
                  onValueChange={(value) => {
                    setFormData(prev => ({ ...prev, personalityType: value }))
                    if (showVerification) {
                      setModifiedFields(prev => new Set(prev).add("personalityType"))
                      setVerifiedFields(prev => new Set(prev).add("personalityType"))
                    }
                  }}
                  placeholder="Select personality type..."
                  searchPlaceholder="Search personality types..."
                  className={errors.basic?.personalityType ? "border-red-500" : ""}
                />
                {errors.basic?.personalityType && (
                  <p className="text-sm text-red-500">{errors.basic.personalityType}</p>
                )}
                <VerificationCheckbox fieldPath="personalityType" />
              </div>
              <div className="min-w-0 space-y-2">
              {mode === "edit" && candidateData?.hasResume && !resumeFile && (
                <div className="rounded-md border bg-muted/40 p-3 space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Current resume
                  </p>
                  <p className="text-sm font-medium truncate" title={candidateData.resumeFileName ?? undefined}>
                    {candidateData.resumeFileName ?? "Resume on file"}
                  </p>
                  {candidateData.resumeFileSizeBytes != null && (
                    <p className="text-xs text-muted-foreground">
                      {formatResumeFileSize(candidateData.resumeFileSizeBytes)}
                      {candidateData.resumeUploadedAt
                        ? ` · Uploaded ${format(new Date(candidateData.resumeUploadedAt), "MMM d, yyyy")}`
                        : null}
                    </p>
                  )}
                  {Number.isFinite(Number(candidateData.id)) && (
                    <ResumeOpenButton
                      candidateId={Number(candidateData.id)}
                      fileName={candidateData.resumeFileName}
                      contentType={candidateData.resumeContentType}
                      variant="button"
                    />
                  )}
                  <p className="text-xs text-muted-foreground">
                    Select a new file below to replace the current resume after saving.
                  </p>
                </div>
              )}
              <ResumeFileInput
                      id="resume" 
                value={resumeFile}
                onChange={(file) => {
                          setResumeFile(file)
                  if (file && showVerification) {
                    setModifiedFields((prev) => new Set(prev).add("resume"))
                    setVerifiedFields((prev) => new Set(prev).add("resume"))
                  }
                  if (!file && showVerification) {
                    setModifiedFields((prev) => {
                      const next = new Set(prev)
                      next.delete("resume")
                      return next
                    })
                    setVerifiedFields((prev) => {
                      const next = new Set(prev)
                      next.delete("resume")
                      return next
                          })
                        }
                      }}
                disabled={isLoading || isRetryingResume || !!pendingResumeRetry}
                label={mode === "edit" && candidateData?.hasResume ? "Replace resume" : "Resume"}
              />
                <VerificationCheckbox fieldPath="resume" />
              </div>
              </div>
            </CardContent>
          </Card>
          </div>
          {/* Section 2: Work Experience (Collapsible) */}
          <div id="work-experience">
          <Collapsible open={workExperienceOpen} onOpenChange={setWorkExperienceOpen}>
            <div className="flex items-center gap-2">
              <CollapsibleTrigger asChild className="flex-1">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-between cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Briefcase className="h-5 w-5 text-green-600 dark:text-green-400" />
                    <span className="text-lg font-medium">Work Experience</span>
                    {formData.workExperiences.length > 0 && (
                      <Badge variant="secondary" className="ml-2">
                        {formData.workExperiences.length}
                      </Badge>
                    )}
                    <SectionProgressBadge 
                      percentage={workExperienceProgress.percentage}
                      verified={workExperienceProgress.verified}
                      total={workExperienceProgress.total}
                    />
                  </div>
                  <ChevronDown
                    className={`h-4 w-4 transition-transform duration-200 ${
                      workExperienceOpen ? "transform rotate-180" : ""
                    }`}
                  />
                </Button>
              </CollapsibleTrigger>
              {showVerification && (
                <div 
                  className="flex items-center gap-2 px-2" 
                  onClick={(e) => e.stopPropagation()}
                >
                  <Checkbox
                    id="verify-all-work-experience"
                    checked={isSectionFullyVerified('work-experience')}
                    onCheckedChange={(checked) => handleVerifyAllSection('work-experience', !!checked)}
                    aria-label="Verify all fields in Work Experience section"
                  />
                  <Label 
                    htmlFor="verify-all-work-experience"
                    className="text-sm text-muted-foreground cursor-pointer font-normal whitespace-nowrap"
                  >
                    Verify All
                  </Label>
                </div>
              )}
            </div>
            <CollapsibleContent className="space-y-4 mt-4">
              <div className="flex items-center justify-end">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addWorkExperience}
                  className="flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                  Add Experience
                </Button>
              </div>

            {formData.workExperiences.map((experience, index) => (
              <Card key={experience.id} className="relative">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center justify-between text-base">
                    <div className="flex items-center gap-2">
                      <span>Experience {index + 1}</span>
                      {experience.projects.length > 0 && (
                        <Badge variant="outline" className="text-xs">
                          {experience.projects.length} project{experience.projects.length !== 1 ? 's' : ''}
                        </Badge>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeWorkExperience(index)}
                      className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 cursor-pointer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 space-y-6">
                  {/* Experience Basic Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor={`jobTitle-${index}`}>Job Title *</Label>
                      <Input
                        id={`jobTitle-${index}`}
                        type="text"
                        placeholder="Senior Frontend Developer"
                        value={experience.jobTitle}
                        onChange={(e) => handleWorkExperienceChange(index, "jobTitle", e.target.value)}
                        className={errors.workExperiences?.[index]?.jobTitle ? "border-red-500" : ""}
                      />
                      {errors.workExperiences?.[index]?.jobTitle && (
                        <p className="text-sm text-red-500">{errors.workExperiences[index].jobTitle}</p>
                      )}
                      <VerificationCheckbox fieldPath={`workExperiences.${index}.jobTitle`} />
                    </div>

                    <div
                      className="min-w-0 space-y-2 scroll-mt-28"
                      id={`prefill-anchor-we-${index}-employer`}
                    >
                      <WorkExperienceEmployerCombobox
                        experience={experience}
                        index={index}
                        disabled={isLoading}
                        error={!!errors.workExperiences?.[index]?.employerId}
                        createEmployerLookups={employerCreateLookups}
                        nestedEmployerCreation={nestedEmployerCreation}
                        onEmployerChange={handleWorkExperienceEmployerChange}
                      />
                      {errors.workExperiences?.[index]?.employerId && (
                        <p className="text-sm text-red-500">{errors.workExperiences[index].employerId}</p>
                      )}
                      <VerificationCheckbox fieldPath={`workExperiences.${index}.employerId`} />
                    </div>

                    <div className="min-w-0 space-y-2">
                      <WorkExperienceOfficeLocationSelect
                        id={`officeLocation-${index}`}
                        employerId={experience.employerId}
                        value={experience.employerLocationId}
                        onChange={(locationId) => {
                          setFormData((prev) => ({
                            ...prev,
                            workExperiences: prev.workExperiences.map((exp, i) =>
                              i === index ? { ...exp, employerLocationId: locationId } : exp
                            ),
                          }))
                          markFieldModified(`workExperiences.${index}.employerLocationId`)
                        }}
                        disabled={isLoading}
                        createContext={
                          nestedEmployerCreation
                            ? {
                                countries: nestedEmployerCreation.countries,
                                countriesLoading: nestedEmployerCreation.countriesLoading,
                                onCreateCountry: nestedEmployerCreation.onCreateCountry,
                              }
                            : undefined
                        }
                      />
                      <VerificationCheckbox fieldPath={`workExperiences.${index}.employerLocationId`} />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`startDate-${index}`}>Start Date</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            id={`startDate-${index}`}
                            className="w-full justify-between font-normal"
                          >
                            {experience.startDate ? experience.startDate.toLocaleDateString() : "Select start date"}
                            <CalendarIcon />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto overflow-hidden p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={experience.startDate}
                            captionLayout="dropdown"
                            onSelect={(date) => {
                              handleWorkExperienceChange(index, "startDate", date)
                            }}
                          />
                        </PopoverContent>
                      </Popover>
                      {errors.workExperiences?.[index]?.startDate && (
                        <p className="text-sm text-red-500">
                          {errors.workExperiences[index].startDate}
                        </p>
                      )}
                      <VerificationCheckbox fieldPath={`workExperiences.${index}.startDate`} />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`endDate-${index}`}>End Date</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            id={`endDate-${index}`}
                            className="w-full justify-between font-normal"
                          >
                            {experience.endDate ? experience.endDate.toLocaleDateString() : "Select end date"}
                            <CalendarIcon />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto overflow-hidden p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={experience.endDate}
                            captionLayout="dropdown"
                            onSelect={(date) => {
                              handleWorkExperienceChange(index, "endDate", date)
                            }}
                          />
                        </PopoverContent>
                      </Popover>
                      {errors.workExperiences?.[index]?.endDate && (
                        <p className="text-sm text-red-500">
                          {errors.workExperiences[index].endDate}
                        </p>
                      )}
                      {workExperienceDateIssues[index] &&
                        !errors.workExperiences?.[index]?.startDate &&
                        !errors.workExperiences?.[index]?.endDate && (
                          <p className="text-sm text-amber-600 dark:text-amber-400">
                            {workExperienceDateIssues[index].warning}
                          </p>
                        )}
                      {workExperienceDateIssues[index]?.suggestion && (
                        <div className="flex flex-col gap-2 rounded-md border border-amber-200 bg-amber-50/80 p-2 dark:border-amber-900 dark:bg-amber-950/30">
                          <p className="text-sm text-amber-900 dark:text-amber-100">
                            Did you mean{" "}
                            <span className="font-medium">
                              {workExperienceDateIssues[index].suggestion!.label}
                            </span>
                            ?
                          </p>
                          <div className="flex flex-wrap gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-8 border-amber-300 bg-background dark:border-amber-800"
                              onClick={() =>
                                handleWorkExperienceChange(
                                  index,
                                  "endDate",
                                  workExperienceDateIssues[index].suggestion!.suggestedEndDate,
                                )
                              }
                            >
                              Apply {workExperienceDateIssues[index].suggestion!.label}
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-8 text-muted-foreground"
                              onClick={() =>
                                handleWorkExperienceChange(index, "endDate", undefined)
                              }
                            >
                              Clear end (current role)
                            </Button>
                          </div>
                        </div>
                      )}
                      <VerificationCheckbox fieldPath={`workExperiences.${index}.endDate`} />
                    </div>

                      <div className="space-y-2">
                        <Label htmlFor={`shiftType-${index}`}>Shift Type</Label>
                        <ReusableCombobox
                          options={shiftTypeOptions}
                          value={experience.shiftType}
                          onValueChange={(value) => handleWorkExperienceChange(index, "shiftType", value)}
                          placeholder="Select shift type..."
                          searchPlaceholder="Search shift types..."
                        />
                        <VerificationCheckbox fieldPath={`workExperiences.${index}.shiftType`} />
                      </div>

                    <div className="space-y-2">
                      <Label htmlFor={`workMode-${index}`}>Work Mode</Label>
                      <ReusableCombobox
                        options={workModeOptions}
                        value={experience.workMode}
                        onValueChange={(value) => handleWorkExperienceChange(index, "workMode", value)}
                        placeholder="Select work mode..."
                        searchPlaceholder="Search work modes..."
                      />
                      <VerificationCheckbox fieldPath={`workExperiences.${index}.workMode`} />
                    </div>

                    {!hideCompensationFields ? (
                    <>
                    <div className="min-w-0 space-y-2">
                      <Label htmlFor={`salaryPolicy-${index}`}>Salary Policy</Label>
                      <ReusableCombobox
                        options={salaryPolicyOptions}
                        value={experience.salaryPolicy}
                        onValueChange={(value) =>
                          handleWorkExperienceChange(index, "salaryPolicy", value)
                        }
                        placeholder="Select salary policy..."
                        searchPlaceholder="Search salary policies..."
                      />
                      <VerificationCheckbox fieldPath={`workExperiences.${index}.salaryPolicy`} />
                  </div>
                    <div className="min-w-0 space-y-2">
                      <Label htmlFor={`minimumSalary-${index}`}>Minimum Salary</Label>
                      <Input
                        id={`minimumSalary-${index}`}
                        type="text"
                        inputMode="numeric"
                        placeholder="100000"
                        value={experience.minimumSalary}
                        onChange={(e) =>
                          handleWorkExperienceChange(
                            index,
                            "minimumSalary",
                            e.target.value.replace(/\D/g, ""),
                          )
                        }
                        className={
                          errors.workExperiences?.[index]?.minimumSalary ? "border-red-500" : ""
                        }
                      />
                      {errors.workExperiences?.[index]?.minimumSalary && (
                        <p className="text-sm text-red-500">
                          {errors.workExperiences[index].minimumSalary}
                        </p>
                      )}
                      <VerificationCheckbox fieldPath={`workExperiences.${index}.minimumSalary`} />
                    </div>
                    <div className="min-w-0 space-y-2">
                      <Label htmlFor={`maximumSalary-${index}`}>Maximum Salary</Label>
                      <Input
                        id={`maximumSalary-${index}`}
                        type="text"
                        inputMode="numeric"
                        placeholder="200000"
                        value={experience.maximumSalary}
                        onChange={(e) =>
                          handleWorkExperienceChange(
                            index,
                            "maximumSalary",
                            e.target.value.replace(/\D/g, ""),
                          )
                        }
                        className={
                          errors.workExperiences?.[index]?.maximumSalary ? "border-red-500" : ""
                        }
                      />
                      {errors.workExperiences?.[index]?.maximumSalary && (
                        <p className="text-sm text-red-500">
                          {errors.workExperiences[index].maximumSalary}
                        </p>
                      )}
                      <VerificationCheckbox fieldPath={`workExperiences.${index}.maximumSalary`} />
                    </div>
                    </>
                    ) : null}

                    <div className="min-w-0 space-y-2">
                    <Label htmlFor={`timeSupportZones-${index}`}>Time Support Zones</Label>
                    <MultiSelect
                      items={timeSupportZoneOptions}
                      selected={experience.timeSupportZones}
                      onChange={(values) => handleWorkExperienceChange(index, "timeSupportZones", values)}
                      placeholder="Select time zones..."
                      searchPlaceholder="Search time zones..."
                      maxDisplay={5}
                      disabled={timeSupportZonesLoading}
                      creatable={!!onCreateTimeSupportZone}
                      createLabel="+ Add Time Zone"
                      onCreateNew={
                        onCreateTimeSupportZone ? (name) => onCreateTimeSupportZone(name) : undefined
                      }
                    />
                    <VerificationCheckbox fieldPath={`workExperiences.${index}.timeSupportZones`} />
                  </div>

                    <div className="min-w-0 space-y-2">
                      <Label htmlFor={`techStacks-${index}`}>Tech Stacks</Label>
                      <MultiSelect
                        items={techStackOptions}
                        selected={experience.techStacks}
                        onChange={(values) => handleWorkExperienceChange(index, "techStacks", values)}
                        placeholder="Select technologies..."
                        searchPlaceholder="Search technologies..."
                        maxDisplay={4}
                        disabled={techStacksLoading}
                        creatable={!!onCreateTechStack}
                        createLabel="Add Technology"
                        onCreateNew={onCreateTechStack ? (name) => onCreateTechStack(name) : undefined}
                        pinSelectedToTop
                        remainingGroupHeading="All technologies"
                      />
                      <VerificationCheckbox fieldPath={`workExperiences.${index}.techStacks`} />
                    </div>

                    {!hideCompensationFields ? (
                    <div className="min-w-0 space-y-2">
                    <BenefitsSelector
                      benefits={experience.benefits as EmployerBenefit[]}
                      benefitOptions={lookups?.benefits ?? []}
                      onCreateBenefit={onCreateBenefit}
                      disabled={benefitsLoading}
                      onChange={(benefits) =>
                        handleWorkExperienceChange(
                          index,
                          "benefits",
                          benefits as WorkExperienceBenefit[]
                        )
                      }
                    />
                    <VerificationCheckbox fieldPath={`workExperiences.${index}.benefits`} />
                    </div>
                    ) : null}
                  </div>

                  {/* Projects Section */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-px bg-border flex-1"></div>
                        <Label className="text-sm font-semibold text-muted-foreground px-3">Projects</Label>
                        <div className="h-px bg-border flex-1"></div>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => addProject(index)}
                        className="flex items-center gap-1 cursor-pointer transition-all duration-150 ease-in-out hover:bg-accent/50 hover:border-accent"
                      >
                        <Plus className="h-3 w-3" />
                        Add Project
                      </Button>
                    </div>

                    {experience.projects.length > 0 ? (
                      <div className="space-y-3">
                        {experience.projects.map((project, projectIndex) => (
                          <div key={project.id} className="relative bg-muted/30 rounded-lg p-4 border border-dashed border-muted-foreground/20">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                                <span className="text-sm font-medium text-muted-foreground">
                                  Project {projectIndex + 1}
                                </span>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeProject(index, projectIndex)}
                                className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 cursor-pointer"
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                            
                            <div className="space-y-3">
                              <div
                                className="space-y-2 scroll-mt-28"
                                id={`prefill-anchor-we-${index}-project-${projectIndex}`}
                              >
                                <WorkExperienceProjectCombobox
                                  experience={experience}
                                  experienceIndex={index}
                                  project={project}
                                  projectIndex={projectIndex}
                                  disabled={isLoading}
                                  error={!!errors.workExperiences?.[index]?.projects?.[projectIndex]?.projectId}
                                  onLinkedProjectChange={handleWorkExperienceLinkedProjectChange}
                                  projectLookups={projectCreateLookups}
                                  onCreateTechStack={onCreateTechStack}
                                  onCreateTechnicalAspect={nestedProjectCreation?.onCreateTechnicalAspect}
                                  onCreateClientLocation={nestedProjectCreation?.onCreateClientLocation}
                                />
                                {errors.workExperiences?.[index]?.projects?.[projectIndex]?.projectId && (
                                  <p className="text-sm text-red-500">
                                    {errors.workExperiences[index].projects![projectIndex].projectId}
                                  </p>
                                )}
                                <VerificationCheckbox
                                  fieldPath={`workExperiences.${index}.projects.${projectIndex}.projectId`}
                                />
                              </div>

                              <div className="space-y-2">
                                <Label htmlFor={`contributionNotes-${index}-${projectIndex}`}>Contribution</Label>
                                <Textarea
                                  id={`contributionNotes-${index}-${projectIndex}`}
                                  placeholder="Describe your key contributions, achievements, and responsibilities in this project..."
                                  value={project.contributionNotes}
                                  onChange={(e) => handleProjectChange(index, projectIndex, "contributionNotes", e.target.value)}
                                  className="min-h-[80px] resize-none"
                                />
                                <VerificationCheckbox fieldPath={`workExperiences.${index}.projects.${projectIndex}.contributionNotes`} />
                              </div>

                              <div className="space-y-2">
                                <div className="flex items-center space-x-2">
                                  <Switch
                                    id={`isMainContribution-${index}-${projectIndex}`}
                                    checked={project.isMainContribution === true}
                                    onCheckedChange={(checked) =>
                                      handleProjectMainContributionChange(
                                        index,
                                        projectIndex,
                                        checked === true,
                                      )
                                    }
                                    disabled={isLoading}
                                  />
                                  <Label
                                    htmlFor={`isMainContribution-${index}-${projectIndex}`}
                                    className="text-sm font-normal"
                                  >
                                    Main Contributor
                                  </Label>
                                </div>
                                <VerificationCheckbox
                                  fieldPath={`workExperiences.${index}.projects.${projectIndex}.isMainContribution`}
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-lg border border-dashed p-4 text-center bg-muted/20">
                        <div className="mx-auto h-8 w-8 rounded-full bg-muted flex items-center justify-center mb-2">
                          <FolderOpen className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => addProject(index)}
                          className="cursor-pointer transition-all duration-150 ease-in-out hover:bg-accent/50 hover:border-accent"
                        >
                          <Plus className="mr-2 h-3 w-3" />
                          Add Your First Project
                        </Button>
                      </div>
                    )}
                  </div>
                  <WorkExperienceModulesFields
                    experienceIndex={index}
                    modules={experience.modules}
                    disabled={isLoading}
                    techStackOptions={techStackOptions}
                    errors={errors.workExperiences?.[index]?.modules}
                    onChange={(modules) => handleModulesChange(index, modules)}
                    renderVerification={(fieldPath) => <VerificationCheckbox fieldPath={fieldPath} />}
                  />
                </CardContent>
              </Card>
            ))}

              {formData.workExperiences.length === 0 && (
                <div className="rounded-lg border border-dashed p-6 text-center">
                  <Briefcase className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addWorkExperience}
                    className="cursor-pointer"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Your First Experience
                  </Button>
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>
          </div>
          {/* Section 3: Tech Stacks (Collapsible) */}
          <div id="tech-stacks">
          <Collapsible open={techStacksOpen} onOpenChange={setTechStacksOpen}>
            <div className="flex items-center gap-2">
              <CollapsibleTrigger asChild className="flex-1">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-between cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Code className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    <span className="text-lg font-medium">Tech Stacks</span>
                    {formData.techStacks.length > 0 && (
                      <Badge variant="secondary" className="ml-2">
                        {formData.techStacks.length}
                      </Badge>
                    )}
                    <SectionProgressBadge 
                      percentage={techStacksProgress.percentage}
                      verified={techStacksProgress.verified}
                      total={techStacksProgress.total}
                    />
                  </div>
                  <ChevronDown
                    className={`h-4 w-4 transition-transform duration-200 ${
                      techStacksOpen ? "transform rotate-180" : ""
                    }`}
                  />
                </Button>
              </CollapsibleTrigger>
              {showVerification && (
                <div 
                  className="flex items-center gap-2 px-2" 
                  onClick={(e) => e.stopPropagation()}
                >
                  <Checkbox
                    id="verify-all-tech-stacks"
                    checked={isSectionFullyVerified('tech-stacks')}
                    onCheckedChange={(checked) => handleVerifyAllSection('tech-stacks', !!checked)}
                    aria-label="Verify all fields in Tech Stacks section"
                  />
                  <Label 
                    htmlFor="verify-all-tech-stacks"
                    className="text-sm text-muted-foreground cursor-pointer font-normal whitespace-nowrap"
                  >
                    Verify All
                  </Label>
                </div>
              )}
            </div>
            <CollapsibleContent className="space-y-4 mt-4">
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="text-base">Technical Skills</CardTitle>
                </CardHeader>
                <CardContent className="pt-0 space-y-4">
                  <div className="space-y-2">
                    <MultiSelect
                      items={techStackOptions}
                      selected={formData.techStacks}
                      onChange={(values) => {
                        setFormData(prev => ({ ...prev, techStacks: values }))
                        markFieldModified('techStacks')
                      }}
                      placeholder="Select technologies..."
                      searchPlaceholder="Search technologies..."
                      maxDisplay={4}
                      disabled={techStacksLoading}
                      creatable={!!onCreateTechStack}
                      createLabel="Add Technology"
                      onCreateNew={onCreateTechStack ? (name) => onCreateTechStack(name) : undefined}
                      pinSelectedToTop
                      remainingGroupHeading="All technologies"
                    />
                    <VerificationCheckbox fieldPath="techStacks" />
                  </div>
                </CardContent>
              </Card>
            </CollapsibleContent>
          </Collapsible>
          </div>
          {/* Section 4: Education (Collapsible) */}
          <div id="education">
          <Collapsible open={educationOpen} onOpenChange={setEducationOpen}>
            <div className="flex items-center gap-2">
              <CollapsibleTrigger asChild className="flex-1">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-between cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <GraduationCap className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                    <span className="text-lg font-medium">Education</span>
                    {formData.educations.length > 0 && (
                      <Badge variant="secondary" className="ml-2">
                        {formData.educations.length}
                      </Badge>
                    )}
                    <SectionProgressBadge 
                      percentage={educationProgress.percentage}
                      verified={educationProgress.verified}
                      total={educationProgress.total}
                    />
                  </div>
                  <ChevronDown
                    className={`h-4 w-4 transition-transform duration-200 ${
                      educationOpen ? "transform rotate-180" : ""
                    }`}
                  />
                </Button>
              </CollapsibleTrigger>
              {showVerification && (
                <div 
                  className="flex items-center gap-2 px-2" 
                  onClick={(e) => e.stopPropagation()}
                >
                  <Checkbox
                    id="verify-all-education"
                    checked={isSectionFullyVerified('education')}
                    onCheckedChange={(checked) => handleVerifyAllSection('education', !!checked)}
                    aria-label="Verify all fields in Education section"
                  />
                  <Label 
                    htmlFor="verify-all-education"
                    className="text-sm text-muted-foreground cursor-pointer font-normal whitespace-nowrap"
                  >
                    Verify All
                  </Label>
                </div>
              )}
            </div>
            <CollapsibleContent className="space-y-4 mt-4">
              <div className="flex items-center justify-end">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addEducation}
                  className="flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                  Add Education
                </Button>
              </div>

              {formData.educations.map((education, index) => (
                <Card key={education.id} className="relative">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center justify-between text-base">
                      <span>Education {index + 1}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeEducation(index)}
                        className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </CardTitle>
                  </CardHeader>
                    <CardContent className="pt-0">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div
                          className="space-y-2 md:col-span-2 scroll-mt-28"
                          id={`prefill-anchor-edu-${index}-university`}
                        >
                          <UniversityCombobox
                            id={`university-${index}`}
                            label="University *"
                            value={(() => {
                              const uid = education.universityLocationId?.trim()
                              if (!uid) return null
                              const idNum = Number(uid)
                              if (!Number.isFinite(idNum)) return null
                              return {
                                id: idNum,
                                name: education.universityLocationName?.trim() || "University",
                              }
                            })()}
                            onChange={(u) => handleEducationUniversityChange(index, u)}
                            error={!!errors.educations?.[index]?.universityLocationId}
                            parsedNameHint={
                              !String(education.universityLocationId ?? "").trim()
                                ? education.universityLocationName?.trim() || undefined
                                : undefined
                            }
                          />
                          {errors.educations?.[index]?.universityLocationId && (
                            <p className="text-sm text-red-500">{errors.educations[index].universityLocationId}</p>
                          )}
                          <VerificationCheckbox fieldPath={`educations.${index}.universityLocationName`} />
                        </div>

                        <div className="min-w-0 space-y-2">
                          <EducationCampusLocationSelect
                            id={`campusLocation-${index}`}
                            universityId={(() => {
                              const n = Number(education.universityLocationId)
                              return Number.isFinite(n) && n > 0 ? n : null
                            })()}
                            value={education.campusLocationId}
                            onChange={(locationId) => {
                              setFormData((prev) => ({
                                ...prev,
                                educations: prev.educations.map((edu, i) =>
                                  i === index ? { ...edu, campusLocationId: locationId } : edu
                                ),
                              }))
                              markFieldModified(`educations.${index}.campusLocationId`)
                            }}
                            disabled={isLoading}
                            createContext={nestedEmployerCreation ? {} : undefined}
                          />
                          <VerificationCheckbox fieldPath={`educations.${index}.campusLocationId`} />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor={`degreeName-${index}`}>Degree Name *</Label>
                          <ReusableCombobox
                            options={degreeOptions}
                            catalogOptions={degreeOptions}
                            value={education.degreeName}
                            onValueChange={(value) => handleEducationChange(index, "degreeName", value)}
                            placeholder="Select degree..."
                            searchPlaceholder="Search degrees..."
                            className={errors.educations?.[index]?.degreeName ? "border-red-500" : ""}
                            disabled={degreesMajorsLoading}
                            creatable={true}
                            createLabel="Add New Degree"
                            parsedSearchHint={
                              education.degreeName?.trim() &&
                              !isDegreeInCatalog(education.degreeName)
                                ? education.degreeName.trim()
                                : undefined
                            }
                            onCreateNew={
                              onCreateDegree
                                ? async (name) => {
                                    await onCreateDegree(name)
                                    handleEducationChange(index, "degreeName", name)
                                  }
                                : async (name) => {
                                    handleEducationChange(index, "degreeName", name)
                                  }
                            }
                          />
                          {errors.educations?.[index]?.degreeName && (
                            <p className="text-sm text-red-500">{errors.educations[index].degreeName}</p>
                          )}
                          <VerificationCheckbox fieldPath={`educations.${index}.degreeName`} />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor={`majorName-${index}`}>Major Name</Label>
                          <ReusableCombobox
                            options={majorOptions}
                            catalogOptions={majorOptions}
                            value={education.majorName}
                            onValueChange={(value) => handleEducationChange(index, "majorName", value)}
                            placeholder="Select major..."
                            searchPlaceholder="Search majors..."
                            className={errors.educations?.[index]?.majorName ? "border-red-500" : ""}
                            disabled={degreesMajorsLoading}
                            creatable={true}
                            createLabel="Add New Major"
                            parsedSearchHint={
                              education.majorName?.trim() &&
                              !isMajorInCatalog(education.majorName)
                                ? education.majorName.trim()
                                : undefined
                            }
                            onCreateNew={
                              onCreateMajor
                                ? async (name) => {
                                    await onCreateMajor(name)
                                    handleEducationChange(index, "majorName", name)
                                  }
                                : async (name) => {
                                    handleEducationChange(index, "majorName", name)
                                  }
                            }
                          />
                          {errors.educations?.[index]?.majorName && (
                            <p className="text-sm text-red-500">{errors.educations[index].majorName}</p>
                          )}
                          <VerificationCheckbox fieldPath={`educations.${index}.majorName`} />
                        </div>

                      <div className="space-y-2">
                        <Label htmlFor={`startMonth-${index}`}>Start Month</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              id={`startMonth-${index}`}
                              className="w-full justify-between font-normal"
                            >
                              {education.startMonth ? education.startMonth.toLocaleDateString('en-US', { year: 'numeric', month: 'long' }) : "Select start month"}
                              <CalendarIcon />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto overflow-hidden p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={education.startMonth}
                              captionLayout="dropdown"
                              onSelect={(date) => {
                                handleEducationChange(index, "startMonth", date)
                              }}
                            />
                          </PopoverContent>
                        </Popover>
                        <VerificationCheckbox fieldPath={`educations.${index}.startMonth`} />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`endMonth-${index}`}>End Month</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              id={`endMonth-${index}`}
                              className="w-full justify-between font-normal"
                            >
                              {education.endMonth ? education.endMonth.toLocaleDateString('en-US', { year: 'numeric', month: 'long' }) : "Select end month"}
                              <CalendarIcon />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto overflow-hidden p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={education.endMonth}
                              captionLayout="dropdown"
                              onSelect={(date) => {
                                handleEducationChange(index, "endMonth", date)
                              }}
                            />
                          </PopoverContent>
                        </Popover>
                        <VerificationCheckbox fieldPath={`educations.${index}.endMonth`} />
                      </div>

                      <div className="space-y-2 md:col-span-1">
                        <Label htmlFor={`grades-${index}`}>Grades</Label>
                        <Input
                          id={`grades-${index}`}
                          type="text"
                          placeholder="GPA 3.8 / 4.0 or First Class"
                          value={education.grades}
                          onChange={(e) => handleEducationChange(index, "grades", e.target.value)}
                        />
                        <VerificationCheckbox fieldPath={`educations.${index}.grades`} />
                      </div>

                      {/* Topper and Cheetah in separate row with two columns */}
                      <div className="space-y-2 md:col-span-1">
                        <div className="flex items-center space-x-2">
                          <Switch
                            id={`isTopper-${index}`}
                            checked={education.isTopper}
                            onCheckedChange={(checked) => handleEducationChange(index, "isTopper", !!checked)}
                          />
                          <Label htmlFor={`isTopper-${index}`} className="text-sm font-normal">
                            Topper
                          </Label>
                        </div>
                        <VerificationCheckbox fieldPath={`educations.${index}.isTopper`} />
                      </div>

                      <div className="space-y-2 md:col-span-1">
                        <div className="flex items-center space-x-2">
                          <Switch
                            id={`isCheetah-${index}`}
                            checked={education.isCheetah}
                            onCheckedChange={(checked) => handleEducationChange(index, "isCheetah", !!checked)}
                          />
                          <Label htmlFor={`isCheetah-${index}`} className="text-sm font-normal">
                            Cheetah
                          </Label>
                        </div>
                        <VerificationCheckbox fieldPath={`educations.${index}.isCheetah`} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {formData.educations.length === 0 && (
                <div className="rounded-lg border border-dashed p-6 text-center">
                  <GraduationCap className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addEducation}
                    className="cursor-pointer"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Your First Education
                  </Button>
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>
          </div>
          {/* Section 6: Certifications (Collapsible) */}
          <div id="certifications">
          <Collapsible open={certificationsOpen} onOpenChange={setCertificationsOpen}>
            <div className="flex items-center gap-2">
              <CollapsibleTrigger asChild className="flex-1">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-between cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Award className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                    <span className="text-lg font-medium">Certifications</span>
                    {formData.certifications.length > 0 && (
                      <Badge variant="secondary" className="ml-2">
                        {formData.certifications.length}
                      </Badge>
                    )}
                    <SectionProgressBadge 
                      percentage={certificationsProgress.percentage}
                      verified={certificationsProgress.verified}
                      total={certificationsProgress.total}
                    />
                  </div>
                  <ChevronDown
                    className={`h-4 w-4 transition-transform duration-200 ${
                      certificationsOpen ? "transform rotate-180" : ""
                    }`}
                  />
                </Button>
              </CollapsibleTrigger>
              {showVerification && (
                <div 
                  className="flex items-center gap-2 px-2" 
                  onClick={(e) => e.stopPropagation()}
                >
                  <Checkbox
                    id="verify-all-certifications"
                    checked={isSectionFullyVerified('certifications')}
                    onCheckedChange={(checked) => handleVerifyAllSection('certifications', !!checked)}
                    aria-label="Verify all fields in Certifications section"
                  />
                  <Label 
                    htmlFor="verify-all-certifications"
                    className="text-sm text-muted-foreground cursor-pointer font-normal whitespace-nowrap"
                  >
                    Verify All
                  </Label>
                </div>
              )}
            </div>
            <CollapsibleContent className="space-y-4 mt-4">
              <div className="flex items-center justify-end">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addCertification}
                  className="flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                  Add Certification
                </Button>
              </div>

              {formData.certifications.map((certification, index) => (
                <Card key={certification.id} className="relative">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center justify-between text-base">
                      <span>Certification {index + 1}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeCertification(index)}
                        className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 cursor-pointer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </CardTitle>
                  </CardHeader>
                    <CardContent className="pt-0">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div
                          className="space-y-2 md:col-span-2 scroll-mt-28"
                          id={`prefill-anchor-cert-${index}`}
                        >
                          <CandidateCertificationComboboxRow
                            index={index}
                            cert={certification}
                            disabled={isLoading}
                            error={!!errors.certifications?.[index]?.certificationId}
                            onCertificationChange={handleCandidateCertificationSelect}
                            certificationIssuers={lookups?.certificationIssuers}
                            certificationIssuersLoading={certificationIssuersLoading}
                            onCertificationIssuerCreated={onCertificationIssuerCreated}
                          />
                          {errors.certifications?.[index]?.certificationId && (
                            <p className="text-sm text-red-500">
                              {errors.certifications[index].certificationId}
                            </p>
                          )}
                          <VerificationCheckbox
                            fieldPath={`certifications.${index}.certificationId`}
                          />
                        </div>

                      <div className="space-y-2">
                        <Label htmlFor={`issueDate-${index}`}>Issue Date</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              id={`issueDate-${index}`}
                              className="w-full justify-between font-normal"
                            >
                              {certification.issueDate ? certification.issueDate.toLocaleDateString() : "Select issue date"}
                              <CalendarIcon />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto overflow-hidden p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={certification.issueDate}
                              captionLayout="dropdown"
                              onSelect={(date) => {
                                handleCertificationChange(index, "issueDate", date)
                              }}
                            />
                          </PopoverContent>
                        </Popover>
                        <VerificationCheckbox fieldPath={`certifications.${index}.issueDate`} />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`expiryDate-${index}`}>Expiry Date</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              id={`expiryDate-${index}`}
                              className="w-full justify-between font-normal"
                            >
                              {certification.expiryDate ? certification.expiryDate.toLocaleDateString() : "Select expiry date"}
                              <CalendarIcon />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto overflow-hidden p-0" align="start">
                            <Calendar
                              mode="single"
                              selected={certification.expiryDate}
                              captionLayout="dropdown"
                              onSelect={(date) => {
                                handleCertificationChange(index, "expiryDate", date)
                              }}
                            />
                          </PopoverContent>
                        </Popover>
                        <VerificationCheckbox fieldPath={`certifications.${index}.expiryDate`} />
                      </div>

                      <div className="min-w-0 space-y-2">
                        <Label htmlFor={`certificationUrl-${index}`}>Certification URL</Label>
                        <Input
                          id={`certificationUrl-${index}`}
                          type="url"
                          placeholder="https://www.credly.com/badges/..."
                          value={certification.certificationUrl}
                          onChange={(e) => handleCertificationChange(index, "certificationUrl", e.target.value)}
                          className={errors.certifications?.[index]?.certificationUrl ? "border-red-500" : ""}
                        />
                        {errors.certifications?.[index]?.certificationUrl && (
                          <p className="text-sm text-red-500">{errors.certifications[index].certificationUrl}</p>
                        )}
                        <VerificationCheckbox fieldPath={`certifications.${index}.certificationUrl`} />
                      </div>

                      <div className="min-w-0 space-y-2">
                        <Label htmlFor={`certificationLevel-${index}`}>Certification Level</Label>
                        <Select
                          value={certification.certificationLevel}
                          onValueChange={(value: CertificationLevelDb) =>
                            handleCertificationChange(index, "certificationLevel", value)
                          }
                        >
                          <SelectTrigger id={`certificationLevel-${index}`}>
                            <SelectValue placeholder="Select level..." />
                          </SelectTrigger>
                          <SelectContent>
                            {certificationLevelOptions.map((level) => (
                              <SelectItem key={level.value} value={level.value}>
                                {level.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <VerificationCheckbox fieldPath={`certifications.${index}.certificationLevel`} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {formData.certifications.length === 0 && (
                <div className="rounded-lg border border-dashed p-6 text-center">
                  <Award className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addCertification}
                    className="cursor-pointer"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Your First Certification
                  </Button>
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>
          </div>

          {/* Competitions Section */}
          <div id="competitions">
          <Collapsible open={competitionsOpen} onOpenChange={setCompetitionsOpen}>
            <div className="flex items-center gap-2">
              <CollapsibleTrigger asChild className="flex-1">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-between cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                    <span className="text-lg font-medium">Achievements</span>
                    {formData.achievements.length > 0 && (
                      <Badge variant="secondary" className="ml-2">
                        {formData.achievements.length}
                      </Badge>
                    )}
                    <SectionProgressBadge 
                      percentage={achievementsProgress.percentage}
                      verified={achievementsProgress.verified}
                      total={achievementsProgress.total}
                    />
                  </div>
                  <ChevronDown
                    className={`h-4 w-4 transition-transform duration-200 ${
                      competitionsOpen ? "transform rotate-180" : ""
                    }`}
                  />
                </Button>
              </CollapsibleTrigger>
              {showVerification && (
                <div 
                  className="flex items-center gap-2 px-2" 
                  onClick={(e) => e.stopPropagation()}
                >
                  <Checkbox
                    id="verify-all-competitions"
                    checked={isSectionFullyVerified('competitions')}
                    onCheckedChange={(checked) => handleVerifyAllSection('competitions', !!checked)}
                    aria-label="Verify all fields in Competitions section"
                  />
                  <Label 
                    htmlFor="verify-all-competitions"
                    className="text-sm text-muted-foreground cursor-pointer font-normal whitespace-nowrap"
                  >
                    Verify All
                  </Label>
                </div>
              )}
            </div>
            <CollapsibleContent className="space-y-4 mt-4">
              <div className="flex items-center justify-end">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addAchievement}
                  className="flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                  Add Achievement
                </Button>
              </div>

              {formData.achievements.map((achievement, index) => (
                <Card key={achievement.id} className="relative">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center justify-between text-base">
                      <span>Achievement {index + 1}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeAchievement(index)}
                        className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 cursor-pointer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                        <Label htmlFor={`name-${index}`}>Name *</Label>
                        <Input
                          id={`name-${index}`}
                          type="text"
                          placeholder="e.g., HackerOne, Gold Medal in Math Olympiad, React Contributor..."
                          value={achievement.name}
                          onChange={(e) => handleAchievementChange(index, "name", e.target.value)}
                          className={errors.achievements?.[index]?.name ? "border-red-500" : ""}
                        />
                        {errors.achievements?.[index]?.name && (
                          <p className="text-sm text-red-500">{errors.achievements[index].name}</p>
                        )}
                        <VerificationCheckbox fieldPath={`achievements.${index}.name`} />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`achievementType-${index}`}>Achievement Type *</Label>
                        <Select
                          value={achievement.achievementType || undefined}
                          onValueChange={(value) => handleAchievementChange(index, "achievementType", value as AchievementType)}
                        >
                          <SelectTrigger id={`achievementType-${index}`}>
                            <SelectValue placeholder="Select type" />
                          </SelectTrigger>
                          <SelectContent>
                            {achievementTypeOptions.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <VerificationCheckbox fieldPath={`achievements.${index}.achievementType`} />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`ranking-${index}`}>Ranking</Label>
                        <Input
                          id={`ranking-${index}`}
                          type="text"
                          placeholder="e.g., Top 1%, Hall of Fame, Gold Medal..."
                          value={achievement.ranking || ""}
                          onChange={(e) => handleAchievementChange(index, "ranking", e.target.value)}
                        />
                        <VerificationCheckbox fieldPath={`achievements.${index}.ranking`} />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`year-${index}`}>Year</Label>
                        <Input
                          id={`year-${index}`}
                          type="number"
                          placeholder="e.g., 2023"
                          value={achievement.year || ""}
                          onChange={(e) => handleAchievementChange(index, "year", e.target.value ? parseInt(e.target.value) : undefined)}
                          min="1900"
                          max={new Date().getFullYear()}
                        />
                        <VerificationCheckbox fieldPath={`achievements.${index}.year`} />
                      </div>

                      <div className="min-w-0 space-y-2">
                        <Label htmlFor={`description-${index}`}>Description</Label>
                        <Textarea
                          id={`description-${index}`}
                          placeholder="Additional context or details about this achievement..."
                          value={achievement.description || ""}
                          onChange={(e) => handleAchievementChange(index, "description", e.target.value)}
                          rows={3}
                        />
                        <VerificationCheckbox fieldPath={`achievements.${index}.description`} />
                      </div>

                      <div className="min-w-0 space-y-2">
                        <Label htmlFor={`url-${index}`}>URL</Label>
                        <Input
                          id={`url-${index}`}
                          type="url"
                          placeholder="https://..."
                          value={achievement.url || ""}
                          onChange={(e) => handleAchievementChange(index, "url", e.target.value)}
                          className={errors.achievements?.[index]?.url ? "border-red-500" : ""}
                        />
                        {errors.achievements?.[index]?.url && (
                          <p className="text-sm text-red-500">{errors.achievements[index].url}</p>
                        )}
                        <VerificationCheckbox fieldPath={`achievements.${index}.url`} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {formData.achievements.length === 0 && (
                <div className="rounded-lg border border-dashed p-6 text-center">
                  <Trophy className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addAchievement}
                    className="cursor-pointer"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Your First Achievement
                  </Button>
                </div>
              )}
            </CollapsibleContent>
          </Collapsible>
          </div>

          <div id="mentors">
          <Collapsible open={mentorsOpen} onOpenChange={setMentorsOpen}>
            <div className="flex items-center gap-2">
              <CollapsibleTrigger asChild className="flex-1">
                <Button type="button" variant="outline" className="w-full justify-between cursor-pointer">
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    <span className="text-lg font-medium">Mentors</span>
                    {formData.mentors.length > 0 && (
                      <Badge variant="secondary" className="ml-2">{formData.mentors.length}</Badge>
                    )}
                    <SectionProgressBadge
                      percentage={mentorsProgress.percentage}
                      verified={mentorsProgress.verified}
                      total={mentorsProgress.total}
                    />
                  </div>
                  <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${mentorsOpen ? "transform rotate-180" : ""}`} />
                </Button>
              </CollapsibleTrigger>
              {showVerification && (
                <div className="flex items-center gap-2 px-2" onClick={(event) => event.stopPropagation()}>
                  <Checkbox
                    id="verify-all-mentors"
                    checked={isSectionFullyVerified("mentors")}
                    onCheckedChange={(checked) => handleVerifyAllSection("mentors", !!checked)}
                    aria-label="Verify all fields in Mentors section"
                  />
                  <Label htmlFor="verify-all-mentors" className="text-sm text-muted-foreground cursor-pointer font-normal whitespace-nowrap">
                    Verify All
                  </Label>
                </div>
              )}
            </div>
            <CollapsibleContent className="space-y-4 mt-4">
              <div className="flex items-center justify-end gap-2">
                <Button type="button" variant="outline" size="sm" onClick={addLinkMentor} className="cursor-pointer">
                  Link Existing Mentor
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={addCreateMentor} className="cursor-pointer">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Mentor
                </Button>
              </div>
              {formData.mentors.map((mentor, index) => {
                const personLocked = !mentor.createNew && /^\d+$/.test(mentor.id)
                const takenMentorIds = formData.mentors
                  .filter((row, rowIndex) => rowIndex !== index && row.mentorId != null)
                  .map((row) => row.mentorId as number)
                return (
                  <Card key={mentor.id}>
                    <CardHeader className="pb-4">
                      <CardTitle className="flex items-center justify-between text-base">
                        <span>{mentor.createNew ? "New mentor" : "Linked mentor"} {index + 1}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeMentor(index)}
                          className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 cursor-pointer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {mentor.createNew ? (
                          <>
                            <div className="space-y-2">
                              <Label htmlFor={`mentor-name-${index}`}>Name *</Label>
                              <Input
                                id={`mentor-name-${index}`}
                                value={mentor.name}
                                onChange={(event) => updateMentorRow(index, { name: event.target.value })}
                                className={errors.mentors?.[index]?.name ? "border-red-500" : ""}
                              />
                              {errors.mentors?.[index]?.name && (
                                <p className="text-sm text-red-500">{errors.mentors[index].name}</p>
                              )}
                              <VerificationCheckbox fieldPath={`mentors.${index}.name`} />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor={`mentor-designation-${index}`}>Designation</Label>
                              <Input
                                id={`mentor-designation-${index}`}
                                value={mentor.designation}
                                onChange={(event) => updateMentorRow(index, { designation: event.target.value })}
                              />
                              <VerificationCheckbox fieldPath={`mentors.${index}.designation`} />
                            </div>
                            <div className="space-y-2 md:col-span-2">
                              <EmployerCombobox
                                id={`mentor-organization-${index}`}
                                label="Organization *"
                                value={
                                  mentor.employerId != null
                                    ? { id: mentor.employerId, name: mentor.employerName }
                                    : null
                                }
                                onChange={(employer) =>
                                  updateMentorRow(index, {
                                    employerId: employer?.id ?? null,
                                    employerName: employer?.name ?? "",
                                  })
                                }
                                error={!!errors.mentors?.[index]?.employerId}
                                nestedEmployerCreation={nestedEmployerCreation}
                              />
                              {errors.mentors?.[index]?.employerId && (
                                <p className="text-sm text-red-500">{errors.mentors[index].employerId}</p>
                              )}
                              <VerificationCheckbox fieldPath={`mentors.${index}.employerId`} />
                            </div>
                          </>
                        ) : personLocked ? (
                          <>
                            <div className="space-y-1">
                              <p className="text-sm font-medium text-muted-foreground">Name</p>
                              <p className="text-sm">{mentor.name || "N/A"}</p>
                              <VerificationCheckbox fieldPath={`mentors.${index}.mentorId`} />
                            </div>
                            <div className="space-y-1">
                              <p className="text-sm font-medium text-muted-foreground">Designation</p>
                              <p className={mentor.designation.trim() ? "text-sm" : "text-sm italic text-muted-foreground"}>
                                {mentor.designation.trim() || "N/A"}
                              </p>
                            </div>
                            <div className="space-y-1 md:col-span-2">
                              <p className="text-sm font-medium text-muted-foreground">Organization</p>
                              <p className="text-sm">{mentor.employerName || "N/A"}</p>
                            </div>
                          </>
                        ) : (
                          <div className="space-y-2 md:col-span-2">
                            <Label htmlFor={`mentor-pick-${index}`}>Mentor *</Label>
                            <MentorCombobox
                              id={`mentor-pick-${index}`}
                              value={
                                mentor.mentorId != null
                                  ? {
                                      id: mentor.mentorId,
                                      name: mentor.name,
                                      designation: mentor.designation || null,
                                      employerId: mentor.employerId ?? 0,
                                      employerName: mentor.employerName,
                                    }
                                  : null
                              }
                              excludeIds={takenMentorIds}
                              error={!!errors.mentors?.[index]?.mentorId}
                              onChange={(hit) =>
                                updateMentorRow(index, {
                                  mentorId: hit?.id ?? null,
                                  name: hit?.name ?? "",
                                  designation: hit?.designation ?? "",
                                  employerId: hit?.employerId ?? null,
                                  employerName: hit?.employerName ?? "",
                                })
                              }
                            />
                            {errors.mentors?.[index]?.mentorId && (
                              <p className="text-sm text-red-500">{errors.mentors[index].mentorId}</p>
                            )}
                            <VerificationCheckbox fieldPath={`mentors.${index}.mentorId`} />
                          </div>
                        )}
                        <div className="space-y-2">
                          <Label htmlFor={`mentor-relationship-${index}`}>Relationship</Label>
                          <Input
                            id={`mentor-relationship-${index}`}
                            value={mentor.relationship}
                            onChange={(event) => updateMentorRow(index, { relationship: event.target.value })}
                            placeholder="Manager, team lead, colleague..."
                          />
                          <VerificationCheckbox fieldPath={`mentors.${index}.relationship`} />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                          <Label htmlFor={`mentor-reasoning-${index}`}>Reasoning</Label>
                          <Textarea
                            id={`mentor-reasoning-${index}`}
                            value={mentor.reasoning}
                            onChange={(event) => updateMentorRow(index, { reasoning: event.target.value })}
                            placeholder="Why the candidate considers them competent"
                            rows={3}
                          />
                          <VerificationCheckbox fieldPath={`mentors.${index}.reasoning`} />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </CollapsibleContent>
          </Collapsible>
          </div>

          <div id="final-remarks">
          <Collapsible open={finalRemarksOpen} onOpenChange={setFinalRemarksOpen}>
            <div className="flex items-center gap-2">
              <CollapsibleTrigger asChild className="flex-1">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full justify-between cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-primary" />
                    <span className="text-lg font-medium">Final Remarks</span>
                    <SectionProgressBadge
                      percentage={finalRemarksProgress.percentage}
                      verified={finalRemarksProgress.verified}
                      total={finalRemarksProgress.total}
                    />
                  </div>
                  <ChevronDown
                    className={`h-4 w-4 transition-transform duration-200 ${
                      finalRemarksOpen ? "transform rotate-180" : ""
                    }`}
                  />
                </Button>
              </CollapsibleTrigger>
              {showVerification && (
                <div
                  className="flex items-center gap-2 px-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Checkbox
                    id="verify-all-final-remarks"
                    checked={isSectionFullyVerified("final-remarks")}
                    onCheckedChange={(checked) => handleVerifyAllSection("final-remarks", !!checked)}
                    aria-label="Verify all fields in Final Remarks section"
                  />
                  <Label
                    htmlFor="verify-all-final-remarks"
                    className="text-sm text-muted-foreground cursor-pointer font-normal whitespace-nowrap"
                  >
                    Verify All
                  </Label>
                </div>
              )}
            </div>
            <CollapsibleContent className="space-y-4 mt-4">
              <div className="space-y-2">
                {mode !== "create" ? (
                  <Label htmlFor="finalRemarks">Final Remarks</Label>
                ) : null}
                <Textarea
                  id="finalRemarks"
                  placeholder="Enter remarks made after the call or after reviewing this profile…"
                  value={formData.finalRemarks}
                  onChange={(e) => handleInputChange("finalRemarks", e.target.value)}
                  rows={4}
                  aria-label={mode === "create" ? "Final Remarks" : undefined}
                />
                <VerificationCheckbox fieldPath="finalRemarks" />
              </div>
            </CollapsibleContent>
          </Collapsible>
          </div>

          </form>
        </div>

        <DialogFooter className="px-6 py-4 border-t border-border gap-2 flex-col items-stretch sm:flex-col sm:items-stretch">
          {pendingResumeRetry && (
            <div
              className="rounded-md border border-amber-500/40 bg-amber-500/10 p-4 space-y-3 w-full"
              role="alert"
              tabIndex={-1}
            >
              <p className="text-sm font-medium">
                {mode === "edit"
                  ? "Candidate updated, but the new resume could not be uploaded."
                  : "Candidate created successfully, but the resume could not be uploaded."}
              </p>
              {resumeUploadError && (
                <p className="text-sm text-muted-foreground">{resumeUploadError}</p>
              )}
              <p className="text-xs text-muted-foreground truncate" title={pendingResumeRetry.file.name}>
                {pendingResumeRetry.file.name} ({formatResumeFileSize(pendingResumeRetry.file.size)})
              </p>
              {mode === "create" && (
                <ResumeUploadStatus stage={resumeUploadStage} className="text-foreground" />
              )}
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  onClick={handleRetryResumeUpload}
                  disabled={isRetryingResume}
                >
                  {isRetryingResume && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Retry Resume Upload
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCloseAfterPartialSuccess}
                  disabled={isRetryingResume}
                >
                  Close
                </Button>
              </div>
            </div>
          )}

          {mode === "create" && (
            <ResumeUploadStatus
              stage={resumeUploadStage}
              creatingCandidate={isCreatingCandidate && !resumeUploadStage}
              className="w-full"
            />
          )}

          <div className="flex justify-end gap-2 w-full">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isLoading || isRetryingResume}
              className="cursor-pointer"
            >
              {pendingResumeRetry ? "Close" : "Cancel"}
            </Button>
            {!pendingResumeRetry && (
            <Button 
              type="submit"
              form="candidate-form"
                disabled={isLoading || isRetryingResume}
              className="transition-all duration-200 ease-in-out hover:scale-[1.02] hover:shadow-sm cursor-pointer disabled:hover:scale-100 disabled:hover:shadow-none"
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {getSubmitButtonText(isLoading)}
            </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
      
      {/* Unsaved Changes Warning Dialog */}
      <AlertDialog open={showUnsavedWarning} onOpenChange={setShowUnsavedWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes. Are you sure you want to close? All changes will be lost.
              {showVerification && verifiedFields.size > 0 && (
                <span className="block mt-2 font-medium text-yellow-600 dark:text-yellow-400">
                  {verifiedFields.size} field(s) marked for verification will not be saved.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelClose} className="cursor-pointer">
              Keep Editing
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmClose}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 cursor-pointer"
            >
              Discard Changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </Dialog>
  )
}
