"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, Search, User, LogOut, X } from "lucide-react";
import { createBrowserClient } from "@/lib/supabase/client";
import { Avatar } from "@/components/ui/Avatar";
import { cn } from "@/lib/utils/cn";

interface UserInfo {
  username: string;
  displayName: string;
  avatarUrl: string | null;
}

interface SearchResult {
  type: "post" | "profile";
  id: string;
  title: string;
  subtitle: string;
  href: string;
}

/**
 * Top navigation bar with functional search and avatar dropdown menu.
 */
export function Navbar() {
  const router = useRouter();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);

  // Fetch user info
  useEffect(() => {
    async function fetchUser() {
      const supabase = createBrowserClient();
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("username, display_name, avatar_url")
        .eq("user_id", authUser.id)
        .single();

      if (profile) {
        setUser({
          username: profile.username,
          displayName: profile.display_name,
          avatarUrl: profile.avatar_url,
        });
      }
    }
    fetchUser();
  }, []);

  // Close menu/search on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Debounced search
  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);

    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    searchTimeout.current = setTimeout(() => {
      performSearch(searchQuery.trim());
    }, 300);

    return () => {
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
    };
  }, [searchQuery]);

  async function performSearch(query: string): Promise<void> {
    setIsSearching(true);
    setShowResults(true);
    const supabase = createBrowserClient();
    const results: SearchResult[] = [];

    // Search profiles
    const { data: profiles } = await supabase
      .from("profiles")
      .select("username, display_name, avatar_url")
      .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
      .limit(5);

    if (profiles) {
      profiles.forEach((p) => {
        results.push({
          type: "profile",
          id: p.username,
          title: p.display_name,
          subtitle: `@${p.username}`,
          href: `/profile/${p.username}`,
        });
      });
    }

    // Search posts
    const { data: posts } = await supabase
      .from("posts")
      .select("id, content, profiles(username, display_name)")
      .ilike("content", `%${query}%`)
      .eq("is_published", true)
      .eq("is_deleted", false)
      .limit(5);

    if (posts) {
      posts.forEach((p: { id: string; content: string | null; profiles: { username: string; display_name: string } | null }) => {
        results.push({
          type: "post",
          id: p.id,
          title: p.content?.slice(0, 60) ?? "Postingan",
          subtitle: p.profiles ? `@${p.profiles.username}` : "",
          href: `/post/${p.id}`,
        });
      });
    }

    setSearchResults(results);
    setIsSearching(false);
  }

  async function handleLogout(): Promise<void> {
    const supabase = createBrowserClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  function handleSearchSelect(href: string) {
    setShowResults(false);
    setSearchQuery("");
    router.push(href);
  }

  return (
    <nav
      className="fixed top-0 z-50 flex h-16 w-full items-center justify-between border-b border-outline-variant bg-surface/80 px-4 backdrop-blur-xl"
      aria-label="Navigasi utama"
    >
      {/* Left: Logo */}
      <div className="flex items-center gap-4">
        <Link
          href="/feed"
          className="text-title-md font-bold text-primary lg:hidden"
          aria-label="Threadify Home"
        >
          T
        </Link>
        <Link
          href="/feed"
          className="hidden text-headline-lg-mobile font-bold text-primary lg:block"
          aria-label="Threadify Home"
        >
          Threadify
        </Link>
      </div>

      {/* Center: Search */}
      <div ref={searchRef} className="relative mx-4 hidden w-full max-w-sm md:block">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-on-surface-variant" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => searchQuery.trim().length >= 2 && setShowResults(true)}
          placeholder="Cari thread atau profil..."
          className="w-full rounded-full border-none bg-surface-container-low py-2 pl-10 pr-10 text-body-sm outline-none transition-all focus:ring-2 focus:ring-primary"
          aria-label="Cari di Threadify"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => { setSearchQuery(""); setShowResults(false); }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface"
          >
            <X className="h-4 w-4" />
          </button>
        )}

        {/* Search Results Dropdown */}
        {showResults && (
          <div className="absolute left-0 top-full mt-2 w-full overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-lg">
            {isSearching ? (
              <div className="px-md py-sm text-center text-body-sm text-on-surface-variant">
                Mencari...
              </div>
            ) : searchResults.length === 0 ? (
              <div className="px-md py-sm text-center text-body-sm text-on-surface-variant">
                Tidak ditemukan hasil untuk &ldquo;{searchQuery}&rdquo;
              </div>
            ) : (
              <div className="max-h-80 overflow-y-auto py-xs">
                {searchResults.map((result) => (
                  <button
                    key={`${result.type}-${result.id}`}
                    type="button"
                    onClick={() => handleSearchSelect(result.href)}
                    className="flex w-full items-center gap-sm px-md py-sm text-left transition-colors hover:bg-surface-container-low"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-container">
                      {result.type === "profile" ? (
                        <User className="h-4 w-4 text-primary" />
                      ) : (
                        <Search className="h-4 w-4 text-on-surface-variant" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-label-md font-medium text-on-surface">
                        {result.title}
                      </p>
                      <p className="truncate text-label-xs text-on-surface-variant">
                        {result.subtitle}
                      </p>
                    </div>
                    <span className="rounded bg-surface-container px-xs py-[2px] text-label-xs text-on-surface-variant">
                      {result.type === "profile" ? "Profil" : "Thread"}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right: Bell + Avatar Dropdown or Login button */}
      <div className="flex items-center gap-3">
        {user ? (
          <>
            <Link
              href="/strikes"
              className="rounded-full p-2 transition-colors hover:bg-surface-container-low active:scale-95"
              aria-label="Peringatan"
            >
              <Bell className="h-5 w-5 text-on-surface-variant" />
            </Link>

            {/* Avatar with dropdown */}
            <div ref={menuRef} className="relative">
              <button
                type="button"
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="rounded-full transition-all hover:ring-2 hover:ring-primary/30"
                aria-label="Menu profil"
                aria-expanded={isMenuOpen}
              >
                <Avatar
                  src={user?.avatarUrl ?? null}
                  displayName={user?.displayName ?? "U"}
                  size="sm"
                />
              </button>

              {/* Dropdown Menu */}
              {isMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-lg">
                  {/* User info */}
                  <div className="border-b border-outline-variant/50 px-md py-sm">
                    <p className="truncate text-label-md font-bold text-on-surface">
                      {user.displayName}
                    </p>
                    <p className="truncate text-label-xs text-on-surface-variant">
                      @{user.username}
                    </p>
                  </div>

                  {/* Menu items */}
                  <div className="py-xs">
                    <Link
                      href={`/profile/${user.username}`}
                      onClick={() => setIsMenuOpen(false)}
                      className="flex items-center gap-sm px-md py-sm text-label-md text-on-surface transition-colors hover:bg-surface-container-low"
                    >
                      <User className="h-4 w-4 text-on-surface-variant" />
                      Profil Saya
                    </Link>
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="flex w-full items-center gap-sm px-md py-sm text-left text-label-md text-error transition-colors hover:bg-error-container/10"
                    >
                      <LogOut className="h-4 w-4" />
                      Keluar
                    </button>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <Link
            href="/login"
            className="rounded-full bg-primary px-4 py-2 text-label-md font-bold text-on-primary transition-all hover:brightness-110 active:scale-95"
          >
            Masuk
          </Link>
        )}
      </div>
    </nav>
  );
}
