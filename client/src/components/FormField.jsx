import { forwardRef } from 'react'

const Input = forwardRef(function Input({ label, error, className = '', ...props }, ref) {
  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
          {props.required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <input
        ref={ref}
        className={`
          w-full px-3 py-2 border rounded-lg shadow-sm
          placeholder:text-gray-400
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
          disabled:bg-gray-100 disabled:cursor-not-allowed
          ${error ? 'border-red-300 focus:ring-red-500' : 'border-gray-300'}
          ${className}
        `}
        {...props}
      />
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  )
})

const Textarea = forwardRef(function Textarea({ label, error, className = '', ...props }, ref) {
  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
          {props.required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <textarea
        ref={ref}
        className={`
          w-full px-3 py-2 border rounded-lg shadow-sm
          placeholder:text-gray-400 resize-none
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
          disabled:bg-gray-100 disabled:cursor-not-allowed
          ${error ? 'border-red-300 focus:ring-red-500' : 'border-gray-300'}
          ${className}
        `}
        {...props}
      />
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  )
})

const Select = forwardRef(function Select({ label, error, options = [], placeholder = 'Select...', className = '', ...props }, ref) {
  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
          {props.required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <select
        ref={ref}
        className={`
          w-full px-3 py-2 border rounded-lg shadow-sm
          focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
          disabled:bg-gray-100 disabled:cursor-not-allowed
          ${error ? 'border-red-300 focus:ring-red-500' : 'border-gray-300'}
          ${className}
        `}
        {...props}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  )
})

const Checkbox = forwardRef(function Checkbox({ label, error, className = '', ...props }, ref) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2">
        <input
          ref={ref}
          type="checkbox"
          className={`
            h-4 w-4 rounded border-gray-300
            text-blue-600 focus:ring-blue-500
            disabled:opacity-50
            ${error ? 'border-red-300' : ''}
            ${className}
          `}
          {...props}
        />
        {label && (
          <label className="text-sm font-medium text-gray-700">
            {label}
          </label>
        )}
      </div>
      {error && (
        <p className="text-sm text-red-600 ml-6">{error}</p>
      )}
    </div>
  )
})

const RadioGroup = forwardRef(function RadioGroup({ label, options = [], error, className = '', ...props }, ref) {
  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      <div className="space-y-2">
        {options.map((option) => (
          <div key={option.value} className="flex items-center gap-2">
            <input
              ref={ref}
              type="radio"
              value={option.value}
              className="h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500"
              {...props}
            />
            <label className="text-sm text-gray-700">{option.label}</label>
          </div>
        ))}
      </div>
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  )
})

export { Input, Textarea, Select, Checkbox, RadioGroup }