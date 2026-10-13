"use client"

import * as React from "react"
import { useState, useMemo, useEffect } from "react"
import {
  GraduationCap,
  MapPinIcon,
  ExternalLink,
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
  BuildingIcon,
  Trash2,
  Plus,
} from "lucide-react"

import { University, UniversityRanking, UNIVERSITY_RANKING_LABELS, getRankingLabel, LABEL_TO_RANKING } from "@/lib/types/university"
import type { Country } from "@/lib/types/country"
import {
  deleteUniversityLocation,
  fetchUniversityById,
  patchUniversity,
  patchUniversityLocation,
  type PatchUniversityDto,
  type PatchUniversityLocationDto,
} from "@/lib/services/universities-api"
import { universityNameFieldErrorFromApi } from "@/lib/utils/api-error-message"
import { EntityAuditFields } from "@/components/entity-audit-fields"
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
import { VERIFICATION_UI_ENABLED } from "@/lib/config/verification-ui-enabled"
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

const validateName = (name: string): string | null => {
  if (!name || name.trim() === '') return 'Name is required'
  if (name.length < 2) return 'Name must be at least 2 characters'
  if (name.length > 100) return 'Name is too long'
  return null
}

// Ranking options
const rankingOptions = Object.entries(UNIVERSITY_RANKING_LABELS).map(([value, label]) => ({
  label,
  value: value as UniversityRanking
}))

const EMPTY_COUNTRIES: Country[] = []

/** Inline field verification UI (gated by VERIFICATION_UI_ENABLED). */
const UNIVERSITY_DETAILS_INLINE_VERIFY = VERIFICATION_UI_ENABLED

const UNIVERSITY_SCALAR_FIELD_LABELS: Record<string, string> = {
  name: "University name",
  ranking: "Ranking",
  websiteUrl: "Website",
  linkedInUrl: "LinkedIn",
}

function isInlineFieldValueEmpty(value: string | number | null | undefined): boolean {
  if (value === null || value === undefined) return true
  const trimmed = String(value).trim()
  return trimmed === "" || trimmed === "—" || trimmed === "-"
}

function formatInlineFieldDisplayValue(value: string | number | null | undefined): string {
  if (isInlineFieldValueEmpty(value)) return "N/A"
  return String(value)
}

