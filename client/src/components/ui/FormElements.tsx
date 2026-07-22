'use client';

import * as React from 'react';
import { cn } from '@/utils/cn';

// ─── Label ────────────────────────────────────────────────────────────────────

export interface LabelProps
  extends React.LabelHTMLAttributes<HTMLLabelElement> {
  required?: boolean;
}

export function Label({ children, required, className, ...props }: LabelProps) {
  return (
    <label
      className={cn(
        'block text-xs font-medium text-[var(--text-secondary)] mb-1.5',
        className,
      )}
      {...props}
    >
      {children}
      {required && (
        <span className="text-[var(--danger)] ml-0.5" aria-hidden="true">
          *
        </span>
      )}
    </label>
  );
}

// ─── Input ────────────────────────────────────────────────────────────────────

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftElement?: React.ReactNode;
  rightElement?: React.ReactNode;
  containerClassName?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      hint,
      leftElement,
      rightElement,
      containerClassName,
      className,
      id,
      required,
      ...props
    },
    ref,
  ) => {
    const inputId = id ?? React.useId();

    return (
      <div className={cn('flex flex-col', containerClassName)}>
        {label && (
          <Label htmlFor={inputId} required={required}>
            {label}
          </Label>
        )}
        <div className="relative flex items-center">
          {leftElement && (
            <div className="absolute left-3 flex items-center pointer-events-none text-[var(--text-secondary)]">
              {leftElement}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            required={required}
            aria-invalid={!!error}
            aria-describedby={
              error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined
            }
            className={cn(
              'w-full h-9 px-3 text-sm rounded-lg',
              'bg-[var(--input)] border text-[var(--text)]',
              'placeholder:text-[var(--text-secondary)] placeholder:opacity-60',
              'outline-none transition-colors duration-150',
              'focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]/20',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              error
                ? 'border-[var(--danger)] focus:border-[var(--danger)] focus:ring-[var(--danger)]/20'
                : 'border-[var(--border)]',
              leftElement && 'pl-9',
              rightElement && 'pr-9',
              className,
            )}
            {...props}
          />
          {rightElement && (
            <div className="absolute right-3 flex items-center text-[var(--text-secondary)]">
              {rightElement}
            </div>
          )}
        </div>
        {error && (
          <p
            id={`${inputId}-error`}
            role="alert"
            className="mt-1.5 text-xs text-[var(--danger)]"
          >
            {error}
          </p>
        )}
        {hint && !error && (
          <p
            id={`${inputId}-hint`}
            className="mt-1.5 text-xs text-[var(--text-secondary)]"
          >
            {hint}
          </p>
        )}
      </div>
    );
  },
);

Input.displayName = 'Input';

// ─── Textarea ─────────────────────────────────────────────────────────────────

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  hint?: string;
  containerClassName?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    { label, error, hint, containerClassName, className, id, required, ...props },
    ref,
  ) => {
    const textareaId = id ?? React.useId();

    return (
      <div className={cn('flex flex-col', containerClassName)}>
        {label && (
          <Label htmlFor={textareaId} required={required}>
            {label}
          </Label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          required={required}
          aria-invalid={!!error}
          aria-describedby={error ? `${textareaId}-error` : undefined}
          className={cn(
            'w-full px-3 py-2.5 text-sm rounded-lg',
            'bg-[var(--input)] border text-[var(--text)]',
            'placeholder:text-[var(--text-secondary)] placeholder:opacity-60',
            'outline-none transition-colors duration-150 resize-vertical',
            'focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]/20',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'min-h-[80px]',
            error
              ? 'border-[var(--danger)]'
              : 'border-[var(--border)]',
            className,
          )}
          {...props}
        />
        {error && (
          <p
            id={`${textareaId}-error`}
            role="alert"
            className="mt-1.5 text-xs text-[var(--danger)]"
          >
            {error}
          </p>
        )}
        {hint && !error && (
          <p className="mt-1.5 text-xs text-[var(--text-secondary)]">{hint}</p>
        )}
      </div>
    );
  },
);

Textarea.displayName = 'Textarea';

// ─── Select ───────────────────────────────────────────────────────────────────

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
  options: SelectOption[];
  placeholder?: string;
  containerClassName?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      label,
      error,
      hint,
      options,
      placeholder,
      containerClassName,
      className,
      id,
      required,
      ...props
    },
    ref,
  ) => {
    const selectId = id ?? React.useId();

    return (
      <div className={cn('flex flex-col', containerClassName)}>
        {label && (
          <Label htmlFor={selectId} required={required}>
            {label}
          </Label>
        )}
        <select
          ref={ref}
          id={selectId}
          required={required}
          aria-invalid={!!error}
          className={cn(
            'w-full h-9 px-3 text-sm rounded-lg',
            'bg-[var(--input)] border text-[var(--text)]',
            'outline-none transition-colors duration-150 cursor-pointer',
            'focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)]/20',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'appearance-none',
            error ? 'border-[var(--danger)]' : 'border-[var(--border)]',
            className,
          )}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((opt) => (
            <option
              key={opt.value}
              value={opt.value}
              disabled={opt.disabled}
            >
              {opt.label}
            </option>
          ))}
        </select>
        {error && (
          <p role="alert" className="mt-1.5 text-xs text-[var(--danger)]">
            {error}
          </p>
        )}
        {hint && !error && (
          <p className="mt-1.5 text-xs text-[var(--text-secondary)]">{hint}</p>
        )}
      </div>
    );
  },
);

Select.displayName = 'Select';

// ─── Checkbox ─────────────────────────────────────────────────────────────────

export interface CheckboxProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  description?: string;
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, description, className, id, ...props }, ref) => {
    const checkboxId = id ?? React.useId();

    return (
      <div className="flex items-start gap-2.5">
        <input
          ref={ref}
          type="checkbox"
          id={checkboxId}
          className={cn(
            'mt-0.5 h-4 w-4 rounded border border-[var(--border)]',
            'bg-[var(--input)] text-[var(--primary)]',
            'focus:ring-2 focus:ring-[var(--primary)]/20 focus:ring-offset-0',
            'cursor-pointer accent-[var(--primary)]',
            className,
          )}
          {...props}
        />
        {(label || description) && (
          <div className="flex flex-col">
            {label && (
              <label
                htmlFor={checkboxId}
                className="text-sm font-medium text-[var(--text)] cursor-pointer"
              >
                {label}
              </label>
            )}
            {description && (
              <span className="text-xs text-[var(--text-secondary)]">
                {description}
              </span>
            )}
          </div>
        )}
      </div>
    );
  },
);

Checkbox.displayName = 'Checkbox';

// ─── Switch ───────────────────────────────────────────────────────────────────

export interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
  id?: string;
}

export function Switch({
  checked,
  onChange,
  label,
  description,
  disabled,
  id,
}: SwitchProps) {
  const switchId = id ?? React.useId();

  return (
    <div className="flex items-center gap-3">
      <button
        id={switchId}
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full',
          'border-2 border-transparent transition-colors duration-200',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          checked ? 'bg-[var(--primary)]' : 'bg-[var(--border)]',
        )}
      >
        <span
          className={cn(
            'pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow',
            'transform transition-transform duration-200',
            checked ? 'translate-x-4' : 'translate-x-0',
          )}
        />
      </button>
      {(label || description) && (
        <div className="flex flex-col">
          {label && (
            <label
              htmlFor={switchId}
              className="text-sm font-medium text-[var(--text)] cursor-pointer"
            >
              {label}
            </label>
          )}
          {description && (
            <span className="text-xs text-[var(--text-secondary)]">
              {description}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
