"use client";

import { TextareaHTMLAttributes, useId } from "react";

export default function TextAreaField({
  label,
  error,
  ...props
}: {
  label: string;
  error?: string;
} & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const generatedId = useId();
  const id = props.id ?? generatedId;

  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-gray-700">
        {label}
      </label>
      <textarea
        id={id}
        {...props}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
        rows={props.rows ?? 3}
        className={`w-full rounded-xl border py-2.5 px-3.5 text-base text-gray-900 placeholder:text-gray-400 transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-avanza-green/40 ${
          error ? "border-red-400" : "border-gray-300 focus:border-avanza-green"
        }`}
      />
      {error && (
        <p id={`${id}-error`} className="mt-1.5 text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
