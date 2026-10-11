"use client"

import * as React from "react"
import { useState, useEffect, useMemo } from "react"
import {
  Building2,
  BuildingIcon,
  MapPinIcon,
  ExternalLink,
  EditIcon,
  Pencil,
  Check,
  Save,
  X,
  Loader2,
  ChevronsUpDown,
  ChevronDown,
  ChevronRight,
  MapPin,
  ShieldCheck,
  AlertTriangle,
  Plus,
  Trash2,
  CalendarIcon,
} from "lucide-react"

import {
  Employer,
  EmployerStatus,
  EmployerType,
  SalaryPolicy,
  SALARY_POLICY_DB_LABELS,
  SALARY_POLICY_DISPLAY_TO_DB,
  normalizeSalaryPolicy,
  EMPLOYER_STATUS_LABELS,
  EMPLOYER_TYPE_DB_LABELS,
  EMPLOYER_TYPE_DISPLAY_TO_DB,
  RANKING_DB_LABELS,
  RANKING_DISPLAY_TO_DB,
  WORK_MODE_DB_LABELS,
  SHIFT_TYPE_DB_LABELS,
  Layoff,
  LayoffReason,
  LAYOFF_REASON_LABELS,
  type EmployerTypeDb,
  type RankingDb,
  type WorkModeDb,
  type ShiftTypeDb,
  type SalaryPolicyDb,
} from "@/lib/types/employer"
import type { Country } from "@/lib/types/country"
import type { LookupItem } from "@/lib/services/lookups-api"
import { fetchEmployerById, employerDtoToEmployer, updateEmployer, buildUpdateEmployerDto } from "@/lib/services/employers-api"
import { EntityAuditFields } from "@/components/entity-audit-fields"
import type { EmployerLookups } from "@/components/employer-creation-dialog"
import { employerToFormData, type EmployerFormData } from "@/components/employer-creation-dialog"
import { MultiSelect, type MultiSelectOption } from "@/components/ui/multi-select"
import { buildTimeSupportZoneMultiSelectOptions } from "@/lib/utils/time-support-zone-lookup"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Switch } from "@/components/ui/switch"
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Separator } from "@/components/ui/separator"
import { VerificationBadge } from "@/components/ui/verification-badge"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { EmployerBenefit, normalizeEmployerBenefit } from "@/lib/types/benefits"
import { BenefitsSelector } from "@/components/ui/benefits-selector"
import { formatBenefitAmount } from "@/lib/utils/benefits"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { format } from "date-fns"

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

const validateYear = (year: string): string | null => {
  if (!year) return null // Optional field
  const yearNum = parseInt(year)
  if (isNaN(yearNum)) return 'Must be a valid year'
  if (yearNum < 1800 || yearNum > new Date().getFullYear()) {
    return `Year must be between 1800 and ${new Date().getFullYear()}`
  }
  return null
}

const validateName = (name: string): string | null => {
  if (!name || name.trim() === '') return 'Name is required'
  if (name.length < 2) return 'Name must be at least 2 characters'
  if (name.length > 100) return 'Name is too long'
  return null
}

// Status options
const statusOptions = Object.entries(EMPLOYER_STATUS_LABELS).map(([value, label]) => ({
  label,
  value: value as EmployerStatus
}))

const salaryPolicyOptions = (Object.entries(SALARY_POLICY_DB_LABELS) as [SalaryPolicyDb, string][]).map(
  ([value, label]) => ({ value, label })
)

function getEmployerSalaryPoliciesDb(employer: Employer): SalaryPolicyDb[] {
  return employer.salaryPolicies?.length ? [...employer.salaryPolicies] : []
}

function getEmployerWorkModesDb(employer: Employer): WorkModeDb[] {
  return employer.workModes?.length ? [...employer.workModes] : []
}

function getEmployerShiftTypesDb(employer: Employer): ShiftTypeDb[] {
  return employer.shiftTypes?.length ? [...employer.shiftTypes] : []
}

const workModeOptions = (Object.entries(WORK_MODE_DB_LABELS) as [WorkModeDb, string][]).map(
  ([value, label]) => ({ value, label })
)
const shiftTypeOptions = (Object.entries(SHIFT_TYPE_DB_LABELS) as [ShiftTypeDb, string][]).map(
  ([value, label]) => ({ value, label })
)
const rankingOptions = (Object.entries(RANKING_DB_LABELS) as [RankingDb, string][]).map(
  ([value, label]) => ({ value, label })
)
const employerTypeOptions: MultiSelectOption[] = (
  Object.entries(EMPLOYER_TYPE_DB_LABELS) as [EmployerTypeDb, string][]
).map(([value, label]) => ({ value, label }))

const EMPTY_COUNTRIES: Country[] = []

function isInlineFieldValueEmpty(value: string | number | null | undefined): boolean {
  if (value === null || value === undefined) return true
  const trimmed = String(value).trim()
  return trimmed === "" || trimmed === "—" || trimmed === "-"
}

function formatInlineFieldDisplayValue(value: string | number | null | undefined): string {
  if (isInlineFieldValueEmpty(value)) return "N/A"
  return String(value)
}

function formatEmployerDate(date: Date | undefined | null): string {
  if (!date || Number.isNaN(date.getTime())) return "N/A"
  return date.toLocaleDateString()
}

function getEmployerTypeDbList(employer: Employer): EmployerTypeDb[] {
  if (employer.employerTypes?.length) {
    return employer.employerTypes.filter((t) => t in EMPLOYER_TYPE_DB_LABELS)
  }
  if (employer.employerType && employer.employerType in EMPLOYER_TYPE_DISPLAY_TO_DB) {
    return [EMPLOYER_TYPE_DISPLAY_TO_DB[employer.employerType]]
  }
  return []
}

function arraysEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false
  const sortedA = [...a].sort()
  const sortedB = [...b].sort()
  return sortedA.every((val, idx) => val === sortedB[idx])
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
  const isVerified = verificationStatus === 'verified'
  
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
  
  const displayValue = formatInlineFieldDisplayValue(value)
  const isEmpty = isInlineFieldValueEmpty(value)
  
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
                  className={cn("text-sm", error && "border-red-500")}
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
        <div className="flex items-center justify-between">
          <span
            className={cn(
              "text-sm block",
              isEmpty && "text-muted-foreground italic"
            )}
          >
            {displayValue}
          </span>
        </div>
      )}
    </div>
  )
}

// Inline editable Select (shadcn Select — matches EmployerCreationDialog)
interface InlineEditableSelectFieldProps {
  label: string
  value: string
  fieldName: string
  options: { label: string; value: string }[]
  onSave: (fieldName: string, newValue: string, verify: boolean) => Promise<void>
  getFieldVerification?: (fieldName: string) => "verified" | "unverified" | undefined
  placeholder?: string
  className?: string
}

