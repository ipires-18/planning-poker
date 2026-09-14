import { forwardRef, useEffect, type ReactNode } from 'react'

export function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ')
}

/* -------------------------------------------------------------------------- */
/* Button                                                                      */
/* -------------------------------------------------------------------------- */

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'joy'

const BUTTON_STYLES: Record<ButtonVariant, string> = {
  primary:
    'bg-brand-500 text-white shadow-lg shadow-brand-500/30 hover:bg-brand-400 hover:shadow-brand-400/40',
  joy: 'text-white shadow-lg shadow-punch/30 bg-[linear-gradient(100deg,var(--color-brand-500),var(--color-punch),var(--color-zest))] bg-[length:200%_auto] hover:bg-[position:right_center]',
  secondary:
    'bg-[var(--surface-sunken)] text-ink border border-hairline hover:border-brand-400/60',
  ghost: 'text-ink-muted hover:text-ink hover:bg-[var(--surface-sunken)]',
  danger: 'bg-coral/15 text-coral border border-coral/30 hover:bg-coral/25',
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: 'sm' | 'md' | 'lg'
  icon?: ReactNode
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  // `type` precisa cair em "button": um <button> sem type dentro de um <form>
  // é submit por padrão, e um botão de editar dentro de um formulário acabava
  // enviando o formulário inteiro. Quem submete diz isso explicitamente.
  { variant = 'primary', size = 'md', icon, className, type = 'button', children, ...rest },
  ref,
) {
  const sizes = {
    sm: 'px-3 py-1.5 text-xs gap-1.5 rounded-xl',
    md: 'px-4 py-2.5 text-sm gap-2 rounded-2xl',
    lg: 'px-6 py-4 text-base gap-2.5 rounded-[1.25rem]',
  }
  return (
    <button
      ref={ref}
      type={type}
      className={cx(
        'inline-flex items-center justify-center font-bold tracking-tight',
        'transition-all duration-300 [transition-timing-function:var(--ease-spring)]',
        'active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-400',
        'cursor-pointer disabled:cursor-not-allowed',
        sizes[size],
        BUTTON_STYLES[variant],
        className,
      )}
      {...rest}
    >
      {icon}
      {children}
    </button>
  )
})

/* -------------------------------------------------------------------------- */
/* Campos de formulário                                                        */
/* -------------------------------------------------------------------------- */

const FIELD_BASE =
  'w-full rounded-2xl bg-[var(--surface-sunken)] border border-hairline px-4 py-3 text-ink ' +
  'placeholder:text-ink-subtle outline-none transition-all duration-200 ' +
  'focus:border-brand-400 focus:ring-4 focus:ring-brand-400/15'

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...rest }, ref) {
    return <input ref={ref} className={cx(FIELD_BASE, className)} {...rest} />
  },
)

export const Select = forwardRef<
  HTMLSelectElement,
  React.SelectHTMLAttributes<HTMLSelectElement>
>(function Select({ className, children, ...rest }, ref) {
  return (
    <select ref={ref} className={cx(FIELD_BASE, 'cursor-pointer', className)} {...rest}>
      {children}
    </select>
  )
})

export function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: ReactNode
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-xs font-black uppercase tracking-[0.12em] text-ink-muted">
        {label}
      </span>
      {children}
      {hint && <span className="mt-1.5 block text-xs text-ink-subtle">{hint}</span>}
    </label>
  )
}

/* -------------------------------------------------------------------------- */
/* Modal                                                                       */
/* -------------------------------------------------------------------------- */

export function Modal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-brand-950/70 p-4 backdrop-blur-md"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="card-surface animate-pop-in w-full max-w-lg p-7"
      >
        <h2 className="mb-6 text-2xl font-black text-ink">{title}</h2>
        {children}
      </div>
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Diversos                                                                    */
/* -------------------------------------------------------------------------- */

export function Badge({
  children,
  color = 'var(--color-brand-400)',
}: {
  children: ReactNode
  color?: string
}) {
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.1em]"
      style={{ color, backgroundColor: `color-mix(in oklab, ${color} 16%, transparent)` }}
    >
      {children}
    </span>
  )
}

export function Avatar({
  name,
  color,
  size = 40,
  dimmed,
}: {
  name: string
  color: string
  size?: number
  dimmed?: boolean
}) {
  return (
    <span
      className={cx(
        'inline-flex shrink-0 items-center justify-center rounded-full font-black text-white',
        'transition-opacity duration-500',
        dimmed && 'opacity-40',
      )}
      style={{
        width: size,
        height: size,
        fontSize: size * 0.42,
        background: `linear-gradient(140deg, ${color}, color-mix(in oklab, ${color} 55%, var(--color-brand-600)))`,
      }}
      aria-hidden
    >
      {name.trim().charAt(0).toUpperCase() || '?'}
    </span>
  )
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex gap-1.5">
        {['var(--color-brand-400)', 'var(--color-punch)', 'var(--color-zest)'].map((c, i) => (
          <span
            key={c}
            className="h-3 w-3 rounded-full"
            style={{
              backgroundColor: c,
              animation: `float-idle 0.9s ${i * 0.12}s var(--ease-out-soft) infinite`,
            }}
          />
        ))}
      </div>
      {label && <p className="text-sm font-bold text-ink-muted">{label}</p>}
    </div>
  )
}

export function ErrorNote({ children }: { children: ReactNode }) {
  if (!children) return null
  return (
    <div
      role="alert"
      className="rounded-2xl border border-coral/30 bg-coral/10 px-4 py-3 text-sm font-semibold text-coral"
    >
      {children}
    </div>
  )
}
