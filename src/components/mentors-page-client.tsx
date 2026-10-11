"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ChevronDown, ChevronRight, Plus, UserRound, Users, X } from "lucide-react"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Separator } from "@/components/ui/separator"
import { Input } from "@/components/ui/input"
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { EmployerComboboxNestedCreationProps } from "@/components/employer-combobox"
import { MentorCreationDialog, type MentorPersonFormData } from "@/components/mentor-creation-dialog"
import {
  emptyMentorFilters,
  MentorsFilterDialog,
  type MentorFilters,
} from "@/components/mentors-filter-dialog"
import { MentorsTable } from "@/components/mentors-table"
import { fetchAwards, createAward } from "@/lib/services/awards-api"
import { fetchBenefits, createBenefit } from "@/lib/services/benefits-api"
import { createCountry, fetchCountries, mergeCountryIntoCatalog } from "@/lib/services/countries-api"
import {
  createMentor,
  deleteMentor,
  fetchMentorById,
  fetchMentorsPage,
  updateMentor,
} from "@/lib/services/mentors-api"
import {
  createTimeSupportZone,
  fetchTimeSupportZones,
} from "@/lib/services/tags-timesupportzones-api"
import { mergeTimeSupportZoneIntoCatalog } from "@/lib/utils/time-support-zone-lookup"
import type { LookupItem } from "@/lib/services/lookups-api"
import type { Country } from "@/lib/types/country"
import type { EmployerBenefit } from "@/lib/types/benefits"
import type { Mentor } from "@/lib/types/mentor"

const DEFAULT_PAGE_SIZE = 20

function parseMentorFilterFromSearchParams(
  searchParams: Pick<URLSearchParams, "get">,
): { name: string; id: number } | null {
  const name = searchParams.get("mentorFilter")?.trim() ?? ""
  const rawId = searchParams.get("mentorId")?.trim() ?? ""
  if (!name || !/^\d+$/.test(rawId)) return null
  const id = Number.parseInt(rawId, 10)
  if (!Number.isFinite(id) || id <= 0) return null
  return { name, id }
}

function textOrNa(value: string | null | undefined) {
  const trimmed = value?.trim()
  if (!trimmed) return <span className="italic text-muted-foreground">N/A</span>
  return trimmed
}

