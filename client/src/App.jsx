import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import ToastProvider from './context/ToastContext'
import SessionTimeoutWarning from './components/SessionTimeoutWarning'
import Layout from './components/Layout'
import Login from './pages/Login'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import Dashboard from './pages/Dashboard'
import Applications from './pages/Applications'
import ApplicationDetail from './pages/ApplicationDetail'
import NewApplication from './pages/NewApplication'
import MyApplications from './pages/MyApplications'
import Programs from './pages/Programs'
import Documents from './pages/Documents'
import Reviews from './pages/Reviews'
import AIOnboardingWizard from './pages/AIOnboardingWizard'
import Reports from './pages/Reports'
import Users from './pages/Users'
import Settings from './pages/Settings'
import NotFound from './pages/NotFound'

// Protected route wrapper - requires authentication
function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ returnTo: location.pathname }} replace />
  }

  return children
}

// Role-based route wrapper - requires specific role
function AdminRoute({ children }) {
  const { isAuthenticated, isAdmin, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ returnTo: location.pathname }} replace />
  }

  if (!isAdmin) {
    return <Navigate to="/dashboard" state={{ unauthorized: true }} replace />
  }

  return children
}

// Public route wrapper (redirect to dashboard if already logged in)
function PublicRoute({ children }) {
  const { isAuthenticated, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />
  }

  return children
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public routes */}
      <Route
        path="/login"
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        }
      />
      <Route
        path="/forgot-password"
        element={
          <PublicRoute>
            <ForgotPassword />
          </PublicRoute>
        }
      />
      <Route
        path="/reset-password"
        element={
          <PublicRoute>
            <ResetPassword />
          </PublicRoute>
        }
      />

      {/* Protected routes - All authenticated users */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Layout>
              <Dashboard />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/applications"
        element={
          <ProtectedRoute>
            <Layout>
              <Applications />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/applications/new"
        element={
          <ProtectedRoute>
            <Layout>
              <NewApplication />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/applications/:id"
        element={
          <ProtectedRoute>
            <Layout>
              <ApplicationDetail />
            </Layout>
          </ProtectedRoute>
        }
      />

      {/* Admin-only routes */}
      <Route
        path="/users"
        element={
          <AdminRoute>
            <Layout>
              <Users />
            </Layout>
          </AdminRoute>
        }
      />

      <Route
        path="/settings"
        element={
          <AdminRoute>
            <Layout>
              <Settings />
            </Layout>
          </AdminRoute>
        }
      />

      {/* AI Onboarding Route */}
      <Route
        path="/onboarding"
        element={
          <ProtectedRoute>
            <Layout>
              <AIOnboardingWizard />
            </Layout>
          </ProtectedRoute>
        }
      />

      {/* Reports Route - Admin/Officer only */}
      <Route
        path="/reports"
        element={
          <ProtectedRoute>
            <Layout>
              <Reports />
            </Layout>
          </ProtectedRoute>
        }
      />

      {/* Reviews Route - Admin/Officer only */}
      <Route
        path="/reviews"
        element={
          <ProtectedRoute>
            <Layout>
              <Reviews />
            </Layout>
          </ProtectedRoute>
        }
      />

      {/* Applicant-specific routes */}
      <Route
        path="/my-applications"
        element={
          <ProtectedRoute>
            <Layout>
              <MyApplications />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/programs"
        element={
          <ProtectedRoute>
            <Layout>
              <Programs />
            </Layout>
          </ProtectedRoute>
        }
      />

      <Route
        path="/documents"
        element={
          <ProtectedRoute>
            <Layout>
              <Documents />
            </Layout>
          </ProtectedRoute>
        }
      />

      {/* 404 Not Found - must be last */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <SessionTimeoutWarning />
          <AppRoutes />
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}