export default function EmptyState({ icon, title, description, action }) {
  return (
    <div className="text-center py-12 px-4">
      {icon && (
        <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-gray-100 mb-4">
          <span className="text-2xl">{icon}</span>
        </div>
      )}
      <h3 className="text-lg font-medium text-gray-900">{title}</h3>
      {description && (
        <p className="mt-2 text-sm text-gray-500 max-w-sm mx-auto">{description}</p>
      )}
      {action && (
        <div className="mt-6">{action}</div>
      )}
    </div>
  )
}