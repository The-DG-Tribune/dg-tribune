import { Outlet } from "react-router-dom";
import { Suspense } from "react";
import { Navbar } from "@/components/navigation/Navbar";
import { Footer } from "@/components/layout/Footer";
import { CookieConsentBanner } from "@/components/layout/CookieConsentBanner";
import { AdManager } from "@/components/ads/AdManager";
import { ScrollToTop } from "@/components/layout/ScrollToTop";
import { PageLoadingFallback } from "@/components/ui/PageLoadingFallback";

/** PublicLayout - Document 06 Public Website Foundation. Every public route renders inside this. */
export function PublicLayout() {
  return (
    <div className="min-h-screen flex flex-col">
      <ScrollToTop />
      <AdManager />
      <Navbar />
      <main className="flex-1">
        <Suspense fallback={<PageLoadingFallback />}>
          <Outlet />
        </Suspense>
      </main>
      <Footer />
      <CookieConsentBanner />
    </div>
  );
}
