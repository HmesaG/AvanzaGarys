"use client";

import { LucideIcon } from "lucide-react";
import { InputHTMLAttributes, useId } from "react";

export default function TextField({
  label,
  icon: Icon,
  error,
  ...props
}: {
  label: string;
  icon: LucideIcon;
  error?: string;
} & InputHTMLAttributes<HTMLInputElement>) {
  const generatedId = useId();
  const id = props.id ?? generatedId;

  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-gray-700">
        {label}
      </label>
      <div className="relative">
        <Icon
          className="pointer-events-none absolute left-3.5 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400"
          aria-hidden="true"
        />
        <input
          id={id}
          {...props}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : undefined}
          className={`min-h-[48px] w-full rounded-xl border py-2.5 pl-11 pr-3.5 text-base text-gray-900 placeholder:text-gray-400 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-avanza-green/40 ${
            error ? "border-red-400" : "border-gray-300 focus:border-avanza-green"
          }`}
        />
      </div>
      {error && (
        <p id={`${id}-error`} className="mt-1.5 text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
