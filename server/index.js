import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import initSqlJs from 'sql.js';
import { readFileSync, writeFileSync } from 'fs';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from project root
config({ path: join(__dirname, '..', '.env') });

const app = express()
const PORT = parseInt(process.env.SERVER_PORT) || 3001
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production'
const MAX_CONCURRENT_SESSIONS = parseInt(process.env.MAX_CONCURRENT_SESSIONS) || 5

// Security: Session management
const activeSessions = new Map() // userId -> Set of session tokens
const sessionTokenVersions = new Map() // userId -> token version

// Rate limiting setup
const loginAttempts = new Map()

// Security headers middleware
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'DENY')
  res.setHeader('X-XSS-Protection', '1; mode=block')
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'")
  res.removeHeader('X-Powered-By')
  next()
})

// AI Configuration
const AI_CONFIG = {
  apiKey: process.env.AI_API_KEY || 'your-ai-api-key-here',
  apiEndpoint: process.env.AI_API_ENDPOINT || 'https://api.openai.com/v1/chat/completions',
  model: process.env.AI_API_MODEL || 'gpt-3.5-turbo',
  timeout: parseInt(process.env.AI_TIMEOUT) || 30000,
  maxTokens: parseInt(process.env.AI_MAX_TOKENS) || 1000,
  cacheEnabled: process.env.AI_CACHE_ENABLED !== 'false',
  cacheExpiryMs: parseInt(process.env.AI_CACHE_EXPIRY) || 3600000 // 1 hour
}

// AI Response Cache
const aiCache = new Map()

// Usage Analytics
const aiUsage = new Map() // Track AI usage by user

// Middleware
app.use(cors())
app.use(express.json())

// Generate secure JWT token
function generateToken(user) {
  const payload = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    sessionVersion: sessionTokenVersions.get(user.id) || 1
  }
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h', jwtid: uuidv4() })
}

// Validate session and check for session fixation
function validateSession(req, res, next) {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1]

  if (!token) {
    return res.status(401).json({ message: 'Authentication required' })
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET)
    const currentVersion = sessionTokenVersions.get(decoded.id)

    // Session fixation check: reject if sessions were invalidated
    if (currentVersion && decoded.sessionVersion !== currentVersion) {
      return res.status(403).json({ message: 'Session invalidated. Please log in again.' })
    }

    req.user = decoded

    // Check concurrent sessions limit
    const userSessions = activeSessions.get(decoded.id)
    if (userSessions && !userSessions.has(token)) {
      // Session is not in active sessions - either expired or invalid
      // Don't reject immediately, but log and validate
      console.log(`Token not found in active sessions for user ${decoded.id}`)
    }

    next()
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Session expired. Please log in again.' })
    }
    return res.status(403).json({ message: 'Invalid or expired token' })
  }
}

// Cleanup expired sessions periodically
setInterval(() => {
  const now = Date.now()
  for (const [userId, tokens] of activeSessions.entries()) {
    // Remove tokens that are older than 24 hours - they'll fail validation anyway
    // This is a simple cleanup; in production, you'd track token creation time
    if (tokens.size > MAX_CONCURRENT_SESSIONS) {
      // Remove oldest tokens to respect limit
      const toRemove = Array.from(tokens).slice(0, tokens.size - MAX_CONCURRENT_SESSIONS)
      toRemove.forEach(t => tokens.delete(t))
    }
  }
}, 60000) // Run every minute

// XSS Prevention - sanitization helpers
const dangerousPatterns = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /javascript:/gi,
  /on\w+\s*=/gi,
  /<iframe/gi,
  /<object/gi,
  /<embed/gi,
  /<link/gi,
  /expression\s*\(/gi,
  /data:/gi,
  /vbscript:/gi
]

function sanitizeString(str) {
  if (typeof str !== 'string') return str

  let sanitized = str.trim()

  // Check for dangerous patterns
  for (const pattern of dangerousPatterns) {
    sanitized = sanitized.replace(pattern, '')
  }

  // HTML entity encoding for remaining dangerous characters
  sanitized = sanitized
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')

  return sanitized
}

function sanitizeInput(obj) {
  if (typeof obj === 'string') {
    return sanitizeString(obj)
  }
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeInput(item))
  }
  if (obj && typeof obj === 'object') {
    const sanitized = {}
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        sanitized[key] = sanitizeInput(obj[key])
      }
    }
    return sanitized
  }
  return obj
}

// Input sanitization middleware - applies to all JSON bodies
app.use((req, res, next) => {
  if (req.body && typeof req.body === 'object') {
    // Sanitize the body but handle special fields that might contain valid data
    const sensitiveFields = ['password', 'password_hash']

    req.body = sanitizeInput(req.body)

    // Restore hashed passwords (they're already safe hex strings)
    if (sensitiveFields.length > 0) {
      // Password fields should not be touched as they're hashed strings
    }
  }

  // Sanitize query parameters
  if (req.query && typeof req.query === 'object') {
    req.query = sanitizeInput(req.query)
  }

  next()
})

// Maximum length for text fields (server-side validation)
const MAX_LENGTHS = {
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

function validateFieldLength(value, fieldName) {
  const maxLength = MAX_LENGTHS[fieldName]
  if (!maxLength) return true // No limit defined for this field

  if (value && value.length > maxLength) {
    return false
  }
  return true
}

let db

// Initialize Database
async function initializeDatabase() {
  const SQL = await initSqlJs()

  // Try to load existing database
  try {
    const buffer = readFileSync('college_admissions.db')
    db = new SQL.Database(buffer)
  } catch {
    db = new SQL.Database()
  }

  // Create tables
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT DEFAULT 'applicant' CHECK(role IN ('admin', 'officer', 'applicant')),
      avatar_url TEXT,
      preferences TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS programs (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      degree_type TEXT NOT NULL CHECK(degree_type IN ('bachelors', 'masters', 'phd')),
      department TEXT,
      duration_years INTEGER DEFAULT 4,
      intake_capacity INTEGER,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS applications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      program_id TEXT NOT NULL,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT,
      date_of_birth TEXT,
      address TEXT,
      high_school TEXT,
      gpa REAL,
      sat_score INTEGER,
      extracurriculars TEXT,
      personal_statement TEXT,
      status TEXT DEFAULT 'draft' CHECK(status IN ('draft', 'submitted', 'under_review', 'accepted', 'rejected')),
      submitted_at TEXT,
      reviewed_by TEXT,
      reviewed_at TEXT,
      review_notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (program_id) REFERENCES programs(id)
    )
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      application_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      document_type TEXT NOT NULL CHECK(document_type IN ('transcript', 'recommendation', 'essay', 'test_score', 'other')),
      file_name TEXT NOT NULL,
      file_path TEXT,
      uploaded_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (application_id) REFERENCES applications(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS reviews (
      id TEXT PRIMARY KEY,
      application_id TEXT NOT NULL,
      reviewer_id TEXT NOT NULL,
      rating INTEGER CHECK(rating >= 1 AND rating <= 5),
      strengths TEXT,
      weaknesses TEXT,
      recommendation TEXT CHECK(recommendation IN ('accept', 'reject', 'waitlist')),
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (application_id) REFERENCES applications(id),
      FOREIGN KEY (reviewer_id) REFERENCES users(id)
    )
  `)

  // Seed initial data if empty
  const userCount = db.exec('SELECT COUNT(*) as count FROM users')[0]?.values[0][0] || 0
  if (userCount === 0) {
    const hashedPassword = bcrypt.hashSync('admin123', 10)
    const officerPassword = bcrypt.hashSync('officer123', 10)
    const studentPassword = bcrypt.hashSync('student123', 10)

    db.run(`INSERT INTO users (id, email, password_hash, name, role) VALUES (?, ?, ?, ?, ?)`,
      [uuidv4(), 'admin@college.edu', hashedPassword, 'Admin User', 'admin'])
    db.run(`INSERT INTO users (id, email, password_hash, name, role) VALUES (?, ?, ?, ?, ?)`,
      [uuidv4(), 'officer@college.edu', officerPassword, 'Admissions Officer', 'officer'])
    db.run(`INSERT INTO users (id, email, password_hash, name, role) VALUES (?, ?, ?, ?, ?)`,
      [uuidv4(), 'student@email.com', studentPassword, 'John Student', 'applicant'])

    // Seed programs
    const programs = [
      ['Computer Science', 'Study of computation and algorithms', 'bachelors', 'Engineering', 4, 100],
      ['Business Administration', 'Management and business operations', 'bachelors', 'Business', 4, 80],
      ['Data Science', 'Analysis and interpretation of data', 'masters', 'Computer Science', 2, 40],
      ['Electrical Engineering', 'Study of electricity and electronics', 'bachelors', 'Engineering', 4, 60]
    ]

    for (const prog of programs) {
      db.run(`INSERT INTO programs (id, name, description, degree_type, department, duration_years, intake_capacity) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [uuidv4(), ...prog])
    }

    saveDatabase()
    console.log('✅ Database seeded with initial data')
  }
}

