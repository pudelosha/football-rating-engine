import { Link } from 'react-router-dom'

export function TermsAcceptance({
  checked,
  error,
  prefix,
  linkText,
  onChange,
}: {
  checked: boolean
  error?: string
  prefix: string
  linkText: string
  onChange: (checked: boolean) => void
}) {
  return (
    <label className="terms-field">
      <span className="terms-row">
        <span className="terms-control">
          <input
            checked={checked}
            type="checkbox"
            onChange={(event) => onChange(event.target.checked)}
          />
          <span>
            {prefix} <Link to="/terms">{linkText}</Link>
          </span>
        </span>
        {error && <small>{error}</small>}
      </span>
    </label>
  )
}
