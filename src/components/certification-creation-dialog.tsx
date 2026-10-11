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
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Loader2, Plus, ShieldCheck, ChevronDown, ChevronRight, Check, ChevronsUpDown, Building2 } from "lucide-react"
import { Certification, CertificationIssuer } from "@/lib/types/certification"
import { IssuerCreationDialog, IssuerFormData } from "@/components/issuer-creation-dialog"
import { createCertificationIssuer } from "@/lib/services/certifications-api"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

export interface CertificationFormData {
  certificationName: string
  issuerId: number | null
  issuerName: string
}

export interface CertificationVerificationState {
  verifiedFields: Set<string>
  modifiedFields: Set<string>
}

type DialogMode = "create" | "edit"

interface CertificationCreationDialogProps {
  children?: React.ReactNode
  mode?: DialogMode
  certificationData?: Certification
  showVerification?: boolean
  onSubmit?: (data: CertificationFormData, verificationState?: CertificationVerificationState) => Promise<void> | void
  onOpenChange?: (open: boolean) => void
  open?: boolean
  initialName?: string
  /** Resume / combobox: prefill Issuing Body name (`issuing_body`). */
  initialIssuerName?: string
  /** Resume / combobox: prefill Create Issuer website (`issuing_body_url`). */
  initialIssuerWebsiteUrl?: string
  issuers?: CertificationIssuer[]
  issuersLoading?: boolean
  /** After inline Create Issuer; parent can refresh issuer lookup list. */
  onIssuerCreated?: (issuer: CertificationIssuer) => void
}

const initialFormData: CertificationFormData = {
  certificationName: "",
  issuerId: null,
  issuerName: "",
}

/** Stable default — inline `= []` creates a new reference every render and retriggers effects. */
const EMPTY_ISSUERS: CertificationIssuer[] = []

const certificationToFormData = (certification: Certification): CertificationFormData => {
  return {
    certificationName: certification.name || "",
    issuerId: certification.issuer?.id ?? null,
    issuerName: certification.issuer?.name || "",
  }
}

const CERTIFICATION_VERIFICATION_FIELDS = [
  'certificationName', 'issuerId'
]

