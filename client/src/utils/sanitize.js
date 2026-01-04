import DOMPurify from 'dompurify'

// Sanitize a string to prevent XSS attacks (client-side)
export function sanitize(str) {
  if (typeof str !== 'string') return str
  return DOMPurify.sanitize(str.trim(), {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: []
  })
}

// Sanitize an object (recursive) - client version
export function sanitizeObject(obj) {
  if (typeof obj === 'string') {
    return sanitize(obj)
  }
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item))
  }
  if (obj && typeof obj === 'object') {
    const sanitized = {}
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        sanitized[key] = sanitizeObject(obj[key])
      }
    }
    return sanitized
  }
  return obj
}

// Validate and sanitize URLs
export function sanitizeUrl(url) {
  if (typeof url !== 'string') return null
  const trimmed = url.trim().toLowerCase()

  // Block dangerous protocols
  const dangerousProtocols = ['javascript:', 'data:', 'vbscript:', 'file:', 'about:']
  for (const protocol of dangerousProtocols) {
    if (trimmed.startsWith(protocol)) {
      return null
    }
  }

  return DOMPurify.sanitize(url)
}

// Maximum length for text fields
export const MAX_LENGTHS = {
  first_name: 100,
  last_name: 100,
  email: 255,
  phone: 20,
  address: 500,
  high_school: 200,
  personal_statement: 5000,
  extracurriculars: 2000,
  strengths: 2000,
  weaknesses: 2000,
  notes: 5000,
  recommendations: 3000
}

// Validate and truncate text fields
export function validateAndTruncate(value, fieldName, maxLength = MAX_LENGTHS[fieldName]) {
  if (typeof value !== 'string') return value

  // Truncate to max length
  let sanitized = value.substring(0, maxLength)

  // Sanitize
  sanitized = sanitize(sanitized)

  return sanitized
}