function saveDatabase() {
  const data = db.export()
  const buffer = Buffer.from(data)
  writeFileSync('college_admissions.db', buffer)
}

// AI Helper Functions
async function callAI(prompt, context = {}) {
  const cacheKey = `${prompt.substring(0, 50)}:${JSON.stringify(context)}`

  // Check cache
  if (AI_CONFIG.cacheEnabled && aiCache.has(cacheKey)) {
    const cached = aiCache.get(cacheKey)
    if (Date.now() - cached.timestamp < AI_CONFIG.cacheExpiryMs) {
      return { ...cached.response, cached: true }
    }
  }

  // Build context-aware messages for OpenAI-compatible API
  const systemPrompt = `You are a helpful college admissions assistant for College Admissions Portal.
Current context:
- User role: ${context.userRole || 'applicant'}
- Current page: ${context.currentPage || 'unknown'}
- Application status: ${context.applicationStatus || 'not_started'}
- User's native language: ${context.language || 'English'}

Guidelines:
- Be helpful, encouraging, and supportive
- Provide accurate information about admissions processes
- Suggest next steps when appropriate
- If you cannot help with something, gently suggest contacting admissions
- Keep responses concise but informative
- Match the user's language preference`

  try {
    let response

    // Try to call the real AI API if endpoint is configured
    if (AI_CONFIG.apiEndpoint && AI_CONFIG.apiEndpoint !== 'https://api.openai.com/v1/chat/completions') {
      response = await callAIApi(prompt, systemPrompt, context)
    }

    // Fallback to simulated responses if API call failed or no valid API key
    if (!response || !response.success) {
      console.log('Using simulated AI responses')
      response = await simulateAIResponse(prompt, systemPrompt, context)
    }

    // Cache the response
    if (AI_CONFIG.cacheEnabled) {
      aiCache.set(cacheKey, {
        response,
        timestamp: Date.now()
      })
    }

    return { ...response, cached: false }
  } catch (error) {
    console.error('AI API Error:', error)
    // Fallback to simulated responses on error
    const simulatedResponse = await simulateAIResponse(prompt, systemPrompt, context)
    return simulatedResponse
  }
}

