"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Shield, Flag, User, PenSquare } from "lucide-react";
import { createBrowserClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils/cn";

interface NavItem {
  href: string;
  icon: React.ElementType;
  label: string;
}

/**
 * Fixed bottom navigation bar for mobile viewports (hidden on lg+).
 * Dynamically resolves Profile link to current user's username.
 */
export function BottomNav() {
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
        { href: "/post/new", icon: PenSquare, label: "Post" },
        { href: "/strikes", icon: Shield, label: "Peringatan" },
        { href: "/reports", icon: Flag, label: "Laporan" },
        { href: `/profile/${username}`, icon: User, label: "Profil" },
      ]
    : [
        { href: "/feed", icon: Home, label: "Beranda" },
        { href: "/login", icon: User, label: "Masuk" },
      ];

  return (
    <nav
      className="fixed bottom-0 z-50 flex h-16 w-full items-center justify-around border-t border-outline-variant bg-surface/90 px-4 backdrop-blur-md lg:hidden"
      aria-label="Navigasi utama"
    >
      {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
        const isActive = pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex flex-col items-center justify-center transition-transform active:scale-90",
              isActive ? "text-primary" : "text-on-surface-variant",
            )}
            aria-current={isActive ? "page" : undefined}
          >
            <Icon className="h-5 w-5" />
            <span className="mt-0.5 text-label-xs">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
