import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import Breadcrumbs from '../components/Breadcrumbs'

export default function ApplicationDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { isAdmin, isOfficer } = useAuth()
  const { success, error: showError } = useToast()
  const [application, setApplication] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    fetchApplication()
  }, [id])

  const fetchApplication = async () => {
    try {
      const token = localStorage.getItem('authToken')
      const response = await fetch(`/api/applications/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        const data = await response.json()
        setApplication(data)
      } else {
        const data = await response.json()
        setError(data.message || 'Failed to load application')
      }
    } catch (err) {
      setError('An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = async (newStatus) => {
    if (!window.confirm(`Are you sure you want to change status to "${newStatus}"?`)) {
      return
    }

    setUpdating(true)
    try {
      const token = localStorage.getItem('authToken')
      const response = await fetch(`/api/applications/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      })

      if (response.ok) {
        const data = await response.json()
        setApplication(data.application)
        success(`Application status changed to ${newStatus.replace('_', ' ')}`)
      } else {
        const data = await response.json()
        showError(data.message || 'Failed to update status')
      }
    } catch (err) {
      showError('An error occurred. Please try again.')
    } finally {
      setUpdating(false)
    }
  }

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this application? This action cannot be undone.')) {
      return
    }

    try {
      const token = localStorage.getItem('authToken')
      const response = await fetch(`/api/applications/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        success('Application deleted successfully')
        navigate('/applications')
      } else {
        const data = await response.json()
        showError(data.message || 'Failed to delete application')
      }
    } catch (err) {
      showError('An error occurred. Please try again.')
    }
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
    })
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

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Application Details</h1>
        <div className="card p-8 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-500">Loading...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Application Details</h1>
        <div className="card p-8 text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => navigate('/applications')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Back to Applications
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[
        { path: '/dashboard', label: 'Dashboard' },
        { path: '/applications', label: 'Applications' },
        { path: `/applications/${id}`, label: `Application ${id.substring(0, 8)}` }
      ]} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Application Details</h1>
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
            application.status === 'accepted' ? 'bg-green-100 text-green-800' :
            application.status === 'rejected' ? 'bg-red-100 text-red-800' :
            application.status === 'submitted' ? 'bg-yellow-100 text-yellow-800' :
            application.status === 'under_review' ? 'bg-blue-100 text-blue-800' :
            'bg-gray-100 text-gray-800'
          }`}>
            {application.status?.replace('_', ' ')}
          </span>
        </div>
        {(isAdmin || isOfficer) && (
          <button
            onClick={() => handleDelete()}
            className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
          >
            Delete
          </button>
        )}
      </div>

      {/* Status Actions */}
      {(isAdmin || isOfficer) && (
        <div className="card p-4">
          <p className="text-sm font-medium text-gray-700 mb-2">Change Status:</p>
          <div className="flex flex-wrap gap-2">
            {['submitted', 'under_review', 'accepted', 'rejected'].map(status => (
              <button
                key={status}
                onClick={() => handleStatusChange(status)}
                disabled={updating || application.status === status}
                className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                  application.status === status
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                {status.replace('_', ' ').toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Applicant Info */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Personal Information</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">First Name</p>
                <p className="font-medium">{application.first_name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Last Name</p>
                <p className="font-medium">{application.last_name}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Email</p>
                <p className="font-medium">{application.email}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Phone</p>
                <p className="font-medium">{application.phone || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Date of Birth</p>
                <p className="font-medium">{application.date_of_birth || '-'}</p>
              </div>
              <div className="col-span-2">
                <p className="text-sm text-gray-500">Address</p>
                <p className="font-medium">{application.address || '-'}</p>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Academic Information</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">High School</p>
                <p className="font-medium">{application.high_school || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">GPA</p>
                <p className="font-medium">{application.gpa || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">SAT Score</p>
                <p className="font-medium">{application.sat_score || '-'}</p>
              </div>
              <div className="col-span-2">
                <p className="text-sm text-gray-500">Extracurricular Activities</p>
                <p className="font-medium whitespace-pre-wrap">{application.extracurriculars || '-'}</p>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Personal Statement</h2>
            <p className="whitespace-pre-wrap">{application.personal_statement || 'No personal statement provided.'}</p>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="card p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Program</h2>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-500">Program Name</p>
                <p className="font-medium">{application.program_name || 'Unknown'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Department</p>
                <p className="font-medium">{application.department || '-'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Degree Type</p>
                <p className="font-medium capitalize">{application.degree_type || '-'}</p>
              </div>
            </div>
          </div>

          <div className="card p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Timeline</h2>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-500">Created</p>
                <p className="font-medium">{formatDate(application.created_at)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Last Updated</p>
                <p className="font-medium">{formatDate(application.updated_at)}</p>
              </div>
              {application.submitted_at && (
                <div>
                  <p className="text-sm text-gray-500">Submitted</p>
                  <p className="font-medium">{formatDate(application.submitted_at)}</p>
                </div>
              )}
              {application.reviewed_at && (
                <div>
                  <p className="text-sm text-gray-500">Reviewed</p>
                  <p className="font-medium">{formatDate(application.reviewed_at)}</p>
                </div>
              )}
            </div>
          </div>

          {isAdmin && (
            <div className="card p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Debug Info</h2>
              <p className="text-xs text-gray-500 break-all">ID: {application.id}</p>
              <p className="text-xs text-gray-500 break-all">User ID: {application.user_id}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}