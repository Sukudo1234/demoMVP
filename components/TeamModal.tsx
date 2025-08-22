"use client"

import { useEffect } from "react"

interface TeamModalProps {
  isOpen: boolean
  onClose: () => void
  onCreateWorkspace: () => void
  onJoinWorkspace: () => void
  onSkip: () => void
}

export function TeamModal({ isOpen, onClose, onCreateWorkspace, onJoinWorkspace, onSkip }: TeamModalProps) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose()
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
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-3xl shadow-2xl max-w-md w-full p-8 animate-in fade-in zoom-in-95 duration-200">
        {/* Team indicator */}
        <div className="flex items-center gap-2 mb-6">
          <div className="w-3 h-3 bg-green-500 rounded-full"></div>
          <span className="text-sm font-medium text-gray-600">Team</span>
        </div>

        {/* Content */}
        <div className="space-y-6">
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-gray-900">Create a workspace for your team.</h2>
            <p className="text-gray-500">Invite people, Connect channels.</p>
          </div>

          {/* Action buttons */}
          <div className="space-y-4">
            <button
              onClick={onCreateWorkspace}
              className="w-full bg-[#5765F2] hover:bg-[#4654E1] text-white font-semibold py-4 px-6 rounded-2xl transition-all duration-200 hover:scale-[1.02] hover:shadow-lg active:scale-[0.98]"
            >
              Create a workspace
            </button>

            <button
              onClick={onJoinWorkspace}
              className="w-full text-gray-900 font-medium py-3 px-6 rounded-xl hover:bg-gray-50 transition-all duration-200 hover:scale-[1.01]"
            >
              Join a workspace
            </button>
          </div>
        </div>

        {/* Skip link */}
        <button
          onClick={onSkip}
          className="absolute bottom-6 right-6 text-sm text-gray-400 hover:text-gray-600 transition-colors duration-150 flex items-center gap-1"
        >
          Skip
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  )
}
