"use client";

import { useState, type MouseEvent, type ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils/cn";

interface LoadingLinkProps {
  href: string;
  children: ReactNode;
  className?: string;
  activeClassName?: string;
  isActive?: boolean;
  "aria-current"?: "page" | undefined;
  "aria-label"?: string;
}

/**
 * A Link component that shows a subtle loading pulse when clicked,
 * indicating that navigation is in progress.
 */
export function LoadingLink({
  href,
  children,
  className,
  isActive,
  ...props
}: LoadingLinkProps) {
  const [isNavigating, setIsNavigating] = useState(false);

  function handleClick(e: MouseEvent<HTMLAnchorElement>) {
    // Don't show loading if it's the current page
    if (isActive) {
      e.preventDefault();
      return;
    }
    setIsNavigating(true);
    // Reset after navigation completes (timeout as fallback)
    setTimeout(() => setIsNavigating(false), 3000);
  }

  return (
    <Link
      href={href}
      onClick={handleClick}
      className={cn(className, isNavigating && "opacity-70")}
      {...props}
    >
      {isNavigating ? (
        <span className="flex items-center gap-2">
          <span className="h-1 w-1 animate-ping rounded-full bg-current" />
          {children}
        </span>
      ) : (
        children
      )}
    </Link>
  );
}
