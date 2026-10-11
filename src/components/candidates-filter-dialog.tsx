"use client"

import * as React from "react"
import { useState, useRef, useEffect, useMemo, useCallback } from "react"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { MultiSelect, MultiSelectOption } from "@/components/ui/multi-select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Command,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Filter, CalendarIcon, X, ChevronsUpDown, Check, Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import { buildTechStackMultiSelectOptions } from "@/lib/utils/tech-stack-lookup"
import { timeSupportZoneLookupItemsToMultiSelectOptions } from "@/lib/utils/time-support-zone-lookup"
import { degreeLookupItemsToMultiSelectOptions } from "@/lib/utils/degree-lookup"
import { majorLookupItemsToMultiSelectOptions } from "@/lib/utils/major-lookup"
import { countryLookupItemsToMultiSelectOptions } from "@/lib/utils/country-lookup"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { sampleCandidates } from "@/lib/sample-data/candidates"
import { searchEmployers, fetchEmployerById } from "@/lib/services/employers-api"
import type { EmployerLookupDto } from "@/lib/services/employers-api"
import { useProjectSearch } from "@/hooks/useProjectSearch"
import { useCertificationSearch } from "@/hooks/useCertificationSearch"
import { useUniversitySearch } from "@/hooks/useUniversitySearch"
import { useScrollSpySection } from "@/hooks/use-scroll-spy-section"
import { fetchProjectById } from "@/lib/services/projects-lookup-api"
import type { ProjectLookupDto } from "@/lib/services/projects-lookup-api"
import { fetchCertificationById } from "@/lib/services/certifications-lookup-api"
import type { CertificationLookupDto } from "@/lib/services/certifications-lookup-api"
import { fetchUniversityById } from "@/lib/services/universities-api"
import { useUniversityCampusLocationsForIds } from "@/hooks/useUniversityCampusLocations"
import { useEmployerOfficeLocationsForIds } from "@/hooks/useEmployerOfficeLocations"
import type { UniversityLookupDto } from "@/lib/services/universities-api"
import { sampleProjects } from "@/lib/sample-data/projects"
import {
  PROJECT_STATUS_LABELS,
  PROJECT_TYPES,
  PUBLISH_PLATFORM_FILTER_OPTIONS,
  ProjectStatus,
} from "@/lib/types/project"
import { EmployerStatus, EmployerRanking, EMPLOYER_STATUS_LABELS, SALARY_POLICY_LABELS, EMPLOYER_RANKING_LABELS, EMPLOYER_TYPE_LABELS } from "@/lib/types/employer"
import {
  CANDIDATE_SOURCE_DB,
  CANDIDATE_SOURCE_LABELS,
  type CandidateSourceDb,
  MBTI_TYPES,
  type MbtiType,
  SHIFT_TYPE_DB,
  SHIFT_TYPE_LABELS,
  type ShiftTypeDb,
  WORK_MODE_DB,
  WORK_MODE_LABELS,
  type WorkModeDb,
  CERTIFICATION_LEVEL_DB,
  CERTIFICATION_LEVEL_LABELS_DB,
  type CertificationLevelDb,
} from "@/lib/constants/candidate-enums"
import type { LookupItem } from "@/lib/services/lookups-api"
import type { CertificationIssuer } from "@/lib/types/certification"
import {
  CALL_STATUS_UI_ORDER,
  CALL_STATUS_LABELS,
  type CallStatusDb,
} from "@/lib/constants/candidate-enums"
// Filter interfaces
export interface CandidateFilters {
  /** Free-text substring on candidate name (case-insensitive when applied). */
  name: string
  // Dedicated posting title filter
  postingTitle: string
  /** Free-text substring on candidate residence city (matches DB text; case-insensitive when applied). */
  city: string
  currentSalaryMin: string
  currentSalaryMax: string
  expectedSalaryMin: string
  expectedSalaryMax: string
  /** Employer id strings from debounced API search, or legacy employer names (see `workExperienceMatchesEmployerFilter`). */
  employers: string[]
  /** WE office PKs (`employerLocationIds` on GET /api/candidates). Enabled after employers are selected. */
  employerLocationIds: string[]
  /** Project id strings from debounced API search (`/api/projects/search`), or legacy project names. */
  projects: string[]
  // Project-related filters
  projectStatus: string[]
  projectTypes: string[]
  /** Project tech stack names → `techStackIds` on GET /api/candidates (OR on linked project stacks only). */
  techStacks: string[]
  clientLocations: string[]  // Filter by client's location in projects (e.g., "San Francisco", "Silicon Valley", "United States")
  verticalDomains: string[]
  horizontalDomains: string[]
  /** Labels aligned with project `technicalDomains` catalog ids. */
  technicalDomains: string[]
  /** Catalog ids as strings from GET /api/TechnicalAspects. */
  technicalAspects: string[]
  /** Catalog ids as strings from GET /api/TechnicalAspectTypes (`id`). */
  technicalAspectTypeIds: string[]
  // Start Date Range - filters by project startDate only
  startDateStart: Date | null
  startDateEnd: Date | null
  // Candidate work experience tech stacks
  candidateTechStacks: string[]
  /** `ShiftTypeDb` keys (same as work experience shift type in CandidateCreationDialog). */
  shiftTypes: string[]
  /** `WorkModeDb` keys (same as work experience work mode in CandidateCreationDialog). */
  workModes: string[]
  /**
   * WE-owned salary policy display labels → API `workExperienceSalaryPolicies`.
   * Independent of `employerSalaryPolicies`.
   */
  workExperienceSalaryPolicies: string[]
  /**
   * Overlap span for work-experience `minimumSalary`/`maximumSalary`.
   * Query params `workExperienceSalaryMin` and `workExperienceSalaryMax`.
   */
  workExperienceSalaryMin: string
  workExperienceSalaryMax: string
  /** Time support zone names from master data (same strings as work experience multi-select). */
  timeSupportZones: string[]
  /** Benefit names from GET /api/benefits → API `workExperienceBenefitIds`. */
  workExperienceBenefits: string[]
  // Job title filter
  jobTitle: string
  // Years of experience filters
  yearsOfExperienceMin: string
  yearsOfExperienceMax: string
  // Average job tenure filters (across all employers)
  avgJobTenureMin: string
  avgJobTenureMax: string
  // Joined Project From Start filter
  joinedProjectFromStart: boolean | null  // null = no filter, true = joined from start
  joinedProjectFromStartToleranceDays: number  // Tolerance window in days (default: 30)
  // Mutual Connections with DPL filter
  hasMutualConnectionWithDPL: boolean | null  // null = no filter, true = has mutual connection
  mutualConnectionToleranceMonths: number  // Tolerance for date gaps in months (default: 0)
  mutualConnectionType: 'education' | 'work' | 'both' | null  // Filter by connection type
  // Project team size filters
  averageTeamSizeMin: string
  averageTeamSizeMax: string
  // Published project filters
  hasPublishedProject: boolean | null  // null = no filter, true = has published app/project
  /** null = off, true = has ≥1 WE project with isMainContribution */
  hasMainContribution: boolean | null
  publishPlatforms: string[]  // ["App Store", "Play Store"] - filter by specific platforms
  minProjectDownloadCount: string  // Minimum download count for projects candidate worked on (e.g., "100000" for 100K+)
  // Employer-related filters
  employerStatus: string[]
  employerCountries: string[]
  /** Substring match on employer office `city` (free text in Employer Locations, not a master list). */
  employerCity: string
  employerTypes: string[]  // Filter by employer type (includes IT Consulting, BPO)
  employerSalaryPolicies: string[]
  employerSizeMin: string
  employerSizeMax: string
  employerRankings: string[]  // Filter candidates by employer ranking
  /** University id strings from debounced search or URL chip (`universityIds` on GET /api/candidates). */
  universities: string[]
  /** Campus location PKs (`universityLocationIds` on GET /api/candidates). Enabled after universities are selected. */
  universityLocationIds: string[]
  // Education detail filters
  degreeNames: string[]
  majorNames: string[]
  isTopper: boolean | null  // null = no filter, true = only toppers, false = only non-toppers
  isCheetah: boolean | null // null = no filter, true = only cheetah, false = only non-cheetah
  // Graduation Date Range - filters by endMonth only
  educationEndDateStart: Date | null
  educationEndDateEnd: Date | null
  /** Certification catalog id strings from debounced search, or legacy certification names. */
  certificationNames: string[]
  certificationIssuingBodies: string[]
  /** `CertificationLevelDb` keys (`foundation`, …) — same as create/edit certification level. */
  certificationLevels: string[]
  /** Filter by MBTI — values are four-letter `MbtiType` codes (same as create/edit combobox). */
  personalityTypes: string[]
  /** Filter by candidate source — values are `CandidateSourceDb` keys (same as create/edit form). */
  source: string[]
  /** Call Status filter; values are `CallStatusDb` keys → API `callStatus` ints (OR). */
  callStatuses: CallStatusDb[]
  // Achievement-related filters (renamed from competition-related)
  achievementTypes: string[]  // Filter by achievement type (e.g., ["Competition", "Open Source", "Award"])
  /** Substring match on achievement `name` (same free-text field as CandidateCreationDialog achievements). */
  achievementName: string
  // Verification percentage filters
  verificationPercentageMin: string  // Minimum verification percentage (0-100)
  verificationPercentageMax: string  // Maximum verification percentage (0-100)
  /** Min/max stored profile completion 0–100 → `minDataProgressPercentage` / `maxDataProgressPercentage` on GET /api/candidates. */
  dataProgressMin: string
  dataProgressMax: string
}

interface CandidatesFilterDialogProps {
  children?: React.ReactNode
  filters: CandidateFilters
  onFiltersChange: (filters: CandidateFilters) => void
  onClearFilters: () => void
  /** Time support zone master data (same names as CandidateCreationDialog `lookups.timeSupportZones`). */
  timeSupportZones?: LookupItem[]
  /** Client location master data (same as ProjectsFilterDialog / GET client locations API). */
  clientLocations?: LookupItem[]
  /** Country names from GET /api/countries (same as EmployerCreationDialog / EmployersFilterDialog). */
  countries?: LookupItem[]
  /** Certification issuers from GET /api/CertificationIssuers (same catalog as certification forms). */
  certificationIssuers?: CertificationIssuer[]
  /** From GET /api/degrees — same catalog as CandidateCreationDialog education combobox. */
  degrees?: LookupItem[]
  /** From GET /api/majors — same catalog as CandidateCreationDialog education combobox. */
  majors?: LookupItem[]
  /** From GET /api/techstacks — project expertise + candidate tech stack filters. */
  techStacks?: LookupItem[]
  /** From GET /api/benefits — work experience benefits filter (same catalog as WE create/edit). */
  benefits?: LookupItem[]
  /** From GET /api/TechnicalAspectTypes — same catalog as Projects filter / creation dialog. */
  technicalAspectTypes?: MultiSelectOption[]
  verticalDomains?: MultiSelectOption[]
  horizontalDomains?: MultiSelectOption[]
  technicalDomains?: MultiSelectOption[]
  /** From GET /api/TechnicalAspects. */
  technicalAspects?: MultiSelectOption[]
  /** Recruiter: hide salary / WE compensation filter controls. */
  hideCompensationFilters?: boolean
}

// Mock data for filter options (removed unused statusOptions)

// Mock data for filter options
// Extract tech stacks from projects (for Project Expertise filter)
const extractUniqueProjectTechStacks = () => {
  const techStacks = new Set<string>()
  sampleProjects.forEach(project => {
    project.techStacks.forEach(tech => techStacks.add(tech))
  })
  return Array.from(techStacks).sort()
}

// Extract tech stacks from candidate work experiences (for Candidate Tech Stacks filter)
const extractUniqueCandidateTechStacks = () => {
  const techStacksMap = new Map<string, string>() // Map<lowercase, original>
  sampleCandidates.forEach(candidate => {
    candidate.workExperiences?.forEach(we => {
      we.techStacks.forEach(tech => {
        const lowerTech = tech.toLowerCase().trim()
        if (lowerTech && !techStacksMap.has(lowerTech)) {
          // Store the first occurrence (preserving original casing)
          techStacksMap.set(lowerTech, tech.trim())
        }
      })
    })
  })
  return Array.from(techStacksMap.values()).sort()
}

// Extract unique client locations from projects
const extractUniqueClientLocations = () => {
  const locations = new Set<string>()
  sampleProjects.forEach(project => {
    if (project.clientLocation) {
      locations.add(project.clientLocation)
    }
  })
  return Array.from(locations).sort()
}

// Project-related filter options (same DB-aligned enums as project creation / projects filter)
const projectStatusOptions: MultiSelectOption[] = Object.entries(PROJECT_STATUS_LABELS).map(
  ([value, label]) => ({
    value: value as ProjectStatus,
    label,
  })
)

const projectTypeOptions: MultiSelectOption[] = PROJECT_TYPES.map((type) => ({
  value: type,
  label: type,
}))

/** Same shift type keys as work experience in CandidateCreationDialog (`shift_type_enum`). */
const shiftTypeFilterOptions: MultiSelectOption[] = SHIFT_TYPE_DB.map((key: ShiftTypeDb) => ({
  value: key,
  label: SHIFT_TYPE_LABELS[key],
}))

