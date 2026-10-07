/**
 * PHASE 2 - GLOBAL UI SYSTEM VERIFICATION SCREEN.
 *
 * Temporary checkpoint page (like Phase 1's), not a real site page.
 * Demonstrates every reusable component built in this phase so it
 * can be reviewed and tested for responsiveness before Phase 3.
 * Replaced by the real Homepage in Phase 7.
 */
import { useState, type ReactNode } from "react";
import { Bell, Star, Trash2 } from "lucide-react";
import { Navbar } from "@/components/navigation/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Container } from "@/components/layout/Container";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Dropdown } from "@/components/ui/Dropdown";
import { SearchInput } from "@/components/ui/SearchInput";
import { Tabs } from "@/components/ui/Tabs";
import { Skeleton, CardSkeleton } from "@/components/ui/Skeleton";
import { Card, CardImage, CardBody } from "@/components/cards/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Pagination } from "@/components/ui/Pagination";
import { Loader } from "@/components/ui/Loader";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useToast } from "@/context/ToastContext";

function Section({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="py-10 border-b border-divider">
      <h2 className="font-heading text-section-title text-text mb-6">
        {title}
      </h2>
      {children}
    </section>
  );
}

export default function Phase2Showcase() {
  const { showToast } = useToast();
  const [search, setSearch] = useState("");
  const [dropdownValue, setDropdownValue] = useState("");
  const [page, setPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1">
        <Container>
          <div className="py-8">
            <Badge variant="accent" className="mb-3">
              Phase 2 · Global UI System
            </Badge>
            <h1 className="font-heading text-page-title text-text">
              Component Library
            </h1>
            <p className="text-body text-text-secondary mt-2">
              Every reusable component, ready for Phase 3.
            </p>
          </div>

          <Section title="Buttons">
            <div className="flex flex-wrap gap-3">
              <Button variant="primary">Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="icon" aria-label="Notifications">
                <Bell className="h-4 w-4" />
              </Button>
              <Button variant="primary" isLoading>
                Loading
              </Button>
              <Button variant="primary" disabled>
                Disabled
              </Button>
              <Button variant="primary" size="sm">
                Small
              </Button>
              <Button variant="primary" size="lg">
                Large
              </Button>
            </div>
          </Section>

          <Section title="Badges">
            <div className="flex flex-wrap gap-2">
              <Badge>Default</Badge>
              <Badge variant="accent">Transfer</Badge>
              <Badge variant="info">News</Badge>
              <Badge variant="warning">Matchday</Badge>
              <Badge variant="danger">Breaking</Badge>
            </div>
          </Section>

          <Section title="Inputs">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl">
              <Input label="Article title" placeholder="e.g. Messi signs new deal" />
              <Input
                label="Email"
                type="email"
                placeholder="admin@dgtribune.com"
                error="Enter a valid email address"
              />
              <Dropdown
                label="Category"
                placeholder="Choose a category"
                value={dropdownValue}
                onChange={setDropdownValue}
                options={[
                  { label: "Transfer News", value: "transfer" },
                  { label: "Match Reports", value: "match-reports" },
                  { label: "Breaking News", value: "breaking" },
                ]}
              />
              <div>
                <label className="mb-2 block text-small font-medium text-text">
                  Search
                </label>
                <SearchInput
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onClear={() => setSearch("")}
                  placeholder="Search articles, players, teams…"
                />
              </div>
              <div className="md:col-span-2">
                <Textarea
                  label="Excerpt"
                  placeholder="A short summary of the article…"
                  hint="Shown on article cards across the site."
                />
              </div>
            </div>
          </Section>

          <Section title="Tabs">
            <Tabs
              tabs={[
                { value: "overview", label: "Overview", content: <p className="text-body text-text-secondary">Overview content.</p> },
                { value: "stats", label: "Stats", content: <p className="text-body text-text-secondary">Stats content.</p> },
                { value: "history", label: "History", content: <p className="text-body text-text-secondary">History content.</p> },
              ]}
            />
          </Section>

          <Section title="Cards & Skeletons">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <Card interactive>
                <CardImage className="flex items-center justify-center text-text-secondary text-caption">
                  Cover Image
                </CardImage>
                <CardBody>
                  <Badge variant="accent" className="mb-2">Transfer</Badge>
                  <h3 className="font-heading text-card-title text-text">
                    Sample Article Card
                  </h3>
                  <p className="text-small text-text-secondary mt-1">
                    3 min read
                  </p>
                </CardBody>
              </Card>
              <CardSkeleton />
              <CardSkeleton />
            </div>
            <div className="mt-4 flex gap-3">
              <Skeleton className="h-10 w-24" />
              <Skeleton className="h-10 w-10 rounded-full" />
            </div>
          </Section>

          <Section title="Empty & Error States">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <EmptyState
                title="No wallpapers yet."
                description="Nothing here yet. Check back after the next kickoff."
                actionLabel="Upload wallpaper"
                onAction={() => showToast("This is just a demo action")}
              />
              <ErrorState onRetry={() => showToast("Retrying…", "info")} />
            </div>
          </Section>

          <Section title="Loader & Pagination">
            <div className="flex flex-col gap-8">
              <Loader label="Loading fixtures…" />
              <Pagination currentPage={page} totalPages={9} onPageChange={setPage} />
            </div>
          </Section>

          <Section title="Toasts, Modal & Confirm Dialog">
            <div className="flex flex-wrap gap-3">
              <Button onClick={() => showToast("Article Published")}>
                Trigger success toast
              </Button>
              <Button
                variant="secondary"
                onClick={() => showToast("Upload failed", "error")}
              >
                Trigger error toast
              </Button>
              <Button variant="secondary" onClick={() => setIsModalOpen(true)}>
                <Star className="h-4 w-4 mr-1" /> Open modal
              </Button>
              <Button
                variant="secondary"
                onClick={() => setIsConfirmOpen(true)}
              >
                <Trash2 className="h-4 w-4 mr-1" /> Open confirm dialog
              </Button>
            </div>
          </Section>

          <p className="py-10 text-caption text-text-secondary">
            Ready for Phase 3 - Firebase Integration.
          </p>
        </Container>
      </main>

      <Footer />

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Sample Modal"
      >
        <p className="text-body text-text-secondary mb-6">
          This is a modal built with the shared Modal component - subtle
          fade and scale, closes on Escape or backdrop click.
        </p>
        <div className="flex justify-end">
          <Button onClick={() => setIsModalOpen(false)}>Close</Button>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={() => {
          setIsConfirmOpen(false);
          showToast("Item deleted", "error");
        }}
        title="Delete this item?"
        description="This action moves the item to Trash. It can be restored later."
        confirmLabel="Delete"
        isDestructive
      />
    </div>
  );
}