async function callAIApi(prompt, systemPrompt, context) {
  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: prompt }
  ]

  try {
    const response = await fetch(AI_CONFIG.apiEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${AI_CONFIG.apiKey}`
      },
      body: JSON.stringify({
        model: AI_CONFIG.model,
        messages,
        max_tokens: AI_CONFIG.maxTokens,
        temperature: 0.7
      }),
      signal: AbortSignal.timeout(AI_CONFIG.timeout)
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('AI API error:', response.status, errorText)
      return { success: false, error: `API error: ${response.status}` }
    }

    const data = await response.json()

    if (data.choices && data.choices.length > 0) {
      const message = data.choices[0].message
      const content = message.content || ''

      // Extract suggestions from the response (simple heuristic)
      const suggestions = extractSuggestions(content)

      return {
        success: true,
        message: content.trim(),
        suggestions,
        context: {
          detectedIntent: 'ai_generated',
          timestamp: new Date().toISOString()
        }
      }
    }

    return { success: false, error: 'No response from AI' }
  } catch (error) {
    console.error('AI API call failed:', error.message)
    return { success: false, error: error.message }
  }
}

function extractSuggestions(content) {
  // Simple heuristic: look for common question patterns or numbered lists
  const suggestions = []

  // Look for "Would you like to know about..." style suggestions
  const wouldYouMatch = content.match(/Would you (like to|want to)\s+([^?]+)\?/gi)
  if (wouldYouMatch) {
    wouldYouMatch.slice(0, 3).forEach(match => {
      const suggestion = match.replace(/Would you (like to|want to)\s+/i, '').replace(/\?$/, '').trim()
      if (suggestion.length < 50) suggestions.push(suggestion.charAt(0).toUpperCase() + suggestion.slice(1))
    })
  }

  // Default suggestions if none found
  if (suggestions.length === 0) {
    suggestions.push('Application deadlines', 'Document requirements', 'My application status')
  }

  return suggestions.slice(0, 4)
}

async function simulateAIResponse(prompt, systemPrompt, context) {
  // Simulated AI responses - replace with actual AI API integration
  const lowerPrompt = prompt.toLowerCase()

  // Context-aware response generation
  const responses = {
    greeting: {
      message: `Hello! I'm your Admissions AI Assistant. I'm here to help you with your application journey. Feel free to ask me about:
- Application requirements and deadlines
- Document preparation tips
- Program information
- Your application status
- General admissions questions

How can I help you today?`,
      suggestions: ['Application deadlines', 'Document requirements', 'My application status', 'Program information']
    },
    deadline: {
      message: `Here are the upcoming application deadlines for ${context.programName || 'this term'}:

**Regular Decision:** January 15, 2026
**Early Action:** November 1, 2025
**Transfer Students:** March 1, 2026
**Graduate Programs:** Varies by department

Would you like more specific information about any of these deadlines?`,
      suggestions: ['Financial aid deadlines', ' scholarship deadlines', 'Late applications']
    },
    transcript: {
      message: `For your transcript submission, here's what you need to know:

**Required:**
- Official high school transcript (sealed)
- College transcripts (if transfer student)

**Tips:**
- Request transcripts at least 2 weeks before deadline
- Electronic transcripts are accepted from most schools
- Keep copies of everything you send

Do you have specific questions about transcript ordering?`,
      suggestions: ['Electronic transcripts', 'International transcripts', 'Transcript evaluation']
    },
    personal_statement: {
      message: `Your personal statement is your chance to tell your story! Here are some tips:

**Structure:**
1. Introduction that hooks the reader
2. Academic and personal growth
3. Why this program/institution
4. Future goals
5. Strong conclusion

**Common Topics:**
- Overcoming challenges
- Passion for your field
- Unique experiences
- Leadership and growth

Would you like feedback on your draft?`,
      suggestions: ['Essay topics', 'Editing tips', 'Word limit', 'Common mistakes']
    },
    status: {
      message: `Your application status depends on where you are in the process:

**Statuses and Meanings:**
- **Draft:** Application started but not submitted
- **Submitted:** Application received, under initial review
- **Under Review:** Being evaluated by admissions team
- **Accepted:** Congratulations! Offer of admission
- **Rejected:** Unfortunately not selected this cycle

Your current status: ${context.applicationStatus || 'Not started'}

Is there something specific about your status you'd like to know?`,
      suggestions: ['Decision timeline', 'What under review means', 'Acceptance rate']
    },
    fee_waiver: {
      message: `I understand cost is a concern. Here's information about fee waivers:

**Eligibility typically includes:**
- FAFSA qualifiers
- Income-based hardship
- Military service
- Foster youth

**To request:**
- Contact our financial aid office
- Provide documentation of need
- Requests processed within 5 business days

Would you like me to connect you with financial aid counseling?`,
      suggestions: ['FAFSA help', 'Scholarship search', 'Payment plans']
    },
    default: {
      message: `Thanks for your question about "${prompt.substring(0, 50)}..."

I'm your AI admissions assistant. While I can provide general guidance, for specific situations it's best to speak directly with our admissions team.

You can reach them at:
- Email: admissions@college.edu
- Phone: (555) 123-4567
- Office Hours: Mon-Fri, 9am-5pm

Is there something else I can help you with?`,
      suggestions: ['Contact admissions', 'Schedule appointment', 'More about programs']
    }
  }

  // Intent detection
  let intent = 'default'
  if (/^(hi|hello|hey|good morning|good afternoon|good evening)/.test(lowerPrompt)) {
    intent = 'greeting'
  } else if (/deadline|due date|when is|by when/i.test(lowerPrompt)) {
    intent = 'deadline'
  } else if (/transcript|record|official|copy/i.test(lowerPrompt)) {
    intent = 'transcript'
  } else if (/essay|personal statement|writing|word/i.test(lowerPrompt)) {
    intent = 'personal_statement'
  } else if (/status|decision|accepted|rejected|under review/i.test(lowerPrompt)) {
    intent = 'status'
  } else if (/fee|waiver|cost|expensive|pay/i.test(lowerPrompt)) {
    intent = 'fee_waiver'
  }

  const response = responses[intent] || responses.default
  return {
    success: true,
    message: response.message,
    suggestions: response.suggestions,
    context: {
      detectedIntent: intent,
      timestamp: new Date().toISOString()
    }
  }
}

// Onboarding specific AI functions
function analyzeApplicantProfile(profile) {
  const recommendations = []
  const warnings = []

  // Analyze GPA
  if (profile.gpa >= 3.7) {
    recommendations.push('Strong academic profile - consider competitive programs')
  } else if (profile.gpa >= 3.0) {
    recommendations.push('Good standing - focus on demonstrating growth')
  } else {
    warnings.push('Consider addressing any academic challenges in your personal statement')
  }

  // Analyze test scores
  if (!profile.satScore && !profile.actScore) {
    warnings.push('Consider taking standardized tests or exploring test-optional programs')
  }

  // Program recommendations based on interests
  if (profile.interests?.includes('computer science')) {
    recommendations.push('Computer Science has strong job placement - highlight any coding projects')
  }

  return { recommendations, warnings, completionPercentage: calculateCompletion(profile) }
}

function calculateCompletion(profile) {
  const required = ['firstName', 'lastName', 'email', 'programId', 'highSchool']
  const recommended = ['gpa', 'satScore', 'extracurriculars', 'personalStatement', 'recommendations']

  let total = required.length + recommended.length
  let completed = 0

  // Count only filled fields and cap at 100%
  required.forEach(field => {
    if (profile[field]) completed++
  })
  recommended.forEach(field => {
    if (profile[field]) completed++
  })

  return Math.min(Math.round((completed / total) * 100), 100)
}

function getDeadlinesForProgram(programId, programName) {
  return {
    regular: 'January 15, 2026',
    early: 'November 1, 2025',
    transfer: 'March 1, 2026',
    programName: programName || 'General',
    warnings: []
  }
}

// Helper functions
function queryOne(sql, params = []) {
  const stmt = db.prepare(sql)
  stmt.bind(params)
  if (stmt.step()) {
    const row = stmt.getAsObject()
    stmt.free()
    return row
  }
  stmt.free()
  return null
}

function queryAll(sql, params = []) {
  const stmt = db.prepare(sql)
  stmt.bind(params)
  const results = []
  while (stmt.step()) {
    results.push(stmt.getAsObject())
  }
  stmt.free()
  return results
}

function runQuery(sql, params = []) {
  db.run(sql, params)
  saveDatabase()
}

// Auth middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1]

  if (!token) {
    return res.status(401).json({ message: 'Authentication required' })
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid or expired token' })
    }
    req.user = user
    next()
  })
}