const InlineEditableSelectField: React.FC<InlineEditableSelectFieldProps> = ({
  label,
  value,
  fieldName,
  options,
  onSave,
  getFieldVerification,
  placeholder = "Select option...",
  className,
}) => {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(value)
  const [isSaving, setIsSaving] = useState(false)
  const [willVerify, setWillVerify] = useState(true)

  const displayLabel = value ? options.find((o) => o.value === value)?.label ?? value : ""
  const isEmpty = !value

  const handleEdit = () => {
    setIsEditing(true)
    setEditValue(value)
    setWillVerify(true)
  }

  const handleCancel = () => {
    setIsEditing(false)
    setEditValue(value)
    setWillVerify(true)
  }

  const handleSave = async () => {
    if (editValue === value) {
      setIsEditing(false)
      return
    }
    setIsSaving(true)
    try {
      await onSave(fieldName, editValue, willVerify)
      setIsEditing(false)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className={cn("min-w-0 space-y-1 py-2 px-3 rounded-md hover:bg-muted/50 transition-colors", className)}>
      <div className="flex items-center justify-between mb-1 gap-2">
        <Label className="text-sm font-medium text-muted-foreground truncate">{label}</Label>
        {!isEditing && (
          <div className="flex items-center gap-1 shrink-0">
            <VerificationBadge status={getFieldVerification?.(fieldName) || "unverified"} size="sm" />
            <Button size="sm" variant="ghost" onClick={handleEdit} className="h-6 w-6 p-0" type="button" title="Edit field">
              <Pencil className="w-3.5 h-3.5" />
            </Button>
          </div>
        )}
      </div>
      {isEditing ? (
        <div className="min-w-0 space-y-2">
          <Select value={editValue || undefined} onValueChange={setEditValue} disabled={isSaving}>
            <SelectTrigger className="w-full min-w-0">
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
              {options.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 pl-1 min-w-0">
              <Checkbox id={`verify-${fieldName}`} checked={willVerify} onCheckedChange={(c) => setWillVerify(c as boolean)} disabled={isSaving} className="h-4 w-4 shrink-0" />
              <Label htmlFor={`verify-${fieldName}`} className={cn("text-xs cursor-pointer truncate", willVerify ? "text-green-600 dark:text-green-400 font-medium" : "text-muted-foreground")}>
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
        <span className={cn("text-sm block truncate", isEmpty && "text-muted-foreground italic")} title={isEmpty ? undefined : displayLabel}>
          {isEmpty ? "N/A" : displayLabel}
        </span>
      )}
    </div>
  )
}

// Inline editable MultiSelect (tags, time zones, employer types)
interface InlineEditableMultiSelectFieldProps {
  label: string
  selected: string[]
  fieldName: string
  items: MultiSelectOption[]
  onSave: (fieldName: string, newValue: string[], verify: boolean) => Promise<void>
  getFieldVerification?: (fieldName: string) => "verified" | "unverified" | undefined
  placeholder?: string
  searchPlaceholder?: string
  maxDisplay?: number
  creatable?: boolean
  createLabel?: string
  onCreateNew?: (name: string) => Promise<void>
  className?: string
}

const InlineEditableMultiSelectField: React.FC<InlineEditableMultiSelectFieldProps> = ({
  label,
  selected,
  fieldName,
  items,
  onSave,
  getFieldVerification,
  placeholder = "Select...",
  searchPlaceholder = "Search...",
  maxDisplay = 3,
  creatable = false,
  createLabel,
  onCreateNew,
  className,
}) => {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState<string[]>(selected)
  const [isSaving, setIsSaving] = useState(false)
  const [willVerify, setWillVerify] = useState(true)

  const handleEdit = () => {
    setIsEditing(true)
    setEditValue(selected)
    setWillVerify(true)
  }

  const handleCancel = () => {
    setIsEditing(false)
    setEditValue(selected)
    setWillVerify(true)
  }

  const handleSave = async () => {
    if (arraysEqual(editValue, selected)) {
      setIsEditing(false)
      return
    }
    setIsSaving(true)
    try {
      await onSave(fieldName, editValue, willVerify)
      setIsEditing(false)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className={cn("space-y-1 py-2 px-3 rounded-md hover:bg-muted/50 transition-colors", className)}>
      <div className="flex items-center justify-between mb-1">
        <Label className="text-sm font-medium text-muted-foreground">{label}</Label>
        {!isEditing && (
          <div className="flex items-center gap-1 shrink-0">
            <VerificationBadge status={getFieldVerification?.(fieldName) || "unverified"} size="sm" />
            <Button size="sm" variant="ghost" onClick={handleEdit} className="h-6 w-6 p-0" type="button" title="Edit field">
              <Pencil className="w-3.5 h-3.5" />
            </Button>
          </div>
        )}
      </div>
      {isEditing ? (
        <div className="space-y-2">
          <div className="flex items-start gap-2">
            <div className="flex-1 space-y-2">
              <MultiSelect
                items={items}
                selected={editValue}
                onChange={setEditValue}
                placeholder={placeholder}
                searchPlaceholder={searchPlaceholder}
                maxDisplay={maxDisplay}
                creatable={creatable}
                createLabel={createLabel}
                onCreateNew={onCreateNew}
              />
              <div className="flex items-center gap-2 pl-1">
                <Checkbox id={`verify-${fieldName}`} checked={willVerify} onCheckedChange={(c) => setWillVerify(c as boolean)} disabled={isSaving} className="h-4 w-4" />
                <Label htmlFor={`verify-${fieldName}`} className={cn("text-xs cursor-pointer", willVerify ? "text-green-600 dark:text-green-400 font-medium" : "text-muted-foreground")}>
                  {willVerify ? "✓ Verified" : "Mark as verified"}
                </Label>
              </div>
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
      ) : selected.length === 0 ? (
        <span className="text-sm block text-muted-foreground italic">N/A</span>
      ) : (
        <div className="flex flex-wrap gap-2">
          {selected.map((item) => (
            <Badge key={item} variant="secondary" className="text-xs">
              {items.find((i) => i.value === item)?.label ?? item}
            </Badge>
          ))}
        </div>
      )}
    </div>
  )
}

// Location country combobox (saves country name — matches EmployerCreationDialog)
interface InlineEditableLocationCountryFieldProps {
  label: string
  countryName: string
  fieldName: string
  countries?: Country[]
  countriesLoading?: boolean
  onCreateCountry?: (name: string) => Promise<Country | null>
  onSave: (countryName: string, verify: boolean) => Promise<void>
  getFieldVerification?: (fieldName: string) => "verified" | "unverified" | undefined
  className?: string
}

const InlineEditableLocationCountryField: React.FC<InlineEditableLocationCountryFieldProps> = ({
  label,
  countryName,
  fieldName,
  countries = EMPTY_COUNTRIES,
  countriesLoading = false,
  onCreateCountry,
  onSave,
  getFieldVerification,
  className,
}) => {
  const [isEditing, setIsEditing] = useState(false)
  const [editCountryName, setEditCountryName] = useState(countryName)
  const [isSaving, setIsSaving] = useState(false)
  const [willVerify, setWillVerify] = useState(true)
  const [countryPopoverOpen, setCountryPopoverOpen] = useState(false)
  const [countrySearchQuery, setCountrySearchQuery] = useState("")
  const [countryCreateInProgress, setCountryCreateInProgress] = useState(false)

  const filteredCountries = useMemo(() => {
    if (!countrySearchQuery.trim()) return countries
    const q = countrySearchQuery.toLowerCase().trim()
    return countries.filter((c) => c.name.toLowerCase().includes(q))
  }, [countries, countrySearchQuery])

  const isEmpty = isInlineFieldValueEmpty(countryName)

  const handleEdit = () => {
    setIsEditing(true)
    setEditCountryName(countryName)
    setWillVerify(true)
    setCountrySearchQuery("")
    setCountryPopoverOpen(false)
  }

  const handleCancel = () => {
    setIsEditing(false)
    setEditCountryName(countryName)
    setWillVerify(true)
    setCountryPopoverOpen(false)
  }

  const handleCountrySelect = (country: Country) => {
    setEditCountryName(country.name)
    setCountryPopoverOpen(false)
    setCountrySearchQuery("")
  }

  const handleSave = async () => {
    if (editCountryName.trim() === countryName.trim()) {
      setIsEditing(false)
      return
    }
    setIsSaving(true)
    try {
      await onSave(editCountryName.trim(), willVerify)
      setIsEditing(false)
    } catch {
      setEditCountryName(countryName)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className={cn("space-y-1 py-2 px-3 rounded-md hover:bg-muted/50 transition-colors", className)}>
      <div className="flex items-center justify-between mb-1">
        <Label className="text-sm font-medium text-muted-foreground">{label}</Label>
        {!isEditing && (
          <div className="flex items-center gap-1 shrink-0">
            <VerificationBadge status={getFieldVerification?.(fieldName) || "unverified"} size="sm" />
            <Button size="sm" variant="ghost" onClick={handleEdit} className="h-6 w-6 p-0" type="button" title="Edit field">
              <Pencil className="w-3.5 h-3.5" />
            </Button>
          </div>
        )}
      </div>
      {isEditing ? (
        <div className="space-y-2">
          <div className="flex items-start gap-2">
            <div className="flex-1 space-y-2">
              <Popover open={countryPopoverOpen} onOpenChange={setCountryPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button type="button" variant="outline" role="combobox" disabled={isSaving} className={cn("w-full justify-between", !editCountryName && "text-muted-foreground")}>
                    {editCountryName ? (
                      <span className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 shrink-0" />
                        {editCountryName}
                      </span>
                    ) : (
                      "Select country..."
                    )}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                  <Command shouldFilter={false}>
                    <CommandInput placeholder="Search countries..." value={countrySearchQuery} onValueChange={setCountrySearchQuery} />
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
                          <CommandEmpty>{countrySearchQuery.trim() ? "No country found." : "No countries available."}</CommandEmpty>
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
                                    if (newCountry) handleCountrySelect(newCountry)
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
                            <CommandItem key={country.id} value={String(country.id)} onSelect={() => handleCountrySelect(country)} className="flex items-center gap-2 cursor-pointer">
                              <Check className={cn("h-4 w-4", editCountryName === country.name ? "opacity-100" : "opacity-0")} />
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
                                  if (newCountry) handleCountrySelect(newCountry)
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
                          )}
                        </CommandGroup>
                      )}
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              <div className="flex items-center gap-2 pl-1">
                <Checkbox id={`verify-${fieldName}`} checked={willVerify} onCheckedChange={(c) => setWillVerify(c as boolean)} disabled={isSaving} className="h-4 w-4" />
                <Label htmlFor={`verify-${fieldName}`} className={cn("text-xs cursor-pointer", willVerify ? "text-green-600 dark:text-green-400 font-medium" : "text-muted-foreground")}>
                  {willVerify ? "✓ Verified" : "Mark as verified"}
                </Label>
              </div>
            </div>
            <div className="flex gap-1 shrink-0">
              <Button size="sm" onClick={handleSave} disabled={isSaving || !editCountryName.trim()} className="h-8 w-8 p-0">
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
          {formatInlineFieldDisplayValue(countryName)}
        </span>
      )}
    </div>
  )
}

// Inline Editable Benefits Component
interface InlineEditableBenefitsProps {
  label: string
  value: EmployerBenefit[]
  fieldName: string
  onSave: (fieldName: string, newValue: EmployerBenefit[], shouldVerify: boolean) => Promise<void>
  getFieldVerification?: (fieldName: string) => 'verified' | 'unverified' | undefined
  className?: string
  maxDisplay?: number
  benefitOptions?: LookupItem[]
  onCreateBenefit?: (name: string) => Promise<EmployerBenefit | null | void>
}

const InlineEditableBenefits: React.FC<InlineEditableBenefitsProps> = ({
  label,
  value,
  fieldName,
  onSave,
  getFieldVerification,
  className = "",
  maxDisplay = 4,
  benefitOptions = [],
  onCreateBenefit,
}) => {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState<EmployerBenefit[]>(value || [])
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
      currentValue.every((val, idx) => 
        val.id === editValue[idx]?.id && 
        val.name === editValue[idx]?.name &&
        val.hasValue === editValue[idx]?.hasValue &&
        val.amount === editValue[idx]?.amount &&
        val.unit === editValue[idx]?.unit
      )
    
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
            <BenefitsSelector
              benefits={editValue}
              benefitOptions={benefitOptions}
              onCreateBenefit={
                onCreateBenefit
                  ? async (name) => {
                      const added = await onCreateBenefit(name)
                      if (added) setEditValue((prev) => [...prev, added])
                      return added ?? undefined
                    }
                  : undefined
              }
              onChange={(benefits) => setEditValue(benefits)}
              hideLabel
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
              {willVerify ? '✓ Verified' : 'Mark as verified'}
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

  // Display mode
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
            title={`Edit ${label.toLowerCase()}`}
          >
            <Pencil className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
      {displayItems.length > 0 ? (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2 min-h-[2rem]">
            {displayItemsToShow.map((benefit, index) => (
              <Badge 
                key={benefit.id || index} 
                variant="outline" 
                className="text-xs bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-900/30 dark:text-slate-300 dark:border-slate-800"
              >
                {benefit.name}
                {benefit.hasValue && benefit.amount != null && benefit.unit && (
                  <span className="ml-1 font-semibold">
                    : {formatBenefitAmount(benefit.amount, benefit.unit)}
                  </span>
                )}
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
                Show {remainingCount} more
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
        </div>
      ) : (
        <span className="text-sm block text-muted-foreground italic">N/A</span>
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
  className,
  description
}) => {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(value)
  const [isSaving, setIsSaving] = useState(false)
  const [willVerify, setWillVerify] = useState(true)
  
  const verificationStatus = getFieldVerification?.(fieldName)
  const isCurrentlyVerified = verificationStatus === 'verified'
  
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
  }
  
  const handleCancel = () => {
    setIsEditing(false)
    setEditValue(value)
    setWillVerify(isCurrentlyVerified)
  }
  
  const handleSave = async () => {
    // No change check
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
      // Error handling - revert on error
      setEditValue(value)
      setWillVerify(isCurrentlyVerified)
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
              {/* Headquarters Checkbox */}
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
          </div>
        </div>
      )}
    </div>
  )
}

// Inline Editable Switch Component
interface InlineEditableSwitchProps {
  label: string
  value: boolean
  fieldName: string
  onSave: (fieldName: string, newValue: boolean, verify: boolean) => Promise<void>
  getFieldVerification?: (fieldName: string) => 'verified' | 'unverified' | undefined
  className?: string
  description?: string
}

const InlineEditableSwitch: React.FC<InlineEditableSwitchProps> = ({
  label,
  value,
  fieldName,
  onSave,
  getFieldVerification,
  className,
  description
}) => {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(value)
  const [isSaving, setIsSaving] = useState(false)
  const [willVerify, setWillVerify] = useState(true)
  
  const verificationStatus = getFieldVerification?.(fieldName)
  const isCurrentlyVerified = verificationStatus === 'verified'
  
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
  }
  
  const handleCancel = () => {
    setIsEditing(false)
    setEditValue(value)
    setWillVerify(isCurrentlyVerified)
  }
  
  const handleSave = async () => {
    // No change check
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
      // Error handling - revert on error
      setEditValue(value)
      setWillVerify(isCurrentlyVerified)
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
              {/* Switch */}
              <div className="flex items-center gap-2 pl-1">
                <Switch
                  id={`switch-${fieldName}`}
                  checked={editValue}
                  onCheckedChange={(checked) => setEditValue(checked)}
                  disabled={isSaving}
                />
                <Label 
                  htmlFor={`switch-${fieldName}`}
                  className="text-sm font-medium cursor-pointer"
                >
                  {label}
                </Label>
              </div>
              
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
          </div>
        </div>
      )}
    </div>
  )
}

