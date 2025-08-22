/**
 * LandingHero - First screen UI component for workflow app
 *
 * Props:
 * - onSelect(roleKey: 'solo'|'team'|'studio'): void - Called when user selects a role
 * - onSkip(): void - Called when user clicks skip link
 *
 * Keyboard shortcuts:
 * - 1: Select Solo
 * - 2: Select Team
 * - 3: Select Studio
 * - Tab: Navigate between buttons
 * - Enter/Space: Select focused button
 */

"use client"

import { useEffect, useState } from "react"
import { RoleButton } from "./RoleButton"
import { TeamModal } from "./TeamModal"
import { WorkspaceSetup } from "./WorkspaceSetup"
import Dashboard from "./Dashboard"
import { useRolePicker } from "../hooks/useRolePicker"

interface LandingHeroProps {
  onSelect: (roleKey: "solo" | "team" | "studio") => void
  onSkip: () => void
}

export default function LandingHero({ onSelect, onSkip }: LandingHeroProps) {
  const [showTeamModal, setShowTeamModal] = useState(false)
  const [showWorkspaceSetup, setShowWorkspaceSetup] = useState(false)
  const [showDashboard, setShowDashboard] = useState(false)
  const [workspaceName, setWorkspaceName] = useState("")

  const { handleSelect } = useRolePicker({
    onSelect: (roleKey) => {
      console.log("[v0] Role selected:", roleKey)
      if (roleKey === "team") {
        console.log("[v0] Setting showTeamModal to true")
        setShowTeamModal(true)
      } else {
        onSelect(roleKey)
      }
    },
  })

  useEffect(() => {
    console.log("[v0] showTeamModal changed to:", showTeamModal)
  }, [showTeamModal])

  useEffect(() => {
    console.log("[v0] LandingHero mounted")
    // Ensure modal is closed on mount
    setShowTeamModal(false)
  }, [])

  const handleCreateWorkspace = () => {
    setShowTeamModal(false)
    setShowWorkspaceSetup(true)
  }

  const handleJoinWorkspace = () => {
    setShowTeamModal(false)
    onSelect("team")
  }

  const handleModalSkip = () => {
    setShowTeamModal(false)
    onSkip()
  }

  const handleWorkspaceBack = () => {
    setShowWorkspaceSetup(false)
    setShowTeamModal(true)
  }

  const handleWorkspaceCreate = (name: string) => {
    setWorkspaceName(name)
    setShowWorkspaceSetup(false)
    setShowDashboard(true)
  }

  const handleDashboardBack = () => {
    setShowDashboard(false)
    setShowWorkspaceSetup(true)
  }

  if (showDashboard) {
    return <Dashboard workspaceName={workspaceName} onBack={handleDashboardBack} />
  }

  return (
    <>
      <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 animate-in fade-in duration-200 relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-50"
          style={{
            backgroundImage: `
              linear-gradient(to right, #F2F2F2 1px, transparent 1px),
              linear-gradient(to bottom, #F2F2F2 1px, transparent 1px)
            `,
            backgroundSize: "70px 70px",
          }}
        />

        <div className="absolute inset-0 w-full h-full pointer-events-none z-20">
          {/* Ideate - top left, overlapping title from above */}
          <div className="absolute left-1/2 top-1/2 transform -translate-x-[320px] -translate-y-[200px] -rotate-12 scale-105">
            <div className="bg-orange-100 text-orange-800 px-4 py-2 rounded-2xl text-sm font-semibold border border-orange-200 shadow-lg flex items-center gap-2 animate-bounce">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
                  clipRule="evenodd"
                />
              </svg>
              Ideate
            </div>
          </div>

          {/* Automate - top center, overlapping title from above */}
          <div className="absolute left-1/2 top-1/2 transform translate-x-[-6px] -translate-y-[220px] rotate-8 scale-100">
            <div className="bg-green-100 text-green-800 px-4 py-2 rounded-xl text-sm font-medium border border-green-200 shadow-md flex items-center gap-2 hover:scale-105 transition-transform animate-pulse">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z"
                  clipRule="evenodd"
                />
              </svg>
              Automate
            </div>
          </div>

          {/* Publish - moved significantly upwards and rightwards */}
          <div className="absolute left-1/2 top-1/2 transform translate-x-[240px] -translate-y-[161px] -rotate-8 scale-90">
            <div className="bg-blue-100 text-blue-800 px-3 py-2 rounded-xl text-sm font-medium border border-blue-200 shadow-md flex items-center gap-2 hover:rotate-0 transition-transform animate-stroke-loop">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 015.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z"
                  clipRule="evenodd"
                />
              </svg>
              Publish
            </div>
          </div>

          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 1200 800" fill="none">
            <path
              d="M200 280 Q400 260, 600 300 Q800 340, 1000 320"
              stroke="hsl(var(--muted-foreground))"
              strokeWidth="2"
              strokeDasharray="8,6"
              opacity="0.3"
              fill="none"
            />
            <path
              d="M150 480 Q350 440, 600 480 Q850 520, 1050 500"
              stroke="hsl(var(--muted-foreground))"
              strokeWidth="1.5"
              strokeDasharray="6,4"
              opacity="0.2"
              fill="none"
            />
          </svg>
        </div>

        {/* Main hero content */}
        <div className="flex flex-col items-center text-center max-w-2xl mx-auto space-y-8 lg:space-y-12 relative z-10">
          {/* Hero headline */}
          <div className="space-y-4">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-none">
              We stitch your workflows together.
            </h1>
          </div>

          {/* Role picker section */}
          <div className="w-full max-w-md space-y-6">
            <p className="text-muted-foreground text-lg font-bold">How do you work?</p>

            <div role="radiogroup" aria-label="Select your work style" className="space-y-3">
              <RoleButton label="Solo" hoverText="Just me!" roleKey="solo" onSelect={handleSelect} tiltAngle={2} />
              <RoleButton
                label="Team"
                hoverText="Small team, shared flow!"
                roleKey="team"
                onSelect={handleSelect}
                tiltAngle={-1}
              />
              <RoleButton
                label="Studio"
                hoverText="Big team, lots of projects!"
                roleKey="studio"
                onSelect={handleSelect}
                tiltAngle={3}
              />
            </div>
          </div>
        </div>

        {/* Skip link */}
        <button
          onClick={onSkip}
          className="absolute bottom-8 right-8 text-sm text-muted-foreground hover:text-foreground transition-colors duration-150 underline underline-offset-4 z-10"
        >
          Skip
        </button>
      </div>

      <TeamModal
        isOpen={showTeamModal}
        onClose={() => setShowTeamModal(false)}
        onCreateWorkspace={handleCreateWorkspace}
        onJoinWorkspace={handleJoinWorkspace}
        onSkip={handleModalSkip}
      />

      <WorkspaceSetup
        isOpen={showWorkspaceSetup}
        onClose={() => setShowWorkspaceSetup(false)}
        onBack={handleWorkspaceBack}
        onCreateWorkspace={handleWorkspaceCreate}
      />
    </>
  )
}
