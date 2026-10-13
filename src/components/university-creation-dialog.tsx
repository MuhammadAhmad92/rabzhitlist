"use client"

import * as React from "react"
import { useState, useRef, useMemo, useEffect } from "react"
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
import { Checkbox } from "@/components/ui/checkbox"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
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
import { Loader2, Plus, GraduationCap, MapPin, Trash2, ShieldCheck, ChevronDown, ChevronRight, ChevronsUpDown, Check } from "lucide-react"
import { University, UniversityRanking, UNIVERSITY_RANKING_LABELS, RANKING_TO_LABEL } from "@/lib/types/university"
import type { Country } from "@/lib/types/country"
import { cn } from "@/lib/utils"
import { universityNameFieldErrorFromApi } from "@/lib/utils/api-error-message"
import { toast } from "sonner"
import { VERIFICATION_UI_ENABLED } from "@/lib/config/verification-ui-enabled"

// Form data interfaces
export interface UniversityLocationFormData {
  id: string
  city: string
  address: string
  isMainCampus: boolean
}

export interface UniversityFormData {
  name: string
  websiteUrl: string
  linkedinUrl: string
  countryId: number | null
  ranking: UniversityRanking | ""
  locations: UniversityLocationFormData[]
}

// Verification state export
export interface UniversityVerificationState {
  verifiedFields: Set<string>
  modifiedFields: Set<string>
}

type DialogMode = "create" | "edit"

interface UniversityCreationDialogProps {
  children?: React.ReactNode
  mode?: DialogMode
  universityData?: University
  showVerification?: boolean
  onSubmit?: (data: UniversityFormData, verificationState?: UniversityVerificationState) => Promise<void> | void
  onOpenChange?: (open: boolean) => void
  open?: boolean
  initialName?: string
  countries?: Country[]
  countriesLoading?: boolean
  /** When provided, allows adding a new country from the country combobox when not found. Should create and return the new country. */
  onCreateCountry?: (name: string) => Promise<Country | null>
}

/** Stable default — avoid `countries = []` in props (new [] each render breaks useEffect deps). */
const EMPTY_COUNTRIES: Country[] = []

const createEmptyLocation = (): UniversityLocationFormData => ({
  id: crypto.randomUUID(),
  city: "",
  address: "",
  isMainCampus: false,
})

const initialFormData: UniversityFormData = {
  name: "",
  websiteUrl: "",
  linkedinUrl: "",
  countryId: null,
  ranking: "",
  locations: [createEmptyLocation()],
}

// Ranking options
const rankingOptions = Object.entries(UNIVERSITY_RANKING_LABELS).map(([value, label]) => ({
  value: value as UniversityRanking,
  label
}))

/** Radix Select requires non-empty item values; maps to `ranking: ""` in form state. */
const RANKING_SELECT_NONE = "__ranking_none__"

// Helper to convert University (API) to UniversityFormData
function universityToFormData(university: University, _countries?: Country[]): UniversityFormData {
  const countryId = university.country?.id ?? null
  const rankingLabel =
    university.ranking != null && RANKING_TO_LABEL[university.ranking as keyof typeof RANKING_TO_LABEL]
      ? RANKING_TO_LABEL[university.ranking as keyof typeof RANKING_TO_LABEL]
      : ""
  return {
    name: university.name || "",
    websiteUrl: university.websiteUrl ?? "",
    linkedinUrl: university.linkedInUrl ?? "",
    countryId,
    ranking: rankingLabel,
    locations: university.locations.map((loc) => ({
      id: String(loc.id),
      city: loc.city || "",
      address: loc.address ?? "",
      isMainCampus: loc.isMainCampus,
    })),
  }
}

// All verifiable fields for universities
const UNIVERSITY_VERIFICATION_FIELDS = [
  'name', 'country', 'ranking', 'websiteUrl', 'linkedinUrl'
]

// Location fields (dynamic based on number of locations)
const getLocationFieldNames = (locationIndex: number): string[] => {
  return [
    `locations[${locationIndex}].city`,
    `locations[${locationIndex}].address`,
    `locations[${locationIndex}].isMainCampus`
  ]
}

