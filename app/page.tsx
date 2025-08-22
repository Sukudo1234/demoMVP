"use client"

import LandingHero from "../components/LandingHero"

export default function HomePage() {
  const handleRoleSelect = (roleKey: "solo" | "team" | "studio") => {
    console.log("Role selected:", roleKey)
    // TODO: Navigate to next step in flow
  }

  const handleSkip = () => {
    console.log("User skipped role selection")
    // TODO: Handle skip action
  }

  return <LandingHero onSelect={handleRoleSelect} onSkip={handleSkip} />
}