/** Same work mode keys as work experience in CandidateCreationDialog (`work_mode_enum`). */
const workModeFilterOptions: MultiSelectOption[] = WORK_MODE_DB.map((key: WorkModeDb) => ({
  value: key,
  label: WORK_MODE_LABELS[key],
}))

const publishPlatformFilterOptions: MultiSelectOption[] = PUBLISH_PLATFORM_FILTER_OPTIONS.map((o) => ({
  value: o.value,
  label: o.label,
}))

// Employer-related filter options (same catalog as EmployersFilterDialog / employer `status` field)
const employerStatusOptions: MultiSelectOption[] = Object.entries(EMPLOYER_STATUS_LABELS).map(
  ([value, label]) => ({
    value: value as EmployerStatus,
    label,
  }),
)

const employerSalaryPolicyOptions: MultiSelectOption[] = Object.entries(SALARY_POLICY_LABELS).map(([value, label]) => ({
  value,
  label,
}))

/** Same option catalog as employer salary policy; query param is `workExperienceSalaryPolicies`. */
const workExperienceSalaryPolicyOptions: MultiSelectOption[] = employerSalaryPolicyOptions

const employerRankingOptions: MultiSelectOption[] = Object.entries(EMPLOYER_RANKING_LABELS).map(([value, label]) => ({
  value: value as EmployerRanking,
  label
}))

// Certification level: same DB keys + labels as CandidateCreationDialog (`certification_level_enum`).
const certificationLevelOptions: MultiSelectOption[] = CERTIFICATION_LEVEL_DB.map(
  (key: CertificationLevelDb) => ({
    value: key,
    label: CERTIFICATION_LEVEL_LABELS_DB[key],
  }),
)

/** Hidden from filter UI; filter state and API query params are unchanged. */
const SHOW_DATA_VERIFICATION_FILTER = false
const SHOW_AVG_JOB_TENURE_FILTER = false
const SHOW_JOINED_PROJECT_FROM_START_FILTER = false
const SHOW_MUTUAL_CONNECTION_FILTER = false

// Achievement-related filter options
const achievementTypeOptions: MultiSelectOption[] = [
  { value: "Competition", label: "Competition" },
  { value: "Open Source", label: "Open Source" },
  { value: "Award", label: "Award" },
  { value: "Medal", label: "Medal" },
  { value: "Publication", label: "Publication" },
  { value: "Certification", label: "Certification" },
  { value: "Recognition", label: "Recognition" },
  { value: "Other", label: "Other" },
]

/** Same MBTI list as personality combobox in CandidateCreationDialog (DB `mbti_type` four-letter codes). */
const personalityTypeFilterOptions: MultiSelectOption[] = MBTI_TYPES.map((t: MbtiType) => ({
  value: t,
  label: t,
}))

/** Same options as Source select in CandidateCreationDialog (DB enum keys + display labels). */
const sourceFilterOptions: MultiSelectOption[] = CANDIDATE_SOURCE_DB.map((key: CandidateSourceDb) => ({
  value: key,
  label: CANDIDATE_SOURCE_LABELS[key],
}))

const callStatusFilterOptions: MultiSelectOption[] = CALL_STATUS_UI_ORDER.map((status) => ({
  value: status,
  label: CALL_STATUS_LABELS[status],
}))

const initialFilters: CandidateFilters = {
  name: "",
  postingTitle: "",
  city: "",
  currentSalaryMin: "",
  currentSalaryMax: "",
  expectedSalaryMin: "",
  expectedSalaryMax: "",
  employers: [],
  employerLocationIds: [],
  projects: [],
  // Project-related filters
  projectStatus: [],
  projectTypes: [],
  techStacks: [],
  clientLocations: [],
  verticalDomains: [],
  horizontalDomains: [],
  technicalDomains: [],
  technicalAspects: [],
  technicalAspectTypeIds: [],
  startDateStart: null,
  startDateEnd: null,
  // Candidate work experience tech stacks
  candidateTechStacks: [],
  // Candidate work experience shift types
  shiftTypes: [],
  // Candidate work experience work modes
  workModes: [],
  workExperienceSalaryPolicies: [],
  workExperienceSalaryMin: "",
  workExperienceSalaryMax: "",
  // Candidate work experience time support zones
  timeSupportZones: [],
  workExperienceBenefits: [],
  // Job title filter
  jobTitle: "",
  // Years of experience filters
  yearsOfExperienceMin: "",
  yearsOfExperienceMax: "",
  // Average job tenure filters
  avgJobTenureMin: "",
  avgJobTenureMax: "",
  // Joined Project From Start filter
  joinedProjectFromStart: null,
  joinedProjectFromStartToleranceDays: 30,
  // Mutual Connections with DPL filter
  hasMutualConnectionWithDPL: null,
  mutualConnectionToleranceMonths: 0,  // Default: 0 = exact overlap required
  mutualConnectionType: null,  // null = both education and work
  // Project team size filters
  averageTeamSizeMin: "",
  averageTeamSizeMax: "",
  // Published project filters
  hasPublishedProject: null,
  hasMainContribution: null,
  publishPlatforms: [],
  minProjectDownloadCount: "",
  // Employer-related filters
  employerStatus: [],
  employerCountries: [],
  employerCity: "",
  employerTypes: [],
  employerSalaryPolicies: [],
  employerSizeMin: "",
  employerSizeMax: "",
  employerRankings: [],
  universities: [],
  universityLocationIds: [],
  // Education detail filters
  degreeNames: [],
  majorNames: [],
  isTopper: null,
  isCheetah: null,
  educationEndDateStart: null,
  educationEndDateEnd: null,
  // Certification-related filters
  certificationNames: [],
  certificationIssuingBodies: [],
  certificationLevels: [],
  // Personality type filter
  personalityTypes: [],
  source: [],
  callStatuses: [],
  // Achievement-related filters
  achievementTypes: [],
  achievementName: "",
  // Verification percentage filters
  verificationPercentageMin: "",
  verificationPercentageMax: "",
  // Data Progress filters
  dataProgressMin: "",
  dataProgressMax: "",
}

function clearSectionFromFilters(
  prev: CandidateFilters,
  sectionId: string,
): CandidateFilters {
      const updated = { ...prev }
      switch (sectionId) {
        case "basic":
      updated.name = ""
      updated.city = ""
          updated.personalityTypes = []
          updated.source = []
      updated.callStatuses = []
          updated.currentSalaryMin = ""
          updated.currentSalaryMax = ""
          updated.expectedSalaryMin = ""
          updated.expectedSalaryMax = ""
          updated.postingTitle = ""
          updated.verificationPercentageMin = ""
          updated.verificationPercentageMax = ""
          updated.dataProgressMin = ""
          updated.dataProgressMax = ""
          break
        case "experience":
          updated.candidateTechStacks = []
          updated.shiftTypes = []
          updated.workModes = []
      updated.workExperienceSalaryPolicies = []
          updated.workExperienceSalaryMin = ""
          updated.workExperienceSalaryMax = ""
          updated.timeSupportZones = []
      updated.workExperienceBenefits = []
          updated.jobTitle = ""
            updated.yearsOfExperienceMin = ""
            updated.yearsOfExperienceMax = ""
            updated.avgJobTenureMin = ""
            updated.avgJobTenureMax = ""
      updated.joinedProjectFromStart = null
      updated.joinedProjectFromStartToleranceDays = 30
            updated.hasMutualConnectionWithDPL = null
            updated.mutualConnectionToleranceMonths = 0
            updated.mutualConnectionType = null
          break
        case "projects":
          updated.projects = []
          updated.projectStatus = []
          updated.projectTypes = []
          updated.techStacks = []
          updated.clientLocations = []
          updated.verticalDomains = []
          updated.horizontalDomains = []
      updated.technicalDomains = []
          updated.technicalAspects = []
      updated.technicalAspectTypeIds = []
          updated.startDateStart = null
          updated.startDateEnd = null
      updated.averageTeamSizeMin = ""
      updated.averageTeamSizeMax = ""
          updated.hasPublishedProject = null
      updated.hasMainContribution = null
          updated.publishPlatforms = []
          updated.minProjectDownloadCount = ""
          break
        case "employers":
          updated.employers = []
      updated.employerLocationIds = []
          updated.employerStatus = []
          updated.employerCountries = []
      updated.employerCity = ""
          updated.employerTypes = []
          updated.employerSalaryPolicies = []
          updated.employerSizeMin = ""
          updated.employerSizeMax = ""
          updated.employerRankings = []
          break
        case "education":
      updated.universities = []
      updated.universityLocationIds = []
          updated.degreeNames = []
          updated.majorNames = []
          updated.isTopper = null
          updated.isCheetah = null
          updated.educationEndDateStart = null
          updated.educationEndDateEnd = null
          break
        case "certifications":
          updated.certificationNames = []
          updated.certificationIssuingBodies = []
          updated.certificationLevels = []
          break
        case "competitions":
          updated.achievementTypes = []
      updated.achievementName = ""
          break
      }
      return updated
}