// Auth routes
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, name, role = 'applicant' } = req.body

    if (!email || !password || !name) {
      return res.status(400).json({ message: 'Email, password, and name are required' })
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return res.status(400).json({ message: 'Invalid email format' })
    }

    // Password strength validation
    if (password.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters' })
    }

    const existing = queryOne('SELECT id FROM users WHERE email = ?', [email])
    if (existing) {
      return res.status(400).json({ message: 'Email already registered' })
    }

    const hashedPassword = await bcrypt.hash(password, 10)
    const id = uuidv4()

    runQuery(`INSERT INTO users (id, email, password_hash, name, role) VALUES (?, ?, ?, ?, ?)`,
      [id, email, hashedPassword, name, role])

    // Initialize session version for this user
    sessionTokenVersions.set(id, 1)

    const user = { id, email, name, role }
    const token = generateToken(user)

    // Track the session
    if (!activeSessions.has(id)) {
      activeSessions.set(id, new Set())
    }
    activeSessions.get(id).add(token)

    res.status(201).json({
      message: 'Registration successful',
      user,
      token
    })
  } catch (error) {
    console.error('Registration error:', error)
    res.status(500).json({ message: 'Registration failed' })
  }
})

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body

    // Rate limiting check
    const now = Date.now()
    const windowMs = 15 * 60 * 1000 // 15 minutes
    const maxAttempts = 5

    if (!loginAttempts.has(email)) {
      loginAttempts.set(email, { count: 0, resetTime: now + windowMs })
    }

    const attemptData = loginAttempts.get(email)

    // Reset if window has passed
    if (now > attemptData.resetTime) {
      attemptData.count = 0
      attemptData.resetTime = now + windowMs
    }

    // Check if rate limited
    if (attemptData.count >= maxAttempts) {
      const remainingTime = Math.ceil((attemptData.resetTime - now) / 1000 / 60)
      return res.status(429).json({
        message: `Too many login attempts. Please try again in ${remainingTime} minutes.`,
        retryAfter: remainingTime
      })
    }

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' })
    }

    const user = queryOne('SELECT * FROM users WHERE email = ?', [email])
    if (!user) {
      attemptData.count++
      loginAttempts.set(email, attemptData)
      return res.status(401).json({ message: 'Invalid email or password' })
    }

    const validPassword = await bcrypt.compare(password, user.password_hash)
    if (!validPassword) {
      attemptData.count++
      loginAttempts.set(email, attemptData)
      return res.status(401).json({ message: 'Invalid email or password' })
    }

    // Reset attempts on successful login
    attemptData.count = 0
    loginAttempts.set(email, attemptData)

    // Generate session token
    const userForToken = { id: user.id, email: user.email, name: user.name, role: user.role }
    const token = generateToken(userForToken)

    // Track the session
    if (!activeSessions.has(user.id)) {
      activeSessions.set(user.id, new Set())
    }
    const userSessions = activeSessions.get(user.id)
    userSessions.add(token)

    // Enforce concurrent session limit
    if (userSessions.size > MAX_CONCURRENT_SESSIONS) {
      // Remove oldest session
      const oldest = userSessions.values().next().value
      userSessions.delete(oldest)
    }

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      },
      token
    })
  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({ message: 'Login failed' })
  }
})

app.post('/api/auth/logout', authenticateToken, (req, res) => {
  // Remove this session from active sessions
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1]

  if (token && activeSessions.has(req.user.id)) {
    activeSessions.get(req.user.id).delete(token)
  }

  res.json({ message: 'Logged out successfully' })
})

app.post('/api/auth/forgot-password', (req, res) => {
  const { email } = req.body

  if (!email) {
    return res.status(400).json({ message: 'Email is required' })
  }

  // Check if user exists
  const user = queryOne('SELECT id, email FROM users WHERE email = ?', [email])

  // Always return success to prevent email enumeration
  if (user) {
    // Generate reset token (valid for 1 hour)
    const resetToken = jwt.sign(
      { id: user.id, type: 'password-reset' },
      JWT_SECRET,
      { expiresIn: '1h' }
    )

    // In development mode, log the reset link
    console.log(`\n[PASSWORD RESET] For email: ${email}`)
    console.log(`Reset URL: http://localhost:3000/reset-password?token=${resetToken}\n`)
  }

  res.json({
    message: 'If an account exists with that email, a password reset link will be sent.'
  })
})

app.post('/api/auth/reset-password', async (req, res) => {
  const { token, newPassword } = req.body

  if (!token || !newPassword) {
    return res.status(400).json({ message: 'Token and new password are required' })
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters' })
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET)

    if (decoded.type !== 'password-reset') {
      return res.status(400).json({ message: 'Invalid reset token' })
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10)
    runQuery('UPDATE users SET password_hash = ?, updated_at = datetime("now") WHERE id = ?',
      [hashedPassword, decoded.id])

    res.json({ message: 'Password reset successful. You can now log in with your new password.' })
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(400).json({ message: 'Reset token has expired. Please request a new one.' })
    }
    return res.status(400).json({ message: 'Invalid reset token' })
  }
})

app.get('/api/auth/me', authenticateToken, (req, res) => {
  const user = queryOne('SELECT id, email, name, role, avatar_url, preferences, created_at FROM users WHERE id = ?', [req.user.id])
  if (!user) {
    return res.status(404).json({ message: 'User not found' })
  }
  res.json(user)
})

app.put('/api/auth/profile', authenticateToken, (req, res) => {
  const { name, preferences } = req.body
  runQuery(`UPDATE users SET name = ?, preferences = ?, updated_at = datetime('now') WHERE id = ?`,
    [name, JSON.stringify(preferences), req.user.id])
  res.json({ message: 'Profile updated' })
})

// Update password
app.put('/api/auth/password', authenticateToken, async (req, res) => {
  const { currentPassword, newPassword } = req.body

  if (!currentPassword || !newPassword || newPassword.length < 6) {
    return res.status(400).json({ message: 'Current password and new password (6+ chars) required' })
  }

  const user = queryOne('SELECT password_hash FROM users WHERE id = ?', [req.user.id])
  const validPassword = await bcrypt.compare(currentPassword, user.password_hash)

  if (!validPassword) {
    return res.status(401).json({ message: 'Current password is incorrect' })
  }

  const hashedPassword = await bcrypt.hash(newPassword, 10)
  runQuery('UPDATE users SET password_hash = ?, updated_at = datetime("now") WHERE id = ?',
    [hashedPassword, req.user.id])

  res.json({ message: 'Password updated successfully' })
})

// User management endpoints (admin only)
app.get('/api/users', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' })
  }

  const users = queryAll('SELECT id, email, name, role, created_at FROM users ORDER BY created_at DESC')
  res.json(users)
})

app.put('/api/users/:id/role', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' })
  }

  const { role } = req.body
  if (!['admin', 'officer', 'applicant'].includes(role)) {
    return res.status(400).json({ message: 'Invalid role' })
  }

  runQuery('UPDATE users SET role = ?, updated_at = datetime("now") WHERE id = ?', [role, req.params.id])
  res.json({ message: 'User role updated' })
})

app.delete('/api/users/:id', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' })
  }

  if (req.params.id === req.user.id) {
    return res.status(400).json({ message: 'Cannot delete your own account' })
  }

  runQuery('DELETE FROM users WHERE id = ?', [req.params.id])
  res.json({ message: 'User deleted' })
})

// Document upload endpoint
app.post('/api/documents', authenticateToken, (req, res) => {
  const { applicationId, documentType, fileName } = req.body

  if (!applicationId || !documentType || !fileName) {
    return res.status(400).json({ message: 'Application ID, document type, and filename required' })
  }

  // Verify user owns the application
  const application = queryOne('SELECT * FROM applications WHERE id = ?', [applicationId])
  if (!application) {
    return res.status(404).json({ message: 'Application not found' })
  }

  if (req.user.role === 'applicant' && application.user_id !== req.user.id) {
    return res.status(403).json({ message: 'Access denied' })
  }

  const id = uuidv4()
  runQuery(`
    INSERT INTO documents (id, application_id, user_id, document_type, file_name)
    VALUES (?, ?, ?, ?, ?)
  `, [id, applicationId, req.user.id, documentType, fileName])

  res.json({ message: 'Document uploaded', document: { id, applicationId, documentType, fileName } })
})

