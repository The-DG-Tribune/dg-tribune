import { lazy, type ComponentType } from "react";

export const TOOL_REGISTRY: Record<string, ComponentType> = {
  "dream-team-builder": lazy(() => import("@/pages/tools/implementations/DreamTeamBuilder")),
  "formation-builder": lazy(() => import("@/pages/tools/implementations/FormationBuilder")),
  "match-predictor": lazy(() => import("@/pages/tools/implementations/MatchPredictor")),
  "league-predictor": lazy(() => import("@/pages/tools/implementations/LeaguePredictor")),
  "football-dictionary": lazy(() => import("@/pages/tools/implementations/FootballDictionary")),
  "age-calculator": lazy(() => import("@/pages/tools/implementations/AgeCalculator")),
  "career-timeline": lazy(() => import("@/pages/tools/implementations/CareerTimeline")),
  "transfer-countdown": lazy(() => import("@/pages/tools/implementations/TransferCountdown")),
  "transfer-value-estimator": lazy(() => import("@/pages/tools/implementations/TransferValueEstimator")),
  "jersey-number-quiz": lazy(() => import("@/pages/tools/implementations/JerseyNumberQuiz")),
  "club-logo-quiz": lazy(() => import("@/pages/tools/implementations/ClubLogoQuiz")),
  "guess-the-player": lazy(() => import("@/pages/tools/implementations/GuessThePlayer")),
  "stadium-finder": lazy(() => import("@/pages/tools/implementations/StadiumFinder")),
  "football-trivia-rush": lazy(() => import("@/pages/tools/implementations/FootballTriviaRush")),
};
