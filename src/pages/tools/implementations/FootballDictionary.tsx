import { useMemo, useState } from "react";
import { SearchInput } from "@/components/ui/SearchInput";
import { EmptyState } from "@/components/ui/EmptyState";

const TERMS: { term: string; definition: string }[] = [
  { term: "Offside", definition: "An attacking player is offside if they're nearer the opponent's goal line than both the ball and the second-last defender when the ball is played to them." },
  { term: "Clean Sheet", definition: "When a team or goalkeeper finishes a match without conceding a goal." },
  { term: "Nutmeg", definition: "Passing or dribbling the ball through an opponent's legs." },
  { term: "Hat-trick", definition: "When a single player scores three goals in one match." },
  { term: "Derby", definition: "A match between two rival clubs, usually from the same city or region." },
  { term: "Clinical Finish", definition: "A precise, well-executed shot that results in a goal, usually with minimal backlift or hesitation." },
  { term: "Press", definition: "A defensive tactic where players aggressively close down opponents to win the ball back quickly, often high up the pitch." },
  { term: "Counter-Attack", definition: "A rapid attacking move launched immediately after winning the ball back, aiming to catch the opposition out of position." },
  { term: "Overlap", definition: "When a player runs around a teammate on the outside to receive the ball further forward, usually down the flank." },
  { term: "Through Ball", definition: "A pass played into the space behind the defensive line for a teammate to run onto." },
  { term: "Man of the Match", definition: "The award given to the standout player in a given fixture." },
  { term: "Set Piece", definition: "A rehearsed play from a dead-ball situation, such as a free kick, corner, or throw-in." },
  { term: "Clean Strike", definition: "A shot hit with good technique and full contact on the ball, usually resulting in power and accuracy." },
  { term: "Aggregate Score", definition: "The combined score across two legs of a tie in a two-match knockout format." },
  { term: "Loan Deal", definition: "A temporary transfer where a player moves to another club for an agreed period before returning to their parent club." },
  { term: "Relegation", definition: "When a team finishes low enough in the league table to be moved down to a lower division for the following season." },
  { term: "Promotion", definition: "When a team finishes high enough in the league table to move up to a higher division." },
  { term: "Clean Tackle", definition: "A tackle that wins the ball fairly, without fouling the opponent." },
  { term: "Box-to-Box Midfielder", definition: "A midfielder who contributes both defensively and offensively, covering large areas of the pitch." },
  { term: "False Nine", definition: "A forward who drops deep into midfield rather than staying high as a traditional striker, creating space for others." },
  { term: "Wing-back", definition: "A defender who also pushes forward to support attacks down the flank, common in formations with three center-backs." },
  { term: "Clean Sweep", definition: "Winning every available trophy or competition in a season." },
  { term: "Own Goal", definition: "When a player unintentionally scores a goal against their own team." },
  { term: "Extra Time", definition: "An additional 30 minutes played when a knockout match is level after normal time." },
  { term: "Golden Boot", definition: "The award given to the top goal-scorer in a competition or league season." },
  { term: "Squad Rotation", definition: "A manager's practice of regularly changing the starting lineup to manage player fitness and form." },
  { term: "Transfer Window", definition: "The designated period during a season when clubs can buy, sell, or loan players." },
  { term: "Bicycle Kick", definition: "An acrobatic shot where a player kicks the ball backward over their own head while airborne." },
  { term: "Dead Ball", definition: "Any situation where play restarts from a stationary ball, such as a free kick or corner." },
  { term: "Away Goals", definition: "A historic tiebreaker rule in two-legged ties where goals scored away from home counted double if aggregate scores were level (largely phased out in major competitions)." },
  { term: "VAR", definition: "Video Assistant Referee - an off-field official who reviews footage to help correct clear and obvious errors on key decisions like goals, penalties, and red cards." },
  { term: "Advantage", definition: "When a referee allows play to continue after a foul because the fouled team retains a beneficial position." },
  { term: "Sweeper", definition: "A defender positioned behind the main defensive line to 'sweep up' any balls that get through, common in older tactical systems." },
  { term: "Libero", definition: "Italian term for a sweeper - a free-roaming defender not tied to strict marking duties." },
  { term: "Tiki-Taka", definition: "A possession-based playing style built on short, quick passes and constant movement, popularized by Spain and Barcelona." },
  { term: "Gegenpressing", definition: "German for 'counter-pressing' - immediately pressuring opponents the instant possession is lost, to win the ball back high up the pitch." },
  { term: "Park the Bus", definition: "Slang for an extremely defensive setup where a team sits deep with numbers behind the ball to protect a result." },
  { term: "Target Man", definition: "A tall, physically strong forward used as a focal point for long balls and aerial duels." },
  { term: "Poacher", definition: "A striker who specializes in finishing chances inside the box rather than creating their own opportunities from deep." },
  { term: "Assist", definition: "The final pass or action that directly leads to a teammate scoring a goal." },
  { term: "Brace", definition: "When a player scores exactly two goals in a single match." },
  { term: "Red Card", definition: "Shown for a serious offense or two yellow cards in one match, resulting in the player's immediate ejection." },
  { term: "Yellow Card", definition: "A caution shown for a bookable offense; two in one match results in a red card and ejection." },
  { term: "Handball", definition: "An offense where a player deliberately (or, under some rules, accidentally in specific circumstances) touches the ball with their hand or arm." },
  { term: "Free Kick", definition: "A kick awarded after a foul, taken from the spot of the offense, either direct (can score straight in) or indirect." },
  { term: "Penalty Kick", definition: "A free shot on goal from the penalty spot, awarded for a foul committed inside the defending team's penalty area." },
  { term: "Corner Kick", definition: "A restart awarded to the attacking team when the ball goes out over the goal line off a defender." },
  { term: "Throw-in", definition: "A restart used when the ball crosses the sideline, where a player throws the ball back into play with both hands." },
  { term: "Injury Time", definition: "Additional time added to the end of each half to make up for stoppages during play, also called stoppage time." },
  { term: "Aggregate Winner", definition: "The team that advances after a two-legged tie based on combined goals across both matches." },
  { term: "Group Stage", definition: "The opening phase of many tournaments where teams are split into groups and play round-robin matches before knockout rounds." },
  { term: "Knockout Stage", definition: "The phase of a competition where a single loss (or aggregate loss) eliminates a team." },
  { term: "Playmaker", definition: "A creative midfielder responsible for dictating attacking play and creating chances for teammates." },
  { term: "Holding Midfielder", definition: "A defensively-minded midfielder positioned in front of the back line to shield the defense, also called a defensive midfielder or 'number six'." },
  { term: "Number 10", definition: "A creative attacking midfielder who operates just behind the striker, named for the shirt number traditionally worn in that role." },
  { term: "Full-back", definition: "A defender who plays on the left or right side of the back line, responsible for both defending the flank and supporting attacks." },
  { term: "Center-back", definition: "A defender positioned centrally in the back line, primarily focused on stopping opposition attackers and clearing danger." },
  { term: "Winger", definition: "An attacking player who operates in wide areas, using pace and dribbling to create chances or cut inside to shoot." },
  { term: "Striker", definition: "The most advanced attacking player, primarily responsible for scoring goals." },
  { term: "Goal Line Technology", definition: "A system using cameras or sensors to determine instantly whether the ball has fully crossed the goal line." },
  { term: "Offside Trap", definition: "A defensive tactic where the back line steps up in unison just before the ball is played, aiming to catch attackers offside." },
  { term: "Man-marking", definition: "A defensive approach where each defender is assigned to track a specific opposing player throughout the match." },
  { term: "Zonal Marking", definition: "A defensive approach where players are responsible for covering an area of the pitch rather than a specific opponent." },
  { term: "Formation", definition: "The tactical shape a team lines up in, described by the number of defenders, midfielders, and forwards (e.g. 4-3-3)." },
  { term: "Friendly", definition: "A non-competitive match played for practice, preparation, or exhibition purposes, with no impact on standings or titles." },
  { term: "Fixture Congestion", definition: "A period where a team must play an unusually high number of matches in a short span, increasing injury risk and requiring squad rotation." },
  { term: "Academy", definition: "A club's youth development system responsible for training young players and preparing them for the first team." },
  { term: "First Team", definition: "A club's senior, primary competitive squad, as opposed to reserve or youth teams." },
  { term: "Cap", definition: "An appearance for a national team; 'capped' players have represented their country at least once." },
  { term: "Friendly International", definition: "A non-competitive match between national teams, often used for squad experimentation ahead of major tournaments." },
  { term: "Wonderkid", definition: "Informal term for a highly promising young player tipped for a big future." },
  { term: "Talisman", definition: "A player considered central to their team's success, often relied upon in big moments." },
  { term: "Journeyman", definition: "A player who has played for many different clubs over their career, rather than staying long-term at one." },
  { term: "Rebuild", definition: "A period where a club overhauls its squad, often after relegation, poor form, or a change in ownership/management." },
  { term: "Squad Depth", definition: "The overall quality and number of capable players available across every position, beyond just the strongest starting XI." },
  { term: "Deadline Day", definition: "The final day of a transfer window, often marked by a flurry of last-minute deals before the market closes." },
  { term: "Release Clause", definition: "A pre-agreed fee written into a player's contract that, if met by another club, obligates the current club to sell." },
  { term: "Free Transfer", definition: "A move where a player joins a new club without a transfer fee, typically because their contract has expired." },
  { term: "Loanee", definition: "A player currently on loan at a club other than the one that holds their permanent registration." },
  { term: "Buyback Clause", definition: "A contractual clause allowing the selling club the right to re-sign a player later for a pre-agreed fee." },
  { term: "Squad Number", definition: "The fixed number assigned to a player for a season, displayed on their shirt, distinct from a temporary matchday number." },
  { term: "Captain's Armband", definition: "The armband worn by a team's designated captain, marking their on-field leadership role." },
  { term: "Bench", definition: "The substitute players and coaching staff seated pitch-side, available to be brought on during the match." },
  { term: "Super Sub", definition: "A substitute known for regularly making a significant impact after coming on, often scoring or assisting soon after entering." },
  { term: "Own Half", definition: "The half of the pitch closer to a team's own goal, as opposed to the attacking (opposition) half." },
  { term: "High Line", definition: "A defensive tactic where the back line plays far from their own goal to compress space and support pressing." },
];

export default function FootballDictionary() {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return TERMS.filter(
      (t) =>
        t.term.toLowerCase().includes(q) || t.definition.toLowerCase().includes(q)
    ).sort((a, b) => a.term.localeCompare(b.term));
  }, [search]);

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <SearchInput
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onClear={() => setSearch("")}
          placeholder="Search football terms…"
          className="flex-1"
        />
      </div>
      <p className="text-caption text-text-secondary mb-4">
        {filtered.length} of {TERMS.length} terms
      </p>

      {filtered.length === 0 ? (
        <EmptyState title="No terms match your search." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filtered.map((item) => (
            <div
              key={item.term}
              className="rounded-card border border-border bg-surface p-4"
            >
              <p className="font-heading text-card-title text-text mb-1">
                {item.term}
              </p>
              <p className="text-small text-text-secondary">{item.definition}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
