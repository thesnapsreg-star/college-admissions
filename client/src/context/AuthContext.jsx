import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'

const AuthContext = createContext(null)

const SESSION_TIMEOUT = 30 * 60 * 1000 // 30 minutes
const WARNING_BEFORE_TIMEOUT = 2 * 60 * 1000 // 2 minutes warning

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showTimeoutWarning, setShowTimeoutWarning] = useState(false)
  const [remainingTime, setRemainingTime] = useState(0)
  const timeoutRef = useRef(null)
  const warningTimeoutRef = useRef(null)
  const countdownIntervalRef = useRef(null)
  const lastActivityRef = useRef(Date.now())

  // Track user activity
  const resetTimeout = useCallback(() => {
    lastActivityRef.current = Date.now()

    // Clear existing timeouts
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    if (warningTimeoutRef.current) clearTimeout(warningTimeoutRef.current)
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current)

    setShowTimeoutWarning(false)

    // Set warning timeout
    warningTimeoutRef.current = setTimeout(() => {
      const elapsed = Date.now() - lastActivityRef.current
      if (elapsed < SESSION_TIMEOUT - WARNING_BEFORE_TIMEOUT) {
        // User was active again, reset
        resetTimeout()
        return
      }
      setShowTimeoutWarning(true)
      startCountdown()
    }, SESSION_TIMEOUT - WARNING_BEFORE_TIMEOUT)

    // Set logout timeout
    timeoutRef.current = setTimeout(() => {
      logout()
      setShowTimeoutWarning(false)
    }, SESSION_TIMEOUT)
  }, [])

  const startCountdown = useCallback(() => {
    const endTime = Date.now() + WARNING_BEFORE_TIMEOUT
    setRemainingTime(WARNING_BEFORE_TIMEOUT)

    countdownIntervalRef.current = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((endTime - Date.now()) / 1000))
      setRemainingTime(remaining * 1000)

      if (remaining <= 0) {
        clearInterval(countdownIntervalRef.current)
      }
    }, 1000)
  }, [])

  const extendSession = useCallback(() => {
    setShowTimeoutWarning(false)
    resetTimeout()
    // Make API call to keep session alive
    const token = localStorage.getItem('authToken')
    if (token) {
      fetch('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      }).catch(() => {})
    }
  }, [resetTimeout])

  // Activity event listeners
  useEffect(() => {
    const events = ['mousedown', 'keydown', 'touchstart', 'scroll']
    const handleActivity = () => {
      if (user) {
        resetTimeout()
      }
    }

    events.forEach(event => {
      document.addEventListener(event, handleActivity)
    })

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity)
      })
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      if (warningTimeoutRef.current) clearTimeout(warningTimeoutRef.current)
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current)
    }
  }, [user, resetTimeout])

  useEffect(() => {
    // Check for stored auth token on load and validate it
    const validateToken = async () => {
      const token = localStorage.getItem('authToken')
      const storedUser = localStorage.getItem('user')
      if (token && storedUser) {
        try {
          const response = await fetch('/api/auth/me', {
            headers: { 'Authorization': `Bearer ${token}` }
          })
          if (response.ok) {
            const userData = await response.json()
            setUser(userData)
            localStorage.setItem('user', JSON.stringify(userData))
            // Start session timeout tracking
            resetTimeout()
          } else {
            // Token is invalid or expired - clear storage
            localStorage.removeItem('authToken')
            localStorage.removeItem('user')
            setUser(null)
          }
        } catch {
          // Network error - clear storage to be safe
          localStorage.removeItem('authToken')
          localStorage.removeItem('user')
          setUser(null)
        }
      }
      setLoading(false)
    }
    validateToken()
  }, [resetTimeout])

  const login = async (email, password) => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || 'Login failed')
    }

    const data = await response.json()
    localStorage.setItem('authToken', data.token)
    localStorage.setItem('user', JSON.stringify(data.user))
    setUser(data.user)
    return data.user
  }

  const logout = async () => {
    try {
      const token = localStorage.getItem('authToken')
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      })
    } catch {
      // Ignore logout errors
    }
    localStorage.removeItem('authToken')
    localStorage.removeItem('user')
    setUser(null)
  }

  const value = {
    user,
    loading,
    login,
    logout,
    isAuthenticated: !!user,
    isAdmin: user?.role === 'admin',
    isOfficer: user?.role === 'officer',
    isApplicant: user?.role === 'applicant',
    showTimeoutWarning,
    remainingTime,
    extendSession
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}