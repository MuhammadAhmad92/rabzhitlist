"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { CandidateFormData } from "@/components/candidate-creation-dialog"
import { isMeaningfulFormChange } from "@/lib/candidate/candidate-draft-payload"
import {
  clearCandidateDraftLocal,
  readCandidateDraftLocal,
  writeCandidateDraftLocal,
} from "@/lib/utils/candidate-draft-local-storage"

const LOCAL_THROTTLE_MS = 400

export interface UseCandidateDraftSyncOptions {
  enabled: boolean
  userStorageKey: string
  formData: CandidateFormData
}

export interface UseCandidateDraftSyncResult {
  lastSavedAt: string | null
  hasChangesSinceFlush: boolean
  flushLocal: () => void
  clearDraftSession: () => void
  resetBaselineFromCurrentForm: () => void
}

export function useCandidateDraftSync({
  enabled,
  userStorageKey,
  formData,
}: UseCandidateDraftSyncOptions): UseCandidateDraftSyncResult {
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null)

  const formRef = useRef(formData)
  formRef.current = formData

  const lastFlushedJsonRef = useRef("")
  const localTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const resetBaselineFromCurrentForm = useCallback(() => {
    lastFlushedJsonRef.current = JSON.stringify(formRef.current)
  }, [])

  const flushLocal = useCallback(() => {
    if (!enabled) return
    if (!isMeaningfulFormChange(formRef.current)) return

    const savedAt = new Date().toISOString()
    writeCandidateDraftLocal(userStorageKey, {
      formSnapshot: formRef.current,
      savedAt,
    })
    lastFlushedJsonRef.current = JSON.stringify(formRef.current)
    setLastSavedAt(savedAt)
  }, [enabled, userStorageKey])

  const clearDraftSession = useCallback(() => {
    if (localTimerRef.current) clearTimeout(localTimerRef.current)
    clearCandidateDraftLocal(userStorageKey)
    lastFlushedJsonRef.current = ""
    setLastSavedAt(null)
  }, [userStorageKey])

  useEffect(() => {
    if (!enabled) {
      if (localTimerRef.current) clearTimeout(localTimerRef.current)
      return
    }

    const stored = readCandidateDraftLocal(userStorageKey)
    if (stored?.savedAt) {
      setLastSavedAt(stored.savedAt)
    }

    if (localTimerRef.current) clearTimeout(localTimerRef.current)
    localTimerRef.current = setTimeout(() => {
      flushLocal()
    }, LOCAL_THROTTLE_MS)

    return () => {
      if (localTimerRef.current) clearTimeout(localTimerRef.current)
    }
  }, [enabled, formData, flushLocal, userStorageKey])

  const hasChangesSinceFlush = useMemo(() => {
    if (!enabled) return false
    return JSON.stringify(formData) !== lastFlushedJsonRef.current
  }, [enabled, formData])

  return {
    lastSavedAt,
    hasChangesSinceFlush,
    flushLocal,
    clearDraftSession,
    resetBaselineFromCurrentForm,
  }
}

export function readLocalDraftForUser(userStorageKey: string) {
  return readCandidateDraftLocal(userStorageKey)
}
