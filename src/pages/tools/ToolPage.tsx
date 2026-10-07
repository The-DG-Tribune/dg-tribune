import { Suspense, useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Container } from "@/components/layout/Container";
import { Badge } from "@/components/ui/Badge";
import { Loader } from "@/components/ui/Loader";
import { Card } from "@/components/cards/Card";
import { ROUTES } from "@/constants/routes";
import { getDocumentBySlug } from "@/services/firebase/firestore";
import { TOOL_REGISTRY } from "@/pages/tools/registry";
import { TOOL_ICONS } from "@/constants/toolIcons";
import type { Tool } from "@/types/firestore";

const FULL_WIDTH_TOOLS = new Set([
  "league-predictor",
  "stadium-finder",
  "match-predictor",
  "age-calculator",
  "club-logo-quiz",
  "transfer-value-estimator",
]);

export default function ToolPage() {
  const { slug } = useParams<{ slug: string }>();
  const [tool, setTool] = useState<Tool | null | undefined>(undefined);

  useEffect(() => {
    if (!slug) return;
    (async () => {
      const found = await getDocumentBySlug<Tool>("tools", slug);
      setTool(found);
    })();
  }, [slug]);

  if (tool === undefined) {
    return (
      <Container>
        <div className="flex justify-center py-20">
          <Loader label="Loading tool..." />
        </div>
      </Container>
    );
  }

  if (!tool) {
    return (
      <Container>
        <div className="py-16 text-center">
          <h1 className="font-heading text-page-title text-text mb-2">Tool not found</h1>
          <Link to={ROUTES.tools} className="text-accent underline">Back to Tools</Link>
        </div>
      </Container>
    );
  }

  const Implementation = slug ? TOOL_REGISTRY[slug] : undefined;
  const Icon = TOOL_ICONS[tool.iconName];
  const isFullWidth = slug ? FULL_WIDTH_TOOLS.has(slug) : false;

  return (
    <Container>
      <div className="py-10">
        <Link to={ROUTES.tools} className="inline-flex items-center gap-1.5 text-small text-text-secondary hover:text-text mb-6 transition-colors duration-button">
          <ArrowLeft className="h-4 w-4" />
          Back to Tools
        </Link>

        <div className="mb-8">
          <Badge variant="accent" className="mb-3">Tool</Badge>
          <h1 className="font-heading text-page-title text-text mb-2">{tool.name}</h1>
          <p className="text-body text-text-secondary max-w-2xl">{tool.description}</p>
        </div>

        {!Implementation ? (
          <div className="rounded-card border border-dashed border-border bg-surface p-10 text-center">
            <p className="text-body text-text mb-1">This tool is coming soon.</p>
            <p className="text-small text-text-secondary">It's registered but not built yet - check back soon.</p>
          </div>
        ) : isFullWidth ? (
          <Suspense fallback={<div className="flex justify-center py-16"><Loader label="Loading tool..." /></div>}>
            <Implementation />
          </Suspense>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            <div className="lg:col-span-2 w-full">
              <Suspense fallback={<div className="flex justify-center py-16"><Loader label="Loading tool..." /></div>}>
                <Implementation />
              </Suspense>
            </div>
            <div className="hidden lg:block">
              <Card className="p-5">
                <span className="flex h-12 w-12 items-center justify-center rounded-button bg-accent/10 text-accent mb-4">
                  {Icon && <Icon className="h-6 w-6" />}
                </span>
                <h2 className="font-heading text-card-title text-text mb-2">{tool.name}</h2>
                <p className="text-small text-text-secondary">{tool.description}</p>
              </Card>
            </div>
          </div>
        )}
      </div>
    </Container>
  );
}
