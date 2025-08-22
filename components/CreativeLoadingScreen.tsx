"use client"

import { useEffect, useState } from "react"

interface CreativeLoadingScreenProps {
  isOpen: boolean
  onComplete: () => void
}

export function CreativeLoadingScreen({ isOpen, onComplete }: CreativeLoadingScreenProps) {
  const [isBlinking, setIsBlinking] = useState(false)

  useEffect(() => {
    if (!isOpen) return

    const completeTimer = setTimeout(() => {
      onComplete()
    }, 3000)

    const blinkInterval = setInterval(() => {
      setIsBlinking(true)
      setTimeout(() => setIsBlinking(false), 150)
    }, 2000)

    return () => {
      clearTimeout(completeTimer)
      clearInterval(blinkInterval)
    }
  }, [isOpen, onComplete])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white">
      <div className="relative flex flex-col items-center justify-center">
        <div className="relative">
          {/* Face container with bouncing and squeezing animation */}
          <div className="animate-bounce">
            <div
              className="w-24 h-24 bg-[#5765F2] rounded-full relative transform transition-all duration-300 shadow-2xl"
              style={{
                animation: "bounce 1s infinite, squeeze 2s infinite ease-in-out",
                filter: "drop-shadow(0 8px 16px rgba(87, 101, 242, 0.3))",
              }}
            >
              {/* Eyes with blinking animation */}
              <div
                className={`absolute top-6 left-5 w-4 h-6 bg-white rounded-full transition-all duration-150 ${
                  isBlinking ? "h-1 top-8" : "h-6 top-6"
                }`}
              />
              <div
                className={`absolute top-6 right-5 w-4 h-6 bg-white rounded-full transition-all duration-150 ${
                  isBlinking ? "h-1 top-8" : "h-6 top-6"
                }`}
              />
            </div>
          </div>

          <div className="absolute inset-0">
            <div
              className="absolute -top-8 left-1/2 transform -translate-x-1/2 w-3 h-3 bg-[#5765F2] rounded-full animate-bounce opacity-60"
              style={{ animationDelay: "0.2s" }}
            />
            <div
              className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-[#5765F2] rounded-full animate-bounce opacity-40"
              style={{ animationDelay: "0.8s" }}
            />
            <div
              className="absolute top-1/2 -left-10 transform -translate-y-1/2 w-2 h-2 bg-[#5765F2] rounded-full animate-bounce opacity-50"
              style={{ animationDelay: "0.4s" }}
            />
            <div
              className="absolute top-1/2 -right-10 transform -translate-y-1/2 w-3 h-3 bg-[#5765F2] rounded-full animate-bounce opacity-30"
              style={{ animationDelay: "0.6s" }}
            />
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes squeeze {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(0.95) scaleY(1.05); }
        }
      `}</style>
    </div>
  )
}
