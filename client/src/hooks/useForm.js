import { useState, useCallback } from 'react'

export function useForm(initialValues = {}, validate = null) {
  const [values, setValues] = useState(initialValues)
  const [errors, setErrors] = useState({})
  const [touched, setTouched] = useState({})
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleChange = useCallback((e) => {
    const { name, value, type, checked } = e.target
    const val = type === 'checkbox' ? checked : value

    setValues(prev => ({ ...prev, [name]: val }))

    // Clear error when user starts typing
    if (touched[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }, [touched])

  const handleBlur = useCallback((e) => {
    const { name } = e.target
    setTouched(prev => ({ ...prev, [name]: true }))

    if (validate) {
      const validationErrors = validate(values)
      setErrors(prev => ({
        ...prev,
        [name]: validationErrors[name] || ''
      }))
    }
  }, [values, validate])

  const handleSubmit = useCallback(async (onSubmit) => {
    setIsSubmitting(true)
    setTouched(
      Object.keys(values).reduce((acc, key) => ({ ...acc, [key]: true }), {})
    )

    if (validate) {
      const validationErrors = validate(values)
      setErrors(validationErrors)

      if (Object.keys(validationErrors).length > 0) {
        setIsSubmitting(false)
        return { success: false, errors: validationErrors }
      }
    }

    try {
      const result = await onSubmit(values)
      setIsSubmitting(false)
      return { success: true, data: result }
    } catch (error) {
      setIsSubmitting(false)
      return { success: false, error: error.message }
    }
  }, [values, validate])

  const reset = useCallback(() => {
    setValues(initialValues)
    setErrors({})
    setTouched({})
    setIsSubmitting(false)
  }, [initialValues])

  const setFieldValue = useCallback((name, value) => {
    setValues(prev => ({ ...prev, [name]: value }))
  }, [])

  return {
    values,
    errors,
    touched,
    isSubmitting,
    handleChange,
    handleBlur,
    handleSubmit,
    reset,
    setFieldValue,
    setValues,
    setErrors
  }
}

export function useLocalStorage(key, initialValue) {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key)
      return item ? JSON.parse(item) : initialValue
    } catch (error) {
      return initialValue
    }
  })

  const setValue = useCallback((value) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value
      setStoredValue(valueToStore)
      window.localStorage.setItem(key, JSON.stringify(valueToStore))
    } catch (error) {
      console.error('Error saving to localStorage:', error)
    }
  }, [key, storedValue])

  return [storedValue, setValue]
}

export function useDebounce(value, delay = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useState(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => clearTimeout(handler)
  }, [value, delay])

  return debouncedValue
}

export function useMediaQuery(query) {
  const [matches, setMatches] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.matchMedia(query).matches
    }
    return false
  })

  useState(() => {
    const mediaQuery = window.matchMedia(query)
    const handler = (e) => setMatches(e.matches)
    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  }, [query])

  return matches
}

export function useClickOutside(ref, handler) {
  useState(() => {
    const listener = (event) => {
      if (!ref.current || ref.current.contains(event.target)) {
        return
      }
      handler(event)
    }

    document.addEventListener('mousedown', listener)
    document.addEventListener('touchstart', listener)

    return () => {
      document.removeEventListener('mousedown', listener)
      document.removeEventListener('touchstart', listener)
    }
  }, [ref, handler])
}