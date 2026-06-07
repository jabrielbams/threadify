"use client";

import { useRef } from "react";
import { cn } from "@/lib/utils/cn";
import type { ChangeEvent, ClipboardEvent, KeyboardEvent } from "react";

const OTP_LENGTH = 6;

interface OtpDigitInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

/**
 * 6-digit OTP input rendered as individual character boxes.
 * Features: auto-advance on input, backspace to go back, full-code paste.
 */
export function OtpDigitInput({
  value,
  onChange,
  disabled = false,
}: OtpDigitInputProps) {
  const inputRefs = useRef<Array<HTMLInputElement | null>>(
    Array(OTP_LENGTH).fill(null),
  );

  // Derive an array of individual digit characters from the value string
  const digits = value.padEnd(OTP_LENGTH, " ").split("").slice(0, OTP_LENGTH);

  function handleChange(index: number, e: ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/\D/g, "");
    if (!raw) return;
    const digit = raw[raw.length - 1]; // use last char if browser pastes multiple
    const next = [...digits];
    next[index] = digit;
    onChange(next.join("").trimEnd());
    // Auto-advance focus to next box
    if (index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handleKeyDown(index: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace") {
      if (digits[index]?.trim()) {
        const next = [...digits];
        next[index] = " ";
        onChange(next.join("").trimEnd());
      } else if (index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === "ArrowRight" && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handlePaste(e: ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LENGTH);
    if (!pasted) return;
    onChange(pasted);
    const nextFocus = Math.min(pasted.length, OTP_LENGTH - 1);
    inputRefs.current[nextFocus]?.focus();
  }

  return (
    <div
      className="flex justify-center gap-2"
      role="group"
      aria-label="Kode OTP 6 digit"
    >
      {Array.from({ length: OTP_LENGTH }, (_, i) => (
        <input
          key={i}
          ref={(el) => {
            inputRefs.current[i] = el;
          }}
          type="text"
          inputMode="numeric"
          pattern="[0-9]"
          maxLength={1}
          value={digits[i]?.trim() ?? ""}
          onChange={(e) => handleChange(i, e)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          disabled={disabled}
          aria-label={`Digit ${i + 1}`}
          className={cn(
            "h-12 w-12 rounded-xl border border-gray-300 bg-white",
            "text-center text-lg font-semibold text-gray-900",
            "transition-colors duration-150",
            "focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20",
            "disabled:cursor-not-allowed disabled:bg-surface-card",
            digits[i]?.trim() && "border-brand-primary bg-indigo-50",
          )}
        />
      ))}
    </div>
  );
}
