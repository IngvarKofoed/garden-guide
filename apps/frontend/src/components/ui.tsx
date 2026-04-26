import { forwardRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: 'sm' | 'md';
}

const variants: Record<ButtonVariant, string> = {
  primary:
    'bg-emerald-700 text-white hover:bg-emerald-800 focus-visible:ring-emerald-500 disabled:bg-emerald-700/50',
  secondary:
    'bg-stone-200 text-stone-900 hover:bg-stone-300 focus-visible:ring-stone-400 disabled:bg-stone-200/60 dark:bg-stone-800 dark:text-stone-100 dark:hover:bg-stone-700',
  ghost:
    'bg-transparent text-stone-700 hover:bg-stone-100 focus-visible:ring-stone-300 dark:text-stone-300 dark:hover:bg-stone-800',
  danger:
    'bg-red-600 text-white hover:bg-red-700 focus-visible:ring-red-500 disabled:bg-red-600/60',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', className = '', ...rest },
  ref,
) {
  const sizing = size === 'sm' ? 'h-8 px-3 text-sm' : 'h-10 px-4 text-sm';
  return (
    <button
      ref={ref}
      className={`inline-flex items-center justify-center gap-2 rounded-lg font-medium ${sizing} ${variants[variant]} focus-visible:outline-none focus-visible:ring-2 disabled:cursor-not-allowed ${className}`}
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
      <label
        htmlFor={htmlFor}
        className="text-sm font-medium text-stone-700 dark:text-stone-300"
      >
        {label}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-stone-500">{hint}</p>}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className = '', ...rest }, ref) {
    return (
      <input
        ref={ref}
        className={`h-10 rounded-lg border border-stone-300 bg-white px-3 text-sm text-stone-900 shadow-sm placeholder:text-stone-400 focus-visible:border-emerald-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100 ${className}`}
        {...rest}
      />
    );
  },
);

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className = '', ...rest }, ref) {
  return (
    <textarea
      ref={ref}
      className={`min-h-[6rem] rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 shadow-sm placeholder:text-stone-400 focus-visible:border-emerald-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100 ${className}`}
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
      className={`h-10 rounded-lg border border-stone-300 bg-white px-3 text-sm text-stone-900 shadow-sm focus-visible:border-emerald-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-100 ${className}`}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <section
      className={`rounded-2xl border border-stone-200 bg-white shadow-sm dark:border-stone-800 dark:bg-stone-900 ${className}`}
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
    <div className="rounded-2xl border border-dashed border-stone-300 bg-stone-50 p-10 text-center dark:border-stone-700 dark:bg-stone-900/50">
      <p className="text-base font-medium text-stone-900 dark:text-stone-100">{title}</p>
      {description && (
        <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">{description}</p>
      )}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}
