"use client";

import { useState } from "react";
import { cn } from "@/lib/utils/cn";

type TabKey = "threads" | "replies" | "media" | "likes";

interface Tab {
  key: TabKey;
  label: string;
}

const TABS: Tab[] = [
  { key: "threads", label: "Thread" },
  { key: "replies", label: "Balasan" },
  { key: "media", label: "Media" },
  { key: "likes", label: "Suka" },
];

interface ProfileTabsProps {
  activeTab?: TabKey;
  onTabChange?: (tab: TabKey) => void;
}

/**
 * Tab navigation for the profile page — Threads, Replies, Media, Likes.
 * Uses a bottom-border indicator on the active tab.
 */
export function ProfileTabs({ activeTab = "threads", onTabChange }: ProfileTabsProps) {
  const [current, setCurrent] = useState<TabKey>(activeTab);

  function handleClick(tab: TabKey) {
    setCurrent(tab);
    onTabChange?.(tab);
  }

  return (
    <nav className="mt-md flex border-b border-outline-variant/30" aria-label="Tab profil">
      {TABS.map(({ key, label }) => (
        <button
          key={key}
          type="button"
          onClick={() => handleClick(key)}
          className={cn(
            "flex-1 py-md text-center font-medium transition-colors",
            current === key
              ? "border-b-4 border-primary font-bold text-on-surface"
              : "text-on-surface-variant hover:bg-surface-container-low",
          )}
          aria-selected={current === key}
          role="tab"
        >
          {label}
        </button>
      ))}
    </nav>
  );
}
