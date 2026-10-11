"use client"

import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Building2, Globe, X } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { EmployersTable } from "@/components/employers-table"
import { EmployerCreationDialog, EmployerFormData, EmployerVerificationState } from "@/components/employer-creation-dialog"
import { EmployersFilterDialog, EmployerFilters } from "@/components/employers-filter-dialog"
import { useGlobalFilters } from "@/contexts/global-filter-context"
import { useCreatedByUserIdListFilter } from "@/hooks/useCreatedByUserIdListFilter"
import { getGlobalFilterCount } from "@/lib/types/global-filters"
import type { Employer, EmployerRanking, ShiftTypeDb, WorkModeDb } from "@/lib/types/employer"
import {
  EMPLOYER_STATUS_DISPLAY_TO_DB,
  EMPLOYER_TYPE_DISPLAY_TO_DB,
  RANKING_DISPLAY_TO_DB,
  SALARY_POLICY_DISPLAY_TO_DB,
} from "@/lib/types/employer"
import type { Country } from "@/lib/types/country"
import { fetchClientLocations, ensureDomainCatalogsLoaded, type LookupItem } from "@/lib/services/lookups-api"
import type { PublishPlatform, ProjectStatus } from "@/lib/types/project"
import { createCountry, fetchCountries, mergeCountryIntoCatalog } from "@/lib/services/countries-api"
import { countryLookupItemsToMultiSelectOptions } from "@/lib/utils/country-lookup"
import {
  fetchTimeSupportZones,
  createTimeSupportZone,
} from "@/lib/services/tags-timesupportzones-api"
import {
  mergeTimeSupportZoneIntoCatalog,
  timeSupportZoneLookupItemsToMultiSelectOptions,
} from "@/lib/utils/time-support-zone-lookup"
import { fetchAwards, createAward } from "@/lib/services/awards-api"
import { fetchBenefits, createBenefit } from "@/lib/services/benefits-api"
import type { EmployerBenefit } from "@/lib/types/benefits"
import {
  fetchEmployers,
  type FetchEmployersParams,
  fetchEmployerById,
  createEmployer,
  updateEmployer,
  deleteEmployer,
  addEmployerLayoff,
  buildCreateEmployerDto,
  buildUpdateEmployerDto,
  buildAddEmployerLayoffDto,
  isNewLayoffFormRow,
  syncEmployerLocationsFromEditForm,
  employerDtoToEmployer,
  employerListItemToEmployer,
  RANKING_TO_API,
  EMPLOYER_STATUS_TO_API,
  EMPLOYER_TYPE_TO_API,
  SALARY_POLICY_TO_API,
  SHIFT_TYPE_TO_API,
  WORK_MODE_TO_API,
} from "@/lib/services/employers-api"
import {
  PROJECT_STATUS_UI_TO_NUM,
  PUBLISH_PLATFORM_UI_TO_NUM,
} from "@/lib/services/projects-api"
import { catalogIdStringsToInts, catalogToSelectOptions } from "@/lib/utils/domain-catalog"
import type { MultiSelectOption } from "@/components/ui/multi-select"

const DEFAULT_PAGE_SIZE = 20

function employerRankingsToApiInts(rankings: EmployerRanking[]): number[] {
  return rankings.map((r) => RANKING_TO_API[RANKING_DISPLAY_TO_DB[r]])
}

function countryNamesToIds(names: string[], list: Country[]): number[] {
  const ids: number[] = []
  for (const name of names) {
    const c = list.find((x) => x.name === name)
    if (c != null) ids.push(c.id)
  }
  return ids
}

function lookupNamesToIds(names: string[], lookup: LookupItem[]): number[] {
  const ids: number[] = []
  for (const name of names) {
    const item = lookup.find((x) => x.name === name)
    if (item != null) ids.push(item.id)
  }
  return ids
}

function parseOptionalNonNegativeInt(s: string): number | undefined {
  const t = s.trim()
  if (!t) return undefined
  const n = parseInt(t, 10)
  return Number.isFinite(n) && n >= 0 ? n : undefined
}

