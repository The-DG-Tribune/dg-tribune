import { useState } from "react";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/cards/Card";
import { Badge } from "@/components/ui/Badge";
import { Sparkles } from "lucide-react";

function calculateDetailedAge(dobStr: string) {
  const dob = new Date(dobStr);
  const now = new Date();
  if (Number.isNaN(dob.getTime()) || dob > now) return null;
  let years = now.getFullYear() - dob.getFullYear();
  let months = now.getMonth() - dob.getMonth();
  let days = now.getDate() - dob.getDate();
  if (days < 0) {
    months -= 1;
    const daysInPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0).getDate();
    days += daysInPrevMonth;
  }
  if (months < 0) { years -= 1; months += 12; }
  const totalDays = Math.floor((now.getTime() - dob.getTime()) / (1000 * 60 * 60 * 24));
  let nextBirthday = new Date(now.getFullYear(), dob.getMonth(), dob.getDate());
  if (nextBirthday.getTime() < now.getTime()) nextBirthday = new Date(now.getFullYear() + 1, dob.getMonth(), dob.getDate());
  const daysToNextBirthday = Math.ceil((nextBirthday.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return { years, months, days, totalDays, daysToNextBirthday };
}

function getEligibility(years: number): { label: string; variant: "accent" | "warning" | "default" }[] {
  const tags: { label: string; variant: "accent" | "warning" | "default" }[] = [];
  if (years < 15) tags.push({ label: "U15 eligible", variant: "accent" });
  else if (years < 17) tags.push({ label: "U17 eligible", variant: "accent" });
  else if (years < 19) tags.push({ label: "U19 eligible", variant: "accent" });
  else if (years < 21) tags.push({ label: "U21 eligible", variant: "accent" });
  else tags.push({ label: "Senior football (18+)", variant: "default" });
  if (years >= 33) tags.push({ label: "Veteran range (33+)", variant: "warning" });
  return tags;
}

function getAgeFacts(years: number): string[] {
  if (years <= 17) return ["Pelé won his first World Cup at 17, scoring twice in the 1958 final.", "Most academies place players in the U17 or U19 bracket at this age.", "Youth internationals typically debut for national age-group teams around now."];
  if (years <= 20) return ["Kylian Mbappé won his first World Cup at 19, scoring in the 2018 final.", "Many players sign their first professional contract in this age range.", "This is peak 'wonderkid' territory - breakout seasons often happen now."];
  if (years <= 23) return ["Most players hit their first full senior international call-up by this age.", "This is generally considered the start of a player's prime resale value years.", "Lamine Yamal became a World Cup winner and Ballon d'Or contender before turning 20."];
  if (years <= 27) return ["This is widely considered peak physical and footballing prime for outfield players.", "Most Ballon d'Or winners in history have lifted the award somewhere in this range.", "Transfer fees tend to peak for players in this bracket."];
  if (years <= 31) return ["Lionel Messi won his first World Cup at 35 - proof this stage is far from a decline.", "Many players move into more experienced, leadership-focused roles around now.", "Cristiano Ronaldo was still a Champions League top scorer well into his 30s."];
  return ["Zlatan Ibrahimović was still playing top-flight football into his 40s.", "Goalkeepers in particular often play into their late 30s or 40s.", "This stage is when many top players transition into coaching or ambassador roles."];
}

export default function AgeCalculator() {
  const [dob, setDob] = useState("");
  const result = dob ? calculateDetailedAge(dob) : null;
  const facts = result ? getAgeFacts(result.years) : [];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start max-w-4xl">
      <div className="lg:col-span-2 max-w-sm">
        <p className="text-small text-text-secondary mb-4">
          Enter a date of birth to see the exact age, current youth-eligibility bracket, and countdown to the next birthday - handy for checking academy/youth age-group qualification.
        </p>
        <Input label="Date of birth" type="date" value={dob} onChange={(e) => setDob(e.target.value)} max={new Date().toISOString().split("T")[0]} />
        {dob && !result && <p className="mt-4 text-small text-danger">Please enter a valid date of birth in the past.</p>}
        {result && (
          <Card className="mt-6 p-6 text-center">
            <p className="font-heading text-hero text-accent leading-none mb-2">{result.years}</p>
            <p className="text-body text-text-secondary mb-3">years old</p>
            <div className="flex flex-wrap justify-center gap-2 mb-4">
              {getEligibility(result.years).map((tag) => <Badge key={tag.label} variant={tag.variant}>{tag.label}</Badge>)}
            </div>
            <p className="text-small text-text mb-1">{result.years} years, {result.months} months, {result.days} days</p>
            <p className="text-caption text-text-secondary mb-3">({result.totalDays.toLocaleString()} days total)</p>
            <p className="text-caption text-text-secondary">{result.daysToNextBirthday} day{result.daysToNextBirthday !== 1 ? "s" : ""} until next birthday</p>
          </Card>
        )}
      </div>
      <div className="hidden lg:block">
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="h-4 w-4 text-accent" />
            <h3 className="text-small font-semibold text-text">At this age in football</h3>
          </div>
          {!result ? (
            <p className="text-small text-text-secondary">Enter a date of birth to see football milestones around that age.</p>
          ) : (
            <ul className="space-y-3">
              {facts.map((fact, i) => <li key={i} className="text-small text-text-secondary border-l-2 border-accent/40 pl-3">{fact}</li>)}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
