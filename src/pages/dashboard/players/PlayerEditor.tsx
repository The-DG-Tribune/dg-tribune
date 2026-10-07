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
import type { ContentStatus, Player, Team } from "@/types/firestore";
import {
  createDocument,
  getCollectionDocs,
  getDocumentById,
  updateDocumentById,
} from "@/services/firebase/firestore";

const POSITION_OPTIONS = [
  { label: "Goalkeeper", value: "Goalkeeper" },
  { label: "Defender", value: "Defender" },
  { label: "Midfielder", value: "Midfielder" },
  { label: "Forward", value: "Forward" },
];

const STATUS_OPTIONS: { label: string; value: ContentStatus }[] = [
  { label: "Draft", value: "draft" },
  { label: "Published", value: "published" },
];

export default function PlayerEditor() {
  const { id } = useParams<{ id: string }>();
  const isEditMode = !!id;
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [isLoading, setIsLoading] = useState(isEditMode);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [teams, setTeams] = useState<Team[]>([]);

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [position, setPosition] = useState("Forward");
  const [nationality, setNationality] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [currentTeamId, setCurrentTeamId] = useState("");
  const [jerseyNumber, setJerseyNumber] = useState("");
  const [bio, setBio] = useState("");
  const [appearances, setAppearances] = useState("0");
  const [goals, setGoals] = useState("0");
  const [assists, setAssists] = useState("0");
  const [cleanSheets, setCleanSheets] = useState("0");
  const [status, setStatus] = useState<ContentStatus>("draft");

  useEffect(() => {
    (async () => {
      try {
        const teamData = await getCollectionDocs<Team>("teams", {
          where: [["isDeleted", "==", false]],
        });
        setTeams(teamData);
      } catch {
        // Teams module may not exist yet - non-fatal, dropdown just stays empty.
      }

      if (isEditMode && id) {
        try {
          const player = await getDocumentById<Player>("players", id);
          if (!player) {
            setLoadError("This player couldn't be found.");
            return;
          }
          setName(player.name);
          setSlug(player.slug);
          setSlugManuallyEdited(true);
          setPhotoUrl(player.photoUrl || null);
          setPosition(player.position || "Forward");
          setNationality(player.nationality || "");
          setDateOfBirth(player.dateOfBirth || "");
          setCurrentTeamId(player.currentTeamId || "");
          setJerseyNumber(player.jerseyNumber?.toString() || "");
          setBio(player.bio || "");
          setAppearances((player.stats?.appearances ?? 0).toString());
          setGoals((player.stats?.goals ?? 0).toString());
          setAssists((player.stats?.assists ?? 0).toString());
          setCleanSheets((player.cleanSheets ?? 0).toString());
          setStatus(player.status);
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
        photoUrl: photoUrl || "",
        position,
        nationality: nationality.trim(),
        dateOfBirth,
        currentTeamId: currentTeamId || null,
        jerseyNumber: jerseyNumber ? Number(jerseyNumber) : null,
        bio: bio.trim(),
        stats: {
          appearances: Number(appearances) || 0,
          goals: Number(goals) || 0,
          assists: Number(assists) || 0,
        },
        cleanSheets: position === "Goalkeeper" ? Number(cleanSheets) || 0 : 0,
        status,
      };

      if (isEditMode && id) {
        await updateDocumentById("players", id, payload);
        showToast("Player updated");
      } else {
        await createDocument("players", payload);
        showToast("Player added");
      }
      navigate(ROUTES.dashboardPlayers);
    } catch (err) {
      showToast((err as Error).message, "error");
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-20">
        <Loader label="Loading player…" />
      </div>
    );
  }

  if (loadError) {
    return <ErrorState description={loadError} />;
  }

  return (
    <div className="max-w-3xl">
      <Link
        to={ROUTES.dashboardPlayers}
        className="inline-flex items-center gap-1.5 text-small text-text-secondary hover:text-text mb-4 transition-colors duration-button"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Players
      </Link>

      <Badge variant="accent" className="mb-3">
        Phase 6 · Players
      </Badge>
      <h1 className="font-heading text-page-title text-text mb-6">
        {isEditMode ? "Edit Player" : "Add Player"}
      </h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="max-w-xs">
          <ImageUploader
            value={photoUrl}
            onChange={setPhotoUrl}
            label="Photo"
            aspectClassName="aspect-square"
          />
        </div>

        <Input
          label="Full name"
          value={name}
          onChange={(e) => handleNameChange(e.target.value)}
          placeholder="e.g. Kylian Mbappé"
          required
        />

        <Input
          label="URL slug"
          value={slug}
          onChange={(e) => {
            setSlug(slugify(e.target.value));
            setSlugManuallyEdited(true);
          }}
          hint={`dgtribune.com/player/${slug || "your-slug"}`}
          required
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <Dropdown
            label="Position"
            value={position}
            onChange={setPosition}
            options={POSITION_OPTIONS}
          />
          <Input
            label="Jersey number"
            type="number"
            value={jerseyNumber}
            onChange={(e) => setJerseyNumber(e.target.value)}
            placeholder="e.g. 10"
          />
          <Input
            label="Nationality"
            value={nationality}
            onChange={(e) => setNationality(e.target.value)}
            placeholder="e.g. France"
          />
          <Input
            label="Date of birth"
            type="date"
            value={dateOfBirth}
            onChange={(e) => setDateOfBirth(e.target.value)}
          />
          <Dropdown
            label="Current team"
            value={currentTeamId}
            onChange={setCurrentTeamId}
            placeholder={
              teams.length === 0 ? "No teams yet" : "Choose a team"
            }
            options={teams.map((t) => ({ label: t.name, value: t.id }))}
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
          placeholder="A short player biography"
          rows={4}
        />

        <div>
          <p className="mb-2 text-small font-medium text-text">Season stats</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Input
              label="Appearances"
              type="number"
              value={appearances}
              onChange={(e) => setAppearances(e.target.value)}
            />
            <Input
              label="Goals"
              type="number"
              value={goals}
              onChange={(e) => setGoals(e.target.value)}
            />
            <Input
              label="Assists"
              type="number"
              value={assists}
              onChange={(e) => setAssists(e.target.value)}
            />
          </div>
          {position === "Goalkeeper" && (
            <div className="mt-4">
              <Input
                label="Clean sheets"
                type="number"
                value={cleanSheets}
                onChange={(e) => setCleanSheets(e.target.value)}
                hint="Goalkeeper-only stat - shown instead of goals/assists on their profile"
              />
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 pt-2">
          <Button type="submit" isLoading={isSaving}>
            {isEditMode ? "Save Changes" : "Add Player"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => navigate(ROUTES.dashboardPlayers)}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