function parseOptionalNonNegativeLong(s: string): number | undefined {
  const t = s.trim()
  if (!t) return undefined
  const n = Number(t)
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : undefined
}

function parseOptionalDouble(s: string): number | undefined {
  const t = s.trim()
  if (!t) return undefined
  const n = parseFloat(t)
  return Number.isFinite(n) ? n : undefined
}

function foundedYearStringToInts(s: string): number[] | undefined {
  const t = s.trim()
  if (!t) return undefined
  const n = parseInt(t, 10)
  if (!Number.isFinite(n) || n < 1000 || n > 9999) return undefined
  return [n]
}

function formatDateOnlyLocal(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

function parseEmployerFilterFromSearchParams(
  searchParams: Pick<URLSearchParams, "get">
): { name: string; id: string } | null {
  const employerFilterName = searchParams.get("employerFilter")?.trim()
  const employerId = searchParams.get("employerId")?.trim()
  if (!employerFilterName || !employerId || !/^\d+$/.test(employerId)) return null
  return { name: employerFilterName, id: employerId }
}

interface EmployersPageClientProps {
  /** Optional initial employers (e.g. from server). If not provided, list is fetched client-side. */
  employers?: Employer[]
}

const initialFilters: EmployerFilters = {
  employerName: "",
  status: [],
  foundedYear: "",
  countries: [],
  city: "",
  employerTypes: [],
  salaryPolicies: [],
  sizeMin: "",
  sizeMax: "",
  minLocationsCount: "",
  minCitiesCount: "",
  benefits: [],
  shiftTypes: [],
  workModes: [],
  timeSupportZones: [],
  awards: [],
  rankings: [],
  isDPLCompetitive: null,
  employeeCity: "",
  verticalDomains: [],
  horizontalDomains: [],
  technicalDomains: [],
  technicalAspects: [],
  clientLocations: [],
  projectStatus: [],
  averageTeamSizeMin: "",
  averageTeamSizeMax: "",
  hasPublishedProject: null,
  publishPlatforms: [],
  minDownloadCount: "",
  layoffDateStart: null,
  layoffDateEnd: null,
  minLayoffEmployees: "",
  avgJobTenureMin: "",
  avgJobTenureMax: "",
  dataProgressMin: "",
  dataProgressMax: "",
}

export function EmployersPageClient({ employers: initialEmployers = [] }: EmployersPageClientProps) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { createdByUserId, dismissCreatedByUserId, markCreatedByUserIdDismissed } =
    useCreatedByUserIdListFilter()
  const { filters: globalFilters, isActive: hasGlobalFilters } = useGlobalFilters()
  const [filters, setFilters] = useState<EmployerFilters>(initialFilters)

  const employerFilterFromUrl = useMemo(
    () => parseEmployerFilterFromSearchParams(searchParams),
    [searchParams]
  )

  const employerIdFromUrl = useMemo(() => {
    const raw = employerFilterFromUrl?.id ?? searchParams.get("employerId")
    if (!raw || !/^\d+$/.test(raw.trim())) return null
    const n = Number.parseInt(raw.trim(), 10)
    return Number.isFinite(n) && n > 0 ? n : null
  }, [employerFilterFromUrl, searchParams])

  const combinedFilters = useMemo((): EmployerFilters => {
    if (employerFilterFromUrl == null) return filters
    const nameFromUrl = employerFilterFromUrl.name.trim()
    if (!nameFromUrl) return filters
    return { ...filters, employerName: nameFromUrl }
  }, [filters, employerFilterFromUrl])

  const listFilterKey = `${employerIdFromUrl ?? ""}|${employerFilterFromUrl?.name ?? ""}`
  const prevListFilterKeyRef = useRef<string | null>(null)
  const [employers, setEmployers] = useState<Employer[]>(initialEmployers)
  const [loading, setLoading] = useState(initialEmployers.length === 0)
  const [error, setError] = useState<string | null>(null)
  const [pageNumber, setPageNumber] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [totalCount, setTotalCount] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [hasPrevious, setHasPrevious] = useState(false)
  const [hasNext, setHasNext] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [employerToEdit, setEmployerToEdit] = useState<Employer | null>(null)
  const [timeSupportZonesLookup, setTimeSupportZonesLookup] = useState<LookupItem[]>([])
  const [awardsLookup, setAwardsLookup] = useState<LookupItem[]>([])
  const [benefitsLookup, setBenefitsLookup] = useState<LookupItem[]>([])
  const [countries, setCountries] = useState<Country[]>([])
  const [countriesLoading, setCountriesLoading] = useState(true)
  const [technicalDomainSelectOptions, setTechnicalDomainSelectOptions] = useState<MultiSelectOption[]>([])
  const [verticalDomainSelectOptions, setVerticalDomainSelectOptions] = useState<MultiSelectOption[]>([])
  const [horizontalDomainSelectOptions, setHorizontalDomainSelectOptions] = useState<MultiSelectOption[]>([])
  const [technicalAspectSelectOptions, setTechnicalAspectSelectOptions] = useState<MultiSelectOption[]>([])
  const [clientLocationsLookup, setClientLocationsLookup] = useState<LookupItem[]>([])

  useEffect(() => {
    if (prevListFilterKeyRef.current === listFilterKey) return
    const isFilterChange = prevListFilterKeyRef.current !== null
    prevListFilterKeyRef.current = listFilterKey
    setPageNumber(1)
    if (isFilterChange) {
      setEmployers([])
      setLoading(true)
    }
  }, [listFilterKey])

  const employerListParams = useMemo((): FetchEmployersParams => {
    const foundedYears = foundedYearStringToInts(combinedFilters.foundedYear)
    const countryIds = countryNamesToIds(combinedFilters.countries, countries)
    const timeZoneIds = lookupNamesToIds(combinedFilters.timeSupportZones, timeSupportZonesLookup)
    const awardIds = lookupNamesToIds(combinedFilters.awards, awardsLookup)
    const clientLocIds = lookupNamesToIds(combinedFilters.clientLocations, clientLocationsLookup)
    const technicalInts = catalogIdStringsToInts(combinedFilters.technicalDomains)
    const verticalInts = catalogIdStringsToInts(combinedFilters.verticalDomains)
    const horizontalInts = catalogIdStringsToInts(combinedFilters.horizontalDomains)
    const technicalAspectInts = catalogIdStringsToInts(combinedFilters.technicalAspects)

    const benefits = combinedFilters.benefits.map((t) => t.trim()).filter(Boolean)

    const statusInt = combinedFilters.status
      .map((s) => {
        const db = EMPLOYER_STATUS_DISPLAY_TO_DB[s]
        return db != null ? EMPLOYER_STATUS_TO_API[db] : undefined
      })
      .find((n): n is number => typeof n === "number")
    const employerTypeInts = combinedFilters.employerTypes.map(
      (t) => EMPLOYER_TYPE_TO_API[EMPLOYER_TYPE_DISPLAY_TO_DB[t]]
    )
    const salaryInts = combinedFilters.salaryPolicies.map(
      (p) => SALARY_POLICY_TO_API[SALARY_POLICY_DISPLAY_TO_DB[p]]
    )
    const rankingInts = combinedFilters.rankings.length ? employerRankingsToApiInts(combinedFilters.rankings) : []

    const shiftInts = combinedFilters.shiftTypes
      .map((k) => SHIFT_TYPE_TO_API[k as ShiftTypeDb])
      .filter((v): v is number => typeof v === "number")
    const workModeInts = combinedFilters.workModes
      .map((k) => WORK_MODE_TO_API[k as WorkModeDb])
      .filter((v): v is number => typeof v === "number")

    const projectStatusInts = combinedFilters.projectStatus
      .map((s) => PROJECT_STATUS_UI_TO_NUM[s as ProjectStatus])
      .filter((v): v is number => typeof v === "number")

    const publishInts = combinedFilters.publishPlatforms
      .map((p) => PUBLISH_PLATFORM_UI_TO_NUM[p as PublishPlatform])
      .filter((v): v is number => typeof v === "number")

    const sizeMin = parseOptionalNonNegativeInt(combinedFilters.sizeMin)
    const sizeMax = parseOptionalNonNegativeInt(combinedFilters.sizeMax)
    const minLocationsCount = parseOptionalNonNegativeInt(combinedFilters.minLocationsCount)
    const minCitiesCount = parseOptionalNonNegativeInt(combinedFilters.minCitiesCount)
    // UI uses averageTeamSize*; employer list API still expects projectTeamSize*.
    const projectTeamSizeMin = parseOptionalNonNegativeInt(combinedFilters.averageTeamSizeMin)
    const projectTeamSizeMax = parseOptionalNonNegativeInt(combinedFilters.averageTeamSizeMax)
    const minDownloadCount = parseOptionalNonNegativeLong(combinedFilters.minDownloadCount)
    const minLayoffEmployees = parseOptionalNonNegativeInt(combinedFilters.minLayoffEmployees)
    const avgJobTenureMin = parseOptionalDouble(combinedFilters.avgJobTenureMin)
    const avgJobTenureMax = parseOptionalDouble(combinedFilters.avgJobTenureMax)
    const minDataProgress = combinedFilters.dataProgressMin.trim()
      ? parseFloat(combinedFilters.dataProgressMin)
      : undefined
    const maxDataProgress = combinedFilters.dataProgressMax.trim()
      ? parseFloat(combinedFilters.dataProgressMax)
      : undefined

    return {
      pageNumber,
      pageSize,
      ...(combinedFilters.employerName.trim() ? { name: combinedFilters.employerName.trim() } : {}),
      ...(statusInt != null ? { status: statusInt } : {}),
      ...(foundedYears?.length ? { foundedYears } : {}),
      ...(countryIds.length ? { countries: countryIds } : {}),
      ...(combinedFilters.city.trim() ? { city: combinedFilters.city.trim() } : {}),
      ...(employerTypeInts.length ? { employerTypes: employerTypeInts } : {}),
      ...(salaryInts.length ? { salaryPolicies: salaryInts } : {}),
      ...(rankingInts.length ? { rankings: rankingInts } : {}),
      ...(combinedFilters.isDPLCompetitive !== null ? { isDPLCompetitive: combinedFilters.isDPLCompetitive } : {}),
      ...(sizeMin != null ? { sizeMin } : {}),
      ...(sizeMax != null ? { sizeMax } : {}),
      ...(minLocationsCount != null ? { minLocationsCount } : {}),
      ...(minCitiesCount != null ? { minCitiesCount } : {}),
      ...(combinedFilters.employeeCity.trim() ? { employeeCity: combinedFilters.employeeCity.trim() } : {}),
      ...(benefits.length ? { benefits } : {}),
      ...(shiftInts.length ? { shiftTypes: shiftInts } : {}),
      ...(workModeInts.length ? { workModes: workModeInts } : {}),
      ...(timeZoneIds.length ? { timeSupportZones: timeZoneIds } : {}),
      ...(awardIds.length ? { awards: awardIds } : {}),
      ...(avgJobTenureMin != null ? { avgJobTenureMin } : {}),
      ...(avgJobTenureMax != null ? { avgJobTenureMax } : {}),
      ...(verticalInts.length ? { verticalDomains: verticalInts } : {}),
      ...(horizontalInts.length ? { horizontalDomains: horizontalInts } : {}),
      ...(technicalInts.length ? { technicalDomains: technicalInts } : {}),
      ...(technicalAspectInts.length ? { technicalAspects: technicalAspectInts } : {}),
      ...(clientLocIds.length ? { clientLocations: clientLocIds } : {}),
      ...(projectStatusInts.length ? { projectStatus: projectStatusInts } : {}),
      ...(projectTeamSizeMin != null ? { projectTeamSizeMin } : {}),
      ...(projectTeamSizeMax != null ? { projectTeamSizeMax } : {}),
      ...(combinedFilters.hasPublishedProject !== null
        ? { hasPublishedProject: combinedFilters.hasPublishedProject }
        : {}),
      ...(publishInts.length ? { publishPlatforms: publishInts } : {}),
      ...(minDownloadCount != null ? { minDownloadCount } : {}),
      ...(combinedFilters.layoffDateStart
        ? { layoffDateStart: formatDateOnlyLocal(combinedFilters.layoffDateStart) }
        : {}),
      ...(combinedFilters.layoffDateEnd
        ? { layoffDateEnd: formatDateOnlyLocal(combinedFilters.layoffDateEnd) }
        : {}),
      ...(minLayoffEmployees != null ? { minLayoffEmployees } : {}),
      ...(minDataProgress != null && !Number.isNaN(minDataProgress)
        ? { minDataProgressPercentage: minDataProgress }
        : {}),
      ...(maxDataProgress != null && !Number.isNaN(maxDataProgress)
        ? { maxDataProgressPercentage: maxDataProgress }
        : {}),
      ...(createdByUserId != null ? { createdByUserId } : {}),
    }
  }, [pageNumber, pageSize, combinedFilters, countries, timeSupportZonesLookup, awardsLookup, clientLocationsLookup, createdByUserId])

  const timeSupportZoneFilterOptions = useMemo(
    () => timeSupportZoneLookupItemsToMultiSelectOptions(timeSupportZonesLookup),
    [timeSupportZonesLookup],
  )

  const awardFilterOptions = useMemo(
    () => awardsLookup.map((a) => ({ value: a.name, label: a.name })),
    [awardsLookup]
  )

  const benefitFilterOptions = useMemo(
    () => benefitsLookup.map((b) => ({ value: b.name, label: b.name })),
    [benefitsLookup]
  )

  const clientLocationFilterOptions = useMemo(
    () => clientLocationsLookup.map((l) => ({ value: l.name, label: l.name })),
    [clientLocationsLookup]
  )

  const countryFilterOptions = useMemo(
    () => countryLookupItemsToMultiSelectOptions(countries),
    [countries],
  )

  useEffect(() => {
    let cancelled = false
    Promise.all([
      fetchTimeSupportZones(),
      fetchAwards(),
      fetchBenefits(),
      ensureDomainCatalogsLoaded(),
      fetchClientLocations(),
    ])
      .then(([timeSupportZones, awards, benefits, catalogs, clientLocations]) => {
        if (!cancelled) {
          setTimeSupportZonesLookup(timeSupportZones)
          setAwardsLookup(awards)
          setBenefitsLookup(benefits)
          setVerticalDomainSelectOptions(catalogToSelectOptions(catalogs.verticalDomains))
          setHorizontalDomainSelectOptions(catalogToSelectOptions(catalogs.horizontalDomains))
          setTechnicalDomainSelectOptions(catalogToSelectOptions(catalogs.technicalDomains))
          setTechnicalAspectSelectOptions(catalogToSelectOptions(catalogs.technicalAspects))
          setClientLocationsLookup(clientLocations)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setTimeSupportZonesLookup([])
          setAwardsLookup([])
          setBenefitsLookup([])
          setVerticalDomainSelectOptions([])
          setHorizontalDomainSelectOptions([])
          setTechnicalDomainSelectOptions([])
          setTechnicalAspectSelectOptions([])
          setClientLocationsLookup([])
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    fetchCountries()
      .then((data) => {
        if (!cancelled) setCountries(data)
      })
      .catch(() => {
        if (!cancelled) {
          setCountries([])
          toast.error("Failed to load countries.")
        }
      })
      .finally(() => {
        if (!cancelled) setCountriesLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const handleCreateTimeSupportZone = useCallback(async (name: string) => {
    try {
      const created = await createTimeSupportZone(name)
      setTimeSupportZonesLookup((prev) => mergeTimeSupportZoneIntoCatalog(prev, created))
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to add time zone")
    }
  }, [])

  const handleCreateAward = useCallback(async (name: string) => {
    try {
      const created = await createAward(name)
      setAwardsLookup((prev) => [...prev.filter((l) => l.id !== created.id && l.name !== created.name), created])
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to add award")
    }
  }, [])

  const handleCreateCountry = useCallback(async (name: string): Promise<Country | null> => {
    try {
      const newCountry = await createCountry(name)
      setCountries((prev) => mergeCountryIntoCatalog(prev, newCountry))
      return newCountry
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to add country.")
      return null
    }
  }, [])

  const handleCreateBenefit = useCallback(async (name: string): Promise<EmployerBenefit | null> => {
    try {
      const created = await createBenefit(name)
      setBenefitsLookup((prev) => [...prev.filter((l) => l.id !== created.id && l.name !== created.name), created])
      return {
        id: String(created.id),
        name: created.name,
        hasValue: false,
        amount: null,
        unit: null,
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to add benefit")
      return null
    }
  }, [])

  const refetchEmployers = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      await ensureDomainCatalogsLoaded()
      const result = await fetchEmployers(employerListParams)
      setEmployers(result.items.map(employerListItemToEmployer))
      setTotalCount(result.totalCount)
      setTotalPages(result.totalPages)
      setHasPrevious(result.hasPrevious)
      setHasNext(result.hasNext)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load employers")
      setEmployers([])
    } finally {
      setLoading(false)
    }
  }, [employerListParams])

  useEffect(() => {
    refetchEmployers()
  }, [refetchEmployers])

  const handleEmployerSubmit = useCallback(
    async (data: EmployerFormData, verificationState?: EmployerVerificationState) => {
      try {
        if (employerToEdit) {
          const id = Number(employerToEdit.id)
          const dto = buildUpdateEmployerDto(data, {
            timeSupportZonesLookup,
            awardsLookup,
            includeStatus: verificationState?.modifiedFields.has("status") ?? false,
          })
          await updateEmployer(id, dto)
          await syncEmployerLocationsFromEditForm(id, data, employerToEdit, (name) => {
            return countries.find((c) => c.name === name)?.id ?? 0
          })
          const newLayoffs = (data.layoffs ?? []).filter((lay) => isNewLayoffFormRow(lay.id))
          for (const lay of newLayoffs) {
            const body = buildAddEmployerLayoffDto(lay)
            if (body) await addEmployerLayoff(id, body)
          }
          toast.success("Employer updated successfully.")
        } else {
          const dto = buildCreateEmployerDto(data, {
            timeSupportZonesLookup,
            awardsLookup,
            getCountryId: (name) => countries.find((c) => c.name === name)?.id ?? 0,
          })
          await createEmployer(dto)
          toast.success("Employer created successfully.")
        }
        setEditDialogOpen(false)
        setEmployerToEdit(null)
        await refetchEmployers()
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to save employer")
        throw e
      }
    },
    [employerToEdit, timeSupportZonesLookup, awardsLookup, countries, refetchEmployers]
  )

  const handleFiltersChange = useCallback((newFilters: EmployerFilters) => {
    dismissCreatedByUserId()
    setFilters(newFilters)
    setPageNumber(1)
  }, [dismissCreatedByUserId])

  const handleClearFilters = useCallback(() => {
    dismissCreatedByUserId()
    setFilters(initialFilters)
    setPageNumber(1)
  }, [dismissCreatedByUserId])

  const handlePageChange = useCallback((page: number) => {
    setPageNumber(page)
  }, [])

  const handlePageSizeChange = useCallback((size: number) => {
    setPageSize(size)
    setPageNumber(1)
  }, [])

  const handleClearEmployerFilter = useCallback(() => {
    markCreatedByUserIdDismissed()
    router.push("/employers")
  }, [markCreatedByUserIdDismissed, router])

  const visibleEmployers = useMemo(() => {
    if (employerIdFromUrl == null) return employers
    const idStr = String(employerIdFromUrl)
    const byId = employers.filter((e) => e.id === idStr)
    return byId.length > 0 ? byId : employers
  }, [employers, employerIdFromUrl])

  const handleViewEmployer = useCallback((_employer: Employer) => {
    // TODO: Open employer details modal or navigate to detail page
  }, [])

  const handleEditEmployer = useCallback(async (employer: Employer) => {
    try {
      const id = Number(employer.id)
      const dto = await fetchEmployerById(id)
      setEmployerToEdit(employerDtoToEmployer(dto))
      setEditDialogOpen(true)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load employer")
    }
  }, [])

  const handleDeleteEmployer = useCallback(
    async (employer: Employer) => {
      try {
        await deleteEmployer(Number(employer.id))
        toast.success(`Employer "${employer.name}" deleted.`)
        await refetchEmployers()
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to delete employer")
      }
    },
    [refetchEmployers]
  )

  const handleAddLocation = useCallback((_employer: Employer) => {
    // TODO: Implement add location via API (e.g. open modal or navigate)
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">All Employers</h2>
        </div>
        <div className="flex items-center gap-2">
          <EmployersFilterDialog
            filters={filters}
            onFiltersChange={handleFiltersChange}
            onClearFilters={handleClearFilters}
            lookupOptions={{
              technicalDomains: technicalDomainSelectOptions,
              verticalDomains: verticalDomainSelectOptions,
              horizontalDomains: horizontalDomainSelectOptions,
              technicalAspects: technicalAspectSelectOptions,
              timeSupportZones: timeSupportZoneFilterOptions,
              awards: awardFilterOptions,
              benefits: benefitFilterOptions,
              clientLocations: clientLocationFilterOptions,
              countries: countryFilterOptions,
            }}
          />
          <EmployerCreationDialog
            onSubmit={handleEmployerSubmit}
            countries={countries}
            countriesLoading={countriesLoading}
            lookups={{
              timeSupportZones: timeSupportZonesLookup,
              awards: awardsLookup,
              benefits: benefitsLookup,
            }}
            onCreateTimeSupportZone={handleCreateTimeSupportZone}
            onCreateAward={handleCreateAward}
            onCreateBenefit={handleCreateBenefit}
            onCreateCountry={handleCreateCountry}
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

      {employerFilterFromUrl && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">Active filters:</span>
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
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}
      <EmployersTable
        employers={visibleEmployers}
        filters={combinedFilters}
        isLoading={loading}
        totalCount={totalCount}
        pageNumber={pageNumber}
        pageSize={pageSize}
        totalPages={totalPages}
        hasPrevious={hasPrevious}
        hasNext={hasNext}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
        onView={handleViewEmployer}
        onEdit={handleEditEmployer}
        onDelete={handleDeleteEmployer}
        onAddLocation={handleAddLocation}
        countries={countries}
        countriesLoading={countriesLoading}
        onCreateCountry={handleCreateCountry}
        lookups={{
          timeSupportZones: timeSupportZonesLookup,
          awards: awardsLookup,
          benefits: benefitsLookup,
        }}
        onCreateTimeSupportZone={handleCreateTimeSupportZone}
        onCreateAward={handleCreateAward}
        onCreateBenefit={handleCreateBenefit}
      />

      {employerToEdit && (
        <EmployerCreationDialog
          mode="edit"
          employerData={employerToEdit}
          showVerification={true}
          onSubmit={handleEmployerSubmit}
          open={editDialogOpen}
          onOpenChange={(open) => {
            setEditDialogOpen(open)
            if (!open) setEmployerToEdit(null)
          }}
          countries={countries}
          countriesLoading={countriesLoading}
          lookups={{
            timeSupportZones: timeSupportZonesLookup,
            awards: awardsLookup,
            benefits: benefitsLookup,
          }}
          onCreateTimeSupportZone={handleCreateTimeSupportZone}
          onCreateAward={handleCreateAward}
          onCreateBenefit={handleCreateBenefit}
          onCreateCountry={handleCreateCountry}
        />
      )}
    </div>
  )
}