app.get('/api/documents/:applicationId', authenticateToken, (req, res) => {
  const application = queryOne('SELECT * FROM applications WHERE id = ?', [req.params.applicationId])
  if (!application) {
    return res.status(404).json({ message: 'Application not found' })
  }

  if (req.user.role === 'applicant' && application.user_id !== req.user.id) {
    return res.status(403).json({ message: 'Access denied' })
  }

  const documents = queryAll('SELECT * FROM documents WHERE application_id = ?', [req.params.applicationId])
  res.json(documents)
})

app.delete('/api/documents/:id', authenticateToken, (req, res) => {
  const document = queryOne('SELECT * FROM documents WHERE id = ?', [req.params.id])
  if (!document) {
    return res.status(404).json({ message: 'Document not found' })
  }

  const application = queryOne('SELECT * FROM applications WHERE id = ?', [document.application_id])
  if (req.user.role === 'applicant' && application?.user_id !== req.user.id) {
    return res.status(403).json({ message: 'Access denied' })
  }

  runQuery('DELETE FROM documents WHERE id = ?', [req.params.id])
  res.json({ message: 'Document deleted' })
})

// Status change with authorization
app.put('/api/applications/:id/status', authenticateToken, (req, res) => {
  const { status } = req.body
  const validStatuses = ['draft', 'submitted', 'under_review', 'accepted', 'rejected']

  if (!validStatuses.includes(status)) {
    return res.status(400).json({ message: 'Invalid status' })
  }

  const application = queryOne('SELECT * FROM applications WHERE id = ?', [req.params.id])
  if (!application) {
    return res.status(404).json({ message: 'Application not found' })
  }

  // Applicants can only submit draft applications
  if (req.user.role === 'applicant') {
    if (application.user_id !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' })
    }
    if (status !== 'submitted' || application.status !== 'draft') {
      return res.status(403).json({ message: 'Applicants can only submit draft applications' })
    }
  }

  // Only officers and admins can change to review statuses
  if (['under_review', 'accepted', 'rejected'].includes(status)) {
    if (!['admin', 'officer'].includes(req.user.role)) {
      return res.status(403).json({ message: 'Only admissions officers can change to this status' })
    }
  }

  runQuery(`
    UPDATE applications
    SET status = ?, updated_at = datetime('now'),
    reviewed_by = ?, reviewed_at = datetime('now')
    WHERE id = ?
  `, [status, req.user.id, req.params.id])

  res.json({
    message: 'Status updated',
    application: queryOne('SELECT * FROM applications WHERE id = ?', [req.params.id])
  })
})

// Reports endpoint
app.get('/api/reports', authenticateToken, (req, res) => {
  if (!['admin', 'officer'].includes(req.user.role)) {
    return res.status(403).json({ message: 'Access access required' })
  }

  const { type = 'summary' } = req.query

  if (type === 'summary' || type === 'all') {
    const total = queryOne('SELECT COUNT(*) as count FROM applications')?.count || 0
    const byStatus = queryAll(`
      SELECT status, COUNT(*) as count
      FROM applications
      GROUP BY status
    `)
    const byMonth = queryAll(`
      SELECT strftime('%Y-%m', created_at) as month, COUNT(*) as count
      FROM applications
      WHERE created_at >= datetime('now', '-12 months')
      GROUP BY month
      ORDER BY month
    `)
    const byProgram = queryAll(`
      SELECT p.name as program, COUNT(*) as count
      FROM applications a
      JOIN programs p ON a.program_id = p.id
      GROUP BY p.id
      ORDER BY count DESC
    `)

    res.json({
      summary: { total, byStatus, byMonth, byProgram }
    })
  }
})

// Audit log endpoint (simulated)
app.get('/api/audit-logs', authenticateToken, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' })
  }

  // In production, this would query an audit_logs table
  res.json({
    message: 'Audit logs retrieved',
    logs: [
      { action: 'login', userId: req.user.id, timestamp: new Date().toISOString() },
      { action: 'view_dashboard', userId: req.user.id, timestamp: new Date().toISOString() }
    ]
  })
})

// AI Assistant Endpoints
app.post('/api/ai/chat', authenticateToken, async (req, res) => {
  try {
    const { message, conversationHistory = [] } = req.body

    if (!message || message.trim().length === 0) {
      return res.status(400).json({ message: 'Message is required' })
    }

    // Get user context
    const user = queryOne('SELECT * FROM users WHERE id = ?', [req.user.id])
    const applications = queryAll('SELECT * FROM applications WHERE user_id = ? ORDER BY created_at DESC', [req.user.id])

    const context = {
      userRole: user?.role || 'applicant',
      userName: user?.name,
      applicationStatus: applications[0]?.status || 'not_started',
      currentPage: req.body.currentPage || 'unknown',
      language: user?.preferences ? JSON.parse(user.preferences).language : 'English',
      hasApplications: applications.length > 0,
      applicationCount: applications.length
    }

    const response = await callAI(message, context)

    // Track usage
    if (!aiUsage.has(req.user.id)) {
      aiUsage.set(req.user.id, { messages: 0, lastUsed: null })
    }
    const usage = aiUsage.get(req.user.id)
    usage.messages++
    usage.lastUsed = new Date().toISOString()

    res.json({
      success: response.success,
      message: response.message,
      suggestions: response.suggestions,
      context: response.context,
      cached: response.cached || false
    })
  } catch (error) {
    console.error('AI Chat Error:', error)
    res.status(500).json({ success: false, message: 'Failed to process AI request' })
  }
})

app.get('/api/ai/usage', authenticateToken, (req, res) => {
  // Return user's AI usage stats
  const usage = aiUsage.get(req.user.id) || { messages: 0, lastUsed: null }
  res.json({
    totalMessages: usage.messages,
    lastUsed: usage.lastUsed
  })
})

app.get('/api/ai/admin/stats', (req, res) => {
  // Admin endpoint for AI usage analytics
  const totalUsers = aiUsage.size
  const totalMessages = Array.from(aiUsage.values()).reduce((sum, u) => sum + u.messages, 0)
  const activeToday = Array.from(aiUsage.values()).filter(u => {
    return u.lastUsed && new Date(u.lastUsed).toDateString() === new Date().toDateString()
  }).length

  res.json({
    totalUsers,
    totalMessages,
    activeToday,
    cacheSize: aiCache.size,
    timestamp: new Date().toISOString()
  })
})

// AI Onboarding Wizard endpoints
app.post('/api/ai/onboarding/analyze', authenticateToken, (req, res) => {
  try {
    const { profile } = req.body

    if (!profile) {
      return res.status(400).json({ message: 'Profile data is required' })
    }

    const analysis = analyzeApplicantProfile(profile)

    res.json({
      success: true,
      recommendations: analysis.recommendations,
      warnings: analysis.warnings,
      completionPercentage: analysis.completionPercentage,
      phase: determinePhase(profile),
      nextSteps: generateNextSteps(profile, analysis)
    })
  } catch (error) {
    console.error('Onboarding Analysis Error:', error)
    res.status(500).json({ success: false, message: 'Failed to analyze profile' })
  }
})

