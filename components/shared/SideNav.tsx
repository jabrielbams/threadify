"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Shield, Flag, User } from "lucide-react";
import { createBrowserClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils/cn";

interface NavItem {
  href: string;
  icon: React.ElementType;
  label: string;
}

/**
 * Desktop left sidebar navigation — visible only on lg+ screens.
 * Fixed width, compact design with pill-shaped items.
 */
export function SideNav() {
  const pathname = usePathname();
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    async function fetchUsername() {
      const supabase = createBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("username")
        .eq("user_id", user.id)
        .single();

      if (profile) setUsername(profile.username);
    }
    fetchUsername();
  }, []);

  const NAV_ITEMS: NavItem[] = username
    ? [
        { href: "/feed", icon: Home, label: "Beranda" },
        { href: "/strikes", icon: Shield, label: "Peringatan" },
        { href: "/reports", icon: Flag, label: "Laporan" },
        { href: `/profile/${username}`, icon: User, label: "Profil" },
      ]
    : [
        { href: "/feed", icon: Home, label: "Beranda" },
      ];

  return (
    <aside className="sticky top-16 hidden h-[calc(100vh-4rem)] w-52 shrink-0 flex-col border-r border-outline-variant px-4 py-6 lg:flex">
      <nav className="flex flex-col gap-1" aria-label="Navigasi utama">
        {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
          const isActive = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-body-sm font-medium transition-colors",
                isActive
                  ? "bg-surface-container-low font-bold text-primary"
                  : "text-on-surface-variant hover:bg-surface-container",
              )}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon className="h-5 w-5" />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>

      {username && (
        <Link
          href="/post/new"
          className="mt-6 rounded-full bg-primary px-5 py-2.5 text-center text-label-md font-bold text-on-primary shadow-md shadow-primary/20 transition-all hover:brightness-110 active:scale-95"
        >
          Post
        </Link>
      )}
    </aside>
  );
}
