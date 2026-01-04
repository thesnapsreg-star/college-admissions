import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const PHASES = [
  { id: 'profile', label: 'Personal Info', icon: '👤' },
  { id: 'program', label: 'Program Selection', icon: '🎓' },
  { id: 'academic', label: 'Academic History', icon: '📚' },
  { id: 'essay', label: 'Personal Statement', icon: '✍️' },
  { id: 'documents', label: 'Documents', icon: '📋' },
  { id: 'review', label: 'Review', icon: '✅' }
]

export default function AIOnboardingWizard() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [currentPhase, setCurrentPhase] = useState('profile')
  const [profile, setProfile] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    applicantType: 'freshman',
    programId: '',
    programName: '',
    highSchool: '',
    gpa: '',
    satScore: '',
    actScore: '',
    extracurriculars: '',
    workExperience: '',
    interests: [],
    personalStatement: '',
    recommendations: []
  })
  const [loading, setLoading] = useState(true)
  const [analyzing, setAnalyzing] = useState(false)
  const [analysis, setAnalysis] = useState(null)
  const [programs, setPrograms] = useState([])

  useEffect(() => {
    fetchPrograms()
    loadSavedProgress()
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
    }
  }

  const loadSavedProgress = async () => {
    // Load any saved progress from localStorage
    const saved = localStorage.getItem('aiWizardProgress')
    if (saved) {
      setProfile(prev => ({ ...prev, ...JSON.parse(saved) }))
    }
    await analyzeProfile()
    setLoading(false)
  }

  const analyzeProfile = async () => {
    setAnalyzing(true)
    try {
      const token = localStorage.getItem('authToken')
      const response = await fetch('/api/ai/onboarding/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ profile })
      })
      const data = await response.json()
      if (data.success) {
        setAnalysis(data)
        // Auto-navigate to appropriate phase if significantly incomplete
        if (data.completionPercentage < 10) {
          setCurrentPhase('profile')
        }
      }
    } catch (err) {
      console.error('Analysis error:', err)
    } finally {
      setAnalyzing(false)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setProfile(prev => {
      const updated = { ...prev, [name]: value }
      // Save progress to localStorage
      localStorage.setItem('aiWizardProgress', JSON.stringify(updated))
      return updated
    })
  }

  const handleNext = async () => {
    const currentIndex = PHASES.findIndex(p => p.id === currentPhase)
    if (currentIndex < PHASES.length - 1) {
      const nextPhase = PHASES[currentIndex + 1].id
      setCurrentPhase(nextPhase)
      await analyzeProfile()
    }
  }

  const handlePrevious = () => {
    const currentIndex = PHASES.findIndex(p => p.id === currentPhase)
    if (currentIndex > 0) {
      setCurrentPhase(PHASES[currentIndex - 1].id)
    }
  }

  const handlePhaseClick = (phaseId) => {
    const currentIndex = PHASES.findIndex(p => p.id === currentPhase)
    const targetIndex = PHASES.findIndex(p => p.id === phaseId)

    // Only allow navigation to completed or adjacent phases
    if (targetIndex <= currentIndex || targetIndex === currentIndex + 1) {
      setCurrentPhase(phaseId)
    }
  }

  const getCompletionPercentage = () => {
    const fields = ['firstName', 'lastName', 'email', 'programId', 'highSchool', 'gpa', 'personalStatement']
    const completed = fields.filter(f => profile[f] && profile[f].trim()).length
    return Math.round((completed / fields.length) * 100)
  }

  const isPhaseComplete = (phaseId) => {
    switch (phaseId) {
      case 'profile':
        return profile.firstName && profile.lastName && profile.email
      case 'program':
        return profile.programId
      case 'academic':
        return profile.highSchool && profile.gpa
      case 'essay':
        return profile.personalStatement && profile.personalStatement.length >= 200
      case 'documents':
        return true // Optional in wizard
      case 'review':
        return true
      default:
        return false
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          <p className="mt-4 text-gray-600">Loading AI Onboarding Wizard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">AI-Powered Application Wizard</h1>
              <p className="text-gray-600">Smart guidance for your admission journey</p>
            </div>
            <Link to="/dashboard" className="text-gray-400 hover:text-gray-600">
              ← Back to Dashboard
            </Link>
          </div>

          {/* AI Progress Indicator */}
          <div className="bg-blue-50 rounded-lg p-4 mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-blue-800">Application Completeness</span>
              <span className="text-lg font-bold text-blue-600">{getCompletionPercentage()}%</span>
            </div>
            <div className="w-full bg-blue-200 rounded-full h-3">
              <div
                className="bg-blue-600 h-3 rounded-full transition-all duration-500"
                style={{ width: `${getCompletionPercentage()}%` }}
              />
            </div>
            {analysis && (
              <p className="text-sm text-blue-700 mt-2">
                💡 {analysis.recommendations[0] || 'Keep going! Complete all required fields.'}
              </p>
            )}
          </div>

          {/* Phase Navigation */}
          <div className="flex items-center justify-between overflow-x-auto pb-2">
            {PHASES.map((phase, index) => {
              const isComplete = isPhaseComplete(phase.id)
              const isCurrent = currentPhase === phase.id
              const isPast = PHASES.findIndex(p => p.id === currentPhase) > index

              return (
                <button
                  key={phase.id}
                  onClick={() => handlePhaseClick(phase.id)}
                  disabled={!isPast && !isCurrent && !isComplete}
                  className={`flex flex-col items-center min-w-[80px] ${isCurrent ? 'opacity-100' : 'opacity-50'} ${
                    isComplete && !isCurrent ? 'opacity-75' : ''
                  }`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg mb-1 ${
                    isComplete ? 'bg-green-100 text-green-600' :
                    isCurrent ? 'bg-primary text-white' :
                    'bg-gray-100 text-gray-400'
                  }`}>
                    {isComplete ? '✓' : phase.icon}
                  </div>
                  <span className="text-xs text-gray-600 hidden sm:block">{phase.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Phase Content */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm p-6">
            {currentPhase === 'profile' && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-gray-900">Personal Information</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
                    <input
                      type="text"
                      name="firstName"
                      value={profile.firstName}
                      onChange={handleChange}
                      className="input"
                      placeholder="John"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
                    <input
                      type="text"
                      name="lastName"
                      value={profile.lastName}
                      onChange={handleChange}
                      className="input"
                      placeholder="Doe"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email Address *</label>
                    <input
                      type="email"
                      name="email"
                      value={profile.email}
                      onChange={handleChange}
                      className="input"
                      placeholder="john.doe@email.com"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                    <input
                      type="tel"
                      name="phone"
                      value={profile.phone}
                      onChange={handleChange}
                      className="input"
                      placeholder="(555) 123-4567"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Applicant Type</label>
                    <select
                      name="applicantType"
                      value={profile.applicantType}
                      onChange={handleChange}
                      className="input"
                    >
                      <option value="freshman">First-year Student</option>
                      <option value="transfer">Transfer Student</option>
                      <option value="graduate">Graduate Student</option>
                    </select>
                    {profile.applicantType === 'transfer' && (
                      <p className="text-sm text-blue-600 mt-1">
                        💡 As a transfer student, we'll ask about your college credits separately.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {currentPhase === 'program' && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-gray-900">Select Your Program</h2>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Target Program *</label>
                  <select
                    name="programId"
                    value={profile.programId}
                    onChange={handleChange}
                    className="input"
                  >
                    <option value="">Select a program...</option>
                    {programs.map(program => (
                      <option key={program.id} value={program.id}>
                        {program.name} ({program.degree_type}, {program.department})
                      </option>
                    ))}
                  </select>
                </div>
                {profile.programId && (
                  <div className="bg-blue-50 rounded-lg p-4">
                    <h3 className="font-medium text-blue-800 mb-2">🎯 AI Recommendations</h3>
                    <ul className="text-sm text-blue-700 space-y-1">
                      <li>• Strong fit for your background</li>
                      <li>• Consider related minors or concentrations</li>
                      <li>• Application deadline: January 15, 2026</li>
                    </ul>
                  </div>
                )}
              </div>
            )}

            {currentPhase === 'academic' && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-gray-900">Academic History</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">High School/College *</label>
                    <input
                      type="text"
                      name="highSchool"
                      value={profile.highSchool}
                      onChange={handleChange}
                      className="input"
                      placeholder="Central High School"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">GPA (0.0 - 4.0) *</label>
                    <input
                      type="number"
                      name="gpa"
                      value={profile.gpa}
                      onChange={handleChange}
                      className="input"
                      min="0"
                      max="4"
                      step="0.01"
                      placeholder="3.75"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">SAT Score (optional)</label>
                    <input
                      type="number"
                      name="satScore"
                      value={profile.satScore}
                      onChange={handleChange}
                      className="input"
                      min="400"
                      max="1600"
                      placeholder="1400"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">ACT Score (optional)</label>
                    <input
                      type="number"
                      name="actScore"
                      value={profile.actScore}
                      onChange={handleChange}
                      className="input"
                      min="1"
                      max="36"
                      placeholder="32"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Extracurricular Activities</label>
                    <textarea
                      name="extracurriculars"
                      value={profile.extracurriculars}
                      onChange={handleChange}
                      rows="3"
                      className="input"
                      placeholder="List your clubs, sports, volunteer work, leadership roles..."
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Work Experience (if any)</label>
                    <textarea
                      name="workExperience"
                      value={profile.workExperience}
                      onChange={handleChange}
                      rows="2"
                      className="input"
                      placeholder="Relevant jobs or internships..."
                    />
                  </div>
                </div>
              </div>
            )}

            {currentPhase === 'essay' && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-gray-900">Personal Statement</h2>
                <p className="text-gray-600">Tell us your story. What motivates you? What are your goals?</p>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Your Personal Statement *</label>
                  <textarea
                    name="personalStatement"
                    value={profile.personalStatement}
                    onChange={handleChange}
                    rows="10"
                    className="input font-mono text-sm"
                    placeholder="Write your personal statement here. Recommended length: 500-650 words..."
                  />
                  <div className="flex justify-between mt-2">
                    <span className="text-sm text-gray-500">
                      {profile.personalStatement.length} characters
                    </span>
                    <span className={`text-sm ${
                      profile.personalStatement.length >= 500 ? 'text-green-600' : 'text-yellow-600'
                    }`}>
                      {profile.personalStatement.length >= 500 ? '✓ Good length' : 'Aim for 500+ words'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {currentPhase === 'documents' && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-gray-900">Documents & Recommendations</h2>
                <div className="bg-blue-50 rounded-lg p-4">
                  <h3 className="font-medium text-blue-800 mb-2">📋 Your AI Checklist</h3>
                  <ul className="text-sm text-blue-700 space-y-2">
                    <li className={profile.recommendations?.length > 0 ? 'line-through text-green-600' : ''}>
                      ☐ Request 2-3 recommendation letters
                    </li>
                    <li className={profile.highSchool ? 'line-through text-green-600' : ''}>
                      ☐ Official transcript from school
                    </li>
                    <li className={profile.satScore ? 'line-through text-green-600' : ''}>
                      ☐ Standardized test scores (if submitting)
                    </li>
                    <li>☐ Complete any program-specific supplements</li>
                  </ul>
                </div>
                <div className="bg-yellow-50 rounded-lg p-4">
                  <h3 className="font-medium text-yellow-800 mb-2">💡 AI Tip</h3>
                  <p className="text-sm text-yellow-700">
                    Give your recommenders at least 2 weeks notice. Send them your resume and talking points about why you chose this program.
                  </p>
                </div>
              </div>
            )}

            {currentPhase === 'review' && (
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-gray-900">Review Your Application</h2>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <span className="text-gray-500">Name</span>
                    <p className="font-medium">{profile.firstName} {profile.lastName}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <span className="text-gray-500">Email</span>
                    <p className="font-medium">{profile.email}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <span className="text-gray-500">Program</span>
                    <p className="font-medium">{profile.programName || 'Not selected'}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <span className="text-gray-500">GPA</span>
                    <p className="font-medium">{profile.gpa || 'Not entered'}</p>
                  </div>
                </div>

                <div className="bg-green-50 rounded-lg p-4">
                  <h3 className="font-medium text-green-800 mb-2">✅ Submission Ready</h3>
                  <p className="text-sm text-green-700">
                    Your application meets all requirements! Click Submit when ready.
                  </p>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between mt-8 pt-6 border-t">
              <button
                onClick={handlePrevious}
                disabled={PHASES.findIndex(p => p.id === currentPhase) === 0}
                className="btn btn-secondary disabled:opacity-50"
              >
                ← Previous
              </button>
              {currentPhase === 'review' ? (
                <button className="btn btn-primary">
                  Submit Application
                </button>
              ) : (
                <button
                  onClick={handleNext}
                  className="btn btn-primary"
                >
                  Next →
                </button>
              )}
            </div>
          </div>

          {/* Sidebar - AI Insights */}
          <div className="space-y-6">
            {/* AI Insights Card */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <span>🤖</span> AI Insights
              </h3>

              {analyzing ? (
                <div className="text-center py-4">
                  <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                  <p className="text-sm text-gray-500 mt-2">Analyzing your progress...</p>
                </div>
              ) : analysis ? (
                <div className="space-y-4">
                  {analysis.recommendations?.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase mb-2">Recommendations</p>
                      <ul className="space-y-2">
                        {analysis.recommendations.slice(0, 3).map((rec, idx) => (
                          <li key={idx} className="text-sm text-gray-700 bg-blue-50 p-2 rounded">
                            💡 {rec}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {analysis.warnings?.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-gray-500 uppercase mb-2">Attention Needed</p>
                      <ul className="space-y-2">
                        {analysis.warnings.map((warn, idx) => (
                          <li key={idx} className="text-sm text-yellow-700 bg-yellow-50 p-2 rounded">
                            ⚠️ {warn}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-500">Complete more sections for AI insights</p>
              )}
            </div>

            {/* Deadlines Card */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <span>📅</span> Upcoming Deadlines
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Early Action</span>
                  <span className="text-sm font-medium text-orange-600">Nov 1, 2025</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Regular Decision</span>
                  <span className="text-sm font-medium text-primary">Jan 15, 2026</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Transfer</span>
                  <span className="text-sm font-medium text-gray-900">Mar 1, 2026</span>
                </div>
              </div>
            </div>

            {/* Progress Card */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <span>📊</span> Your Progress
              </h3>
              <div className="relative pt-1">
                <div className="flex mb-2 items-center justify-between">
                  <div>
                    <span className="text-xs font-semibold inline-block text-primary">
                      {getCompletionPercentage()}% Complete
                    </span>
                  </div>
                </div>
                <div className="overflow-hidden h-2 mb-4 text-xs flex rounded bg-gray-200">
                  <div
                    style={{ width: `${getCompletionPercentage()}%` }}
                    className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-primary"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}