"use client"

import type React from "react"
import { ContentCalendar } from "./ContentCalendar"
import { CreativeLoadingScreen } from "./CreativeLoadingScreen" // Added import for loading screen component

import { useState, useRef, useEffect } from "react"
import {
  ChevronDownIcon,
  ChevronUpIcon,
  PaperAirplaneIcon,
  PencilIcon,
  XMarkIcon,
  CheckCircleIcon,
  PlusIcon,
} from "@heroicons/react/24/outline"

interface WorkspaceSetupProps {
  isOpen: boolean
  onClose: () => void
  onBack: () => void
  onCreateWorkspace: (workspaceName: string) => void // Updated to pass workspace name
}

interface ConnectedAccount {
  id: string
  username: string
  avatar?: string
  isConnected: boolean
}

interface Platform {
  id: string
  name: string
  icon: React.ReactNode
  color: string
  brandColor: string
  accounts: ConnectedAccount[]
}

// Modern SVG icons for social platforms
const TwitterIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
)

const LinkedInIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
  </svg>
)

const InstagramIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.69-.07-4.85-.07-3.204 0-3.584-.012-4.849-.07-4.358-.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.073 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.403-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.057-1.69-.073-4.949-.073zm0-2.163c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
  </svg>
)

const FacebookIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
)

const YouTubeIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
  </svg>
)

const TikTokIcon = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
    <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
  </svg>
)

const initialPlatforms: Platform[] = [
  {
    id: "twitter",
    name: "Twitter",
    icon: <TwitterIcon />,
    color: "bg-slate-900",
    brandColor: "#000000",
    accounts: [],
  },
  {
    id: "linkedin",
    name: "LinkedIn",
    icon: <LinkedInIcon />,
    color: "bg-blue-600",
    brandColor: "#0A66C2",
    accounts: [],
  },
  {
    id: "instagram",
    name: "Instagram",
    icon: <InstagramIcon />,
    color: "bg-gradient-to-br from-purple-600 via-pink-600 to-orange-400",
    brandColor: "#E4405F",
    accounts: [],
  },
  {
    id: "facebook",
    name: "Facebook",
    icon: <FacebookIcon />,
    color: "bg-blue-600",
    brandColor: "#1877F2",
    accounts: [],
  },
  {
    id: "youtube",
    name: "YouTube",
    icon: <YouTubeIcon />,
    color: "bg-red-600",
    brandColor: "#FF0000",
    accounts: [],
  },
  {
    id: "tiktok",
    name: "TikTok",
    icon: <TikTokIcon />,
    color: "bg-slate-900",
    brandColor: "#000000",
    accounts: [],
  },
]

const frequencies = ["Daily", "3× week", "Weekly", "2× month", "Monthly", "Irregular", "Custom"]

