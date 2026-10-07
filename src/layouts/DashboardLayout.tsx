import { useState, Suspense } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { DashboardMobileDrawer } from "@/components/dashboard/DashboardMobileDrawer";
import { TopBar } from "@/components/dashboard/TopBar";
import { PageLoadingFallback } from "@/components/ui/PageLoadingFallback";

export interface DashboardOutletContext {
  searchValue: string;
}

/**
 * DashboardLayout - Document 05 CMS Foundation.
 * Fixed sidebar on desktop, slide-in drawer on mobile, sticky top
 * bar with search. Every /dashboard/* route renders inside this.
 */
export function DashboardLayout() {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <DashboardMobileDrawer
        isOpen={isMobileNavOpen}
        onClose={() => setIsMobileNavOpen(false)}
      />

      <div className="md:pl-64">
        <TopBar
          onOpenMobileNav={() => setIsMobileNavOpen(true)}
          searchValue={searchValue}
          onSearchChange={setSearchValue}
        />
        <main className="p-4 md:p-6">
          <Suspense fallback={<PageLoadingFallback />}>
            <Outlet context={{ searchValue } satisfies DashboardOutletContext} />
          </Suspense>
        </main>
      </div>
    </div>
  );
}