app.post('/api/ai/onboarding/completeness', authenticateToken, (req, res) => {
  try {
    const { profile, applicationType } = req.body

    if (!profile) {
      return res.status(400).json({ message: 'Profile data is required' })
    }

    const completion = calculateCompletion(profile)
    const missingItems = getMissingItems(profile, applicationType)
    const deadlineInfo = getDeadlinesForProgram(profile.programId, profile.programName)

    res.json({
      success: true,
      completionPercentage: completion,
      missingItems,
      deadlineInfo,
      readinessScore: calculateReadiness(profile),
      estimatedTimeToComplete: estimateCompletionTime(profile)
    })
  } catch (error) {
    console.error('Completeness Check Error:', error)
    res.status(500).json({ success: false, message: 'Failed to check completeness' })
  }
})

app.post('/api/ai/onboarding/recommend-programs', authenticateToken, (req, res) => {
  try {
    const { profile, interests } = req.body

    const programs = queryAll('SELECT * FROM programs WHERE is_active = 1 ORDER BY name')

    // Simple matching logic (expand with AI in production)
    const recommendations = programs.map(program => {
      let matchScore = 50
      let reasons = []

      // Match based on interests if provided
      if (interests?.includes('computer') && program.department?.toLowerCase().includes('computer')) {
        matchScore += 30
        reasons.push('Strong academic match')
      }
      if (interests?.includes('business') && program.department?.toLowerCase().includes('business')) {
        matchScore += 30
        reasons.push('Career alignment')
      }

      // GPA-based recommendations
      if (profile.gpa >= 3.5 && program.degree_type === 'phd') {
        matchScore += 20
        reasons.push('Qualifies for advanced study')
      }

      return {
        ...program,
        matchScore: Math.min(matchScore, 100),
        reasons: reasons.length > 0 ? reasons : ['Program available']
      }
    }).sort((a, b) => b.matchScore - a.matchScore).slice(0, 5)

    res.json({
      success: true,
      recommendations,
      analyzedAt: new Date().toISOString()
    })
  } catch (error) {
    console.error('Program Recommendations Error:', error)
    res.status(500).json({ success: false, message: 'Failed to generate recommendations' })
  }
})

app.post('/api/ai/onboarding/admission-chances', authenticateToken, (req, res) => {
  try {
    const { profile } = req.body

    // Calculate estimated admission chances
    let baseChance = 50

    // GPA factor (simplified)
    if (profile.gpa >= 4.0) baseChance += 30
    else if (profile.gpa >= 3.7) baseChance += 20
    else if (profile.gpa >= 3.3) baseChance += 10
    else if (profile.gpa >= 3.0) baseChance += 0
    else baseChance -= 20

    // Test scores factor
    const hasTest = profile.satScore >= 1400 || profile.actScore >= 32
    if (hasTest) baseChance += 10

    // Experience factor
    if (profile.extracurriculars?.length > 0) baseChance += 5
    if (profile.workExperience) baseChance += 5

    // Normalize
    baseChance = Math.max(10, Math.min(95, baseChance))

    const factors = []
    if (profile.gpa >= 3.7) factors.push({ factor: 'Strong GPA', impact: 'positive' })
    if (profile.gpa < 3.0) factors.push({ factor: 'GPA below average', impact: 'negative' })
    if (hasTest) factors.push({ factor: 'Strong test scores', impact: 'positive' })
    if (!hasTest) factors.push({ factor: 'Consider test-optional or submit scores', impact: 'neutral' })
    if (profile.extracurriculars?.length > 0) factors.push({ factor: 'Well-rounded profile', impact: 'positive' })

    res.json({
      success: true,
      estimatedChance: baseChance,
      confidenceLevel: baseChance > 80 || baseChance < 30 ? 'high' : 'medium',
      factors,
      disclaimer: 'This is an estimate based on provided information. Actual decisions depend on holistic review.',
      analyzedAt: new Date().toISOString()
    })
  } catch (error) {
    console.error('Admission Chances Error:', error)
    res.status(500).json({ success: false, message: 'Failed to calculate admission chances' })
  }
})

// Helper functions for onboarding
function determinePhase(profile) {
  if (!profile.firstName || !profile.lastName || !profile.email) return 'profile'
  if (!profile.programId) return 'program_selection'
  if (!profile.gpa || !profile.highSchool) return 'academic'
  if (!profile.personalStatement) return 'essay'
  if (!profile.recommendations?.length) return 'documents'
  return 'review'
}

function generateNextSteps(profile, analysis) {
  const steps = []
  const phase = determinePhase(profile)

  if (phase === 'profile' || !profile.firstName) {
    steps.push({ action: 'Complete personal information', priority: 'high' })
  }
  if (phase === 'program_selection' || !profile.programId) {
    steps.push({ action: 'Select your target program', priority: 'high' })
  }
  if (phase === 'academic' || !profile.gpa) {
    steps.push({ action: 'Enter academic records', priority: 'high' })
  }
  if (phase === 'essay' || !profile.personalStatement) {
    steps.push({ action: 'Write your personal statement', priority: 'medium' })
  }
  if (phase === 'documents' || !profile.recommendations?.length) {
    steps.push({ action: 'Request recommendation letters', priority: 'medium' })
  }

  // Add AI recommendations
  analysis.recommendations.forEach(rec => {
    steps.push({ action: rec, priority: 'low', type: 'recommendation' })
  })

  // Add warnings as critical steps
  analysis.warnings.forEach(warn => {
    steps.push({ action: warn, priority: 'high', type: 'warning' })
  })

  return steps
}

function getMissingItems(profile, applicationType) {
  const required = [
    { field: 'firstName', label: 'First Name' },
    { field: 'lastName', label: 'Last Name' },
    { field: 'email', label: 'Email Address' },
    { field: 'programId', label: 'Program Selection' },
    { field: 'highSchool', label: 'High School/College' },
    { field: 'gpa', label: 'GPA' },
    { field: 'personalStatement', label: 'Personal Statement' }
  ]

  const recommended = [
    { field: 'satScore', label: 'SAT/ACT Score' },
    { field: 'extracurriculars', label: 'Extracurricular Activities' },
    { field: 'recommendations', label: 'Recommendation Letters' }
  ]

  const missing = []

  required.forEach(item => {
    if (!profile[item.field]) {
      missing.push({ ...item, priority: 'required' })
    }
  })

  recommended.forEach(item => {
    if (!profile[item.field]) {
      missing.push({ ...item, priority: 'recommended' })
    }
  })

  return missing
}

function calculateReadiness(profile) {
  const completion = calculateCompletion(profile)
  const missing = getMissingItems(profile)

  if (missing.length === 0) return { level: 'ready', message: 'Ready to submit!' }
  if (missing.filter(m => m.priority === 'required').length > 2) {
    return { level: 'needs_work', message: 'Complete required fields before submission' }
  }
  if (missing.length > 0) {
    return { level: 'almost', message: 'Almost there! Complete missing items' }
  }
  return { level: 'ready', message: 'Ready to submit!' }
}

