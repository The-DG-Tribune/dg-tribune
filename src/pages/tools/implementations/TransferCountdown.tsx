import { useEffect, useState } from "react";
import { Card } from "@/components/cards/Card";
import { Badge } from "@/components/ui/Badge";
import { Dropdown } from "@/components/ui/Dropdown";

interface LeagueWindow {
  label: string;
  summerOpen: Date;
  summerClose: Date;
  winterOpen: Date;
  winterClose: Date;
  winterConfirmed: boolean;
}

const LEAGUES: Record<string, LeagueWindow> = {
  "Premier League / EFL": {
    label: "Premier League / EFL",
    summerOpen: new Date(2026, 5, 15),
    summerClose: new Date(2026, 8, 1, 23, 0),
    winterOpen: new Date(2027, 0, 1),
    winterClose: new Date(2027, 1, 1, 23, 0),
    winterConfirmed: true,
  },
  "La Liga": {
    label: "La Liga",
    summerOpen: new Date(2026, 6, 1),
    summerClose: new Date(2026, 8, 1, 22, 59),
    winterOpen: new Date(2027, 0, 1),
    winterClose: new Date(2027, 1, 1),
    winterConfirmed: false,
  },
  Bundesliga: {
    label: "Bundesliga",
    summerOpen: new Date(2026, 6, 1),
    summerClose: new Date(2026, 7, 31, 19, 0),
    winterOpen: new Date(2027, 0, 1),
    winterClose: new Date(2027, 1, 1),
    winterConfirmed: false,
  },
  "Ligue 1": {
    label: "Ligue 1",
    summerOpen: new Date(2026, 6, 1),
    summerClose: new Date(2026, 7, 31, 19, 0),
    winterOpen: new Date(2027, 0, 1),
    winterClose: new Date(2027, 1, 1),
    winterConfirmed: false,
  },
  "Liga Portugal": {
    label: "Liga Portugal",
    summerOpen: new Date(2026, 6, 1),
    summerClose: new Date(2026, 8, 15),
    winterOpen: new Date(2027, 0, 1),
    winterClose: new Date(2027, 0, 31),
    winterConfirmed: false,
  },
  "Saudi Pro League": {
    label: "Saudi Pro League",
    summerOpen: new Date(2026, 6, 22),
    summerClose: new Date(2026, 9, 12),
    winterOpen: new Date(2027, 0, 1),
    winterClose: new Date(2027, 1, 1),
    winterConfirmed: false,
  },
};

function getNextEvent(league: LeagueWindow) {
  const now = Date.now();
  const events = [
    { label: "Summer window opens", date: league.summerOpen, confirmed: true },
    { label: "Summer window closes", date: league.summerClose, confirmed: true },
    { label: "Winter window opens", date: league.winterOpen, confirmed: league.winterConfirmed },
    { label: "Winter window closes", date: league.winterClose, confirmed: league.winterConfirmed },
  ];
  return events
    .filter((e) => e.date.getTime() > now)
    .sort((a, b) => a.date.getTime() - b.date.getTime())[0];
}

function getTimeRemaining(target: Date) {
  const diff = target.getTime() - Date.now();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  const seconds = Math.floor((diff / 1000) % 60);
  return { days, hours, minutes, seconds };
}

const LEAGUE_OPTIONS = Object.keys(LEAGUES).map((key) => ({ label: key, value: key }));

export default function TransferCountdown() {
  const [leagueKey, setLeagueKey] = useState("Premier League / EFL");
  const league = LEAGUES[leagueKey];
  const [nextEvent, setNextEvent] = useState(() => getNextEvent(league));
  const [remaining, setRemaining] = useState(() => getTimeRemaining(nextEvent.date));

  useEffect(() => {
    setNextEvent(getNextEvent(league));
  }, [league]);

  useEffect(() => {
    const interval = setInterval(() => {
      setRemaining(getTimeRemaining(nextEvent.date));
    }, 1000);
    return () => clearInterval(interval);
  }, [nextEvent]);

  const units = [
    { label: "Days", value: remaining.days },
    { label: "Hours", value: remaining.hours },
    { label: "Minutes", value: remaining.minutes },
    { label: "Seconds", value: remaining.seconds },
  ];

  return (
    <div className="max-w-md mx-auto">
      <Dropdown
        label="League"
        value={leagueKey}
        onChange={setLeagueKey}
        options={LEAGUE_OPTIONS}
        className="mb-4"
      />

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Badge variant="accent">{nextEvent.label}</Badge>
        <span className="text-small text-text-secondary truncate">
          {league.label}
        </span>
      </div>
      <Card className="p-6">
        <div className="grid grid-cols-4 gap-3 mb-4">
          {units.map((unit) => (
            <div key={unit.label} className="text-center">
              <p className="font-heading text-page-title text-text tabular-nums">
                {Math.max(0, unit.value)}
              </p>
              <p className="text-caption text-text-secondary">{unit.label}</p>
            </div>
          ))}
        </div>
        <p className="text-caption text-text-secondary text-center">
          {nextEvent.confirmed
            ? "Confirmed 2026 window dates."
            : "Winter 2026–27 dates aren't officially confirmed for this league yet - shown as a typical early-January to early-February estimate."}
        </p>
      </Card>
    </div>
  );
}
