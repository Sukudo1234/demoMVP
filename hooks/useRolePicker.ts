"use client"

import { useCallback, useRef, useEffect } from "react"

interface UseRolePickerProps {
  onSelect: (roleKey: "solo" | "team" | "studio") => void
}

export function useRolePicker({ onSelect }: UseRolePickerProps) {
  const hasUserInteracted = useRef(false)

  useEffect(() => {
    console.log("[v0] useRolePicker initialized")
  }, [])

  const handleSelect = useCallback(
    (roleKey: "solo" | "team" | "studio") => {
      console.log("[v0] Processing role selection:", roleKey)
      onSelect(roleKey)
    },
    [onSelect],
  )

  const handleButtonClick = useCallback(
    (roleKey: "solo" | "team" | "studio") => {
      hasUserInteracted.current = true
      console.log("[v0] Button clicked for role:", roleKey)
      handleSelect(roleKey)
    },
    [handleSelect],
  )

  return {
    handleSelect: handleButtonClick,
  }
}
