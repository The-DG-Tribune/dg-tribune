import { useMemo, useState } from "react";
import { RotateCcw, Sparkles, Trophy } from "lucide-react";
import { Dropdown } from "@/components/ui/Dropdown";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/cards/Card";
import { Badge } from "@/components/ui/Badge";

const POSITION_MULTIPLIER: Record<string, number> = { Forward: 1.3, Midfielder: 1.1, Defender: 0.9, Goalkeeper: 0.65 };
const LEAGUE_TIERS = [
  { label: "Top 5 European League", value: "top5", multiplier: 1.6 },
  { label: "Strong League (e.g. Portugal, Netherlands)", value: "strong", multiplier: 1.0 },
  { label: "Mid-tier League", value: "mid", multiplier: 0.55 },
  { label: "Developing League", value: "developing", multiplier: 0.3 },
];
const TIERS = [
  { max: 5_000_000, label: "Squad Player", color: "default" as const },
  { max: 20_000_000, label: "First-Team Regular", color: "info" as const },
  { max: 50_000_000, label: "Star Player", color: "accent" as const },
  { max: 100_000_000, label: "World Class", color: "warning" as const },
  { max: Infinity, label: "Superstar", color: "danger" as const },
];

function getTier(value: number) { return TIERS.find((t) => value <= t.max)!; }

interface EstimateInput { age: number; position: string; goals: number; assists: number; appearances: number; leagueTier: string; contractYears: number; }

function estimateValue({ age, position, goals, assists, appearances, leagueTier, contractYears }: EstimateInput) {
  const ageFactor = age <= 23 ? 1.4 : age <= 27 ? 1.15 : age <= 31 ? 0.85 : 0.5;
  const productionScore = (goals * 1.5 + assists) / Math.max(1, appearances);
  const leagueFactor = LEAGUE_TIERS.find((l) => l.value === leagueTier)?.multiplier ?? 1;
  const contractFactor = contractYears <= 1 ? 0.4 : contractYears === 2 ? 0.7 : contractYears === 3 ? 0.9 : 1.05;
  const base = 8_000_000;
  const raw = base * ageFactor * (POSITION_MULTIPLIER[position] ?? 1) * leagueFactor * contractFactor * (1 + productionScore);
  return Math.round(raw / 100_000) * 100_000;
}

function formatEuros(value: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(value);
}

function SliderField({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (v: number) => void }) {
  return (
    <div className="min-w-0">
      <div className="mb-2 flex items-center justify-between gap-2">
        <label className="text-small font-medium text-text truncate">{label}</label>
        <span className="shrink-0 text-small font-semibold text-accent tabular-nums">{value}</span>
      </div>
      <input type="range" min={min} max={max} value={value} onChange={(e) => onChange(Number(e.target.value))} className="w-full accent-accent" />
    </div>
  );
}

function generateRandomProfile(round: number): EstimateInput {
  const positions = Object.keys(POSITION_MULTIPLIER);
  const extremity = Math.min(round, 5);
  return {
    age: 17 + Math.floor(Math.random() * 20),
    position: positions[Math.floor(Math.random() * positions.length)],
    goals: Math.floor(Math.random() * (15 + extremity * 4)),
    assists: Math.floor(Math.random() * (10 + extremity * 2)),
    appearances: 10 + Math.floor(Math.random() * 30),
    leagueTier: LEAGUE_TIERS[Math.floor(Math.random() * LEAGUE_TIERS.length)].value,
    contractYears: 1 + Math.floor(Math.random() * 5),
  };
}

