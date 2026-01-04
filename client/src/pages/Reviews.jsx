import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import Breadcrumbs from '../components/Breadcrumbs'
import EmptyState from '../components/EmptyState'

export default function Reviews() {
  const { user } = useAuth()
  const { success, error } = useToast()
  const navigate = useNavigate()
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedReview, setSelectedReview] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    fetchReviews()
  }, [])

  const fetchReviews = async () => {
    try {
      const token = localStorage.getItem('authToken')
      const response = await fetch('/api/reviews', {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        const data = await response.json()
        setReviews(data)
      }
    } catch (err) {
      error('Failed to load reviews')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmitReview = async (formData) => {
    try {
      const token = localStorage.getItem('authToken')
      const response = await fetch('/api/reviews', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      const data = await response.json()

      if (response.ok) {
        success('Review submitted successfully')
        setShowModal(false)
        setSelectedReview(null)
        fetchReviews()
      } else {
        error(data.message || 'Failed to submit review')
      }
    } catch (err) {
      error('An error occurred while submitting the review')
    }
  }

  const handleDeleteReview = async (id) => {
    if (!window.confirm('Are you sure you want to delete this review?')) {
      return
    }

    try {
      const token = localStorage.getItem('authToken')
      const response = await fetch(`/api/reviews/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        success('Review deleted successfully')
        fetchReviews()
      } else {
        const data = await response.json()
        error(data.message || 'Failed to delete review')
      }
    } catch (err) {
      error('An error occurred')
    }
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric'
    })
  }

  const getRecommendationBadge = (recommendation) => {
    const styles = {
      accept: 'bg-green-100 text-green-800',
      reject: 'bg-red-100 text-red-800',
      waitlist: 'bg-yellow-100 text-yellow-800'
    }
    const labels = {
      accept: 'Accept',
      reject: 'Reject',
      waitlist: 'Waitlist'
    }
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${styles[recommendation] || 'bg-gray-100 text-gray-800'}`}>
        {labels[recommendation] || recommendation}
      </span>
    )
  }

  const getRatingStars = (rating) => {
    const stars = []
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <span key={i} className={i <= rating ? 'text-yellow-400' : 'text-gray-300'}>
          ★
        </span>
      )
    }
    return <span className="text-sm">{stars}</span>
  }

  const filteredReviews = reviews.filter(review => {
    if (filter === 'all') return true
    return review.recommendation === filter
  })

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[
        { path: '/dashboard', label: 'Dashboard' },
        { path: '/reviews', label: 'Reviews' }
      ]} />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Application Reviews</h1>
          <p className="text-gray-500 mt-1">Review and evaluate student applications</p>
        </div>
        <div className="flex items-center space-x-4">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Recommendations</option>
            <option value="accept">Accept</option>
            <option value="waitlist">Waitlist</option>
            <option value="reject">Reject</option>
          </select>
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-lg p-8 text-center border border-gray-200">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-500">Loading reviews...</p>
        </div>
      ) : filteredReviews.length === 0 ? (
        <EmptyState
          icon="📋"
          title="No reviews found"
          description="Reviews will appear here once you evaluate submitted applications."
        />
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Applicant</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Program</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rating</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Recommendation</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reviewed By</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredReviews.map((review) => (
                <tr key={review.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <span className="text-blue-600 font-medium">
                          {review.first_name?.[0]}{review.last_name?.[0]}
                        </span>
                      </div>
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-900">
                          {review.first_name} {review.last_name}
                        </p>
                        <p className="text-sm text-gray-500">{review.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {review.program_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getRatingStars(review.rating)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getRecommendationBadge(review.recommendation)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {review.reviewer_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(review.created_at)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button
                      onClick={() => {
                        setSelectedReview(review)
                        setShowModal(true)
                      }}
                      className="text-blue-600 hover:text-blue-900 mr-3"
                    >
                      View
                    </button>
                    <button
                      onClick={() => handleDeleteReview(review.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Review Detail Modal */}
      {showModal && (
        <ReviewModal
          review={selectedReview}
          onClose={() => {
            setShowModal(false)
            setSelectedReview(null)
          }}
          onSubmit={handleSubmitReview}
        />
      )}
    </div>
  )
}

function ReviewModal({ review, onClose, onSubmit }) {
  const { user } = useAuth()
  const { success, error } = useToast()
  const navigate = useNavigate()

  const [formData, setFormData] = useState({
    application_id: review?.application_id || '',
    rating: review?.rating || 3,
    strengths: review?.strengths || '',
    weaknesses: review?.weaknesses || '',
    recommendation: review?.recommendation || 'waitlist',
    notes: review?.notes || ''
  })
  const [loading, setLoading] = useState(false)
  const [applications, setApplications] = useState([])

  useEffect(() => {
    if (!review) {
      fetchApplications()
    }
  }, [review])

  const fetchApplications = async () => {
    try {
      const token = localStorage.getItem('authToken')
      const response = await fetch('/api/applications?status=submitted', {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        const data = await response.json()
        setApplications(data.applications || [])
      }
    } catch (err) {
      console.error('Failed to load applications:', err)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: name === 'rating' ? parseInt(value) : value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const token = localStorage.getItem('authToken')
      const url = review?.id ? `/api/reviews/${review.id}` : '/api/reviews'
      const method = review?.id ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      const data = await response.json()

      if (response.ok) {
        success(review?.id ? 'Review updated successfully' : 'Review submitted successfully')
        onSubmit(data.review)
      } else {
        error(data.message || 'Failed to save review')
      }
    } catch (err) {
      error('An error occurred while saving the review')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">
            {review ? 'Review Details' : 'Submit New Review'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {!review && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Select Application *
              </label>
              <select
                name="application_id"
                value={formData.application_id}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Choose an application...</option>
                {applications.map(app => (
                  <option key={app.id} value={app.id}>
                    {app.first_name} {app.last_name} - {app.program_name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {review && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 mb-2">Applicant Information</h3>
              <p className="text-sm text-gray-600">
                {review.first_name} {review.last_name} ({review.email})
              </p>
              <p className="text-sm text-gray-600">Program: {review.program_name}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Rating (1-5) *
            </label>
            <div className="flex items-center space-x-2">
              {[1, 2, 3, 4, 5].map(rating => (
                <button
                  key={rating}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, rating }))}
                  className={`text-2xl ${rating <= formData.rating ? 'text-yellow-400' : 'text-gray-300'} hover:text-yellow-400 transition-colors`}
                >
                  ★
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Recommendation *
            </label>
            <div className="grid grid-cols-3 gap-3">
              {['accept', 'waitlist', 'reject'].map(option => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, recommendation: option }))}
                  className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors
                    ${formData.recommendation === option
                      ? option === 'accept' ? 'bg-green-100 text-green-800 border-2 border-green-300'
                        : option === 'reject' ? 'bg-red-100 text-red-800 border-2 border-red-300'
                        : 'bg-yellow-100 text-yellow-800 border-2 border-yellow-300'
                      : 'bg-gray-100 text-gray-600 border-2 border-transparent'
                    }`}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Strengths
            </label>
            <textarea
              name="strengths"
              value={formData.strengths}
              onChange={handleChange}
              rows={3}
              placeholder="List the applicant's strengths..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Areas for Improvement
            </label>
            <textarea
              name="weaknesses"
              value={formData.weaknesses}
              onChange={handleChange}
              rows={3}
              placeholder="List areas where the applicant could improve..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Additional Notes
            </label>
            <textarea
              name="notes"
              value={formData.notes}
              onChange={handleChange}
              rows={3}
              placeholder="Any additional notes or comments..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Saving...' : (review ? 'Update Review' : 'Submit Review')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}