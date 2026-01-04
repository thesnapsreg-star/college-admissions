import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import AIAssistant from './AIAssistant'

export default function Layout({ children }) {
  const { user, logout, isAdmin, isOfficer, isApplicant } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const getPageTitle = () => {
    const path = location.pathname
    if (path === '/dashboard') return 'Dashboard'
    if (path === '/onboarding') return 'AI Application Wizard'
    return 'College Admissions'
  }

  const getNavItems = () => {
    const items = [
      { path: '/dashboard', label: 'Dashboard', icon: '🏠' }
    ]

    if (isAdmin || isOfficer) {
      items.push(
        { path: '/applications', label: 'Applications', icon: '📋' },
        { path: '/reviews', label: 'Reviews', icon: '📝' }
      )
    }

    if (isApplicant) {
      items.push(
        { path: '/onboarding', label: 'AI Wizard', icon: '🤖' },
        { path: '/my-applications', label: 'My Applications', icon: '📄' },
        { path: '/programs', label: 'Programs', icon: '🎓' },
        { path: '/documents', label: 'Documents', icon: '📁' }
      )
    }

    if (isAdmin) {
      items.push(
        { path: '/users', label: 'Users', icon: '👥' },
        { path: '/reports', label: 'Reports', icon: '📊' },
        { path: '/settings', label: 'Settings', icon: '⚙️' }
      )
    }

    return items
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed top-0 left-0 h-full w-64 bg-white border-r border-gray-200 z-50 transform transition-transform duration-200 lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200">
          <Link to="/dashboard" className="text-xl font-bold text-primary flex items-center gap-2">
            <span>🎓</span>
            <span>Admissions</span>
          </Link>
          <button
            className="lg:hidden p-2 hover:bg-gray-100 rounded"
            onClick={() => setSidebarOpen(false)}
          >
            ✕
          </button>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-1">
          {getNavItems().map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                location.pathname === item.path
                  ? 'bg-primary text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          ))}
        </nav>

        {/* AI Quick Access */}
        {isApplicant && (
          <div className="p-4 border-t border-gray-200">
            <Link
              to="/onboarding"
              className="flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:opacity-90 transition-opacity"
            >
              <span>🤖</span>
              <div>
                <div>AI Application Wizard</div>
                <div className="text-xs text-blue-100">Smart guidance</div>
              </div>
            </Link>
          </div>
        )}

        {/* User info at bottom */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-medium">
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{user?.name || 'User'}</p>
              <p className="text-xs text-gray-500 capitalize">{user?.role || 'User'}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg"
          >
            <span>🚪</span>
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-white border-b border-gray-200">
          <div className="h-16 flex items-center justify-between px-4">
            <button
              className="lg:hidden p-2 hover:bg-gray-100 rounded"
              onClick={() => setSidebarOpen(true)}
            >
              ☰
            </button>

            <h1 className="text-lg font-semibold text-gray-900">
              {getPageTitle()}
            </h1>

            <div className="flex items-center gap-4">
              {/* AI Assistant Toggle in Header */}
              {isApplicant && (
                <Link
                  to="/onboarding"
                  className="hidden sm:flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
                >
                  <span>🤖</span>
                  <span>AI Wizard</span>
                </Link>
              )}
              <span className="text-sm text-gray-500 hidden sm:inline">
                {user?.name}
              </span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-6">
          {children}
        </main>
      </div>

      {/* AI Assistant - Floating Widget */}
      {isApplicant && <AIAssistant />}
    </div>
  )
}