import { Navbar } from "@/components/shared/Navbar";
import { SideNav } from "@/components/shared/SideNav";
import { BottomNav } from "@/components/shared/BottomNav";

interface MainLayoutProps {
  children: React.ReactNode;
}

/**
 * Shared layout for all protected (main) routes.
 * Two-column layout: SideNav (lg+) | Content (max 600px centered).
 * Includes top Navbar (all viewports) and BottomNav (mobile).
 */
export default function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="min-h-screen bg-background text-on-surface">
      <Navbar />
      <div className="flex min-h-screen pt-16">
        <SideNav />
        <div className="mx-auto w-full max-w-[600px] flex-1">
          {children}
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
