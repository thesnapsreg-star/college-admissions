import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import Breadcrumbs from '../components/Breadcrumbs'

export default function Dashboard() {
  const { user, isAdmin, isOfficer, isApplicant } = useAuth()
  const [stats, setStats] = useState({
    totalApplications: 0,
    pendingReview: 0,
    accepted: 0,
    rejected: 0
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Fetch dashboard stats
    const fetchStats = async () => {
      try {
        const token = localStorage.getItem('authToken')
        const response = await fetch('/api/dashboard/stats', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        if (response.ok) {
          const data = await response.json()
          setStats(data)
        }
      } catch (error) {
        console.error('Failed to fetch stats:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  const getWelcomeMessage = () => {
    if (isAdmin) return 'Admin Dashboard'
    if (isOfficer) return 'Admissions Officer Dashboard'
    if (isApplicant) return 'My Applications'
    return 'Dashboard'
  }

  const getSummaryCards = () => {
    if (isAdmin || isOfficer) {
      return [
        { label: 'Total Applications', value: stats.totalApplications, color: 'blue', icon: '📋' },
        { label: 'Pending Review', value: stats.pendingReview, color: 'yellow', icon: '⏳' },
        { label: 'Accepted', value: stats.accepted, color: 'green', icon: '✅' },
        { label: 'Rejected', value: stats.rejected, color: 'red', icon: '❌' }
      ]
    }
    if (isApplicant) {
      return [
        { label: 'My Applications', value: stats.totalApplications, color: 'blue', icon: '📄' },
        { label: 'Under Review', value: stats.pendingReview, color: 'yellow', icon: '🔍' },
        { label: 'Accepted', value: stats.accepted, color: 'green', icon: '🎉' },
        { label: 'Rejected', value: stats.rejected, color: 'red', icon: '📉' }
      ]
    }
    return []
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[
        { path: '/dashboard', label: 'Dashboard' }
      ]} />

      {/* Welcome header */}
      <div className="bg-white rounded-lg p-6 border border-gray-200">
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {user?.name || 'User'}!
        </h1>
        <p className="text-gray-600 mt-1">
          {getWelcomeMessage()}
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {getSummaryCards().map((card, index) => (
          <div
            key={index}
            className={`bg-white rounded-lg p-6 border border-gray-200 hover:shadow-md transition-shadow`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">{card.label}</p>
                {loading ? (
                  <div className="h-8 w-16 bg-gray-200 animate-pulse rounded mt-2"></div>
                ) : (
                  <p className="text-3xl font-bold text-gray-900 mt-1">{card.value}</p>
                )}
              </div>
              <span className="text-3xl">{card.icon}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent activity or quick links */}
        <div className="bg-white rounded-lg p-6 border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Quick Actions
          </h2>
          <div className="space-y-3">
            {isApplicant && (
              <>
                <Link to="/applications/new" className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                  <span className="text-xl">+</span>
                  <span className="text-gray-700">New Application</span>
                </Link>
                <Link to="/programs" className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                  <span className="text-xl">🎓</span>
                  <span className="text-gray-700">Browse Programs</span>
                </Link>
                <Link to="/documents" className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                  <span className="text-xl">📁</span>
                  <span className="text-gray-700">Upload Documents</span>
                </Link>
              </>
            )}
            {(isAdmin || isOfficer) && (
              <>
                <Link to="/applications" className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                  <span className="text-xl">📋</span>
                  <span className="text-gray-700">Review Applications</span>
                </Link>
                <Link to="/reviews" className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                  <span className="text-xl">📝</span>
                  <span className="text-gray-700">My Reviews</span>
                </Link>
                {isAdmin && (
                  <Link to="/reports" className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 transition-colors">
                    <span className="text-xl">📊</span>
                    <span className="text-gray-700">View Reports</span>
                  </Link>
                )}
              </>
            )}
          </div>
        </div>

        {/* Help / Info */}
        <div className="bg-white rounded-lg p-6 border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Need Help?
          </h2>
          <div className="space-y-3">
            <div className="p-3 rounded-lg bg-gray-50">
              <p className="text-sm font-medium text-gray-900">📚 Documentation</p>
              <p className="text-xs text-gray-600 mt-1">Read the user guide for detailed instructions</p>
            </div>
            <div className="p-3 rounded-lg bg-gray-50">
              <p className="text-sm font-medium text-gray-900">❓ FAQ</p>
              <p className="text-xs text-gray-600 mt-1">Find answers to common questions</p>
            </div>
            <div className="p-3 rounded-lg bg-gray-50">
              <p className="text-sm font-medium text-gray-900">📧 Contact Support</p>
              <p className="text-xs text-gray-600 mt-1">Get help from our support team</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}