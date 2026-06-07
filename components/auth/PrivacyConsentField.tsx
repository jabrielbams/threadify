import { cn } from "@/lib/utils/cn";

interface PrivacyConsentFieldProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  error?: string;
}

/**
 * UU PDP-compliant privacy consent checkbox.
 * Required on the registration form per Indonesian Personal Data Protection Law.
 */
export function PrivacyConsentField({
  checked,
  onChange,
  error,
}: PrivacyConsentFieldProps) {
  return (
    <div className="flex flex-col gap-1">
      <label
        className={cn(
          "flex cursor-pointer items-start gap-3 text-sm",
          error ? "text-brand-danger" : "text-gray-600",
        )}
      >
        <input
          type="checkbox"
          className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 accent-brand-primary"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          required
          aria-describedby={error ? "consent-error" : undefined}
        />
        <span>
          Saya menyetujui{" "}
          <a
            href="/tnc-privacy"
            className="font-medium text-brand-primary hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            Kebijakan Privasi
          </a>{" "}
          dan penggunaan data sesuai UU PDP
        </span>
      </label>
      {error && (
        <p id="consent-error" className="text-xs text-brand-danger" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
