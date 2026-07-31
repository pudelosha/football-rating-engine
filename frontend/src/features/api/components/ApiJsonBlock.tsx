import type { ReactNode } from 'react'

export function ApiJsonBlock({
  title,
  action,
  value,
}: {
  title: string
  action?: ReactNode
  value: unknown
}) {
  const content = typeof value === 'string' ? value : JSON.stringify(value, null, 2)

  return (
    <div className="api-json-block">
      <div>
        <span>{title}</span>
        {action}
      </div>
      <pre>{content}</pre>
    </div>
  )
}
