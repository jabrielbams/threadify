import { cn } from "@/lib/utils/cn";
import type { InputHTMLAttributes, ReactNode } from "react";

// Omit 'prefix' because InputHTMLAttributes defines it as string|undefined
// but we need it as ReactNode for the fused label badge.
export interface InputProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "prefix"
> {
  label: string;
  error?: string;
  hint?: string;
  /** Rendered as a fused left badge, e.g. "+62" for phone inputs. */
  prefix?: ReactNode;
  /** Rendered as an absolute right overlay, e.g. a character counter. */
  suffix?: ReactNode;
}

/**
 * Threadify base input primitive.
 * Includes label, optional prefix/suffix, error state, and hint text.
 * Safe to use from Server or Client Components.
 */
export function Input({
  label,
  error,
  hint,
  prefix,
  suffix,
  className,
  id,
  required,
  ...props
}: InputProps) {
  const inputId = id ?? `input-${label.toLowerCase().replace(/\s+/g, "-")}`;

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={inputId} className="text-sm font-medium text-gray-700">
        {label}
        {required && (
          <span className="ml-0.5 text-brand-danger" aria-hidden="true">
            *
          </span>
        )}
      </label>

      <div className="flex">
        {prefix && (
          <span className="flex shrink-0 select-none items-center rounded-l-xl border border-r-0 border-gray-300 bg-surface-card px-3 text-sm text-gray-500">
            {prefix}
          </span>
        )}
        <div className="relative flex-1">
          <input
            id={inputId}
            required={required}
            className={cn(
              "w-full border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900",
              "placeholder:text-gray-400",
              "transition-colors duration-150",
              "focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20",
              "disabled:cursor-not-allowed disabled:bg-surface-card disabled:text-gray-400",
              error &&
                "border-brand-danger focus:border-brand-danger focus:ring-brand-danger/20",
              prefix ? "rounded-r-xl" : "rounded-xl",
              suffix && "pr-10",
              className,
            )}
            aria-invalid={error ? true : undefined}
            aria-describedby={
              error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined
            }
            {...props}
          />
          {suffix && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">
              {suffix}
            </span>
          )}
        </div>
      </div>

      {error && (
        <p
          id={`${inputId}-error`}
          className="text-xs text-brand-danger"
          role="alert"
        >
          {error}
        </p>
      )}
      {hint && !error && (
        <p id={`${inputId}-hint`} className="text-xs text-gray-500">
          {hint}
        </p>
      )}
    </div>
  );
}
