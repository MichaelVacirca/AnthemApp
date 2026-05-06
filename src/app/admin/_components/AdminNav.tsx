"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV: Array<{ href: string; label: string }> = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/staff", label: "Staff" },
  { href: "/admin/roles", label: "Roles" },
  { href: "/admin/checklists", label: "Checklists" },
  { href: "/admin/history", label: "History" },
];

export default function AdminNav() {
  const path = usePathname();
  return (
    <nav className="flex flex-wrap gap-1 text-sm">
      {NAV.map((item) => {
        const active = item.href === "/admin" ? path === "/admin" : path.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`rounded px-3 py-1.5 ${
              active
                ? "bg-white/10 text-white"
                : "text-white/70 hover:bg-white/5 hover:text-white"
            }`}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
