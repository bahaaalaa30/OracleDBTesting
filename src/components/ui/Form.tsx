import {
  useEffect,
  type ChangeEvent,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import { cn } from '@/lib/utils';

const baseField =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-400 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:disabled:bg-slate-800';

interface FieldProps {
  label?: string;
  hint?: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
}

export function Field({ label, hint, error, required, children, className }: FieldProps) {
  return (
    <div className={cn('flex flex-col gap-1', className)}>
      {label && (
        <label className="text-xs font-medium text-slate-600 dark:text-slate-300">
          {label}
          {required && <span className="ml-0.5 text-red-500">*</span>}
        </label>
      )}
      {children}
      {error ? (
        <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
      ) : hint ? (
        <p className="text-xs text-slate-400 dark:text-slate-500">{hint}</p>
      ) : null}
    </div>
  );
}

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
}

export function Input({ label, hint, error, required, className, ...rest }: InputProps) {
  return (
    <Field label={label} hint={hint} error={error} required={required}>
      <input className={cn(baseField, className)} {...rest} />
    </Field>
  );
}

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  hint?: string;
  error?: string;
  options: { label: string; value: string | number }[];
}

export function Select({ label, hint, error, required, options, className, ...rest }: SelectProps) {
  return (
    <Field label={label} hint={hint} error={error} required={required}>
      <select className={cn(baseField, 'cursor-pointer', className)} {...rest}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </Field>
  );
}

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string;
  error?: string;
}

export function Textarea({ label, hint, error, required, className, ...rest }: TextareaProps) {
  return (
    <Field label={label} hint={hint} error={error} required={required}>
      <textarea className={cn(baseField, 'min-h-[80px] resize-y', className)} {...rest} />
    </Field>
  );
}

interface PasswordInputProps extends Omit<InputProps, 'type'> {
  showToggle?: boolean;
}

export function PasswordInput({
  label,
  hint,
  error,
  required,
  className,
  showToggle = true,
  ...rest
}: PasswordInputProps) {
  return (
    <Field label={label} hint={hint} error={error} required={required}>
      <input
        type="password"
        autoComplete="off"
        spellCheck={false}
        className={cn(baseField, 'font-mono', className)}
        {...rest}
      />
      {showToggle && (
        <p className="text-xs text-slate-400">
          Passwords are used for this session only and never stored.
        </p>
      )}
    </Field>
  );
}

interface CheckboxProps {
  label: string;
  checked: boolean;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  hint?: string;
  className?: string;
}

export function Checkbox({ label, checked, onChange, hint, className }: CheckboxProps) {
  return (
    <label className={cn('flex items-start gap-2.5 cursor-pointer', className)}>
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-900"
      />
      <span>
        <span className="text-sm text-slate-700 dark:text-slate-200">{label}</span>
        {hint && <span className="block text-xs text-slate-400">{hint}</span>}
      </span>
    </label>
  );
}

export function useThemeDocumentEffect() {
  // imported for type re-export; actual theme applied in context
  void useEffect;
}