export function CandidatesFilterDialog({
  children,
  filters,
  onFiltersChange,
  onClearFilters,
  timeSupportZones = [],
  clientLocations = [],
  countries = [],
  certificationIssuers = [],
  degrees = [],
  majors = [],
  techStacks = [],
  benefits = [],
  technicalAspectTypes = [],
  verticalDomains = [],
  horizontalDomains = [],
  technicalDomains: technicalDomainCatalogOptions = [],
  technicalAspects: technicalAspectCatalogOptions = [],
  hideCompensationFilters = false,
}: CandidatesFilterDialogProps) {
  const [open, setOpen] = useState(false)
  const [tempFilters, setTempFilters] = useState<CandidateFilters>(filters)
  const selectedUniversityIds = useMemo(
    () =>
      tempFilters.universities
        .map((id) => Number(id))
        .filter((n) => Number.isFinite(n) && n > 0),
    [tempFilters.universities],
  )
  const selectedEmployerIds = useMemo(
    () =>
      tempFilters.employers
        .map((id) => Number(id))
        .filter((n) => Number.isFinite(n) && n > 0),
    [tempFilters.employers],
  )
  const { locations: officeLocationOptions, loading: officeLocationsLoading } =
    useEmployerOfficeLocationsForIds(selectedEmployerIds)
  const officeLocationFilterItems = useMemo<MultiSelectOption[]>(
    () => officeLocationOptions.map((loc) => ({ value: String(loc.id), label: loc.label })),
    [officeLocationOptions],
  )
  const allowedOfficeLocationIds = useMemo(
    () => new Set(officeLocationOptions.map((loc) => String(loc.id))),
    [officeLocationOptions],
  )

  useEffect(() => {
    if (tempFilters.employers.length === 0) {
      if (tempFilters.employerLocationIds.length > 0) {
        setTempFilters((prev) => ({ ...prev, employerLocationIds: [] }))
      }
      return
    }
    if (officeLocationsLoading) return
    setTempFilters((prev) => {
      const next = prev.employerLocationIds.filter((id) => allowedOfficeLocationIds.has(id))
      if (next.length === prev.employerLocationIds.length) return prev
      return { ...prev, employerLocationIds: next }
    })
  }, [
    tempFilters.employers.length,
    tempFilters.employerLocationIds,
    officeLocationsLoading,
    allowedOfficeLocationIds,
  ])

  const { locations: campusLocationOptions, loading: campusLocationsLoading } =
    useUniversityCampusLocationsForIds(selectedUniversityIds)
  const campusLocationFilterItems = useMemo<MultiSelectOption[]>(
    () => campusLocationOptions.map((loc) => ({ value: String(loc.id), label: loc.label })),
    [campusLocationOptions],
  )
  const allowedCampusLocationIds = useMemo(
    () => new Set(campusLocationOptions.map((loc) => String(loc.id))),
    [campusLocationOptions],
  )

  useEffect(() => {
    if (tempFilters.universities.length === 0) {
      if (tempFilters.universityLocationIds.length > 0) {
        setTempFilters((prev) => ({ ...prev, universityLocationIds: [] }))
      }
      return
    }
    if (campusLocationsLoading) return
    setTempFilters((prev) => {
      const next = prev.universityLocationIds.filter((id) => allowedCampusLocationIds.has(id))
      if (next.length === prev.universityLocationIds.length) return prev
      return { ...prev, universityLocationIds: next }
    })
  }, [
    tempFilters.universities.length,
    tempFilters.universityLocationIds,
    campusLocationsLoading,
    allowedCampusLocationIds,
  ])

  const timeSupportZoneFilterOptions = useMemo<MultiSelectOption[]>(
    () => timeSupportZoneLookupItemsToMultiSelectOptions(timeSupportZones),
    [timeSupportZones],
  )

  /** Same pattern as ProjectsFilterDialog: API lookup names, fallback to sample project strings. */
  const clientLocationFilterOptions = useMemo<MultiSelectOption[]>(() => {
    if (clientLocations.length > 0) {
      return clientLocations.map((l) => ({ value: l.name, label: l.name }))
    }
    return extractUniqueClientLocations().map((location) => ({
      value: location,
      label: location,
    }))
  }, [clientLocations])

  /** Same country catalog as EmployersFilterDialog (`GET /api/countries`, CN4 sort). */
  const employerCountryFilterOptions = useMemo<MultiSelectOption[]>(
    () => countryLookupItemsToMultiSelectOptions(countries),
    [countries],
  )

  /** Issuing body names from GET /api/CertificationIssuers; filter values match `certificationIssuerName` on candidates. */
  const certificationIssuingBodyFilterOptions = useMemo<MultiSelectOption[]>(() => {
    return [...certificationIssuers]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((issuer) => ({ value: issuer.name, label: issuer.name }))
  }, [certificationIssuers])

  /** Same degree/major name lists as CandidateCreationDialog (`lookups.degrees` / `lookups.majors`). */
  const degreeNameFilterOptions = useMemo<MultiSelectOption[]>(
    () => degreeLookupItemsToMultiSelectOptions(degrees),
    [degrees],
  )

  const majorNameFilterOptions = useMemo<MultiSelectOption[]>(
    () => majorLookupItemsToMultiSelectOptions(majors),
    [majors],
  )

  /** Project Expertise technology stack filter — API catalog, fallback to sample projects. */
  const projectTechStackFilterOptions = useMemo<MultiSelectOption[]>(() => {
    if (techStacks.length > 0) {
      return buildTechStackMultiSelectOptions(techStacks)
    }
    return buildTechStackMultiSelectOptions([], extractUniqueProjectTechStacks())
  }, [techStacks])

  /** Candidate work-experience tech stacks — same master list as creation dialog. */
  const candidateTechStackFilterOptions = useMemo<MultiSelectOption[]>(() => {
    if (techStacks.length > 0) {
      return buildTechStackMultiSelectOptions(techStacks)
    }
    return buildTechStackMultiSelectOptions([], extractUniqueCandidateTechStacks())
  }, [techStacks])

  /** Work experience benefits — same catalog as CandidateCreationDialog (`GET /api/benefits`). */
  const workExperienceBenefitFilterOptions = useMemo<MultiSelectOption[]>(() => {
    return [...benefits]
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((b) => ({ value: b.name, label: b.name }))
  }, [benefits])

  /** Same catalog as ProjectsFilterDialog when TechnicalAspectTypes API is available. */
  const technicalAspectTypeFilterOptions = useMemo<MultiSelectOption[]>(
    () => technicalAspectTypes,
    [technicalAspectTypes],
  )

  // Projects: same debounced search as ProjectCombobox (`useProjectSearch` → `/api/projects/search`)
  const {
    query: projectSearchQuery,
    setQuery: setProjectSearchQuery,
    results: projectSearchResults,
    isLoading: projectSearchLoading,
    resetSearch: resetProjectSearch,
  } = useProjectSearch()
  const [projectComboboxOpen, setProjectComboboxOpen] = useState(false)
  const [projectNameById, setProjectNameById] = useState<Record<string, string>>({})
  const projectNameByIdRef = useRef<Record<string, string>>({})
  projectNameByIdRef.current = projectNameById

  // Certification names: same debounced search as CertificationCombobox (`useCertificationSearch`)
  const {
    query: certificationNameSearchQuery,
    setQuery: setCertificationNameSearchQuery,
    results: certificationNameSearchResults,
    isLoading: certificationNameSearchLoading,
    resetSearch: resetCertificationNameSearch,
  } = useCertificationSearch()
  const [certificationNameComboboxOpen, setCertificationNameComboboxOpen] = useState(false)
  const [certificationNameById, setCertificationNameById] = useState<Record<string, string>>({})
  const certificationNameByIdRef = useRef<Record<string, string>>({})
  certificationNameByIdRef.current = certificationNameById

  // Universities: same debounced search as UniversityCombobox (`useUniversitySearch` → `/api/universities/search`)
  const {
    query: universitySearchQuery,
    setQuery: setUniversitySearchQuery,
    results: universitySearchResults,
    loading: universitySearchLoading,
    resetSearch: resetUniversitySearch,
  } = useUniversitySearch()
  const [universityComboboxOpen, setUniversityComboboxOpen] = useState(false)
  const [universityNameById, setUniversityNameById] = useState<Record<string, string>>({})
  const universityNameByIdRef = useRef<Record<string, string>>({})
  universityNameByIdRef.current = universityNameById

  // Employers: debounced server search (same pattern as ProjectsFilterDialog / ProjectCreationDialog)
  const [employerComboboxOpen, setEmployerComboboxOpen] = useState(false)
  const [employerSearchQuery, setEmployerSearchQuery] = useState("")
  const [employerSearchResults, setEmployerSearchResults] = useState<EmployerLookupDto[]>([])
  const [employerSearchLoading, setEmployerSearchLoading] = useState(false)
  const [employerNameById, setEmployerNameById] = useState<Record<string, string>>({})
  const employerDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const employerAbortRef = useRef<AbortController | null>(null)
  const employerNameByIdRef = useRef<Record<string, string>>({})
  employerNameByIdRef.current = employerNameById

  const [activeTab, setActiveTab] = useState("basic")
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const isScrollingRef = useRef(false)

  // Debounced employer search: min 2 chars, 300ms debounce, abort stale
  useEffect(() => {
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
  }, [employerSearchQuery])

  useEffect(() => {
    return () => {
      if (employerAbortRef.current) {
        employerAbortRef.current.abort()
      }
    }
  }, [])

  // Resolve labels for employer ids restored from applied filters (e.g. after reopen dialog)
  useEffect(() => {
    const missing = tempFilters.employers.filter(
      (id) => /^\d+$/.test(id.trim()) && !employerNameByIdRef.current[id]
    )
    if (missing.length === 0) return
    let cancelled = false
    void Promise.all(
      missing.map((id) => {
        const n = parseInt(id, 10)
        if (Number.isNaN(n)) return Promise.resolve(null as { id: string; name: string } | null)
        return fetchEmployerById(n)
          .then((dto) => ({ id: String(dto.id), name: dto.name }))
          .catch(() => null)
      })
    ).then((results) => {
      if (cancelled) return
      setEmployerNameById((prev) => {
        const next = { ...prev }
        for (const r of results) {
          if (r) next[r.id] = r.name
        }
        return next
      })
    })
    return () => {
      cancelled = true
    }
  }, [tempFilters.employers])

  const toggleEmployerFromSearch = (emp: EmployerLookupDto) => {
    const idStr = String(emp.id)
    setEmployerNameById((prev) => ({ ...prev, [idStr]: emp.name }))
    setTempFilters((prev) => {
      const has = prev.employers.includes(idStr)
      return {
        ...prev,
        employers: has ? prev.employers.filter((x) => x !== idStr) : [...prev.employers, idStr],
      }
    })
  }

  const removeEmployerId = (idStr: string) => {
    setTempFilters((prev) => ({
      ...prev,
      employers: prev.employers.filter((x) => x !== idStr),
    }))
  }

  // Resolve labels for project ids restored from applied filters (e.g. after reopen dialog)
  useEffect(() => {
    const missing = tempFilters.projects.filter(
      (id) => /^\d+$/.test(id.trim()) && !projectNameByIdRef.current[id]
    )
    if (missing.length === 0) return
    let cancelled = false
    void Promise.all(
      missing.map((id) => {
        const n = parseInt(id, 10)
        if (Number.isNaN(n)) return Promise.resolve(null as { id: string; name: string } | null)
        return fetchProjectById(n)
          .then((dto) => ({ id: String(dto.id), name: dto.name }))
          .catch(() => null)
      })
    ).then((results) => {
      if (cancelled) return
      setProjectNameById((prev) => {
        const next = { ...prev }
        for (const r of results) {
          if (r) next[r.id] = r.name
        }
        return next
      })
    })
    return () => {
      cancelled = true
    }
  }, [tempFilters.projects])

  const toggleProjectFromSearch = (proj: ProjectLookupDto) => {
    const idStr = String(proj.id)
    setProjectNameById((prev) => ({ ...prev, [idStr]: proj.name }))
    setTempFilters((prev) => {
      const has = prev.projects.includes(idStr)
      return {
        ...prev,
        projects: has ? prev.projects.filter((x) => x !== idStr) : [...prev.projects, idStr],
      }
    })
  }

  const removeProjectId = (idStr: string) => {
    setTempFilters((prev) => ({
      ...prev,
      projects: prev.projects.filter((x) => x !== idStr),
    }))
  }

  // Resolve labels for certification catalog ids from applied filters (e.g. after reopen dialog)
  useEffect(() => {
    const missing = tempFilters.certificationNames.filter(
      (id) => /^\d+$/.test(id.trim()) && !certificationNameByIdRef.current[id]
    )
    if (missing.length === 0) return
    let cancelled = false
    void Promise.all(
      missing.map((id) => {
        const n = parseInt(id, 10)
        if (Number.isNaN(n)) return Promise.resolve(null as { id: string; name: string } | null)
        return fetchCertificationById(n)
          .then((dto) => ({ id: String(dto.id), name: dto.name }))
          .catch(() => null)
      })
    ).then((results) => {
      if (cancelled) return
      setCertificationNameById((prev) => {
        const next = { ...prev }
        for (const r of results) {
          if (r) next[r.id] = r.name
        }
        return next
      })
    })
    return () => {
      cancelled = true
    }
  }, [tempFilters.certificationNames])

  const toggleCertificationFromSearch = (c: CertificationLookupDto) => {
    const idStr = String(c.id)
    setCertificationNameById((prev) => ({ ...prev, [idStr]: c.name }))
    setTempFilters((prev) => {
      const has = prev.certificationNames.includes(idStr)
      return {
        ...prev,
        certificationNames: has
          ? prev.certificationNames.filter((x) => x !== idStr)
          : [...prev.certificationNames, idStr],
      }
    })
  }

  const removeCertificationNameId = (idStr: string) => {
    setTempFilters((prev) => ({
      ...prev,
      certificationNames: prev.certificationNames.filter((x) => x !== idStr),
    }))
  }

  // Resolve labels for university ids restored from applied filters (e.g. after reopen dialog)
  useEffect(() => {
    const missing = tempFilters.universities.filter(
      (id) => /^\d+$/.test(id.trim()) && !universityNameByIdRef.current[id]
    )
    if (missing.length === 0) return
    let cancelled = false
    void Promise.all(
      missing.map((id) => {
        const n = parseInt(id, 10)
        if (Number.isNaN(n)) return Promise.resolve(null as { id: string; name: string } | null)
        return fetchUniversityById(n)
          .then((dto) => ({ id: String(dto.id), name: dto.name }))
          .catch(() => null)
      })
    ).then((results) => {
      if (cancelled) return
      setUniversityNameById((prev) => {
        const next = { ...prev }
        for (const r of results) {
          if (r) next[r.id] = r.name
        }
        return next
      })
    })
    return () => {
      cancelled = true
    }
  }, [tempFilters.universities])

  const toggleUniversityFromSearch = (uni: UniversityLookupDto) => {
    const idStr = String(uni.id)
    setUniversityNameById((prev) => ({ ...prev, [idStr]: uni.name }))
    setTempFilters((prev) => {
      const has = prev.universities.includes(idStr)
      return {
        ...prev,
        universities: has
          ? prev.universities.filter((x) => x !== idStr)
          : [...prev.universities, idStr],
      }
    })
  }

  const removeUniversityId = (idStr: string) => {
    setTempFilters((prev) => ({
      ...prev,
      universities: prev.universities.filter((x) => x !== idStr),
    }))
  }
  
  // Define sections for navigation
  const sections = [
    { id: "basic", sectionId: "filter-basic", label: "Basic" },
    { id: "experience", sectionId: "filter-experience", label: "Experience" },
    { id: "projects", sectionId: "filter-projects", label: "Projects" },
    { id: "employers", sectionId: "filter-employers", label: "Employers" },
    { id: "education", sectionId: "filter-education", label: "Education" },
    { id: "certifications", sectionId: "filter-certifications", label: "Certifications" },
    { id: "competitions", sectionId: "filter-competitions", label: "Achievements" },
  ]
  
  // Scroll to section function
  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId)
    if (!element || !scrollContainerRef.current) return
    
    const container = scrollContainerRef.current
    const yOffset = 80 // Account for sticky tabs
    
    // Set flag to prevent IntersectionObserver from interfering
    isScrollingRef.current = true
    
    // Update active tab immediately
    const section = sections.find(s => s.sectionId === sectionId)
    if (section) {
      setActiveTab(section.id)
    }
    
    // Use requestAnimationFrame to ensure layout is calculated
    requestAnimationFrame(() => {
      const currentScrollTop = container.scrollTop
      const containerRect = container.getBoundingClientRect()
      const elementRect = element.getBoundingClientRect()
      const elementTopInContainer = elementRect.top - containerRect.top + currentScrollTop
      const targetScrollTop = elementTopInContainer - yOffset
      
      container.scrollTo({
        top: Math.max(0, targetScrollTop),
        behavior: 'smooth'
      })
      
      // Reset flag after scroll completes
      setTimeout(() => {
        isScrollingRef.current = false
      }, 600)
    })
  }
  
  // Handle tab change with scroll
  const handleTabChange = (value: string) => {
    const section = sections.find(s => s.id === value)
    if (section) {
      scrollToSection(section.sectionId)
    }
  }

  const handleScrollSpySection = useCallback((sectionId: string) => {
    const section = sections.find((item) => item.sectionId === sectionId)
    if (section) {
      setActiveTab(section.id)
    }
  }, [])

  // Reset tab highlight and scroll when the dialog opens or closes
  useEffect(() => {
    if (!open) {
      setActiveTab("basic")
      return
    }

    setActiveTab("basic")
    isScrollingRef.current = false

    const frame = requestAnimationFrame(() => {
      scrollContainerRef.current?.scrollTo({ top: 0, behavior: "auto" })
    })

    return () => cancelAnimationFrame(frame)
  }, [open])

  // Clear filters for a specific section
  const clearSectionFilters = (sectionId: string) => {
    if (sectionId === "employers") {
      setEmployerNameById({})
      setEmployerSearchQuery("")
      setEmployerSearchResults([])
      setEmployerComboboxOpen(false)
    }
    if (sectionId === "projects") {
      setProjectNameById({})
      setProjectComboboxOpen(false)
      resetProjectSearch()
    }
    if (sectionId === "certifications") {
      setCertificationNameById({})
      setCertificationNameComboboxOpen(false)
      resetCertificationNameSearch()
    }
    if (sectionId === "education") {
      setUniversityNameById({})
      setUniversityComboboxOpen(false)
      resetUniversitySearch()
    }

    const updated = clearSectionFromFilters(tempFilters, sectionId)
    setTempFilters(updated)
    onFiltersChange(updated)
  }
  
  useScrollSpySection(scrollContainerRef, {
    enabled: open,
    sectionIds: sections.map((section) => section.sectionId),
    scrollOffset: 80,
    onActiveSectionChange: handleScrollSpySection,
    isScrollingRef,
  })

  // Calculate active filter count for each section
  const getSectionFilterCount = (sectionId: string): number => {
    switch (sectionId) {
      case "basic":
        return (
          (tempFilters.name.trim() ? 1 : 0) +
          (tempFilters.city.trim() ? 1 : 0) +
          tempFilters.personalityTypes.length +
          tempFilters.source.length +
          tempFilters.callStatuses.length +
          (tempFilters.currentSalaryMin ? 1 : 0) +
          (tempFilters.currentSalaryMax ? 1 : 0) +
          (tempFilters.expectedSalaryMin ? 1 : 0) +
          (tempFilters.expectedSalaryMax ? 1 : 0) +
          (tempFilters.postingTitle ? 1 : 0) +
          (tempFilters.verificationPercentageMin ? 1 : 0) +
          (tempFilters.verificationPercentageMax ? 1 : 0) +
          (tempFilters.dataProgressMin ? 1 : 0) +
          (tempFilters.dataProgressMax ? 1 : 0)
        )
      case "experience":
        return (
          tempFilters.candidateTechStacks.length +
          tempFilters.shiftTypes.length +
          tempFilters.workModes.length +
          tempFilters.workExperienceSalaryPolicies.length +
          (tempFilters.workExperienceSalaryMin ? 1 : 0) +
          (tempFilters.workExperienceSalaryMax ? 1 : 0) +
          tempFilters.timeSupportZones.length +
          tempFilters.workExperienceBenefits.length +
          (tempFilters.jobTitle ? 1 : 0) +
          (tempFilters.yearsOfExperienceMin ? 1 : 0) +
          (tempFilters.yearsOfExperienceMax ? 1 : 0) +
          (tempFilters.avgJobTenureMin ? 1 : 0) +
          (tempFilters.avgJobTenureMax ? 1 : 0) +
          (tempFilters.hasMutualConnectionWithDPL !== null ? 1 : 0)
        )
      case "projects":
        return (
          tempFilters.projects.length +
          tempFilters.projectStatus.length +
          tempFilters.projectTypes.length +
          tempFilters.techStacks.length +
          tempFilters.clientLocations.length +
          tempFilters.verticalDomains.length +
          tempFilters.horizontalDomains.length +
          tempFilters.technicalDomains.length +
          tempFilters.technicalAspects.length +
          tempFilters.technicalAspectTypeIds.length +
          (tempFilters.startDateStart ? 1 : 0) +
          (tempFilters.startDateEnd ? 1 : 0) +
          (tempFilters.averageTeamSizeMin ? 1 : 0) +
          (tempFilters.averageTeamSizeMax ? 1 : 0) +
          (tempFilters.hasPublishedProject ? 1 : 0) +
          (tempFilters.hasMainContribution ? 1 : 0) +
          tempFilters.publishPlatforms.length +
          (tempFilters.minProjectDownloadCount ? 1 : 0)
        )
      case "employers":
        return (
          tempFilters.employers.length +
          tempFilters.employerLocationIds.length +
          tempFilters.employerStatus.length +
          tempFilters.employerCountries.length +
          (tempFilters.employerCity.trim() ? 1 : 0) +
          tempFilters.employerTypes.length +
          tempFilters.employerSalaryPolicies.length +
          tempFilters.employerRankings.length +
          (tempFilters.employerSizeMin ? 1 : 0) +
          (tempFilters.employerSizeMax ? 1 : 0)
        )
      case "education":
        return (
          tempFilters.universities.length +
          tempFilters.universityLocationIds.length +
          tempFilters.degreeNames.length +
          tempFilters.majorNames.length +
          (tempFilters.isTopper !== null ? 1 : 0) +
          (tempFilters.isCheetah !== null ? 1 : 0) +
          (tempFilters.educationEndDateStart ? 1 : 0) +
          (tempFilters.educationEndDateEnd ? 1 : 0)
        )
      case "certifications":
        return (
          tempFilters.certificationNames.length +
          tempFilters.certificationIssuingBodies.length +
          tempFilters.certificationLevels.length
        )
      case "competitions":
        return (
          tempFilters.achievementTypes.length +
          (tempFilters.achievementName.trim() ? 1 : 0)
        )
      default:
        return 0
    }
  }

  // Calculate total active filter count (for the Filter button)
  const activeFilterCount = useMemo(() => 
    sections.reduce((total, section) => total + getSectionFilterCount(section.id), 0),
    [tempFilters]
  )

  React.useEffect(() => {
    setTempFilters(filters)
  }, [filters])

  const handleFilterChange = (field: keyof CandidateFilters, value: string[] | string | boolean | Date | null | number) => {
    setTempFilters(prev => ({ ...prev, [field]: value }))
  }

  // Validate date ranges
  const validateDateRanges = (): string | null => {
    // Validate graduation date range
    if (tempFilters.educationEndDateStart && tempFilters.educationEndDateEnd && 
        tempFilters.educationEndDateStart > tempFilters.educationEndDateEnd) {
      return 'Graduation date start must be before graduation date end'
    }
    return null
  }

  const validateExperienceYears = (): string | null => {
    const minRaw = tempFilters.yearsOfExperienceMin.trim()
    const maxRaw = tempFilters.yearsOfExperienceMax.trim()
    if (!minRaw && !maxRaw) return null

    const min = minRaw ? parseFloat(minRaw) : null
    const max = maxRaw ? parseFloat(maxRaw) : null

    if (minRaw && (min == null || Number.isNaN(min) || min < 0)) {
      return "Experience years cannot be negative."
    }
    if (maxRaw && (max == null || Number.isNaN(max) || max < 0)) {
      return "Experience years cannot be negative."
    }
    if (min != null && max != null && !Number.isNaN(min) && !Number.isNaN(max) && max < min) {
      return "Maximum experience cannot be less than minimum experience."
    }
    return null
  }

  const validateDataProgressPercentage = (): string | null => {
    const minRaw = tempFilters.dataProgressMin.trim()
    const maxRaw = tempFilters.dataProgressMax.trim()
    if (!minRaw && !maxRaw) return null

    const min = minRaw ? parseFloat(minRaw) : null
    const max = maxRaw ? parseFloat(maxRaw) : null

    if (minRaw && (min == null || Number.isNaN(min) || min < 0 || min > 100)) {
      return "Data progress must be between 0 and 100."
    }
    if (maxRaw && (max == null || Number.isNaN(max) || max < 0 || max > 100)) {
      return "Data progress must be between 0 and 100."
    }
    if (min != null && max != null && !Number.isNaN(min) && !Number.isNaN(max) && max < min) {
      return "Maximum data progress cannot be less than minimum."
    }
    return null
  }

  const dateRangeError = validateDateRanges()
  const experienceYearsError = validateExperienceYears()
  const workExperienceSalaryRangeError = (() => {
    const min = tempFilters.workExperienceSalaryMin.trim()
    const max = tempFilters.workExperienceSalaryMax.trim()
    if (!min || !max) return null
    if (Number(min) > Number(max)) {
      return "Minimum salary must be less than or equal to maximum salary."
    }
    return null
  })()
  const dataProgressError = validateDataProgressPercentage()

  const handleApplyFilters = () => {
    // Validate before applying
    if (dateRangeError || experienceYearsError || dataProgressError || workExperienceSalaryRangeError) {
      return // Don't apply if there are validation errors
    }
    onFiltersChange(tempFilters)
    setOpen(false)
  }

  const handleClearFilters = () => {
    setEmployerNameById({})
    setEmployerSearchQuery("")
    setEmployerSearchResults([])
    setEmployerComboboxOpen(false)
    setProjectNameById({})
    setProjectComboboxOpen(false)
    resetProjectSearch()
    setCertificationNameById({})
    setCertificationNameComboboxOpen(false)
    resetCertificationNameSearch()
    setTempFilters(initialFilters)
    onClearFilters()
    // Keep dialog open for user to see cleared state
  }

  const handleCancel = () => {
    setTempFilters(filters) // Reset to current filters
    setOpen(false)
  }

  const hasAnyTempFilters = 
    tempFilters.name.trim() ||
    tempFilters.city.trim() ||
    tempFilters.personalityTypes.length > 0 ||
    tempFilters.source.length > 0 ||
    tempFilters.callStatuses.length > 0 ||
    tempFilters.currentSalaryMin ||
    tempFilters.currentSalaryMax ||
    tempFilters.expectedSalaryMin ||
    tempFilters.expectedSalaryMax ||
    tempFilters.postingTitle ||
    tempFilters.verificationPercentageMin ||
    tempFilters.verificationPercentageMax ||
    tempFilters.dataProgressMin ||
    tempFilters.dataProgressMax ||
    tempFilters.employers.length > 0 ||
    tempFilters.employerLocationIds.length > 0 ||
    tempFilters.projects.length > 0 ||
    tempFilters.projectStatus.length > 0 ||
    tempFilters.projectTypes.length > 0 ||
    tempFilters.techStacks.length > 0 ||
    tempFilters.clientLocations.length > 0 ||
    tempFilters.candidateTechStacks.length > 0 ||
    tempFilters.shiftTypes.length > 0 ||
    tempFilters.workModes.length > 0 ||
    tempFilters.workExperienceSalaryPolicies.length > 0 ||
    tempFilters.workExperienceSalaryMin ||
    tempFilters.workExperienceSalaryMax ||
    tempFilters.timeSupportZones.length > 0 ||
    tempFilters.workExperienceBenefits.length > 0 ||
    tempFilters.jobTitle ||
    tempFilters.yearsOfExperienceMin ||
    tempFilters.yearsOfExperienceMax ||
    tempFilters.avgJobTenureMin ||
    tempFilters.avgJobTenureMax ||
    tempFilters.hasMutualConnectionWithDPL !== null ||
    tempFilters.joinedProjectFromStart !== null ||
    tempFilters.verticalDomains.length > 0 ||
    tempFilters.horizontalDomains.length > 0 ||
    tempFilters.technicalDomains.length > 0 ||
    tempFilters.technicalAspects.length > 0 ||
    tempFilters.technicalAspectTypeIds.length > 0 ||
    tempFilters.startDateStart !== null ||
    tempFilters.startDateEnd !== null ||
    tempFilters.averageTeamSizeMin ||
    tempFilters.averageTeamSizeMax ||
    tempFilters.hasPublishedProject !== null ||
    tempFilters.hasMainContribution !== null ||
    tempFilters.publishPlatforms.length > 0 ||
    tempFilters.minProjectDownloadCount ||
    tempFilters.employerStatus.length > 0 ||
    tempFilters.employerCountries.length > 0 ||
    !!tempFilters.employerCity.trim() ||
    tempFilters.employerTypes.length > 0 ||
    tempFilters.employerSalaryPolicies.length > 0 ||
    tempFilters.employerRankings.length > 0 ||
    tempFilters.employerSizeMin ||
    tempFilters.employerSizeMax ||
    tempFilters.universities.length > 0 ||
    tempFilters.universityLocationIds.length > 0 ||
    tempFilters.degreeNames.length > 0 ||
    tempFilters.majorNames.length > 0 ||
    tempFilters.isTopper !== null ||
    tempFilters.isCheetah !== null ||
    tempFilters.educationEndDateStart !== null ||
    tempFilters.educationEndDateEnd !== null ||
    tempFilters.certificationNames.length > 0 ||
    tempFilters.certificationIssuingBodies.length > 0 ||
    tempFilters.certificationLevels.length > 0 ||
    tempFilters.achievementTypes.length > 0 ||
    !!tempFilters.achievementName.trim()

  // Validation for salary inputs
  const validateSalaryInput = (value: string): boolean => {
    if (!value) return true // Empty is valid
    const num = parseFloat(value)
    return !isNaN(num) && num >= 0
  }

  const formatSalaryInput = (value: string): string => {
    if (!value) return ""
    // Remove non-numeric characters except decimal point
    const cleaned = value.replace(/[^0-9.]/g, "")
    // Ensure only one decimal point
    const parts = cleaned.split(".")
    if (parts.length > 2) {
      return parts[0] + "." + parts.slice(1).join("")
    }
    return cleaned
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button
            variant="outline"
            className="flex items-center gap-2 cursor-pointer"
          >
            <Filter className="h-4 w-4" />
            Filters
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="ml-1 min-w-[1.25rem] h-5">
                {activeFilterCount}
              </Badge>
            )}
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-[600px] md:max-w-[750px] lg:max-w-[850px] max-h-[90vh] flex flex-col p-0 [&>button]:cursor-pointer">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border">
          <DialogTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filter Candidates
          </DialogTitle>
        </DialogHeader>

        {/* Sticky Tabs Navigation */}
        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b border-border">
          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
            <TabsList className="grid w-full grid-cols-3 md:grid-cols-4 lg:grid-cols-7 h-12 rounded-none border-0 bg-transparent p-0">
              {sections.map((section) => {
                const sectionFilterCount = getSectionFilterCount(section.id)
                return (
                  <TabsTrigger
                    key={section.id}
                    value={section.id}
                    className="text-xs px-3 md:px-4 py-2 rounded-t transition-colors whitespace-nowrap h-12 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=inactive]:text-muted-foreground data-[state=inactive]:hover:bg-muted data-[state=inactive]:hover:text-foreground border-b-2 border-transparent flex items-center justify-center gap-1.5"
                  >
                    <span>{section.label}</span>
                    {sectionFilterCount > 0 && (
                      <Badge 
                        variant="secondary" 
                        className="h-4 min-w-[1.25rem] px-1 text-[10px] font-semibold bg-background/80 text-foreground"
                      >
                        {sectionFilterCount}
                      </Badge>
                    )}
                  </TabsTrigger>
                )
              })}
            </TabsList>
          </Tabs>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6" ref={scrollContainerRef}>
          <div className="space-y-6">
            {/* Basic Info Section */}
            <section id="filter-basic" className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-muted-foreground">Basic Information</h3>
                {getSectionFilterCount("basic") > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => clearSectionFilters("basic")}
                    className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
                  >
                    <X className="h-3 w-3 mr-1" />
                    Clear
                  </Button>
                )}
              </div>

              {/* Name + Posting Title */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3 min-w-0">
                  <Label htmlFor="filter-candidate-name" className="text-sm font-semibold">
                    Name
                  </Label>
                <Input
                    id="filter-candidate-name"
                  type="text"
                    placeholder="Filter by name..."
                    value={tempFilters.name}
                    onChange={(e) => handleFilterChange("name", e.target.value)}
                  />
              </div>

                <div className="space-y-3 min-w-0">
                <Label htmlFor="postingTitle" className="text-sm font-semibold">Posting Title</Label>
                <Input
                  id="postingTitle"
                  type="text"
                    placeholder="Filter by posting title..."
                  value={tempFilters.postingTitle}
                  onChange={(e) => handleFilterChange("postingTitle", e.target.value)}
                />
                </div>
              </div>

              {/* Source + City */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3 min-w-0">
                <MultiSelect
                    items={sourceFilterOptions}
                    selected={tempFilters.source}
                    onChange={(values) => handleFilterChange("source", values)}
                    placeholder="Filter by source..."
                    label="Source"
                    searchPlaceholder="Search sources..."
                  maxDisplay={3}
                />
                </div>

                <div className="space-y-3 min-w-0">
                  <Label htmlFor="filter-candidate-city" className="text-sm font-semibold">
                    City
                  </Label>
                  <Input
                    id="filter-candidate-city"
                    type="text"
                    placeholder="Filter by city..."
                    value={tempFilters.city}
                    onChange={(e) => handleFilterChange("city", e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3 min-w-0">
                <MultiSelect
                    items={callStatusFilterOptions}
                    selected={tempFilters.callStatuses}
                    onChange={(values) =>
                      handleFilterChange("callStatuses", values)
                    }
                    placeholder="Filter by call status..."
                    label="Call Status"
                    searchPlaceholder="Search call statuses..."
                  maxDisplay={3}
                />
                </div>
              </div>

              {SHOW_DATA_VERIFICATION_FILTER && (
              <div className="space-y-3">
                <Label className="text-sm font-semibold">Verification Percentage</Label>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="verificationPercentageMin" className="text-xs text-muted-foreground">
                      Minimum (%)
                    </Label>
                    <Input
                      id="verificationPercentageMin"
                      type="number"
                      min="0"
                      max="100"
                      placeholder="0"
                      value={tempFilters.verificationPercentageMin}
                      onChange={(e) => {
                        const value = e.target.value
                        // Only allow numbers 0-100
                        if (value === "" || (parseInt(value) >= 0 && parseInt(value) <= 100)) {
                          handleFilterChange("verificationPercentageMin", value)
                        }
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="verificationPercentageMax" className="text-xs text-muted-foreground">
                      Maximum (%)
                    </Label>
                    <Input
                      id="verificationPercentageMax"
                      type="number"
                      min="0"
                      max="100"
                      placeholder="100"
                      value={tempFilters.verificationPercentageMax}
                      onChange={(e) => {
                        const value = e.target.value
                        // Only allow numbers 0-100
                        if (value === "" || (parseInt(value) >= 0 && parseInt(value) <= 100)) {
                          handleFilterChange("verificationPercentageMax", value)
                        }
                      }}
                    />
                  </div>
                </div>
              </div>
              )}

              {/* Data Progress Filter */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Label className="text-sm font-medium">Data Progress</Label>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="dataProgressMin" className="text-xs text-muted-foreground">
                      Minimum (%)
                    </Label>
                    <Input
                      id="dataProgressMin"
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      placeholder="0"
                      value={tempFilters.dataProgressMin}
                      onChange={(e) => {
                        const value = e.target.value
                        if (value === "") {
                          handleFilterChange("dataProgressMin", value)
                          return
                        }
                        const n = parseFloat(value)
                        if (!Number.isNaN(n) && n >= 0 && n <= 100) {
                          handleFilterChange("dataProgressMin", value)
                        }
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dataProgressMax" className="text-xs text-muted-foreground">
                      Maximum (%)
                    </Label>
                    <Input
                      id="dataProgressMax"
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      placeholder="100"
                      value={tempFilters.dataProgressMax}
                      onChange={(e) => {
                        const value = e.target.value
                        if (value === "") {
                          handleFilterChange("dataProgressMax", value)
                          return
                        }
                        const n = parseFloat(value)
                        if (!Number.isNaN(n) && n >= 0 && n <= 100) {
                          handleFilterChange("dataProgressMax", value)
                        }
                      }}
                    />
                  </div>
                </div>
                {dataProgressError && (
                  <p className="text-xs text-red-500">{dataProgressError}</p>
                )}
              </div>

              {/* Personality Type Filter */}
              <div className="space-y-3">
                <MultiSelect
                  items={personalityTypeFilterOptions}
                  selected={tempFilters.personalityTypes}
                  onChange={(values) => handleFilterChange("personalityTypes", values)}
                  placeholder="Filter by personality type..."
                  label="Personality Type"
                  searchPlaceholder="Search personality types..."
                  maxDisplay={3}
                />
              </div>

              {/* Current Salary Filter */}
            {!hideCompensationFilters ? (
            <>
            <div className="space-y-3">
              <Label className="text-sm font-semibold">Current Salary Range</Label>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="currentSalaryMin" className="text-xs text-muted-foreground">
                    Minimum
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground text-sm">
                      $
                    </span>
                    <Input
                      id="currentSalaryMin"
                      type="text"
                      placeholder="0"
                      value={tempFilters.currentSalaryMin}
                      onChange={(e) => {
                        const formatted = formatSalaryInput(e.target.value)
                        if (validateSalaryInput(formatted)) {
                          handleFilterChange("currentSalaryMin", formatted)
                        }
                      }}
                      className="pl-7"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currentSalaryMax" className="text-xs text-muted-foreground">
                    Maximum
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground text-sm">
                      $
                    </span>
                    <Input
                      id="currentSalaryMax"
                      type="text"
                      placeholder="200000"
                      value={tempFilters.currentSalaryMax}
                      onChange={(e) => {
                        const formatted = formatSalaryInput(e.target.value)
                        if (validateSalaryInput(formatted)) {
                          handleFilterChange("currentSalaryMax", formatted)
                        }
                      }}
                      className="pl-7"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Expected Salary Filter */}
            <div className="space-y-3">
              <Label className="text-sm font-semibold">Expected Salary Range</Label>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="expectedSalaryMin" className="text-xs text-muted-foreground">
                    Minimum
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground text-sm">
                      $
                    </span>
                    <Input
                      id="expectedSalaryMin"
                      type="text"
                      placeholder="0"
                      value={tempFilters.expectedSalaryMin}
                      onChange={(e) => {
                        const formatted = formatSalaryInput(e.target.value)
                        if (validateSalaryInput(formatted)) {
                          handleFilterChange("expectedSalaryMin", formatted)
                        }
                      }}
                      className="pl-7"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="expectedSalaryMax" className="text-xs text-muted-foreground">
                    Maximum
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground text-sm">
                      $
                    </span>
                    <Input
                      id="expectedSalaryMax"
                      type="text"
                      placeholder="250000"
                      value={tempFilters.expectedSalaryMax}
                      onChange={(e) => {
                        const formatted = formatSalaryInput(e.target.value)
                        if (validateSalaryInput(formatted)) {
                          handleFilterChange("expectedSalaryMax", formatted)
                        }
                      }}
                      className="pl-7"
                    />
                  </div>
                </div>
              </div>
            </div>
            </>
            ) : null}
            </section>

            {/* Experience Section */}
            <section id="filter-experience" className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-muted-foreground">Work Experience</h3>
                {getSectionFilterCount("experience") > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => clearSectionFilters("experience")}
                    className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
                  >
                    <X className="h-3 w-3 mr-1" />
                    Clear
                  </Button>
                )}
              </div>

              {/* Job Title Filter */}
              <div className="space-y-3">
                <Label htmlFor="jobTitle" className="text-sm font-semibold">Job Title</Label>
                <Input
                  id="jobTitle"
                  type="text"
                  placeholder="Filter by job title..."
                  value={tempFilters.jobTitle}
                  onChange={(e) => {
                    handleFilterChange("jobTitle", e.target.value)
                  }}
                    />
                  </div>
                  
              {/* Years of Experience Range Filter */}
              <div className="space-y-3">
                <Label className="text-sm font-semibold">Years of Experience</Label>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="yearsOfExperienceMin" className="text-xs text-muted-foreground">
                      Minimum Years
                    </Label>
                    <Input
                      id="yearsOfExperienceMin"
                      type="number"
                      placeholder="e.g., 2"
                      value={tempFilters.yearsOfExperienceMin}
                      onChange={(e) => handleFilterChange("yearsOfExperienceMin", e.target.value)}
                      min="0"
                      step="0.5"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="yearsOfExperienceMax" className="text-xs text-muted-foreground">
                      Maximum Years
                    </Label>
                    <Input
                      id="yearsOfExperienceMax"
                      type="number"
                      placeholder="e.g., 10"
                      value={tempFilters.yearsOfExperienceMax}
                      onChange={(e) => handleFilterChange("yearsOfExperienceMax", e.target.value)}
                      min="0"
                      step="0.5"
                    />
                </div>
                </div>
                {experienceYearsError && (
                  <p className="text-xs text-red-500">{experienceYearsError}</p>
                )}
              </div>
              
              {/* Work experience tech stacks + benefits */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="min-w-0">
              <MultiSelect
                    items={candidateTechStackFilterOptions}
                    selected={tempFilters.candidateTechStacks}
                    onChange={(values) => handleFilterChange("candidateTechStacks", values)}
                    placeholder="Filter by technology stack..."
                    label="Technology Stack"
                    searchPlaceholder="Search technologies..."
                    maxDisplay={4}
                  />
                </div>
                <div className="min-w-0">
                  {!hideCompensationFilters ? (
                  <MultiSelect
                    items={workExperienceBenefitFilterOptions}
                    selected={tempFilters.workExperienceBenefits}
                    onChange={(values) => handleFilterChange("workExperienceBenefits", values)}
                    placeholder="Filter by benefits..."
                    label="Benefits"
                    searchPlaceholder="Search benefits..."
                    maxDisplay={4}
                  />
                  ) : null}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="min-w-0">
                  <MultiSelect
                    items={shiftTypeFilterOptions}
                selected={tempFilters.shiftTypes}
                onChange={(values) => handleFilterChange("shiftTypes", values)}
                placeholder="Filter by shift type..."
                label="Shift Type"
                searchPlaceholder="Search shift types..."
                maxDisplay={3}
              />
                </div>

                <div className="min-w-0">
              <MultiSelect
                    items={workModeFilterOptions}
                selected={tempFilters.workModes}
                onChange={(values) => handleFilterChange("workModes", values)}
                placeholder="Filter by work mode..."
                label="Work Mode"
                searchPlaceholder="Search work modes..."
                maxDisplay={3}
              />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {!hideCompensationFilters ? (
                <div className="min-w-0 space-y-2">
                    <MultiSelect
                    items={workExperienceSalaryPolicyOptions}
                    selected={tempFilters.workExperienceSalaryPolicies}
                    onChange={(values) =>
                      handleFilterChange("workExperienceSalaryPolicies", values)
                    }
                    placeholder="Filter by salary policy..."
                    label="Salary Policy"
                    searchPlaceholder="Search salary policies..."
                      maxDisplay={3}
                    />
                  </div>
                ) : null}
                  
                <div className="min-w-0 space-y-2">
              <MultiSelect
                    items={timeSupportZoneFilterOptions}
                selected={tempFilters.timeSupportZones}
                onChange={(values) => handleFilterChange("timeSupportZones", values)}
                placeholder="Filter by time support zone..."
                label="Time Support Zones"
                searchPlaceholder="Search time zones..."
                maxDisplay={3}
              />
                </div>
              </div>

              {!hideCompensationFilters ? (
              <div className="space-y-3">
                <Label className="text-sm font-semibold">Work Experience Salary Range</Label>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="workExperienceSalaryMin" className="text-xs text-muted-foreground">
                      Minimum Salary
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground text-sm">
                        $
                      </span>
                    <Input
                        id="workExperienceSalaryMin"
                        type="text"
                        inputMode="numeric"
                        placeholder="100000"
                        value={tempFilters.workExperienceSalaryMin}
                        onChange={(e) =>
                          handleFilterChange(
                            "workExperienceSalaryMin",
                            e.target.value.replace(/\D/g, ""),
                          )
                        }
                        className="pl-7"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="workExperienceSalaryMax" className="text-xs text-muted-foreground">
                      Maximum Salary
                    </Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground text-sm">
                        $
                      </span>
                    <Input
                        id="workExperienceSalaryMax"
                        type="text"
                        inputMode="numeric"
                        placeholder="200000"
                        value={tempFilters.workExperienceSalaryMax}
                        onChange={(e) =>
                          handleFilterChange(
                            "workExperienceSalaryMax",
                            e.target.value.replace(/\D/g, ""),
                          )
                        }
                        className="pl-7"
                    />
                  </div>
                </div>
              </div>
                {workExperienceSalaryRangeError && (
                  <p className="text-xs text-red-500">{workExperienceSalaryRangeError}</p>
                )}
              </div>
              ) : null}

              {SHOW_AVG_JOB_TENURE_FILTER && (
              <div className="space-y-3">
                <Label className="text-sm font-semibold">Average Job Tenure (Years)</Label>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="avgJobTenureMin" className="text-xs text-muted-foreground">
                      Minimum Tenure
                    </Label>
                    <Input
                      id="avgJobTenureMin"
                      type="number"
                      placeholder="e.g., 1.5"
                      value={tempFilters.avgJobTenureMin}
                      onChange={(e) => handleFilterChange("avgJobTenureMin", e.target.value)}
                      min="0"
                        step="0.5"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="avgJobTenureMax" className="text-xs text-muted-foreground">
                      Maximum Tenure
                    </Label>
                    <Input
                      id="avgJobTenureMax"
                      type="number"
                      placeholder="e.g., 3.0"
                      value={tempFilters.avgJobTenureMax}
                      onChange={(e) => handleFilterChange("avgJobTenureMax", e.target.value)}
                      min="0"
                        step="0.5"
                    />
                  </div>
                </div>
              </div>
              )}

              {SHOW_JOINED_PROJECT_FROM_START_FILTER && (
              <div className="space-y-3 pt-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="joinedProjectFromStart"
                    checked={tempFilters.joinedProjectFromStart === true}
                    onCheckedChange={(checked) => 
                      handleFilterChange("joinedProjectFromStart", checked ? true : null)
                    }
                  />
                  <Label htmlFor="joinedProjectFromStart" className="text-sm font-medium cursor-pointer">
                    Joined Project From Start
                  </Label>
                </div>
                
                {/* Tolerance Window - appears when checkbox is checked */}
                {tempFilters.joinedProjectFromStart === true && (
                  <div className="space-y-2 pl-6">
                    <Label htmlFor="toleranceDays" className="text-xs text-muted-foreground">
                      Tolerance Window (days)
                    </Label>
                    <Input
                      id="toleranceDays"
                      type="number"
                      placeholder="e.g., 30"
                      value={tempFilters.joinedProjectFromStartToleranceDays?.toString() || "30"}
                      onChange={(e) => {
                        const value = e.target.value
                        const numValue = value === "" ? 30 : parseInt(value) || 30
                        handleFilterChange("joinedProjectFromStartToleranceDays", numValue)
                      }}
                      min="0"
                      max="365"
                      className="w-full"
                    />
                    <p className="text-xs text-muted-foreground">
                      Maximum days difference between project start and work experience start date (default: 30 days). 
                      Candidates who started before the project are also included.
                    </p>
                  </div>
                )}
                
                <p className="text-xs text-muted-foreground pl-6">
                  Filter for candidates whose work experience start date matches or is close to project start date
                </p>
              </div>
              )}

              {SHOW_MUTUAL_CONNECTION_FILTER && (
              <div className="space-y-3 pt-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="hasMutualConnectionWithDPL"
                    checked={tempFilters.hasMutualConnectionWithDPL === true}
                    onCheckedChange={(checked) => 
                      handleFilterChange("hasMutualConnectionWithDPL", checked ? true : null)
                    }
                  />
                  <Label htmlFor="hasMutualConnectionWithDPL" className="text-sm font-medium cursor-pointer">
                    Mutual Connection with DPL Employee
                  </Label>
                </div>
                
                {/* Tolerance and Connection Type - appears when checkbox is checked */}
                {tempFilters.hasMutualConnectionWithDPL === true && (
                  <div className="space-y-3 pl-6">
                    {/* Tolerance Window */}
                    <div className="space-y-2">
                      <Label htmlFor="mutualConnectionToleranceMonths" className="text-xs text-muted-foreground">
                        Date Gap Tolerance (months)
                      </Label>
                      <Input
                        id="mutualConnectionToleranceMonths"
                        type="number"
                        placeholder="e.g., 6"
                        value={tempFilters.mutualConnectionToleranceMonths?.toString() || "0"}
                        onChange={(e) => {
                          const value = e.target.value
                          const numValue = value === "" ? 0 : parseInt(value) || 0
                          handleFilterChange("mutualConnectionToleranceMonths", numValue)
                        }}
                        min="0"
                        max="24"
                        step="1"
                        className="w-full"
                      />
                      <p className="text-xs text-muted-foreground">
                        Maximum gap in months between education/work periods to still count as overlap (default: 0 = exact overlap required).
                      </p>
                    </div>
                    
                    {/* Connection Type Filter */}
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Connection Type</Label>
                      <RadioGroup
                        value={tempFilters.mutualConnectionType || 'both'}
                        onValueChange={(value) => 
                          handleFilterChange("mutualConnectionType", value === 'both' ? null : value as 'education' | 'work')
                        }
                      >
                        <div className="flex items-center gap-3">
                          <RadioGroupItem value="both" id="mutual-both" />
                          <Label htmlFor="mutual-both" className="text-xs cursor-pointer">Both Education & Work</Label>
                        </div>
                        <div className="flex items-center gap-3">
                          <RadioGroupItem value="education" id="mutual-education" />
                          <Label htmlFor="mutual-education" className="text-xs cursor-pointer">Education Only</Label>
                        </div>
                        <div className="flex items-center gap-3">
                          <RadioGroupItem value="work" id="mutual-work" />
                          <Label htmlFor="mutual-work" className="text-xs cursor-pointer">Work Experience Only</Label>
                        </div>
                      </RadioGroup>
                    </div>
                  </div>
                )}
                
                <p className="text-xs text-muted-foreground pl-6">
                  Find candidates who have overlapping education or work experience with any DPL employee.
                  This indicates potential mutual connections (batchmates, classmates, or colleagues).
                </p>
              </div>
              )}
            </section>

            {/* Project-Based Filters Section */}
            <section id="filter-projects" className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-muted-foreground">Project Expertise</h3>
                {getSectionFilterCount("projects") > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => clearSectionFilters("projects")}
                    className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
                  >
                    <X className="h-3 w-3 mr-1" />
                    Clear
                  </Button>
                )}
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm font-medium">Project</Label>
                <Popover
                  open={projectComboboxOpen}
                  onOpenChange={(nextOpen) => {
                    setProjectComboboxOpen(nextOpen)
                    if (!nextOpen) {
                      resetProjectSearch()
                    }
                  }}
                >
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      role="combobox"
                      aria-expanded={projectComboboxOpen}
                      className={cn(
                        "w-full justify-between items-start gap-2 h-auto min-h-[2.5rem] px-3 py-2 font-normal text-left"
                      )}
                    >
                      <div className="flex flex-wrap gap-1 flex-1 mr-2 items-center min-w-0">
                        {tempFilters.projects.length === 0 && (
                          <span className="text-muted-foreground">Filter by project...</span>
                        )}
                        {tempFilters.projects.slice(0, 3).map((id) => (
                          <Badge
                            key={id}
                            variant="secondary"
                            className="max-w-full shrink gap-0 pr-0.5 font-normal hover:bg-secondary/80 flex items-center"
                          >
                            <span className="truncate pl-1.5 py-0.5 max-w-[min(12rem,100%)]">
                              {projectNameById[id] ?? (/^\d+$/.test(id.trim()) ? `Project #${id}` : id)}
                            </span>
                            <span
                              className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-sm outline-none ring-offset-background hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 cursor-pointer"
                              role="button"
                              tabIndex={0}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  removeProjectId(id)
                                }
                              }}
                              onMouseDown={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                              }}
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                removeProjectId(id)
                              }}
                              aria-label={`Remove ${projectNameById[id] ?? id}`}
                            >
                              <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                            </span>
                          </Badge>
                        ))}
                        {tempFilters.projects.length > 3 && (
                          <Badge variant="secondary" className="font-normal">
                            +{tempFilters.projects.length - 3} more
                          </Badge>
                        )}
                      </div>
                      <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50 mt-1" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                    <Command shouldFilter={false}>
                      <CommandInput
                        placeholder="Filter by project"
                        value={projectSearchQuery}
                        onValueChange={setProjectSearchQuery}
                        className="h-9"
                      />
                      <CommandList>
                        {projectSearchLoading && (
                          <div className="py-6 text-center text-sm text-muted-foreground">Searching…</div>
                        )}
                        {!projectSearchLoading && projectSearchQuery.trim().length < 2 && (
                          <div className="py-6 text-center text-sm text-muted-foreground">Type to search</div>
                        )}
                        {!projectSearchLoading &&
                          projectSearchQuery.trim().length >= 2 &&
                          projectSearchResults.length === 0 && (
                            <CommandGroup>
                              <div className="py-2 px-2 text-center text-sm text-muted-foreground">
                                No projects found
                              </div>
                              <CommandItem
                                value="__create_new_project__"
                                onSelect={() => {
                                  window.open("/projects", "_blank", "noopener,noreferrer")
                                }}
                                className="cursor-pointer font-medium text-primary"
                              >
                                <Plus className="mr-2 h-4 w-4" />
                                + Create New Project
                              </CommandItem>
                            </CommandGroup>
                          )}
                        {!projectSearchLoading && projectSearchResults.length > 0 && (
                          <CommandGroup>
                            {projectSearchResults.map((proj) => {
                              const idStr = String(proj.id)
                              const selected = tempFilters.projects.includes(idStr)
                              return (
                                <CommandItem
                                  key={proj.id}
                                  value={idStr}
                                  onSelect={() => toggleProjectFromSearch(proj)}
                                  className="cursor-pointer"
                                >
                                  {proj.name}
                                  {selected ? <Check className="ml-auto h-4 w-4 opacity-100" /> : null}
                                </CommandItem>
                              )
                            })}
                          </CommandGroup>
                        )}
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <MultiSelect
                  items={projectStatusOptions}
                  selected={tempFilters.projectStatus}
                  onChange={(values) => handleFilterChange("projectStatus", values)}
                  placeholder="Filter by status..."
                  label="Status"
                  maxDisplay={3}
                />

                <MultiSelect
                  items={projectTypeOptions}
                  selected={tempFilters.projectTypes}
                  onChange={(values) => handleFilterChange("projectTypes", values)}
                  placeholder="Filter by type..."
                  label="Type"
                  maxDisplay={3}
                />
              </div>

              <div className="space-y-2">
              <MultiSelect
                  items={projectTechStackFilterOptions}
                selected={tempFilters.techStacks}
                onChange={(values) => handleFilterChange("techStacks", values)}
                placeholder="Filter by technology..."
                label="Technology Stack"
                searchPlaceholder="Search technologies..."
                maxDisplay={4}
              />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <MultiSelect
                  items={verticalDomains}
                  selected={tempFilters.verticalDomains}
                  onChange={(values) => handleFilterChange("verticalDomains", values)}
                  placeholder="Filter by industry..."
                  label="Vertical Domains"
                  searchPlaceholder="Search industries..."
                  maxDisplay={3}
                />

                <MultiSelect
                  items={horizontalDomains}
                  selected={tempFilters.horizontalDomains}
                  onChange={(values) => handleFilterChange("horizontalDomains", values)}
                  placeholder="Filter by solution type..."
                  label="Horizontal Domains"
                  searchPlaceholder="Search solutions..."
                  maxDisplay={3}
                />
              </div>

              <MultiSelect
                items={technicalDomainCatalogOptions}
                selected={tempFilters.technicalDomains}
                onChange={(values) => handleFilterChange("technicalDomains", values)}
                placeholder="Filter by technical domain..."
                label="Technical Domains"
                searchPlaceholder="Search technical domains..."
                maxDisplay={3}
              />

              {/* <MultiSelect
                items={technicalAspectCatalogOptions}
                selected={tempFilters.technicalAspects}
                onChange={(values) => handleFilterChange("technicalAspects", values)}
                placeholder="Filter by technical aspect..."
                label="Technical Aspects"
                searchPlaceholder="Search technical aspects..."
                maxDisplay={3}
              /> */}

              <MultiSelect
                items={technicalAspectTypeFilterOptions}
                selected={tempFilters.technicalAspectTypeIds}
                onChange={(values) => handleFilterChange("technicalAspectTypeIds", values)}
                placeholder="Select technical aspect types..."
                // label="Technical Aspect Types"
                label="Technical Aspects"
                searchPlaceholder="Search technical aspect types..."
                maxDisplay={3}
              />

              <MultiSelect
                items={clientLocationFilterOptions}
                selected={tempFilters.clientLocations}
                onChange={(values) => handleFilterChange("clientLocations", values)}
                placeholder="Filter by client location..."
                label="Client Location"
                searchPlaceholder="Search locations..."
                maxDisplay={3}
              />

              {/* Start Date Range Filter */}
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">
                    Start Date Range
                  </Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="startDateStart" className="text-xs text-muted-foreground">
                        From Date
                      </Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !tempFilters.startDateStart && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {tempFilters.startDateStart ? (
                              tempFilters.startDateStart.toLocaleDateString()
                            ) : (
                              <span>Select start date</span>
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={tempFilters.startDateStart || undefined}
                            onSelect={(date) => handleFilterChange("startDateStart", date || null)}
                            captionLayout="dropdown"
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="startDateEnd" className="text-xs text-muted-foreground">
                        To Date
                      </Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !tempFilters.startDateEnd && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {tempFilters.startDateEnd ? (
                              tempFilters.startDateEnd.toLocaleDateString()
                            ) : (
                              <span>Select end date</span>
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={tempFilters.startDateEnd || undefined}
                            onSelect={(date) => handleFilterChange("startDateEnd", date || null)}
                            captionLayout="dropdown"
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                </div>
              </div>

              {/* Average Team Size Range Filter */}
              <div className="space-y-3">
                <Label className="text-sm font-semibold">Average Team Size</Label>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="averageTeamSizeMin" className="text-xs text-muted-foreground">
                      Average team size (min)
                    </Label>
                    <Input
                      id="averageTeamSizeMin"
                      type="number"
                      placeholder="e.g., 5"
                      value={tempFilters.averageTeamSizeMin}
                      onChange={(e) => handleFilterChange("averageTeamSizeMin", e.target.value)}
                      min="1"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="averageTeamSizeMax" className="text-xs text-muted-foreground">
                      Average team size (max)
                    </Label>
                    <Input
                      id="averageTeamSizeMax"
                      type="number"
                      placeholder="e.g., 30"
                      value={tempFilters.averageTeamSizeMax}
                      onChange={(e) => handleFilterChange("averageTeamSizeMax", e.target.value)}
                      min="1"
                    />
                  </div>
                </div>
              </div>

              {/* Published App + Main Contribution */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="hasPublishedProject"
                    checked={tempFilters.hasPublishedProject === true}
                    onCheckedChange={(checked) => {
                      handleFilterChange("hasPublishedProject", checked ? true : null)
                    }}
                  />
                  <Label htmlFor="hasPublishedProject" className="text-sm cursor-pointer">
                    Published App
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="hasMainContribution"
                    checked={tempFilters.hasMainContribution === true}
                    onCheckedChange={(checked) => {
                      handleFilterChange("hasMainContribution", checked ? true : null)
                    }}
                  />
                  <Label htmlFor="hasMainContribution" className="text-sm cursor-pointer">
                    Main Contributor
                  </Label>
                </div>
              </div>

              {/* Publish Platforms + Minimum Download Count */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2 min-w-0">
                <MultiSelect
                    items={publishPlatformFilterOptions}
                  selected={tempFilters.publishPlatforms}
                  onChange={(values) => handleFilterChange("publishPlatforms", values)}
                    placeholder="Filter by publish platform..."
                    label="Publish Platform"
                  searchPlaceholder="Search platforms..."
                />
              </div>

                <div className="space-y-3 min-w-0">
                <Label htmlFor="minProjectDownloadCount" className="text-sm font-semibold">
                    Minimum Download Count
                </Label>
                <Input
                  id="minProjectDownloadCount"
                  type="number"
                    placeholder="Filter by minimum download count..."
                  min="0"
                  value={tempFilters.minProjectDownloadCount}
                  onChange={(e) => handleFilterChange("minProjectDownloadCount", e.target.value)}
                />
                </div>
              </div>
            </section>

            {/* Employer-Based Filters Section */}
            <section id="filter-employers" className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-muted-foreground">Employer Characteristics</h3>
                {getSectionFilterCount("employers") > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => clearSectionFilters("employers")}
                    className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
                  >
                    <X className="h-3 w-3 mr-1" />
                    Clear
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Employer</Label>
                  <Popover
                    open={employerComboboxOpen}
                    onOpenChange={(nextOpen) => {
                      setEmployerComboboxOpen(nextOpen)
                      if (!nextOpen) {
                        setEmployerSearchQuery("")
                        setEmployerSearchResults([])
                      }
                    }}
                  >
                    <PopoverTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        role="combobox"
                        aria-expanded={employerComboboxOpen}
                        className={cn(
                          "w-full justify-between items-start gap-2 h-auto min-h-[2.5rem] px-3 py-2 font-normal text-left"
                        )}
                      >
                        <div className="flex flex-wrap gap-1 flex-1 mr-2 items-center min-w-0">
                          {tempFilters.employers.length === 0 && (
                            <span className="text-muted-foreground">Filter by employer...</span>
                          )}
                          {tempFilters.employers.slice(0, 3).map((id) => (
                            <Badge
                              key={id}
                              variant="secondary"
                              className="max-w-full shrink gap-0 pr-0.5 font-normal hover:bg-secondary/80 flex items-center"
                            >
                              <span className="truncate pl-1.5 py-0.5 max-w-[min(12rem,100%)]">
                                {employerNameById[id] ?? (/^\d+$/.test(id.trim()) ? `Employer #${id}` : id)}
                              </span>
                              <span
                                className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-sm outline-none ring-offset-background hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 cursor-pointer"
                                role="button"
                                tabIndex={0}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" || e.key === " ") {
                                    e.preventDefault()
                                    e.stopPropagation()
                                    removeEmployerId(id)
                                  }
                                }}
                                onMouseDown={(e) => {
                                  e.preventDefault()
                                  e.stopPropagation()
                                }}
                                onClick={(e) => {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  removeEmployerId(id)
                                }}
                                aria-label={`Remove ${employerNameById[id] ?? id}`}
                              >
                                <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                              </span>
                            </Badge>
                          ))}
                          {tempFilters.employers.length > 3 && (
                            <Badge variant="secondary" className="font-normal">
                              +{tempFilters.employers.length - 3} more
                            </Badge>
                          )}
                        </div>
                        <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50 mt-1" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                      <Command shouldFilter={false}>
                        <CommandInput
                  placeholder="Filter by employer..."
                          value={employerSearchQuery}
                          onValueChange={setEmployerSearchQuery}
                          className="h-9"
                        />
                        <CommandList>
                          {employerSearchLoading && (
                            <div className="py-6 text-center text-sm text-muted-foreground">Searching…</div>
                          )}
                          {!employerSearchLoading && employerSearchQuery.trim().length < 2 && (
                            <div className="py-6 text-center text-sm text-muted-foreground">Type to search</div>
                          )}
                          {!employerSearchLoading &&
                            employerSearchQuery.trim().length >= 2 &&
                            employerSearchResults.length === 0 && (
                              <div className="py-6 text-center text-sm text-muted-foreground">No employers found</div>
                            )}
                          {!employerSearchLoading && employerSearchResults.length > 0 && (
                            <CommandGroup>
                              {employerSearchResults.map((emp) => {
                                const idStr = String(emp.id)
                                const selected = tempFilters.employers.includes(idStr)
                                return (
                                  <CommandItem
                                    key={emp.id}
                                    value={idStr}
                                    onSelect={() => toggleEmployerFromSearch(emp)}
                                    className="cursor-pointer"
                                  >
                                    {emp.name}
                                    {selected ? <Check className="ml-auto h-4 w-4 opacity-100" /> : null}
                                  </CommandItem>
                                )
                              })}
                            </CommandGroup>
                          )}
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="min-w-0 space-y-2">
                  <MultiSelect
                    items={officeLocationFilterItems}
                    selected={tempFilters.employerLocationIds}
                    onChange={(values) => handleFilterChange("employerLocationIds", values)}
                    placeholder={
                      tempFilters.employers.length === 0
                        ? "Select an employer first"
                        : officeLocationsLoading
                          ? "Loading locations..."
                          : "Filter by office location..."
                    }
                    label="Office Location"
                    searchPlaceholder="Search locations..."
                  maxDisplay={3}
                    disabled={tempFilters.employers.length === 0 || officeLocationsLoading}
                />
                </div>

                <MultiSelect
                  items={employerStatusOptions}
                  selected={tempFilters.employerStatus}
                  onChange={(values) => handleFilterChange("employerStatus", values.slice(-1))}
                  placeholder="Filter by status"
                  label="Status"
                  maxDisplay={1}
                />

                <MultiSelect
                  items={employerRankingOptions}
                  selected={tempFilters.employerRankings}
                  onChange={(values) => handleFilterChange("employerRankings", values)}
                  placeholder="Filter by ranking..."
                  label="Ranking"
                  maxDisplay={3}
                />
              </div>

              <div className="space-y-3">
                <Label className="text-sm font-semibold">Size Range</Label>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="employerSizeMin" className="text-xs text-muted-foreground">
                      Minimum Employees
                    </Label>
                    <Input
                      id="employerSizeMin"
                      type="number"
                      placeholder="0"
                      min="0"
                      value={tempFilters.employerSizeMin}
                      onChange={(e) => handleFilterChange("employerSizeMin", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="employerSizeMax" className="text-xs text-muted-foreground">
                      Maximum Employees
                    </Label>
                    <Input
                      id="employerSizeMax"
                      type="number"
                      placeholder="1000"
                      min="0"
                      value={tempFilters.employerSizeMax}
                      onChange={(e) => handleFilterChange("employerSizeMax", e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <MultiSelect
                  items={employerCountryFilterOptions}
                  selected={tempFilters.employerCountries}
                  onChange={(values) => handleFilterChange("employerCountries", values)}
                  placeholder="Filter by country..."
                  label="Country"
                  searchPlaceholder="Search countries..."
                  maxDisplay={3}
                />

                <div className="space-y-2 min-w-0">
                  <Label htmlFor="employerCity" className="text-sm font-semibold">
                    City
                  </Label>
                  <Input
                    id="employerCity"
                    type="text"
                  placeholder="Filter by city..."
                    value={tempFilters.employerCity}
                    onChange={(e) => handleFilterChange("employerCity", e.target.value)}
                />
                </div>
              </div>
                
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="min-w-0">
                <MultiSelect
                  items={Object.values(EMPLOYER_TYPE_LABELS).map(type => ({ value: type, label: type }))}
                  selected={tempFilters.employerTypes}
                  onChange={(values) => handleFilterChange("employerTypes", values)}
                  placeholder="Filter by employer type..."
                  label="Employer Type"
                  searchPlaceholder="Search types..."
                  maxDisplay={3}
                />
              </div>

                <div className="min-w-0">
              {!hideCompensationFilters ? (
              <MultiSelect
                items={employerSalaryPolicyOptions}
                selected={tempFilters.employerSalaryPolicies}
                onChange={(values) => handleFilterChange("employerSalaryPolicies", values)}
                placeholder="Filter by salary policy..."
                    label="Salary Policy"
                maxDisplay={3}
              />
              ) : null}
                </div>
              </div>
            </section>

            {/* Education Filters Section */}
            <section id="filter-education" className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-muted-foreground">Education Background</h3>
                {getSectionFilterCount("education") > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => clearSectionFilters("education")}
                    className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
                  >
                    <X className="h-3 w-3 mr-1" />
                    Clear
                  </Button>
                )}
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm font-medium">University</Label>
                <Popover
                  open={universityComboboxOpen}
                  onOpenChange={(nextOpen) => {
                    setUniversityComboboxOpen(nextOpen)
                    if (!nextOpen) {
                      resetUniversitySearch()
                    }
                  }}
                >
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      role="combobox"
                      aria-expanded={universityComboboxOpen}
                      className={cn(
                        "w-full justify-between items-start gap-2 h-auto min-h-[2.5rem] px-3 py-2 font-normal text-left"
                      )}
                    >
                      <div className="flex flex-wrap gap-1 flex-1 mr-2 items-center min-w-0">
                        {tempFilters.universities.length === 0 && (
                          <span className="text-muted-foreground">Filter by university...</span>
                        )}
                        {tempFilters.universities.slice(0, 3).map((id) => (
                          <Badge
                            key={id}
                            variant="secondary"
                            className="max-w-full shrink gap-0 pr-0.5 font-normal hover:bg-secondary/80 flex items-center"
                          >
                            <span className="truncate pl-1.5 py-0.5 max-w-[min(12rem,100%)]">
                              {universityNameById[id] ??
                                (/^\d+$/.test(id.trim()) ? `University #${id}` : id)}
                            </span>
                            <span
                              className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-sm outline-none ring-offset-background hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 cursor-pointer"
                              role="button"
                              tabIndex={0}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  removeUniversityId(id)
                                }
                              }}
                              onMouseDown={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                              }}
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                removeUniversityId(id)
                              }}
                              aria-label={`Remove ${universityNameById[id] ?? id}`}
                            >
                              <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                            </span>
                          </Badge>
                        ))}
                        {tempFilters.universities.length > 3 && (
                          <Badge variant="secondary" className="font-normal">
                            +{tempFilters.universities.length - 3} more
                          </Badge>
                        )}
                      </div>
                      <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50 mt-1" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                    <Command shouldFilter={false}>
                      <CommandInput
                        placeholder="Filter by university..."
                        value={universitySearchQuery}
                        onValueChange={setUniversitySearchQuery}
                        className="h-9"
                      />
                      <CommandList>
                        {universitySearchLoading && (
                          <div className="py-6 text-center text-sm text-muted-foreground">Searching…</div>
                        )}
                        {!universitySearchLoading && universitySearchQuery.trim().length < 2 && (
                          <div className="py-6 text-center text-sm text-muted-foreground">Type to search</div>
                        )}
                        {!universitySearchLoading &&
                          universitySearchQuery.trim().length >= 2 &&
                          universitySearchResults.length === 0 && (
                            <CommandGroup>
                              <div className="py-2 px-2 text-center text-sm text-muted-foreground">
                                No universities found
                              </div>
                              <CommandItem
                                value="__create_new_university__"
                                onSelect={() => {
                                  window.open("/universities", "_blank", "noopener,noreferrer")
                                }}
                                className="cursor-pointer font-medium text-primary"
                              >
                                <Plus className="mr-2 h-4 w-4" />
                                + Create New University
                              </CommandItem>
                            </CommandGroup>
                          )}
                        {!universitySearchLoading && universitySearchResults.length > 0 && (
                          <CommandGroup>
                            {universitySearchResults.map((uni) => {
                              const idStr = String(uni.id)
                              const selected = tempFilters.universities.includes(idStr)
                              return (
                                <CommandItem
                                  key={uni.id}
                                  value={idStr}
                                  onSelect={() => toggleUniversityFromSearch(uni)}
                                  className="cursor-pointer"
                                >
                                  {uni.name}
                                  {selected ? <Check className="ml-auto h-4 w-4 opacity-100" /> : null}
                                </CommandItem>
                              )
                            })}
                          </CommandGroup>
                        )}
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              <div className="min-w-0 space-y-2">
              <MultiSelect
                  items={campusLocationFilterItems}
                  selected={tempFilters.universityLocationIds}
                  onChange={(values) => handleFilterChange("universityLocationIds", values)}
                  placeholder={
                    tempFilters.universities.length === 0
                      ? "Select a university first"
                      : campusLocationsLoading
                        ? "Loading locations..."
                        : "Filter by location..."
                  }
                  label="Campus"
                  searchPlaceholder="Search locations..."
                  maxDisplay={3}
                  disabled={tempFilters.universities.length === 0 || campusLocationsLoading}
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2 min-w-0">
                  <MultiSelect
                    items={degreeNameFilterOptions}
                selected={tempFilters.degreeNames}
                onChange={(values) => handleFilterChange("degreeNames", values)}
                placeholder="Filter by degree..."
                label="Degree"
                searchPlaceholder="Search degrees..."
                maxDisplay={3}
                />           
                </div>

                <div className="space-y-2 min-w-0">
                <MultiSelect
                    items={majorNameFilterOptions}
                  selected={tempFilters.majorNames}
                  onChange={(values) => handleFilterChange("majorNames", values)}
                  placeholder="Filter by major..."
                  label="Major"
                  searchPlaceholder="Search majors..."
                  maxDisplay={3}
                />
                </div>
              </div>

              {/* Graduation Date Range Filter */}
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold">
                    Graduation Date Range
                  </Label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="educationEndDateStart" className="text-xs text-muted-foreground">
                        From Date
                      </Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !tempFilters.educationEndDateStart && "text-muted-foreground",
                              dateRangeError && "border-red-500"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {tempFilters.educationEndDateStart ? (
                              tempFilters.educationEndDateStart.toLocaleDateString()
                            ) : (
                              <span>Select start date</span>
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={tempFilters.educationEndDateStart || undefined}
                            onSelect={(date) => handleFilterChange("educationEndDateStart", date || null)}
                            captionLayout="dropdown"
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="educationEndDateEnd" className="text-xs text-muted-foreground">
                        To Date
                      </Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !tempFilters.educationEndDateEnd && "text-muted-foreground",
                              dateRangeError && "border-red-500"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {tempFilters.educationEndDateEnd ? (
                              tempFilters.educationEndDateEnd.toLocaleDateString()
                            ) : (
                              <span>Select end date</span>
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={tempFilters.educationEndDateEnd || undefined}
                            onSelect={(date) => handleFilterChange("educationEndDateEnd", date || null)}
                            captionLayout="dropdown"
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                  {dateRangeError && (
                    <p className="text-xs text-red-500">{dateRangeError}</p>
                  )}
                </div>
              </div>

                {/* Achievement Checkboxes */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="isTopper"
                      checked={tempFilters.isTopper === true}
                      onCheckedChange={(checked) => 
                        handleFilterChange("isTopper", checked ? true : null)
                      }
                    />
                    <Label htmlFor="isTopper" className="text-sm font-normal cursor-pointer">
                      Topper
                    </Label>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="isCheetah"
                      checked={tempFilters.isCheetah === true}
                      onCheckedChange={(checked) => 
                        handleFilterChange("isCheetah", checked ? true : null)
                      }
                    />
                    <Label htmlFor="isCheetah" className="text-sm font-normal cursor-pointer">
                      Cheetah
                    </Label>
                  </div>
                </div>
            </section>

            {/* Certification-Based Filters Section */}
            <section id="filter-certifications" className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-muted-foreground">Professional Certifications</h3>
                {getSectionFilterCount("certifications") > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => clearSectionFilters("certifications")}
                    className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
                  >
                    <X className="h-3 w-3 mr-1" />
                    Clear
                  </Button>
                )}
              </div>
              
              <div className="space-y-2">
                <Label className="text-sm font-medium">Certification</Label>
                <Popover
                  open={certificationNameComboboxOpen}
                  onOpenChange={(nextOpen) => {
                    setCertificationNameComboboxOpen(nextOpen)
                    if (!nextOpen) {
                      resetCertificationNameSearch()
                    }
                  }}
                >
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      role="combobox"
                      aria-expanded={certificationNameComboboxOpen}
                      className={cn(
                        "w-full justify-between items-start gap-2 h-auto min-h-[2.5rem] px-3 py-2 font-normal text-left"
                      )}
                    >
                      <div className="flex flex-wrap gap-1 flex-1 mr-2 items-center min-w-0">
                        {tempFilters.certificationNames.length === 0 && (
                          <span className="text-muted-foreground">Filter by certification...</span>
                        )}
                        {tempFilters.certificationNames.slice(0, 3).map((id) => (
                          <Badge
                            key={id}
                            variant="secondary"
                            className="max-w-full shrink gap-0 pr-0.5 font-normal hover:bg-secondary/80 flex items-center"
                          >
                            <span className="truncate pl-1.5 py-0.5 max-w-[min(12rem,100%)]">
                              {certificationNameById[id] ??
                                (/^\d+$/.test(id.trim()) ? `Certification #${id}` : id)}
                            </span>
                            <span
                              className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-sm outline-none ring-offset-background hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 cursor-pointer"
                              role="button"
                              tabIndex={0}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  e.preventDefault()
                                  e.stopPropagation()
                                  removeCertificationNameId(id)
                                }
                              }}
                              onMouseDown={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                              }}
                              onClick={(e) => {
                                e.preventDefault()
                                e.stopPropagation()
                                removeCertificationNameId(id)
                              }}
                              aria-label={`Remove ${certificationNameById[id] ?? id}`}
                            >
                              <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                            </span>
                          </Badge>
                        ))}
                        {tempFilters.certificationNames.length > 3 && (
                          <Badge variant="secondary" className="font-normal">
                            +{tempFilters.certificationNames.length - 3} more
                          </Badge>
                        )}
                      </div>
                      <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50 mt-1" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-[--radix-popover-trigger-width] min-w-[min(100vw-2rem,24rem)] p-0"
                    align="start"
                  >
                    <Command shouldFilter={false}>
                      <CommandInput
                placeholder="Filter by certification..."
                        value={certificationNameSearchQuery}
                        onValueChange={setCertificationNameSearchQuery}
                        className="h-9"
                      />
                      <CommandList>
                        {certificationNameSearchLoading && (
                          <div className="py-6 text-center text-sm text-muted-foreground">Searching…</div>
                        )}
                        {!certificationNameSearchLoading && certificationNameSearchQuery.trim().length < 2 && (
                          <div className="py-6 text-center text-sm text-muted-foreground">Type to search</div>
                        )}
                        {!certificationNameSearchLoading &&
                          certificationNameSearchQuery.trim().length >= 2 &&
                          certificationNameSearchResults.length === 0 && (
                            <CommandGroup>
                              <div className="py-2 px-2 text-center text-sm text-muted-foreground">
                                No certifications found
                              </div>
                              <CommandItem
                                value="__create_new_certification__"
                                onSelect={() => {
                                  window.open("/certifications", "_blank", "noopener,noreferrer")
                                }}
                                className="cursor-pointer font-medium text-primary"
                              >
                                <Plus className="mr-2 h-4 w-4 shrink-0" />
                                <span className="flex flex-col items-start leading-tight">
                                  <span>+ Create New</span>
                                  <span>Certification</span>
                                </span>
                              </CommandItem>
                            </CommandGroup>
                          )}
                        {!certificationNameSearchLoading && certificationNameSearchResults.length > 0 && (
                          <CommandGroup>
                            {certificationNameSearchResults.map((c) => {
                              const idStr = String(c.id)
                              const selected = tempFilters.certificationNames.includes(idStr)
                              return (
                                <CommandItem
                                  key={c.id}
                                  value={idStr}
                                  onSelect={() => toggleCertificationFromSearch(c)}
                                  className="cursor-pointer items-start py-2"
                                >
                                  <div className="flex flex-1 flex-col gap-0.5 items-start min-w-0 pr-2">
                                    <span className="font-medium leading-tight">{c.name}</span>
                                    {c.issuerName ? (
                                      <span className="text-xs text-muted-foreground leading-tight">
                                        {c.issuerName}
                                      </span>
                                    ) : null}
                                  </div>
                                  {selected ? <Check className="h-4 w-4 shrink-0 opacity-100 mt-0.5" /> : null}
                                </CommandItem>
                              )
                            })}
                          </CommandGroup>
                        )}
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                <MultiSelect
                    items={certificationIssuingBodyFilterOptions}
                  selected={tempFilters.certificationIssuingBodies}
                  onChange={(values) => handleFilterChange("certificationIssuingBodies", values)}
                  placeholder="Filter by issuing body..."
                  label="Issuing Body"
                  searchPlaceholder="Search issuing bodies..."
                  maxDisplay={3}
                />
                </div>

                <MultiSelect
                  items={certificationLevelOptions}
                  selected={tempFilters.certificationLevels}
                  onChange={(values) => handleFilterChange("certificationLevels", values)}
                  placeholder="Filter by level..."
                  label="Level"
                  maxDisplay={3}
                />
              </div>
            </section>

            {/* Achievements Filter Section */}
            <section id="filter-competitions" className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-muted-foreground">Achievements</h3>
                {getSectionFilterCount("competitions") > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => clearSectionFilters("competitions")}
                    className="h-7 px-2 text-xs text-muted-foreground hover:text-destructive"
                  >
                    <X className="h-3 w-3 mr-1" />
                    Clear
                  </Button>
                )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2 min-w-0">
                  <Label htmlFor="achievementName" className="text-sm font-semibold">
                    Name
                  </Label>
                  <Input
                    id="achievementName"
                    type="text"
                    placeholder="Filter by name..."
                    value={tempFilters.achievementName}
                    onChange={(e) => handleFilterChange("achievementName", e.target.value)}
                  />
                </div>

                <div className="min-w-0">
              <MultiSelect
                items={achievementTypeOptions}
                selected={tempFilters.achievementTypes}
                onChange={(values) => handleFilterChange("achievementTypes", values)}
                    placeholder="Filter by type..."
                    label="Type"
                searchPlaceholder="Search types..."
                maxDisplay={3}
              />
              </div>
              </div>
            </section>

          </div>
        </div>

        <DialogFooter className="px-6 py-4 border-t border-border gap-2">
          <div className="flex gap-2 w-full">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              className="cursor-pointer"
            >
              Cancel
            </Button>

            {hasAnyTempFilters && (
              <Button
                type="button"
                variant="outline"
                onClick={handleClearFilters}
                className="cursor-pointer hover:bg-destructive hover:text-destructive-foreground"
              >
                Clear All
              </Button>
            )}

            <Button 
              onClick={handleApplyFilters}
              className="ml-auto transition-all duration-200 ease-in-out hover:scale-[1.02] hover:shadow-sm cursor-pointer"
            >
              Apply Filters
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
