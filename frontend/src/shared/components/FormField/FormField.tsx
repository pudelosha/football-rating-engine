type FormFieldProps = {
  label: string
  type: string
  value: string
  error?: string
  placeholder?: string
  disabled?: boolean
  onChange: (value: string) => void
}

export function FormField({
  label,
  type,
  value,
  error,
  placeholder,
  disabled,
  onChange,
}: FormFieldProps) {
  return (
    <label className="form-field">
      <span>
        <span>{label}</span>
        {error && <small>{error}</small>}
      </span>
      <input
        aria-invalid={Boolean(error)}
        disabled={disabled}
        placeholder={placeholder}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  )
}
