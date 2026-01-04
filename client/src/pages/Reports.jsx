import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import Breadcrumbs from '../components/Breadcrumbs'

export default function Reports() {
  const { isAdmin, isOfficer } = useAuth()
  const { error } = useToast()
  const [reportData, setReportData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('summary')

  useEffect(() => {
    fetchReportData()
  }, [])

  const fetchReportData = async () => {
    try {
      const token = localStorage.getItem('authToken')
      const response = await fetch('/api/reports?type=summary', {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        const data = await response.json()
        setReportData(data)
      }
    } catch (err) {
      error('Failed to load report data')
    } finally {
      setLoading(false)
    }
  }

  if (!isAdmin && !isOfficer) {
    return (
      <div className="space-y-6">
        <Breadcrumbs items={[
          { path: '/dashboard', label: 'Dashboard' },
          { path: '/reports', label: 'Reports' }
        ]} />
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold text-gray-900">Access Denied</h2>
          <p className="text-gray-600 mt-2">You do not have permission to view reports.</p>
        </div>
      </div>
    )
  }

  const summary = reportData?.summary || {}

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[
        { path: '/dashboard', label: 'Dashboard' },
        { path: '/reports', label: 'Reports' }
      ]} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
        <button
          onClick={() => fetchReportData()}
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
        >
          Refresh Data
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg p-6 border border-gray-200">
          <p className="text-sm text-gray-500">Total Applications</p>
          <p className="text-3xl font-bold text-gray-900">{summary.total || 0}</p>
        </div>
        <div className="bg-white rounded-lg p-6 border border-gray-200">
          <p className="text-sm text-gray-500">Submitted</p>
          <p className="text-3xl font-bold text-yellow-600">
            {summary.byStatus?.find(s => s.status === 'submitted')?.count || 0}
          </p>
        </div>
        <div className="bg-white rounded-lg p-6 border border-gray-200">
          <p className="text-sm text-gray-500">Accepted</p>
          <p className="text-3xl font-bold text-green-600">
            {summary.byStatus?.find(s => s.status === 'accepted')?.count || 0}
          </p>
        </div>
        <div className="bg-white rounded-lg p-6 border border-gray-200">
          <p className="text-sm text-gray-500">Rejected</p>
          <p className="text-3xl font-bold text-red-600">
            {summary.byStatus?.find(s => s.status === 'rejected')?.count || 0}
          </p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-4">
          {['summary', 'status', 'programs', 'timeline'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-3 px-1 border-b-2 font-medium text-sm capitalize transition-colors ${
                activeTab === tab
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>

      {/* Summary Tab */}
      {activeTab === 'summary' && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <p className="text-sm text-gray-500">Total Applications</p>
            <p className="text-3xl font-bold text-gray-900">{summary.total || 0}</p>
          </div>
          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <p className="text-sm text-gray-500">Under Review</p>
            <p className="text-3xl font-bold text-blue-600">
              {summary.byStatus?.find(s => s.status === 'under_review')?.count || 0}
            </p>
          </div>
          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <p className="text-sm text-gray-500">Draft</p>
            <p className="text-3xl font-bold text-gray-600">
              {summary.byStatus?.find(s => s.status === 'draft')?.count || 0}
            </p>
          </div>
          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <p className="text-sm text-gray-500">Completion Rate</p>
            <p className="text-3xl font-bold text-green-600">
              {summary.total > 0 ? Math.round(((summary.byStatus?.find(s => s.status === 'accepted')?.count || 0) / summary.total) * 100) : 0}%
            </p>
          </div>
        </div>
      )}

      {/* Status Breakdown */}
      {activeTab === 'status' && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Count</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Percentage</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {summary.byStatus?.map(item => {
                const percentage = summary.total
                  ? ((item.count / summary.total) * 100).toFixed(1)
                  : 0
                return (
                  <tr key={item.status}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        item.status === 'accepted' ? 'bg-green-100 text-green-800' :
                        item.status === 'rejected' ? 'bg-red-100 text-red-800' :
                        item.status === 'under_review' ? 'bg-blue-100 text-blue-800' :
                        item.status === 'submitted' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {item.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap font-medium">{item.count}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-24 bg-gray-200 rounded-full h-2 mr-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <span className="text-sm text-gray-600">{percentage}%</span>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Programs */}
      {activeTab === 'programs' && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Program</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Applications</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {summary.byProgram?.map((item, idx) => (
                <tr key={idx}>
                  <td className="px-6 py-4 whitespace-nowrap font-medium">{item.program}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                      {item.count}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Timeline */}
      {activeTab === 'timeline' && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Month</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Applications</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {summary.byMonth?.map((item, idx) => (
                <tr key={idx}>
                  <td className="px-6 py-4 whitespace-nowrap font-medium">
                    {new Date(item.month + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">{item.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}