function formatUniversityDate(iso: string | undefined | null): string {
  if (isInlineFieldValueEmpty(iso)) return "N/A"
  const d = new Date(iso!)
  if (Number.isNaN(d.getTime())) return "N/A"
  return d.toLocaleDateString()
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
  showVerification?: boolean
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
  showVerification = false,
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
      await onSave(fieldName, editValue, VERIFICATION_UI_ENABLED && willVerify)
      setIsEditing(false)
      setError(null)
    } catch (err) {
      const message = err instanceof Error ? err.message : null
      if (fieldName === "name" && message) {
        const nameErr = universityNameFieldErrorFromApi(message)
        setError(nameErr ?? message)
      } else {
        setError("Failed to save. Please try again.")
      }
      throw err
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
            {showVerification && <VerificationIndicator fieldName={fieldName} />}
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
              
              {showVerification && (
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
              )}
              {error && (
                <p className="text-sm text-red-500">{error}</p>
              )}
            </div>
            
            {/* Action Buttons */}
            <div className="flex gap-1 shrink-0">
              <Button
                size="sm"
                onClick={handleSave}
                disabled={isSaving}
                className="h-8 w-8 p-0"
                title="Save"
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

// Inline Editable Country Field (searchable combobox — matches UniversityCreationDialog)
interface InlineEditableCountryFieldProps {
  label: string
  countryId: number | null
  countryName: string
  fieldName: string
  countries?: Country[]
  countriesLoading?: boolean
  onCreateCountry?: (name: string) => Promise<Country | null>
  onSave: (country: Country | null) => Promise<void>
  showVerification?: boolean
  getFieldVerification?: (fieldName: string) => "verified" | "unverified" | undefined
  className?: string
}

const InlineEditableCountryField: React.FC<InlineEditableCountryFieldProps> = ({
  label,
  countryId,
  countryName,
  fieldName,
  countries = EMPTY_COUNTRIES,
  countriesLoading = false,
  onCreateCountry,
  onSave,
  showVerification = false,
  getFieldVerification,
  className,
}) => {
  const [isEditing, setIsEditing] = useState(false)
  const [editCountry, setEditCountry] = useState<Country | null>(
    countryId != null ? { id: countryId, name: countryName } : null
  )
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

  const selectedCountryName = editCountry?.name ?? ""

  const handleEdit = () => {
    setIsEditing(true)
    setEditCountry(countryId != null ? { id: countryId, name: countryName } : null)
    setWillVerify(true)
    setCountrySearchQuery("")
    setCountryPopoverOpen(false)
  }

  const handleCancel = () => {
    setIsEditing(false)
    setEditCountry(countryId != null ? { id: countryId, name: countryName } : null)
    setWillVerify(true)
    setCountrySearchQuery("")
    setCountryPopoverOpen(false)
  }

  const handleCountrySelect = (country: Country) => {
    if (editCountry?.id === country.id) {
      setEditCountry(null)
    } else {
      setEditCountry(country)
    }
    setCountryPopoverOpen(false)
    setCountrySearchQuery("")
  }

  const handleSave = async () => {
    const nextId = editCountry?.id ?? null
    if (nextId === countryId) {
      setIsEditing(false)
      return
    }

    setIsSaving(true)
    try {
      await onSave(editCountry)
      setIsEditing(false)
      setCountryPopoverOpen(false)
      setCountrySearchQuery("")
    } catch {
      setEditCountry(countryId != null ? { id: countryId, name: countryName } : null)
    } finally {
      setIsSaving(false)
    }
  }

  const VerificationIndicator = ({ fName }: { fName: string }) => (
    <div className="flex items-center gap-1 shrink-0">
      <VerificationBadge status={getFieldVerification?.(fName) || "unverified"} size="sm" />
    </div>
  )

  const displayValue = formatInlineFieldDisplayValue(countryName)
  const isEmpty = isInlineFieldValueEmpty(countryName)

  return (
    <div className={cn("space-y-1 py-2 px-3 rounded-md hover:bg-muted/50 transition-colors", className)}>
      <div className="flex items-center justify-between mb-1">
        <Label className="text-sm font-medium text-muted-foreground">{label}</Label>
        {!isEditing && (
          <div className="flex items-center gap-1 shrink-0">
            {showVerification && <VerificationIndicator fName={fieldName} />}
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
              <Popover open={countryPopoverOpen} onOpenChange={setCountryPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    role="combobox"
                    aria-expanded={countryPopoverOpen}
                    disabled={isSaving}
                    className={cn(
                      "w-full justify-between",
                      !selectedCountryName && "text-muted-foreground"
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
                                    }
                                  } finally {
                                    setCountryCreateInProgress(false)
                                  }
                                }}
                                disabled={countryCreateInProgress}
                                className="flex items-center gap-2 font-medium text-primary cursor-pointer"
                              >
                                <Plus className="h-4 w-4" />
                                {countryCreateInProgress
                                  ? "Adding…"
                                  : `Add "${countrySearchQuery.trim()}" as new country`}
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
                              className="flex items-center gap-2 cursor-pointer"
                            >
                              <Check
                                className={cn(
                                  "h-4 w-4",
                                  editCountry?.id === country.id ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {country.name}
                            </CommandItem>
                          ))}
                          {countrySearchQuery.trim() &&
                            onCreateCountry &&
                            !filteredCountries.some(
                              (c) => c.name.toLowerCase() === countrySearchQuery.trim().toLowerCase()
                            ) && (
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
                                    }
                                  } finally {
                                    setCountryCreateInProgress(false)
                                  }
                                }}
                                disabled={countryCreateInProgress}
                                className="flex items-center gap-2 font-medium text-primary cursor-pointer"
                              >
                                <Plus className="h-4 w-4" />
                                {countryCreateInProgress
                                  ? "Adding…"
                                  : `Add "${countrySearchQuery.trim()}" as new country`}
                              </CommandItem>
                            )}
                        </CommandGroup>
                      )}
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>

              {showVerification && (
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
                    willVerify
                      ? "text-green-600 dark:text-green-400 font-medium"
                      : "text-muted-foreground"
                  )}
                >
                  {willVerify ? "✓ Verified" : "Mark as verified"}
                </Label>
              </div>
              )}
            </div>

            <div className="flex gap-1 shrink-0">
              <Button
                size="sm"
                onClick={handleSave}
                disabled={isSaving}
                className="h-8 w-8 p-0"
                title="Save"
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
      await onSave(fieldName, editValue, VERIFICATION_UI_ENABLED && willVerify)
      setIsEditing(false)
    } catch (err) {
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
            {VERIFICATION_UI_ENABLED && (
            <VerificationIndicator fieldName={fieldName} />
            )}
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
              <div className="flex items-center space-x-2">
                <Checkbox
                  id={`edit-${fieldName}`}
                  checked={editValue}
                  onCheckedChange={(checked) => setEditValue(checked as boolean)}
                  disabled={isSaving}
                  className="h-4 w-4"
                />
                <Label 
                  htmlFor={`edit-${fieldName}`}
                  className="text-sm cursor-pointer"
                >
                  {description || label}
                </Label>
              </div>
              
              {/* VERIFICATION_UI_DISABLED — Mark as verified checkbox */}
              {VERIFICATION_UI_ENABLED ? (
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
              ) : null}
            </div>
            
            {/* Action Buttons */}
            <div className="flex gap-1 shrink-0">
              <Button
                size="sm"
                onClick={handleSave}
                disabled={isSaving}
                className="h-8 w-8 p-0"
                title={VERIFICATION_UI_ENABLED && willVerify ? "Save & Verify" : "Save"}
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
          <div className="flex items-center space-x-2">
            <Checkbox
              id={`display-${fieldName}`}
              checked={value}
              disabled
              className="h-4 w-4"
            />
            <Label 
              htmlFor={`display-${fieldName}`}
              className="text-sm cursor-default"
            >
              {description || label}
            </Label>
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
  showVerification?: boolean
  className?: string
  description?: string
}

