import { useState, type FormEvent } from "react";
import { Mail, CheckCircle2 } from "lucide-react";
import { Container } from "@/components/layout/Container";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { createDocument } from "@/services/firebase/firestore";

export default function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      await createDocument("contactMessages", {
        name: name.trim(),
        email: email.trim(),
        message: message.trim(),
      });
      setIsSubmitted(true);
    } catch {
      setError("We couldn't send your message right now. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Container>
      <div className="py-12 max-w-md mx-auto">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-accent/10 text-accent">
            <Mail className="h-5 w-5" />
          </div>
          <h1 className="font-heading text-page-title text-text mb-1">
            Get in touch
          </h1>
          <p className="text-body text-text-secondary">
            Questions, tips, or feedback - we'd love to hear from you.
          </p>
        </div>

        {isSubmitted ? (
          <div className="flex flex-col items-center gap-3 rounded-card border border-border bg-surface p-8 text-center">
            <CheckCircle2 className="h-8 w-8 text-accent" />
            <p className="text-body text-text">Message sent - thank you!</p>
            <p className="text-small text-text-secondary">
              We'll get back to you as soon as we can.
            </p>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            className="rounded-card border border-border bg-surface p-6 space-y-4"
          >
            <Input
              label="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <Textarea
              label="Message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
              required
            />
            {error && (
              <p className="text-small text-danger" role="alert">
                {error}
              </p>
            )}
            <Button type="submit" className="w-full" isLoading={isSubmitting}>
              Send Message
            </Button>
          </form>
        )}
      </div>
    </Container>
  );
}
