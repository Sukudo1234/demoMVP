"use client"
import { useState, useRef } from "react"
import type React from "react"

import {
  SparklesIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  BellIcon,
  BoltIcon,
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
  ChevronRightIcon,
  HomeIcon,
} from "@heroicons/react/24/solid"

interface FeaturePageProps {
  featureName: string
  onBack: () => void
}

export default function FeaturePage({ featureName, onBack }: FeaturePageProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [showFlashDropdown, setShowFlashDropdown] = useState(false)
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([])
  const [isDragOver, setIsDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const navigationItems = [
    { icon: FolderIcon, label: "Projects", active: false },
    { icon: SparklesIcon, label: "Tools", active: true },
    { icon: CubeIcon, label: "Assets", active: false },
    { icon: ClockIcon, label: "Calendar", active: false },
  ]

  const getFeatureDescription = (name: string) => {
    switch (name) {
      case "Enhance Audio":
        return "Remove noise, echo, and background sounds while enhancing voice clarity and audio quality."
      case "Translate & Transcribe":
        return "Convert speech to text and translate content into multiple languages with high accuracy."
      case "Generate subtitles":
        return "Automatically create synchronized subtitles and captions for your video content."
      case "Create social clips":
        return "Transform long-form content into engaging short clips optimized for social media platforms."
      case "Multi language dubs":
        return "Generate natural-sounding voice dubbing in multiple languages while preserving emotion and tone."
      case "Split vocals & music":
        return "Separate vocal tracks from background music using advanced AI audio processing."
      case "Find trends":
        return "Discover trending topics, hashtags, and content ideas based on current social media data."
      default:
        return "Enhance your content with AI-powered tools and automation."
    }
  }

  const getFeatureIcon = (name: string) => {
    switch (name) {
      case "Enhance Audio":
        return (
          <div className="w-14 h-14 bg-white rounded-3xl flex items-center justify-center shadow-lg border border-gray-100">
            <div className="relative">
              <SpeakerWaveIcon className="w-7 h-7 text-[#5765F2]" />
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
                <SparklesIcon className="w-2 h-2 text-white" />
              </div>
            </div>
          </div>
        )
      case "Translate & Transcribe":
        return (
          <div className="w-14 h-14 bg-white rounded-3xl flex items-center justify-center shadow-lg border border-gray-100">
            <LanguageIcon className="w-7 h-7 text-[#5765F2]" />
          </div>
        )
      case "Generate subtitles":
        return (
          <div className="w-14 h-14 bg-white rounded-3xl flex items-center justify-center shadow-lg border border-gray-100">
            <ChatBubbleBottomCenterTextIcon className="w-7 h-7 text-[#5765F2]" />
          </div>
        )
      case "Create social clips":
        return (
          <div className="w-14 h-14 bg-white rounded-3xl flex items-center justify-center shadow-lg border border-gray-100">
            <ShareIcon className="w-7 h-7 text-[#5765F2]" />
          </div>
        )
      case "Multi language dubs":
        return (
          <div className="w-14 h-14 bg-white rounded-3xl flex items-center justify-center shadow-lg border border-gray-100">
            <GlobeAltIcon className="w-7 h-7 text-[#5765F2]" />
          </div>
        )
      case "Split vocals & music":
        return (
          <div className="w-14 h-14 bg-white rounded-3xl flex items-center justify-center shadow-lg border border-gray-100">
            <MusicalNoteIcon className="w-7 h-7 text-[#5765F2]" />
          </div>
        )
      case "Find trends":
        return (
          <div className="w-14 h-14 bg-white rounded-3xl flex items-center justify-center shadow-lg border border-gray-100">
            <ArrowTrendingUpIcon className="w-7 h-7 text-[#5765F2]" />
          </div>
        )
      default:
        return (
          <div className="w-14 h-14 bg-white rounded-3xl flex items-center justify-center shadow-lg border border-gray-100">
            <SparklesIcon className="w-7 h-7 text-[#5765F2]" />
          </div>
        )
    }
  }

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
  }

  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    setUploadedFiles((prev) => [...prev, ...files])
  }

  const removeFile = (indexToRemove: number) => {
    setUploadedFiles((prev) => prev.filter((_, index) => index !== indexToRemove))
  }

  return (
    <div className="min-h-screen flex bg-white">
      {/* Sidebar */}
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
            className={`relative w-11 h-11 rounded-2xl flex items-center justify-center hover:rounded-xl hover:shadow-lg hover:scale-105 transition-all duration-300 cursor-pointer group ${
              item.active
                ? "bg-gradient-to-br from-[#5765F2] to-[#4955E2] shadow-lg"
                : "bg-gradient-to-br from-gray-50 to-gray-100 hover:bg-gradient-to-br hover:from-[#5765F2] hover:to-[#4955E2]"
            }`}
          >
            <item.icon
              className={`w-5 h-5 transition-colors duration-300 ${
                item.active ? "text-white" : "text-[#323339] group-hover:text-white"
              }`}
            />
            <div className="absolute left-full ml-3 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg whitespace-nowrap z-50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none shadow-lg">
              {item.label}
            </div>
          </div>
        ))}
      </div>

      <div className="flex-1 flex flex-col">
        {/* Status Bar */}
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

        {/* Main Content */}
        <div className="flex-1 bg-[#FBFAFB] overflow-auto">
          <div className="max-w-3xl mx-auto px-8 py-8 relative z-10">
            {/* Breadcrumbs */}
            <div className="flex items-center space-x-3 text-lg text-gray-500 mb-8">
              <button onClick={onBack} className="hover:text-[#5765F2] transition-colors duration-200">
                <HomeIcon className="w-5 h-5" />
              </button>
              <ChevronRightIcon className="w-5 h-5" />
              <span className="hover:text-[#5765F2] transition-colors duration-200 cursor-pointer">Tools</span>
              <ChevronRightIcon className="w-5 h-5" />
              <span className="text-gray-900 font-medium">{featureName}</span>
            </div>

            {/* Feature Header */}
            <div className="text-left mb-12">
              <h1 className="text-3xl font-bold text-gray-900 mb-4">{featureName}</h1>
              <p className="text-lg text-gray-600 max-w-2xl leading-relaxed">{getFeatureDescription(featureName)}</p>
            </div>

            {/* Upload Section */}
            <div className="max-w-2xl mx-auto">
              <div
                className={`border-2 border-dashed rounded-3xl transition-all duration-300 cursor-pointer ${
                  isDragOver
                    ? "border-[#5765F2] bg-white shadow-xl border-[4px]"
                    : "border-[#5765F2] bg-white hover:shadow-xl hover:scale-[1.02] border-[4px]"
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={handleUploadClick}
                style={{
                  borderStyle: "dashed",
                  borderWidth: "4px",
                  strokeDasharray: "20 20",
                }}
              >
                <div className="flex items-center justify-between px-8 py-6">
                  <div className="text-left">
                    <p className="text-lg font-medium text-gray-700">Upload or drag & drop files</p>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleUploadClick()
                    }}
                    className="bg-gray-100 text-gray-700 border border-gray-300 px-6 py-3 rounded-xl font-medium hover:bg-gray-200 hover:border-gray-400 transition-all duration-300 shadow-sm hover:shadow-md"
                  >
                    Choose files
                  </button>
                </div>

                {/* File List */}
                {uploadedFiles.length > 0 && (
                  <div className="px-8 pb-6">
                    <div className="space-y-3 max-h-40 overflow-y-auto">
                      {uploadedFiles.map((file, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between bg-gray-50 rounded-xl p-4 border border-gray-200"
                        >
                          <span className="text-sm text-gray-700 truncate flex-1 font-medium">{file.name}</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              removeFile(index)
                            }}
                            className="ml-3 p-2 hover:bg-red-50 rounded-lg transition-colors duration-200 group"
                          >
                            <svg
                              className="w-4 h-4 text-gray-400 group-hover:text-red-500"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M6 18L18 6M6 6l12 12"
                              />
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>

                    {uploadedFiles.length > 0 && (
                      <div className="mt-6 text-center">
                        <button className="bg-gradient-to-r from-[#4955E2] to-[#5765F2] text-white px-8 py-3 rounded-xl font-medium hover:from-[#3d4ae0] hover:to-[#4955E2] shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300">
                          Get Started
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="audio/*,video/*"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>
    </div>
  )
}
