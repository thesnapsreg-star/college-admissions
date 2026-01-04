export default function LoadingSpinner({ size = 'md', text = 'Loading...' }) {
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12'
  }

  return (
    <div className="flex flex-col items-center justify-center p-8">
      <div className={`animate-spin rounded-full border-b-2 border-blue-600 ${sizeClasses[size]}`}></div>
      {text && <p className="mt-2 text-gray-500 text-sm">{text}</p>}
    </div>
  )
}

export function FullPageLoader({ text = 'Loading...' }) {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-gray-50 z-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">{text}</p>
      </div>
    </div>
  )
}

export function Skeleton({ width = '100%', height = '1rem', className = '' }) {
  return (
    <div
      className={`bg-gray-200 animate-pulse rounded ${className}`}
      style={{ width, height }}
    />
  )
}

export function SkeletonCard() {
  return (
    <div className="bg-white rounded-lg p-6 border border-gray-200 space-y-4">
      <div className="flex items-center gap-4">
        <Skeleton width="48px" height="48px" className="rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton width="40%" height="16px" />
          <Skeleton width="60%" height="12px" />
        </div>
      </div>
      <div className="space-y-2">
        <Skeleton width="100%" />
        <Skeleton width="80%" />
      </div>
    </div>
  )
}