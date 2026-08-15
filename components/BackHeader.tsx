"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

export default function BackHeader({
  title,
  subtitle,
  onBack,
}: {
  title: string;
  subtitle?: string;
  onBack?: () => void;
}) {
  const router = useRouter();

  return (
    <header className="mb-6">
      <button
        type="button"
        onClick={() => (onBack ? onBack() : router.back())}
        aria-label="Volver"
        className="mb-4 flex h-11 w-11 items-center justify-center rounded-full text-gray-600 transition-colors duration-150 hover:bg-gray-100 active:scale-95"
      >
        <ArrowLeft className="h-5 w-5" aria-hidden="true" />
      </button>
      <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
      {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
    </header>
  );
}
