"use client";

import { useState, useRef, useEffect } from "react";
import { Smile } from "lucide-react";
import { cn } from "@/lib/utils/cn";

const EMOJI_CATEGORIES = [
  { label: "Sering", emojis: ["😊", "❤️", "🔥", "👍", "😂", "🎉", "✨", "💯", "🙏", "😍"] },
  { label: "Wajah", emojis: ["😀", "😃", "😄", "😁", "😆", "🥹", "😅", "🤣", "🥰", "😇", "🙂", "😉", "😌", "😎", "🤩", "🥳", "😤", "😭", "🤔", "🫡"] },
  { label: "Gestur", emojis: ["👋", "🤚", "✋", "🖖", "👌", "🤌", "🤏", "✌️", "🤞", "🤟", "🤘", "👈", "👉", "👆", "👇", "☝️", "👏", "🙌", "💪", "🫶"] },
  { label: "Objek", emojis: ["☕", "🎨", "📱", "💻", "🎮", "📷", "🎵", "📚", "✈️", "🚀", "🌟", "💡", "🏆", "🎯", "⚡", "🌈", "🌸", "🌲", "☀️", "🌙"] },
];

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  disabled?: boolean;
}

/**
 * Lightweight emoji picker with categories.
 * Opens as a dropdown, inserts selected emoji into the parent input.
 */
export function EmojiPicker({ onSelect, disabled = false }: EmojiPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState(0);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  function handleSelect(emoji: string) {
    onSelect(emoji);
    setIsOpen(false);
  }

  return (
    <div ref={pickerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        className="rounded-full p-1.5 text-primary transition-colors hover:bg-surface-container disabled:opacity-40"
        aria-label="Tambah emoji"
        aria-expanded={isOpen}
      >
        <Smile className="h-5 w-5" />
      </button>

      {isOpen && (
        <div className="absolute bottom-full left-0 mb-2 w-72 overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-lg">
          {/* Category tabs */}
          <div className="flex border-b border-outline-variant/30 px-2 pt-2">
            {EMOJI_CATEGORIES.map((cat, i) => (
              <button
                key={cat.label}
                type="button"
                onClick={() => setActiveCategory(i)}
                className={cn(
                  "flex-1 rounded-t-lg px-2 py-1.5 text-label-xs font-medium transition-colors",
                  activeCategory === i
                    ? "bg-surface-container text-primary"
                    : "text-on-surface-variant hover:text-on-surface",
                )}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Emoji grid */}
          <div className="grid max-h-48 grid-cols-8 gap-0.5 overflow-y-auto p-2">
            {EMOJI_CATEGORIES[activeCategory].emojis.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => handleSelect(emoji)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-lg transition-colors hover:bg-surface-container"
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
