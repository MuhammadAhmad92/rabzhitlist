"use client"

import * as React from "react"
import { useState, useMemo } from "react"
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
import { MultiSelect, MultiSelectOption } from "@/components/ui/multi-select"
import { Filter, Loader2 } from "lucide-react"
import { UniversityRanking, UNIVERSITY_RANKING_LABELS } from "@/lib/types/university"
import type { Country } from "@/lib/types/country"
import { countryLookupItemsToMultiSelectOptions } from "@/lib/utils/country-lookup"

// Filter interfaces
export interface UniversityFilters {
  name: string
  countries: string[]
  rankings: UniversityRanking[]
  city: string
  /** Min/max stored profile completion 0–100 → API filter params. */
  dataProgressMin: string
  dataProgressMax: string
}

interface UniversitiesFilterDialogProps {
  children?: React.ReactNode
  filters: UniversityFilters
  onFiltersChange: (filters: UniversityFilters) => void
  onClearFilters: () => void
  /** Normalized countries from API (e.g. fetchCountries). Used for Country MultiSelect options. */
  countries?: Country[]
  countriesLoading?: boolean
}

const rankingOptions: MultiSelectOption[] = Object.entries(UNIVERSITY_RANKING_LABELS).map(([value, label]) => ({
  value: value as UniversityRanking,
  label
}))

const initialFilters: UniversityFilters = {
  name: "",
  countries: [],
  rankings: [],
  city: "",
  dataProgressMin: "",
  dataProgressMax: "",
}

export function UniversitiesFilterDialog({
  children,
  filters,
  onFiltersChange,
  onClearFilters,
  countries = [],
  countriesLoading = false,
}: UniversitiesFilterDialogProps) {
  const [open, setOpen] = useState(false)
  const [tempFilters, setTempFilters] = useState<UniversityFilters>(filters)

  const countryOptions: MultiSelectOption[] = useMemo(
    () => countryLookupItemsToMultiSelectOptions(countries),
    [countries],
  )

  // Calculate active filter count
  const activeFilterCount = 
    (filters.name.trim() ? 1 : 0) +
    filters.countries.length +
    filters.rankings.length +
    (filters.city.trim() ? 1 : 0) +
    (filters.dataProgressMin.trim() ? 1 : 0) +
    (filters.dataProgressMax.trim() ? 1 : 0)

  React.useEffect(() => {
    setTempFilters(filters)
  }, [filters])

  const handleFilterChange = (field: keyof UniversityFilters, value: string[] | string) => {
    setTempFilters(prev => ({ ...prev, [field]: value }))
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

  const dataProgressError = validateDataProgressPercentage()

  const handleApplyFilters = () => {
    if (dataProgressError) return
    onFiltersChange(tempFilters)
    setOpen(false)
  }

  const handleClearFilters = () => {
    setTempFilters(initialFilters)
    onClearFilters()
    // Keep dialog open for user to see cleared state
  }

  const handleCancel = () => {
    setTempFilters(filters) // Reset to current filters
    setOpen(false)
  }

  const hasAnyTempFilters = 
    tempFilters.name.trim() !== "" ||
    tempFilters.countries.length > 0 ||
    tempFilters.rankings.length > 0 ||
    tempFilters.city.trim() !== "" ||
    tempFilters.dataProgressMin.trim() !== "" ||
    tempFilters.dataProgressMax.trim() !== ""

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
      
      <DialogContent className="sm:max-w-[550px] lg:max-w-[600px] max-h-[90vh] flex flex-col p-0 [&>button]:cursor-pointer">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border">
          <DialogTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filter Universities
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-6">
          <div className="space-y-6">
            {/* University Filters */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="universityName">Name</Label>
                <Input
                  id="universityName"
                  type="text"
                  placeholder="Filter by name..."
                  value={tempFilters.name}
                  onChange={(e) => handleFilterChange("name", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <MultiSelect
                  items={countryOptions}
                  selected={tempFilters.countries}
                  onChange={(values) => handleFilterChange("countries", values)}
                  placeholder={countriesLoading ? "Loading countries..." : "Filter by country..."}
                  label="Country"
                  searchPlaceholder="Search countries..."
                  maxDisplay={3}
                  disabled={countriesLoading}
                />
                {countriesLoading && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Loading countries...
                  </p>
                )}
              </div>

              <MultiSelect
                items={rankingOptions}
                selected={tempFilters.rankings}
                onChange={(values) => handleFilterChange("rankings", values)}
                placeholder="Filter by ranking..."
                label="Ranking"
                maxDisplay={3}
              />

              <div className="space-y-2">
                <Label htmlFor="campusCity">Campus City</Label>
                <Input
                  id="campusCity"
                  type="text"
                  placeholder="Filter by campus city..."
                  value={tempFilters.city}
                  onChange={(e) => handleFilterChange("city", e.target.value)}
                />
              </div>

              <div className="space-y-3">
                <Label className="text-sm font-medium">Data Progress</Label>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="universityDataProgressMin" className="text-xs text-muted-foreground">
                      Minimum (%)
                    </Label>
                    <Input
                      id="universityDataProgressMin"
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
                      className={dataProgressError ? "border-red-500" : ""}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="universityDataProgressMax" className="text-xs text-muted-foreground">
                      Maximum (%)
                    </Label>
                    <Input
                      id="universityDataProgressMax"
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
                      className={dataProgressError ? "border-red-500" : ""}
                    />
                  </div>
                </div>
                {dataProgressError && (
                  <p className="text-xs text-red-500">{dataProgressError}</p>
                )}
              </div>
            </div>
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
