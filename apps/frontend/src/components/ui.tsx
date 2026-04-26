import {
  forwardRef,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type TextareaHTMLAttributes,
} from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: 'sm' | 'md' | 'lg';
}

const variants: Record<ButtonVariant, string> = {
  primary:
    'bg-ink text-cream hover:bg-ink/90 focus-visible:ring-leaf/60 disabled:bg-ink/40',
  secondary:
    'bg-ivory text-ink hover:bg-hairline/60 focus-visible:ring-leaf/60 disabled:bg-ivory/60',
  ghost:
    'bg-transparent text-ink hover:bg-ivory focus-visible:ring-leaf/60 disabled:text-ink/40',
  danger:
    'bg-ink text-cream hover:bg-ink/90 focus-visible:ring-red-400/60 disabled:bg-ink/40',
};

const sizes: Record<NonNullable<ButtonProps['size']>, string> = {
  sm: 'h-9 px-4 text-sm',
  md: 'h-11 px-5 text-sm',
  lg: 'h-14 px-6 text-base',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', className = '', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      className={`inline-flex items-center justify-center gap-2 rounded-full font-medium transition-colors duration-200 ease-leaf focus-visible:outline-none focus-visible:ring-2 disabled:cursor-not-allowed ${sizes[size]} ${variants[variant]} ${className}`}
      {...rest}
    />
  );
});

interface FieldProps {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}

export function Field({ label, htmlFor, error, hint, children }: FieldProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-sm font-medium text-ink">
        {label}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-muted">{hint}</p>}
      {error && <p className="text-xs text-red-700">{error}</p>}
    </div>
  );
}

const fieldBase =
  'rounded-2xl border border-hairline bg-cream px-4 text-sm text-ink placeholder:text-muted/70 transition-colors duration-200 ease-leaf focus-visible:border-leaf focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-leaf/30';

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className = '', ...rest }, ref) {
    return <input ref={ref} className={`h-12 ${fieldBase} ${className}`} {...rest} />;
  },
);

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className = '', ...rest }, ref) {
  return (
    <textarea
      ref={ref}
      className={`min-h-[7rem] py-3 ${fieldBase} ${className}`}
      {...rest}
    />
  );
});

interface SelectProps {
  className?: string;
  id?: string;
  value: string;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
}

export function Select({ className = '', id, value, onChange, options }: SelectProps) {
  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`h-12 ${fieldBase} pr-10 ${className}`}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function Card({
  children,
  className = '',
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-3xl bg-ivory shadow-card ${className}`}
    >
      {children}
    </section>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-dashed border-hairline bg-ivory/60 p-12 text-center">
      <p className="text-base font-semibold text-ink">{title}</p>
      {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}

export function Tag({
  children,
  tone = 'mint',
}: {
  children: ReactNode;
  tone?: 'mint' | 'ivory' | 'leaf';
}) {
  const tones: Record<'mint' | 'ivory' | 'leaf', string> = {
    mint: 'bg-mint text-ink',
    ivory: 'bg-ivory text-muted',
    leaf: 'bg-leaf text-cream',
  };
  return (
    <span
      className={`inline-flex h-7 items-center rounded-full px-3 text-xs font-medium ${tones[tone]}`}
    >
      {children}
    </span>
  );
}
