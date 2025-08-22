"use client"

import { useState } from "react"
import { cn } from "../lib/utils"

interface RoleButtonProps {
  label: string
  roleKey: "solo" | "team" | "studio"
  hoverText: string
  onSelect: (roleKey: "solo" | "team" | "studio") => void
  tiltAngle?: number // Added tiltAngle prop for different tilt angles
}

export function RoleButton({ label, roleKey, hoverText, onSelect, tiltAngle = 1 }: RoleButtonProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [isPressed, setIsPressed] = useState(false)

  const handleClick = () => {
    console.log("[v0] RoleButton clicked:", roleKey)
    setIsPressed(true)
    onSelect(roleKey)

    // Analytics hook
    if (typeof window !== "undefined" && (window as any).appEvents) {
      ;(window as any).appEvents.push({
        event: "role.selected",
        role: roleKey,
      })
    }
  }

  const displayText = isHovered ? hoverText : label

  return (
    <button
      role="button"
      aria-pressed={isPressed}
      aria-label={`Select ${label} - ${hoverText}`}
      className={cn(
        "w-full px-6 py-2.5 rounded-2xl text-lg font-medium",
        "transition-all duration-200 ease-out",
        "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",

        "border border-border",
        "transform-gpu",

        // Default state - custom color #EBEBFF
        !isHovered && "text-slate-700",

        isHovered && ["scale-105 -translate-y-1", "shadow-lg shadow-indigo-200/50", "text-white"],

        // Active/pressed state
        isPressed && "scale-95",
      )}
      style={{
        backgroundColor: isHovered ? "#5765F2" : "#EBEBFF",
        transform: isHovered ? `rotate(${tiltAngle}deg) scale(1.05) translateY(-4px)` : undefined,
        animation: isHovered ? "jiggle 0.6s ease-in-out" : undefined,
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onFocus={() => setIsHovered(true)}
      onBlur={() => setIsHovered(false)}
      onClick={handleClick}
    >
      {displayText}
    </button>
  )
}
