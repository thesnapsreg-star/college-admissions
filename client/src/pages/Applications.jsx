import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import Breadcrumbs from '../components/Breadcrumbs'
import Pagination from '../components/Pagination'
import EmptyState from '../components/EmptyState'

const ITEMS_PER_PAGE = 10

export default function Applications() {
  const { user, isAdmin, isOfficer } = useAuth()
  const { success, error: showError } = useToast()
  const navigate = useNavigate()
  const [applications, setApplications] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [deleting, setDeleting] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalCount, setTotalCount] = useState(0)
  const [exporting, setExporting] = useState(false)
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [bulkAction, setBulkAction] = useState('')
  const [bulkProcessing, setBulkProcessing] = useState(false)

  useEffect(() => {
    fetchApplications()
  }, [filter, currentPage])

  useEffect(() => {
    // Debounce search
    const timer = setTimeout(() => {
      setCurrentPage(1)
      fetchApplications()
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  const fetchApplications = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem('authToken')
      const params = new URLSearchParams()

      // Only add status filter if not 'all' and for admin/officer
      if (isAdmin || isOfficer) {
        if (filter !== 'all') {
          params.append('status', filter)
        }
      }

      if (search) {
        params.append('search', search)
      }

      // Pagination
      params.append('page', currentPage)
      params.append('limit', ITEMS_PER_PAGE)

      const url = `/api/applications?${params.toString()}`

      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        const data = await response.json()
        setApplications(data.applications || [])
        setTotalCount(data.pagination?.total || data.total || 0)
      }
    } catch (error) {
      console.error('Failed to fetch applications:', error)
      error('Failed to load applications')
    } finally {
      setLoading(false)
    }
  }

  const getStatusBadge = (status) => {
    const styles = {
      draft: 'bg-gray-100 text-gray-800',
      submitted: 'bg-yellow-100 text-yellow-800',
      under_review: 'bg-blue-100 text-blue-800',
      accepted: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800'
    }
    return styles[status] || 'bg-gray-100 text-gray-800'
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric'
    })
  }

  const toggleSelection = (id) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === applications.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(applications.map(a => a.id)))
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this application? This action cannot be undone.')) {
      return
    }

    setDeleting(id)
    try {
      const token = localStorage.getItem('authToken')
      const response = await fetch(`/api/applications/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        success('Application deleted successfully')
        fetchApplications()
        // Clear selection if deleted item was selected
        if (selectedIds.has(id)) {
          setSelectedIds(prev => {
            const newSet = new Set(prev)
            newSet.delete(id)
            return newSet
          })
        }
      } else {
        const data = await response.json()
        error(data.message || 'Failed to delete application')
      }
    } catch (err) {
      error('An error occurred. Please try again.')
    } finally {
      setDeleting(null)
    }
  }

  const handleBulkAction = async () => {
    if (selectedIds.size === 0) {
      showError('Please select at least one application')
      return
    }

    if (!bulkAction) {
      showError('Please select an action')
      return
    }

    const confirmMessages = {
      accept: 'Are you sure you want to accept all selected applications?',
      reject: 'Are you sure you want to reject all selected applications?',
      delete: 'Are you sure you want to delete all selected applications? This action cannot be undone.'
    }

    if (!window.confirm(confirmMessages[bulkAction])) {
      return
    }

    setBulkProcessing(true)
    const token = localStorage.getItem('authToken')

    try {
      if (bulkAction === 'delete') {
        // Delete applications one by one
        const deletePromises = Array.from(selectedIds).map(id =>
          fetch(`/api/applications/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
          })
        )
        await Promise.all(deletePromises)
        success(`${selectedIds.size} applications deleted successfully`)
      } else {
        // Update status for applications
        const updatePromises = Array.from(selectedIds).map(id =>
          fetch(`/api/applications/${id}/status`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ status: bulkAction })
          })
        )
        const responses = await Promise.all(updatePromises)
        const failed = responses.filter(r => !r.ok).length
        if (failed > 0) {
          showError(`${failed} applications failed to update`)
        } else {
          success(`${selectedIds.size} applications updated to ${bulkAction}`)
        }
      }

      setSelectedIds(new Set())
      setBulkAction('')
      fetchApplications()
    } catch (err) {
      error('An error occurred during bulk operation')
    } finally {
      setBulkProcessing(false)
    }
  }

  const handleExport = async (format = 'csv') => {
    setExporting(true)
    try {
      const token = localStorage.getItem('authToken')
      const params = new URLSearchParams({ format })
      if (filter !== 'all') {
        params.append('status', filter)
      }

      const response = await fetch(`/api/applications/export?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `applications-${Date.now()}.${format === 'csv' ? 'csv' : 'json'}`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
        success(`Applications exported as ${format.toUpperCase()}`)
      } else {
        showError('Failed to export applications')
      }
    } catch (err) {
      showError('An error occurred during export')
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[
        { path: '/dashboard', label: 'Dashboard' },
        { path: '/applications', label: 'Applications' }
      ]} />

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Applications</h1>
        <div className="flex gap-3">
          {(isAdmin || isOfficer) && (
            <div className="flex gap-2">
              <button
                onClick={() => handleExport('csv')}
                disabled={exporting}
                className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {exporting ? (
                  <span className="animate-spin">⟳</span>
                ) : (
                  <span>↓</span>
                )}
                Export CSV
              </button>
              <button
                onClick={() => handleExport('json')}
                disabled={exporting}
                className="px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50"
              >
                Export JSON
              </button>
            </div>
          )}
          {(isAdmin || isOfficer) && (
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Status</option>
              <option value="draft">Draft</option>
              <option value="submitted">Submitted</option>
              <option value="under_review">Under Review</option>
              <option value="accepted">Accepted</option>
              <option value="rejected">Rejected</option>
            </select>
          )}
          <Link to="/applications/new" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            + New Application
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Applications', value: totalCount, color: 'blue' },
          { label: 'Pending Review', value: applications.filter(a => a.status === 'submitted' || a.status === 'under_review').length, color: 'yellow' },
          { label: 'Accepted', value: applications.filter(a => a.status === 'accepted').length, color: 'green' },
          { label: 'Rejected', value: applications.filter(a => a.status === 'rejected').length, color: 'red' },
        ].map((stat, i) => (
          <div key={i} className="bg-white rounded-lg p-4 border border-gray-200">
            <p className="text-sm text-gray-500">{stat.label}</p>
            <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="card p-4">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
            <input
              type="text"
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Applications Table */}
      <div className="card overflow-hidden">
        {/* Bulk Selection Bar */}
        {(isAdmin || isOfficer) && selectedIds.size > 0 && (
          <div className="bg-blue-50 px-4 py-3 border-b border-blue-200 flex items-center justify-between">
            <span className="text-sm text-blue-700">
              {selectedIds.size} application{selectedIds.size !== 1 ? 's' : ''} selected
            </span>
            <div className="flex items-center gap-3">
              <select
                value={bulkAction}
                onChange={(e) => setBulkAction(e.target.value)}
                className="px-3 py-1 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select action...</option>
                <option value="accept">Accept</option>
                <option value="reject">Reject</option>
                <option value="delete">Delete</option>
              </select>
              <button
                onClick={handleBulkAction}
                disabled={!bulkAction || bulkProcessing}
                className="px-3 py-1 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {bulkProcessing ? 'Processing...' : 'Apply'}
              </button>
              <button
                onClick={() => setSelectedIds(new Set())}
                className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
              >
                Clear
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-500">Loading...</p>
          </div>
        ) : applications.length === 0 ? (
          <EmptyState
            icon="📋"
            title="No applications found"
            description={search ? "Try adjusting your search criteria" : "Get started by creating your first application"}
            action={!search && (
              <Link to="/applications/new" className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                + New Application
              </Link>
            )}
          />
        ) : (
          <>
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {(isAdmin || isOfficer) && (
                    <th className="px-4 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={selectedIds.size === applications.length && applications.length > 0}
                        onChange={toggleSelectAll}
                        className="h-4 w-4 text-blue-600 rounded border-gray-300"
                      />
                    </th>
                  )}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Applicant</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Program</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Applied</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {applications.map((app) => (
                  <tr key={app.id} className={`hover:bg-gray-50 ${selectedIds.has(app.id) ? 'bg-blue-50' : ''}`}>
                    {(isAdmin || isOfficer) && (
                      <td className="px-4 py-4 whitespace-nowrap">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(app.id)}
                          onChange={() => toggleSelection(app.id)}
                          className="h-4 w-4 text-blue-600 rounded border-gray-300"
                        />
                      </td>
                    )}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-medium">
                          {app.first_name?.charAt(0)}{app.last_name?.charAt(0)}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{app.first_name} {app.last_name}</div>
                          <div className="text-sm text-gray-500">{app.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{app.program_name || app.program_id?.substring(0, 8)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        app.status === 'accepted' ? 'bg-green-100 text-green-800' :
                        app.status === 'rejected' ? 'bg-red-100 text-red-800' :
                        app.status === 'submitted' ? 'bg-yellow-100 text-yellow-800' :
                        app.status === 'under_review' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {app.status?.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(app.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <Link to={`/applications/${app.id}`} className="text-blue-600 hover:text-blue-900 mr-3">
                        View
                      </Link>
                      {(isAdmin || isOfficer) && (
                        <>
                          <Link to={`/applications/${app.id}`} className="text-blue-600 hover:text-blue-900 mr-3">
                            Review
                          </Link>
                          <button
                            onClick={() => handleDelete(app.id)}
                            disabled={deleting === app.id}
                            className="text-red-600 hover:text-red-900 disabled:opacity-50"
                          >
                            {deleting === app.id ? 'Deleting...' : 'Delete'}
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            <Pagination
              currentPage={currentPage}
              totalPages={Math.ceil(totalCount / ITEMS_PER_PAGE)}
              onPageChange={setCurrentPage}
              totalItems={totalCount}
              itemsPerPage={ITEMS_PER_PAGE}
            />
          </>
        )}
      </div>
    </div>
  )
}