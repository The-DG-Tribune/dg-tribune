import { useEffect, useState, type FormEvent } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Dropdown } from "@/components/ui/Dropdown";
import { Loader } from "@/components/ui/Loader";
import { ErrorState } from "@/components/ui/ErrorState";
import { ImageUploader } from "@/components/dashboard/ImageUploader";
import { useToast } from "@/context/ToastContext";
import { slugify } from "@/utils/slugify";
import { ROUTES } from "@/constants/routes";
import type { ContentStatus, League, Team } from "@/types/firestore";
import {
  createDocument,
  getCollectionDocs,
  getDocumentById,
  getDocumentBySlug,
  updateDocumentById,
} from "@/services/firebase/firestore";

const STATUS_OPTIONS: { label: string; value: ContentStatus }[] = [
  { label: "Draft", value: "draft" },
  { label: "Published", value: "published" },
];

export default function TeamEditor() {
  const { id } = useParams<{ id: string }>();
  const isEditMode = !!id;
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [isLoading, setIsLoading] = useState(isEditMode);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [leagues, setLeagues] = useState<League[]>([]);

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [leagueId, setLeagueId] = useState("");
  const [founded, setFounded] = useState("");
  const [stadium, setStadium] = useState("");
  const [bio, setBio] = useState("");
  const [status, setStatus] = useState<ContentStatus>("draft");

  useEffect(() => {
    (async () => {
      try {
        const leagueData = await getCollectionDocs<League>("leagues", {
          where: [["isDeleted", "==", false]],
        });
        setLeagues(leagueData);
      } catch {
        // Leagues module may not exist yet - non-fatal.
      }

      if (isEditMode && id) {
        try {
          const team = await getDocumentById<Team>("teams", id);
          if (!team) {
            setLoadError("This team couldn't be found.");
            return;
          }
          setName(team.name);
          setSlug(team.slug);
          setSlugManuallyEdited(true);
          setLogoUrl(team.logoUrl || null);
          setLeagueId(team.leagueId || "");
          setFounded(team.founded?.toString() || "");
          setStadium(team.stadium || "");
          setBio(team.bio || "");
          setStatus(team.status);
        } catch (err) {
          setLoadError((err as Error).message);
        }
      }
      setIsLoading(false);
    })();
  }, [id, isEditMode]);

  function handleNameChange(value: string) {
    setName(value);
    if (!slugManuallyEdited) setSlug(slugify(value));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setIsSaving(true);
    try {
      const payload = {
        name: name.trim(),
        slug: slug.trim() || slugify(name),
        logoUrl: logoUrl || "",
        leagueId: leagueId || null,
        founded: founded ? Number(founded) : null,
        stadium: stadium.trim(),
        bio: bio.trim(),
        status,
      };

      if (isEditMode && id) {
        await updateDocumentById("teams", id, payload);
        showToast("Team updated");
      } else {
        const existing = await getDocumentBySlug<Team>("teams", payload.slug);
        if (existing) {
          showToast(
            `A team with this slug already exists ("${existing.name}") - edit that one instead of creating a duplicate.`,
            "error"
          );
          setIsSaving(false);
          return;
        }
        await createDocument("teams", payload);
        showToast("Team added");
      }
      navigate(ROUTES.dashboardTeams);
    } catch (err) {
      showToast((err as Error).message, "error");
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader label="Loading team…" />
      </div>
    );
  }

  if (loadError) {
    return <ErrorState description={loadError} />;
  }

  return (
    <div className="max-w-3xl">
      <Link
        to={ROUTES.dashboardTeams}
        className="inline-flex items-center gap-1.5 text-small text-text-secondary hover:text-text mb-4 transition-colors duration-button"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Teams
      </Link>

      <Badge variant="accent" className="mb-3">
        Phase 6 · Teams
      </Badge>
      <h1 className="font-heading text-page-title text-text mb-6">
        {isEditMode ? "Edit Team" : "Add Team"}
      </h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="max-w-xs">
          <ImageUploader
            value={logoUrl}
            onChange={setLogoUrl}
            label="Logo"
            aspectClassName="aspect-square"
          />
        </div>

        <Input
          label="Team name"
          value={name}
          onChange={(e) => handleNameChange(e.target.value)}
          placeholder="e.g. Real Madrid"
          required
        />

        <Input
          label="URL slug"
          value={slug}
          onChange={(e) => {
            setSlug(slugify(e.target.value));
            setSlugManuallyEdited(true);
          }}
          hint={`dgtribune.com/team/${slug || "your-slug"}`}
          required
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <Dropdown
            label="League"
            value={leagueId}
            onChange={setLeagueId}
            placeholder={leagues.length === 0 ? "No leagues yet" : "Choose a league"}
            options={leagues.map((l) => ({ label: l.name, value: l.id }))}
          />
          <Input
            label="Founded year"
            type="number"
            value={founded}
            onChange={(e) => setFounded(e.target.value)}
            placeholder="e.g. 1902"
          />
          <Input
            label="Stadium"
            value={stadium}
            onChange={(e) => setStadium(e.target.value)}
            placeholder="e.g. Santiago Bernabéu"
          />
          <Dropdown
            label="Status"
            value={status}
            onChange={(v) => setStatus(v as ContentStatus)}
            options={STATUS_OPTIONS}
          />
        </div>

        <Textarea
          label="Bio"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="A short team history"
          rows={4}
        />

        <div className="flex items-center gap-3 pt-2">
          <Button type="submit" isLoading={isSaving}>
            {isEditMode ? "Save Changes" : "Add Team"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => navigate(ROUTES.dashboardTeams)}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
