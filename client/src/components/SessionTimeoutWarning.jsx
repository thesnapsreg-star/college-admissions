import { useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'

export default function SessionTimeoutWarning() {
  const { showTimeoutWarning, remainingTime, extendSession, logout } = useAuth()
  const { error } = useToast()

  useEffect(() => {
    if (showTimeoutWarning) {
      error('Your session will expire soon')
    }
  }, [showTimeoutWarning, error])

  if (!showTimeoutWarning) return null

  const formatTime = (ms) => {
    const seconds = Math.ceil(ms / 1000)
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 overflow-hidden">
        <div className="bg-amber-50 px-6 py-4 border-b border-amber-200">
          <div className="flex items-center">
            <svg className="w-6 h-6 text-amber-600 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <h3 className="text-lg font-semibold text-amber-800">Session Expiring</h3>
          </div>
        </div>

        <div className="p-6">
          <p className="text-gray-600 mb-4">
            Your session will expire in <span className="font-bold text-amber-600">{formatTime(remainingTime)}</span> due to inactivity.
          </p>
          <p className="text-sm text-gray-500 mb-6">
            Would you like to continue your session?
          </p>

          <div className="flex justify-end space-x-3">
            <button
              onClick={logout}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Log Out
            </button>
            <button
              onClick={extendSession}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Continue Session
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}