import { useNavigate } from 'react-router-dom'

export default function NotFound() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="text-center">
        <div className="text-9xl font-bold text-gray-200">404</div>
        <h1 className="mt-4 text-3xl font-bold text-gray-900">Page Not Found</h1>
        <p className="mt-4 text-gray-600 max-w-md mx-auto">
          Sorry, we could not find the page you are looking for. It might have been moved or does not exist.
        </p>
        <div className="mt-8 flex justify-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Go Back
          </button>
          <button
            onClick={() => navigate('/dashboard')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go to Dashboard
          </button>
        </div>
        <div className="mt-12 p-4 bg-blue-50 rounded-lg max-w-md mx-auto">
          <h3 className="font-medium text-blue-800 mb-2">Need Help?</h3>
          <p className="text-sm text-blue-600">
            Contact our support team if you continue to have issues.
          </p>
          <a href="mailto:support@college.edu" className="text-sm text-blue-700 hover:underline">
            support@college.edu
          </a>
        </div>
      </div>
    </div>
  )
}