export function CertificationCreationDialog({
  children,
  mode = "create",
  certificationData,
  showVerification = true,
  onSubmit,
  onOpenChange,
  open: controlledOpen,
  initialName,
  initialIssuerName,
  initialIssuerWebsiteUrl,
  issuers = EMPTY_ISSUERS,
  issuersLoading = false,
  onIssuerCreated,
}: CertificationCreationDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState<CertificationFormData>(initialFormData)
  const [errors, setErrors] = useState<Partial<Record<keyof CertificationFormData, string>>>({})
  const initialFormDataRef = useRef<CertificationFormData | null>(null)
  const [showUnsavedWarning, setShowUnsavedWarning] = useState(false)
  const formId = React.useId().replace(/:/g, "")

  // Verification state
  const [verifiedFields, setVerifiedFields] = useState<Set<string>>(new Set())
  const [modifiedFields, setModifiedFields] = useState<Set<string>>(new Set())

  // Collapsible sections
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(["basic-info"])
  )

  // Issuer combobox state
  const [issuerPopoverOpen, setIssuerPopoverOpen] = useState(false)
  const [issuerSearchQuery, setIssuerSearchQuery] = useState("")
  const [issuerOptions, setIssuerOptions] = useState<CertificationIssuer[]>(issuers)

  // Stable key so we don't re-run when parent passes a new array reference every render (e.g. default [])
  const issuerIdsKey = useMemo(
    () => issuers.map((i) => i.id).join(","),
    [issuers]
  )
  useEffect(() => {
    setIssuerOptions((prev) => {
      const byId = new Map<number, CertificationIssuer>()
      for (const issuer of issuers) byId.set(issuer.id, issuer)
      for (const issuer of prev) {
        if (!byId.has(issuer.id)) byId.set(issuer.id, issuer)
      }
      return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name))
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync when issuer list identity (ids) changes
  }, [issuerIdsKey])

  // Issuer creation dialog state
  const [createIssuerDialogOpen, setCreateIssuerDialogOpen] = useState(false)
  const [pendingIssuerName, setPendingIssuerName] = useState("")
  const [pendingIssuerWebsiteUrl, setPendingIssuerWebsiteUrl] = useState("")

  const open = controlledOpen !== undefined ? controlledOpen : internalOpen
  const setOpen = (newOpen: boolean) => {
    if (controlledOpen === undefined) {
      setInternalOpen(newOpen)
    }
    onOpenChange?.(newOpen)
  }

  /** Must start false — edit dialog often mounts with `open={true}` (conditional render + setState batch). */
  const prevOpenRef = useRef(false)
  const prevEditCertIdRef = useRef<number | null>(null)

  useEffect(() => {
    const wasOpen = prevOpenRef.current
    prevOpenRef.current = open

    const editCertId = mode === "edit" && certificationData ? certificationData.id : null
    const editCertChanged =
      open && editCertId != null && prevEditCertIdRef.current !== editCertId
    if (open && editCertId != null) {
      prevEditCertIdRef.current = editCertId
    } else if (!open) {
      prevEditCertIdRef.current = null
    }

    if (open && (!wasOpen || editCertChanged)) {
      if (mode === "edit" && certificationData) {
        const formDataFromCertification = certificationToFormData(certificationData)
        setFormData(formDataFromCertification)
        setIssuerSearchQuery(formDataFromCertification.issuerName.trim())
        initialFormDataRef.current = formDataFromCertification
      } else if (!wasOpen) {
        let formDataToUse: CertificationFormData = initialName
          ? { ...initialFormData, certificationName: initialName }
          : { ...initialFormData }
        const issuerHint = initialIssuerName?.trim() ?? ""
        if (issuerHint) {
          const match = issuers.find(
            (i) => i.name.trim().toLowerCase() === issuerHint.toLowerCase()
          )
          formDataToUse = {
            ...formDataToUse,
            issuerId: match?.id ?? null,
            issuerName: match?.name ?? issuerHint,
          }
          setIssuerSearchQuery(issuerHint)
        } else {
          setIssuerSearchQuery("")
        }
        setPendingIssuerWebsiteUrl(initialIssuerWebsiteUrl?.trim() ?? "")
        setFormData(formDataToUse)
        initialFormDataRef.current = formDataToUse
      }
      setErrors({})
      setModifiedFields(new Set())
      if (!showVerification) {
        setVerifiedFields(new Set())
      }
    } else if (!open && wasOpen) {
      setFormData(initialFormData)
      setIssuerSearchQuery("")
      setPendingIssuerWebsiteUrl("")
      setErrors({})
      initialFormDataRef.current = null
      setModifiedFields(new Set())
      if (!showVerification) {
        setVerifiedFields(new Set())
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- issuers read on open only (not when list updates mid-dialog)
  }, [
    open,
    mode,
    certificationData,
    showVerification,
    initialName,
    initialIssuerName,
    initialIssuerWebsiteUrl,
    issuerIdsKey,
  ])

  const hasUnsavedChanges = useMemo(() => {
    if (!showVerification) return false
    return modifiedFields.size > 0 || verifiedFields.size > 0
  }, [showVerification, modifiedFields, verifiedFields])

  const handleDialogClose = (newOpen: boolean) => {
    if (!newOpen && hasUnsavedChanges) {
      setShowUnsavedWarning(true)
      return
    }
    setOpen(newOpen)
  }

  const handleInputChange = (field: keyof CertificationFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))

    if (showVerification) {
      setModifiedFields(prev => new Set(prev).add(field))
      setVerifiedFields(prev => new Set(prev).add(field))
    }

    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }))
    }
  }

  const handleIssuerSelect = (issuer: CertificationIssuer) => {
    setFormData(prev => ({
      ...prev,
      issuerId: issuer.id,
      issuerName: issuer.name,
    }))
    setIssuerPopoverOpen(false)
    setIssuerSearchQuery("")

    if (showVerification) {
      setModifiedFields(prev => new Set(prev).add("issuerId"))
      setVerifiedFields(prev => new Set(prev).add("issuerId"))
    }

    if (errors.issuerId) {
      setErrors(prev => ({ ...prev, issuerId: undefined }))
    }
  }

  const handleCreateIssuer = (name: string) => {
    setPendingIssuerName(name)
    setIssuerPopoverOpen(false)
    setCreateIssuerDialogOpen(true)
  }

  const handleIssuerPopoverOpenChange = (next: boolean) => {
    setIssuerPopoverOpen(next)
    if (next && formData.issuerName.trim() && !issuerSearchQuery.trim()) {
      setIssuerSearchQuery(formData.issuerName.trim())
    }
  }

  const handleIssuerCreated = async (issuerData: IssuerFormData) => {
    const newIssuer = await createCertificationIssuer({
      name: issuerData.name.trim(),
      websiteUrl: issuerData.websiteUrl.trim() || "",
    })

    setIssuerOptions(prev =>
      [...prev, newIssuer].sort((a, b) => a.name.localeCompare(b.name))
    )

    setFormData(prev => ({
      ...prev,
      issuerId: newIssuer.id,
      issuerName: newIssuer.name,
    }))
    setIssuerSearchQuery("")

    if (showVerification) {
      setModifiedFields(prev => new Set(prev).add("issuerId"))
      setVerifiedFields(prev => new Set(prev).add("issuerId"))
    }

    if (errors.issuerId) {
      setErrors(prev => ({ ...prev, issuerId: undefined }))
    }

    onIssuerCreated?.(newIssuer)
    toast.success(`Issuer "${issuerData.name}" created successfully.`)
    setCreateIssuerDialogOpen(false)
    setPendingIssuerName("")
    setPendingIssuerWebsiteUrl("")
  }

  const filteredIssuers = useMemo(() => {
    if (!issuerSearchQuery.trim()) return issuerOptions
    const query = issuerSearchQuery.toLowerCase().trim()
    return issuerOptions.filter(issuer =>
      issuer.name.toLowerCase().includes(query)
    )
  }, [issuerOptions, issuerSearchQuery])

  // Verification
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

  const calculateSectionProgress = (fieldNames: string[]): { percentage: number; verified: number; total: number } => {
    let verified = 0
    const total = fieldNames.length
    fieldNames.forEach(fieldName => {
      if (verifiedFields.has(fieldName)) verified++
    })
    const percentage = total > 0 ? Math.round((verified / total) * 100) : 0
    return { percentage, verified, total }
  }

  const getProgressColor = (percentage: number): string => {
    if (percentage === 100) return 'bg-green-500 hover:bg-green-600'
    if (percentage >= 70) return 'bg-yellow-500 hover:bg-yellow-600'
    return 'bg-red-500 hover:bg-red-600'
  }

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

  const basicInfoProgress = useMemo(() =>
    calculateSectionProgress(CERTIFICATION_VERIFICATION_FIELDS),
    [verifiedFields]
  )

  const verificationProgress = useMemo(() => {
    const totalFields = CERTIFICATION_VERIFICATION_FIELDS.length
    const verifiedCount = verifiedFields.size
    return Math.round((verifiedCount / totalFields) * 100)
  }, [verifiedFields])

  const getSectionFieldNames = (sectionId: string): string[] => {
    const fieldMap: Record<string, string[]> = {
      'basic-info': CERTIFICATION_VERIFICATION_FIELDS,
    }
    return fieldMap[sectionId] || []
  }

  const isSectionFullyVerified = (sectionId: string): boolean => {
    const sectionFields = getSectionFieldNames(sectionId)
    if (sectionFields.length === 0) return false
    return sectionFields.every(fieldName => verifiedFields.has(fieldName))
  }

  const handleVerifyAllSection = (sectionId: string, checked: boolean) => {
    const sectionFields = getSectionFieldNames(sectionId)
    setVerifiedFields(prev => {
      const newSet = new Set(prev)
      sectionFields.forEach(fieldName => {
        if (checked) newSet.add(fieldName)
        else newSet.delete(fieldName)
      })
      return newSet
    })
    if (checked) {
      setModifiedFields(prev => {
        const newSet = new Set(prev)
        sectionFields.forEach(fieldName => newSet.add(fieldName))
        return newSet
      })
    }
  }

  const VerificationCheckbox = ({
    fieldName,
  }: {
    fieldName: string
    label?: string
  }) => {
    if (!showVerification) return null
    const isChecked = verifiedFields.has(fieldName)
    return (
      <div className="flex items-center gap-1.5">
        <Checkbox
          id={`verify-${fieldName}`}
          checked={isChecked}
          onCheckedChange={(checked) => handleVerificationToggle(fieldName, checked === true)}
          className="h-4 w-4"
        />
        <Label
          htmlFor={`verify-${fieldName}`}
          className={`text-xs cursor-pointer ${isChecked ? 'text-green-600 dark:text-green-400 font-medium' : 'text-muted-foreground'}`}
        >
          {isChecked ? '✓ Mark as verified' : 'Mark as verified'}
        </Label>
      </div>
    )
  }

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev)
      if (newSet.has(section)) newSet.delete(section)
      else newSet.add(section)
      return newSet
    })
  }

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof CertificationFormData, string>> = {}

    if (!formData.certificationName.trim()) {
      newErrors.certificationName = "Certification name is required"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const submitCertification = async () => {
    if (!validateForm()) return

    setIsLoading(true)
    try {
      const verificationState: CertificationVerificationState | undefined = showVerification
        ? { verifiedFields, modifiedFields }
        : undefined

      await onSubmit?.(formData, verificationState)
      setFormData(initialFormData)
      setErrors({})
      setVerifiedFields(new Set())
      setModifiedFields(new Set())
      setOpen(false)
    } catch (error) {
      console.error(`Error ${mode === "edit" ? "updating" : "creating"} certification:`, error)
      toast.error(`Failed to ${mode === "edit" ? "update" : "create"} certification. Please try again.`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    // Portaled dialog forms are still React descendants of `#candidate-form`; stop bubbling submit.
    e.stopPropagation()
    await submitCertification()
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

  const getDialogTitle = () => {
    if (showVerification) return "Verify Certification"
    return mode === "edit" ? "Edit Certification" : "Create New Certification"
  }

  const getSubmitButtonText = () => {
    if (isLoading) {
      if (showVerification) return "Saving & Verifying..."
      return mode === "edit" ? "Updating..." : "Creating..."
    }
    if (showVerification) return "Update & Verify"
    return mode === "edit" ? "Update Certification" : "Create Certification"
  }

  return (
    <>
      <Dialog open={open} onOpenChange={handleDialogClose}>
        {mode === "create" && controlledOpen === undefined && (
          <DialogTrigger asChild>
            {children || (
              <Button className="transition-all duration-200 ease-in-out hover:scale-105 hover:shadow-md cursor-pointer">
                <Plus className="h-4 w-4" />
                Create Certification
              </Button>
            )}
          </DialogTrigger>
        )}

        <DialogContent className="sm:max-w-[500px] lg:max-w-[550px] max-h-[90vh] flex flex-col p-0 [&>button]:cursor-pointer">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-border">
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2">
                {showVerification && <ShieldCheck className="size-5 text-primary" />}
                {getDialogTitle()}
              </DialogTitle>
            </div>

            {showVerification && (
              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Verification Progress</span>
                  <Badge variant={verificationProgress === 100 ? 'default' : 'secondary'}>
                    {verificationProgress}% Complete ({verifiedFields.size}/{CERTIFICATION_VERIFICATION_FIELDS.length} fields)
                  </Badge>
                </div>
                <Progress value={verificationProgress} className="h-2" />
                <div className="flex gap-4 text-xs text-muted-foreground">
                  <span>{verifiedFields.size} verified</span>
                  <span>{CERTIFICATION_VERIFICATION_FIELDS.length - verifiedFields.size} remaining</span>
                  {modifiedFields.size > 0 && (
                    <span className="text-blue-600">{modifiedFields.size} modified</span>
                  )}
                </div>
              </div>
            )}
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 py-6">
            <form onSubmit={handleSubmit} className="space-y-4" id={formId}>

              <Collapsible
                open={expandedSections.has("basic-info")}
                onOpenChange={() => toggleSection("basic-info")}
              >
                <Card>
                  {/* asChild + div: avoid <button> wrapping Checkbox (also a button) — invalid HTML / hydration */}
                  <CollapsibleTrigger asChild>
                    <div className="w-full rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                      <CardHeader className="cursor-pointer hover:bg-accent/50 transition-colors py-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base flex items-center gap-2">
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
                                onPointerDown={(e) => e.stopPropagation()}
                              >
                                <Checkbox
                                  id="verify-all-basic-info"
                                  checked={isSectionFullyVerified("basic-info")}
                                  onCheckedChange={(checked) =>
                                    handleVerifyAllSection("basic-info", checked === true)
                                  }
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
                    <CardContent className="pt-0 space-y-4">
                      {/* Name */}
                      <div className="space-y-2">
                        <Label htmlFor="certificationName">Name *</Label>
                        <Input
                          id="certificationName"
                          type="text"
                          placeholder="AWS Certified Solutions Architect"
                          value={formData.certificationName}
                          onChange={(e) => handleInputChange("certificationName", e.target.value)}
                          className={errors.certificationName ? "border-red-500" : ""}
                        />
                        {errors.certificationName && (
                          <p className="text-sm text-red-500">{errors.certificationName}</p>
                        )}
                        {showVerification && (
                          <VerificationCheckbox fieldName="certificationName" />
                        )}
                      </div>

                      {/* Issuing Body Combobox */}
                      <div className="space-y-2">
                        <Label>Issuing Body</Label>
                        <Popover open={issuerPopoverOpen} onOpenChange={handleIssuerPopoverOpenChange}>
                          <PopoverTrigger asChild>
                            <Button
                              type="button"
                              variant="outline"
                              role="combobox"
                              aria-expanded={issuerPopoverOpen}
                              className={cn(
                                "w-full justify-between",
                                !formData.issuerName && "text-muted-foreground",
                                errors.issuerId && "border-red-500"
                              )}
                            >
                              {formData.issuerName ? (
                                <span className="flex items-center gap-2">
                                  <Building2 className="h-4 w-4 shrink-0" />
                                  {formData.issuerName}
                                </span>
                              ) : (
                                "Select issuing body..."
                              )}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent
                            className="w-[--radix-popover-trigger-width] p-0"
                            align="start"
                            onWheel={(e) => e.stopPropagation()}
                          >
                            <Command shouldFilter={false}>
                              <CommandInput
                                placeholder="Search issuers..."
                                value={issuerSearchQuery}
                                onValueChange={setIssuerSearchQuery}
                              />
                              <CommandList>
                                {issuersLoading ? (
                                  <CommandEmpty>
                                    <div className="flex items-center justify-center gap-2 py-2">
                                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                      <span className="text-sm text-muted-foreground">Loading issuers...</span>
                                    </div>
                                  </CommandEmpty>
                                ) : filteredIssuers.length === 0 && issuerSearchQuery.trim() ? (
                                  <>
                                    <CommandEmpty>No issuer found.</CommandEmpty>
                                    <CommandGroup>
                                      <CommandItem
                                        value={issuerSearchQuery}
                                        onSelect={() => handleCreateIssuer(issuerSearchQuery)}
                                        className="cursor-pointer font-medium text-primary"
                                      >
                                        <Plus className="mr-2 h-4 w-4" />
                                        Add New Issuer &quot;{issuerSearchQuery.trim()}&quot;
                                      </CommandItem>
                                    </CommandGroup>
                                  </>
                                ) : filteredIssuers.length === 0 ? (
                                  <CommandEmpty>Type to search...</CommandEmpty>
                                ) : (
                                  <CommandGroup>
                                    {filteredIssuers.map((issuer) => (
                                      <CommandItem
                                        key={issuer.id}
                                        value={String(issuer.id)}
                                        onSelect={() => handleIssuerSelect(issuer)}
                                        className="flex items-center gap-2"
                                      >
                                        <Check
                                          className={cn(
                                            "h-4 w-4",
                                            formData.issuerId === issuer.id ? "opacity-100" : "opacity-0"
                                          )}
                                        />
                                        <div className="flex-1">
                                          <div className="font-medium">{issuer.name}</div>
                                          {issuer.websiteUrl && (
                                            <div className="text-xs text-muted-foreground">
                                              {issuer.websiteUrl}
                                            </div>
                                          )}
                                        </div>
                                      </CommandItem>
                                    ))}
                                  </CommandGroup>
                                )}
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                        {errors.issuerId && (
                          <p className="text-sm text-red-500">{errors.issuerId}</p>
                        )}
                        {showVerification && (
                          <VerificationCheckbox fieldName="issuerId" />
                        )}
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Card>
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
              onClick={() => void submitCertification()}
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

      {/* Create Issuer Dialog */}
      <IssuerCreationDialog
        open={createIssuerDialogOpen}
        onOpenChange={(next) => {
          setCreateIssuerDialogOpen(next)
          if (!next) {
            setPendingIssuerName("")
            setPendingIssuerWebsiteUrl("")
          }
        }}
        onSubmit={handleIssuerCreated}
        initialName={pendingIssuerName}
        initialWebsiteUrl={pendingIssuerWebsiteUrl}
      />
    </>
  )
}
