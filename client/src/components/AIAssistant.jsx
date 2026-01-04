import { useState, useRef, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'

// Format markdown-like text to styled HTML
function formatMessage(text) {
  if (!text) return ''

  let formatted = text

  // Escape HTML to prevent XSS
  formatted = formatted
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  // Bold text: **text** or __text__
  formatted = formatted.replace(/\*\*(.+?)\*\*|__(.+?)__/g, '<strong>$1$2</strong>')

  // Italic text: *text* or _text_
  formatted = formatted.replace(/\*(.+?)\*|_(.+?)_/g, '<em>$1$2</em>')

  // Line breaks
  formatted = formatted.replace(/\n/g, '<br/>')

  // Bullet lists (lines starting with - or *)
  formatted = formatted.replace(
    /^(\s*)([-*])\s+(.+)$/gm,
    '<li class="ml-4 mb-1">$3</li>'
  )

  // Numbered lists (lines starting with 1.)
  formatted = formatted.replace(
    /^(\s*)(\d+)\.\s+(.+)$/gm,
    '<li class="ml-4 mb-1 list-decimal">$3</li>'
  )

  // Wrap consecutive list items in ul tags
  formatted = formatted.replace(/(<li class="ml-4 mb-1 list-decimal">.*<\/li>)+/g, match => `<ol class="mb-2">${match}</ol>`)
  formatted = formatted.replace(/(<li class="ml-4 mb-1">(?!.*list-decimal).*<\/li>)+/g, match => `<ul class="mb-2">${match}</ul>`)

  // Sections with colons (like "**Title:** description")
  formatted = formatted.replace(
    /<strong>([^:]+):<\/strong>\s*(<br\/>)*/g,
    '<div class="font-semibold text-gray-900 mt-2 mb-1">$1</div>'
  )

  // Tables (| Header | Header | / | Cell | Cell |)
  const tableRegex = /\|[\s\S]*?\|(?:\n\|[\s\S]*?\|)*/g
  formatted = formatted.replace(tableRegex, (table) => {
    const rows = table.trim().split('\n')
    if (rows.length < 2) return table

    let html = '<div class="overflow-x-auto my-3"><table class="w-full text-sm border-collapse">'

    rows.forEach((row, index) => {
      // Remove leading/trailing | and split by |
      const cells = row.replace(/^\||\|$/g, '').split('|').map(c => c.trim())

      if (index === 0) {
        // Header row
        html += '<thead><tr class="bg-gray-100 border-b border-gray-300">'
        cells.forEach(cell => {
          html += `<th class="px-3 py-2 text-left font-semibold text-gray-700 border border-gray-300">${cell}</th>`
        })
        html += '</tr></thead><tbody>'
      } else if (row.includes('---')) {
        // Skip separator row
        return
      } else {
        // Data row
        html += '<tr class="border-b border-gray-200 hover:bg-gray-50">'
        cells.forEach(cell => {
          html += `<td class="px-3 py-2 text-gray-800 border border-gray-300">${cell}</td>`
        })
        html += '</tr>'
      }
    })

    html += '</tbody></table></div>'
    return html
  })

  return formatted
}

export default function AIAssistant() {
  const { user } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      type: 'ai',
      message: `Hello${user?.name ? ' ' + user.name : ''}! I'm your Admissions AI Assistant. I'm here to help you with your application journey. How can I assist you today?`,
      suggestions: ['Application deadlines', 'Document requirements', 'My application status', 'Program information'],
      timestamp: new Date().toISOString()
    }
  ])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, isOpen])

  const handleSend = async () => {
    if (!inputValue.trim() || isLoading) return

    const userMessage = {
      id: Date.now().toString(),
      type: 'user',
      message: inputValue,
      timestamp: new Date().toISOString()
    }

    setMessages(prev => [...prev, userMessage])
    setInputValue('')
    setIsLoading(true)

    try {
      const token = localStorage.getItem('authToken')
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          message: userMessage.message,
          currentPage: window.location.pathname,
          conversationHistory: messages.filter(m => m.type !== 'ai' || m.id !== 'welcome')
        })
      })

      const data = await response.json()

      if (data.success) {
        const aiMessage = {
          id: (Date.now() + 1).toString(),
          type: 'ai',
          message: data.message,
          suggestions: data.suggestions || [],
          timestamp: new Date().toISOString()
        }
        setMessages(prev => [...prev, aiMessage])
      } else {
        const errorMessage = {
          id: (Date.now() + 1).toString(),
          type: 'ai',
          message: 'I apologize, but I encountered an issue. Please try again.',
          timestamp: new Date().toISOString()
        }
        setMessages(prev => [...prev, errorMessage])
      }
    } catch (error) {
      const errorMessage = {
        id: Date.now().toString(),
        type: 'ai',
        message: 'I apologize, but I encountered an issue. Please try again.',
        timestamp: new Date().toISOString()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleSuggestion = (suggestion) => {
    setInputValue(suggestion)
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-primary rounded-full shadow-lg flex items-center justify-center hover:bg-blue-700 transition-all hover:scale-110"
        aria-label="Open AI Assistant"
      >
        <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
        <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></span>
      </button>
    )
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 w-96 max-h-[80vh] max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-200">
      {/* Header */}
      <div className="bg-primary px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <h3 className="text-white font-semibold">AI Assistant</h3>
            <p className="text-blue-100 text-xs">Admissions Helper</p>
          </div>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="p-2 hover:bg-white/20 rounded-lg transition-colors"
        >
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 h-96 overflow-y-auto p-4 space-y-4 bg-gray-50 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div className={`max-w-[85%] rounded-2xl px-4 py-3 ${
              msg.type === 'user'
                ? 'bg-primary text-white rounded-br-md'
                : 'bg-white text-gray-800 shadow-sm rounded-bl-md border border-gray-100'
            }`}>
              <p
                className="text-sm whitespace-pre-wrap leading-relaxed"
                dangerouslySetInnerHTML={{ __html: formatMessage(msg.message) }}
              />
              <p className={`text-xs mt-1 ${msg.type === 'user' ? 'text-blue-100' : 'text-gray-400'}`}>
                {formatTime(msg.timestamp)}
              </p>
              {msg.type === 'ai' && msg.suggestions?.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {msg.suggestions.map((suggestion, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSuggestion(suggestion)}
                      className="text-xs px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-primary rounded-full transition-colors border border-blue-200 shadow-sm"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white rounded-2xl rounded-bl-md px-4 py-3 shadow-sm border border-gray-100">
              <div className="flex gap-1.5">
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 bg-white border-t border-gray-100">
        <div className="flex gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask about admissions..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
            disabled={isLoading}
          />
          <button
            onClick={handleSend}
            disabled={!inputValue.trim() || isLoading}
            className="p-2 bg-primary text-white rounded-full hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-2 text-center">
          AI responses are for guidance only. Contact admissions for official answers.
        </p>
      </div>
    </div>
  )
}