const InlineEditableSwitch: React.FC<InlineEditableSwitchProps> = ({
  label,
  value,
  fieldName,
  onSave,
  getFieldVerification,
  showVerification = false,
  className,
  description
}) => {
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState(value)
  const [isSaving, setIsSaving] = useState(false)
  const [willVerify, setWillVerify] = useState(true)
  
  const verificationStatus = getFieldVerification?.(fieldName)
  const isCurrentlyVerified = verificationStatus === 'verified'
  
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
    const verificationChanged = showVerification && willVerify !== isCurrentlyVerified
    const valueChanged = editValue !== value
    
    if (!valueChanged && !verificationChanged) {
      setIsEditing(false)
      return
    }
    
    setIsSaving(true)
    try {
      await onSave(fieldName, editValue, VERIFICATION_UI_ENABLED && willVerify)
      setIsEditing(false)
    } catch (err) {
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
            {showVerification && <VerificationIndicator fieldName={fieldName} />}
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
              
              {showVerification && (
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
              )}
            </div>
            
            {/* Action Buttons */}
            <div className="flex gap-1 shrink-0">
              <Button
                size="sm"
                onClick={handleSave}
                disabled={isSaving}
                className="h-8 w-8 p-0"
                title="Save"
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

export interface UniversityDetailsModalProps {
  university: University
  open: boolean
  onOpenChange: (open: boolean) => void
  onEdit?: (university: University) => void
  countries?: Country[]
  countriesLoading?: boolean
  onCreateCountry?: (name: string) => Promise<Country | null>
  /** Called after a successful PATCH or location delete (list can refresh on modal close). */
  onPersistedChange?: () => void
}

export function UniversityDetailsModal({
  university,
  open,
  onOpenChange,
  onEdit,
  countries = EMPTY_COUNTRIES,
  countriesLoading = false,
  onCreateCountry,
  onPersistedChange,
}: UniversityDetailsModalProps) {
  const [localUniversity, setLocalUniversity] = useState<University>(university)
  const [detailLoading, setDetailLoading] = useState(false)
  
  const notifyPersistedChange = () => {
    onPersistedChange?.()
  }
  
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(["basic", "locations"]))
  
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [locationToDelete, setLocationToDelete] = useState<{
    locationId: number
    locationName: string
  } | null>(null)
  
  useEffect(() => {
    if (!open || !university?.id) {
      setDetailLoading(false)
      return
    }

    setLocalUniversity(university)

    let cancelled = false
    setDetailLoading(true)

    fetchUniversityById(university.id)
      .then((full) => {
        if (!cancelled) setLocalUniversity(full)
      })
      .catch((err) => {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : String(err)
          if (message === "Not found") {
            toast.error("University not found.")
          } else {
            toast.error(message || "Failed to load university details.")
          }
        }
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [open, university])
  
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
    // TODO: Implement verification system for universities
    return undefined
  }
  
  const handleCountrySave = async (country: Country | null) => {
    try {
      const updated = await patchUniversity(localUniversity.id, {
        countryId: country?.id ?? null,
      })
      setLocalUniversity(updated)
      notifyPersistedChange()
      toast.success(country ? "Country updated" : "Country cleared")
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save field"
      toast.error(message)
      throw error
    }
  }

  const buildScalarPatch = (
    fieldName: string,
    newValue: string | number | null
  ): PatchUniversityDto | null => {
    switch (fieldName) {
      case "name":
        return { name: String(newValue).trim() }
      case "ranking": {
        const s = String(newValue).trim()
        if (s === "" || s === "—") return { ranking: null }
        if (s in LABEL_TO_RANKING) {
          return { ranking: LABEL_TO_RANKING[s as UniversityRanking] }
        }
        return { ranking: null }
      }
      case "websiteUrl":
        return { websiteUrl: String(newValue).trim() || null }
      case "linkedInUrl":
        return { linkedInUrl: String(newValue).trim() || null }
      default:
        return null
    }
  }

  const handleFieldSave = async (
    fieldName: string,
    newValue: string | number | null,
    _verify: boolean
  ) => {
    const patch = buildScalarPatch(fieldName, newValue)
    if (!patch) return

    try {
      const updated = await patchUniversity(localUniversity.id, patch)
      setLocalUniversity(updated)
      notifyPersistedChange()
      const label = UNIVERSITY_SCALAR_FIELD_LABELS[fieldName] ?? fieldName
      toast.success(`${label} updated`)
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save field"
      if (fieldName === "name") {
        toast.error(universityNameFieldErrorFromApi(message) ?? message)
      } else {
        toast.error(message)
      }
      throw error
    }
  }
  
  const handleLocationFieldSave = async (
    locationId: number,
    fieldName: string,
    newValue: string | boolean | null,
    _verify: boolean
  ) => {
    let patch: PatchUniversityLocationDto = {}
    if (fieldName === "city") {
      patch = { city: String(newValue).trim() }
    } else if (fieldName === "address") {
      patch = { address: String(newValue).trim() || null }
    } else if (fieldName === "isMainCampus") {
      patch = { isMainCampus: Boolean(newValue) }
    } else {
      return
    }

    const locationLabels: Record<string, string> = {
      city: "City",
      address: "Address",
      isMainCampus: "Main campus",
    }

    try {
      const updated = await patchUniversityLocation(
        localUniversity.id,
        locationId,
        patch
      )
      setLocalUniversity(updated)
      notifyPersistedChange()
      toast.success(`${locationLabels[fieldName] ?? fieldName} updated`)
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to save field"
      toast.error(message)
      throw error
    }
  }

  // Handle location deletion - show confirmation dialog
  const handleDeleteLocation = (locationId: number) => {
    const location = localUniversity.locations.find((loc) => loc.id === locationId)
    if (!location) return
    
    // Create a descriptive name for the location
    const locationName = location.city || 'Location'
    
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
      await deleteUniversityLocation(localUniversity.id, locationToDelete.locationId)
      const updated = await fetchUniversityById(localUniversity.id)
      setLocalUniversity(updated)
      notifyPersistedChange()
      toast.success(`Location "${locationToDelete.locationName}" deleted successfully`)
      setDeleteDialogOpen(false)
      setLocationToDelete(null)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      if (message === "Not found") {
        toast.error("Location not found.")
      } else {
        toast.error("Failed to delete location. Please try again.")
        console.error("Error deleting location:", error)
      }
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
      <DialogContent
        className="sm:max-w-[700px] lg:max-w-[800px] max-h-[90vh] flex flex-col p-0"
        onInteractOutside={(event) => {
          const target = event.target
          if (
            target instanceof Element &&
            target.closest('[data-slot="popover-content"]')
          ) {
            event.preventDefault()
          }
        }}
      >
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border">
          <div className="flex items-start justify-between">
            <DialogTitle className="flex items-center gap-2 text-xl">
              <GraduationCap className="h-5 w-5 text-purple-600" />
              {localUniversity.name}
            </DialogTitle>
            <div className="flex gap-2 mr-8">
              {onEdit && (
                <Button 
                  variant="default" 
                  size="sm" 
                  onClick={() => {
                    onEdit(localUniversity)
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
              Loading university details…
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
                      <BuildingIcon className="size-5" />
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
                      label="Name"
                      value={localUniversity.name}
                      fieldName="name"
                      fieldType="text"
                      validation={validateName}
                      onSave={handleFieldSave}
                      placeholder="Enter university name"
                      showVerification={UNIVERSITY_DETAILS_INLINE_VERIFY}
                      getFieldVerification={getFieldVerification}
                    />
                    
                    <InlineEditableCountryField
                      label="Country"
                      countryId={localUniversity.country?.id ?? null}
                      countryName={localUniversity.country?.name ?? ""}
                      fieldName="country"
                      countries={countries}
                      countriesLoading={countriesLoading}
                      onCreateCountry={onCreateCountry}
                      onSave={handleCountrySave}
                      showVerification={UNIVERSITY_DETAILS_INLINE_VERIFY}
                      getFieldVerification={getFieldVerification}
                    />
                    
                    <InlineEditField
                      label="Ranking"
                      value={
                        localUniversity.ranking != null
                          ? getRankingLabel(localUniversity.ranking)
                          : null
                      }
                      fieldName="ranking"
                      fieldType="select"
                      options={rankingOptions}
                      onSave={handleFieldSave}
                      showVerification={UNIVERSITY_DETAILS_INLINE_VERIFY}
                      getFieldVerification={getFieldVerification}
                    />
                    
                    <div className="space-y-2">
                      <InlineEditField
                        label="Website"
                        value={localUniversity.websiteUrl || ""}
                        fieldName="websiteUrl"
                        fieldType="url"
                        validation={validateURL}
                        onSave={handleFieldSave}
                        placeholder="https://example.com"
                        showVerification={UNIVERSITY_DETAILS_INLINE_VERIFY}
                        getFieldVerification={getFieldVerification}
                      />
                      {localUniversity.websiteUrl && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(localUniversity.websiteUrl!, '_blank')}
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
                        value={localUniversity.linkedInUrl || ""}
                        fieldName="linkedInUrl"
                        fieldType="url"
                        validation={validateURL}
                        onSave={handleFieldSave}
                        placeholder="https://linkedin.com/school/example"
                        showVerification={UNIVERSITY_DETAILS_INLINE_VERIFY}
                        getFieldVerification={getFieldVerification}
                      />
                      {localUniversity.linkedInUrl && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => window.open(localUniversity.linkedInUrl!, '_blank')}
                          className="h-7 text-xs"
                        >
                          <ExternalLink className="h-3 w-3 mr-1" />
                          Visit LinkedIn
                        </Button>
                      )}
                    </div>
                    <EntityAuditFields
                      createdBy={localUniversity.createdBy}
                      updatedBy={localUniversity.updatedBy}
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
                      Campus Locations
                      {localUniversity.locations.length > 0 && (
                        <Badge variant="secondary" className="ml-2">
                          {localUniversity.locations.length}
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
                  {localUniversity.locations.length === 0 ? (
                    <p className="text-base text-muted-foreground text-center py-6">No campus locations recorded</p>
                  ) : (
                    localUniversity.locations
                      .sort((a, b) => Number(b.isMainCampus) - Number(a.isMainCampus))
                      .map((location, idx) => (
                        <div key={location.id}>
                          {idx > 0 && <Separator className="my-6" />}
                          <div className="space-y-4">
                            {/* Location Header */}
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  {location.isMainCampus ? (
                                    <BuildingIcon className="size-5 text-amber-600" />
                                  ) : (
                                    <MapPinIcon className="size-5 text-muted-foreground" />
                                  )}
                                  <span
                                    className={cn(
                                      "font-semibold text-lg",
                                      isInlineFieldValueEmpty(location.city) && "text-muted-foreground italic"
                                    )}
                                  >
                                    {formatInlineFieldDisplayValue(location.city)}
                                  </span>
                                  {location.isMainCampus && (
                                    <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                                      Main Campus
                                    </Badge>
                                  )}
                                  {UNIVERSITY_DETAILS_INLINE_VERIFY && (
                                  <div className="flex items-center gap-1 shrink-0">
                                    <VerificationBadge 
                                      status={getFieldVerification(`locations[${idx}].city`) || 'unverified'}
                                      size="sm"
                                    />
                                  </div>
                                  )}
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
                                  await handleLocationFieldSave(location.id, 'city', String(newValue), verify)
                                }}
                                placeholder="Enter city"
                                showVerification={UNIVERSITY_DETAILS_INLINE_VERIFY}
                                getFieldVerification={getFieldVerification}
                              />

                              <InlineEditableSwitch
                                label="Main Campus"
                                value={location.isMainCampus}
                                fieldName={`locations[${idx}].isMainCampus`}
                                onSave={async (fieldName, newValue, verify) => {
                                  await handleLocationFieldSave(location.id, 'isMainCampus', newValue, verify)
                                }}
                                showVerification={UNIVERSITY_DETAILS_INLINE_VERIFY}
                                getFieldVerification={getFieldVerification}
                              />
                              
                              <div className="sm:col-span-2">
                                <InlineEditField
                                  label="Address"
                                  value={location.address || ""}
                                  fieldName={`locations[${idx}].address`}
                                  fieldType="text"
                                  onSave={async (fieldName, newValue, verify) => {
                                    await handleLocationFieldSave(location.id, 'address', String(newValue), verify)
                                  }}
                                  placeholder="Enter full address"
                                  showVerification={UNIVERSITY_DETAILS_INLINE_VERIFY}
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

          {/* University Metadata */}
          <div className="pt-4 border-t border-border">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-muted-foreground">
              <div
                className={cn(
                  isInlineFieldValueEmpty(localUniversity.createdAt) && "italic"
                )}
              >
                Created At: {formatUniversityDate(localUniversity.createdAt)}
            </div>
              <div
                className={cn(
                  isInlineFieldValueEmpty(localUniversity.updatedAt) && "italic"
                )}
              >
                Updated At: {formatUniversityDate(localUniversity.updatedAt)}
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
