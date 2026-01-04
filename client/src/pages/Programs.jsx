import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import Breadcrumbs from '../components/Breadcrumbs'
import EmptyState from '../components/EmptyState'

export default function Programs() {
  const { isApplicant } = useAuth()
  const { error } = useToast()
  const navigate = useNavigate()
  const [programs, setPrograms] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    fetchPrograms()
  }, [])

  const fetchPrograms = async () => {
    try {
      const response = await fetch('/api/programs')
      if (response.ok) {
        const data = await response.json()
        setPrograms(data)
      }
    } catch (err) {
      error('Failed to load programs')
    } finally {
      setLoading(false)
    }
  }

  const filteredPrograms = programs.filter(program => {
    if (filter === 'all') return true
    return program.degree_type === filter
  })

  const degreeTypeColors = {
    bachelors: 'bg-blue-100 text-blue-800',
    masters: 'bg-purple-100 text-purple-800',
    phd: 'bg-green-100 text-green-800'
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[
        { path: '/dashboard', label: 'Dashboard' },
        { path: '/programs', label: 'Programs' }
      ]} />

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Academic Programs</h1>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="all">All Degrees</option>
          <option value="bachelors">Bachelor's</option>
          <option value="masters">Master's</option>
          <option value="phd">PhD</option>
        </select>
      </div>

      {loading ? (
        <div className="bg-white rounded-lg p-8 text-center border border-gray-200">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-500">Loading programs...</p>
        </div>
      ) : filteredPrograms.length === 0 ? (
        <EmptyState
          icon="🎓"
          title="No programs found"
          description="No programs match your current filter criteria."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPrograms.map((program) => (
            <div
              key={program.id}
              className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${degreeTypeColors[program.degree_type] || 'bg-gray-100 text-gray-800'}`}>
                  {program.degree_type?.charAt(0).toUpperCase() + program.degree_type?.slice(1)}
                </span>
                {program.intake_capacity && (
                  <span className="text-xs text-gray-500">
                    {program.intake_capacity} spots
                  </span>
                )}
              </div>

              <h3 className="text-lg font-semibold text-gray-900 mb-2">{program.name}</h3>
              <p className="text-sm text-gray-600 mb-4 line-clamp-2">{program.description || 'No description available.'}</p>

              <div className="space-y-2 text-sm">
                <div className="flex items-center text-gray-500">
                  <span className="mr-2">🏛️</span>
                  {program.department || 'General'}
                </div>
                <div className="flex items-center text-gray-500">
                  <span className="mr-2">⏱️</span>
                  {program.duration_years || 4} years
                </div>
              </div>

              {isApplicant && (
                <button
                  onClick={() => navigate('/applications/new', { state: { programId: program.id } })}
                  className="mt-4 w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                  Apply Now
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}