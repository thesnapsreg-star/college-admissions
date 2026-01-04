import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import Breadcrumbs from '../components/Breadcrumbs'
import EmptyState from '../components/EmptyState'

export default function Documents() {
  const { user } = useAuth()
  const { success, error } = useToast()
  const navigate = useNavigate()
  const [documents, setDocuments] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDocuments()
  }, [])

  const fetchDocuments = async () => {
    try {
      const token = localStorage.getItem('authToken')
      const response = await fetch('/api/documents', {
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        const data = await response.json()
        setDocuments(data)
      }
    } catch (err) {
      error('Failed to load documents')
    } finally {
      setLoading(false)
    }
  }

  const handleUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    try {
      const token = localStorage.getItem('authToken')
      const formData = new FormData()
      formData.append('document', file)

      const response = await fetch('/api/documents', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      })

      if (response.ok) {
        success('Document uploaded successfully')
        fetchDocuments()
      } else {
        const data = await response.json()
        error(data.message || 'Failed to upload document')
      }
    } catch (err) {
      error('An error occurred during upload')
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this document?')) {
      return
    }

    try {
      const token = localStorage.getItem('authToken')
      const response = await fetch(`/api/documents/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      })

      if (response.ok) {
        success('Document deleted successfully')
        setDocuments(prev => prev.filter(d => d.id !== id))
      } else {
        error('Failed to delete document')
      }
    } catch (err) {
      error('An error occurred')
    }
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return '-'
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric'
    })
  }

  const getFileIcon = (mimeType) => {
    if (mimeType?.includes('pdf')) return '📄'
    if (mimeType?.includes('image')) return '🖼️'
    if (mimeType?.includes('word') || mimeType?.includes('document')) return '📝'
    return '📁'
  }

  return (
    <div className="space-y-6">
      <Breadcrumbs items={[
        { path: '/dashboard', label: 'Dashboard' },
        { path: '/documents', label: 'Documents' }
      ]} />

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">My Documents</h1>
        <label className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer">
          + Upload Document
          <input
            type="file"
            className="hidden"
            accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
            onChange={handleUpload}
          />
        </label>
      </div>

      {loading ? (
        <div className="bg-white rounded-lg p-8 text-center border border-gray-200">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-500">Loading documents...</p>
        </div>
      ) : documents.length === 0 ? (
        <EmptyState
          icon="📁"
          title="No documents uploaded"
          description="Upload your supporting documents such as transcripts, letters of recommendation, or identity documents."
          action={
            <label className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer">
              Upload First Document
              <input
                type="file"
                className="hidden"
                accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                onChange={handleUpload}
              />
            </label>
          }
        />
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Document</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Uploaded</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {documents.map((doc) => (
                <tr key={doc.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <span className="text-xl mr-3">{getFileIcon(doc.mime_type)}</span>
                      <span className="text-sm font-medium text-gray-900">{doc.file_name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {doc.document_type || 'General'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(doc.created_at)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button
                      onClick={() => handleDelete(doc.id)}
                      className="text-red-600 hover:text-red-900"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}