export function UniversityCreationDialog({
  children,
  mode = "create",
  universityData,
  showVerification: showVerificationProp = true,
  onSubmit,
  onOpenChange,
  open: controlledOpen,
  initialName,
  countries = EMPTY_COUNTRIES,
  countriesLoading = false,
  onCreateCountry,
}: UniversityCreationDialogProps) {
  const showVerification = VERIFICATION_UI_ENABLED && showVerificationProp
  const [internalOpen, setInternalOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [countryCreateInProgress, setCountryCreateInProgress] = useState(false)
  const [formData, setFormData] = useState<UniversityFormData>(initialFormData)
  const [errors, setErrors] = useState<{
    university?: Partial<Record<keyof Omit<UniversityFormData, "locations">, string>>
    locations?: { [index: number]: Partial<Record<keyof UniversityLocationFormData, string>> }
  }>({})
  const initialFormDataRef = useRef<UniversityFormData | null>(null)
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false)
  const formId = React.useId().replace(/:/g, "")

  const [countryPopoverOpen, setCountryPopoverOpen] = useState(false)
  const [countrySearchQuery, setCountrySearchQuery] = useState("")

  // Verification state
  const [verifiedFields, setVerifiedFields] = useState<Set<string>>(new Set())
  const [modifiedFields, setModifiedFields] = useState<Set<string>>(new Set())

  // Collapsible sections
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(["basic-info", "locations"])
  )

  const filteredCountries = useMemo(() => {
    if (!countrySearchQuery.trim()) return countries
    const q = countrySearchQuery.toLowerCase().trim()
    return countries.filter((c) => c.name.toLowerCase().includes(q))
  }, [countries, countrySearchQuery])

  const selectedCountryName = formData.countryId != null
    ? countries.find((c) => c.id === formData.countryId)?.name ?? ""
    : ""

  // Use controlled or internal open state
  const open = controlledOpen !== undefined ? controlledOpen : internalOpen
  const setOpen = (newOpen: boolean) => {
    if (controlledOpen === undefined) {
      setInternalOpen(newOpen)
    }
    onOpenChange?.(newOpen)
  }

  // Reset form when dialog opens/closes or mode/universityData changes.
  // Do not depend on `countries`: catalog updates (e.g. create country) must not reset the form.
  useEffect(() => {
    if (open) {
      if (mode === "edit" && universityData) {
        const formDataFromUniversity = universityToFormData(universityData, countries)
        setFormData(formDataFromUniversity)
        initialFormDataRef.current = formDataFromUniversity
      } else {
        // In create mode, check for initialName prop
        const formDataToUse = initialName 
          ? { ...initialFormData, name: initialName }
          : initialFormData
        setFormData(formDataToUse)
        initialFormDataRef.current = formDataToUse
      }
      setErrors({})
      setModifiedFields(new Set())
      
      // Reset verified fields if not in verification mode
      if (!showVerification) {
        setVerifiedFields(new Set())
      }
    } else {
      // Reset form when dialog closes
      setFormData(initialFormData)
      setErrors({})
      initialFormDataRef.current = null
      setModifiedFields(new Set())
      if (!showVerification) {
        setVerifiedFields(new Set())
      }
    }
  }, [open, mode, universityData, showVerification, initialName])

  // Check if there are unsaved changes
  const hasUnsavedChanges = useMemo(() => {
    if (!showVerification) return false
    return modifiedFields.size > 0 || verifiedFields.size > 0
  }, [showVerification, modifiedFields, verifiedFields])

  // Handle close with unsaved changes check
  const handleDialogClose = (newOpen: boolean) => {
    if (!newOpen && hasUnsavedChanges) {
      setShowUnsavedWarning(true)
      return
    }
    setOpen(newOpen)
  }

  const handleInputChange = (field: keyof Omit<UniversityFormData, "locations">, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (showVerification) {
      setModifiedFields((prev) => new Set(prev).add(field))
      setVerifiedFields((prev) => new Set(prev).add(field))
    }
    if (errors.university?.[field]) {
      setErrors((prev) => ({
        ...prev,
        university: { ...prev.university, [field]: undefined },
      }))
    }
  }

  const handleCountrySelect = (country: Country) => {
    const clearing = formData.countryId === country.id
    setFormData((prev) => ({
      ...prev,
      countryId: clearing ? null : country.id,
    }))
    setCountryPopoverOpen(false)
    setCountrySearchQuery("")
    if (showVerification) {
      setModifiedFields((prev) => new Set(prev).add("countryId"))
      setVerifiedFields((prev) => new Set(prev).add("country"))
    }
    if (errors.university?.countryId) {
      setErrors((prev) => ({
        ...prev,
        university: { ...prev.university, countryId: undefined },
      }))
    }
  }

  const handleRankingChange = (value: string) => {
    const ranking = value === RANKING_SELECT_NONE ? "" : (value as UniversityRanking)
    setFormData((prev) => ({ ...prev, ranking }))
    if (showVerification) {
      setModifiedFields((prev) => new Set(prev).add("ranking"))
      setVerifiedFields((prev) => new Set(prev).add("ranking"))
    }
    if (errors.university?.ranking) {
      setErrors((prev) => ({
        ...prev,
        university: { ...prev.university, ranking: undefined },
      }))
    }
  }

  const handleLocationChange = (
    index: number,
    field: keyof UniversityLocationFormData,
    value: string | boolean
  ) => {
    setFormData(prev => ({
      ...prev,
      locations: prev.locations.map((location, i) => {
        if (i === index) {
          // If setting this location as main campus, unset others
          if (field === "isMainCampus" && value === true) {
            return { ...location, [field]: value }
          }
          return { ...location, [field]: value }
        }
        // If setting main campus, unset all other main campuses
        if (field === "isMainCampus" && value === true) {
          return { ...location, isMainCampus: false }
        }
        return location
      })
    }))
    
    // Track modifications and auto-verify in verification mode
    if (showVerification) {
      const fieldPath = `locations[${index}].${field}`
      setModifiedFields(prev => new Set(prev).add(fieldPath))
      setVerifiedFields(prev => new Set(prev).add(fieldPath))
    }
    
    // Clear error when user starts typing
    if (errors.locations?.[index]?.[field]) {
      setErrors(prev => ({
        ...prev,
        locations: {
          ...prev.locations,
          [index]: {
            ...prev.locations?.[index],
            [field]: undefined
          }
        }
      }))
    }
  }

  const addLocation = () => {
    setFormData(prev => ({
      ...prev,
      locations: [...prev.locations, createEmptyLocation()]
    }))
  }

  const removeLocation = (index: number) => {
    if (formData.locations.length > 1) {
      setFormData(prev => ({
        ...prev,
        locations: prev.locations.filter((_, i) => i !== index)
      }))
      
      // Clear errors for removed location
      if (errors.locations?.[index]) {
        const newLocationErrors = { ...errors.locations }
        delete newLocationErrors[index]
        setErrors(prev => ({
          ...prev,
          locations: newLocationErrors
        }))
      }
    }
  }

  // Toggle verification checkbox
  const handleVerificationToggle = (fieldName: string, checked: boolean) => {
    setVerifiedFields(prev => {
      const newSet = new Set(prev)
      if (checked) {
        newSet.add(fieldName)
      } else {
        newSet.delete(fieldName)
      }
      return newSet
    })
  }

  // Calculate section progress
  const calculateSectionProgress = (fieldNames: string[]): { percentage: number; verified: number; total: number } => {
    let verified = 0
    const total = fieldNames.length

    fieldNames.forEach(fieldName => {
      if (verifiedFields.has(fieldName)) {
        verified++
      }
    })

    const percentage = total > 0 ? Math.round((verified / total) * 100) : 0
    return { percentage, verified, total }
  }

  // Get progress color
  const getProgressColor = (percentage: number): string => {
    if (percentage === 100) return 'bg-green-500 hover:bg-green-600'
    if (percentage >= 70) return 'bg-yellow-500 hover:bg-yellow-600'
    return 'bg-red-500 hover:bg-red-600'
  }

  // Section progress badge component
  const SectionProgressBadge = ({ 
    percentage, 
    verified, 
    total 
  }: { 
    percentage: number
    verified: number
    total: number 
  }) => {
    if (total === 0) return null

    return (
      <Badge 
        variant="default" 
        className={`${getProgressColor(percentage)} text-white text-xs font-medium`}
      >
        {percentage}% verified ({verified}/{total})
      </Badge>
    )
  }

  // Section progress calculations
  const basicInfoProgress = useMemo(() => 
    calculateSectionProgress(UNIVERSITY_VERIFICATION_FIELDS),
    [verifiedFields]
  )

  const locationsProgress = useMemo(() => {
    let total = 0
    let verified = 0
    
    formData.locations.forEach((_, idx) => {
      const locationFields = getLocationFieldNames(idx)
      locationFields.forEach(fieldName => {
        total++
        if (verifiedFields.has(fieldName)) verified++
      })
    })
    
    return { 
      percentage: total > 0 ? Math.round((verified / total) * 100) : 0,
      verified,
      total
    }
  }, [verifiedFields, formData.locations])

  // Overall verification progress
  const verificationProgress = useMemo(() => {
    let total = UNIVERSITY_VERIFICATION_FIELDS.length
    let verified = 0

    // Count university fields
    UNIVERSITY_VERIFICATION_FIELDS.forEach(field => {
      if (verifiedFields.has(field)) verified++
    })
    
    // Count location fields
    formData.locations.forEach((_, idx) => {
      const locationFields = getLocationFieldNames(idx)
      total += locationFields.length
      locationFields.forEach(fieldName => {
        if (verifiedFields.has(fieldName)) verified++
      })
    })
    
    return total > 0 ? Math.round((verified / total) * 100) : 0
  }, [verifiedFields, formData.locations])

  // Helper to get field names for a section
  const getSectionFieldNames = (sectionId: string): string[] => {
    if (sectionId === 'basic-info') {
      return UNIVERSITY_VERIFICATION_FIELDS
    }
    if (sectionId === 'locations') {
      const allLocationFields: string[] = []
      formData.locations.forEach((_, idx) => {
        allLocationFields.push(...getLocationFieldNames(idx))
      })
      return allLocationFields
    }
    return []
  }

  // Check if all fields in a section are verified
  const isSectionFullyVerified = (sectionId: string): boolean => {
    const sectionFields = getSectionFieldNames(sectionId)
    if (sectionFields.length === 0) return false
    return sectionFields.every(fieldName => verifiedFields.has(fieldName))
  }

  // Handle verify all for a section
  const handleVerifyAllSection = (sectionId: string, checked: boolean) => {
    const sectionFields = getSectionFieldNames(sectionId)
    setVerifiedFields(prev => {
      const newSet = new Set(prev)
      sectionFields.forEach(fieldName => {
        if (checked) {
          newSet.add(fieldName)
        } else {
          newSet.delete(fieldName)
        }
      })
      return newSet
    })
    // Also mark fields as modified when verifying
    if (checked) {
      setModifiedFields(prev => {
        const newSet = new Set(prev)
        sectionFields.forEach(fieldName => newSet.add(fieldName))
        return newSet
      })
    }
  }

  // Verification checkbox component
  const VerificationCheckbox = ({
    fieldName: _fieldName,
    label: _label,
  }: {
    fieldName: string
    label?: string
  }) => {
    if (!showVerification) return null
    /* VERIFICATION_UI_DISABLED — VerificationCheckbox */
    return null
  }

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev)
      if (newSet.has(section)) {
        newSet.delete(section)
      } else {
        newSet.add(section)
      }
      return newSet
    })
  }

  const validateForm = (): boolean => {
    const universityErrors: Partial<Record<keyof Omit<UniversityFormData, 'locations'>, string>> = {}
    const locationErrors: { [index: number]: Partial<Record<keyof UniversityLocationFormData, string>> } = {}

    if (!formData.name.trim()) universityErrors.name = "University name is required"

    const website = formData.websiteUrl.trim()
    if (website && !website.startsWith("http")) {
      universityErrors.websiteUrl = "Website URL must start with http:// or https://"
    }

    if (formData.linkedinUrl.trim() && !formData.linkedinUrl.startsWith("http")) {
      universityErrors.linkedinUrl = "LinkedIn URL must start with http:// or https://"
    }

    const newErrors = {
      university: Object.keys(universityErrors).length > 0 ? universityErrors : undefined,
      locations: Object.keys(locationErrors).length > 0 ? locationErrors : undefined,
    }

    setErrors(newErrors)
    return !newErrors.university && !newErrors.locations
  }

  const submitUniversity = async () => {
    if (!validateForm()) {
      return
    }

    setIsLoading(true)
    try {
      // Include verification state if in verification mode
      const verificationState: UniversityVerificationState | undefined = showVerification
        ? { verifiedFields, modifiedFields }
        : undefined

      await onSubmit?.(formData, verificationState)
      setFormData(initialFormData)
      setErrors({})
      setVerifiedFields(new Set())
      setModifiedFields(new Set())
      setOpen(false)
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : `Failed to ${mode === "edit" ? "update" : "create"} university`
      const nameError = universityNameFieldErrorFromApi(message)
      if (nameError) {
        setErrors((prev) => ({
          ...prev,
          university: { ...prev.university, name: nameError },
        }))
      }
      toast.error(message)
      console.error(`Error ${mode === "edit" ? "updating" : "creating"} university:`, error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    // Portaled dialog forms are still React descendants of `#candidate-form`; stop bubbling submit.
    e.stopPropagation()
    await submitUniversity()
  }

  const handleCancel = () => {
    if (hasUnsavedChanges) {
      setShowUnsavedWarning(true)
      return
    }
    setFormData(initialFormData)
    setErrors({})
    setVerifiedFields(new Set())
    setModifiedFields(new Set())
    setOpen(false)
  }

  const handleDiscardChanges = () => {
    setShowUnsavedWarning(false)
    setFormData(initialFormData)
    setErrors({})
    setVerifiedFields(new Set())
    setModifiedFields(new Set())
    setOpen(false)
  }

  // Get dialog title based on mode and verification
  const getDialogTitle = () => {
    if (showVerification) {
      return "Verify University"
    }
    return mode === "edit" ? "Edit University" : "Create New University"
  }

  // Get submit button text based on mode and verification
  const getSubmitButtonText = () => {
    if (isLoading) {
      if (showVerification) return "Saving & Verifying..."
      return mode === "edit" ? "Updating..." : "Creating..."
    }
    if (showVerification) return "Update & Verify"
    return mode === "edit" ? "Update University" : "Create University"
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handleDialogClose}>
        {mode === "create" && controlledOpen === undefined && (
          <DialogTrigger asChild>
            {children || (
              <Button className="transition-all duration-200 ease-in-out hover:scale-105 hover:shadow-md cursor-pointer">
                <Plus className="h-4 w-4" />
                Create University
              </Button>
            )}
          </DialogTrigger>
        )}
        
        <DialogContent className="sm:max-w-[750px] lg:max-w-[850px] max-h-[90vh] flex flex-col p-0 [&>button]:cursor-pointer">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-border">
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2">
                {showVerification && <ShieldCheck className="size-5 text-primary" />}
                {getDialogTitle()}
              </DialogTitle>
            </div>
            
            {/* VERIFICATION_UI_DISABLED — verification progress bar */}
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 py-6">
            <form onSubmit={handleSubmit} className="space-y-4" id={formId}>
              
              {/* Basic Information Section */}
              <Collapsible 
                open={expandedSections.has("basic-info")} 
                onOpenChange={() => toggleSection("basic-info")}
              >
                <Card>
                  <CollapsibleTrigger asChild>
                    <div className="w-full text-left outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-t-xl">
                    <CardHeader className="cursor-pointer hover:bg-accent/50 transition-colors py-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base flex items-center gap-2">
                          <GraduationCap className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                          Basic Information
                          {showVerification && (
                            <SectionProgressBadge 
                              percentage={basicInfoProgress.percentage}
                              verified={basicInfoProgress.verified}
                              total={basicInfoProgress.total}
                            />
                          )}
                        </CardTitle>
                        <div className="flex items-center gap-2">
                          {showVerification && (
                            <div 
                              className="flex items-center gap-2" 
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Checkbox
                                id="verify-all-basic-info"
                                checked={isSectionFullyVerified("basic-info")}
                                onCheckedChange={(checked) => handleVerifyAllSection("basic-info", checked === true)}
                                className="h-4 w-4"
                              />
                              <Label 
                                htmlFor="verify-all-basic-info" 
                                className="text-xs text-muted-foreground cursor-pointer font-normal"
                              >
                                Verify All
                              </Label>
                            </div>
                          )}
                          {expandedSections.has("basic-info") ? (
                            <ChevronDown className="size-4 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="size-4 text-muted-foreground" />
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <CardContent className="pt-0">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="name">Name *</Label>
                          <Input
                            id="name"
                            type="text"
                            placeholder="Massachusetts Institute of Technology"
                            value={formData.name}
                            onChange={(e) => handleInputChange("name", e.target.value)}
                            className={errors.university?.name ? "border-red-500" : ""}
                          />
                          {errors.university?.name && <p className="text-sm text-red-500">{errors.university.name}</p>}
                          <VerificationCheckbox fieldName="name" />
                        </div>

                        <div className="space-y-2">
                          <Label>Country</Label>
                          <Popover open={countryPopoverOpen} onOpenChange={setCountryPopoverOpen}>
                            <PopoverTrigger asChild>
                              <Button
                                type="button"
                                variant="outline"
                                role="combobox"
                                aria-expanded={countryPopoverOpen}
                                className={cn(
                                  "w-full justify-between",
                                  !selectedCountryName && "text-muted-foreground",
                                  errors.university?.countryId && "border-red-500"
                                )}
                              >
                                {selectedCountryName ? (
                                  <span className="flex items-center gap-2">
                                    <MapPin className="h-4 w-4 shrink-0" />
                                    {selectedCountryName}
                                  </span>
                                ) : (
                                  "Select country..."
                                )}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                              <Command shouldFilter={false}>
                                <CommandInput
                                  placeholder="Search countries..."
                                  value={countrySearchQuery}
                                  onValueChange={setCountrySearchQuery}
                                />
                                <CommandList>
                                  {countriesLoading ? (
                                    <CommandEmpty>
                                      <div className="flex items-center justify-center gap-2 py-2">
                                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                        <span className="text-sm text-muted-foreground">Loading countries...</span>
                                      </div>
                                    </CommandEmpty>
                                  ) : filteredCountries.length === 0 ? (
                                    <>
                                      <CommandEmpty>
                                        {countrySearchQuery.trim() ? "No country found." : "No countries available."}
                                      </CommandEmpty>
                                      {countrySearchQuery.trim() && onCreateCountry && (
                                        <CommandGroup>
                                          <CommandItem
                                            value={`add-country-${countrySearchQuery.trim()}`}
                                            onSelect={async () => {
                                              const name = countrySearchQuery.trim()
                                              if (!name) return
                                              setCountryCreateInProgress(true)
                                              try {
                                                const newCountry = await onCreateCountry(name)
                                                if (newCountry) {
                                                  handleCountrySelect(newCountry)
                                                  setCountrySearchQuery("")
                                                }
                                              } finally {
                                                setCountryCreateInProgress(false)
                                              }
                                            }}
                                            disabled={countryCreateInProgress}
                                            className="flex items-center gap-2 font-medium text-primary cursor-pointer"
                                          >
                                            <Plus className="h-4 w-4" />
                                            {countryCreateInProgress ? "Adding…" : `Add "${countrySearchQuery.trim()}" as new country`}
                                          </CommandItem>
                                        </CommandGroup>
                                      )}
                                    </>
                                  ) : (
                                    <CommandGroup>
                                      {filteredCountries.map((country) => (
                                        <CommandItem
                                          key={country.id}
                                          value={String(country.id)}
                                          onSelect={() => handleCountrySelect(country)}
                                          className="flex items-center gap-2"
                                        >
                                          <Check
                                            className={cn(
                                              "h-4 w-4",
                                              formData.countryId === country.id ? "opacity-100" : "opacity-0"
                                            )}
                                          />
                                          {country.name}
                                        </CommandItem>
                                      ))}
                                      {countrySearchQuery.trim() && onCreateCountry && !filteredCountries.some((c) => c.name.toLowerCase() === countrySearchQuery.trim().toLowerCase()) && (
                                        <CommandItem
                                          value={`add-country-${countrySearchQuery.trim()}`}
                                          onSelect={async () => {
                                            const name = countrySearchQuery.trim()
                                            if (!name) return
                                            setCountryCreateInProgress(true)
                                            try {
                                              const newCountry = await onCreateCountry(name)
                                              if (newCountry) {
                                                handleCountrySelect(newCountry)
                                                setCountrySearchQuery("")
                                              }
                                            } finally {
                                              setCountryCreateInProgress(false)
                                            }
                                          }}
                                          disabled={countryCreateInProgress}
                                          className="flex items-center gap-2 font-medium text-primary cursor-pointer"
                                        >
                                          <Plus className="h-4 w-4" />
                                          {countryCreateInProgress ? "Adding…" : `Add "${name}" as new country`}
                                        </CommandItem>
                                      )}
                                    </CommandGroup>
                                  )}
                                </CommandList>
                              </Command>
                            </PopoverContent>
                          </Popover>
                          {errors.university?.countryId && (
                            <p className="text-sm text-red-500">{errors.university.countryId}</p>
                          )}
                          <VerificationCheckbox fieldName="country" />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="ranking">Ranking</Label>
                          <Select
                            value={
                              formData.ranking === ""
                                ? RANKING_SELECT_NONE
                                : formData.ranking
                            }
                            onValueChange={handleRankingChange}
                          >
                            <SelectTrigger className={errors.university?.ranking ? "border-red-500" : ""}>
                              <SelectValue placeholder="Select ranking" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value={RANKING_SELECT_NONE}>None</SelectItem>
                              {rankingOptions.map((ranking) => (
                                <SelectItem key={ranking.value} value={ranking.value}>
                                  {ranking.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {errors.university?.ranking && <p className="text-sm text-red-500">{errors.university.ranking}</p>}
                          <VerificationCheckbox fieldName="ranking" />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="websiteUrl">Website URL</Label>
                          <Input
                            id="websiteUrl"
                            type="url"
                            placeholder="https://www.university.edu"
                            value={formData.websiteUrl}
                            onChange={(e) => handleInputChange("websiteUrl", e.target.value)}
                            className={errors.university?.websiteUrl ? "border-red-500" : ""}
                          />
                          {errors.university?.websiteUrl && <p className="text-sm text-red-500">{errors.university.websiteUrl}</p>}
                          <VerificationCheckbox fieldName="websiteUrl" />
                        </div>

                        <div className="space-y-2 md:col-span-2">
                          <Label htmlFor="linkedinUrl">LinkedIn URL</Label>
                          <Input
                            id="linkedinUrl"
                            type="url"
                            placeholder="https://linkedin.com/school/university-name"
                            value={formData.linkedinUrl}
                            onChange={(e) => handleInputChange("linkedinUrl", e.target.value)}
                            className={errors.university?.linkedinUrl ? "border-red-500" : ""}
                          />
                          {errors.university?.linkedinUrl && <p className="text-sm text-red-500">{errors.university.linkedinUrl}</p>}
                          <VerificationCheckbox fieldName="linkedinUrl" />
                        </div>
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
              </Collapsible>

              {/* Campus Locations Section */}
              <Collapsible 
                open={expandedSections.has("locations")} 
                onOpenChange={() => toggleSection("locations")}
              >
                <div className="flex items-center gap-2">
                  <CollapsibleTrigger asChild className="flex-1">
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full justify-between cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <MapPin className="h-5 w-5 text-green-600 dark:text-green-400" />
                        <span className="text-lg font-medium">Campus Locations</span>
                        {formData.locations.length > 0 && (
                          <Badge variant="secondary" className="ml-2">
                            {formData.locations.length}
                          </Badge>
                        )}
                        {showVerification && (
                          <SectionProgressBadge 
                            percentage={locationsProgress.percentage}
                            verified={locationsProgress.verified}
                            total={locationsProgress.total}
                          />
                        )}
                      </div>
                      <ChevronDown
                        className={`h-4 w-4 transition-transform duration-200 ${
                          expandedSections.has("locations") ? "transform rotate-180" : ""
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
                        id="verify-all-locations"
                        checked={isSectionFullyVerified("locations")}
                        onCheckedChange={(checked) => handleVerifyAllSection("locations", checked === true)}
                        aria-label="Verify all fields in Campus Locations section"
                      />
                      <Label 
                        htmlFor="verify-all-locations"
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
                      onClick={addLocation}
                      className="flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="h-4 w-4" />
                      Add Campus
                    </Button>
                  </div>

              {formData.locations.map((location, index) => (
                <Card key={location.id} className="relative">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center justify-between text-base">
                      <span>Campus Location {index + 1}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeLocation(index)}
                        disabled={formData.locations.length <= 1}
                        className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label htmlFor={`city-${index}`}>City</Label>
                                <Input
                                  id={`city-${index}`}
                                  type="text"
                                  placeholder="Cambridge"
                                  value={location.city}
                                  onChange={(e) => handleLocationChange(index, "city", e.target.value)}
                                  className={errors.locations?.[index]?.city ? "border-red-500" : ""}
                                />
                                {errors.locations?.[index]?.city && (
                                  <p className="text-sm text-red-500">{errors.locations[index].city}</p>
                                )}
                                <VerificationCheckbox fieldName={`locations[${index}].city`} />
                              </div>

                              <div className="space-y-2">
                                <div className="flex items-center space-x-2 pt-6">
                                  <Switch
                                    id={`isMainCampus-${index}`}
                                    checked={location.isMainCampus}
                                    onCheckedChange={(checked) => handleLocationChange(index, "isMainCampus", !!checked)}
                                  />
                                  <Label htmlFor={`isMainCampus-${index}`} className="text-sm font-normal">
                                    Main Campus
                                  </Label>
                                </div>
                                {errors.locations?.[index]?.isMainCampus && (
                                  <p className="text-sm text-red-500">{errors.locations[index].isMainCampus}</p>
                                )}
                                <VerificationCheckbox fieldName={`locations[${index}].isMainCampus`} />
                              </div>

                              <div className="space-y-2 md:col-span-2">
                                <Label htmlFor={`address-${index}`}>Address</Label>
                                <Input
                                  id={`address-${index}`}
                                  type="text"
                                  placeholder="77 Massachusetts Avenue, Cambridge, MA 02139"
                                  value={location.address}
                                  onChange={(e) => handleLocationChange(index, "address", e.target.value)}
                                  className={errors.locations?.[index]?.address ? "border-red-500" : ""}
                                />
                                {errors.locations?.[index]?.address && (
                                  <p className="text-sm text-red-500">{errors.locations[index].address}</p>
                                )}
                                <VerificationCheckbox fieldName={`locations[${index}].address`} />
                              </div>
                            </div>
                  </CardContent>
                </Card>
              ))}
                </CollapsibleContent>
              </Collapsible>

            </form>
          </div>

          <DialogFooter className="px-6 py-4 border-t border-border gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isLoading}
              className="transition-all duration-150 ease-in-out hover:bg-accent hover:text-accent-foreground hover:border-accent cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="button"
              disabled={isLoading}
              onClick={() => void submitUniversity()}
              className="transition-all duration-200 ease-in-out hover:scale-[1.02] hover:shadow-sm cursor-pointer disabled:hover:scale-100 disabled:hover:shadow-none"
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {getSubmitButtonText()}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unsaved Changes Warning Dialog */}
      <AlertDialog open={showUnsavedWarning} onOpenChange={setShowUnsavedWarning}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved verification changes. Are you sure you want to close without saving?
              {modifiedFields.size > 0 && (
                <span className="block mt-2 text-sm">
                  <strong>{modifiedFields.size}</strong> field(s) modified
                </span>
              )}
              {verifiedFields.size > 0 && (
                <span className="block mt-1 text-sm">
                  <strong>{verifiedFields.size}</strong> field(s) marked as verified
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="cursor-pointer">Continue Editing</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDiscardChanges}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90 cursor-pointer"
            >
              Discard Changes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
