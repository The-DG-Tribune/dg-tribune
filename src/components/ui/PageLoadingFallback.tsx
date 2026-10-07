import { Loader } from "@/components/ui/Loader";

/** PageLoadingFallback - shown by Suspense while a lazy-loaded route chunk downloads. */
export function PageLoadingFallback() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <Loader size="lg" />
    </div>
  );
}
