export function AuthSwitch({
  label,
  actionLabel,
  onClick,
}: {
  label?: string
  actionLabel: string
  onClick: () => void
}) {
  return (
    <div className="auth-switch">
      {label && <span>{label}</span>}
      <button type="button" onClick={onClick}>
        {actionLabel}
      </button>
    </div>
  )
}
