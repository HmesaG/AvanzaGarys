"use client";

// Bottom nav exclusivo del panel administrativo. Deliberadamente separado
// de components/BottomNav.tsx: cliente y admin son personas distintas con
// navegación distinta, no deben mezclarse ni compartir estado de ruta activa.
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, Calendar, MoreHorizontal } from "lucide-react";

const ITEMS = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/clientes", label: "Clientes", icon: Users, exact: false },
  { href: "/admin/citas", label: "Citas", icon: Calendar, exact: false },
  { href: "/admin/mas", label: "Más", icon: MoreHorizontal, exact: false },
] as const;

export default function AdminBottomNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navegación del panel administrativo"
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-gray-200 bg-white/95 backdrop-blur safe-bottom"
    >
      <ul className="mx-auto flex max-w-md items-stretch justify-between">
        {ITEMS.map(({ href, label, icon: Icon, exact }) => {
          const active = exact
            ? pathname === href
            : pathname === href || pathname?.startsWith(href + "/");
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className="group flex min-h-[56px] flex-col items-center justify-center gap-1 py-2 text-xs transition-colors duration-150"
              >
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-full transition-all duration-200 ${
                    active ? "bg-avanza-green-light" : "bg-transparent group-active:bg-gray-100"
                  }`}
                >
                  <Icon
                    className={`h-5 w-5 transition-colors duration-150 ${
                      active ? "text-avanza-green" : "text-gray-400 group-hover:text-gray-600"
                    }`}
                    strokeWidth={active ? 2.25 : 1.9}
                    aria-hidden="true"
                  />
                </span>
                <span
                  className={`transition-colors duration-150 ${
                    active ? "font-semibold text-avanza-green" : "text-gray-500"
                  }`}
                >
                  {label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