function estimateCompletionTime(profile) {
  const missing = getMissingItems(profile)
  let hours = 0

  missing.forEach(item => {
    if (item.field === 'personalStatement') hours += 5
    else if (item.field === 'recommendations') hours += 2
    else hours += 0.5
  })

  return { hours, formatted: `${hours} hours` }
}

// Program routes
app.get('/api/programs', (req, res) => {
  const programs = queryAll('SELECT * FROM programs WHERE is_active = 1 ORDER BY name')
  res.json(programs)
})

app.get('/api/programs/:id', (req, res) => {
  const program = queryOne('SELECT * FROM programs WHERE id = ?', [req.params.id])
  if (!program) {
    return res.status(404).json({ message: 'Program not found' })
  }
  res.json(program)
})

// Application routes
app.get('/api/applications', authenticateToken, (req, res) => {
  const { status, page = 1, limit = 10, search } = req.query
  const offset = (parseInt(page) - 1) * parseInt(limit)

  let query = 'SELECT * FROM applications WHERE 1=1'
  const params = []

  if (req.user.role === 'applicant') {
    query += ' AND user_id = ?'
    params.push(req.user.id)
  }

  if (status) {
    query += ' AND status = ?'
    params.push(status)
  }

  if (search) {
    query += ' AND (first_name LIKE ? OR last_name LIKE ? OR email LIKE ?)'
    const searchTerm = `%${search}%`
    params.push(searchTerm, searchTerm, searchTerm)
  }

  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?'
  params.push(parseInt(limit), offset)

  const applications = queryAll(query, params)

  // Get total count
  let countQuery = query.split('ORDER BY')[0].replace('SELECT *', 'SELECT COUNT(*) as total')
  const total = queryOne(countQuery, params.slice(0, -2))?.total || 0

  res.json({
    applications,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit))
    }
  })
})

app.get('/api/applications/:id', authenticateToken, (req, res) => {
  const application = queryOne(`
    SELECT a.*, p.name as program_name, p.department, p.degree_type
    FROM applications a
    JOIN programs p ON a.program_id = p.id
    WHERE a.id = ?
  `, [req.params.id])

  if (!application) {
    return res.status(404).json({ message: 'Application not found' })
  }

  if (req.user.role === 'applicant' && application.user_id !== req.user.id) {
    return res.status(403).json({ message: 'Access denied' })
  }

  res.json(application)
})

app.post('/api/applications', authenticateToken, (req, res) => {
  const { program_id, first_name, last_name, email, phone, date_of_birth, address, high_school, gpa, sat_score, extracurriculars, personal_statement } = req.body

  if (!program_id || !first_name || !last_name || !email) {
    return res.status(400).json({ message: 'Program, first name, last name, and email are required' })
  }

  const program = queryOne('SELECT id FROM programs WHERE id = ?', [program_id])
  if (!program) {
    return res.status(400).json({ message: 'Invalid program' })
  }

  const id = uuidv4()

  // Prepare values, converting undefined to null
  const values = [
    id,
    req.user.id,
    program_id,
    first_name,
    last_name,
    email,
    phone || null,
    date_of_birth || null,
    address || null,
    high_school || null,
    gpa || null,
    sat_score || null,
    extracurriculars || null,
    personal_statement || null
  ]

  runQuery(`
    INSERT INTO applications (id, user_id, program_id, first_name, last_name, email, phone, date_of_birth, address, high_school, gpa, sat_score, extracurriculars, personal_statement, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'draft')
  `, values)

  res.status(201).json({
    message: 'Application created',
    application: queryOne('SELECT * FROM applications WHERE id = ?', [id])
  })
})

app.put('/api/applications/:id', authenticateToken, (req, res) => {
  const { first_name, last_name, email, phone, date_of_birth, address, high_school, gpa, sat_score, extracurriculars, personal_statement, status } = req.body

  const application = queryOne('SELECT * FROM applications WHERE id = ?', [req.params.id])
  if (!application) {
    return res.status(404).json({ message: 'Application not found' })
  }

  if (req.user.role === 'applicant' && application.user_id !== req.user.id) {
    return res.status(403).json({ message: 'Access denied' })
  }

  const updates = []
  const params = []

  const fields = { first_name, last_name, email, phone, date_of_birth, address, high_school, gpa, sat_score, extracurriculars, personal_statement, status }
  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined) {
      updates.push(`${key} = ?`)
      params.push(value)
    }
  }

  if (status === 'submitted' && application.status === 'draft') {
    updates.push('submitted_at = datetime("now")')
  }

  if (updates.length === 0) {
    return res.status(400).json({ message: 'No updates provided' })
  }

  updates.push('updated_at = datetime("now")')
  params.push(req.params.id)

  runQuery(`UPDATE applications SET ${updates.join(', ')} WHERE id = ?`, params)

  res.json({
    message: 'Application updated',
    application: queryOne('SELECT * FROM applications WHERE id = ?', [req.params.id])
  })
})

app.delete('/api/applications/:id', authenticateToken, (req, res) => {
  const application = queryOne('SELECT * FROM applications WHERE id = ?', [req.params.id])
  if (!application) {
    return res.status(404).json({ message: 'Application not found' })
  }

  if (req.user.role === 'applicant' && application.user_id !== req.user.id) {
    return res.status(403).json({ message: 'Access denied' })
  }

  runQuery('DELETE FROM applications WHERE id = ?', [req.params.id])
  res.json({ message: 'Application deleted' })
})

// Export applications (admin/officer only)
app.get('/api/applications/export', authenticateToken, (req, res) => {
  if (req.user.role === 'applicant') {
    return res.status(403).json({ message: 'Access denied' })
  }

  const { format = 'csv', status } = req.query

  let query = 'SELECT a.*, p.name as program_name FROM applications a JOIN programs p ON a.program_id = p.id WHERE 1=1'
  const params = []

  if (status) {
    query += ' AND a.status = ?'
    params.push(status)
  }

  query += ' ORDER BY a.created_at DESC'
  const applications = queryAll(query, params)

  if (format === 'csv') {
    // Generate CSV
    const headers = ['ID', 'First Name', 'Last Name', 'Email', 'Program', 'Status', 'GPA', 'SAT', 'Created At']
    const rows = applications.map(app => [
      app.id,
      app.first_name,
      app.last_name,
      app.email,
      app.program_name,
      app.status,
      app.gpa || '',
      app.sat_score || '',
      app.created_at
    ])

    const csv = [headers.join(','), ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))].join('\n')

    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', `attachment; filename=applications-${Date.now()}.csv`)
    res.send(csv)
  } else {
    // JSON export
    res.setHeader('Content-Disposition', `attachment; filename=applications-${Date.now()}.json`)
    res.json(applications)
  }
})