// Employer Detail Modal Component
export interface EmployerDetailsModalProps {
  employer: Employer
  open: boolean
  onOpenChange: (open: boolean) => void
  onEdit?: (employer: Employer) => void
  countries?: Country[]
  countriesLoading?: boolean
  onCreateCountry?: (name: string) => Promise<Country | null>
  lookups?: EmployerLookups
  onCreateTimeSupportZone?: (name: string) => Promise<void>
  onCreateAward?: (name: string) => Promise<void>
  onCreateBenefit?: (name: string) => Promise<EmployerBenefit | null | void>
}

const getEmployerBenefits = (employer: Employer): EmployerBenefit[] => {
  if (!employer.benefits?.length) return []
  return employer.benefits.map((b) => normalizeEmployerBenefit(b))
}

export function EmployerDetailsModal({
  employer,
  open,
  onOpenChange,
  onEdit,
  countries = EMPTY_COUNTRIES,
  countriesLoading = false,
  onCreateCountry,
  lookups,
  onCreateTimeSupportZone,
  onCreateAward,
  onCreateBenefit,
}: EmployerDetailsModalProps) {
  const [localEmployer, setLocalEmployer] = useState<Employer>(employer)
  const [detailLoading, setDetailLoading] = useState(false)

  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(["basic", "locations", "layoffs"]))

  const [layoffs, setLayoffs] = useState<Layoff[]>(employer.layoffs || [])
  const [isLayoffFormOpen, setIsLayoffFormOpen] = useState(false)
  const [editingLayoff, setEditingLayoff] = useState<Layoff | null>(null)

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [locationToDelete, setLocationToDelete] = useState<{
    locationId: string
    locationName: string
  } | null>(null)

  const timeSupportZoneOptions: MultiSelectOption[] = useMemo(
    () =>
      buildTimeSupportZoneMultiSelectOptions(
        lookups?.timeSupportZones ?? [],
        localEmployer.timeSupportZones ?? [],
      ),
    [lookups?.timeSupportZones, localEmployer.timeSupportZones],
  )
  const awardOptions: MultiSelectOption[] = useMemo(
    () => lookups?.awards?.map((a) => ({ value: a.name, label: a.name })) ?? [],
    [lookups?.awards]
  )

  useEffect(() => {
    if (!open || !employer?.id) {
      setDetailLoading(false)
      return
    }

    setLocalEmployer(employer)
    setLayoffs(employer.layoffs || [])

    let cancelled = false
    setDetailLoading(true)

    fetchEmployerById(Number(employer.id))
      .then((dto) => {
        if (!cancelled) {
          const full = employerDtoToEmployer(dto)
          setLocalEmployer(full)
          setLayoffs(full.layoffs || [])
        }
      })
      .catch((err) => {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : String(err)
          if (message === "Not found") toast.error("Employer not found.")
          else toast.error(message || "Failed to load employer details.")
        }
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [open, employer])
  
  // Toggle section
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

  // Helper to get verification status for a field (placeholder for now)
  const getFieldVerification = (fieldName: string): 'verified' | 'unverified' | undefined => {
    // TODO: Implement verification system for employers
    return undefined
  }
  
  // Verification indicator component
  const VerificationIndicator = ({ 
    fieldName: fName
  }: { 
    fieldName: string
  }) => {
    const verification = getFieldVerification(fName)
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
  
  // Handle field save
  const handleFieldSave = async (fieldName: string, newValue: string | number | boolean | null, verify: boolean) => {
    try {
      // Optimistic update
      setLocalEmployer(prev => ({
        ...prev,
        [fieldName]: newValue === "" ? null : newValue
      }))
      
      // TODO: API call to save field
      // await updateEmployerField(employer.id, fieldName, newValue, verify)
      
      toast.success(`${fieldName} updated${verify ? ' and verified' : ''}`)
    } catch (error) {
      // Revert on error
      setLocalEmployer(employer)
      toast.error('Failed to save field')
      throw error
    }
  }
  
  // Handle location field save
  const handleLocationFieldSave = async (locationId: string, fieldName: string, newValue: string | number | boolean | null, verify: boolean) => {
    try {
      // Optimistic update
      setLocalEmployer(prev => ({
        ...prev,
        locations: prev.locations.map(loc => 
          loc.id === locationId 
            ? { ...loc, [fieldName]: newValue === "" ? null : newValue }
            : loc
        )
      }))
      
      // TODO: API call to save location field
      // await updateLocationField(locationId, fieldName, newValue, verify)
      
      toast.success(`${fieldName} updated${verify ? ' and verified' : ''}`)
    } catch (error) {
      // Revert on error
      setLocalEmployer(employer)
      toast.error('Failed to save field')
      throw error
    }
  }
  
  const handleArrayFieldSave = async (fieldName: string, newValue: string[], verify: boolean) => {
    try {
      setLocalEmployer((prev) => ({
        ...prev,
        [fieldName]: newValue,
      }))
      toast.success(`${fieldName} updated${verify ? " and verified" : ""}`)
    } catch (error) {
      setLocalEmployer(employer)
      toast.error("Failed to save field")
      throw error
    }
  }

  const handleAwardsSave = async (_fieldName: string, newValue: string[], verify: boolean) => {
    const previous = localEmployer
    try {
      setLocalEmployer((prev) => ({
        ...prev,
        awards: newValue,
      }))
      const formData = {
        ...employerToFormData(localEmployer),
        awards: newValue,
      }
      const dto = buildUpdateEmployerDto(formData, {
        timeSupportZonesLookup: lookups?.timeSupportZones ?? [],
        awardsLookup: lookups?.awards ?? [],
      })
      const saved = employerDtoToEmployer(await updateEmployer(Number(localEmployer.id), dto))
      setLocalEmployer((prev) => ({
        ...prev,
        createdBy: saved.createdBy ?? null,
        updatedBy: saved.updatedBy ?? null,
      }))
      toast.success(`Awards updated${verify ? " and verified" : ""}`)
    } catch (error) {
      setLocalEmployer(previous)
      toast.error(error instanceof Error ? error.message : "Failed to save awards")
      throw error
    }
  }

  const handleEmployerTypesSave = async (fieldName: string, types: string[], verify: boolean) => {
    try {
      const employerTypes = types as EmployerTypeDb[]
      const primaryType: EmployerType | undefined = employerTypes[0]
        ? (EMPLOYER_TYPE_DB_LABELS[employerTypes[0]] as EmployerType)
        : undefined
      setLocalEmployer((prev) => ({
        ...prev,
        employerTypes,
        ...(primaryType ? { employerType: primaryType } : {}),
      }))
      toast.success(`${fieldName} updated${verify ? " and verified" : ""}`)
    } catch (error) {
      setLocalEmployer(employer)
      toast.error("Failed to save field")
      throw error
    }
  }

  const handleRankingSave = async (fieldName: string, rankingDb: string, verify: boolean) => {
    try {
      const ranking = rankingDb ? RANKING_DB_LABELS[rankingDb as RankingDb] : localEmployer.ranking
      setLocalEmployer((prev) => ({
        ...prev,
        ranking,
      }))
      toast.success(`${fieldName} updated${verify ? " and verified" : ""}`)
    } catch (error) {
      setLocalEmployer(employer)
      toast.error("Failed to save field")
      throw error
    }
  }

  const persistEmployerUpdate = async (
    patch: Partial<EmployerFormData>,
    successLabel: string,
    verify: boolean,
  ) => {
    const previous = localEmployer
    try {
      const formData = { ...employerToFormData(localEmployer), ...patch }
      const dto = buildUpdateEmployerDto(formData, {
        timeSupportZonesLookup: lookups?.timeSupportZones ?? [],
        awardsLookup: lookups?.awards ?? [],
      })
      const saved = employerDtoToEmployer(await updateEmployer(Number(localEmployer.id), dto))
      setLocalEmployer((prev) => ({
        ...prev,
        createdBy: saved.createdBy ?? null,
        updatedBy: saved.updatedBy ?? null,
      }))
      toast.success(`${successLabel} updated${verify ? " and verified" : ""}`)
    } catch (error) {
      setLocalEmployer(previous)
      toast.error(error instanceof Error ? error.message : `Failed to save ${successLabel.toLowerCase()}`)
      throw error
    }
  }

  const handleWorkModesSave = async (_fieldName: string, modes: string[], verify: boolean) => {
    const workModes = modes as WorkModeDb[]
    const previous = localEmployer
    setLocalEmployer((prev) => ({ ...prev, workModes }))
    await persistEmployerUpdate({ workModes }, "Work modes", verify).catch(() => {
      setLocalEmployer(previous)
    })
  }

  const handleShiftTypesSave = async (_fieldName: string, types: string[], verify: boolean) => {
    const shiftTypes = types as ShiftTypeDb[]
    const previous = localEmployer
    setLocalEmployer((prev) => ({ ...prev, shiftTypes }))
    await persistEmployerUpdate({ shiftTypes }, "Shift types", verify).catch(() => {
      setLocalEmployer(previous)
    })
  }

  const handleSalaryPoliciesSave = async (_fieldName: string, policies: string[], verify: boolean) => {
    const salaryPolicies = policies as SalaryPolicyDb[]
    const previous = localEmployer
    setLocalEmployer((prev) => ({ ...prev, salaryPolicies }))
    await persistEmployerUpdate({ salaryPolicies }, "Salary policies", verify).catch(() => {
      setLocalEmployer(previous)
    })
  }

  const handleHeadcountSave = async (
    fieldName: "headcount",
    newValue: string | number,
    verify: boolean
  ) => {
    try {
      const parsed =
        newValue === "" || newValue === null
          ? null
          : typeof newValue === "number"
            ? newValue
            : parseInt(String(newValue), 10)
      if (parsed != null && (Number.isNaN(parsed) || parsed < 1)) {
        toast.error("Headcount must be an integer of at least 1")
        throw new Error("Invalid headcount")
      }
      setLocalEmployer((prev) => ({
        ...prev,
        headcount: parsed,
      }))
      toast.success(`Headcount updated${verify ? " and verified" : ""}`)
    } catch (error) {
      setLocalEmployer(employer)
      if (!(error instanceof Error && error.message === "Invalid headcount")) {
        toast.error("Failed to save field")
      }
      throw error
    }
  }

  // Handle benefits field save
  const handleBenefitsFieldSave = async (fieldName: string, newValue: EmployerBenefit[], verify: boolean) => {
    try {
      // Optimistic update
      setLocalEmployer(prev => ({
        ...prev,
        [fieldName]: newValue
      }))
      
      // TODO: API call to save field
      // await updateEmployerField(employer.id, fieldName, newValue, verify)
      
      toast.success(`${fieldName} updated${verify ? ' and verified' : ''}`)
    } catch (error) {
      // Revert on error
      setLocalEmployer(employer)
      toast.error('Failed to save field')
      throw error
    }
  }
  
  // Handle layoff save (add or update)
  const handleLayoffSave = async (layoffData: Omit<Layoff, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      if (editingLayoff) {
        // Update existing layoff
        const updatedLayoff: Layoff = {
          ...editingLayoff,
          ...layoffData,
          updatedAt: new Date()
        }
        const updatedLayoffs = layoffs.map(l => l.id === editingLayoff.id ? updatedLayoff : l)
        setLayoffs(updatedLayoffs)
        setLocalEmployer(prev => ({
          ...prev,
          layoffs: updatedLayoffs
        }))
        toast.success('Layoff updated')
      } else {
        // Add new layoff
        const newLayoff: Layoff = {
          id: `layoff-${Date.now()}`,
          ...layoffData,
          employerId: localEmployer.id,
          createdAt: new Date(),
          updatedAt: new Date()
        }
        const updatedLayoffs = [...layoffs, newLayoff]
        setLayoffs(updatedLayoffs)
        setLocalEmployer(prev => ({
          ...prev,
          layoffs: updatedLayoffs
        }))
        toast.success('Layoff added')
      }
      
      // TODO: API call to save layoff
      // await saveLayoff(localEmployer.id, layoffData)
      
      setIsLayoffFormOpen(false)
      setEditingLayoff(null)
    } catch (error) {
      toast.error('Failed to save layoff')
      throw error
    }
  }
  
  // Handle layoff delete
  const handleDeleteLayoff = async (layoffId: string) => {
    try {
      const updatedLayoffs = layoffs.filter(l => l.id !== layoffId)
      setLayoffs(updatedLayoffs)
      setLocalEmployer(prev => ({
        ...prev,
        layoffs: updatedLayoffs
      }))
      
      // TODO: API call to delete layoff
      // await deleteLayoff(localEmployer.id, layoffId)
      
      toast.success('Layoff deleted')
    } catch (error) {
      toast.error('Failed to delete layoff')
    }
  }

  // Handle location deletion - show confirmation dialog
  const handleDeleteLocation = (locationId: string) => {
    const location = localEmployer.locations.find(loc => loc.id === locationId)
    if (!location) return
    
    // Create a descriptive name for the location
    const locationName = location.city && location.country
      ? `${location.city}, ${location.country}`
      : location.city || location.country || 'Location'
    
    setLocationToDelete({
      locationId,
      locationName
    })
    setDeleteDialogOpen(true)
  }

  // Handle delete confirmation
  const handleDeleteConfirm = async () => {
    if (!locationToDelete) return
    
    try {
      // Optimistic update
      const updatedLocations = localEmployer.locations.filter(
        loc => loc.id !== locationToDelete.locationId
      )
      setLocalEmployer(prev => ({
        ...prev,
        locations: updatedLocations
      }))
      
      // TODO: API call to delete location
      // await deleteLocation(localEmployer.id, locationToDelete.locationId)
      
      toast.success(`Location "${locationToDelete.locationName}" deleted successfully`)
      
      // Close dialog and reset state
      setDeleteDialogOpen(false)
      setLocationToDelete(null)
    } catch (error) {
      toast.error('Failed to delete location. Please try again.')
      console.error('Error deleting location:', error)
      setDeleteDialogOpen(false)
      setLocationToDelete(null)
    }
  }

  // Handle delete cancellation
  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false)
    setLocationToDelete(null)
  }
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] lg:max-w-[800px] max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border">
          <div className="flex items-start justify-between">
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Building2 className="h-5 w-5 text-blue-600" />
              {localEmployer.name}
            </DialogTitle>
            <div className="flex gap-2 mr-8">
              {onEdit && (
                <Button 
                  variant="default" 
                  size="sm" 
                  onClick={() => {
                    onEdit(localEmployer)
                    onOpenChange(false)
                  }}
                  className="gap-1.5"
                >
                  <ShieldCheck className="size-4" />
                  Edit & Verify
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          {detailLoading ? (
            <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              Loading employer details…
            </div>
          ) : (
          <>
          {/* Basic Information Section */}
          <Collapsible 
            open={expandedSections.has("basic")} 
            onOpenChange={() => toggleSection("basic")}
          >
            <Card>
              <CollapsibleTrigger className="w-full">
                <CardHeader className="cursor-pointer hover:bg-accent/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Building2 className="size-5" />
                      Basic Information
                    </CardTitle>
                    {expandedSections.has("basic") ? (
                      <ChevronDown className="size-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="size-4 text-muted-foreground" />
                    )}
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="space-y-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
                    <InlineEditField
                      label="Company Name"
                      value={localEmployer.name}
                      fieldName="name"
                      fieldType="text"
                      validation={validateName}
                      onSave={handleFieldSave}
                      placeholder="Enter company name"
                      getFieldVerification={getFieldVerification}
                    />
                    
                    <InlineEditField
                      label="Status"
                      value={localEmployer.status ?? ""}
                      fieldName="status"
                      fieldType="select"
                      options={statusOptions}
                      onSave={handleFieldSave}
                      getFieldVerification={getFieldVerification}
                    />
                    
                    <div className="space-y-2">
                      <InlineEditField
                        label="Founded Year"
                        value={localEmployer.foundedYear || ""}
                        fieldName="foundedYear"
                        fieldType="number"
                        validation={validateYear}
                        onSave={async (fieldName, newValue, verify) => {
                          const yearValue = newValue && String(newValue).trim() ? parseInt(String(newValue)) : null
                          await handleFieldSave(fieldName, yearValue, verify)
                        }}
                        placeholder="e.g., 2019"
                        getFieldVerification={getFieldVerification}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <InlineEditField
                        label="Website"
                        value={localEmployer.websiteUrl || ""}
                        fieldName="websiteUrl"
                        fieldType="url"
                        validation={validateURL}
                        onSave={handleFieldSave}
                        placeholder="https://example.com"
                        getFieldVerification={getFieldVerification}
                      />
                      {localEmployer.websiteUrl && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => localEmployer.websiteUrl && window.open(localEmployer.websiteUrl, '_blank')}
                          className="h-7 text-xs"
                        >
                          <ExternalLink className="h-3 w-3 mr-1" />
                          Visit Website
                        </Button>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <InlineEditField
                        label="LinkedIn"
                        value={localEmployer.linkedinUrl || ""}
                        fieldName="linkedinUrl"
                        fieldType="url"
                        validation={validateURL}
                        onSave={handleFieldSave}
                        placeholder="https://linkedin.com/company/example"
                        getFieldVerification={getFieldVerification}
                      />
                      {localEmployer.linkedinUrl && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => localEmployer.linkedinUrl && window.open(localEmployer.linkedinUrl, '_blank')}
                          className="h-7 text-xs"
                        >
                          <ExternalLink className="h-3 w-3 mr-1" />
                          Visit LinkedIn
                        </Button>
                      )}
                    </div>
                    
                    <InlineEditableMultiSelectField
                      label="Type"
                      selected={getEmployerTypeDbList(localEmployer)}
                      fieldName="employerTypes"
                      items={employerTypeOptions}
                      onSave={handleEmployerTypesSave}
                      getFieldVerification={getFieldVerification}
                      placeholder="Select employer types..."
                      searchPlaceholder="Search types..."
                      maxDisplay={3}
                    />

                    <InlineEditableSelectField
                      label="Ranking"
                      value={localEmployer.ranking ? RANKING_DISPLAY_TO_DB[localEmployer.ranking] : ""}
                      fieldName="ranking"
                      options={rankingOptions}
                      onSave={handleRankingSave}
                      getFieldVerification={getFieldVerification}
                      placeholder="Select ranking"
                    />

                    <InlineEditField
                      label="Headcount"
                      value={localEmployer.headcount ?? ""}
                      fieldName="headcount"
                      fieldType="number"
                      onSave={async (fieldName, newValue, verify) => {
                        await handleHeadcountSave("headcount", newValue, verify)
                      }}
                      placeholder="e.g., 200"
                      getFieldVerification={getFieldVerification}
                    />

                    <InlineEditableMultiSelectField
                      label="Work Mode"
                      selected={getEmployerWorkModesDb(localEmployer)}
                      fieldName="workModes"
                      items={workModeOptions}
                      onSave={handleWorkModesSave}
                      getFieldVerification={getFieldVerification}
                      placeholder="Select work modes..."
                      searchPlaceholder="Search work modes..."
                      maxDisplay={3}
                    />

                    <InlineEditableMultiSelectField
                      label="Shift Type"
                      selected={getEmployerShiftTypesDb(localEmployer)}
                      fieldName="shiftTypes"
                      items={shiftTypeOptions}
                      onSave={handleShiftTypesSave}
                      getFieldVerification={getFieldVerification}
                      placeholder="Select shift types..."
                      searchPlaceholder="Search shift types..."
                      maxDisplay={3}
                    />

                    <InlineEditableMultiSelectField
                      label="Time Support Zones"
                      selected={localEmployer.timeSupportZones ?? []}
                      fieldName="timeSupportZones"
                      items={timeSupportZoneOptions}
                      onSave={handleArrayFieldSave}
                      getFieldVerification={getFieldVerification}
                      placeholder="Select time zones..."
                      searchPlaceholder="Search time zones..."
                      maxDisplay={5}
                      creatable={!!onCreateTimeSupportZone}
                      createLabel="+ Add Time Zone"
                      onCreateNew={onCreateTimeSupportZone}
                    />

                    <InlineEditableMultiSelectField
                      label="Awards"
                      selected={localEmployer.awards ?? []}
                      fieldName="awards"
                      items={awardOptions}
                      onSave={handleAwardsSave}
                      getFieldVerification={getFieldVerification}
                      placeholder="Select awards..."
                      searchPlaceholder="Search awards..."
                      maxDisplay={5}
                      creatable={!!onCreateAward}
                      createLabel="+ Add Award"
                      onCreateNew={onCreateAward}
                    />

                    {/* Benefits - Full Width */}
                    <div className="md:col-span-2">
                      <InlineEditableBenefits
                        label="Benefits"
                        value={getEmployerBenefits(localEmployer)}
                        fieldName="benefits"
                        onSave={handleBenefitsFieldSave}
                        getFieldVerification={getFieldVerification}
                        maxDisplay={4}
                        benefitOptions={lookups?.benefits ?? []}
                        onCreateBenefit={onCreateBenefit}
                      />
                    </div>

                    <InlineEditableMultiSelectField
                      label="Salary Policy"
                      selected={getEmployerSalaryPoliciesDb(localEmployer)}
                      fieldName="salaryPolicies"
                      items={salaryPolicyOptions}
                      onSave={handleSalaryPoliciesSave}
                      getFieldVerification={getFieldVerification}
                      placeholder="Select salary policies..."
                      searchPlaceholder="Search salary policies..."
                      maxDisplay={3}
                    />

                    <InlineEditableSwitch
                      label="DPL Competitive"
                      value={localEmployer.isDPLCompetitive || false}
                      fieldName="isDPLCompetitive"
                      onSave={handleFieldSave}
                      getFieldVerification={getFieldVerification}
                    />
                    <EntityAuditFields
                      createdBy={localEmployer.createdBy}
                      updatedBy={localEmployer.updatedBy}
                    />
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Locations Section */}
          <Collapsible 
            open={expandedSections.has("locations")} 
            onOpenChange={() => toggleSection("locations")}
          >
            <Card>
              <CollapsibleTrigger className="w-full">
                <CardHeader className="cursor-pointer hover:bg-accent/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <MapPin className="size-5" />
                      Office Locations
                      {localEmployer.locations.length > 0 && (
                        <Badge variant="secondary" className="ml-2">
                          {localEmployer.locations.length}
                        </Badge>
                      )}
                    </CardTitle>
                    {expandedSections.has("locations") ? (
                      <ChevronDown className="size-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="size-4 text-muted-foreground" />
                    )}
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="space-y-6">
                  {localEmployer.locations.length === 0 ? (
                    <p className="text-base text-muted-foreground text-center py-6">No office locations recorded</p>
                  ) : (
                    localEmployer.locations
                      .sort((a, b) => Number(b.isHeadquarters) - Number(a.isHeadquarters))
                      .map((location, idx) => (
                        <div key={location.id}>
                          {idx > 0 && <Separator className="my-6" />}
                          <div className="space-y-4">
                            {/* Location Header */}
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  {location.isHeadquarters ? (
                                    <BuildingIcon className="size-5 text-amber-600" />
                                  ) : (
                                    <MapPinIcon className="size-5 text-muted-foreground" />
                                  )}
                                  <span className="font-semibold text-lg">
                                    <span
                                      className={cn(
                                        isInlineFieldValueEmpty(location.city) && "text-muted-foreground italic"
                                      )}
                                    >
                                      {formatInlineFieldDisplayValue(location.city)}
                                    </span>
                                    {", "}
                                    <span
                                      className={cn(
                                        isInlineFieldValueEmpty(location.country) && "text-muted-foreground italic"
                                      )}
                                    >
                                      {formatInlineFieldDisplayValue(location.country)}
                                    </span>
                                  </span>
                                  {location.isHeadquarters && (
                                    <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                                      Headquarters
                                    </Badge>
                                  )}
                                  <div className="flex items-center gap-1 shrink-0">
                                    <VerificationBadge 
                                      status={getFieldVerification(`locations[${idx}].city`) || 'unverified'}
                                      size="sm"
                                    />
                                  </div>
                                </div>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteLocation(location.id)}
                                className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 cursor-pointer flex-shrink-0"
                                title="Delete location"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>

                            {/* Location Details Grid */}
                            <div className="ml-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <InlineEditField
                                label="City"
                                value={location.city || ""}
                                fieldName={`locations[${idx}].city`}
                                fieldType="text"
                                onSave={async (fieldName, newValue, verify) => {
                                  await handleLocationFieldSave(location.id, 'city', newValue, verify)
                                }}
                                placeholder="Enter city"
                                getFieldVerification={getFieldVerification}
                              />
                              
                              <InlineEditableLocationCountryField
                                label="Country"
                                countryName={location.country || ""}
                                fieldName={`locations[${idx}].country`}
                                countries={countries}
                                countriesLoading={countriesLoading}
                                onCreateCountry={onCreateCountry}
                                onSave={async (countryName, verify) => {
                                  await handleLocationFieldSave(location.id, "country", countryName, verify)
                                }}
                                getFieldVerification={getFieldVerification}
                              />
                              
                              <div className="sm:col-span-2">
                                <InlineEditField
                                  label="Address"
                                  value={location.address || ""}
                                  fieldName={`locations[${idx}].address`}
                                  fieldType="text"
                                  onSave={async (fieldName, newValue, verify) => {
                                    await handleLocationFieldSave(location.id, 'address', newValue, verify)
                                  }}
                                  placeholder="Enter full address"
                                  getFieldVerification={getFieldVerification}
                                />
                              </div>
                              
                              {/* Headquarters Checkbox - Full Width */}
                              <div className="sm:col-span-2">
                                <InlineEditableSwitch
                                  label="Headquarters"
                                  value={location.isHeadquarters}
                                  fieldName={`locations[${idx}].isHeadquarters`}
                                  onSave={async (fieldName, newValue, verify) => {
                                    await handleLocationFieldSave(location.id, 'isHeadquarters', newValue, verify)
                                  }}
                                  getFieldVerification={getFieldVerification}
                                />
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

          {/* Layoffs Section */}
          <Collapsible 
            open={expandedSections.has("layoffs")} 
            onOpenChange={() => toggleSection("layoffs")}
          >
            <Card>
              <CollapsibleTrigger className="w-full">
                <CardHeader className="cursor-pointer hover:bg-accent/50 transition-colors">
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <AlertTriangle className="size-5 text-orange-600" />
                      Layoffs
                      {layoffs.length > 0 && (
                        <Badge variant="secondary" className="ml-2">
                          {layoffs.length}
                        </Badge>
                      )}
                    </CardTitle>
                    {expandedSections.has("layoffs") ? (
                      <ChevronDown className="size-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="size-4 text-muted-foreground" />
                    )}
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="space-y-4">
                  {layoffs.length === 0 ? (
                    <p className="text-base text-muted-foreground text-center py-6">No layoffs recorded</p>
                  ) : (
                    <>
                      <div className="flex justify-between items-center">
                        <p className="text-sm text-muted-foreground">
                          Track layoff events for this employer
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation()
                            setEditingLayoff(null)
                            setIsLayoffFormOpen(true)
                          }}
                          className="gap-2"
                        >
                          <Plus className="h-4 w-4" />
                          Add Layoff
                        </Button>
                      </div>
                    <div className="space-y-2">
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left p-2 font-medium">Date</th>
                              <th className="text-left p-2 font-medium">Employees</th>
                              <th className="text-left p-2 font-medium">Reason</th>
                              <th className="text-right p-2 font-medium">Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {layoffs
                              .sort((a, b) => new Date(b.layoffDate).getTime() - new Date(a.layoffDate).getTime())
                              .map((layoff) => (
                                <tr key={layoff.id} className="border-b hover:bg-muted/50">
                                  <td className="p-2">
                                    {format(new Date(layoff.layoffDate), "MMM dd, yyyy")}
                                  </td>
                                  <td className="p-2">{layoff.numberOfEmployeesLaidOff.toLocaleString()}</td>
                                  <td className="p-2">
                                    {layoff.reason === "Other" && layoff.reasonOther
                                      ? `${LAYOFF_REASON_LABELS[layoff.reason]}: ${layoff.reasonOther}`
                                      : LAYOFF_REASON_LABELS[layoff.reason]}
                                  </td>
                                  <td className="p-2">
                                    <div className="flex justify-end gap-2">
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          setEditingLayoff(layoff)
                                          setIsLayoffFormOpen(true)
                                        }}
                                        className="h-7 w-7 p-0"
                                      >
                                        <Pencil className="h-3 w-3" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          handleDeleteLayoff(layoff.id)
                                        }}
                                        className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                                      >
                                        <Trash2 className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                    </>
                  )}
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Employer Metadata */}
          <div className="pt-4 border-t border-border">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-muted-foreground">
              <div className={cn(formatEmployerDate(localEmployer.createdAt) === "N/A" && "italic")}>
                Created At: {formatEmployerDate(localEmployer.createdAt)}
              </div>
              <div className={cn(formatEmployerDate(localEmployer.updatedAt) === "N/A" && "italic")}>
                Updated At: {formatEmployerDate(localEmployer.updatedAt)}
              </div>
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

      {/* Layoff Form Dialog */}
      <LayoffFormDialog
        open={isLayoffFormOpen}
        onOpenChange={setIsLayoffFormOpen}
        layoff={editingLayoff}
        onSave={handleLayoffSave}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              {locationToDelete ? (
                <>
                  This will permanently delete the location <strong>{locationToDelete.locationName}</strong>. This action cannot be undone.
                </>
              ) : (
                'This action cannot be undone.'
              )}
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
    </Dialog>
  )
}

