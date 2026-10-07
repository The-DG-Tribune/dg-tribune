import { Link } from "react-router-dom";
import { SearchX, Home } from "lucide-react";
import { ROUTES } from "@/constants/routes";

/**
 * 404 Page - Document 06B spec:
 * simple illustration, plain explanation, Back Home + Search actions,
 * no technical language.
 */
export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="text-center max-w-md mx-auto">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-surface border border-border">
          <SearchX className="h-8 w-8 text-accent" strokeWidth={1.5} />
        </div>

        <h1 className="font-heading text-page-title text-text mb-2">
          Page not found
        </h1>
        <p className="text-body text-text-secondary mb-8">
          This page doesn't exist or may have moved. Let's get you back on
          track.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link
            to={ROUTES.home}
            className="inline-flex items-center gap-2 rounded-button bg-accent text-background font-semibold text-body px-6 py-3 transition-colors duration-button hover:opacity-90"
          >
            <Home className="h-4 w-4" />
            Back Home
          </Link>
          <Link
            to={ROUTES.search}
            className="inline-flex items-center gap-2 rounded-button border border-border text-text font-semibold text-body px-6 py-3 transition-colors duration-button hover:border-accent"
          >
            <SearchX className="h-4 w-4" />
            Search DG Tribune
          </Link>
        </div>
      </div>
    </div>
  );
}
