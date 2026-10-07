/**
 * Football-Data.org API service - Document 03 Football API Integration.
 * The ONLY place in the app that talks to the football data provider.
 * Every football page/component goes through here - never fetch this
 * API directly from a component.
 *
 * Auth: sends the token via the "X-Auth-Token" header, as required by
 * football-data.org's own onboarding email.
 *
 * Rate limiting: the free tier allows 10 requests/minute. We read the
 * "X-Requests-Available-Minute" response header (when present) and
 * throttle client-side rather than hammering the limiter, per the
 * provider's own guidance for API clients built with an LLM.
 */

const BASE_URL = "https://api.football-data.org/v4";
const TOKEN = import.meta.env.VITE_FOOTBALL_API_TOKEN;

const cache = new Map<string, { data: unknown; expiresAt: number }>();
const CACHE_TTL_MS = 60_000; // 60s - safe given the 10 req/min free-tier limit

let requestsAvailableThisMinute: number | null = null;

export class FootballApiError extends Error {}

async function request<T>(path: string): Promise<T> {
  const cached = cache.get(path);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data as T;
  }

  if (requestsAvailableThisMinute === 0) {
    throw new FootballApiError(
      "Live football data is briefly unavailable. Please try again in a moment."
    );
  }

  if (!TOKEN) {
    throw new FootballApiError("Football data isn't configured yet.");
  }

  let response: Response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      headers: { "X-Auth-Token": TOKEN },
    });
  } catch {
    // Covers network failure AND the API being CORS-blocked from the browser -
    // if this API doesn't allow browser calls, this request needs to move
    // behind a Netlify function at deploy time (Phase 14).
    throw new FootballApiError(
      "We couldn't reach live football data right now."
    );
  }

  const remaining = response.headers.get("X-Requests-Available-Minute");
  if (remaining !== null) {
    requestsAvailableThisMinute = Number(remaining);
    setTimeout(() => {
      requestsAvailableThisMinute = null;
    }, 60_000);
  }

  if (response.status === 429) {
    throw new FootballApiError(
      "Live football data is briefly unavailable. Please try again in a moment."
    );
  }

  if (!response.ok) {
    throw new FootballApiError(
      "We couldn't load live football data right now."
    );
  }

  const data = (await response.json()) as T;
  cache.set(path, { data, expiresAt: Date.now() + CACHE_TTL_MS });
  return data;
}

export interface Competition {
  id: number;
  name: string;
  code: string;
  emblem: string;
  area: { name: string; flag: string | null };
}

export async function getCompetitions(): Promise<Competition[]> {
  const data = await request<{ competitions: Competition[] }>(
    "/competitions"
  );
  return data.competitions;
}

export async function getCompetitionMatches(competitionCode: string) {
  return request(`/competitions/${competitionCode}/matches`);
}

export async function getCompetitionStandings(competitionCode: string) {
  return request(`/competitions/${competitionCode}/standings`);
}