// Layoff Form Dialog Component
interface LayoffFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  layoff: Layoff | null
  onSave: (layoffData: Omit<Layoff, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>
}

function LayoffFormDialog({ open, onOpenChange, layoff, onSave }: LayoffFormDialogProps) {
  const [layoffDate, setLayoffDate] = useState<Date | undefined>(
    layoff ? new Date(layoff.layoffDate) : undefined
  )
  const [numberOfEmployeesLaidOff, setNumberOfEmployeesLaidOff] = useState<string>(
    layoff ? layoff.numberOfEmployeesLaidOff.toString() : ""
  )
  const [reason, setReason] = useState<LayoffReason>(layoff?.reason || "Cost reduction")
  const [reasonOther, setReasonOther] = useState<string>(layoff?.reasonOther || "")
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSaving, setIsSaving] = useState(false)

  React.useEffect(() => {
    if (layoff) {
      setLayoffDate(new Date(layoff.layoffDate))
      setNumberOfEmployeesLaidOff(layoff.numberOfEmployeesLaidOff.toString())
      setReason(layoff.reason)
      setReasonOther(layoff.reasonOther || "")
    } else {
      // Reset form for new layoff
      setLayoffDate(undefined)
      setNumberOfEmployeesLaidOff("")
      setReason("Cost reduction")
      setReasonOther("")
    }
    setErrors({})
  }, [layoff, open])

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!layoffDate) {
      newErrors.layoffDate = "Layoff date is required"
    } else {
      const today = new Date()
      today.setHours(23, 59, 59, 999)
      if (layoffDate > today) {
        newErrors.layoffDate = "Layoff date cannot be in the future"
      }
    }

    if (!numberOfEmployeesLaidOff || numberOfEmployeesLaidOff.trim() === "") {
      newErrors.numberOfEmployeesLaidOff = "Number of employees is required"
    } else {
      const num = parseInt(numberOfEmployeesLaidOff)
      if (isNaN(num) || num <= 0) {
        newErrors.numberOfEmployeesLaidOff = "Number must be a positive integer"
      }
    }

    if (reason === "Other" && (!reasonOther || reasonOther.trim() === "")) {
      newErrors.reasonOther = "Please specify the reason"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validate()) {
      return
    }

    setIsSaving(true)
    try {
      await onSave({
        employerId: "", // Will be set by parent
        layoffDate: layoffDate!,
        numberOfEmployeesLaidOff: parseInt(numberOfEmployeesLaidOff),
        reason,
        reasonOther: reason === "Other" ? reasonOther : undefined,
      })
      onOpenChange(false)
    } catch (error) {
      // Error already handled in parent
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{layoff ? "Edit Layoff" : "Add Layoff"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Layoff Date */}
          <div className="space-y-2">
            <Label htmlFor="layoffDate">Layoff Date *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !layoffDate && "text-muted-foreground",
                    errors.layoffDate && "border-destructive"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4 opacity-50" />
                  {layoffDate ? format(layoffDate, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={layoffDate}
                  onSelect={setLayoffDate}
                  disabled={(date) => date > new Date()}
                  captionLayout="dropdown"
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            {errors.layoffDate && (
              <p className="text-sm text-destructive">{errors.layoffDate}</p>
            )}
          </div>

          {/* Number of Employees */}
          <div className="space-y-2">
            <Label htmlFor="numberOfEmployeesLaidOff">Number of Employees Laid Off *</Label>
            <Input
              id="numberOfEmployeesLaidOff"
              type="number"
              min="1"
              value={numberOfEmployeesLaidOff}
              onChange={(e) => setNumberOfEmployeesLaidOff(e.target.value)}
              placeholder="e.g., 50"
              className={errors.numberOfEmployeesLaidOff ? "border-destructive" : ""}
            />
            {errors.numberOfEmployeesLaidOff && (
              <p className="text-sm text-destructive">{errors.numberOfEmployeesLaidOff}</p>
            )}
          </div>

          {/* Reason */}
          <div className="space-y-2">
            <Label htmlFor="reason">Reason *</Label>
            <Select value={reason} onValueChange={(value) => setReason(value as LayoffReason)}>
              <SelectTrigger className={errors.reason ? "border-destructive" : ""}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(LAYOFF_REASON_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {reason === "Other" && (
              <div className="mt-2">
                <Input
                  placeholder="Specify reason"
                  value={reasonOther}
                  onChange={(e) => setReasonOther(e.target.value)}
                  className={errors.reasonOther ? "border-destructive" : ""}
                />
                {errors.reasonOther && (
                  <p className="text-sm text-destructive mt-1">{errors.reasonOther}</p>
                )}
              </div>
            )}
          </div>

          {/* Reason Other */}

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
