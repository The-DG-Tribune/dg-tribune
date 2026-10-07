import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Wrench, ArrowUpRight, Sparkles } from "lucide-react";
import { Container } from "@/components/layout/Container";
import { GlassCard } from "@/components/ui/GlassCard";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorState } from "@/components/ui/ErrorState";
import { TOOL_ICONS } from "@/constants/toolIcons";
import { ROUTES } from "@/constants/routes";
import { getCollectionDocs } from "@/services/firebase/firestore";
import { TOOL_REGISTRY } from "@/pages/tools/registry";
import type { Tool } from "@/types/firestore";

const GRADIENTS = [
  "from-accent/20 via-accent/5 to-transparent",
  "from-accent-secondary/20 via-accent-secondary/5 to-transparent",
  "from-accent/10 via-accent-secondary/10 to-transparent",
];

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export default function ToolsIndexPage() {
  const [tools, setTools] = useState<Tool[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setError(null);
    try {
      const data = await getCollectionDocs<Tool>("tools", {
        where: [
          ["isDeleted", "==", false],
          ["isEnabled", "==", true],
        ],
      });
      data.sort((a, b) => a.order - b.order);
      setTools(data);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const liveTools = tools?.filter((t) => TOOL_REGISTRY[t.slug]) ?? [];
  const comingSoonTools = tools?.filter((t) => !TOOL_REGISTRY[t.slug]) ?? [];

  return (
    <div className="relative">
      <div className="pointer-events-none fixed inset-0 bg-mesh" aria-hidden="true" />
      <Container className="relative">
        <div className="py-10">
          <div className="mb-8 flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-accent to-accent-secondary text-background">
              <Wrench className="h-5 w-5" />
            </span>
            <div>
              <h1 className="font-heading text-page-title text-text">Tools</h1>
              <p className="text-small text-text-secondary">
                Interactive tools built for football fans - play, predict, build.
              </p>
            </div>
          </div>

          {error ? (
            <ErrorState description={error} onRetry={load} />
          ) : tools === null ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-40 w-full" />
              ))}
            </div>
          ) : tools.length === 0 ? (
            <EmptyState
              icon={<Wrench className="h-6 w-6" strokeWidth={1.5} />}
              title="No tools available yet."
            />
          ) : (
            <>
              <motion.div
                initial="hidden"
                animate="visible"
                variants={{ visible: { transition: { staggerChildren: 0.05 } } }}
                className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4"
              >
                {liveTools.map((tool, i) => {
                  const Icon = TOOL_ICONS[tool.iconName];
                  return (
                    <motion.div
                      key={tool.id}
                      variants={fadeUp}
                      transition={{ type: "spring", stiffness: 260, damping: 24 }}
                    >
                      <Link to={ROUTES.tool(tool.slug)} className="group block h-full">
                        <GlassCard
                          className={`h-full min-h-[168px] bg-gradient-to-br ${GRADIENTS[i % GRADIENTS.length]} p-5 flex flex-col justify-between transition-transform duration-card group-hover:-translate-y-1.5 group-hover:scale-[1.02]`}
                        >
                          <div className="flex items-start justify-between">
                            <span className="flex h-11 w-11 items-center justify-center rounded-button bg-white/10 text-accent transition-transform duration-button group-hover:scale-110">
                              {Icon && <Icon className="h-5 w-5" />}
                            </span>
                            <ArrowUpRight className="h-4 w-4 text-text-secondary opacity-0 transition-opacity duration-button group-hover:opacity-100" />
                          </div>
                          <div>
                            <p className="font-heading text-card-title text-text mb-1">
                              {tool.name}
                            </p>
                            <p className="text-caption text-text-secondary line-clamp-2">
                              {tool.description}
                            </p>
                          </div>
                        </GlassCard>
                      </Link>
                    </motion.div>
                  );
                })}
              </motion.div>

              {comingSoonTools.length > 0 && (
                <div className="mt-10">
                  <div className="mb-4 flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-accent" />
                    <h2 className="font-heading text-section-title text-text">Coming soon</h2>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                    {comingSoonTools.map((tool) => {
                      const Icon = TOOL_ICONS[tool.iconName];
                      return (
                        <GlassCard
                          key={tool.id}
                          className="p-5 flex flex-col justify-between opacity-60"
                        >
                          <div className="flex items-start justify-between">
                            <span className="flex h-11 w-11 items-center justify-center rounded-button bg-white/5 text-text-secondary">
                              {Icon && <Icon className="h-5 w-5" />}
                            </span>
                            <Badge>Soon</Badge>
                          </div>
                          <div>
                            <p className="font-heading text-card-title text-text mb-1">
                              {tool.name}
                            </p>
                            <p className="text-caption text-text-secondary line-clamp-2">
                              {tool.description}
                            </p>
                          </div>
                        </GlassCard>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </Container>
    </div>
  );
}
