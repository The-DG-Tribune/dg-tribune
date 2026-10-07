import { useEffect, useState } from "react";
import { Shuffle, Swords } from "lucide-react";
import { Dropdown } from "@/components/ui/Dropdown";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/cards/Card";
import { Loader } from "@/components/ui/Loader";
import { EmptyState } from "@/components/ui/EmptyState";
import { getCollectionDocs } from "@/services/firebase/firestore";
import type { Team } from "@/types/firestore";

function randomGoals(): number {
  const weights = [0.25, 0.32, 0.24, 0.13, 0.06];
  const roll = Math.random();
  let cumulative = 0;
  for (let i = 0; i < weights.length; i++) {
    cumulative += weights[i];
    if (roll <= cumulative) return i;
  }
  return 0;
}

function TeamBadge({ team, label }: { team?: Team; label: string }) {
  return (
    <div className="flex flex-1 flex-col items-center gap-3">
      <div className="flex h-20 w-20 items-center justify-center rounded-card border border-border bg-surface p-3">
        {team?.logoUrl ? <img src={team.logoUrl} alt="" className="h-full w-full object-contain" /> : <Swords className="h-8 w-8 text-text-secondary" />}
      </div>
      <p className="text-small text-text text-center truncate w-full">{team?.name ?? label}</p>
    </div>
  );
}

export default function MatchPredictor() {
  const [teams, setTeams] = useState<Team[] | null>(null);
  const [homeId, setHomeId] = useState("");
  const [awayId, setAwayId] = useState("");
  const [result, setResult] = useState<{ home: number; away: number } | null>(null);
  const [userHomeGuess, setUserHomeGuess] = useState("");
  const [userAwayGuess, setUserAwayGuess] = useState("");
  const [guessLocked, setGuessLocked] = useState(false);

  useEffect(() => {
    (async () => {
      const data = await getCollectionDocs<Team>("teams", {
        where: [["isDeleted", "==", false], ["status", "==", "published"]],
      });
      data.sort((a, b) => a.name.localeCompare(b.name));
      setTeams(data);
    })();
  }, []);

  function simulate() {
    setResult({ home: randomGoals(), away: randomGoals() });
    setGuessLocked(true);
  }

  function reset() {
    setResult(null);
    setUserHomeGuess("");
    setUserAwayGuess("");
    setGuessLocked(false);
  }

  if (teams === null) {
    return <div className="flex justify-center py-16"><Loader label="Loading teams..." /></div>;
  }

  if (teams.length < 2) {
    return <EmptyState title="Not enough teams yet." description="Add at least 2 published teams in the CMS to simulate a match." />;
  }

  const homeTeam = teams.find((t) => t.id === homeId);
  const awayTeam = teams.find((t) => t.id === awayId);
  const options = teams.map((t) => ({ label: t.name, value: t.id }));

  const guessedRight = result && userHomeGuess !== "" && userAwayGuess !== "" && Number(userHomeGuess) === result.home && Number(userAwayGuess) === result.away;
  const guessedOutcome = result && userHomeGuess !== "" && userAwayGuess !== "" && Math.sign(Number(userHomeGuess) - Number(userAwayGuess)) === Math.sign(result.home - result.away);

  return (
    <div className="max-w-2xl mx-auto">
      <div className="grid grid-cols-2 gap-4 mb-6">
        <Dropdown label="Home team" value={homeId} onChange={(v) => { setHomeId(v); reset(); }} options={options} placeholder="Choose team" />
        <Dropdown label="Away team" value={awayId} onChange={(v) => { setAwayId(v); reset(); }} options={options} placeholder="Choose team" />
      </div>

      {homeId && awayId && homeId === awayId && <p className="text-small text-danger mb-4">Pick two different teams.</p>}

      <Card className="p-6 mb-4">
        <div className="flex items-center justify-center gap-6">
          <TeamBadge team={homeTeam} label="Home" />
          <div className="text-center shrink-0">
            <p className="font-heading text-hero text-text tabular-nums">{result ? `${result.home} - ${result.away}` : "vs"}</p>
          </div>
          <TeamBadge team={awayTeam} label="Away" />
        </div>
      </Card>

      {!guessLocked && homeId && awayId && homeId !== awayId && (
        <Card className="p-4 mb-4">
          <p className="text-small text-text-secondary mb-3 text-center">Fancy predicting the score yourself before simulating?</p>
          <div className="flex items-center justify-center gap-3">
            <input type="number" min={0} max={9} value={userHomeGuess} onChange={(e) => setUserHomeGuess(e.target.value)} className="h-12 w-16 rounded-input border border-border bg-surface text-center text-card-title text-text focus:outline-none focus:ring-2 focus:ring-accent" />
            <span className="text-text-secondary">-</span>
            <input type="number" min={0} max={9} value={userAwayGuess} onChange={(e) => setUserAwayGuess(e.target.value)} className="h-12 w-16 rounded-input border border-border bg-surface text-center text-card-title text-text focus:outline-none focus:ring-2 focus:ring-accent" />
          </div>
        </Card>
      )}

      {result && userHomeGuess !== "" && (
        <Card className="p-4 mb-4 text-center">
          <p className="text-small text-text">
            {guessedRight ? "Exact score! Nicely called." : guessedOutcome ? "You got the right result, just not the exact score." : "Not this time - simulate again?"}
          </p>
        </Card>
      )}

      <Button className="w-full" onClick={simulate} disabled={!homeId || !awayId || homeId === awayId}>
        <Shuffle className="h-4 w-4 mr-1.5" />
        {result ? "Simulate Again" : "Simulate Match"}
      </Button>
      <p className="mt-3 text-caption text-text-secondary text-center">Just for fun - a random simulation, not a real prediction.</p>
    </div>
  );
}
