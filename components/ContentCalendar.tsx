"use client"

import type React from "react"
import { useState } from "react"
import { XMarkIcon, ChevronLeftIcon, ChevronRightIcon, ArrowTrendingUpIcon, EyeIcon } from "@heroicons/react/24/outline"

interface ContentCalendarProps {
  isOpen: boolean
  onClose: () => void
  platformSchedules: Record<string, { frequency: string; customCount?: number }>
  platforms: Array<{
    id: string
    name: string
    icon: React.ReactNode
    color: string
    accounts: Array<{ id: string; username: string }>
  }>
}

interface ScheduledPost {
  platformId: string
  platformName: string
  icon: React.ReactNode
  colorClass: string
  title: string
  type: "text" | "image" | "video"
  time: string
  predictedEngagement: number
  optimalTime: boolean
  contentTheme: string
  estimatedReach: number
  competitorActivity: "low" | "medium" | "high"
}

interface WeeklyInsights {
  totalPosts: number
  predictedReach: number
  engagementScore: number
  contentGaps: string[]
  topPerformingTime: string
  contentMix: { text: number; image: number; video: number }
}

export function ContentCalendar({ isOpen, onClose, platformSchedules, platforms }: ContentCalendarProps) {
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    const today = new Date()
    const dayOfWeek = today.getDay()
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
    const monday = new Date(today)
    monday.setDate(today.getDate() + mondayOffset)
    return monday
  })

  const getPlatformColorClass = (platformName: string): string => {
    const colorMap: Record<string, string> = {
      Twitter: "bg-black",
      LinkedIn: "bg-blue-600",
      Instagram: "bg-gradient-to-br from-purple-500 to-pink-500",
      Facebook: "bg-blue-500",
      YouTube: "bg-red-500",
      TikTok: "bg-black",
    }
    return colorMap[platformName] || "bg-gray-500"
  }

  const generatePostContent = (
    platformName: string,
    dayIndex: number,
    timeSlot: string,
  ): Omit<ScheduledPost, "platformId" | "icon" | "colorClass"> => {
    const contentTypes = ["text", "image", "video"] as const
    const themes = ["Product Update", "Behind the Scenes", "Educational", "Community", "Promotional"]
    const optimalTimes = ["9:00 AM", "12:00 PM", "6:00 PM"]

    const baseEngagement = platformName === "Instagram" ? 4.2 : platformName === "LinkedIn" ? 2.8 : 3.5
    const timeBonus = optimalTimes.includes(timeSlot) ? 1.3 : 1.0
    const predictedEngagement = Math.round((baseEngagement * timeBonus + Math.random() * 2) * 10) / 10

    return {
      platformName,
      title: `${themes[dayIndex % themes.length]} content`,
      type: contentTypes[dayIndex % contentTypes.length],
      time: timeSlot,
      predictedEngagement,
      optimalTime: optimalTimes.includes(timeSlot),
      contentTheme: themes[dayIndex % themes.length],
      estimatedReach: Math.floor(Math.random() * 5000) + 1000,
      competitorActivity: dayIndex % 3 === 0 ? "high" : dayIndex % 2 === 0 ? "medium" : "low",
    }
  }

  const getPostsPerWeek = (frequency: string, customCount?: number): number => {
    switch (frequency) {
      case "Daily":
        return 7
      case "3× week":
        return 3
      case "Weekly":
        return 1
      case "2× month":
        return 0.5
      case "Monthly":
        return 0.25
      case "Custom":
        return customCount || 1
      default:
        return 0
    }
  }

  const generateWeeklyPosts = () => {
    const weekDays = []
    const dayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]
    const timeSlots = ["9:00 AM", "12:00 PM", "3:00 PM", "6:00 PM"]

    for (let i = 0; i < 6; i++) {
      const date = new Date(currentWeekStart)
      date.setDate(currentWeekStart.getDate() + i)

      const scheduledPosts: ScheduledPost[] = []

      Object.entries(platformSchedules).forEach(([platformId, schedule]) => {
        const platform = platforms.find((p) => p.id === platformId && p.accounts.length > 0)
        if (!platform) return

        const postsPerWeek = getPostsPerWeek(schedule.frequency, schedule.customCount)
        let postsToday = 0

        if (postsPerWeek >= 7) {
          postsToday = Math.floor(postsPerWeek / 7)
        } else if (postsPerWeek >= 3) {
          if (i === 0 || i === 2 || i === 4) postsToday = 1
        } else if (postsPerWeek >= 1) {
          if (i === 2) postsToday = 1
        } else if (postsPerWeek >= 0.5) {
          if (date.getDate() <= 15 && i === 2) postsToday = 1
        }

        if (postsPerWeek >= 7) {
          postsToday = Math.min(3, Math.floor(postsPerWeek / 7))
        }

        for (let j = 0; j < postsToday; j++) {
          const timeSlot = timeSlots[(i + j) % timeSlots.length]
          const postContent = generatePostContent(platform.name, i + j, timeSlot)
          scheduledPosts.push({
            platformId: platform.id,
            icon: platform.icon,
            colorClass: getPlatformColorClass(platform.name),
            ...postContent,
          })
        }
      })

      weekDays.push({
        date,
        dayName: dayNames[i],
        scheduledPosts,
      })
    }

    return weekDays
  }

  const calculateWeeklyInsights = (weeklyPosts: any[]): WeeklyInsights => {
    const allPosts = weeklyPosts.flatMap((day) => day.scheduledPosts)
    const totalPosts = allPosts.length
    const predictedReach = allPosts.reduce((sum, post) => sum + post.estimatedReach, 0)
    const avgEngagement = allPosts.reduce((sum, post) => sum + post.predictedEngagement, 0) / totalPosts || 0

    const contentMix = allPosts.reduce(
      (acc, post) => {
        acc[post.type]++
        return acc
      },
      { text: 0, image: 0, video: 0 },
    )

    const gaps = []
    if (contentMix.video < 2) gaps.push("More video content needed")
    if (totalPosts < 10) gaps.push("Increase posting frequency")
    if (allPosts.filter((p) => p.optimalTime).length < totalPosts * 0.6)
      gaps.push("Schedule more posts at optimal times")

    return {
      totalPosts,
      predictedReach,
      engagementScore: Math.round(avgEngagement * 10) / 10,
      contentGaps: gaps,
      topPerformingTime: "12:00 PM",
      contentMix,
    }
  }

  const navigateWeek = (direction: "prev" | "next") => {
    setCurrentWeekStart((prev) => {
      const newDate = new Date(prev)
      newDate.setDate(prev.getDate() + (direction === "prev" ? -7 : 7))
      return newDate
    })
  }

  if (!isOpen) return null

  const weeklyPosts = generateWeeklyPosts()
  const insights = calculateWeeklyInsights(weeklyPosts)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center text-white shadow-lg">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 002-2H5a2 2 0 002 2z"
                />
              </svg>
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Content Calendar</h1>
              <p className="text-sm text-gray-500">Strategic content planning with performance insights</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-xl transition-all duration-150"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Weekly insights dashboard */}
        <div className="p-6 bg-gradient-to-r from-purple-50 to-blue-50 border-b border-gray-100">
          <div className="grid grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{insights.totalPosts}</div>
              <div className="text-sm text-gray-600">Posts This Week</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{insights.predictedReach.toLocaleString()}</div>
              <div className="text-sm text-gray-600">Predicted Reach</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{insights.engagementScore}%</div>
              <div className="text-sm text-gray-600">Avg. Engagement</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{insights.topPerformingTime}</div>
              <div className="text-sm text-gray-600">Peak Time</div>
            </div>
          </div>

          {insights.contentGaps.length > 0 && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="text-sm font-medium text-yellow-800 mb-1">💡 Optimization Tips:</div>
              <div className="text-sm text-yellow-700">{insights.contentGaps.join(" • ")}</div>
            </div>
          )}
        </div>

        {/* Week Navigation */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <button
            onClick={() => navigateWeek("prev")}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-xl transition-all duration-150"
          >
            <ChevronLeftIcon className="w-5 h-5" />
          </button>
          <h2 className="text-lg font-semibold text-gray-900">
            Week of {currentWeekStart.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </h2>
          <button
            onClick={() => navigateWeek("next")}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded-xl transition-all duration-150"
          >
            <ChevronRightIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-6 gap-4 h-full">
            {weeklyPosts.map((day, dayIndex) => (
              <div key={dayIndex} className="flex flex-col">
                {/* Day header */}
                <div className="text-center mb-4">
                  <div className="text-sm font-semibold text-gray-900 mb-1">{day.dayName}</div>
                  <div className="text-2xl font-bold text-gray-800">{day.date.getDate()}</div>
                  {/* Daily activity indicator */}
                  <div className="flex justify-center mt-1">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        day.scheduledPosts.length > 2
                          ? "bg-green-400"
                          : day.scheduledPosts.length > 0
                            ? "bg-yellow-400"
                            : "bg-gray-200"
                      }`}
                    ></div>
                  </div>
                </div>

                {/* Content posts */}
                <div className="space-y-3 flex-1">
                  {day.scheduledPosts.map((post, postIndex) => (
                    <div
                      key={postIndex}
                      className={`bg-white border rounded-lg p-3 shadow-sm hover:shadow-md transition-all duration-200 ${
                        post.optimalTime ? "border-green-200 bg-green-50" : "border-gray-200"
                      }`}
                    >
                      <div className="space-y-2 mb-3">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="text-xs font-medium text-gray-600">{post.contentTheme}</div>
                          {post.optimalTime && (
                            <div className="w-2 h-2 bg-green-400 rounded-full" title="Optimal posting time"></div>
                          )}
                        </div>
                        <div className="h-2 bg-gray-300 rounded-full"></div>
                        <div className="h-2 bg-gray-200 rounded-full w-4/5"></div>
                        <div className="h-1.5 bg-gray-100 rounded-full w-3/5"></div>
                      </div>

                      {/* Platform icon and content type */}
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <div
                            className={`w-6 h-6 rounded-lg flex items-center justify-center text-white text-xs ${post.colorClass}`}
                          >
                            {post.icon}
                          </div>
                          <div
                            className={`w-3 h-3 rounded-full ${
                              post.type === "video"
                                ? "bg-green-400"
                                : post.type === "image"
                                  ? "bg-blue-400"
                                  : "bg-gray-400"
                            }`}
                          ></div>
                        </div>
                        <span className="text-xs text-gray-500">{post.time}</span>
                      </div>

                      {/* Performance metrics */}
                      <div className="space-y-2 mb-3">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1 text-gray-600">
                            <ArrowTrendingUpIcon className="w-3 h-3" />
                            <span>{post.predictedEngagement}%</span>
                          </div>
                          <div className="flex items-center gap-1 text-gray-600">
                            <EyeIcon className="w-3 h-3" />
                            <span>{(post.estimatedReach / 1000).toFixed(1)}k</span>
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-xs">
                          <span
                            className={`px-2 py-1 rounded-full text-xs ${
                              post.competitorActivity === "low"
                                ? "bg-green-100 text-green-700"
                                : post.competitorActivity === "medium"
                                  ? "bg-yellow-100 text-yellow-700"
                                  : "bg-red-100 text-red-700"
                            }`}
                          >
                            {post.competitorActivity} competition
                          </span>
                        </div>
                      </div>

                      {/* Status bars */}
                      <div className="flex gap-1">
                        <div className="h-1 bg-orange-400 rounded-full flex-1"></div>
                        <div className="h-1 bg-yellow-400 rounded-full flex-1"></div>
                        <div className="h-1 bg-green-400 rounded-full flex-1"></div>
                      </div>
                    </div>
                  ))}

                  {/* Content gap indicator */}
                  {day.scheduledPosts.length === 0 && (
                    <div className="border-2 border-dashed border-gray-200 rounded-lg p-4 text-center">
                      <div className="text-gray-400 text-sm">No content scheduled</div>
                      <div className="text-xs text-gray-300 mt-1">Consider adding posts</div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