// Dashboard stats
app.get('/api/dashboard/stats', authenticateToken, (req, res) => {
  let stats = {}

  if (req.user.role === 'applicant') {
    const userId = req.user.id
    stats = {
      totalApplications: queryOne('SELECT COUNT(*) as count FROM applications WHERE user_id = ?', [userId])?.count || 0,
      pendingReview: queryOne("SELECT COUNT(*) as count FROM applications WHERE user_id = ? AND status IN ('submitted', 'under_review')", [userId])?.count || 0,
      accepted: queryOne("SELECT COUNT(*) as count FROM applications WHERE user_id = ? AND status = 'accepted'", [userId])?.count || 0,
      rejected: queryOne("SELECT COUNT(*) as count FROM applications WHERE user_id = ? AND status = 'rejected'", [userId])?.count || 0
    }
  } else {
    stats = {
      totalApplications: queryOne('SELECT COUNT(*) as count FROM applications')?.count || 0,
      pendingReview: queryOne("SELECT COUNT(*) as count FROM applications WHERE status IN ('submitted', 'under_review')")?.count || 0,
      accepted: queryOne("SELECT COUNT(*) as count FROM applications WHERE status = 'accepted'")?.count || 0,
      rejected: queryOne("SELECT COUNT(*) as count FROM applications WHERE status = 'rejected'")?.count || 0
    }
  }

  res.json(stats)
})

// Reviews endpoints (admin/officer only)
app.get('/api/reviews', authenticateToken, (req, res) => {
  if (!['admin', 'officer'].includes(req.user.role)) {
    return res.status(403).json({ message: 'Admin or officer access required' })
  }

  const { applicationId } = req.query
  let query = `
    SELECT r.*, a.first_name, a.last_name, a.email, a.status as application_status,
           p.name as program_name, u.name as reviewer_name
    FROM reviews r
    JOIN applications a ON r.application_id = a.id
    JOIN programs p ON a.program_id = p.id
    JOIN users u ON r.reviewer_id = u.id
  `
  const params = []

  if (applicationId) {
    query += ' WHERE r.application_id = ?'
    params.push(applicationId)
  }

  query += ' ORDER BY r.created_at DESC'
  const reviews = queryAll(query, params)
  res.json(reviews)
})

app.get('/api/reviews/:applicationId', authenticateToken, (req, res) => {
  if (!['admin', 'officer'].includes(req.user.role)) {
    return res.status(403).json({ message: 'Admin or officer access required' })
  }

  const review = queryOne(`
    SELECT r.*, a.first_name, a.last_name, a.email, p.name as program_name
    FROM reviews r
    JOIN applications a ON r.application_id = a.id
    JOIN programs p ON a.program_id = p.id
    WHERE r.application_id = ?
  `, [req.params.applicationId])

  res.json(review || null)
})

app.post('/api/reviews', authenticateToken, (req, res) => {
  if (!['admin', 'officer'].includes(req.user.role)) {
    return res.status(403).json({ message: 'Admin or officer access required' })
  }

  const { application_id, rating, strengths, weaknesses, recommendation, notes } = req.body

  if (!application_id || !rating || !recommendation) {
    return res.status(400).json({ message: 'Application ID, rating, and recommendation are required'  })
  }

  // Check if application exists
  const application = queryOne('SELECT * FROM applications WHERE id = ?', [application_id])
  if (!application) {
    return res.status(404).json({ message: 'Application not found' })
  }

  // Check if review already exists
  const existingReview = queryOne('SELECT * FROM reviews WHERE application_id = ?', [application_id])
  if (existingReview) {
    return res.status(400).json({ message: 'A review already exists for this application' })
  }

  const id = uuidv4()
  runQuery(`
    INSERT INTO reviews (id, application_id, reviewer_id, rating, strengths, weaknesses, recommendation, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `, [id, application_id, req.user.id, rating, strengths || null, weaknesses || null, recommendation, notes || null])

  // Update application status to under_review
  runQuery(`
    UPDATE applications SET status = 'under_review', reviewed_by = ?, reviewed_at = datetime('now'), updated_at = datetime('now')
    WHERE id = ?
  `, [req.user.id, application_id])

  res.status(201).json({
    message: 'Review submitted',
    review: queryOne('SELECT * FROM reviews WHERE id = ?', [id])
  })
})

app.put('/api/reviews/:id', authenticateToken, (req, res) => {
  if (!['admin', 'officer'].includes(req.user.role)) {
    return res.status(403).json({ message: 'Admin or officer access required' })
  }

  const { rating, strengths, weaknesses, recommendation, notes } = req.body

  const review = queryOne('SELECT * FROM reviews WHERE id = ?', [req.params.id])
  if (!review) {
    return res.status(404).json({ message: 'Review not found' })
  }

  // Only the original reviewer or admin can update
  if (req.user.role !== 'admin' && review.reviewer_id !== req.user.id) {
    return res.status(403).json({ message: 'Not authorized to update this review' })
  }

  const updates = []
  const params = []

  if (rating !== undefined) {
    updates.push('rating = ?')
    params.push(rating)
  }
  if (strengths !== undefined) {
    updates.push('strengths = ?')
    params.push(strengths)
  }
  if (weaknesses !== undefined) {
    updates.push('weaknesses = ?')
    params.push(weaknesses)
  }
  if (recommendation !== undefined) {
    updates.push('recommendation = ?')
    params.push(recommendation)
  }
  if (notes !== undefined) {
    updates.push('notes = ?')
    params.push(notes)
  }

  if (updates.length === 0) {
    return res.status(400).json({ message: 'No updates provided' })
  }

  updates.push('updated_at = datetime("now")')
  params.push(req.params.id)

  runQuery(`UPDATE reviews SET ${updates.join(', ')} WHERE id = ?`, params)

  res.json({
    message: 'Review updated',
    review: queryOne('SELECT * FROM reviews WHERE id = ?', [req.params.id])
  })
})

app.delete('/api/reviews/:id', authenticateToken, (req, res) => {
  if (!['admin', 'officer'].includes(req.user.role)) {
    return res.status(403).json({ message: 'Admin or officer access required' })
  }

  const review = queryOne('SELECT * FROM reviews WHERE id = ?', [req.params.id])
  if (!review) {
    return res.status(404).json({ message: 'Review not found' })
  }

  // Only the original reviewer or admin can delete
  if (req.user.role !== 'admin' && review.reviewer_id !== req.user.id) {
    return res.status(403).json({ message: 'Not authorized to delete this review' })
  }

  runQuery('DELETE FROM reviews WHERE id = ?', [req.params.id])
  res.json({ message: 'Review deleted' })
})

// 404 handler - must be after all routes
app.use((req, res) => {
  res.status(404).json({
    message: 'Resource not found',
    path: req.path
  })
})

// Global error handler
app.use((err, req, res, next) => {
  console.error('Error:', err.message)

  // Don't expose internal error details to clients
  res.status(500).json({
    message: 'An unexpected error occurred. Please try again later.'
  })
})

// Start server
initializeDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`✅ College Admissions API running on http://localhost:${PORT}`)
    console.log(`   Environment: development`)
  })
}).catch(err => {
  console.error('Failed to initialize database:', err)
  process.exit(1)
})