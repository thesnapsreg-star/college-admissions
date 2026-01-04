import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useToast } from '../context/ToastContext'
import Breadcrumbs from '../components/Breadcrumbs'
import { Input, Select, Textarea } from '../components/FormField'
import { applicationValidations, validateForm } from '../utils/validators'

export default function NewApplication() {
  const navigate = useNavigate()
  const { success, error: showError } = useToast()
  const [programs, setPrograms] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState({})

  const [formData, setFormData] = useState({
    program_id: '',
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    date_of_birth: '',
    address: '',
    high_school: '',
    gpa: '',
    sat_score: '',
    extracurriculars: '',
    personal_statement: ''
  })

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
      console.error('Failed to fetch programs:', err)
      showError('Failed to load programs')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const handleBlur = () => {
    // Validate on blur for touched fields
    const { isValid, errors: validationErrors } = validateForm(formData, applicationValidations)
    // Only show errors for fields that have been touched (have values)
    const touchedErrors = {}
    Object.keys(formData).forEach(key => {
      if (formData[key] && validationErrors[key]) {
        touchedErrors[key] = validationErrors[key]
      }
    })
    setErrors(touchedErrors)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    // Validate entire form
    const { isValid, errors: validationErrors } = validateForm(formData, applicationValidations)

    if (!isValid) {
      setErrors(validationErrors)
      showError('Please fix the errors in the form')
      return
    }

    setSubmitting(true)
    setErrors({})

    try {
      const token = localStorage.getItem('authToken')
      const response = await fetch('/api/applications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      })

      const data = await response.json()

      if (response.ok) {
        success('Application created successfully')
        navigate('/applications')
      } else {
        showError(data.message || 'Failed to create application')
        if (data.errors) {
          setErrors(data.errors)
        }
      }
    } catch (err) {
      showError('An error occurred. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Breadcrumbs items={[
          { path: '/dashboard', label: 'Dashboard' },
          { path: '/applications', label: 'Applications' },
          { path: '/applications/new', label: 'New Application' }
        ]} />
        <h1 className="text-2xl font-bold text-gray-900">New Application</h1>
        <div className="bg-white rounded-lg p-8 text-center border border-gray-200">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-500">Loading...</p>
        </div>
      </div>
    )
  }

  const programOptions = programs.map(p => ({
    value: p.id,
    label: `${p.name} (${p.degree_type}, ${p.department})`
  }))

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[
        { path: '/dashboard', label: 'Dashboard' },
        { path: '/applications', label: 'Applications' },
        { path: '/applications/new', label: 'New Application' }
      ]} />

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">New Application</h1>
      </div>

      {Object.keys(errors).length > 0 && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          <p className="font-medium">Please correct the errors below:</p>
          <ul className="list-disc list-inside mt-1">
            {Object.entries(errors).map(([key, error]) => (
              <li key={key}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Program Selection */}
        <div className="bg-white rounded-lg p-6 border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Program Selection</h2>
          <Select
            label="Choose a Program"
            name="program_id"
            value={formData.program_id}
            onChange={handleChange}
            onBlur={handleBlur}
            error={errors.program_id}
            options={programOptions}
            required
          />
        </div>

        {/* Personal Information */}
        <div className="bg-white rounded-lg p-6 border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Personal Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="First Name"
              name="first_name"
              value={formData.first_name}
              onChange={handleChange}
              onBlur={handleBlur}
              error={errors.first_name}
              required
              placeholder="John"
            />
            <Input
              label="Last Name"
              name="last_name"
              value={formData.last_name}
              onChange={handleChange}
              onBlur={handleBlur}
              error={errors.last_name}
              required
              placeholder="Doe"
            />
            <Input
              label="Email Address"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              onBlur={handleBlur}
              error={errors.email}
              required
              placeholder="john.doe@email.com"
            />
            <Input
              label="Phone Number"
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              onBlur={handleBlur}
              error={errors.phone}
              placeholder="(555) 123-4567"
            />
            <Input
              label="Date of Birth"
              type="date"
              name="date_of_birth"
              value={formData.date_of_birth}
              onChange={handleChange}
              onBlur={handleBlur}
              error={errors.date_of_birth}
            />
            <div className="md:col-span-2">
              <Textarea
                label="Current Address"
                name="address"
                value={formData.address}
                onChange={handleChange}
                onBlur={handleBlur}
                error={errors.address}
                rows={2}
                placeholder="123 Main St, City, State 12345"
              />
            </div>
          </div>
        </div>

        {/* Academic Information */}
        <div className="bg-white rounded-lg p-6 border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Academic Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="High School / College"
              name="high_school"
              value={formData.high_school}
              onChange={handleChange}
              onBlur={handleBlur}
              error={errors.high_school}
              placeholder="Central High School"
            />
            <Input
              label="GPA (0.0 - 4.0)"
              type="number"
              name="gpa"
              min="0"
              max="4"
              step="0.01"
              value={formData.gpa}
              onChange={handleChange}
              onBlur={handleBlur}
              error={errors.gpa}
              placeholder="3.75"
            />
            <Input
              label="SAT Score (400 - 1600)"
              type="number"
              name="sat_score"
              min="400"
              max="1600"
              value={formData.sat_score}
              onChange={handleChange}
              onBlur={handleBlur}
              error={errors.sat_score}
              placeholder="1400"
            />
          </div>
        </div>

        {/* Additional Information */}
        <div className="bg-white rounded-lg p-6 border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Additional Information</h2>
          <div className="space-y-4">
            <Textarea
              label="Extracurricular Activities"
              name="extracurriculars"
              value={formData.extracurriculars}
              onChange={handleChange}
              onBlur={handleBlur}
              error={errors.extracurriculars}
              rows={3}
              placeholder="List your extracurricular activities, clubs, sports, volunteer work, etc."
            />
            <Textarea
              label="Personal Statement"
              name="personal_statement"
              value={formData.personal_statement}
              onChange={handleChange}
              onBlur={handleBlur}
              error={errors.personal_statement}
              rows={5}
              placeholder="Tell us about yourself, your goals, and why you want to join this program..."
            />
          </div>
        </div>

        {/* Submit Buttons */}
        <div className="flex justify-end gap-4">
          <button
            type="button"
            onClick={() => navigate('/applications')}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className={`px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors ${
              submitting ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {submitting ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Creating...
              </span>
            ) : (
              'Create Application'
            )}
          </button>
        </div>
      </form>
    </div>
  )
}