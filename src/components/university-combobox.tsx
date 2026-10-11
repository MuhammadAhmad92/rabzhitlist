"use client"

import * as React from "react"
import { useState, useCallback, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Command,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Check, ChevronsUpDown, Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { useUniversitySearch } from "@/hooks/useUniversitySearch"
import {
  UniversityCreationDialog,
  type UniversityFormData,
} from "@/components/university-creation-dialog"
import {
  createUniversity,
  createUniversityLocation,
} from "@/lib/services/universities-api"
import { createCountry, fetchCountries, mergeCountryIntoCatalog } from "@/lib/services/countries-api"
import { LABEL_TO_RANKING } from "@/lib/types/university"
import type { Country } from "@/lib/types/country"

export type SelectedUniversity = { id: number; name: string } | null

export interface UniversityComboboxProps {
  id?: string
  label?: string
  value: SelectedUniversity
  onChange: (university: SelectedUniversity) => void
  disabled?: boolean
  className?: string
  error?: boolean
  /**
   * When there is no selected university yet (e.g. resume import), seed the search when the popover opens.
   */
  parsedNameHint?: string
}

export function UniversityCombobox({
  id,
  label = "University",
  value,
  onChange,
  disabled = false,
  className,
  error = false,
  parsedNameHint,
}: UniversityComboboxProps) {
  const [open, setOpen] = useState(false)
  const [addUniversityOpen, setAddUniversityOpen] = useState(false)
  const [addUniversityInitialName, setAddUniversityInitialName] = useState("")
  const { query, setQuery, results, loading, resetSearch } = useUniversitySearch()
  const prevOpenRef = React.useRef(false)

  const [countries, setCountries] = useState<Country[]>([])
  const [countriesLoading, setCountriesLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    void fetchCountries()
      .then((data) => {
        if (!cancelled) setCountries(data)
      })
      .catch((err) => {
        console.error(err)
        if (!cancelled) toast.error("Failed to load countries.")
      })
      .finally(() => {
        if (!cancelled) setCountriesLoading(false)
      })
    return () => {
      cancelled = true
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

  React.useEffect(() => {
    if (open && !prevOpenRef.current && parsedNameHint?.trim() && !value) {
      setQuery(parsedNameHint.trim())
    }
    prevOpenRef.current = open
  }, [open, parsedNameHint, value, setQuery])

  const handleOpenChange = (next: boolean) => {
    setOpen(next)
    if (!next) {
      resetSearch()
    }
  }

  const selectUniversity = (u: { id: number; name: string }) => {
    if (value?.id === u.id) {
      onChange(null)
    } else {
      onChange({ id: u.id, name: u.name })
    }
    handleOpenChange(false)
  }

  const handleCreateUniversitySubmit = async (data: UniversityFormData) => {
    const locationsWithCity = data.locations.filter((loc) => loc.city?.trim())
    const university = await createUniversity({
      name: data.name.trim(),
      ...(data.countryId != null ? { countryId: data.countryId } : {}),
      websiteUrl: data.websiteUrl?.trim() || null,
      linkedInUrl: data.linkedinUrl?.trim() || null,
      ranking:
        data.ranking && data.ranking in LABEL_TO_RANKING
          ? LABEL_TO_RANKING[data.ranking as keyof typeof LABEL_TO_RANKING]
          : null,
    })
    for (const loc of locationsWithCity) {
      await createUniversityLocation(university.id, {
        city: loc.city.trim(),
        address: loc.address?.trim() || null,
        isMainCampus: loc.isMainCampus ?? false,
      })
    }
    toast.success(`University "${data.name.trim()}" created successfully.`)
    selectUniversity({ id: university.id, name: university.name })
    setAddUniversityOpen(false)
    setAddUniversityInitialName("")
    resetSearch()
  }

  return (
    <div className={className ? `space-y-2 ${className}` : "space-y-2"}>
      {label ? (
        <Label htmlFor={id} className="text-sm font-medium">
          {label}
        </Label>
      ) : null}
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className={cn(
              "h-9 w-full min-w-0 justify-between overflow-hidden font-normal",
              error ? "border-red-500" : "",
            )}
            title={value?.name}
          >
            <span
              className={cn(
                "min-w-0 flex-1 truncate text-left",
                value || query || parsedNameHint?.trim()
                  ? "text-foreground"
                  : "text-muted-foreground",
              )}
            >
              {value?.name ||
                query ||
                parsedNameHint?.trim() ||
                "Search universities..."}
            </span>
            <ChevronsUpDown className="opacity-50 shrink-0" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Search universities..."
              value={query}
              onValueChange={setQuery}
              className="h-9"
            />
            <CommandList>
              {loading && (
                <div className="py-6 text-center text-sm text-muted-foreground">Searching...</div>
              )}
              {!loading && query.trim().length < 2 && !value && (
                <div className="py-6 text-center text-sm text-muted-foreground">Type to search</div>
              )}
              {!loading && query.trim().length < 2 && value && (
                <CommandGroup>
                  <CommandItem
                    value={String(value.id)}
                    onSelect={() => selectUniversity(value)}
                    className="cursor-pointer"
                  >
                    {value.name}
                    <Check className="ml-auto opacity-100" />
                  </CommandItem>
                </CommandGroup>
              )}
              {!loading && query.trim().length >= 2 && results.length === 0 && (
                <CommandGroup>
                  <div className="py-2 px-2 text-center text-sm text-muted-foreground">
                    No universities found
                  </div>
                  <CommandItem
                    value="__add_new_university__"
                    onSelect={() => {
                      setAddUniversityInitialName(query.trim())
                      handleOpenChange(false)
                      setAddUniversityOpen(true)
                    }}
                    className="cursor-pointer font-medium text-primary"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add New University
                  </CommandItem>
                </CommandGroup>
              )}
              {!loading && results.length > 0 && (
                <CommandGroup>
                  {results.map((u) => (
                    <CommandItem
                      key={u.id}
                      value={String(u.id)}
                      onSelect={() => selectUniversity(u)}
                      className="cursor-pointer"
                    >
                      {u.name}
                      <Check
                        className={cn(
                          "ml-auto",
                          value?.id === u.id ? "opacity-100" : "opacity-0",
                        )}
                      />
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <UniversityCreationDialog
        mode="create"
        open={addUniversityOpen}
        showVerification={false}
        onOpenChange={(next) => {
          setAddUniversityOpen(next)
          if (!next) setAddUniversityInitialName("")
        }}
        initialName={addUniversityInitialName}
        countries={countries}
        countriesLoading={countriesLoading}
        onCreateCountry={handleCreateCountry}
        onSubmit={handleCreateUniversitySubmit}
      />
    </div>
  )
}
