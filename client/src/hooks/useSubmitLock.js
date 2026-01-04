import { useState, useCallback, useRef } from 'react'

/**
 * Hook to prevent double submissions and manage button loading states
 */
export function useSubmitLock() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const submitCountRef = useRef(0)

  const lockSubmit = useCallback(async (asyncFunction) => {
    if (isSubmitting) {
      console.log('Submission blocked - already submitting')
      return null
    }

    submitCountRef.current += 1
    const currentSubmit = submitCountRef.current

    setIsSubmitting(true)

    try {
      const result = await asyncFunction()
      // Only clear if this is still the most recent submission
      if (submitCountRef.current === currentSubmit) {
        setIsSubmitting(false)
      }
      return result
    } catch (error) {
      // Clear submitting state on error
      if (submitCountRef.current === currentSubmit) {
        setIsSubmitting(false)
      }
      throw error
    }
  }, [isSubmitting])

  const reset = useCallback(() => {
    setIsSubmitting(false)
  }, [])

  return { isSubmitting, lockSubmit, reset }
}

/**
 * Higher-order component wrapper for forms to prevent double submissions
 */
export function withSubmitLock(WrappedComponent) {
  return function WithSubmitLockWrapper(props) {
    const submitLock = useSubmitLock()

    return <WrappedComponent {...props} submitLock={submitLock} />
  }
}

/**
 * Simple wrapper component for submit buttons with loading state
 */
export function SubmitButton({ isLoading, children, className = '', disabled = false, ...props }) {
  return (
    <button
      className={`${className} ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
      disabled={isLoading || disabled}
      {...props}
    >
      {isLoading ? (
        <span className="flex items-center justify-center">
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          Processing...
        </span>
      ) : (
        children
      )}
    </button>
  )
}