export default function TransferValueEstimator() {
  const [age, setAge] = useState(24);
  const [position, setPosition] = useState("Forward");
  const [goals, setGoals] = useState(10);
  const [assists, setAssists] = useState(5);
  const [appearances, setAppearances] = useState(30);
  const [leagueTier, setLeagueTier] = useState("top5");
  const [contractYears, setContractYears] = useState(3);
  const [isGuessMode, setIsGuessMode] = useState(false);
  const [round, setRound] = useState(1);
  const [totalAccuracy, setTotalAccuracy] = useState(0);
  const [bestAccuracy, setBestAccuracy] = useState(0);
  const [guessProfile, setGuessProfile] = useState(() => generateRandomProfile(1));
  const [guessValue, setGuessValue] = useState(20_000_000);
  const [hasRevealed, setHasRevealed] = useState(false);

  const estimate = useMemo(() => estimateValue({ age, position, goals, assists, appearances, leagueTier, contractYears }), [age, position, goals, assists, appearances, leagueTier, contractYears]);
  const tier = getTier(estimate);
  const actualGuessValue = useMemo(() => estimateValue(guessProfile), [guessProfile]);

  function accuracyFor(guess: number, actual: number) {
    return Math.max(0, 100 - (Math.abs(guess - actual) / actual) * 100);
  }

  function revealGuess() {
    setHasRevealed(true);
    setTotalAccuracy((prev) => prev + accuracyFor(guessValue, actualGuessValue));
  }

  function newGuessRound() {
    const acc = accuracyFor(guessValue, actualGuessValue);
    setBestAccuracy((b) => Math.max(b, acc));
    setRound((r) => r + 1);
    setGuessProfile(generateRandomProfile(round + 1));
    setGuessValue(20_000_000);
    setHasRevealed(false);
  }

  function restartGuessMode() {
    setRound(1);
    setTotalAccuracy(0);
    setBestAccuracy(0);
    setGuessProfile(generateRandomProfile(1));
    setGuessValue(20_000_000);
    setHasRevealed(false);
  }

  const averageAccuracy = round > 1 || hasRevealed ? Math.round(totalAccuracy / round) : 0;

  return (
    <div className="max-w-5xl">
      <div className="mb-6 flex gap-2 max-w-md">
        <button type="button" onClick={() => setIsGuessMode(false)} className={`flex-1 rounded-button border px-4 py-2 text-small font-medium transition-colors duration-button ${!isGuessMode ? "border-accent bg-accent/10 text-accent" : "border-border text-text-secondary"}`}>Estimate a Player</button>
        <button type="button" onClick={() => setIsGuessMode(true)} className={`flex-1 rounded-button border px-4 py-2 text-small font-medium transition-colors duration-button ${isGuessMode ? "border-accent bg-accent/10 text-accent" : "border-border text-text-secondary"}`}>Guess the Value</button>
      </div>

      {!isGuessMode ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-5 min-w-0">
            <SliderField label="Age" value={age} min={16} max={40} onChange={setAge} />
            <Dropdown label="Position" value={position} onChange={setPosition} options={Object.keys(POSITION_MULTIPLIER).map((p) => ({ label: p, value: p }))} />
            <Dropdown label="League level" value={leagueTier} onChange={setLeagueTier} options={LEAGUE_TIERS.map((l) => ({ label: l.label, value: l.value }))} />
            <SliderField label="Contract years remaining" value={contractYears} min={1} max={5} onChange={setContractYears} />
            <SliderField label="Goals (season)" value={goals} min={0} max={40} onChange={setGoals} />
            <SliderField label="Assists (season)" value={assists} min={0} max={30} onChange={setAssists} />
            <SliderField label="Appearances" value={appearances} min={1} max={50} onChange={setAppearances} />
          </div>
          <div className="min-w-0 space-y-4">
            <Card className="p-6 text-center">
              <p className="text-small text-text-secondary mb-2">Estimated value</p>
              <p className="font-heading text-hero text-accent mb-3 break-words">{formatEuros(estimate)}</p>
              <Badge variant={tier.color}>{tier.label}</Badge>
            </Card>
            <Card className="p-4">
              <p className="text-caption font-semibold text-text-secondary uppercase tracking-wide mb-3">What's driving this</p>
              <ul className="space-y-2 text-small text-text-secondary">
                <li>Age: {age <= 23 ? "Prime resale age, boosts value" : age <= 27 ? "Peak years" : age <= 31 ? "Established, some decline" : "Veteran, lower resale value"}</li>
                <li>League: {LEAGUE_TIERS.find((l) => l.value === leagueTier)?.label}</li>
                <li>Contract: {contractYears <= 1 ? "Expiring soon, cuts value sharply" : `${contractYears} years left, ${contractYears >= 4 ? "strong leverage" : "reasonable leverage"}`}</li>
              </ul>
            </Card>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="min-w-0">
            <div className="flex items-center justify-between mb-3">
              <p className="text-small text-text-secondary">Round {round}</p>
              {round > 1 && <p className="text-small text-text-secondary">Avg accuracy: <span className="text-accent font-semibold">{averageAccuracy}%</span></p>}
            </div>
            <p className="text-small text-text-secondary mb-4">A mystery player's profile below - drag the slider to guess their estimated value, then reveal. Profiles get trickier each round.</p>
            <Card className="p-4 mb-5">
              <div className="grid grid-cols-2 gap-3 text-small text-text">
                <p>Age: <span className="text-text-secondary">{guessProfile.age}</span></p>
                <p>Position: <span className="text-text-secondary">{guessProfile.position}</span></p>
                <p>Goals: <span className="text-text-secondary">{guessProfile.goals}</span></p>
                <p>Assists: <span className="text-text-secondary">{guessProfile.assists}</span></p>
                <p>Appearances: <span className="text-text-secondary">{guessProfile.appearances}</span></p>
                <p>Contract: <span className="text-text-secondary">{guessProfile.contractYears}y left</span></p>
                <p className="col-span-2">League: <span className="text-text-secondary">{LEAGUE_TIERS.find((l) => l.value === guessProfile.leagueTier)?.label}</span></p>
              </div>
            </Card>
            <SliderField label="Your guess" value={guessValue} min={1_000_000} max={200_000_000} onChange={setGuessValue} />
            <p className="text-center text-card-title font-heading text-text my-3 break-words">{formatEuros(guessValue)}</p>
            {!hasRevealed ? (
              <Button className="w-full" onClick={revealGuess}>Reveal Actual Value</Button>
            ) : (
              <Button className="w-full" variant="secondary" onClick={newGuessRound}><RotateCcw className="h-4 w-4 mr-1.5" />Next Player</Button>
            )}
          </div>
          <div className="min-w-0 space-y-4">
            {hasRevealed && (
              <Card className="p-6 text-center">
                <p className="text-small text-text-secondary mb-1">Actual value</p>
                <p className="font-heading text-card-title text-accent mb-2 break-words">{formatEuros(actualGuessValue)}</p>
                <p className="inline-flex items-center gap-1.5 text-small text-text"><Sparkles className="h-4 w-4 text-accent" />{Math.round(accuracyFor(guessValue, actualGuessValue))}% accurate</p>
              </Card>
            )}
            <Card className="p-4">
              <div className="flex items-center gap-2 mb-3"><Trophy className="h-4 w-4 text-warning" /><p className="text-caption font-semibold text-text-secondary uppercase tracking-wide">Your session</p></div>
              <div className="grid grid-cols-2 gap-4 text-center">
                <div><p className="font-heading text-card-title text-text">{round}</p><p className="text-caption text-text-secondary">Rounds played</p></div>
                <div><p className="font-heading text-card-title text-text">{Math.round(bestAccuracy)}%</p><p className="text-caption text-text-secondary">Best guess</p></div>
              </div>
              {round > 1 && <button type="button" onClick={restartGuessMode} className="mt-4 w-full text-caption text-text-secondary hover:text-text underline">Restart session</button>}
            </Card>
          </div>
        </div>
      )}
      <p className="mt-6 text-caption text-text-secondary text-center max-w-md mx-auto">A for-fun estimate modeled loosely on real factors (age curve, league quality, contract length) - not a real market valuation.</p>
    </div>
  );
}
