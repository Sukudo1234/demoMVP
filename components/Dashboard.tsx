"use client"
import { useState, useEffect, useRef } from "react"
import type React from "react"
import FeaturePage from "./FeaturePage"
import { useRouter } from "next/navigation"

import {
  SparklesIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  BoltIcon,
  BellIcon,
  SpeakerWaveIcon,
  LanguageIcon,
  ChatBubbleBottomCenterTextIcon,
  ShareIcon,
  GlobeAltIcon,
  MusicalNoteIcon,
  ArrowTrendingUpIcon,
  FolderIcon,
  CubeIcon,
  ClockIcon,
  CogIcon,
} from "@heroicons/react/24/solid"

interface DashboardProps {
  workspaceName: string
  onBack?: () => void
}

export default function Dashboard({ workspaceName, onBack }: DashboardProps) {
  const router = useRouter()

  const [searchQuery, setSearchQuery] = useState("")
  const [showProfileSlideOver, setShowProfileSlideOver] = useState(false)
  const [currentPlaceholder, setCurrentPlaceholder] = useState(0)
  const [inputValue, setInputValue] = useState("")
  const [isDragOver, setIsDragOver] = useState(false)
  const [showStartProjectSlideOver, setShowStartProjectSlideOver] = useState(false)
  const [showChipSlideOver, setShowChipSlideOver] = useState<string | null>(null)
  const [showResults, setShowResults] = useState(false)
  const [hoveredItem, setHoveredItem] = useState<string | null>(null)
  const [showFlashDropdown, setShowFlashDropdown] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [modalUploadedFiles, setModalUploadedFiles] = useState<File[]>([])
  const [modalIsDragOver, setModalIsDragOver] = useState(false)
  const modalFileInputRef = useRef<HTMLInputElement>(null)

  const [selectedFeature, setSelectedFeature] = useState<string | null>(null)

  const placeholders = [
    'Generate 3 Instagram reel ideas about "coffee hacks" — include hook.',
    "Write 5 caption variants for a short product demo (concise, witty).",
    "Suggest a pipeline for a 10-min interview video to publish on YT and TikTok.",
    'Find trending hashtags for "fitness tips" on Instagram right now.',
    "Give me a 3-shot storyboard for a 30s tutorial clip.",
  ]

  const navigationItems = [
    { icon: FolderIcon, label: "Projects" },
    { icon: SparklesIcon, label: "Tools" },
    { icon: CubeIcon, label: "Assets" },
    { icon: ClockIcon, label: "Calendar" },
  ]

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentPlaceholder((prev) => (prev + 1) % placeholders.length)
    }, 4000)
    return () => clearInterval(interval)
  }, [])

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const files = Array.from(e.dataTransfer.files)
    setUploadedFiles((prev) => [...prev, ...files])
    console.log("[v0] Files dropped:", files.map((f) => f.name))
  }
  const handleUploadClick = () => fileInputRef.current?.click()
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setUploadedFiles((prev) => [...prev, ...files])
    console.log("[v0] Files selected:", files.map((f) => f.name))
  }
  const handleGetStarted = () => {
    setShowResults(true)
    console.log("[v0] Get started clicked - showing result cards")
  }

  const handleChipClick = (featureName: string) => {
    // ✅ Only change: route Enhance Audio to a real page
    if (featureName === "Enhance Audio") {
      router.push("/tools/enhance-audio")
      return
    }
    setSelectedFeature(featureName)
  }

  const handleBackToMain = () => setSelectedFeature(null)

  if (selectedFeature) {
    return <FeaturePage featureName={selectedFeature} onBack={handleBackToMain} />
  }

  return (
    <div className="min-h-screen flex bg-white">
      <div className="w-20 flex flex-col items-center py-4 space-y-6 sticky top-0 h-screen bg-gradient-to-b from-white to-gray-50/50">
        <div className="w-11 h-11 bg-gradient-to-br from-[#5765F2] to-[#4955E2] rounded-2xl flex items-center justify-center hover:rounded-xl hover:shadow-lg hover:scale-105 transition-all duration-300 cursor-pointer shadow-md">
          <span className="text-white font-bold text-base">S</span>
        </div>

        <div className="w-8 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>

        <div className="relative w-11 h-11 bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl flex items-center justify-center hover:bg-gradient-to-br hover:from-[#5765F2] hover:to-[#4955E2] hover:rounded-xl hover:shadow-lg hover:scale-105 transition-all duration-300 cursor-pointer group border-2 border-dashed border-gray-300 hover:border-white">
          <PlusIcon className="w-5 h-5 text-[#323339] group-hover:text-white transition-colors duration-300" />
          <div className="absolute left-full ml-3 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg whitespace-nowrap z-50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none shadow-lg">
            Add Project
          </div>
        </div>

        {navigationItems.map((item, index) => (
          <div
            key={index}
            className="relative w-11 h-11 bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl flex items-center justify-center hover:bg-gradient-to-br hover:from-[#5765F2] hover:to-[#4955E2] hover:rounded-xl hover:shadow-lg hover:scale-105 transition-all duration-300 cursor-pointer group"
          >
            <item.icon className="w-5 h-5 text-[#323339] group-hover:text-white transition-colors duration-300" />
            <div className="absolute left-full ml-3 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg whitespace-nowrap z-50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none shadow-lg">
              {item.label}
            </div>
          </div>
        ))}
      </div>

      <div className="flex-1 flex flex-col">
        <div className="px-8 py-4 bg-gradient-to-r from-white to-gray-50/30 sticky top-0 z-40 border-b border-gray-100 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div></div>
            <div className="relative max-w-lg w-full">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search projects, tools, contents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 text-sm bg-white/80 backdrop-blur-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#5765F2] focus:border-[#5765F2] text-center placeholder:text-center shadow-sm hover:shadow-md transition-all duration-300"
              />
            </div>
            <div className="flex items-center space-x-2">
              <button className="hover:bg-gradient-to-br hover:from-gray-100 hover:to-gray-200 transition-all duration-300 cursor-pointer p-2 rounded-xl hover:shadow-md hover:scale-105">
                <BellIcon className="w-5 h-5 text-[#323339]" />
              </button>
              <div className="relative">
                <button
                  onClick={() => setShowFlashDropdown(!showFlashDropdown)}
                  className="hover:bg-gradient-to-br hover:from-gray-100 hover:to-gray-200 transition-all duration-300 cursor-pointer p-2 rounded-xl hover:shadow-md hover:scale-105"
                >
                  <BoltIcon className="w-5 h-5 text-[#323339]" />
                </button>

                {showFlashDropdown && (
                  <div className="absolute right-0 top-full mt-2 w-48 bg-white/95 backdrop-blur-md border border-gray-200 rounded-xl shadow-xl z-50">
                    <div className="p-4 text-center text-gray-500 text-sm">No jobs yet</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 bg-[#FBFAFB] relative overflow-auto">
          <div className="max-w-6xl mx-auto px-8 py-8 pt-32 relative z-10">
            <div className="group bg-white rounded-[2.5rem] shadow-[0_8px_32px_rgba(87,101,242,0.08)] border border-gray-200 hover:border-gray-300 p-6 mb-12 transition-all duration-500 max-w-5xl mx-auto">
              <div className="flex items-stretch gap-6 h-48">
                <div className="flex-1 flex items-center">
                  <div
                    className={`w-full border-2 border-dashed rounded-[1.5rem] p-8 text-center transition-all duration-500 group-hover:scale-105 group-hover:rotate-1 group-hover:-translate-y-1 cursor-pointer ${
                      isDragOver
                        ? "border-[#5765F2] bg-gradient-to-br from-[#F5F5FF] to-[#EBEBFF] shadow-lg"
                        : "border-gray-300 group-hover:border-[#5765F2] group-hover:bg-gradient-to-br group-hover:from-[#F5F5FF] group-hover:to-[#EBEBFF] group-hover:shadow-xl"
                    }`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    style={{ borderStyle: "dashed", borderWidth: "3px", strokeDasharray: "20 20" }}
                  >
                    <div className="flex flex-col items-center">
                      <div className="relative mb-4">
                        <svg className="w-12 h-12 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        <svg className="absolute -top-1 -right-1 w-5 h-5 text-yellow-400" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 0l3.09 6.26L22 9.27l-6.91 3.01L12 24l-3.09-11.72L2 9.27l6.91-3.01L12 0z" />
                        </svg>
                      </div>
                      <p className="text-gray-700 group-hover:text-[#5765F2] group-hover:font-semibold transition-all duration-500 text-base font-medium">
                        Upload or drag & drop files to start
                      </p>
                    </div>
                    <input ref={fileInputRef} type="file" multiple hidden onChange={handleFileSelect} />
                  </div>
                </div>

                <div className="flex-1 flex flex-col justify-between py-2">
                  <div className="text-left">
                    <h2 className="text-2xl font-bold text-gray-900 mb-2 leading-tight">Localize & deliver at scale</h2>
                    <p className="text-gray-600 leading-relaxed text-base font-medium">
                      Fix audio, add subtitles, and export a version your audience will love.
                    </p>
                  </div>
                  <div className="mt-4">
                    <button
                      onClick={handleGetStarted}
                      className="w-full px-8 py-4 bg-gradient-to-r from-[#5765F2] to-[#4955E2] text-white rounded-xl font-semibold text-lg hover:from-[#4955E2] hover:to-[#3845D2] transition-all duration-300 shadow-lg"
                    >
                      <span>Get Started</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex flex-wrap justify-center gap-4">
                {[
                  { name: "Enhance Audio", icon: SpeakerWaveIcon, color: "text-purple-500" },
                  { name: "Translate & Transcribe", icon: LanguageIcon, color: "text-blue-500" },
                  { name: "Generate subtitles", icon: ChatBubbleBottomCenterTextIcon, color: "text-green-500" },
                  { name: "Create social clips", icon: ShareIcon, color: "text-orange-500" },
                ].map((chip, index) => (
                  <button
                    key={index}
                    onClick={() => handleChipClick(chip.name)}
                    className="group flex items-center space-x-2 px-10 py-5 bg-white border border-gray-200 rounded-2xl text-sm font-medium text-black hover:bg-gradient-to-r hover:from-[#EBEBFF] hover:to-[#F5F5FF] hover:border-[#5765F2] hover:text-black hover:scale-110 hover:-translate-y-2 transition-all duration-400 backdrop-blur-sm"
                  >
                    <chip.icon className={`w-4 h-4 ${chip.color} transition-colors duration-300`} />
                    <span className="group-hover:font-bold transition-all duration-300">{chip.name}</span>
                  </button>
                ))}
              </div>

              <div className="flex flex-wrap justify-center gap-4">
                {[
                  { name: "Multi language dubs", icon: GlobeAltIcon, color: "text-teal-500" },
                  { name: "Split vocals & music", icon: MusicalNoteIcon, color: "text-pink-500" },
                  { name: "Find trends", icon: ArrowTrendingUpIcon, color: "text-red-500" },
                ].map((chip, index) => (
                  <button
                    key={index}
                    onClick={() => handleChipClick(chip.name)}
                    className="group flex items-center space-x-2 px-10 py-5 bg-white border border-gray-200 rounded-2xl text-sm font-medium text-black hover:bg-gradient-to-r hover:from-[#EBEBFF] hover:to-[#F5F5FF] hover:border-[#5765F2] hover:text-black hover:scale-110 hover:-translate-y-2 transition-all duration-400 backdrop-blur-sm"
                  >
                    <chip.icon className={`w-4 h-4 ${chip.color} transition-colors duration-300`} />
                    <span className="group-hover:font-bold transition-all duration-300">{chip.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
