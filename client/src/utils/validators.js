// Form validation helper functions

export const required = (value) => {
  if (!value || (typeof value === 'string' && !value.trim())) {
    return 'This field is required'
  }
  return null
}

export const email = (value) => {
  if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    return 'Please enter a valid email address'
  }
  return null
}

export const phone = (value) => {
  if (value && !/^[\d\s\-\+\(\)]{10,}$/.test(value)) {
    return 'Please enter a valid phone number'
  }
  return null
}

export const minLength = (min) => (value) => {
  if (value && value.length < min) {
    return `Must be at least ${min} characters`
  }
  return null
}

export const maxLength = (max) => (value) => {
  if (value && value.length > max) {
    return `Must be no more than ${max} characters`
  }
  return null
}

export const minValue = (min) => (value) => {
  if (value !== '' && value !== null && value !== undefined && !isNaN(Number(value))) {
    if (Number(value) < min) {
      return `Must be at least ${min}`
    }
  }
  return null
}

export const maxValue = (max) => (value) => {
  if (value !== '' && value !== null && value !== undefined && !isNaN(Number(value))) {
    if (Number(value) > max) {
      return `Must be no more than ${max}`
    }
  }
  return null
}

export const gpa = (value) => {
  if (value !== '' && value !== null) {
    const num = parseFloat(value)
    if (isNaN(num) || num < 0 || num > 4) {
      return 'GPA must be between 0.0 and 4.0'
    }
  }
  return null
}

export const satScore = (value) => {
  if (value !== '' && value !== null) {
    const num = parseInt(value)
    if (isNaN(num) || num < 400 || num > 1600) {
      return 'SAT score must be between 400 and 1600'
    }
  }
  return null
}

export const dateOfBirth = (value) => {
  if (value) {
    const dob = new Date(value)
    const today = new Date()
    const age = today.getFullYear() - dob.getFullYear()
    if (age < 16) {
      return 'You must be at least 16 years old'
    }
  }
  return null
}

export const composeValidators = (...validators) => (value) => {
  for (const validator of validators) {
    const error = validator(value)
    if (error) {
      return error
    }
  }
  return null
}

// Validate entire form
export const validateForm = (formData, validations) => {
  const errors = {}

  for (const field in validations) {
    const fieldValidators = validations[field]
    const value = formData[field]

    for (const validator of fieldValidators) {
      const error = validator(value)
      if (error) {
        errors[field] = error
        break // Only show first error for each field
      }
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  }
}

// Application form validations
export const applicationValidations = {
  program_id: [required],
  first_name: [
    required,
    minLength(2),
    maxLength(50)
  ],
  last_name: [
    required,
    minLength(2),
    maxLength(50)
  ],
  email: [
    required,
    email
  ],
  phone: [
    phone
  ],
  date_of_birth: [
    dateOfBirth
  ],
  gpa: [
    gpa
  ],
  sat_score: [
    satScore
  ],
  high_school: [
    maxLength(200)
  ],
  address: [
    maxLength(500)
  ],
  extracurriculars: [
    maxLength(2000)
  ],
  personal_statement: [
    minLength(50),
    maxLength(5000)
  ]
}

// Password validation
export const passwordValidations = {
  current_password: [required],
  new_password: [
    required,
    minLength(8),
    maxLength(100),
    (value) => {
      if (value && !/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(value)) {
        return 'Password must contain uppercase, lowercase, and number'
      }
      return null
    }
  ],
  confirm_password: [
    required,
    (value, formData) => {
      if (value !== formData.new_password) {
        return 'Passwords do not match'
      }
      return null
    }
  ]
}

// Login form validations
export const loginValidations = {
  email: [required, email],
  password: [required]
}

// Registration form validations
export const registrationValidations = {
  name: [required, minLength(2), maxLength(100)],
  email: [required, email],
  password: [
    required,
    minLength(8),
    (value) => {
      if (value && !/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(value)) {
        return 'Password must contain uppercase, lowercase, and number'
      }
      return null
    }
  ],
  confirm_password: [
    required,
    (value, formData) => {
      if (value !== formData.password) {
        return 'Passwords do not match'
      }
      return null
    }
  ]
}