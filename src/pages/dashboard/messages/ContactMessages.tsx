import { useEffect, useState } from "react";
import { Mail } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { Skeleton } from "@/components/ui/Skeleton";
import { getCollectionDocs } from "@/services/firebase/firestore";
import { formatDate } from "@/utils/formatDate";

interface ContactMessage {
  id: string;
  name: string;
  email: string;
  message: string;
  createdAt: number;
}

/**
 * Contact Messages - not linked in the sidebar, reachable directly
 * at /dashboard/messages. Shows every submission from the public
 * Contact page. Email notifications (via Resend or similar) can be
 * added once that's set up - for now, check here.
 */
export default function ContactMessages() {
  const [messages, setMessages] = useState<ContactMessage[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setError(null);
    try {
      const data = await getCollectionDocs<ContactMessage>("contactMessages", {});
      data.sort((a, b) => b.createdAt - a.createdAt);
      setMessages(data);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="max-w-2xl">
      <Badge variant="warning" className="mb-3">
        Direct-link tool
      </Badge>
      <h1 className="font-heading text-page-title text-text mb-2">
        Contact Messages
      </h1>
      <p className="text-body text-text-secondary mb-8">
        Submissions from the public Contact page.
      </p>

      {error ? (
        <ErrorState description={error} onRetry={load} />
      ) : messages === null ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : messages.length === 0 ? (
        <EmptyState
          icon={<Mail className="h-6 w-6" strokeWidth={1.5} />}
          title="No messages yet."
        />
      ) : (
        <div className="space-y-3">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className="rounded-card border border-border bg-surface p-4"
            >
              <div className="mb-2 flex items-center justify-between">
                <p className="text-body font-medium text-text">{msg.name}</p>
                <p className="text-caption text-text-secondary">
                  {formatDate(msg.createdAt)}
                </p>
              </div>
              <p className="text-small text-accent mb-2">{msg.email}</p>
              <p className="text-small text-text-secondary whitespace-pre-wrap">
                {msg.message}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