export function MentorsPageClient() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const mentorFilterFromUrl = useMemo(
    () => parseMentorFilterFromSearchParams(searchParams),
    [searchParams],
  )
  const [nameInput, setNameInput] = useState(mentorFilterFromUrl?.name ?? "")
  const [nameQuery, setNameQuery] = useState(mentorFilterFromUrl?.name ?? "")
  const [filters, setFilters] = useState<MentorFilters>(emptyMentorFilters)
  const [items, setItems] = useState<Mentor[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [pageNumber, setPageNumber] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [totalPages, setTotalPages] = useState(0)
  const [hasPrevious, setHasPrevious] = useState(false)
  const [hasNext, setHasNext] = useState(false)
  const [loading, setLoading] = useState(true)

  const [countries, setCountries] = useState<Country[]>([])
  const [countriesLoading, setCountriesLoading] = useState(true)
  const [timeSupportZones, setTimeSupportZones] = useState<LookupItem[]>([])
  const [awards, setAwards] = useState<LookupItem[]>([])
  const [benefits, setBenefits] = useState<LookupItem[]>([])

  const [createOpen, setCreateOpen] = useState(false)
  const [editMentor, setEditMentor] = useState<Mentor | null>(null)
  const [detailMentor, setDetailMentor] = useState<Mentor | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [basicOpen, setBasicOpen] = useState(true)
  const [candidatesOpen, setCandidatesOpen] = useState(true)
  const [mentorToDelete, setMentorToDelete] = useState<Mentor | null>(null)

  useEffect(() => {
    if (!mentorFilterFromUrl) return
    setNameInput(mentorFilterFromUrl.name)
    setPageNumber(1)
  }, [mentorFilterFromUrl])

  useEffect(() => {
    const timer = setTimeout(() => {
      setNameQuery(nameInput.trim())
      setPageNumber(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [nameInput])

  const loadMentors = useCallback(async (
    page: number,
    size: number,
    name: string,
    applied: MentorFilters,
  ) => {
    try {
      setLoading(true)
      const employerIds = applied.employerIds
        .map((id) => Number(id))
        .filter((id) => Number.isInteger(id) && id > 0)
      const data = await fetchMentorsPage({
        name: name || undefined,
        filterName: applied.name.trim() || undefined,
        designation: applied.designation.trim() || undefined,
        employerIds: employerIds.length > 0 ? employerIds : undefined,
        pageNumber: page,
        pageSize: size,
      })
      setItems(data.items)
      setTotalCount(data.totalCount)
      setPageNumber(data.pageNumber)
      setPageSize(data.pageSize)
      setTotalPages(data.totalPages)
      setHasPrevious(data.hasPrevious)
      setHasNext(data.hasNext)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load mentors.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadMentors(pageNumber, pageSize, nameQuery, filters)
  }, [loadMentors, pageNumber, pageSize, nameQuery, filters])

  useEffect(() => {
    let cancelled = false
    Promise.all([fetchCountries(), fetchTimeSupportZones(), fetchAwards(), fetchBenefits()])
      .then(([countryRows, zones, awardRows, benefitRows]) => {
        if (cancelled) return
        setCountries(countryRows)
        setTimeSupportZones(zones)
        setAwards(awardRows)
        setBenefits(benefitRows)
      })
      .catch(() => {
        if (!cancelled) toast.error("Failed to load employer catalogs.")
      })
      .finally(() => {
        if (!cancelled) setCountriesLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const nestedEmployerCreation = useMemo<EmployerComboboxNestedCreationProps>(
    () => ({
      countries,
      countriesLoading,
      lookups: {
        timeSupportZones,
        awards,
        benefits,
      },
      onCreateTimeSupportZone: async (name: string) => {
        const created = await createTimeSupportZone(name)
        setTimeSupportZones((prev) => mergeTimeSupportZoneIntoCatalog(prev, created))
      },
      onCreateAward: async (name: string) => {
        const created = await createAward(name)
        setAwards((prev) => [...prev.filter((item) => item.id !== created.id), created])
      },
      onCreateBenefit: async (name: string): Promise<EmployerBenefit | null> => {
        const created = await createBenefit(name)
        setBenefits((prev) => [...prev.filter((item) => item.id !== created.id), created])
        return { id: String(created.id), name: created.name, hasValue: false, amount: null, unit: null }
      },
      onCreateCountry: async (name: string) => {
        const created = await createCountry(name)
        setCountries((prev) => mergeCountryIntoCatalog(prev, created))
        return created
      },
    }),
    [countries, countriesLoading, timeSupportZones, awards, benefits],
  )

  const handleCreate = async (data: MentorPersonFormData) => {
    if (data.employerId == null) return
    await createMentor({
      name: data.name,
      designation: data.designation || null,
      employerId: data.employerId,
    })
    toast.success(`Mentor "${data.name}" has been created.`)
    await loadMentors(pageNumber, pageSize, nameQuery, filters)
  }

  const handleEdit = async (data: MentorPersonFormData) => {
    if (!editMentor || data.employerId == null) return
    await updateMentor(editMentor.id, {
      name: data.name,
      designation: data.designation || null,
      employerId: data.employerId,
    })
    toast.success(`Mentor "${data.name}" has been updated.`)
    setEditMentor(null)
    await loadMentors(pageNumber, pageSize, nameQuery, filters)
  }

  const dismissMentorUrlFilter = useCallback(() => {
    if (!searchParams.get("mentorFilter") && !searchParams.get("mentorId")) return
    const params = new URLSearchParams(searchParams.toString())
    params.delete("mentorFilter")
    params.delete("mentorId")
    const next = params.toString()
    router.push(next ? `/mentors?${next}` : "/mentors")
  }, [router, searchParams])

  const handleFiltersChange = (next: MentorFilters) => {
    dismissMentorUrlFilter()
    setFilters(next)
    setPageNumber(1)
  }

  const handleClearDialogFilters = () => {
    dismissMentorUrlFilter()
    setFilters(emptyMentorFilters)
    setPageNumber(1)
  }

  const visibleMentors = useMemo(() => {
    if (mentorFilterFromUrl == null) return items
    const byId = items.filter((mentor) => mentor.id === mentorFilterFromUrl.id)
    return byId.length > 0 ? byId : items
  }, [items, mentorFilterFromUrl])

  const handleClearMentorFilter = () => {
    setNameInput("")
    setNameQuery("")
    setPageNumber(1)
    router.push("/mentors")
  }

  const openCandidateInList = (candidateId: number) => {
    if (!Number.isFinite(candidateId) || candidateId <= 0) return
    setDetailOpen(false)
    router.push(`/candidates?candidateId=${candidateId}`)
  }

  const handleOpen = async (mentor: Mentor) => {
    setBasicOpen(true)
    setCandidatesOpen(true)
    setDetailMentor(mentor)
    setDetailOpen(true)
    try {
      const full = await fetchMentorById(mentor.id)
      setDetailMentor(full)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load mentor.")
    }
  }

  const handleConfirmDelete = async () => {
    if (!mentorToDelete) return
    try {
      await deleteMentor(mentorToDelete.id)
      toast.success(`Mentor "${mentorToDelete.name}" has been deleted.`)
      setMentorToDelete(null)
      if (detailMentor?.id === mentorToDelete.id) setDetailOpen(false)
      await loadMentors(pageNumber, pageSize, nameQuery, filters)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete mentor.")
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-3xl font-bold tracking-tight">All Mentors</h2>
        <div className="flex items-center gap-2">
          <MentorsFilterDialog
            filters={filters}
            onFiltersChange={handleFiltersChange}
            onClearFilters={handleClearDialogFilters}
          />
          <Button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="transition-all duration-200 ease-in-out hover:scale-105 hover:shadow-md cursor-pointer"
          >
            <Plus className="mr-2 h-4 w-4" />
            Create Mentor
          </Button>
        </div>
      </div>
      <Input
        value={nameInput}
        onChange={(event) => setNameInput(event.target.value)}
        placeholder="Search by name..."
        className="max-w-sm"
        aria-label="Search mentors by name"
      />
      {mentorFilterFromUrl && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">Active filters:</span>
          <Badge variant="secondary" className="flex items-center gap-1">
            <UserRound className="h-3 w-3" />
            Mentor: {mentorFilterFromUrl.name}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-4 w-4 p-0 hover:bg-transparent"
              onClick={handleClearMentorFilter}
            >
              <X className="h-3 w-3" />
            </Button>
          </Badge>
        </div>
      )}
      <MentorsTable
        mentors={visibleMentors}
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
        onOpen={(mentor) => void handleOpen(mentor)}
        onEdit={setEditMentor}
        onDelete={setMentorToDelete}
      />

      <MentorCreationDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        mode="create"
        nestedEmployerCreation={nestedEmployerCreation}
        onSubmit={handleCreate}
      />
      <MentorCreationDialog
        open={editMentor != null}
        onOpenChange={(open) => {
          if (!open) setEditMentor(null)
        }}
        mode="edit"
        mentor={editMentor}
        nestedEmployerCreation={nestedEmployerCreation}
        onSubmit={handleEdit}
      />

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-[700px] lg:max-w-[800px] max-h-[90vh] overflow-hidden flex flex-col p-0">
          <DialogHeader className="shrink-0 px-6 pt-6 pb-4 border-b border-border">
            <div className="flex items-start justify-between gap-3">
              <DialogTitle className="flex items-center gap-2 text-xl">
                <UserRound className="h-5 w-5 shrink-0 text-blue-600" />
                {detailMentor?.name ?? "Mentor"}
              </DialogTitle>
              {detailMentor ? (
                <div className="mr-8 flex shrink-0 gap-2">
                  <Button
                    type="button"
                    variant="default"
                    size="sm"
                    className="cursor-pointer"
                    onClick={() => {
                      setEditMentor(detailMentor)
                      setDetailOpen(false)
                    }}
                  >
                    Edit
                  </Button>
                </div>
              ) : null}
            </div>
          </DialogHeader>
          {detailMentor && (
            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6 space-y-6">
              <Collapsible open={basicOpen} onOpenChange={setBasicOpen}>
                <Card>
                  <CollapsibleTrigger className="w-full">
                    <CardHeader className="cursor-pointer hover:bg-accent/50 transition-colors">
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                          <UserRound className="size-5" />
                          Basic Information
                        </CardTitle>
                        {basicOpen ? (
                          <ChevronDown className="size-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="size-4 text-muted-foreground" />
                        )}
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="space-y-2">
                      <div className="grid grid-cols-1 gap-1 md:grid-cols-2">
                        <div className="px-3 py-2">
                          <span className="mb-0.5 block text-sm font-medium text-muted-foreground">Name</span>
                          <span className="block text-sm">{textOrNa(detailMentor.name)}</span>
                        </div>
                        <div className="px-3 py-2">
                          <span className="mb-0.5 block text-sm font-medium text-muted-foreground">Designation</span>
                          <span className="block text-sm">{textOrNa(detailMentor.designation)}</span>
                        </div>
                        <div className="px-3 py-2">
                          <span className="mb-0.5 block text-sm font-medium text-muted-foreground">Organization</span>
                          <span className="block text-sm">{textOrNa(detailMentor.employerName)}</span>
                        </div>
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
              <Collapsible open={candidatesOpen} onOpenChange={setCandidatesOpen}>
                <Card>
                  <CollapsibleTrigger className="w-full">
                    <CardHeader className="cursor-pointer hover:bg-accent/50 transition-colors">
                      <div className="flex items-center justify-between">
                        <CardTitle className="flex items-center gap-2">
                          <Users className="size-5" />
                          Candidates
                          {detailMentor.linkedCandidates.length > 0 && (
                            <Badge variant="secondary" className="ml-2">
                              {detailMentor.linkedCandidates.length}
                            </Badge>
                          )}
                        </CardTitle>
                        {candidatesOpen ? (
                          <ChevronDown className="size-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="size-4 text-muted-foreground" />
                        )}
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="space-y-6">
                      {detailMentor.linkedCandidates.length === 0 ? (
                        <p className="text-sm italic text-muted-foreground">N/A</p>
                      ) : (
                        detailMentor.linkedCandidates.map((link, index) => (
                          <div key={link.candidateId}>
                            {index > 0 && <Separator className="my-6" />}
                            <div className="space-y-4">
                              {link.candidateName.trim() && link.candidateId > 0 ? (
                                <button
                                  type="button"
                                  className="text-sm font-medium hover:text-primary hover:underline transition-colors text-left cursor-pointer break-words"
                                  title={`View ${link.candidateName.trim()}`}
                                  onClick={() => openCandidateInList(link.candidateId)}
                                >
                                  {link.candidateName.trim()}
                                </button>
                              ) : (
                                <p className="text-sm font-medium">{textOrNa(link.candidateName)}</p>
                              )}
                              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                <div className="min-w-0">
                                  <p className="text-sm font-medium text-muted-foreground">Relationship</p>
                                  <p className="text-sm whitespace-pre-wrap">{textOrNa(link.relationship)}</p>
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm font-medium text-muted-foreground">Reasoning</p>
                                  <p className="text-sm whitespace-pre-wrap">{textOrNa(link.reasoning)}</p>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={mentorToDelete != null} onOpenChange={(open) => !open && setMentorToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{mentorToDelete?.name}</strong> and every candidate link to them. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="cursor-pointer">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void handleConfirmDelete()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 cursor-pointer transition-transform duration-200 hover:scale-105"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