export function WorkspaceSetup({ isOpen, onClose, onBack, onCreateWorkspace }: WorkspaceSetupProps) {
  const [workspaceName, setWorkspaceName] = useState("Sukudo Studio's Workspace")
  const [isEditingName, setIsEditingName] = useState(false)
  const [tempName, setTempName] = useState(workspaceName)
  const [email, setEmail] = useState("")
  const [invitedEmails, setInvitedEmails] = useState<string[]>([])
  const [platforms, setPlatforms] = useState<Platform[]>(initialPlatforms)
  const [platformFrequencies, setPlatformFrequencies] = useState<Record<string, string>>({})
  const [customFrequencies, setCustomFrequencies] = useState<Record<string, number>>({})
  const [openSections, setOpenSections] = useState({
    invite: true,
    platforms: false,
    frequency: false,
  })
  const [connectingPlatform, setConnectingPlatform] = useState<string | null>(null)
  const [showCalendar, setShowCalendar] = useState(false)
  const [isCreatingWorkspace, setIsCreatingWorkspace] = useState(false)

  const nameInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isEditingName && nameInputRef.current) {
      nameInputRef.current.focus()
      nameInputRef.current.select()
    }
  }, [isEditingName])

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (isEditingName) {
          setIsEditingName(false)
          setTempName(workspaceName)
        } else {
          onClose()
        }
      }
    }

    if (isOpen) {
      document.addEventListener("keydown", handleEscape)
      document.body.style.overflow = "hidden"
    }

    return () => {
      document.removeEventListener("keydown", handleEscape)
      document.body.style.overflow = "unset"
    }
  }, [isOpen, onClose, isEditingName, workspaceName])

  const handleNameSave = () => {
    setWorkspaceName(tempName.trim() || workspaceName)
    setIsEditingName(false)
  }

  const handleNameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleNameSave()
    } else if (e.key === "Escape") {
      setIsEditingName(false)
      setTempName(workspaceName)
    }
  }

  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  }

  const handleEmailSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (isValidEmail(email) && !invitedEmails.includes(email)) {
      setInvitedEmails([...invitedEmails, email])
      setEmail("")
    }
  }

  const handleEmailKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault()
      handleEmailSubmit(e)
    }
  }

  const removeInvitedEmail = (emailToRemove: string) => {
    setInvitedEmails(invitedEmails.filter((email) => email !== emailToRemove))
  }

  const handleFrequencyChange = (platformId: string, frequency: string) => {
    setPlatformFrequencies((prev) => ({ ...prev, [platformId]: frequency }))
  }

  const toggleSection = (section: keyof typeof openSections) => {
    setOpenSections((prev) => ({ ...prev, [section]: !prev[section] }))
  }

  const simulateOAuthConnection = async (platformId: string): Promise<ConnectedAccount> => {
    // Simulate OAuth flow delay
    await new Promise((resolve) => setTimeout(resolve, 1500))

    // Mock account data based on platform
    const mockAccounts: Record<string, ConnectedAccount> = {
      twitter: { id: `${platformId}_${Date.now()}`, username: "@john_doe", isConnected: true },
      linkedin: { id: `${platformId}_${Date.now()}`, username: "John Doe", isConnected: true },
      instagram: { id: `${platformId}_${Date.now()}`, username: "@johndoe_creative", isConnected: true },
      facebook: { id: `${platformId}_${Date.now()}`, username: "John Doe", isConnected: true },
      youtube: { id: `${platformId}_${Date.now()}`, username: "John's Channel", isConnected: true },
      tiktok: { id: `${platformId}_${Date.now()}`, username: "@johndoe", isConnected: true },
    }

    return (
      mockAccounts[platformId] || {
        id: `${platformId}_${Date.now()}`,
        username: "Connected Account",
        isConnected: true,
      }
    )
  }

  const handleConnectPlatform = async (platformId: string) => {
    setConnectingPlatform(platformId)

    try {
      // In a real app, this would trigger OAuth flow
      const newAccount = await simulateOAuthConnection(platformId)

      setPlatforms((prev) =>
        prev.map((platform) =>
          platform.id === platformId ? { ...platform, accounts: [...platform.accounts, newAccount] } : platform,
        ),
      )
    } catch (error) {
      console.error("Failed to connect platform:", error)
    } finally {
      setConnectingPlatform(null)
    }
  }

  const handleDisconnectAccount = (platformId: string, accountId: string) => {
    setPlatforms((prev) =>
      prev.map((platform) =>
        platform.id === platformId
          ? { ...platform, accounts: platform.accounts.filter((acc) => acc.id !== accountId) }
          : platform,
      ),
    )
  }

  const getConnectedPlatforms = () => {
    return platforms.filter((platform) => platform.accounts.length > 0)
  }

  const hasConnectedPlatformsWithSchedule = () => {
    return getConnectedPlatforms().some((platform) => platformFrequencies[platform.id])
  }

  const handleCreateWorkspace = async () => {
    setIsCreatingWorkspace(true)
    // The loading screen will handle the delay and call onCreateWorkspace
  }

  const handleLoadingComplete = () => {
    setIsCreatingWorkspace(false)
    onCreateWorkspace(workspaceName)
  }

  if (!isOpen) return null

  return (
    <>
      <CreativeLoadingScreen isOpen={isCreatingWorkspace} onComplete={handleLoadingComplete} />

      {!isCreatingWorkspace && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={onClose} />

          {/* Modal */}
          <div className="relative bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-100 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-gradient-to-br from-[#5765F2] to-[#4654E1] rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-lg">
                  S
                </div>
                <div className="flex items-center gap-2">
                  {isEditingName ? (
                    <input
                      ref={nameInputRef}
                      value={tempName}
                      onChange={(e) => setTempName(e.target.value)}
                      onBlur={handleNameSave}
                      onKeyDown={handleNameKeyDown}
                      className="text-sm font-medium text-gray-600 bg-transparent border-b-2 border-[#5765F2] outline-none min-w-0"
                    />
                  ) : (
                    <button
                      onClick={() => setIsEditingName(true)}
                      className="text-sm font-medium text-gray-600 hover:text-[#5765F2] transition-colors"
                    >
                      {workspaceName}
                    </button>
                  )}
                  <button
                    onClick={() => setIsEditingName(true)}
                    className="p-1.5 text-gray-400 hover:text-[#5765F2] hover:bg-[#5765F2]/10 rounded-lg transition-all duration-150 hover:scale-110"
                  >
                    <PencilIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-xl transition-all duration-150"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              <div className="p-6 pt-3 space-y-4">
                {/* Invite team members */}
                <div className="space-y-4">
                  <button
                    onClick={() => toggleSection("invite")}
                    className="flex items-center justify-between w-full text-left p-4 hover:bg-gradient-to-r hover:from-[#5765F2]/5 hover:to-transparent rounded-2xl transition-all duration-200 group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                        <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z"
                          />
                        </svg>
                      </div>
                      <div>
                        <h2 className="text-lg font-bold text-gray-900 group-hover:text-[#5765F2] transition-colors">
                          Invite team members
                        </h2>
                        <p className="text-sm text-gray-500">Collaborate with your team</p>
                      </div>
                    </div>
                    {openSections.invite ? (
                      <ChevronUpIcon className="w-5 h-5 text-gray-400 group-hover:text-[#5765F2] transition-colors" />
                    ) : (
                      <ChevronDownIcon className="w-5 h-5 text-gray-400 group-hover:text-[#5765F2] transition-colors" />
                    )}
                  </button>

                  {openSections.invite && (
                    <div className="space-y-4 px-3 animate-in slide-in-from-top-2 duration-200">
                      <form onSubmit={handleEmailSubmit} className="relative">
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          onKeyDown={handleEmailKeyDown}
                          placeholder="Enter email address and press Enter"
                          className="w-full px-5 py-4 pr-14 bg-gray-50 border-2 border-transparent focus:border-[#5765F2] focus:bg-white rounded-xl outline-none transition-all duration-200 text-gray-900 placeholder-gray-500"
                        />
                        <button
                          type="submit"
                          disabled={!isValidEmail(email)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-[#5765F2] disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-150 hover:scale-110"
                        >
                          <PaperAirplaneIcon className="w-5 h-5" />
                        </button>
                      </form>

                      {invitedEmails.length > 0 && (
                        <div className="space-y-3">
                          <h4 className="text-sm font-semibold text-gray-700">Invited members:</h4>
                          <div className="flex flex-wrap gap-2">
                            {invitedEmails.map((email, index) => (
                              <div
                                key={index}
                                className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-[#5765F2]/10 to-[#5765F2]/5 text-[#5765F2] rounded-full text-sm font-medium border border-[#5765F2]/20"
                              >
                                <span>{email}</span>
                                <button
                                  onClick={() => removeInvitedEmail(email)}
                                  className="hover:bg-[#5765F2]/20 rounded-full p-0.5 transition-colors"
                                >
                                  <XMarkIcon className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Connect platforms */}
                <div className="space-y-4">
                  <button
                    onClick={() => toggleSection("platforms")}
                    className="flex items-center justify-between w-full text-left p-4 hover:bg-gradient-to-r hover:from-[#5765F2]/5 hover:to-transparent rounded-2xl transition-all duration-200 group"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                          />
                        </svg>
                      </div>
                      <div>
                        <h2 className="text-lg font-bold text-gray-900 group-hover:text-[#5765F2] transition-colors">
                          Connect platforms
                        </h2>
                        <p className="text-sm text-gray-500">
                          {getConnectedPlatforms().length > 0
                            ? `${getConnectedPlatforms().reduce((total, platform) => total + platform.accounts.length, 0)} accounts connected`
                            : "Link your social media accounts"}
                        </p>
                      </div>
                    </div>
                    {openSections.platforms ? (
                      <ChevronUpIcon className="w-5 h-5 text-gray-400 group-hover:text-[#5765F2] transition-colors" />
                    ) : (
                      <ChevronDownIcon className="w-5 h-5 text-gray-400 group-hover:text-[#5765F2] transition-colors" />
                    )}
                  </button>

                  {openSections.platforms && (
                    <div className="px-3 animate-in slide-in-from-top-2 duration-200">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {platforms.map((platform) => (
                          <div
                            key={platform.id}
                            className="group p-4 bg-white border border-gray-200 rounded-xl hover:border-gray-300 hover:shadow-sm transition-all duration-200 self-start"
                          >
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-3">
                                <div
                                  className={`w-10 h-10 rounded-xl flex items-center justify-center text-white ${platform.color} shadow-sm`}
                                >
                                  {platform.icon}
                                </div>
                                <div>
                                  <h3 className="font-semibold text-gray-900 text-sm">{platform.name}</h3>
                                  <p className="text-xs text-gray-500">
                                    {platform.accounts.length === 0
                                      ? "Not connected"
                                      : `${platform.accounts.length} connected`}
                                  </p>
                                </div>
                              </div>
                              <button
                                onClick={() => handleConnectPlatform(platform.id)}
                                disabled={connectingPlatform === platform.id}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-[#5765F2] hover:text-white text-gray-700 text-xs font-medium rounded-lg transition-all duration-150 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed group-hover:bg-gray-200"
                              >
                                {connectingPlatform === platform.id ? (
                                  <>
                                    <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                                    <span>Connecting</span>
                                  </>
                                ) : (
                                  <>
                                    <PlusIcon className="w-3 h-3" />
                                    <span>Connect</span>
                                  </>
                                )}
                              </button>
                            </div>

                            {/* Connected Accounts */}
                            {platform.accounts.length > 0 && (
                              <div className="space-y-2">
                                {platform.accounts.map((account) => (
                                  <div
                                    key={account.id}
                                    className="flex items-center justify-between p-2 bg-emerald-50 border border-emerald-200 rounded-lg"
                                  >
                                    <div className="flex items-center gap-2">
                                      <CheckCircleIcon className="w-4 h-4 text-emerald-600" />
                                      <div>
                                        <p className="font-medium text-gray-900 text-xs">{account.username}</p>
                                        <p className="text-xs text-emerald-600">Active</p>
                                      </div>
                                    </div>
                                    <button
                                      onClick={() => handleDisconnectAccount(platform.id, account.id)}
                                      className="text-red-500 hover:text-red-700 text-xs font-medium transition-colors"
                                    >
                                      Remove
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Posting frequency */}
                {getConnectedPlatforms().length > 0 && (
                  <div className="space-y-4">
                    <button
                      onClick={() => toggleSection("frequency")}
                      className="flex items-center justify-between w-full text-left p-4 hover:bg-gradient-to-r hover:from-[#5765F2]/5 hover:to-transparent rounded-2xl transition-all duration-200 group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                          <svg
                            className="w-5 h-5 text-purple-600"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                            />
                          </svg>
                        </div>
                        <div>
                          <h2 className="text-lg font-bold text-gray-900 group-hover:text-[#5765F2] transition-colors">
                            Posting schedule
                          </h2>
                          <p className="text-sm text-gray-500">Set frequency for each platform</p>
                        </div>
                      </div>
                      {openSections.frequency ? (
                        <ChevronUpIcon className="w-5 h-5 text-gray-400 group-hover:text-[#5765F2] transition-colors" />
                      ) : (
                        <ChevronDownIcon className="w-5 h-5 text-gray-400 group-hover:text-[#5765F2] transition-colors" />
                      )}
                    </button>

                    {openSections.frequency && (
                      <div className="px-3 space-y-3 animate-in slide-in-from-top-2 duration-200">
                        {getConnectedPlatforms().map((platform) => {
                          const selectedFreq = platformFrequencies[platform.id]

                          return (
                            <div
                              key={platform.id}
                              className="p-4 bg-gradient-to-r from-gray-50 to-gray-50/50 rounded-xl space-y-3 border border-gray-100"
                            >
                              <div className="flex items-center gap-3">
                                <div
                                  className={`w-8 h-8 rounded-lg flex items-center justify-center text-white ${platform.color}`}
                                >
                                  {platform.icon}
                                </div>
                                <div>
                                  <h3 className="font-semibold text-gray-900 text-sm">{platform.name}</h3>
                                  <p className="text-xs text-gray-500">
                                    {platform.accounts.length} connected account
                                    {platform.accounts.length > 1 ? "s" : ""}
                                  </p>
                                </div>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {frequencies.map((freq) => (
                                  <button
                                    key={freq}
                                    onClick={() => handleFrequencyChange(platform.id, freq)}
                                    className={`px-3 py-2 rounded-lg text-xs font-medium transition-all duration-150 hover:scale-105 ${
                                      selectedFreq === freq
                                        ? "bg-[#5765F2] text-white shadow-md"
                                        : "bg-white text-gray-600 hover:bg-[#5765F2]/10 hover:text-[#5765F2] border border-gray-200"
                                    }`}
                                  >
                                    {freq}
                                  </button>
                                ))}
                              </div>
                              {selectedFreq === "Custom" && (
                                <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200">
                                  <input
                                    type="number"
                                    min="1"
                                    max="50"
                                    value={customFrequencies[platform.id] || 1}
                                    onChange={(e) =>
                                      setCustomFrequencies((prev) => ({
                                        ...prev,
                                        [platform.id]: Number.parseInt(e.target.value) || 1,
                                      }))
                                    }
                                    className="w-16 px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none focus:border-[#5765F2] focus:ring-2 focus:ring-[#5765F2]/20"
                                  />
                                  <span className="text-sm text-gray-600 font-medium">posts per week</span>
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Content Calendar Section */}
                {hasConnectedPlatformsWithSchedule() && (
                  <div className="px-3 pb-3">
                    <div className="p-6 bg-gradient-to-br from-purple-50 to-indigo-50 rounded-2xl border border-purple-100">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center text-white shadow-lg">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                              />
                            </svg>
                          </div>
                          <div>
                            <h3 className="text-lg font-bold text-gray-900">
                              Schedule content with your Content Calendar
                            </h3>
                            <p className="text-sm text-gray-600">
                              Visualize your posting schedule across all platforms
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => setShowCalendar(true)}
                          className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 hover:scale-105 hover:shadow-lg active:scale-95 shadow-md"
                        >
                          Open Calendar
                        </button>
                      </div>

                      {/* Mini Calendar Preview */}
                      <div className="mt-4 grid grid-cols-7 gap-1">
                        {["S", "M", "T", "W", "T", "F", "S"].map((day, index) => (
                          <div key={index} className="text-center text-xs font-medium text-gray-500 py-1">
                            {day}
                          </div>
                        ))}
                        {Array.from({ length: 14 }, (_, i) => {
                          const hasPost = getConnectedPlatforms().some((platform) => {
                            const freq = platformFrequencies[platform.id]
                            if (freq === "3× week") return i % 2 === 0 && i < 6
                            if (freq === "Daily") return i < 7
                            if (freq === "Weekly") return i === 2
                            return false
                          })

                          return (
                            <div
                              key={i}
                              className={`aspect-square rounded text-xs flex items-center justify-center ${
                                hasPost
                                  ? "bg-gradient-to-br from-purple-400 to-purple-500 text-white font-medium"
                                  : "bg-white border border-gray-200 text-gray-400"
                              }`}
                            >
                              {i + 1}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between p-6 border-t border-gray-100 bg-gradient-to-r from-gray-50/50 to-white flex-shrink-0">
              <button
                onClick={onBack}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 font-semibold transition-colors duration-150 hover:scale-105"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Back
              </button>
              <button
                onClick={handleCreateWorkspace} // Updated to use loading handler
                className="bg-gradient-to-r from-[#5765F2] to-[#4654E1] hover:from-[#4654E1] hover:to-[#3543D0] text-white font-bold py-3 px-8 rounded-2xl transition-all duration-200 hover:scale-[1.02] hover:shadow-xl active:scale-[0.98] jiggle-hover shadow-lg"
              >
                Create workspace ✨
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Content Calendar Modal */}
      <ContentCalendar
        isOpen={showCalendar}
        onClose={() => setShowCalendar(false)}
        platformSchedules={platformFrequencies}
        platforms={platforms}
      />
    </>
  )
}
