"use client"

// Render Dashboard as a pure client page to avoid SSR hydration mismatches.
import dynamic from "next/dynamic"

// Adjust the relative path if your folder differs.
const Dashboard = dynamic(() => import("../../components/Dashboard"), { ssr: false })

export default function DashboardPage() {
  // You can pass a name if Dashboard expects it; it’s optional in your code.
  return <Dashboard workspaceName="Sukudo" />
}
