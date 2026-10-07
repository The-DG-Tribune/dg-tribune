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
import type { ContentStatus, League } from "@/types/firestore";
import {
  createDocument,
  getDocumentById,
  getDocumentBySlug,
  updateDocumentById,
} from "@/services/firebase/firestore";

const STATUS_OPTIONS: { label: string; value: ContentStatus }[] = [
  { label: "Draft", value: "draft" },
  { label: "Published", value: "published" },
];

export default function LeagueEditor() {
  const { id } = useParams<{ id: string }>();
  const isEditMode = !!id;
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [isLoading, setIsLoading] = useState(isEditMode);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [country, setCountry] = useState("");
  const [bio, setBio] = useState("");
  const [status, setStatus] = useState<ContentStatus>("draft");

  useEffect(() => {
    if (!isEditMode || !id) return;
    (async () => {
      try {
        const league = await getDocumentById<League>("leagues", id);
        if (!league) {
          setLoadError("This league couldn't be found.");
          return;
        }
        setName(league.name);
        setSlug(league.slug);
        setSlugManuallyEdited(true);
        setLogoUrl(league.logoUrl || null);
        setCountry(league.country || "");
        setBio(league.bio || "");
        setStatus(league.status);
      } catch (err) {
        setLoadError((err as Error).message);
      } finally {
        setIsLoading(false);
      }
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
        country: country.trim(),
        bio: bio.trim(),
        status,
      };

      if (isEditMode && id) {
        await updateDocumentById("leagues", id, payload);
        showToast("League updated");
      } else {
        const existing = await getDocumentBySlug<League>("leagues", payload.slug);
        if (existing) {
          showToast(
            `A league with this slug already exists ("${existing.name}") - edit that one instead of creating a duplicate.`,
            "error"
          );
          setIsSaving(false);
          return;
        }
        await createDocument("leagues", payload);
        showToast("League added");
      }
      navigate(ROUTES.dashboardLeagues);
    } catch (err) {
      showToast((err as Error).message, "error");
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader label="Loading league…" />
      </div>
    );
  }

  if (loadError) {
    return <ErrorState description={loadError} />;
  }

  return (
    <div className="max-w-3xl">
      <Link
        to={ROUTES.dashboardLeagues}
        className="inline-flex items-center gap-1.5 text-small text-text-secondary hover:text-text mb-4 transition-colors duration-button"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Leagues
      </Link>

      <Badge variant="accent" className="mb-3">
        Phase 6 · Leagues
      </Badge>
      <h1 className="font-heading text-page-title text-text mb-6">
        {isEditMode ? "Edit League" : "Add League"}
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
          label="League name"
          value={name}
          onChange={(e) => handleNameChange(e.target.value)}
          placeholder="e.g. Premier League"
          required
        />

        <Input
          label="URL slug"
          value={slug}
          onChange={(e) => {
            setSlug(slugify(e.target.value));
            setSlugManuallyEdited(true);
          }}
          hint={`dgtribune.com/league/${slug || "your-slug"}`}
          required
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <Input
            label="Country"
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            placeholder="e.g. England"
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
          placeholder="A short league description"
          rows={4}
        />

        <div className="flex items-center gap-3 pt-2">
          <Button type="submit" isLoading={isSaving}>
            {isEditMode ? "Save Changes" : "Add League"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => navigate(ROUTES.dashboardLeagues)}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
