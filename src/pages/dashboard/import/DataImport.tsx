import { useState, type Dispatch, type SetStateAction } from "react";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { uploadImage, uploadImageFromUrl, type CloudinaryUploadResult } from "@/services/cloudinary/upload";
import {
  createDocument,
  getCollectionDocs,
  getDocumentBySlug,
  updateDocumentById,
} from "@/services/firebase/firestore";
import { slugify } from "@/utils/slugify";

/**
 * DATA IMPORT - a one-time admin tool, not a permanent CMS module.
 * Bulk-populates real leagues and teams. Images are sourced from
 * Wikipedia's public image API (each page's real, current lead
 * image) rather than a third-party logo API, since that's a stable,
 * verifiable source with no key required. Safe to re-run: skips
 * anything already imported (matched by slug).
 *
 * Not linked in the sidebar - reachable directly at /dashboard/import.
 */

interface LeagueSeed {
  name: string;
  country: string;
  wikiTitle: string;
}

interface TeamSeed {
  name: string;
  wikiTitle: string | string[];
  stadium: string;
  founded?: number;
  leagueName: string;
  /** Direct Wikimedia Commons filename fallback - used when a club's
   * Wikipedia page uses a Wikidata-sourced infobox image (common for
   * some football club articles), which the pageimages API genuinely
   * can't extract. Bypasses that entirely by requesting the file
   * directly via Special:FilePath instead of relying on the page's
   * own image algorithm. */
  commonsFile?: string;
}

const LEAGUES: LeagueSeed[] = [
  { name: "Premier League", country: "England", wikiTitle: "Premier_League" },
  { name: "La Liga", country: "Spain", wikiTitle: "La_Liga" },
  { name: "Bundesliga", country: "Germany", wikiTitle: "Bundesliga" },
  { name: "Serie A", country: "Italy", wikiTitle: "Serie_A" },
  { name: "Ligue 1", country: "France", wikiTitle: "Ligue_1" },
  { name: "Liga Portugal", country: "Portugal", wikiTitle: "Primeira_Liga" },
  { name: "Saudi Pro League", country: "Saudi Arabia", wikiTitle: "Saudi_Pro_League" },
];

const PREMIER_LEAGUE_TEAMS: TeamSeed[] = [
  { name: "Arsenal", wikiTitle: "Arsenal_F.C.", stadium: "Emirates Stadium", leagueName: "Premier League" },
  { name: "Aston Villa", wikiTitle: "Aston_Villa_F.C.", stadium: "Villa Park", leagueName: "Premier League" },
  { name: "AFC Bournemouth", wikiTitle: "AFC_Bournemouth", stadium: "Vitality Stadium", leagueName: "Premier League" },
  { name: "Brentford", wikiTitle: "Brentford_F.C.", stadium: "Gtech Community Stadium", leagueName: "Premier League" },
  { name: "Brighton & Hove Albion", wikiTitle: "Brighton_%26_Hove_Albion_F.C.", stadium: "Amex Stadium", leagueName: "Premier League" },
  { name: "Chelsea", wikiTitle: "Chelsea_F.C.", stadium: "Stamford Bridge", leagueName: "Premier League" },
  { name: "Coventry City", wikiTitle: "Coventry_City_F.C.", stadium: "Coventry Building Society Arena", leagueName: "Premier League" },
  { name: "Crystal Palace", wikiTitle: "Crystal_Palace_F.C.", stadium: "Selhurst Park", leagueName: "Premier League" },
  { name: "Everton", wikiTitle: "Everton_F.C.", stadium: "Hill Dickinson Stadium", leagueName: "Premier League" },
  { name: "Fulham", wikiTitle: "Fulham_F.C.", stadium: "Craven Cottage", leagueName: "Premier League" },
  { name: "Hull City", wikiTitle: "Hull_City_A.F.C.", stadium: "MKM Stadium", leagueName: "Premier League" },
  { name: "Ipswich Town", wikiTitle: "Ipswich_Town_F.C.", stadium: "Portman Road", leagueName: "Premier League" },
  { name: "Leeds United", wikiTitle: "Leeds_United_F.C.", stadium: "Elland Road", leagueName: "Premier League" },
  { name: "Liverpool", wikiTitle: "Liverpool_F.C.", stadium: "Anfield", leagueName: "Premier League" },
  { name: "Manchester City", wikiTitle: "Manchester_City_F.C.", stadium: "Etihad Stadium", leagueName: "Premier League" },
  { name: "Manchester United", wikiTitle: "Manchester_United_F.C.", stadium: "Old Trafford", leagueName: "Premier League" },
  { name: "Newcastle United", wikiTitle: "Newcastle_United_F.C.", stadium: "St James' Park", leagueName: "Premier League" },
  { name: "Nottingham Forest", wikiTitle: "Nottingham_Forest_F.C.", stadium: "City Ground", leagueName: "Premier League" },
  { name: "Sunderland", wikiTitle: "Sunderland_A.F.C.", stadium: "Stadium of Light", leagueName: "Premier League" },
  { name: "Tottenham Hotspur", wikiTitle: "Tottenham_Hotspur_F.C.", stadium: "Tottenham Hotspur Stadium", leagueName: "Premier League" },
];

const LA_LIGA_TEAMS: TeamSeed[] = [
  { name: "Real Madrid", wikiTitle: "Real_Madrid_CF", stadium: "Santiago Bernabéu", leagueName: "La Liga" },
  { name: "FC Barcelona", wikiTitle: "FC_Barcelona", stadium: "Camp Nou", leagueName: "La Liga" },
  { name: "Atlético Madrid", wikiTitle: "Atl%C3%A9tico_Madrid", stadium: "Riyadh Air Metropolitano", leagueName: "La Liga" },
  { name: "Athletic Bilbao", wikiTitle: "Athletic_Bilbao", stadium: "San Mamés", leagueName: "La Liga" },
  { name: "Villarreal CF", wikiTitle: "Villarreal_CF", stadium: "Estadio de la Cerámica", leagueName: "La Liga" },
  { name: "Real Betis", wikiTitle: "Real_Betis", stadium: "Estadio Benito Villamarín", leagueName: "La Liga" },
  { name: "Celta Vigo", wikiTitle: "RC_Celta_de_Vigo", stadium: "Estadio Abanca-Balaídos", leagueName: "La Liga" },
  { name: "Real Sociedad", wikiTitle: "Real_Sociedad", stadium: "Reale Arena", leagueName: "La Liga" },
  { name: "Rayo Vallecano", wikiTitle: "Rayo_Vallecano", stadium: "Estadio de Vallecas", leagueName: "La Liga" },
  { name: "CA Osasuna", wikiTitle: "CA_Osasuna", stadium: "El Sadar", leagueName: "La Liga" },
  { name: "Sevilla FC", wikiTitle: "Sevilla_FC", stadium: "Ramón Sánchez-Pizjuán", leagueName: "La Liga" },
  { name: "Getafe CF", wikiTitle: "Getafe_CF", stadium: "Coliseum Alfonso Pérez", leagueName: "La Liga" },
  { name: "Deportivo Alavés", wikiTitle: "Deportivo_Alav%C3%A9s", stadium: "Mendizorroza", leagueName: "La Liga" },
  { name: "RCD Espanyol", wikiTitle: "RCD_Espanyol", stadium: "RCDE Stadium", leagueName: "La Liga" },
  { name: "Valencia CF", wikiTitle: "Valencia_CF", stadium: "Mestalla", leagueName: "La Liga" },
  { name: "Levante UD", wikiTitle: "Levante_UD", stadium: "Ciutat de València", leagueName: "La Liga" },
  { name: "Elche CF", wikiTitle: ["Elche_CF", "Elche_Club_de_F%C3%BAtbol"], stadium: "Estadio Manuel Martínez Valero", leagueName: "La Liga" },
  { name: "Racing Santander", wikiTitle: "Racing_de_Santander", stadium: "El Sardinero", leagueName: "La Liga" },
  { name: "Deportivo La Coruña", wikiTitle: "Deportivo_de_La_Coru%C3%B1a", stadium: "Riazor", leagueName: "La Liga" },
];

interface PlayerSeed {
  name: string;
  wikiTitle: string | string[];
  position: "Goalkeeper" | "Defender" | "Midfielder" | "Forward";
  nationality: string;
  dateOfBirth: string;
  teamSlug: string;
  jerseyNumber: number | null;
  /** Real, verified 2025-26 season stats - only set where confirmed by
   * multiple sources, left undefined otherwise rather than guessed. */
  stats?: { appearances: number; goals: number; assists: number };
  /** Goalkeeper-only - real, verified clean sheet count. */
  cleanSheets?: number;
}

// Batch 1 - real, current (as of the 2026-27 season) marquee players
// across the clubs already imported. Not exhaustive squads - depth
// signings can be added in a later batch. Photos use each player's
// real Wikipedia lead image, requested at full resolution (not the
// small thumbnail) for a clean, high-quality result on player cards.
const PLAYERS_BATCH_1: PlayerSeed[] = [
  // Arsenal
  { name: "Bukayo Saka", wikiTitle: "Bukayo_Saka", position: "Forward", nationality: "England", dateOfBirth: "2001-09-05", teamSlug: "arsenal", jerseyNumber: 7 },
  { name: "Martin Ødegaard", wikiTitle: "Martin_%C3%98degaard", position: "Midfielder", nationality: "Norway", dateOfBirth: "1998-12-17", teamSlug: "arsenal", jerseyNumber: 8 },
  { name: "William Saliba", wikiTitle: "William_Saliba", position: "Defender", nationality: "France", dateOfBirth: "2001-03-24", teamSlug: "arsenal", jerseyNumber: 2 },
  { name: "David Raya", wikiTitle: "David_Raya", position: "Goalkeeper", nationality: "Spain", dateOfBirth: "1995-09-15", teamSlug: "arsenal", jerseyNumber: 1, stats: { appearances: 37, goals: 0, assists: 0 }, cleanSheets: 19 },
  { name: "Declan Rice", wikiTitle: "Declan_Rice", position: "Midfielder", nationality: "England", dateOfBirth: "1999-01-14", teamSlug: "arsenal", jerseyNumber: 41 },
  { name: "Viktor Gyökeres", wikiTitle: "Viktor_Gy%C3%B6keres", position: "Forward", nationality: "Sweden", dateOfBirth: "1998-06-04", teamSlug: "arsenal", jerseyNumber: 14 },
  // Liverpool
  { name: "Mohamed Salah", wikiTitle: "Mohamed_Salah", position: "Forward", nationality: "Egypt", dateOfBirth: "1992-06-15", teamSlug: "liverpool", jerseyNumber: 11 },
  { name: "Virgil van Dijk", wikiTitle: "Virgil_van_Dijk", position: "Defender", nationality: "Netherlands", dateOfBirth: "1991-07-08", teamSlug: "liverpool", jerseyNumber: 4 },
  { name: "Alisson", wikiTitle: "Alisson_(footballer)", position: "Goalkeeper", nationality: "Brazil", dateOfBirth: "1992-10-02", teamSlug: "liverpool", jerseyNumber: 1 },
  { name: "Alexander Isak", wikiTitle: "Alexander_Isak", position: "Forward", nationality: "Sweden", dateOfBirth: "1999-09-21", teamSlug: "liverpool", jerseyNumber: 9 },
  { name: "Dominik Szoboszlai", wikiTitle: "Dominik_Szoboszlai", position: "Midfielder", nationality: "Hungary", dateOfBirth: "2000-10-25", teamSlug: "liverpool", jerseyNumber: 8 },
  { name: "Florian Wirtz", wikiTitle: "Florian_Wirtz", position: "Midfielder", nationality: "Germany", dateOfBirth: "2003-05-03", teamSlug: "liverpool", jerseyNumber: 7 },
  // Manchester City
  { name: "Erling Haaland", wikiTitle: "Erling_Haaland", position: "Forward", nationality: "Norway", dateOfBirth: "2000-07-21", teamSlug: "manchester-city", jerseyNumber: 9, stats: { appearances: 35, goals: 27, assists: 8 } },
  { name: "Phil Foden", wikiTitle: "Phil_Foden", position: "Midfielder", nationality: "England", dateOfBirth: "2000-05-28", teamSlug: "manchester-city", jerseyNumber: 47 },
  { name: "Bernardo Silva", wikiTitle: "Bernardo_Silva", position: "Midfielder", nationality: "Portugal", dateOfBirth: "1994-08-10", teamSlug: "manchester-city", jerseyNumber: 20 },
  { name: "Ederson", wikiTitle: "Ederson_(footballer,_born_1993)", position: "Goalkeeper", nationality: "Brazil", dateOfBirth: "1993-08-17", teamSlug: "manchester-city", jerseyNumber: 31 },
  // Manchester United
  { name: "Bruno Fernandes", wikiTitle: "Bruno_Fernandes", position: "Midfielder", nationality: "Portugal", dateOfBirth: "1994-09-08", teamSlug: "manchester-united", jerseyNumber: 8 },
  { name: "Harry Maguire", wikiTitle: "Harry_Maguire", position: "Defender", nationality: "England", dateOfBirth: "1993-03-05", teamSlug: "manchester-united", jerseyNumber: 5 },
  { name: "André Onana", wikiTitle: "Andr%C3%A9_Onana", position: "Goalkeeper", nationality: "Cameroon", dateOfBirth: "1996-04-02", teamSlug: "manchester-united", jerseyNumber: 24 },
  // Chelsea
  { name: "Cole Palmer", wikiTitle: "Cole_Palmer", position: "Forward", nationality: "England", dateOfBirth: "2002-05-06", teamSlug: "chelsea", jerseyNumber: 10 },
  { name: "Enzo Fernández", wikiTitle: "Enzo_Fern%C3%A1ndez", position: "Midfielder", nationality: "Argentina", dateOfBirth: "2001-01-17", teamSlug: "chelsea", jerseyNumber: 8 },
  { name: "Robert Sánchez", wikiTitle: "Robert_S%C3%A1nchez", position: "Goalkeeper", nationality: "Spain", dateOfBirth: "1997-11-18", teamSlug: "chelsea", jerseyNumber: 1 },
  // Tottenham Hotspur
  { name: "James Maddison", wikiTitle: "James_Maddison", position: "Midfielder", nationality: "England", dateOfBirth: "1996-11-23", teamSlug: "tottenham-hotspur", jerseyNumber: 10 },
  { name: "Guglielmo Vicario", wikiTitle: "Guglielmo_Vicario", position: "Goalkeeper", nationality: "Italy", dateOfBirth: "1996-10-07", teamSlug: "tottenham-hotspur", jerseyNumber: 1 },
  { name: "Cristian Romero", wikiTitle: "Cristian_Romero", position: "Defender", nationality: "Argentina", dateOfBirth: "1998-04-27", teamSlug: "tottenham-hotspur", jerseyNumber: 17 },
  // Newcastle United
  { name: "Sandro Tonali", wikiTitle: "Sandro_Tonali", position: "Midfielder", nationality: "Italy", dateOfBirth: "2000-05-08", teamSlug: "newcastle-united", jerseyNumber: 8 },
  { name: "Nick Pope", wikiTitle: "Nick_Pope", position: "Goalkeeper", nationality: "England", dateOfBirth: "1992-04-19", teamSlug: "newcastle-united", jerseyNumber: 22 },
  { name: "Fabian Schär", wikiTitle: "Fabian_Sch%C3%A4r", position: "Defender", nationality: "Switzerland", dateOfBirth: "1991-12-20", teamSlug: "newcastle-united", jerseyNumber: 5 },
  // Aston Villa
  { name: "Emiliano Martínez", wikiTitle: "Emiliano_Mart%C3%ADnez", position: "Goalkeeper", nationality: "Argentina", dateOfBirth: "1992-09-02", teamSlug: "aston-villa", jerseyNumber: 1 },
  { name: "Ollie Watkins", wikiTitle: "Ollie_Watkins", position: "Forward", nationality: "England", dateOfBirth: "1995-12-30", teamSlug: "aston-villa", jerseyNumber: 11 },

  // Real Madrid
  { name: "Kylian Mbappé", wikiTitle: "Kylian_Mbapp%C3%A9", position: "Forward", nationality: "France", dateOfBirth: "1998-12-20", teamSlug: "real-madrid", jerseyNumber: 10 },
  { name: "Jude Bellingham", wikiTitle: "Jude_Bellingham", position: "Midfielder", nationality: "England", dateOfBirth: "2003-06-29", teamSlug: "real-madrid", jerseyNumber: 5 },
  { name: "Vinícius Júnior", wikiTitle: "Vin%C3%ADcius_J%C3%BAnior", position: "Forward", nationality: "Brazil", dateOfBirth: "2000-07-12", teamSlug: "real-madrid", jerseyNumber: 7 },
  { name: "Thibaut Courtois", wikiTitle: "Thibaut_Courtois", position: "Goalkeeper", nationality: "Belgium", dateOfBirth: "1992-05-11", teamSlug: "real-madrid", jerseyNumber: 1 },
  { name: "Éder Militão", wikiTitle: "%C3%89der_Milit%C3%A3o", position: "Defender", nationality: "Brazil", dateOfBirth: "1998-01-18", teamSlug: "real-madrid", jerseyNumber: 3 },
  // FC Barcelona
  { name: "Lamine Yamal", wikiTitle: "Lamine_Yamal", position: "Forward", nationality: "Spain", dateOfBirth: "2007-07-13", teamSlug: "fc-barcelona", jerseyNumber: 10 },
  { name: "Ferran Torres", wikiTitle: "Ferran_Torres", position: "Forward", nationality: "Spain", dateOfBirth: "2000-02-29", teamSlug: "fc-barcelona", jerseyNumber: 7 },
  { name: "Marc-André ter Stegen", wikiTitle: "Marc-Andr%C3%A9_ter_Stegen", position: "Goalkeeper", nationality: "Germany", dateOfBirth: "1992-04-30", teamSlug: "fc-barcelona", jerseyNumber: 1 },
  { name: "Pedri", wikiTitle: "Pedri", position: "Midfielder", nationality: "Spain", dateOfBirth: "2002-11-25", teamSlug: "fc-barcelona", jerseyNumber: 8 },
  { name: "Rodri", wikiTitle: "Rodri", position: "Midfielder", nationality: "Spain", dateOfBirth: "1996-06-22", teamSlug: "fc-barcelona", jerseyNumber: 22 },
  // Atlético Madrid
  { name: "Julián Álvarez", wikiTitle: "Juli%C3%A1n_%C3%81lvarez", position: "Forward", nationality: "Argentina", dateOfBirth: "2000-01-31", teamSlug: "atletico-madrid", jerseyNumber: 19 },
  { name: "Jan Oblak", wikiTitle: "Jan_Oblak", position: "Goalkeeper", nationality: "Slovenia", dateOfBirth: "1993-01-07", teamSlug: "atletico-madrid", jerseyNumber: 13 },
  { name: "Samu Aghehowa", wikiTitle: "Samu_Omorodion", position: "Forward", nationality: "Spain", dateOfBirth: "2004-06-04", teamSlug: "atletico-madrid", jerseyNumber: 9 },
  // Athletic Bilbao
  { name: "Nico Williams", wikiTitle: "Nico_Williams", position: "Forward", nationality: "Spain", dateOfBirth: "2002-07-12", teamSlug: "athletic-bilbao", jerseyNumber: 11 },

  // Bayern Munich
  { name: "Harry Kane", wikiTitle: "Harry_Kane", position: "Forward", nationality: "England", dateOfBirth: "1993-07-28", teamSlug: "bayern-munich", jerseyNumber: 9 },
  { name: "Jamal Musiala", wikiTitle: "Jamal_Musiala", position: "Midfielder", nationality: "Germany", dateOfBirth: "2003-02-26", teamSlug: "bayern-munich", jerseyNumber: 42 },
  { name: "Manuel Neuer", wikiTitle: "Manuel_Neuer", position: "Goalkeeper", nationality: "Germany", dateOfBirth: "1986-03-27", teamSlug: "bayern-munich", jerseyNumber: 1 },
  // Bayer Leverkusen
  { name: "Granit Xhaka", wikiTitle: "Granit_Xhaka", position: "Midfielder", nationality: "Switzerland", dateOfBirth: "1992-09-27", teamSlug: "bayer-leverkusen", jerseyNumber: 34 },
  { name: "Patrik Schick", wikiTitle: "Patrik_Schick", position: "Forward", nationality: "Czech Republic", dateOfBirth: "1996-01-24", teamSlug: "bayer-leverkusen", jerseyNumber: 14 },
  // Borussia Dortmund
  { name: "Julian Brandt", wikiTitle: "Julian_Brandt", position: "Midfielder", nationality: "Germany", dateOfBirth: "1996-05-02", teamSlug: "borussia-dortmund", jerseyNumber: 19 },
  { name: "Gregor Kobel", wikiTitle: "Gregor_Kobel", position: "Goalkeeper", nationality: "Switzerland", dateOfBirth: "1997-12-06", teamSlug: "borussia-dortmund", jerseyNumber: 1 },
  // RB Leipzig
  { name: "Xavi Simons", wikiTitle: "Xavi_Simons", position: "Midfielder", nationality: "Netherlands", dateOfBirth: "2003-04-21", teamSlug: "rb-leipzig", jerseyNumber: 7 },

  // Inter Milan
  { name: "Lautaro Martínez", wikiTitle: "Lautaro_Mart%C3%ADnez", position: "Forward", nationality: "Argentina", dateOfBirth: "1997-08-22", teamSlug: "inter-milan", jerseyNumber: 10 },
  { name: "Nicolò Barella", wikiTitle: "Nicol%C3%B2_Barella", position: "Midfielder", nationality: "Italy", dateOfBirth: "1997-02-07", teamSlug: "inter-milan", jerseyNumber: 23 },
  // Napoli
  { name: "Kevin De Bruyne", wikiTitle: "Kevin_De_Bruyne", position: "Midfielder", nationality: "Belgium", dateOfBirth: "1991-06-28", teamSlug: "napoli", jerseyNumber: 17 },
  { name: "Romelu Lukaku", wikiTitle: "Romelu_Lukaku", position: "Forward", nationality: "Belgium", dateOfBirth: "1993-05-13", teamSlug: "napoli", jerseyNumber: 11 },
  // AC Milan
  { name: "Rafael Leão", wikiTitle: "Rafael_Le%C3%A3o", position: "Forward", nationality: "Portugal", dateOfBirth: "1999-06-10", teamSlug: "ac-milan", jerseyNumber: 10 },
  { name: "Mike Maignan", wikiTitle: "Mike_Maignan", position: "Goalkeeper", nationality: "France", dateOfBirth: "1995-07-03", teamSlug: "ac-milan", jerseyNumber: 16 },
  // Juventus
  { name: "Dušan Vlahović", wikiTitle: "Du%C5%A1an_Vlahovi%C4%87", position: "Forward", nationality: "Serbia", dateOfBirth: "2000-01-28", teamSlug: "juventus", jerseyNumber: 9 },
  { name: "Kenan Yıldız", wikiTitle: "Kenan_Y%C4%B1ld%C4%B1z", position: "Forward", nationality: "Turkey", dateOfBirth: "2005-05-04", teamSlug: "juventus", jerseyNumber: 10 },
  // AS Roma
  { name: "Paulo Dybala", wikiTitle: "Paulo_Dybala", position: "Forward", nationality: "Argentina", dateOfBirth: "1993-11-15", teamSlug: "as-roma", jerseyNumber: 21 },

  // Paris Saint-Germain
  { name: "Ousmane Dembélé", wikiTitle: "Ousmane_Demb%C3%A9l%C3%A9", position: "Forward", nationality: "France", dateOfBirth: "1997-05-15", teamSlug: "paris-saint-germain", jerseyNumber: 10 },
  { name: "Achraf Hakimi", wikiTitle: "Achraf_Hakimi", position: "Defender", nationality: "Morocco", dateOfBirth: "1998-11-04", teamSlug: "paris-saint-germain", jerseyNumber: 2 },
  { name: "Vitinha", wikiTitle: "Vitinha_(footballer,_born_2000)", position: "Midfielder", nationality: "Portugal", dateOfBirth: "2000-02-13", teamSlug: "paris-saint-germain", jerseyNumber: 17 },
  // Marseille
  { name: "Mason Greenwood", wikiTitle: "Mason_Greenwood", position: "Forward", nationality: "England", dateOfBirth: "2001-10-01", teamSlug: "marseille", jerseyNumber: 9 },
  // Monaco
  { name: "Folarin Balogun", wikiTitle: "Folarin_Balogun", position: "Forward", nationality: "United States", dateOfBirth: "2001-07-03", teamSlug: "monaco", jerseyNumber: 24 },

  // Sporting CP
  { name: "Morten Hjulmand", wikiTitle: "Morten_Hjulmand", position: "Midfielder", nationality: "Denmark", dateOfBirth: "1999-06-25", teamSlug: "sporting-cp", jerseyNumber: 5 },
  // SL Benfica
  { name: "Alexander Bah", wikiTitle: "Alexander_Bah", position: "Defender", nationality: "Denmark", dateOfBirth: "1997-02-09", teamSlug: "sl-benfica", jerseyNumber: 27 },
  // FC Porto
  { name: "Pepe", wikiTitle: "Pepe_(footballer,_born_1983)", position: "Defender", nationality: "Portugal", dateOfBirth: "1983-02-26", teamSlug: "fc-porto", jerseyNumber: 3 },

  // Al-Nassr
  { name: "Cristiano Ronaldo", wikiTitle: "Cristiano_Ronaldo", position: "Forward", nationality: "Portugal", dateOfBirth: "1985-02-05", teamSlug: "al-nassr", jerseyNumber: 7 },
  { name: "Sadio Mané", wikiTitle: "Sadio_Man%C3%A9", position: "Forward", nationality: "Senegal", dateOfBirth: "1992-04-10", teamSlug: "al-nassr", jerseyNumber: 10 },
  // Al-Hilal
  { name: "Rúben Neves", wikiTitle: "Ru%C3%A9ben_Neves", position: "Midfielder", nationality: "Portugal", dateOfBirth: "1997-03-13", teamSlug: "al-hilal", jerseyNumber: 8 },
  { name: "Kalidou Koulibaly", wikiTitle: "Kalidou_Koulibaly", position: "Defender", nationality: "Senegal", dateOfBirth: "1991-06-13", teamSlug: "al-hilal", jerseyNumber: 26 },
  // Al-Ittihad
  { name: "N'Golo Kanté", wikiTitle: "N%27Golo_Kant%C3%A9", position: "Midfielder", nationality: "France", dateOfBirth: "1991-03-29", teamSlug: "al-ittihad", jerseyNumber: 7 },
  { name: "Karim Benzema", wikiTitle: "Karim_Benzema", position: "Forward", nationality: "France", dateOfBirth: "1987-12-19", teamSlug: "al-ittihad", jerseyNumber: 9 },
  // Al-Ahli
  { name: "Roberto Firmino", wikiTitle: "Roberto_Firmino", position: "Forward", nationality: "Brazil", dateOfBirth: "1991-10-02", teamSlug: "al-ahli", jerseyNumber: 9 },
  { name: "Riyad Mahrez", wikiTitle: "Riyad_Mahrez", position: "Midfielder", nationality: "Algeria", dateOfBirth: "1991-02-21", teamSlug: "al-ahli", jerseyNumber: 11 },
];

// Batch 2 - broadens coverage to clubs Batch 1 didn't touch yet,
// especially the remaining Premier League sides (all 20 clubs now
// have at least one player) plus more Serie A, Ligue 1 and Liga
// Portugal depth. Same real-data, real-photo approach as Batch 1.
const PLAYERS_BATCH_2: PlayerSeed[] = [
  // Remaining Premier League clubs
  { name: "Antoine Semenyo", wikiTitle: "Antoine_Semenyo", position: "Forward", nationality: "Ghana", dateOfBirth: "2000-01-07", teamSlug: "manchester-city", jerseyNumber: null },
  { name: "Nathan Collins", wikiTitle: "Nathan_Collins_(footballer)", position: "Defender", nationality: "Republic of Ireland", dateOfBirth: "2001-04-30", teamSlug: "brentford", jerseyNumber: 22 },
  { name: "Kaoru Mitoma", wikiTitle: "Kaoru_Mitoma", position: "Forward", nationality: "Japan", dateOfBirth: "1997-05-20", teamSlug: "brighton-hove-albion", jerseyNumber: 22 },
  { name: "Ben Sheaf", wikiTitle: "Ben_Sheaf", position: "Midfielder", nationality: "England", dateOfBirth: "1998-11-04", teamSlug: "coventry-city", jerseyNumber: 26 },
  { name: "Eberechi Eze", wikiTitle: "Eberechi_Eze", position: "Midfielder", nationality: "England", dateOfBirth: "1998-06-29", teamSlug: "crystal-palace", jerseyNumber: 10 },
  { name: "Jordan Pickford", wikiTitle: "Jordan_Pickford", position: "Goalkeeper", nationality: "England", dateOfBirth: "1994-03-07", teamSlug: "everton", jerseyNumber: 1 },
  { name: "Alex Iwobi", wikiTitle: "Alex_Iwobi", position: "Midfielder", nationality: "Nigeria", dateOfBirth: "1996-05-03", teamSlug: "fulham", jerseyNumber: 17 },
  { name: "Regan Slater", wikiTitle: "Regan_Slater", position: "Midfielder", nationality: "England", dateOfBirth: "2000-10-29", teamSlug: "hull-city", jerseyNumber: 8 },
  { name: "Sam Morsy", wikiTitle: "Sam_Morsy", position: "Midfielder", nationality: "Egypt", dateOfBirth: "1991-10-10", teamSlug: "ipswich-town", jerseyNumber: 5 },
  { name: "Joe Rodon", wikiTitle: "Joe_Rodon", position: "Defender", nationality: "Wales", dateOfBirth: "1997-10-22", teamSlug: "leeds-united", jerseyNumber: 6 },
  { name: "Morgan Gibbs-White", wikiTitle: "Morgan_Gibbs-White", position: "Midfielder", nationality: "England", dateOfBirth: "2000-01-27", teamSlug: "nottingham-forest", jerseyNumber: 10 },
  { name: "Alan Browne", wikiTitle: "Alan_Browne", position: "Midfielder", nationality: "Republic of Ireland", dateOfBirth: "1995-04-14", teamSlug: "sunderland", jerseyNumber: 8 },

  // More Serie A
  { name: "Ademola Lookman", wikiTitle: "Ademola_Lookman", position: "Forward", nationality: "Nigeria", dateOfBirth: "1997-10-20", teamSlug: "atalanta", jerseyNumber: 11 },
  { name: "Riccardo Orsolini", wikiTitle: "Riccardo_Orsolini", position: "Forward", nationality: "Italy", dateOfBirth: "1997-01-24", teamSlug: "bologna", jerseyNumber: 7 },
  { name: "Moise Kean", wikiTitle: "Moise_Kean", position: "Forward", nationality: "Italy", dateOfBirth: "2000-02-28", teamSlug: "fiorentina", jerseyNumber: 20 },
  { name: "Mattia Zaccagni", wikiTitle: "Mattia_Zaccagni", position: "Midfielder", nationality: "Italy", dateOfBirth: "1995-06-16", teamSlug: "lazio", jerseyNumber: 10 },
  { name: "Ché Adams", wikiTitle: "Ch%C3%A9_Adams", position: "Forward", nationality: "Scotland", dateOfBirth: "1996-07-13", teamSlug: "torino", jerseyNumber: 9 },
  { name: "Jaka Bijol", wikiTitle: "Jaka_Bijol", position: "Defender", nationality: "Slovenia", dateOfBirth: "1999-02-05", teamSlug: "udinese", jerseyNumber: 5 },
  { name: "Morten Frendrup", wikiTitle: "Morten_Frendrup", position: "Midfielder", nationality: "Denmark", dateOfBirth: "2001-05-30", teamSlug: "genoa", jerseyNumber: 20 },
  { name: "Yerry Mina", wikiTitle: "Yerry_Mina", position: "Defender", nationality: "Colombia", dateOfBirth: "1994-09-23", teamSlug: "cagliari", jerseyNumber: 23 },
  { name: "Adrián Bernabé", wikiTitle: "Adri%C3%A1n_Bernab%C3%A9", position: "Midfielder", nationality: "Spain", dateOfBirth: "2001-01-27", teamSlug: "parma", jerseyNumber: 32 },
  { name: "Antonino Gallo", wikiTitle: "Antonino_Gallo", position: "Defender", nationality: "Italy", dateOfBirth: "1998-08-01", teamSlug: "lecce", jerseyNumber: 27 },
  { name: "Domenico Berardi", wikiTitle: "Domenico_Berardi", position: "Forward", nationality: "Italy", dateOfBirth: "1994-08-01", teamSlug: "sassuolo", jerseyNumber: 10 },

  // More Ligue 1
  { name: "Benjamin André", wikiTitle: "Benjamin_Andr%C3%A9", position: "Midfielder", nationality: "France", dateOfBirth: "1990-08-06", teamSlug: "lille", jerseyNumber: 6 },
  { name: "Alexandre Lacazette", wikiTitle: "Alexandre_Lacazette", position: "Forward", nationality: "France", dateOfBirth: "1991-05-28", teamSlug: "lyon", jerseyNumber: 10 },
  { name: "Terem Moffi", wikiTitle: "Terem_Moffi", position: "Forward", nationality: "Nigeria", dateOfBirth: "1999-05-14", teamSlug: "nice", jerseyNumber: 9 },
  { name: "Facundo Medina", wikiTitle: "Facundo_Medina", position: "Defender", nationality: "Argentina", dateOfBirth: "1999-03-28", teamSlug: "rc-lens", jerseyNumber: 4 },
  { name: "Emanuel Emegha", wikiTitle: "Emanuel_Emegha", position: "Forward", nationality: "Netherlands", dateOfBirth: "2003-11-03", teamSlug: "strasbourg", jerseyNumber: 9 },
  { name: "Aron Dønnum", wikiTitle: "Aron_D%C3%B8nnum", position: "Midfielder", nationality: "Norway", dateOfBirth: "1997-01-27", teamSlug: "toulouse", jerseyNumber: 11 },
  { name: "Pierre Lees-Melou", wikiTitle: "Pierre_Lees-Melou", position: "Midfielder", nationality: "France", dateOfBirth: "1993-06-05", teamSlug: "stade-brestois", jerseyNumber: 6 },
  { name: "Lassine Sinayoko", wikiTitle: "Lassine_Sinayoko", position: "Forward", nationality: "Mali", dateOfBirth: "1999-08-14", teamSlug: "aj-auxerre", jerseyNumber: 27 },

  // More Liga Portugal
  { name: "Ricardo Horta", wikiTitle: "Ricardo_Horta", position: "Forward", nationality: "Portugal", dateOfBirth: "1994-10-15", teamSlug: "sc-braga", jerseyNumber: 7 },
];

// Batch 3 - fleshes out full squads (rather than one star per club) for
// six of the biggest clubs already in the database: Arsenal, Liverpool,
// Manchester City, Real Madrid, Barcelona and Bayern Munich. Same real
// data, real full-resolution photo approach as Batches 1 and 2.
const PLAYERS_BATCH_3: PlayerSeed[] = [
  // Arsenal (adds to Saka, Ødegaard, Saliba, Raya, Rice, Gyökeres)
  { name: "Gabriel Magalhães", wikiTitle: "Gabriel_Magalh%C3%A3es", position: "Defender", nationality: "Brazil", dateOfBirth: "1997-12-19", teamSlug: "arsenal", jerseyNumber: 6 },
  { name: "Ben White", wikiTitle: "Ben_White_(footballer)", position: "Defender", nationality: "England", dateOfBirth: "1997-10-08", teamSlug: "arsenal", jerseyNumber: 4 },
  { name: "Jurriën Timber", wikiTitle: "Jurri%C3%ABn_Timber", position: "Defender", nationality: "Netherlands", dateOfBirth: "2001-06-17", teamSlug: "arsenal", jerseyNumber: 12 },
  { name: "Riccardo Calafiori", wikiTitle: "Riccardo_Calafiori", position: "Defender", nationality: "Italy", dateOfBirth: "2002-05-19", teamSlug: "arsenal", jerseyNumber: 33 },
  { name: "Mikel Merino", wikiTitle: "Mikel_Merino", position: "Midfielder", nationality: "Spain", dateOfBirth: "1996-06-22", teamSlug: "arsenal", jerseyNumber: 23 },
  { name: "Kai Havertz", wikiTitle: "Kai_Havertz", position: "Forward", nationality: "Germany", dateOfBirth: "1999-06-11", teamSlug: "arsenal", jerseyNumber: 29 },
  { name: "Gabriel Jesus", wikiTitle: "Gabriel_Jesus", position: "Forward", nationality: "Brazil", dateOfBirth: "1997-04-03", teamSlug: "arsenal", jerseyNumber: 9 },
  { name: "Martín Zubimendi", wikiTitle: "Mart%C3%ADn_Zubimendi", position: "Midfielder", nationality: "Spain", dateOfBirth: "1999-02-02", teamSlug: "arsenal", jerseyNumber: 36 },
  { name: "Christian Nørgaard", wikiTitle: "Christian_N%C3%B8rgaard", position: "Midfielder", nationality: "Denmark", dateOfBirth: "1994-03-10", teamSlug: "arsenal", jerseyNumber: 15 },

  // Liverpool (adds to Salah, van Dijk, Alisson, Isak, Szoboszlai, Wirtz)
  { name: "Andrew Robertson", wikiTitle: "Andrew_Robertson_(footballer)", position: "Defender", nationality: "Scotland", dateOfBirth: "1994-03-11", teamSlug: "liverpool", jerseyNumber: 26 },
  { name: "Ibrahima Konaté", wikiTitle: "Ibrahima_Konat%C3%A9", position: "Defender", nationality: "France", dateOfBirth: "1999-05-25", teamSlug: "liverpool", jerseyNumber: 5 },
  { name: "Ryan Gravenberch", wikiTitle: "Ryan_Gravenberch", position: "Midfielder", nationality: "Netherlands", dateOfBirth: "2002-05-16", teamSlug: "liverpool", jerseyNumber: 38 },
  { name: "Curtis Jones", wikiTitle: "Curtis_Jones", position: "Midfielder", nationality: "England", dateOfBirth: "2001-01-30", teamSlug: "liverpool", jerseyNumber: 17 },
  { name: "Cody Gakpo", wikiTitle: "Cody_Gakpo", position: "Forward", nationality: "Netherlands", dateOfBirth: "1999-05-07", teamSlug: "liverpool", jerseyNumber: 18 },
  { name: "Jeremie Frimpong", wikiTitle: "Jeremie_Frimpong", position: "Defender", nationality: "Netherlands", dateOfBirth: "2000-08-10", teamSlug: "liverpool", jerseyNumber: 30 },
  { name: "Milos Kerkez", wikiTitle: "Milos_Kerkez", position: "Defender", nationality: "Hungary", dateOfBirth: "2003-11-07", teamSlug: "liverpool", jerseyNumber: 21 },
  { name: "Giorgi Mamardashvili", wikiTitle: "Giorgi_Mamardashvili", position: "Goalkeeper", nationality: "Georgia", dateOfBirth: "2000-09-29", teamSlug: "liverpool", jerseyNumber: 25 },

  // Manchester City (adds to Haaland, Foden, Bernardo Silva, Ederson)
  { name: "Rúben Dias", wikiTitle: "R%C3%BAben_Dias", position: "Defender", nationality: "Portugal", dateOfBirth: "1997-05-14", teamSlug: "manchester-city", jerseyNumber: 3 },
  { name: "Joško Gvardiol", wikiTitle: "Jo%C5%A1ko_Gvardiol", position: "Defender", nationality: "Croatia", dateOfBirth: "2002-01-23", teamSlug: "manchester-city", jerseyNumber: 24 },
  { name: "Nathan Aké", wikiTitle: "Nathan_Ak%C3%A9", position: "Defender", nationality: "Netherlands", dateOfBirth: "1995-02-18", teamSlug: "manchester-city", jerseyNumber: 6 },
  { name: "İlkay Gündoğan", wikiTitle: "%C4%B0lkay_G%C3%BCndo%C4%9Fan", position: "Midfielder", nationality: "Germany", dateOfBirth: "1990-10-24", teamSlug: "manchester-city", jerseyNumber: 19 },
  { name: "Mateo Kovačić", wikiTitle: "Mateo_Kova%C4%8Di%C4%87", position: "Midfielder", nationality: "Croatia", dateOfBirth: "1994-05-06", teamSlug: "manchester-city", jerseyNumber: 8 },
  { name: "Savinho", wikiTitle: "Savinho", position: "Forward", nationality: "Brazil", dateOfBirth: "2004-04-10", teamSlug: "manchester-city", jerseyNumber: 26 },
  { name: "Omar Marmoush", wikiTitle: "Omar_Marmoush", position: "Forward", nationality: "Egypt", dateOfBirth: "1999-02-07", teamSlug: "manchester-city", jerseyNumber: 7 },
  { name: "Rayan Cherki", wikiTitle: "Rayan_Cherki", position: "Midfielder", nationality: "France", dateOfBirth: "2003-08-17", teamSlug: "manchester-city", jerseyNumber: 10 },
  { name: "Tijjani Reijnders", wikiTitle: "Tijjani_Reijnders", position: "Midfielder", nationality: "Netherlands", dateOfBirth: "2001-07-29", teamSlug: "manchester-city", jerseyNumber: 21 },

  // Real Madrid (adds to Mbappé, Bellingham, Vinícius, Courtois, Militão)
  { name: "Federico Valverde", wikiTitle: "Federico_Valverde", position: "Midfielder", nationality: "Uruguay", dateOfBirth: "1998-07-22", teamSlug: "real-madrid", jerseyNumber: 15 },
  { name: "Aurélien Tchouaméni", wikiTitle: "Aur%C3%A9lien_Tchouam%C3%A9ni", position: "Midfielder", nationality: "France", dateOfBirth: "2000-01-27", teamSlug: "real-madrid", jerseyNumber: 18 },
  { name: "Eduardo Camavinga", wikiTitle: "Eduardo_Camavinga", position: "Midfielder", nationality: "France", dateOfBirth: "2002-11-10", teamSlug: "real-madrid", jerseyNumber: 6 },
  { name: "Dani Carvajal", wikiTitle: "Dani_Carvajal", position: "Defender", nationality: "Spain", dateOfBirth: "1992-01-11", teamSlug: "real-madrid", jerseyNumber: 2 },
  { name: "Antonio Rüdiger", wikiTitle: "Antonio_R%C3%BCdiger", position: "Defender", nationality: "Germany", dateOfBirth: "1993-03-03", teamSlug: "real-madrid", jerseyNumber: 22 },
  { name: "Trent Alexander-Arnold", wikiTitle: "Trent_Alexander-Arnold", position: "Defender", nationality: "England", dateOfBirth: "1998-10-07", teamSlug: "real-madrid", jerseyNumber: 12 },
  { name: "Arda Güler", wikiTitle: "Arda_G%C3%BCler", position: "Midfielder", nationality: "Turkey", dateOfBirth: "2005-02-25", teamSlug: "real-madrid", jerseyNumber: 24 },
  { name: "Endrick", wikiTitle: "Endrick_(footballer,_born_2006)", position: "Forward", nationality: "Brazil", dateOfBirth: "2006-07-21", teamSlug: "real-madrid", jerseyNumber: 16 },
  { name: "Franco Mastantuono", wikiTitle: "Franco_Mastantuono", position: "Midfielder", nationality: "Argentina", dateOfBirth: "2007-08-14", teamSlug: "real-madrid", jerseyNumber: 30 },

  // FC Barcelona (adds to Yamal, Ferran Torres, ter Stegen, Pedri, Rodri)
  { name: "Frenkie de Jong", wikiTitle: "Frenkie_de_Jong", position: "Midfielder", nationality: "Netherlands", dateOfBirth: "1997-05-12", teamSlug: "fc-barcelona", jerseyNumber: 21 },
  { name: "Gavi", wikiTitle: "Gavi", position: "Midfielder", nationality: "Spain", dateOfBirth: "2004-08-05", teamSlug: "fc-barcelona", jerseyNumber: 6 },
  { name: "Raphinha", wikiTitle: "Raphinha", position: "Forward", nationality: "Brazil", dateOfBirth: "1996-12-14", teamSlug: "fc-barcelona", jerseyNumber: 11 },
  { name: "Jules Koundé", wikiTitle: "Jules_Kound%C3%A9", position: "Defender", nationality: "France", dateOfBirth: "1998-11-12", teamSlug: "fc-barcelona", jerseyNumber: 23 },
  { name: "Pau Cubarsí", wikiTitle: "Pau_Cubars%C3%AD", position: "Defender", nationality: "Spain", dateOfBirth: "2007-01-22", teamSlug: "fc-barcelona", jerseyNumber: 2 },
  { name: "Alejandro Balde", wikiTitle: "Alejandro_Balde", position: "Defender", nationality: "Spain", dateOfBirth: "2003-10-18", teamSlug: "fc-barcelona", jerseyNumber: 3 },
  { name: "Marc Casadó", wikiTitle: "Marc_Casad%C3%B3", position: "Midfielder", nationality: "Spain", dateOfBirth: "2003-09-14", teamSlug: "fc-barcelona", jerseyNumber: 17 },
  { name: "Dani Olmo", wikiTitle: "Dani_Olmo", position: "Midfielder", nationality: "Spain", dateOfBirth: "1998-05-07", teamSlug: "fc-barcelona", jerseyNumber: 20 },

  // Bayern Munich (adds to Kane, Musiala, Neuer)
  { name: "Alphonso Davies", wikiTitle: "Alphonso_Davies", position: "Defender", nationality: "Canada", dateOfBirth: "2000-11-02", teamSlug: "bayern-munich", jerseyNumber: 19 },
  { name: "Dayot Upamecano", wikiTitle: "Dayot_Upamecano", position: "Defender", nationality: "France", dateOfBirth: "1998-10-27", teamSlug: "bayern-munich", jerseyNumber: 2 },
  { name: "Joshua Kimmich", wikiTitle: "Joshua_Kimmich", position: "Midfielder", nationality: "Germany", dateOfBirth: "1995-02-08", teamSlug: "bayern-munich", jerseyNumber: 6 },
  { name: "Serge Gnabry", wikiTitle: "Serge_Gnabry", position: "Forward", nationality: "Germany", dateOfBirth: "1995-07-14", teamSlug: "bayern-munich", jerseyNumber: 7 },
  { name: "Michael Olise", wikiTitle: "Michael_Olise", position: "Forward", nationality: "France", dateOfBirth: "2001-12-12", teamSlug: "bayern-munich", jerseyNumber: 17 },
  { name: "Konrad Laimer", wikiTitle: "Konrad_Laimer", position: "Midfielder", nationality: "Austria", dateOfBirth: "1997-05-04", teamSlug: "bayern-munich", jerseyNumber: 27 },
  { name: "Min-jae Kim", wikiTitle: "Kim_Min-jae_(footballer)", position: "Defender", nationality: "South Korea", dateOfBirth: "1996-11-15", teamSlug: "bayern-munich", jerseyNumber: 3 },
  { name: "Aleksandar Pavlović", wikiTitle: "Aleksandar_Pavlovi%C4%87", position: "Midfielder", nationality: "Germany", dateOfBirth: "2004-10-14", teamSlug: "bayern-munich", jerseyNumber: 34 },
];

// Batch 4 - same "full squad, not one star" approach for six more big
// clubs already in the database: Chelsea, Manchester United, Tottenham,
// Paris Saint-Germain, Juventus and Inter Milan.
const PLAYERS_BATCH_4: PlayerSeed[] = [
  // Chelsea (adds to Palmer, Enzo Fernández, Robert Sánchez)
  { name: "Levi Colwill", wikiTitle: "Levi_Colwill", position: "Defender", nationality: "England", dateOfBirth: "2003-02-26", teamSlug: "chelsea", jerseyNumber: 6 },
  { name: "Reece James", wikiTitle: "Reece_James", position: "Defender", nationality: "England", dateOfBirth: "1999-12-08", teamSlug: "chelsea", jerseyNumber: 24 },
  { name: "Moisés Caicedo", wikiTitle: "Mois%C3%A9s_Caicedo", position: "Midfielder", nationality: "Ecuador", dateOfBirth: "2001-11-02", teamSlug: "chelsea", jerseyNumber: 25 },
  { name: "Romeo Lavia", wikiTitle: "Romeo_Lavia", position: "Midfielder", nationality: "Belgium", dateOfBirth: "2004-01-06", teamSlug: "chelsea", jerseyNumber: 45 },
  { name: "Pedro Neto", wikiTitle: "Pedro_Neto_(footballer,_born_2000)", position: "Forward", nationality: "Portugal", dateOfBirth: "2000-03-09", teamSlug: "chelsea", jerseyNumber: 7 },
  { name: "João Pedro", wikiTitle: "Jo%C3%A3o_Pedro_(footballer,_born_2001)", position: "Forward", nationality: "Brazil", dateOfBirth: "2001-09-26", teamSlug: "chelsea", jerseyNumber: 9 },
  { name: "Marc Cucurella", wikiTitle: "Marc_Cucurella", position: "Defender", nationality: "Spain", dateOfBirth: "1998-07-22", teamSlug: "chelsea", jerseyNumber: 3 },
  { name: "Alejandro Garnacho", wikiTitle: "Alejandro_Garnacho", position: "Forward", nationality: "Argentina", dateOfBirth: "2004-07-01", teamSlug: "chelsea", jerseyNumber: 49 },

  // Manchester United (adds to Bruno Fernandes, Maguire, Onana)
  { name: "Lisandro Martínez", wikiTitle: "Lisandro_Mart%C3%ADnez", position: "Defender", nationality: "Argentina", dateOfBirth: "1998-01-18", teamSlug: "manchester-united", jerseyNumber: 6 },
  { name: "Noussair Mazraoui", wikiTitle: "Noussair_Mazraoui", position: "Defender", nationality: "Morocco", dateOfBirth: "1997-11-14", teamSlug: "manchester-united", jerseyNumber: 3 },
  { name: "Kobbie Mainoo", wikiTitle: "Kobbie_Mainoo", position: "Midfielder", nationality: "England", dateOfBirth: "2005-04-19", teamSlug: "manchester-united", jerseyNumber: 37 },
  { name: "Manuel Ugarte", wikiTitle: "Manuel_Ugarte", position: "Midfielder", nationality: "Uruguay", dateOfBirth: "2001-04-11", teamSlug: "manchester-united", jerseyNumber: 25 },
  { name: "Rasmus Højlund", wikiTitle: "Rasmus_H%C3%B8jlund", position: "Forward", nationality: "Denmark", dateOfBirth: "2003-02-04", teamSlug: "manchester-united", jerseyNumber: 11 },
  { name: "Mason Mount", wikiTitle: "Mason_Mount", position: "Midfielder", nationality: "England", dateOfBirth: "1999-01-10", teamSlug: "manchester-united", jerseyNumber: 7 },
  { name: "Matthijs de Ligt", wikiTitle: "Matthijs_de_Ligt", position: "Defender", nationality: "Netherlands", dateOfBirth: "1999-08-12", teamSlug: "manchester-united", jerseyNumber: 4 },

  // Tottenham Hotspur (adds to Maddison, Vicario, Romero)
  { name: "Micky van de Ven", wikiTitle: "Micky_van_de_Ven", position: "Defender", nationality: "Netherlands", dateOfBirth: "2001-04-19", teamSlug: "tottenham-hotspur", jerseyNumber: 37 },
  { name: "Destiny Udogie", wikiTitle: "Destiny_Udogie", position: "Defender", nationality: "Italy", dateOfBirth: "2002-11-28", teamSlug: "tottenham-hotspur", jerseyNumber: 13 },
  { name: "Yves Bissouma", wikiTitle: "Yves_Bissouma", position: "Midfielder", nationality: "Mali", dateOfBirth: "1996-08-30", teamSlug: "tottenham-hotspur", jerseyNumber: 8 },
  { name: "Pape Matar Sarr", wikiTitle: "Pape_Matar_Sarr", position: "Midfielder", nationality: "Senegal", dateOfBirth: "2002-09-14", teamSlug: "tottenham-hotspur", jerseyNumber: 29 },
  { name: "Dominic Solanke", wikiTitle: "Dominic_Solanke", position: "Forward", nationality: "England", dateOfBirth: "1997-09-14", teamSlug: "tottenham-hotspur", jerseyNumber: 19 },
  { name: "Brennan Johnson", wikiTitle: "Brennan_Johnson", position: "Forward", nationality: "Wales", dateOfBirth: "2001-05-23", teamSlug: "tottenham-hotspur", jerseyNumber: 20 },

  // Paris Saint-Germain (adds to Dembélé, Hakimi, Vitinha)
  { name: "Marquinhos", wikiTitle: "Marquinhos", position: "Defender", nationality: "Brazil", dateOfBirth: "1994-05-14", teamSlug: "paris-saint-germain", jerseyNumber: 5 },
  { name: "Nuno Mendes", wikiTitle: "Nuno_Mendes", position: "Defender", nationality: "Portugal", dateOfBirth: "2002-06-19", teamSlug: "paris-saint-germain", jerseyNumber: 25 },
  { name: "Fabián Ruiz", wikiTitle: "Fabi%C3%A1n_Ruiz", position: "Midfielder", nationality: "Spain", dateOfBirth: "1996-04-03", teamSlug: "paris-saint-germain", jerseyNumber: 8 },
  { name: "Warren Zaïre-Emery", wikiTitle: "Warren_Za%C3%AFre-Emery", position: "Midfielder", nationality: "France", dateOfBirth: "2006-03-08", teamSlug: "paris-saint-germain", jerseyNumber: 33 },
  { name: "Bradley Barcola", wikiTitle: "Bradley_Barcola", position: "Forward", nationality: "France", dateOfBirth: "2002-11-02", teamSlug: "paris-saint-germain", jerseyNumber: 29 },
  { name: "Gonçalo Ramos", wikiTitle: "Gon%C3%A7alo_Ramos", position: "Forward", nationality: "Portugal", dateOfBirth: "2001-06-20", teamSlug: "paris-saint-germain", jerseyNumber: 9 },
  { name: "Lucas Chevalier", wikiTitle: "Lucas_Chevalier", position: "Goalkeeper", nationality: "France", dateOfBirth: "2001-11-15", teamSlug: "paris-saint-germain", jerseyNumber: 1 },

  // Juventus (adds to Vlahović, Yıldız)
  { name: "Gleison Bremer", wikiTitle: "Gleison_Bremer", position: "Defender", nationality: "Brazil", dateOfBirth: "1997-03-16", teamSlug: "juventus", jerseyNumber: 3 },
  { name: "Federico Gatti", wikiTitle: "Federico_Gatti", position: "Defender", nationality: "Italy", dateOfBirth: "1998-06-24", teamSlug: "juventus", jerseyNumber: 4 },
  { name: "Manuel Locatelli", wikiTitle: "Manuel_Locatelli", position: "Midfielder", nationality: "Italy", dateOfBirth: "1998-01-08", teamSlug: "juventus", jerseyNumber: 5 },
  { name: "Teun Koopmeiners", wikiTitle: "Teun_Koopmeiners", position: "Midfielder", nationality: "Netherlands", dateOfBirth: "1998-02-28", teamSlug: "juventus", jerseyNumber: 8 },
  { name: "Michele Di Gregorio", wikiTitle: "Michele_Di_Gregorio", position: "Goalkeeper", nationality: "Italy", dateOfBirth: "1997-08-27", teamSlug: "juventus", jerseyNumber: 29 },
  { name: "Weston McKennie", wikiTitle: "Weston_McKennie", position: "Midfielder", nationality: "United States", dateOfBirth: "1998-08-28", teamSlug: "juventus", jerseyNumber: 16 },

  // Inter Milan (adds to Lautaro Martínez, Barella)
  { name: "Alessandro Bastoni", wikiTitle: "Alessandro_Bastoni", position: "Defender", nationality: "Italy", dateOfBirth: "1999-04-13", teamSlug: "inter-milan", jerseyNumber: 95 },
  { name: "Federico Dimarco", wikiTitle: "Federico_Dimarco", position: "Defender", nationality: "Italy", dateOfBirth: "1997-11-10", teamSlug: "inter-milan", jerseyNumber: 32 },
  { name: "Hakan Çalhanoğlu", wikiTitle: "Hakan_%C3%87alhano%C4%9Flu", position: "Midfielder", nationality: "Turkey", dateOfBirth: "1994-02-08", teamSlug: "inter-milan", jerseyNumber: 20 },
  { name: "Yann Sommer", wikiTitle: "Yann_Sommer", position: "Goalkeeper", nationality: "Switzerland", dateOfBirth: "1988-12-17", teamSlug: "inter-milan", jerseyNumber: 1 },
  { name: "Denzel Dumfries", wikiTitle: "Denzel_Dumfries", position: "Defender", nationality: "Netherlands", dateOfBirth: "1996-04-18", teamSlug: "inter-milan", jerseyNumber: 2 },
  { name: "Marcus Thuram", wikiTitle: "Marcus_Thuram", position: "Forward", nationality: "France", dateOfBirth: "1997-08-06", teamSlug: "inter-milan", jerseyNumber: 9 },
];

// Batch 5 - continues the "full squad" approach for six more clubs
// that only had 1-3 players so far: Napoli, AC Milan, AS Roma,
// Newcastle United, Atlético Madrid and Borussia Dortmund.
const PLAYERS_BATCH_5: PlayerSeed[] = [
  // Napoli (adds to De Bruyne, Lukaku)
  { name: "Alex Meret", wikiTitle: "Alex_Meret", position: "Goalkeeper", nationality: "Italy", dateOfBirth: "1997-03-22", teamSlug: "napoli", jerseyNumber: 1 },
  { name: "Amir Rrahmani", wikiTitle: "Amir_Rrahmani", position: "Defender", nationality: "Kosovo", dateOfBirth: "1996-02-24", teamSlug: "napoli", jerseyNumber: 13 },
  { name: "Giovanni Di Lorenzo", wikiTitle: "Giovanni_Di_Lorenzo", position: "Defender", nationality: "Italy", dateOfBirth: "1993-08-04", teamSlug: "napoli", jerseyNumber: 22 },
  { name: "Stanislav Lobotka", wikiTitle: "Stanislav_Lobotka", position: "Midfielder", nationality: "Slovakia", dateOfBirth: "1994-11-25", teamSlug: "napoli", jerseyNumber: 68 },
  { name: "Matteo Politano", wikiTitle: "Matteo_Politano", position: "Forward", nationality: "Italy", dateOfBirth: "1993-08-03", teamSlug: "napoli", jerseyNumber: 21 },
  { name: "Scott McTominay", wikiTitle: "Scott_McTominay", position: "Midfielder", nationality: "Scotland", dateOfBirth: "1996-12-08", teamSlug: "napoli", jerseyNumber: 8 },

  // AC Milan (adds to Leão, Maignan)
  { name: "Theo Hernández", wikiTitle: "Theo_Hern%C3%A1ndez", position: "Defender", nationality: "France", dateOfBirth: "1997-10-06", teamSlug: "ac-milan", jerseyNumber: 19 },
  { name: "Fikayo Tomori", wikiTitle: "Fikayo_Tomori", position: "Defender", nationality: "England", dateOfBirth: "1997-12-19", teamSlug: "ac-milan", jerseyNumber: 23 },
  { name: "Christian Pulisic", wikiTitle: "Christian_Pulisic", position: "Forward", nationality: "United States", dateOfBirth: "1998-09-18", teamSlug: "ac-milan", jerseyNumber: 11 },
  { name: "Youssouf Fofana", wikiTitle: "Youssouf_Fofana", position: "Midfielder", nationality: "France", dateOfBirth: "1999-01-10", teamSlug: "ac-milan", jerseyNumber: 29 },
  { name: "Álvaro Morata", wikiTitle: "%C3%81lvaro_Morata", position: "Forward", nationality: "Spain", dateOfBirth: "1992-10-23", teamSlug: "ac-milan", jerseyNumber: 7 },
  { name: "Strahinja Pavlović", wikiTitle: "Strahinja_Pavlovi%C4%87", position: "Defender", nationality: "Serbia", dateOfBirth: "2002-05-24", teamSlug: "ac-milan", jerseyNumber: 15 },

  // AS Roma (adds to Dybala)
  { name: "Lorenzo Pellegrini", wikiTitle: "Lorenzo_Pellegrini", position: "Midfielder", nationality: "Italy", dateOfBirth: "1996-06-19", teamSlug: "as-roma", jerseyNumber: 7 },
  { name: "Gianluca Mancini", wikiTitle: "Gianluca_Mancini", position: "Defender", nationality: "Italy", dateOfBirth: "1996-04-17", teamSlug: "as-roma", jerseyNumber: 23 },
  { name: "Mile Svilar", wikiTitle: "Mile_Svilar", position: "Goalkeeper", nationality: "Belgium", dateOfBirth: "1999-08-27", teamSlug: "as-roma", jerseyNumber: 99 },
  { name: "Artem Dovbyk", wikiTitle: "Artem_Dovbyk", position: "Forward", nationality: "Ukraine", dateOfBirth: "1997-06-21", teamSlug: "as-roma", jerseyNumber: 9 },
  { name: "Bryan Cristante", wikiTitle: "Bryan_Cristante", position: "Midfielder", nationality: "Italy", dateOfBirth: "1995-03-03", teamSlug: "as-roma", jerseyNumber: 4 },
  { name: "Manu Koné", wikiTitle: "Manu_Kon%C3%A9", position: "Midfielder", nationality: "France", dateOfBirth: "2001-05-17", teamSlug: "as-roma", jerseyNumber: 17 },

  // Newcastle United (adds to Tonali, Pope, Schär)
  { name: "Bruno Guimarães", wikiTitle: "Bruno_Guimar%C3%A3es", position: "Midfielder", nationality: "Brazil", dateOfBirth: "1997-11-16", teamSlug: "newcastle-united", jerseyNumber: 39 },
  { name: "Anthony Gordon", wikiTitle: "Anthony_Gordon_(footballer)", position: "Forward", nationality: "England", dateOfBirth: "2001-02-24", teamSlug: "newcastle-united", jerseyNumber: 10 },
  { name: "Harvey Barnes", wikiTitle: "Harvey_Barnes", position: "Forward", nationality: "England", dateOfBirth: "1997-12-09", teamSlug: "newcastle-united", jerseyNumber: 11 },
  { name: "Dan Burn", wikiTitle: "Dan_Burn", position: "Defender", nationality: "England", dateOfBirth: "1992-05-09", teamSlug: "newcastle-united", jerseyNumber: 33 },
  { name: "Joelinton", wikiTitle: "Joelinton", position: "Midfielder", nationality: "Brazil", dateOfBirth: "1996-08-14", teamSlug: "newcastle-united", jerseyNumber: 7 },

  // Atlético Madrid (adds to Julián Álvarez, Oblak, Samu)
  { name: "Koke", wikiTitle: "Koke_(footballer)", position: "Midfielder", nationality: "Spain", dateOfBirth: "1992-01-08", teamSlug: "atletico-madrid", jerseyNumber: 6 },
  { name: "José Giménez", wikiTitle: "Jos%C3%A9_Gim%C3%A9nez", position: "Defender", nationality: "Uruguay", dateOfBirth: "1995-01-20", teamSlug: "atletico-madrid", jerseyNumber: 2 },
  { name: "Rodrigo De Paul", wikiTitle: "Rodrigo_De_Paul", position: "Midfielder", nationality: "Argentina", dateOfBirth: "1994-05-24", teamSlug: "atletico-madrid", jerseyNumber: 5 },
  { name: "Marcos Llorente", wikiTitle: "Marcos_Llorente", position: "Midfielder", nationality: "Spain", dateOfBirth: "1995-01-30", teamSlug: "atletico-madrid", jerseyNumber: 14 },
  { name: "Robin Le Normand", wikiTitle: "Robin_Le_Normand", position: "Defender", nationality: "Spain", dateOfBirth: "1996-11-11", teamSlug: "atletico-madrid", jerseyNumber: 24 },

  // Borussia Dortmund (adds to Brandt, Kobel)
  { name: "Nico Schlotterbeck", wikiTitle: "Nico_Schlotterbeck", position: "Defender", nationality: "Germany", dateOfBirth: "1999-12-01", teamSlug: "borussia-dortmund", jerseyNumber: 4 },
  { name: "Waldemar Anton", wikiTitle: "Waldemar_Anton", position: "Defender", nationality: "Germany", dateOfBirth: "1996-07-20", teamSlug: "borussia-dortmund", jerseyNumber: 5 },
  { name: "Felix Nmecha", wikiTitle: "Felix_Nmecha", position: "Midfielder", nationality: "Germany", dateOfBirth: "2000-10-10", teamSlug: "borussia-dortmund", jerseyNumber: 8 },
  { name: "Serhou Guirassy", wikiTitle: "Serhou_Guirassy", position: "Forward", nationality: "Guinea", dateOfBirth: "1996-03-12", teamSlug: "borussia-dortmund", jerseyNumber: 9 },
  { name: "Karim Adeyemi", wikiTitle: "Karim_Adeyemi", position: "Forward", nationality: "Germany", dateOfBirth: "2002-01-18", teamSlug: "borussia-dortmund", jerseyNumber: 27 },
];

// Batch 6 - continues deepening clubs that only had 1-2 players:
// Bayer Leverkusen, RB Leipzig, Athletic Bilbao, Aston Villa,
// Sporting CP and SL Benfica. Jersey numbers are only set where
// confidently known - left null rather than guessed, after the
// Mbappé mix-up earlier.
const PLAYERS_BATCH_6: PlayerSeed[] = [
  // Bayer Leverkusen (adds to Xhaka, Schick)
  { name: "Jonathan Tah", wikiTitle: "Jonathan_Tah", position: "Defender", nationality: "Germany", dateOfBirth: "1996-02-11", teamSlug: "bayer-leverkusen", jerseyNumber: 4 },
  { name: "Piero Hincapié", wikiTitle: "Piero_Hincapi%C3%A9", position: "Defender", nationality: "Ecuador", dateOfBirth: "2002-01-09", teamSlug: "bayer-leverkusen", jerseyNumber: null },
  { name: "Exequiel Palacios", wikiTitle: "Exequiel_Palacios", position: "Midfielder", nationality: "Argentina", dateOfBirth: "1998-10-05", teamSlug: "bayer-leverkusen", jerseyNumber: null },
  { name: "Alejandro Grimaldo", wikiTitle: "Alejandro_Grimaldo", position: "Defender", nationality: "Spain", dateOfBirth: "1995-09-20", teamSlug: "bayer-leverkusen", jerseyNumber: null },
  { name: "Martin Terrier", wikiTitle: "Martin_Terrier", position: "Forward", nationality: "France", dateOfBirth: "1997-09-04", teamSlug: "bayer-leverkusen", jerseyNumber: null },

  // RB Leipzig (adds to Xavi Simons)
  { name: "Lois Openda", wikiTitle: "Lois_Openda", position: "Forward", nationality: "Belgium", dateOfBirth: "2000-02-16", teamSlug: "rb-leipzig", jerseyNumber: null },
  { name: "Willi Orbán", wikiTitle: "Willi_Orb%C3%A1n", position: "Defender", nationality: "Hungary", dateOfBirth: "1992-11-03", teamSlug: "rb-leipzig", jerseyNumber: 4 },
  { name: "David Raum", wikiTitle: "David_Raum", position: "Defender", nationality: "Germany", dateOfBirth: "1998-04-22", teamSlug: "rb-leipzig", jerseyNumber: null },
  { name: "Xaver Schlager", wikiTitle: "Xaver_Schlager", position: "Midfielder", nationality: "Austria", dateOfBirth: "1999-03-28", teamSlug: "rb-leipzig", jerseyNumber: null },
  { name: "Péter Gulácsi", wikiTitle: "P%C3%A9ter_Gul%C3%A1csi", position: "Goalkeeper", nationality: "Hungary", dateOfBirth: "1990-05-06", teamSlug: "rb-leipzig", jerseyNumber: 1 },

  // Athletic Bilbao (adds to Nico Williams)
  { name: "Unai Simón", wikiTitle: "Unai_Sim%C3%B3n", position: "Goalkeeper", nationality: "Spain", dateOfBirth: "1997-06-11", teamSlug: "athletic-bilbao", jerseyNumber: 1 },
  { name: "Yuri Berchiche", wikiTitle: "Yuri_Berchiche", position: "Defender", nationality: "Spain", dateOfBirth: "1990-02-10", teamSlug: "athletic-bilbao", jerseyNumber: null },
  { name: "Mikel Vesga", wikiTitle: "Mikel_Vesga", position: "Midfielder", nationality: "Spain", dateOfBirth: "1993-03-08", teamSlug: "athletic-bilbao", jerseyNumber: null },
  { name: "Oihan Sancet", wikiTitle: "Oihan_Sancet", position: "Midfielder", nationality: "Spain", dateOfBirth: "2000-12-25", teamSlug: "athletic-bilbao", jerseyNumber: null },
  { name: "Aymeric Laporte", wikiTitle: "Aymeric_Laporte", position: "Defender", nationality: "Spain", dateOfBirth: "1994-05-27", teamSlug: "athletic-bilbao", jerseyNumber: 4 },

  // Aston Villa (adds to Emiliano Martínez, Watkins)
  { name: "Ezri Konsa", wikiTitle: "Ezri_Konsa", position: "Defender", nationality: "England", dateOfBirth: "1997-10-23", teamSlug: "aston-villa", jerseyNumber: null },
  { name: "Youri Tielemans", wikiTitle: "Youri_Tielemans", position: "Midfielder", nationality: "Belgium", dateOfBirth: "1997-05-07", teamSlug: "aston-villa", jerseyNumber: null },
  { name: "John McGinn", wikiTitle: "John_McGinn", position: "Midfielder", nationality: "Scotland", dateOfBirth: "1994-10-18", teamSlug: "aston-villa", jerseyNumber: 7 },
  { name: "Morgan Rogers", wikiTitle: "Morgan_Rogers_(footballer)", position: "Forward", nationality: "England", dateOfBirth: "2002-07-26", teamSlug: "aston-villa", jerseyNumber: null },
  { name: "Amadou Onana", wikiTitle: "Amadou_Onana", position: "Midfielder", nationality: "Belgium", dateOfBirth: "2001-08-16", teamSlug: "aston-villa", jerseyNumber: null },

  // Sporting CP (adds to Hjulmand)
  { name: "Franco Israel", wikiTitle: "Franco_Israel", position: "Goalkeeper", nationality: "Uruguay", dateOfBirth: "2000-10-22", teamSlug: "sporting-cp", jerseyNumber: null },
  { name: "Ousmane Diomande", wikiTitle: "Ousmane_Diomand%C3%A9", position: "Defender", nationality: "Ivory Coast", dateOfBirth: "2003-01-04", teamSlug: "sporting-cp", jerseyNumber: null },
  { name: "Geny Catamo", wikiTitle: "Geny_Catamo", position: "Forward", nationality: "Mozambique", dateOfBirth: "2001-05-01", teamSlug: "sporting-cp", jerseyNumber: null },
  { name: "Daniel Bragança", wikiTitle: "Daniel_Bragan%C3%A7a", position: "Midfielder", nationality: "Portugal", dateOfBirth: "2000-02-09", teamSlug: "sporting-cp", jerseyNumber: null },
  { name: "Pedro Gonçalves", wikiTitle: "Pedro_Gon%C3%A7alves_(footballer,_born_1998)", position: "Midfielder", nationality: "Portugal", dateOfBirth: "1998-06-25", teamSlug: "sporting-cp", jerseyNumber: 28 },

  // SL Benfica (adds to Alexander Bah)
  { name: "Anatoliy Trubin", wikiTitle: "Anatoliy_Trubin", position: "Goalkeeper", nationality: "Ukraine", dateOfBirth: "2001-08-01", teamSlug: "sl-benfica", jerseyNumber: 1 },
  { name: "Nicolás Otamendi", wikiTitle: "Nicol%C3%A1s_Otamendi", position: "Defender", nationality: "Argentina", dateOfBirth: "1988-02-12", teamSlug: "sl-benfica", jerseyNumber: 30 },
  { name: "Fredrik Aursnes", wikiTitle: "Fredrik_Aursnes", position: "Midfielder", nationality: "Norway", dateOfBirth: "1995-06-10", teamSlug: "sl-benfica", jerseyNumber: null },
  { name: "Orkun Kökçü", wikiTitle: "Orkun_K%C3%B6k%C3%A7%C3%BC", position: "Midfielder", nationality: "Turkey", dateOfBirth: "2000-09-29", teamSlug: "sl-benfica", jerseyNumber: null },
  { name: "Vangelis Pavlidis", wikiTitle: "Vangelis_Pavlidis", position: "Forward", nationality: "Greece", dateOfBirth: "1998-04-21", teamSlug: "sl-benfica", jerseyNumber: 9 },
];

// Batch 7 - deepens the four Saudi Pro League clubs (only had 2
// players each). Al-Nassr actually won the 2025-26 title (their
// first since 2018-19), with Ronaldo top-scoring the league at 28
// goals - verified via search, not assumed.
const PLAYERS_BATCH_7: PlayerSeed[] = [
  // Al-Nassr (adds to Ronaldo, Mané) - 2025-26 Saudi Pro League champions
  { name: "João Félix", wikiTitle: "Jo%C3%A3o_F%C3%A9lix", position: "Forward", nationality: "Portugal", dateOfBirth: "1999-11-10", teamSlug: "al-nassr", jerseyNumber: null },
  { name: "Marcelo Brozović", wikiTitle: "Marcelo_Brozovi%C4%87", position: "Midfielder", nationality: "Croatia", dateOfBirth: "1992-11-16", teamSlug: "al-nassr", jerseyNumber: null },
  { name: "Sultan Al-Ghannam", wikiTitle: "Sultan_Al-Ghannam", position: "Defender", nationality: "Saudi Arabia", dateOfBirth: "1996-05-27", teamSlug: "al-nassr", jerseyNumber: null },
  { name: "Nawaf Al-Aqidi", wikiTitle: "Nawaf_Al-Aqidi", position: "Goalkeeper", nationality: "Saudi Arabia", dateOfBirth: "1999-04-15", teamSlug: "al-nassr", jerseyNumber: null },

  // Al-Hilal (adds to Neves, Koulibaly)
  { name: "Aleksandar Mitrović", wikiTitle: "Aleksandar_Mitrovi%C4%87", position: "Forward", nationality: "Serbia", dateOfBirth: "1994-09-16", teamSlug: "al-hilal", jerseyNumber: null },
  { name: "Marcos Leonardo", wikiTitle: "Marcos_Leonardo", position: "Forward", nationality: "Brazil", dateOfBirth: "2003-05-11", teamSlug: "al-hilal", jerseyNumber: null },
  { name: "Ali Lajami", wikiTitle: "Ali_Lajami", position: "Defender", nationality: "Saudi Arabia", dateOfBirth: "1999-01-01", teamSlug: "al-hilal", jerseyNumber: null },
  { name: "Yassine Bounou", wikiTitle: "Yassine_Bounou", position: "Goalkeeper", nationality: "Morocco", dateOfBirth: "1991-04-05", teamSlug: "al-hilal", jerseyNumber: null, cleanSheets: 14 },

  // Al-Ittihad (adds to Kanté, Benzema)
  { name: "Édouard Mendy", wikiTitle: "%C3%89douard_Mendy", position: "Goalkeeper", nationality: "Senegal", dateOfBirth: "1992-03-17", teamSlug: "al-ittihad", jerseyNumber: null, cleanSheets: 14 },
  { name: "Fabinho", wikiTitle: "Fabinho", position: "Midfielder", nationality: "Brazil", dateOfBirth: "1993-10-23", teamSlug: "al-ittihad", jerseyNumber: null },
  { name: "Houssem Aouar", wikiTitle: "Houssem_Aouar", position: "Midfielder", nationality: "France", dateOfBirth: "1998-06-30", teamSlug: "al-ittihad", jerseyNumber: null },

  // Al-Ahli (adds to Firmino, Mahrez)
  { name: "Roger Ibañez", wikiTitle: "Roger_Iba%C3%B1ez", position: "Defender", nationality: "Brazil", dateOfBirth: "1998-02-24", teamSlug: "al-ahli", jerseyNumber: null },
  { name: "Franck Kessié", wikiTitle: "Franck_Kessi%C3%A9", position: "Midfielder", nationality: "Ivory Coast", dateOfBirth: "1996-12-19", teamSlug: "al-ahli", jerseyNumber: null },
  { name: "Ivan Toney", wikiTitle: "Ivan_Toney", position: "Forward", nationality: "England", dateOfBirth: "1996-03-16", teamSlug: "al-ahli", jerseyNumber: null },
];

// Batch 8 - deepens 11 more clubs that only had 1 player: FC Porto,
// plus six more Serie A clubs and four more Ligue 1 clubs. Jersey
// numbers stay conservative - only set for very distinctive, widely
// known numbers, null otherwise rather than guessed.
const PLAYERS_BATCH_8: PlayerSeed[] = [
  // FC Porto (adds to Pepe)
  { name: "Diogo Costa", wikiTitle: "Diogo_Costa", position: "Goalkeeper", nationality: "Portugal", dateOfBirth: "1999-09-19", teamSlug: "fc-porto", jerseyNumber: 99 },
  { name: "João Mário", wikiTitle: "Jo%C3%A3o_M%C3%A1rio_(footballer,_born_1993)", position: "Defender", nationality: "Portugal", dateOfBirth: "1993-01-15", teamSlug: "fc-porto", jerseyNumber: null },
  { name: "Alan Varela", wikiTitle: "Alan_Varela", position: "Midfielder", nationality: "Argentina", dateOfBirth: "2000-05-27", teamSlug: "fc-porto", jerseyNumber: null },
  { name: "Rodrigo Mora", wikiTitle: "Rodrigo_Mora", position: "Midfielder", nationality: "Portugal", dateOfBirth: "2007-06-31", teamSlug: "fc-porto", jerseyNumber: null },

  // Atalanta (adds to Lookman)
  { name: "Marco Carnesecchi", wikiTitle: "Marco_Carnesecchi", position: "Goalkeeper", nationality: "Italy", dateOfBirth: "1999-12-01", teamSlug: "atalanta", jerseyNumber: 1 },
  { name: "Berat Djimsiti", wikiTitle: "Berat_Djimsiti", position: "Defender", nationality: "Albania", dateOfBirth: "1993-02-19", teamSlug: "atalanta", jerseyNumber: null },
  { name: "Éderson", wikiTitle: "%C3%89derson_(footballer,_born_1999)", position: "Midfielder", nationality: "Brazil", dateOfBirth: "1999-01-08", teamSlug: "atalanta", jerseyNumber: null },
  { name: "Charles De Ketelaere", wikiTitle: "Charles_De_Ketelaere", position: "Forward", nationality: "Belgium", dateOfBirth: "2001-03-10", teamSlug: "atalanta", jerseyNumber: null },

  // Bologna (adds to Orsolini)
  { name: "Łukasz Skorupski", wikiTitle: "%C5%81ukasz_Skorupski", position: "Goalkeeper", nationality: "Poland", dateOfBirth: "1991-05-05", teamSlug: "bologna", jerseyNumber: 1 },
  { name: "Sam Beukema", wikiTitle: "Sam_Beukema", position: "Defender", nationality: "Netherlands", dateOfBirth: "1998-04-26", teamSlug: "bologna", jerseyNumber: null },
  { name: "Remo Freuler", wikiTitle: "Remo_Freuler", position: "Midfielder", nationality: "Switzerland", dateOfBirth: "1992-04-15", teamSlug: "bologna", jerseyNumber: null },
  { name: "Santiago Castro", wikiTitle: "Santiago_Castro_(footballer,_born_2004)", position: "Forward", nationality: "Argentina", dateOfBirth: "2004-08-18", teamSlug: "bologna", jerseyNumber: null },

  // Fiorentina (adds to Kean)
  { name: "David de Gea", wikiTitle: "David_de_Gea", position: "Goalkeeper", nationality: "Spain", dateOfBirth: "1990-11-07", teamSlug: "fiorentina", jerseyNumber: 43 },
  { name: "Pietro Comuzzo", wikiTitle: "Pietro_Comuzzo", position: "Defender", nationality: "Italy", dateOfBirth: "2005-04-30", teamSlug: "fiorentina", jerseyNumber: null },
  { name: "Rolando Mandragora", wikiTitle: "Rolando_Mandragora", position: "Midfielder", nationality: "Italy", dateOfBirth: "1997-06-29", teamSlug: "fiorentina", jerseyNumber: null },
  { name: "Albert Guðmundsson", wikiTitle: "Albert_Gu%C3%B0mundsson", position: "Forward", nationality: "Iceland", dateOfBirth: "1997-06-15", teamSlug: "fiorentina", jerseyNumber: null },

  // Lazio (adds to Zaccagni)
  { name: "Ivan Provedel", wikiTitle: "Ivan_Provedel", position: "Goalkeeper", nationality: "Italy", dateOfBirth: "1994-03-16", teamSlug: "lazio", jerseyNumber: 94 },
  { name: "Alessio Romagnoli", wikiTitle: "Alessio_Romagnoli", position: "Defender", nationality: "Italy", dateOfBirth: "1995-01-12", teamSlug: "lazio", jerseyNumber: 13 },
  { name: "Nicolò Rovella", wikiTitle: "Nicol%C3%B2_Rovella", position: "Midfielder", nationality: "Italy", dateOfBirth: "2001-12-04", teamSlug: "lazio", jerseyNumber: null },
  { name: "Valentín Castellanos", wikiTitle: "Valent%C3%ADn_Castellanos", position: "Forward", nationality: "Argentina", dateOfBirth: "1998-03-04", teamSlug: "lazio", jerseyNumber: null },

  // Torino (adds to Ché Adams)
  { name: "Vanja Milinković-Savić", wikiTitle: "Vanja_Milinkovi%C4%87-Savi%C4%87", position: "Goalkeeper", nationality: "Serbia", dateOfBirth: "1997-02-20", teamSlug: "torino", jerseyNumber: null },
  { name: "Adam Masina", wikiTitle: "Adam_Masina", position: "Defender", nationality: "Morocco", dateOfBirth: "1994-02-02", teamSlug: "torino", jerseyNumber: null },
  { name: "Samuele Ricci", wikiTitle: "Samuele_Ricci", position: "Midfielder", nationality: "Italy", dateOfBirth: "2001-08-21", teamSlug: "torino", jerseyNumber: null },
  { name: "Nikola Vlašić", wikiTitle: "Nikola_Vla%C5%A1i%C4%87", position: "Midfielder", nationality: "Croatia", dateOfBirth: "1997-10-04", teamSlug: "torino", jerseyNumber: null },

  // Udinese (adds to Bijol)
  { name: "Maduka Okoye", wikiTitle: "Maduka_Okoye", position: "Goalkeeper", nationality: "Nigeria", dateOfBirth: "1999-09-28", teamSlug: "udinese", jerseyNumber: 1 },
  { name: "Oumar Solet", wikiTitle: "Oumar_Solet", position: "Defender", nationality: "France", dateOfBirth: "2000-02-19", teamSlug: "udinese", jerseyNumber: null },
  { name: "Sandi Lovrić", wikiTitle: "Sandi_Lovri%C4%87", position: "Midfielder", nationality: "Slovenia", dateOfBirth: "1998-10-29", teamSlug: "udinese", jerseyNumber: null },
  { name: "Keinan Davis", wikiTitle: "Keinan_Davis", position: "Forward", nationality: "England", dateOfBirth: "1998-01-13", teamSlug: "udinese", jerseyNumber: null },

  // Lille (adds to Benjamin André)
  { name: "Berke Özer", wikiTitle: "Berke_%C3%96zer", position: "Goalkeeper", nationality: "Turkey", dateOfBirth: "1998-04-19", teamSlug: "lille", jerseyNumber: null },
  { name: "Bafodé Diakité", wikiTitle: "Bafod%C3%A9_Diakit%C3%A9", position: "Defender", nationality: "France", dateOfBirth: "2001-11-06", teamSlug: "lille", jerseyNumber: null },
  { name: "Nabil Bentaleb", wikiTitle: "Nabil_Bentaleb", position: "Midfielder", nationality: "Algeria", dateOfBirth: "1994-11-24", teamSlug: "lille", jerseyNumber: null },

  // Lyon (adds to Lacazette)
  { name: "Dominik Greif", wikiTitle: "Dominik_Greif", position: "Goalkeeper", nationality: "Slovakia", dateOfBirth: "1997-10-06", teamSlug: "lyon", jerseyNumber: null },
  { name: "Moussa Niakhaté", wikiTitle: "Moussa_Niakhat%C3%A9", position: "Defender", nationality: "France", dateOfBirth: "1996-03-08", teamSlug: "lyon", jerseyNumber: null },
  { name: "Corentin Tolisso", wikiTitle: "Corentin_Tolisso", position: "Midfielder", nationality: "France", dateOfBirth: "1994-08-03", teamSlug: "lyon", jerseyNumber: null },
  { name: "Malick Fofana", wikiTitle: "Malick_Fofana", position: "Forward", nationality: "Belgium", dateOfBirth: "2006-01-31", teamSlug: "lyon", jerseyNumber: null },

  // Nice (adds to Moffi)
  { name: "Marcin Bułka", wikiTitle: "Marcin_Bu%C5%82ka", position: "Goalkeeper", nationality: "Poland", dateOfBirth: "1999-10-04", teamSlug: "nice", jerseyNumber: null },
  { name: "Jean-Clair Todibo", wikiTitle: "Jean-Clair_Todibo", position: "Defender", nationality: "France", dateOfBirth: "1999-12-30", teamSlug: "nice", jerseyNumber: null },
  { name: "Sofiane Diop", wikiTitle: "Sofiane_Diop", position: "Midfielder", nationality: "France", dateOfBirth: "2000-01-21", teamSlug: "nice", jerseyNumber: null },

  // RC Lens (adds to Medina)
  { name: "Brice Samba", wikiTitle: "Brice_Samba", position: "Goalkeeper", nationality: "France", dateOfBirth: "1994-04-25", teamSlug: "rc-lens", jerseyNumber: null },
  { name: "Adrien Thomasson", wikiTitle: "Adrien_Thomasson", position: "Midfielder", nationality: "France", dateOfBirth: "1993-03-15", teamSlug: "rc-lens", jerseyNumber: null },
];

// Batch 9 - the last 10 clubs that only had 1 player: five more Serie
// A clubs, four more Ligue 1 clubs, and SC Braga. Same conservative
// approach to jersey numbers as Batch 8.
const PLAYERS_BATCH_9: PlayerSeed[] = [
  // AFC Bournemouth - fills the gap left when Semenyo's real transfer
  // to Manchester City was corrected (see Batch 2 note).
  { name: "Marcos Senesi", wikiTitle: "Marcos_Senesi", position: "Defender", nationality: "Argentina", dateOfBirth: "1997-05-10", teamSlug: "afc-bournemouth", jerseyNumber: null },
  { name: "David Brooks", wikiTitle: "David_Brooks", position: "Midfielder", nationality: "Wales", dateOfBirth: "1997-06-08", teamSlug: "afc-bournemouth", jerseyNumber: null },

  // Genoa (adds to Frendrup)
  { name: "Nicola Leali", wikiTitle: "Nicola_Leali", position: "Goalkeeper", nationality: "Italy", dateOfBirth: "1990-03-06", teamSlug: "genoa", jerseyNumber: null },
  { name: "Aaron Martín", wikiTitle: "Aaron_Mart%C3%ADn", position: "Defender", nationality: "Spain", dateOfBirth: "1997-09-23", teamSlug: "genoa", jerseyNumber: null },
  { name: "Milan Badelj", wikiTitle: "Milan_Badelj", position: "Midfielder", nationality: "Croatia", dateOfBirth: "1989-02-25", teamSlug: "genoa", jerseyNumber: null },

  // Cagliari (adds to Yerry Mina)
  { name: "Elia Caprile", wikiTitle: "Elia_Caprile", position: "Goalkeeper", nationality: "Italy", dateOfBirth: "2001-11-09", teamSlug: "cagliari", jerseyNumber: 1 },
  { name: "Gabriele Zappa", wikiTitle: "Gabriele_Zappa", position: "Defender", nationality: "Italy", dateOfBirth: "1999-01-28", teamSlug: "cagliari", jerseyNumber: null },
  { name: "Nadir Zortea", wikiTitle: "Nadir_Zortea", position: "Defender", nationality: "Italy", dateOfBirth: "1999-07-19", teamSlug: "cagliari", jerseyNumber: null },
  { name: "Roberto Piccoli", wikiTitle: "Roberto_Piccoli", position: "Forward", nationality: "Italy", dateOfBirth: "2001-10-27", teamSlug: "cagliari", jerseyNumber: null },

  // Parma (adds to Bernabé)
  { name: "Zion Suzuki", wikiTitle: "Zion_Suzuki", position: "Goalkeeper", nationality: "Japan", dateOfBirth: "2002-08-21", teamSlug: "parma", jerseyNumber: 1 },
  { name: "Emanuele Valeri", wikiTitle: "Emanuele_Valeri", position: "Defender", nationality: "Italy", dateOfBirth: "1997-01-10", teamSlug: "parma", jerseyNumber: null },
  { name: "Simon Sohm", wikiTitle: "Simon_Sohm", position: "Midfielder", nationality: "Switzerland", dateOfBirth: "2001-07-01", teamSlug: "parma", jerseyNumber: null },
  { name: "Ange-Yoan Bonny", wikiTitle: "Ange-Yoan_Bonny", position: "Forward", nationality: "France", dateOfBirth: "2004-01-04", teamSlug: "parma", jerseyNumber: null },

  // Lecce (adds to Gallo)
  { name: "Wladimiro Falcone", wikiTitle: "Wladimiro_Falcone", position: "Goalkeeper", nationality: "Italy", dateOfBirth: "1995-04-12", teamSlug: "lecce", jerseyNumber: null },
  { name: "Federico Baschirotto", wikiTitle: "Federico_Baschirotto", position: "Defender", nationality: "Italy", dateOfBirth: "1997-01-19", teamSlug: "lecce", jerseyNumber: null },
  { name: "Ylber Ramadani", wikiTitle: "Ylber_Ramadani", position: "Midfielder", nationality: "Albania", dateOfBirth: "1996-01-30", teamSlug: "lecce", jerseyNumber: null },
  { name: "Nikola Krstović", wikiTitle: "Nikola_Krstovi%C4%87", position: "Forward", nationality: "Montenegro", dateOfBirth: "2000-03-24", teamSlug: "lecce", jerseyNumber: null },

  // Sassuolo (adds to Berardi)
  { name: "Stefano Turati", wikiTitle: "Stefano_Turati", position: "Goalkeeper", nationality: "Italy", dateOfBirth: "2001-09-15", teamSlug: "sassuolo", jerseyNumber: 1 },
  { name: "Josh Doig", wikiTitle: "Josh_Doig", position: "Defender", nationality: "Scotland", dateOfBirth: "2002-01-18", teamSlug: "sassuolo", jerseyNumber: null },
  { name: "Armand Laurienté", wikiTitle: "Armand_Laurient%C3%A9", position: "Forward", nationality: "France", dateOfBirth: "1999-08-25", teamSlug: "sassuolo", jerseyNumber: null },

  // Strasbourg (adds to Emegha)
  { name: "Guela Doué", wikiTitle: "Guela_Dou%C3%A9", position: "Defender", nationality: "Ivory Coast", dateOfBirth: "2002-10-05", teamSlug: "strasbourg", jerseyNumber: null },
  { name: "Habib Diallo", wikiTitle: "Habib_Diallo", position: "Forward", nationality: "Senegal", dateOfBirth: "1995-01-18", teamSlug: "strasbourg", jerseyNumber: null },
  { name: "Sebastian Nanasi", wikiTitle: "Sebastian_Nanasi", position: "Midfielder", nationality: "Sweden", dateOfBirth: "2003-04-16", teamSlug: "strasbourg", jerseyNumber: null },

  // Toulouse (adds to Dønnum)
  { name: "Guillaume Restes", wikiTitle: "Guillaume_Restes", position: "Goalkeeper", nationality: "France", dateOfBirth: "2004-01-30", teamSlug: "toulouse", jerseyNumber: null },
  { name: "Rasmus Nicolaisen", wikiTitle: "Rasmus_Nicolaisen", position: "Defender", nationality: "Denmark", dateOfBirth: "1997-07-17", teamSlug: "toulouse", jerseyNumber: null },
  { name: "Thijs Dallinga", wikiTitle: "Thijs_Dallinga", position: "Forward", nationality: "Netherlands", dateOfBirth: "2000-04-05", teamSlug: "toulouse", jerseyNumber: null },

  // Stade Brestois (adds to Lees-Melou)
  { name: "Marco Bizot", wikiTitle: "Marco_Bizot", position: "Goalkeeper", nationality: "Netherlands", dateOfBirth: "1991-03-10", teamSlug: "stade-brestois", jerseyNumber: null },
  { name: "Bradley Locko", wikiTitle: "Bradley_Locko", position: "Defender", nationality: "France", dateOfBirth: "2002-11-12", teamSlug: "stade-brestois", jerseyNumber: null },
  { name: "Romain Del Castillo", wikiTitle: "Romain_Del_Castillo", position: "Forward", nationality: "France", dateOfBirth: "1996-03-23", teamSlug: "stade-brestois", jerseyNumber: null },

  // AJ Auxerre (adds to Sinayoko)
  { name: "Donovan Léon", wikiTitle: "Donovan_L%C3%A9on", position: "Goalkeeper", nationality: "France", dateOfBirth: "1993-01-30", teamSlug: "aj-auxerre", jerseyNumber: null },
  { name: "Jubal", wikiTitle: "Jubal_(footballer)", position: "Defender", nationality: "Brazil", dateOfBirth: "1996-02-25", teamSlug: "aj-auxerre", jerseyNumber: null },
  { name: "Gideon Mensah", wikiTitle: "Gideon_Mensah", position: "Defender", nationality: "Ghana", dateOfBirth: "1998-01-18", teamSlug: "aj-auxerre", jerseyNumber: null },

  // SC Braga (adds to Horta)
  { name: "Vítor Tormena", wikiTitle: "V%C3%ADtor_Tormena", position: "Defender", nationality: "Brazil", dateOfBirth: "1998-08-06", teamSlug: "sc-braga", jerseyNumber: null },
  { name: "Fran Navarro", wikiTitle: "Fran_Navarro", position: "Forward", nationality: "Spain", dateOfBirth: "1998-01-06", teamSlug: "sc-braga", jerseyNumber: null },
  { name: "André Castro", wikiTitle: "Andr%C3%A9_Castro_(footballer)", position: "Midfielder", nationality: "Portugal", dateOfBirth: "1989-04-11", teamSlug: "sc-braga", jerseyNumber: null },
];

interface PlayerStatUpdate {
  name: string;
  /** Matched against the player's existing slug - this only updates
   * players already imported, it never creates new ones. */
  slug: string;
  stats?: { appearances: number; goals: number; assists: number };
  cleanSheets?: number;
}

// Real, verified 2025-26 season stats (all competitions, cross-checked
// against Wikipedia's season-summary infobox plus at least one stats
// site) for players already imported in earlier batches. Only added
// here where every field could be confirmed - see the note on each
// entry for players that were checked but skipped instead of guessed.
const PLAYER_STAT_UPDATES: PlayerStatUpdate[] = [
  // Verified via Wikipedia's "2025-26 Real Madrid CF season" article
  // (League: 25 goals, All: 42 goals) cross-checked against
  // MadridXtra's by-competition breakdown, which sums to the same
  // totals (31+11+1+1=44 apps, 25+15+2+0=42 goals).
  { name: "Kylian Mbappé", slug: "kylian-mbappe", stats: { appearances: 44, goals: 42, assists: 6 } },
  // Cristiano Ronaldo (Al-Nassr), Mohamed Salah (Liverpool), and
  // Bukayo Saka (Arsenal) were all checked this round too - each had
  // at least one figure (all-competition appearances or assists,
  // usually) that conflicted across sources or wasn't confirmable
  // cleanly, so per the never-guess rule they're intentionally left
  // out rather than filled in with a best guess. Re-check these once
  // the football-data.org cron job (queue item #7) is live, since
  // that will give one authoritative source instead of stitching
  // together stats-site snapshots by hand.
];

async function fixBrokenSlugs(
  setLog: Dispatch<SetStateAction<LogEntry[]>>,
  setIsRunning: Dispatch<SetStateAction<boolean>>
) {
  setIsRunning(true);
  setLog([{ name: "Scanning every collection for slugs affected by the old bug...", status: "pending" }]);

  // Every collection that gets a slug on import, and how that slug was
  // originally derived - kept in sync with the importer functions above.
  const collections: { name: string; deriveSlug: (doc: Record<string, unknown>) => string }[] = [
    { name: "players", deriveSlug: (doc) => slugify(String(doc.name ?? "")) },
    { name: "teams", deriveSlug: (doc) => slugify(String(doc.name ?? "")) },
    { name: "leagues", deriveSlug: (doc) => slugify(String(doc.name ?? "")) },
    { name: "articles", deriveSlug: (doc) => slugify(String(doc.title ?? "")) },
    { name: "quizzes", deriveSlug: (doc) => slugify(String(doc.title ?? "")) },
    { name: "shortUpdates", deriveSlug: (doc) => slugify(String(doc.text ?? "")).slice(0, 60) },
  ];

  type Fix = { collection: string; id: string; label: string; oldSlug: string; newSlug: string };
  const fixes: Fix[] = [];

  for (const { name, deriveSlug } of collections) {
    try {
      const docs = await getCollectionDocs<Record<string, unknown>>(name);
      for (const doc of docs) {
        const correctSlug = deriveSlug(doc);
        const currentSlug = String(doc.slug ?? "");
        if (correctSlug && correctSlug !== currentSlug) {
          fixes.push({
            collection: name,
            id: String(doc.id),
            label: String(doc.name ?? doc.title ?? doc.text ?? doc.id).slice(0, 50),
            oldSlug: currentSlug,
            newSlug: correctSlug,
          });
        }
      }
    } catch {
      // A collection-level fetch failure shouldn't block checking the rest.
    }
  }

  if (fixes.length === 0) {
    setLog([{ name: "No broken slugs found", status: "skipped", message: "everything already matches" }]);
    setIsRunning(false);
    return;
  }

  setLog(fixes.map((f) => ({ name: `${f.collection}: ${f.label}`, status: "pending" })));

  for (let i = 0; i < fixes.length; i++) {
    const fix = fixes[i];
    try {
      await updateDocumentById(fix.collection, fix.id, { slug: fix.newSlug });
      setLog((prev) =>
        prev.map((e, idx) =>
          idx === i ? { ...e, status: "success", message: `${fix.oldSlug} -> ${fix.newSlug}` } : e
        )
      );
    } catch (err) {
      setLog((prev) =>
        prev.map((e, idx) =>
          idx === i ? { ...e, status: "error", message: (err as Error).message } : e
        )
      );
    }
    await delay(300);
  }
  setIsRunning(false);
}

async function updatePlayerStats(
  updates: PlayerStatUpdate[],
  setLog: Dispatch<SetStateAction<LogEntry[]>>,
  setIsImporting: Dispatch<SetStateAction<boolean>>
) {
  setIsImporting(true);
  setLog(updates.map((u) => ({ name: u.name, status: "pending" })));

  for (let i = 0; i < updates.length; i++) {
    const update = updates[i];
    try {
      const existing = await getDocumentBySlug<{ id: string }>("players", update.slug);
      if (!existing) {
        setLog((prev) =>
          prev.map((e, idx) =>
            idx === i ? { ...e, status: "error", message: "player not found - import them first" } : e
          )
        );
        continue;
      }

      const data: { stats?: Record<string, number>; cleanSheets?: number } = {};
      if (update.stats) data.stats = update.stats;
      if (update.cleanSheets !== undefined) data.cleanSheets = update.cleanSheets;

      await updateDocumentById("players", existing.id, data);

      setLog((prev) => prev.map((e, idx) => (idx === i ? { ...e, status: "success" } : e)));
    } catch (err) {
      setLog((prev) =>
        prev.map((e, idx) =>
          idx === i ? { ...e, status: "error", message: (err as Error).message } : e
        )
      );
    }
    await delay(400);
  }
  setIsImporting(false);
}

interface ShortUpdateSeed {
  text: string;
  /** Optional - when set, a real Wikipedia photo is attached for
   * visual variety. Text-only hot takes are just as real either way. */
  wikiTitle?: string;
}

// Real, current, opinion-style hot takes (not fabricated stats) tied
// to storylines already reflected in the imported squads above - the
// Rodri/Barcelona move, Isak and Wirtz at Liverpool, Gyökeres at
// Arsenal, De Bruyne and McTominay at Napoli, Ronaldo at Al-Nassr.
const HOT_TAKES: ShortUpdateSeed[] = [
  {
    text: "Rodri to Barcelona might be the most underrated transfer of the summer. He doesn't just sit in front of the back four - he changes how the whole midfield breathes.",
    wikiTitle: "Rodri",
  },
  {
    text: "Alexander Isak walking straight into Liverpool's front line and making it look effortless is exactly why Anfield paid what they paid.",
    wikiTitle: "Alexander_Isak",
  },
  {
    text: "Cristiano Ronaldo is still doing this at Al-Nassr. At some point we have to stop calling it 'keeping fit' and start calling it what it actually is: freakish.",
    wikiTitle: "Cristiano_Ronaldo",
  },
  {
    text: "Kevin De Bruyne walking into Napoli and immediately looking like the best passer in Serie A was never going to be a surprise. It's just what he does.",
    wikiTitle: "Kevin_De_Bruyne",
  },
  {
    text: "Viktor Gyökeres to Arsenal is the kind of signing that looks obvious in hindsight. Nobody was talking about him enough before this summer.",
    wikiTitle: "Viktor_Gy%C3%B6keres",
  },
  {
    text: "Unpopular opinion: Lamine Yamal is already more decisive in big moments than most senior internationals twice his age. The hype stopped being hype a while ago - it's just accurate now.",
    wikiTitle: "Lamine_Yamal",
  },
  {
    text: "Scott McTominay at Napoli might be the most disrespected 'genuinely one of the best in the league' case in recent Serie A memory.",
    wikiTitle: "Scott_McTominay",
  },
  {
    text: "Florian Wirtz to Liverpool didn't get talked about enough this summer - and he's about to make people regret that.",
    wikiTitle: "Florian_Wirtz",
  },
  {
    text: "If Erling Haaland scores 40+ again this season and City still don't win the league, that should tell you everything about where the actual gap is.",
    wikiTitle: "Erling_Haaland",
  },
  {
    text: "Jude Bellingham doesn't get enough credit for how he's adapted his game to fit around Mbappé and Vinícius instead of competing with them for headlines.",
    wikiTitle: "Jude_Bellingham",
  },
  {
    text: "The Saudi Pro League stopped being a punchline the moment Cristiano Ronaldo extended and meant it. Say what you want about the football - the ambition is real.",
  },
  {
    text: "Underrated storyline of the season so far: Napoli quietly building one of the most balanced squads in Serie A without the loudest transfer business.",
  },
  {
    text: "The real winner of this transfer window wasn't a striker. It was Barcelona's midfield the moment Rodri signed his name.",
  },
  {
    text: "Hot take nobody asked for: watching a fullback bomb forward every 90 seconds is more entertaining than 90% of the 'false nine' tactical trends of the last five years.",
  },
];

// Batch 2 - more real, current storylines for the Hot Takes feed,
// including Arsenal's actual 2025-26 Premier League title (their
// first in over two decades) and Haaland's Golden Boot that same
// season - both confirmed, not fabricated.
const HOT_TAKES_BATCH_2: ShortUpdateSeed[] = [
  {
    text: "Arsenal ending their title drought in 2025-26 wasn't luck. It was years of squad-building finally lining up at the same time - and it should scare the rest of the league that this group is still getting better.",
    wikiTitle: "Bukayo_Saka",
  },
  {
    text: "Erling Haaland winning the Golden Boot again is almost boring to say out loud at this point - which is exactly what makes it remarkable. Consistency at this level doesn't get old, even when it stops being surprising.",
    wikiTitle: "Erling_Haaland",
  },
  {
    text: "David Raya quietly having one of the best goalkeeping seasons in the league doesn't get talked about enough because he doesn't make highlight-reel saves. Clean sheets don't trend on their own.",
    wikiTitle: "David_Raya",
  },
  {
    text: "Antoine Semenyo's move to Manchester City for a British-record fee is the kind of transfer people will point back to in three years as either a masterstroke or a cautionary tale. No in-between with fees like that.",
  },
  {
    text: "Napoli built a genuinely balanced squad without one single transfer that dominated headlines all summer. That's harder to pull off than spending big on one marquee name.",
  },
  {
    text: "Real Madrid's front four might be unfair. Mbappé, Vinícius, Bellingham and Rodrygo rotating through the same attack should not be legal in a competitive league.",
    wikiTitle: "Vin%C3%ADcius_J%C3%BAnior",
  },
  {
    text: "Unpopular opinion: VAR has made refereeing more accurate and less trusted at the same time. Both things are true and nobody wants to sit with that.",
  },
  {
    text: "Goalkeepers being expected to play like an extra midfielder now is one of the most underrated shifts in modern football. The job description changed and most fans still haven't caught up.",
  },
  {
    text: "Lamine Yamal, Endrick and Franco Mastantuono breaking into first teams this young isn't a coincidence anymore - it's a sign of how much earlier top clubs are willing to trust talent now.",
    wikiTitle: "Endrick_(footballer,_born_2006)",
  },
  {
    text: "GPS tracking data quietly changed player development more than any tactical trend of the last decade. Clubs know exactly how hard someone worked in training now - there's nowhere left to hide.",
  },
  {
    text: "Every summer someone says 'the transfer window is out of control' and every summer the fees go up anyway. At some point we have to admit this is just what the market is now.",
  },
  {
    text: "The most underrated skill in modern football isn't dribbling or finishing - it's positional discipline without the ball. The best teams win the game before their striker even touches it.",
  },
];

// Batch 3 - sharper, funnier, more current tone with real fan-culture
// energy (emojis included). Still opinion/banter, not fabricated
// claims about real people - the same tone sports media and fan
// accounts actually use, not attacks on anyone's character.
const HOT_TAKES_BATCH_3: ShortUpdateSeed[] = [
  {
    text: "Erling Haaland gets a haircut and suddenly can't score for two games straight. We're not saying it's the Samson effect... but we're also not NOT saying it 💇‍♂️⚡",
    wikiTitle: "Erling_Haaland",
  },
  {
    text: "Cristiano Ronaldo turning 41, still winning the Saudi Pro League Golden Boot AND the actual title in the same season is disrespectful behavior at this point 😤👑",
    wikiTitle: "Cristiano_Ronaldo",
  },
  {
    text: "VAR checking a goal for 4 minutes just to disallow it by 2cm isn't 'accuracy'. It's just slower heartbreak with extra steps. 📏💔",
  },
  {
    text: "Some of these 'tactical geniuses' on football Twitter couldn't coach a Sunday league team but will absolutely explain why a manager who's won trophies this season doesn't know football. 🎙️😅",
  },
  {
    text: "Bench players celebrating a goal like they scored it themselves is one of football's most underrated joys. Never change. 🪑🎉",
  },
  {
    text: "A striker misses an open net from two yards and somehow the fullback who assisted it gets blamed too. Football logic is unhinged sometimes. 🤷",
  },
  {
    text: "Every transfer deadline day has one fan refreshing their timeline every 30 seconds for a signing that was never actually close. We've all been that fan. 📱😩",
  },
  {
    text: "Managers get sacked after six games but clubs stay loyal to a striker who hasn't scored since March. The inconsistency in this sport is wild. 📉",
  },
  {
    text: "Nothing tests a friendship like one mate supporting the rival club during derby week. Absolutely nothing. ⚔️😬",
  },
  {
    text: "A player scores against his former club, does the 'no celebration' thing, and somehow wins both the internet's respect AND disrespect in the same ten seconds. Iconic energy, every single time. 🤐🔥",
  },
  {
    text: "Arsenal fans waited over two decades for a Premier League title and some of them still found something to complain about within a week of winning it. Never change, Arsenal Twitter. 🔴😂",
    wikiTitle: "Bukayo_Saka",
  },
  {
    text: "The transfer rumor mill will have a player 'in advanced talks' with four different clubs on the same day, and somehow all four sets of fans believe it's basically done. 📰🤡",
  },
];

interface ArticleSeed {
  title: string;
  excerpt: string;
  body: string;
  imageWikiTitle?: string;
}

const ARTICLES: ArticleSeed[] = [
  {
    title: "Spain Win Record Second World Cup Title After Thrilling Final",
    excerpt:
      "Ferran Torres scored a 106th-minute winner as Spain edged Argentina 1-0 in New Jersey to claim the 2026 FIFA World Cup.",
    body: `Spain are world champions for the second time in their history after a dramatic 1-0 extra-time win over Argentina in the 2026 FIFA World Cup final at MetLife Stadium in New Jersey on 19 July 2026.

The breakthrough came seven minutes into the second period of extra time. Substitute Ferran Torres, who had only entered the match in the 62nd minute, pounced on a bouncing ball inside the box and finished with his left foot to send the Spanish bench into delirium.

It was a game Spain dominated for long stretches, outshooting Argentina 20-3 across the 120 minutes, but they were repeatedly denied by a heroic performance from Argentina goalkeeper Emiliano Martínez, who finished the match with 12 saves - the most by any goalkeeper in a World Cup final.

Argentina were reduced to ten men late on after Enzo Fernández picked up a second yellow card in stoppage time, and although Lamine Yamal had a late free-kick chance to win it in normal time, Martínez was equal to it.

Spain captain Rodri lifted the trophy in front of a crowd of more than 80,000, sealing a run that has now stretched to 38 matches unbeaten, a streak that also includes their UEFA Euro 2024 triumph. It is Spain's second World Cup title, following their first in 2010.

Elsewhere in the closing stages of the tournament, England claimed third place with a remarkable 6-4 win over France in the bronze final, with Bukayo Saka scoring a hat-trick in an end-to-end thriller in Miami.`,
    imageWikiTitle: "2026_FIFA_World_Cup",
  },
  {
    title: "World Cup Winners: Every Champion in Tournament History",
    excerpt:
      "From Uruguay's inaugural triumph in 1930 to Spain's second title in 2026, here's every nation to have been crowned world champions.",
    body: `The FIFA World Cup has crowned a champion every tournament since it began in 1930 (with the exception of 1942 and 1946, cancelled due to the Second World War). Brazil remain the most successful nation in the competition's history with five titles, followed by Germany and Italy with four each.

Spain's win in 2026 makes them the ninth different nation to lift the trophy, joining an exclusive club that includes Uruguay, Italy, England, West Germany/Germany, Argentina, France, and Brazil.

Notable moments across World Cup history include Brazil's 1970 side, widely regarded as one of the greatest teams ever assembled, France's back-to-back final appearances either side of their 2018 win, and Argentina's emotional 2022 triumph inspired by Lionel Messi in what was widely expected to be his final World Cup.

The tournament continues to grow, with the 2026 edition being the first to feature 48 teams and the first to be jointly hosted by three nations: the United States, Mexico, and Canada. The next World Cup is scheduled for 2030, to be held across Spain, Portugal, and Morocco, with additional centenary matches played in Uruguay, Argentina, and Paraguay.`,
    imageWikiTitle: "FIFA_World_Cup_Trophy",
  },
  {
    title: "What to Watch in the 2026-27 Transfer Window",
    excerpt:
      "With the summer transfer window open across Europe's top leagues, here's what fans should keep an eye on this window.",
    body: `The 2026-27 transfer window is now open across most of Europe's major leagues, with clubs racing to strengthen their squads before deadlines land between late August and mid-September depending on the competition.

The Premier League and EFL clubs face the earliest deadline this year, with their window closing on 1 September, while La Liga, Serie A, and the Saudi Pro League have slightly later cut-off dates. As always, expect a flurry of late activity as deadline day approaches, with loan deals and free-agent signings often completed in the final hours.

Clubs coming off strong domestic campaigns will be looking to build on their momentum, while newly promoted sides across the Premier League, La Liga, and other top divisions will be under pressure to recruit smartly in order to compete at a higher level.

As ever, DG Tribune will be tracking the biggest moves, medical news, and deadline-day drama as it happens - check back through the season for updates.`,
    imageWikiTitle: "Association_football",
  },
  {
    title: "Understanding VAR: How Football's Most Debated Technology Works",
    excerpt:
      "Love it or hate it, VAR is now part of the modern game. Here's a plain-language breakdown of how it actually works.",
    body: `The Video Assistant Referee, or VAR, has been part of top-flight football since the late 2010s, and it remains one of the most debated additions the sport has ever seen. Here's how it actually works.

VAR is a team of officials watching the match from a separate video operations room, with access to multiple camera angles and replay technology. Their job isn't to review every decision - only to intervene on "clear and obvious errors" in four specific situations: goals, penalty decisions, direct red cards, and cases of mistaken identity.

When a possible error is flagged, the VAR team communicates with the on-field referee, who can either accept the recommendation or go to a pitch-side monitor to review the incident themselves before making a final call. The on-field referee always has the final say.

Common criticisms include the length of delays, inconsistency in what counts as a "clear and obvious" error (especially for marginal offside calls), and the disruption to the emotional flow of celebrating a goal. Supporters argue it has eliminated many of the most blatant officiating errors that used to decide matches.

Whatever your view, VAR isn't going anywhere soon - most major leagues and international tournaments, including the World Cup, now use it as standard.`,
    imageWikiTitle: "Video_assistant_referee",
  },
  {
    title: "The Ballon d'Or Explained: Football's Most Prestigious Individual Award",
    excerpt:
      "Awarded every year since 1956, the Ballon d'Or is football's answer to an Oscar. Here's what it is and how winners are chosen.",
    body: `The Ballon d'Or ("Golden Ball") is awarded annually to the player judged to have performed the best over the previous season. First handed out in 1956 by France Football magazine, it has grown into the most prestigious individual honor in football.

The winner is decided by a panel of journalists from around the world, who vote based on individual performance, team success, and overall influence on the game across the eligible period. Since 2007, the men's award has been complemented by a women's Ballon d'Or, first awarded in 2018, recognizing the best performer in the women's game.

Lionel Messi holds the record with the most Ballon d'Or wins in history, well clear of any other player, with Cristiano Ronaldo the closest challenger among modern greats. Beyond the main prize, the ceremony also hands out awards including the Kopa Trophy (best young player) and the Yashin Trophy (best goalkeeper).

The award isn't without controversy - debates over whether individual brilliance or team trophies should matter more are a near-annual tradition among fans, but it remains the accolade every top player dreams of lifting.`,
    imageWikiTitle: "Ballon_d%27Or",
  },
];

interface QuizSeed {
  title: string;
  description: string;
  /** Real Wikipedia image (trophy/logo/crest) used as the quiz's cover thumbnail. */
  wikiTitle: string;
  questions: {
    question: string;
    options: string[];
    correctOptionIndex: number;
  }[];
}

const QUIZZES: QuizSeed[] = [
  {
    title: "World Cup Legends Quiz",
    description: "Think you know your World Cup history? Test yourself on the tournament's biggest moments and winners.",
    wikiTitle: "FIFA_World_Cup_Trophy",
    questions: [
      { question: "Which country won the 2026 FIFA World Cup?", options: ["Argentina", "Spain", "France", "England"], correctOptionIndex: 1 },
      { question: "Who scored the winning goal in the 2026 World Cup final?", options: ["Lamine Yamal", "Ferran Torres", "Pedri", "Rodri"], correctOptionIndex: 1 },
      { question: "Which nation has won the most World Cup titles?", options: ["Germany", "Italy", "Brazil", "Argentina"], correctOptionIndex: 2 },
      { question: "Who won the 2022 World Cup in Qatar?", options: ["France", "Argentina", "Brazil", "Croatia"], correctOptionIndex: 1 },
      { question: "Which three countries jointly hosted the 2026 World Cup?", options: ["USA, Mexico, Canada", "Spain, Portugal, Morocco", "Germany, France, Belgium", "Brazil, Argentina, Uruguay"], correctOptionIndex: 0 },
      { question: "Which country won the first-ever World Cup in 1930?", options: ["Brazil", "Uruguay", "Italy", "Argentina"], correctOptionIndex: 1 },
      { question: "Who scored a hat-trick in the 2022 World Cup final?", options: ["Lionel Messi", "Kylian Mbappé", "Ángel Di María", "Olivier Giroud"], correctOptionIndex: 1 },
      { question: "In what year did England win their only World Cup?", options: ["1966", "1970", "1982", "1990"], correctOptionIndex: 0 },
      { question: "Which goalkeeper made 12 saves in the 2026 World Cup final, the most ever in a final?", options: ["Unai Simón", "Emiliano Martínez", "Thibaut Courtois", "Alisson"], correctOptionIndex: 1 },
      { question: "Which countries will jointly host the 2030 World Cup?", options: ["USA, Mexico, Canada", "Spain, Portugal, Morocco", "Germany, France, Belgium", "Japan, South Korea, China"], correctOptionIndex: 1 },
      { question: "Which player has scored the most goals in World Cup history?", options: ["Ronaldo Nazário", "Miroslav Klose", "Pelé", "Gerd Müller"], correctOptionIndex: 1 },
      { question: "Which country hosted the first World Cup held in Asia?", options: ["Japan", "South Korea", "Both South Korea and Japan", "China"], correctOptionIndex: 2 },
      { question: "Who was the top scorer at the 2018 World Cup in Russia?", options: ["Kylian Mbappé", "Harry Kane", "Antoine Griezmann", "Romelu Lukaku"], correctOptionIndex: 1 },
      { question: "Which country won the 2014 World Cup, held in Brazil?", options: ["Argentina", "Netherlands", "Germany", "Brazil"], correctOptionIndex: 2 },
      { question: "Brazil suffered a famous 7-1 semi-final defeat at the 2014 World Cup - to which country?", options: ["Argentina", "Germany", "Netherlands", "Colombia"], correctOptionIndex: 1 },
      { question: "Which was the first World Cup to use VAR (Video Assistant Referee)?", options: ["2014 Brazil", "2018 Russia", "2022 Qatar", "2010 South Africa"], correctOptionIndex: 1 },
      { question: "Who captained Argentina to their 2022 World Cup title?", options: ["Ángel Di María", "Lionel Messi", "Rodrigo De Paul", "Emiliano Martínez"], correctOptionIndex: 1 },
      { question: "Which country has won the second-most World Cup titles, with 4?", options: ["Argentina", "Germany", "Italy", "Uruguay"], correctOptionIndex: 2 },
      { question: "In which country was the 2010 World Cup held, the first on African soil?", options: ["Egypt", "Nigeria", "South Africa", "Morocco"], correctOptionIndex: 2 },
      { question: "Which player won the Golden Ball as the best player of the 2022 World Cup?", options: ["Kylian Mbappé", "Lionel Messi", "Luka Modrić", "Julián Álvarez"], correctOptionIndex: 1 },
      { question: "How many teams competed in the 2026 World Cup, an expanded format from previous tournaments?", options: ["32", "40", "48", "64"], correctOptionIndex: 2 },
      { question: "Which country did West Germany beat to win the 1990 World Cup final?", options: ["Italy", "Argentina", "Brazil", "England"], correctOptionIndex: 1 },
      { question: "Who is the youngest player to ever score in a World Cup final?", options: ["Pelé", "Kylian Mbappé", "Diego Maradona", "Lamine Yamal"], correctOptionIndex: 0 },
      { question: "Which country won the World Cup on home soil in 1998?", options: ["Italy", "Brazil", "France", "Germany"], correctOptionIndex: 2 },
      { question: "What is the trophy awarded to the World Cup winners called?", options: ["The Jules Rimet Trophy", "The FIFA World Cup Trophy", "The Golden Cup", "The World Championship Cup"], correctOptionIndex: 1 },
      { question: "Who won the Golden Boot as the 2026 World Cup's top scorer, becoming the first man to win it twice?", options: ["Lionel Messi", "Erling Haaland", "Kylian Mbappé", "Harry Kane"], correctOptionIndex: 2 },
      { question: "Who was named the 2026 World Cup's best player, winning the Golden Ball?", options: ["Rodri", "Lamine Yamal", "Kylian Mbappé", "Pedri"], correctOptionIndex: 0 },
      { question: "England beat France 6-4 in an end-to-end 2026 World Cup third-place play-off, with a hat-trick from which player?", options: ["Jude Bellingham", "Bukayo Saka", "Harry Kane", "Cole Palmer"], correctOptionIndex: 1 },
      { question: "Which player holds the record for most goals scored in a single World Cup tournament, with 13 in 1958?", options: ["Pelé", "Just Fontaine", "Gerd Müller", "Sándor Kocsis"], correctOptionIndex: 1 },
      { question: "Which country hosted the 1994 World Cup, the only time the tournament has been held in the United States (until 2026)?", options: ["Mexico", "Canada", "USA", "Brazil"], correctOptionIndex: 2 },
      { question: "Which player scored the fastest goal in World Cup history, in just 10.8 seconds against South Korea in 2002?", options: ["Hakan Şükür", "Vaclav Masek", "Bryan Robson", "Ernst Lehner"], correctOptionIndex: 0 },
      { question: "Which country won the World Cup on home soil in 1978?", options: ["Brazil", "Argentina", "Uruguay", "Chile"], correctOptionIndex: 1 },
      { question: "Which country has never won a World Cup despite reaching the final three times, including 1974, 1978, and 2010?", options: ["Netherlands", "Sweden", "Hungary", "Portugal"], correctOptionIndex: 0 },
      { question: "Which 1994 World Cup final was the first ever decided by a penalty shootout after a scoreless draw?", options: ["Brazil vs Italy", "Brazil vs Argentina", "Germany vs Italy", "Brazil vs Netherlands"], correctOptionIndex: 0 },
      { question: "Diego Maradona's famous 'Goal of the Century' at the 1986 World Cup came in a match against which country?", options: ["England", "West Germany", "Belgium", "Italy"], correctOptionIndex: 0 },
    ],
  },
  {
    title: "Premier League History Quiz",
    description: "From the competition's founding to its modern era, how well do you know Premier League history?",
    wikiTitle: "Premier_League",
    questions: [
      { question: "In what year was the Premier League founded?", options: ["1988", "1992", "1995", "2000"], correctOptionIndex: 1 },
      { question: "Which club has won the most Premier League titles?", options: ["Arsenal", "Chelsea", "Manchester United", "Liverpool"], correctOptionIndex: 2 },
      { question: "Which club went unbeaten through a Premier League season in 2003-04?", options: ["Chelsea", "Arsenal", "Manchester United", "Liverpool"], correctOptionIndex: 1 },
      { question: "Which club were relegated at the end of the 2025-26 season alongside Burnley and Wolves?", options: ["West Ham", "Everton", "Leicester City", "Southampton"], correctOptionIndex: 0 },
      { question: "Which clubs were promoted to the Premier League for the 2026-27 season?", options: ["Coventry, Ipswich, Hull", "Leeds, Burnley, Sunderland", "Norwich, Watford, Stoke", "Luton, Southampton, Leicester"], correctOptionIndex: 0 },
      { question: "Who is the Premier League's all-time top scorer?", options: ["Wayne Rooney", "Alan Shearer", "Harry Kane", "Thierry Henry"], correctOptionIndex: 1 },
      { question: "Which manager has won the most Premier League titles?", options: ["Arsène Wenger", "Pep Guardiola", "Sir Alex Ferguson", "José Mourinho"], correctOptionIndex: 2 },
      { question: "Which club won the first-ever Premier League title in 1992-93?", options: ["Arsenal", "Manchester United", "Blackburn Rovers", "Leeds United"], correctOptionIndex: 1 },
      { question: "Which club is nicknamed 'The Gunners'?", options: ["Chelsea", "Arsenal", "Tottenham", "West Ham"], correctOptionIndex: 1 },
      { question: "Which stadium has the largest capacity in the Premier League?", options: ["Emirates Stadium", "Anfield", "Old Trafford", "Tottenham Hotspur Stadium"], correctOptionIndex: 2 },
      { question: "Which club completed the 'Invincibles' unbeaten league season in 2003-04?", options: ["Chelsea", "Manchester United", "Arsenal", "Liverpool"], correctOptionIndex: 2 },
      { question: "Leicester City's 2015-16 title win is considered one of sport's greatest upsets - what were their odds at the start of that season?", options: ["500-1", "1000-1", "5000-1", "100-1"], correctOptionIndex: 2 },
      { question: "Who holds the record for most Premier League assists?", options: ["Cesc Fàbregas", "Ryan Giggs", "Kevin De Bruyne", "Wayne Rooney"], correctOptionIndex: 2 },
      { question: "Which club did Manchester City overtake for most Premier League points in a single season (2017-18, 100 points)?", options: ["Chelsea (2004-05)", "Manchester United (1999-2000)", "Arsenal (2003-04)", "Liverpool (2019-20)"], correctOptionIndex: 0 },
      { question: "Which player has made the most Premier League appearances?", options: ["Ryan Giggs", "Gareth Barry", "Frank Lampard", "James Milner"], correctOptionIndex: 1 },
      { question: "What is the record for most goals scored by a single team in a Premier League season?", options: ["100 (Chelsea)", "106 (Manchester City)", "95 (Liverpool)", "103 (Manchester City)"], correctOptionIndex: 3 },
      { question: "Which club was the first to win the Premier League title having previously been outside the top flight, gaining promotion first?", options: ["Blackburn Rovers", "Leicester City", "Nottingham Forest", "Ipswich Town"], correctOptionIndex: 1 },
      { question: "In the Premier League's first season (1992-93), how many clubs competed?", options: ["20", "22", "18", "24"], correctOptionIndex: 1 },
      { question: "Which manager led Chelsea to their first Premier League title in 2004-05?", options: ["Claudio Ranieri", "José Mourinho", "Carlo Ancelotti", "Avram Grant"], correctOptionIndex: 1 },
      { question: "What is the fastest goal ever scored in Premier League history?", options: ["7.4 seconds, by Shane Long", "9.7 seconds, by Sadio Mané", "2.5 seconds, by Ledley King", "10.4 seconds, by Alan Shearer"], correctOptionIndex: 0 },
      { question: "Which two clubs contest the fixture known as the North West Derby?", options: ["Everton and Liverpool", "Manchester United and Manchester City", "Liverpool and Manchester United", "Manchester City and Everton"], correctOptionIndex: 2 },
      { question: "Which club won the Premier League title in 2015-16 immediately after Leicester's famous triumph, in 2016-17?", options: ["Chelsea", "Manchester City", "Tottenham", "Arsenal"], correctOptionIndex: 0 },
      { question: "What is the record for the biggest win margin in a single Premier League match?", options: ["8-0", "9-0", "10-0", "7-1"], correctOptionIndex: 1 },
      { question: "Which club finished bottom of the table in the Premier League's inaugural 1992-93 season?", options: ["Crystal Palace", "Middlesbrough", "Nottingham Forest", "Oldham Athletic"], correctOptionIndex: 2 },
      { question: "Who was the Premier League's top scorer in its inaugural 1992-93 season, with 22 goals?", options: ["Alan Shearer", "Teddy Sheringham", "Ian Wright", "Eric Cantona"], correctOptionIndex: 1 },
      { question: "How many substitutions have Premier League clubs been permitted per match since the 2022-23 rule change?", options: ["3", "4", "5", "6"], correctOptionIndex: 2 },
      { question: "Which two clubs contest the fixture known as the Merseyside Derby?", options: ["Everton and Liverpool", "Liverpool and Manchester United", "Everton and Manchester City", "Liverpool and Manchester City"], correctOptionIndex: 0 },
      { question: "Which manager led Leicester City to their shock 2015-16 Premier League title?", options: ["Nigel Pearson", "Claudio Ranieri", "Brendan Rodgers", "Craig Shakespeare"], correctOptionIndex: 1 },
      { question: "In which season did the Premier League first introduce goal-line technology?", options: ["2010-11", "2013-14", "2016-17", "2019-20"], correctOptionIndex: 1 },
      { question: "Sergio Agüero's dramatic stoppage-time title-winning goal in 2012 came against which opponents?", options: ["Wigan Athletic", "Bolton Wanderers", "Queens Park Rangers", "Sunderland"], correctOptionIndex: 2 },
      { question: "Which manager led Arsenal's 'Invincibles' to their unbeaten 2003-04 title?", options: ["Arsène Wenger", "George Graham", "Bruce Rioch", "Terry Neill"], correctOptionIndex: 0 },
      { question: "Manchester City's 2022-23 treble under Pep Guardiola included the Premier League, FA Cup, and which European trophy?", options: ["Europa League", "UEFA Champions League", "UEFA Super Cup", "Europa Conference League"], correctOptionIndex: 1 },
      { question: "What is the maximum size of a Premier League club's registered first-team squad list, excluding under-21 players?", options: ["20", "23", "25", "30"], correctOptionIndex: 2 },
    ],
  },
  {
    title: "Champions League Quiz",
    description: "European football's biggest prize - test your knowledge of the Champions League.",
    wikiTitle: "UEFA_Champions_League",
    questions: [
      { question: "Which club has won the most European Cup/Champions League titles?", options: ["AC Milan", "Liverpool", "Real Madrid", "Bayern Munich"], correctOptionIndex: 2 },
      { question: "What was the competition called before its 1992 rebrand?", options: ["European Cup", "UEFA Cup", "European Super League", "Continental Cup"], correctOptionIndex: 0 },
      { question: "Which English club won an all-English Champions League final in 2019?", options: ["Manchester City", "Chelsea", "Liverpool", "Manchester United"], correctOptionIndex: 2 },
      { question: "Which club completed a treble in 1999 with a dramatic late final comeback?", options: ["Manchester United", "Arsenal", "Bayern Munich", "Juventus"], correctOptionIndex: 0 },
      { question: "Which competition sits one tier below the Champions League?", options: ["Conference League", "Europa League", "Super Cup", "Community Shield"], correctOptionIndex: 1 },
      { question: "Who has scored the most goals in Champions League history?", options: ["Lionel Messi", "Robert Lewandowski", "Cristiano Ronaldo", "Karim Benzema"], correctOptionIndex: 2 },
      { question: "Which two English clubs met in the 2021 Champions League final?", options: ["Liverpool and Chelsea", "Chelsea and Manchester City", "Manchester City and Liverpool", "Arsenal and Chelsea"], correctOptionIndex: 1 },
      { question: "Which Spanish club plays home matches at Camp Nou?", options: ["Real Madrid", "Barcelona", "Sevilla", "Atlético Madrid"], correctOptionIndex: 1 },
      { question: "Which club won the Champions League in 2004-05 after coming back from 3-0 down at half-time in the final?", options: ["AC Milan", "Liverpool", "Chelsea", "Juventus"], correctOptionIndex: 1 },
      { question: "Which club has appeared in the most Champions League finals?", options: ["AC Milan", "Bayern Munich", "Real Madrid", "Liverpool"], correctOptionIndex: 2 },
      { question: "Which player has the most Champions League assists in history?", options: ["Lionel Messi", "Ángel Di María", "Cristiano Ronaldo", "Thomas Müller"], correctOptionIndex: 0 },
      { question: "Which club won back-to-back Champions League titles in 2016-17 and 2017-18, and again in 2018-19?", options: ["Barcelona", "Real Madrid", "Bayern Munich", "Manchester City"], correctOptionIndex: 1 },
      { question: "What is the maximum number of clubs from one country's league that can compete in a single Champions League edition under normal qualification rules?", options: ["3", "4", "5", "6"], correctOptionIndex: 2 },
      { question: "Which stadium has hosted the most Champions League/European Cup finals?", options: ["Wembley Stadium", "Santiago Bernabéu", "San Siro", "Stade de France"], correctOptionIndex: 0 },
      { question: "Which club is the reigning holder of the most consecutive European Cup titles (5, from 1956-60)?", options: ["AC Milan", "Ajax", "Real Madrid", "Benfica"], correctOptionIndex: 2 },
      { question: "Which format change did the Champions League adopt from the 2024-25 season, replacing the traditional group stage?", options: ["A single group table (league phase)", "A knockout-only format", "Regional qualifying groups", "A round-robin among 8 groups"], correctOptionIndex: 0 },
      { question: "Which player scored a famous overhead-kick goal in the 2018 Champions League final?", options: ["Cristiano Ronaldo", "Gareth Bale", "Karim Benzema", "Isco"], correctOptionIndex: 1 },
      { question: "Which English club reached their first Champions League final in 2019 but lost to Liverpool?", options: ["Chelsea", "Tottenham Hotspur", "Manchester City", "Arsenal"], correctOptionIndex: 1 },
      { question: "How many points are awarded for a win in the Champions League's league phase group standings?", options: ["1", "2", "3", "4"], correctOptionIndex: 2 },
      { question: "Which club won the inaugural European Cup in 1955-56?", options: ["Benfica", "Real Madrid", "AC Milan", "Manchester United"], correctOptionIndex: 1 },
      { question: "Who is the youngest player to ever score in a Champions League match?", options: ["Kylian Mbappé", "Youssoufa Moukoko", "Lamine Yamal", "Ansu Fati"], correctOptionIndex: 1 },
      { question: "Which trophy is awarded to the Champions League's top scorer at the end of the season?", options: ["There is no official individual trophy for it", "The Golden Boot", "The Alfredo Di Stéfano Award", "The UEFA Player of the Year"], correctOptionIndex: 0 },
      { question: "Zinedine Zidane's famous left-footed volley came in the 2002 Champions League final against which club?", options: ["Valencia", "Bayer Leverkusen", "Juventus", "Bayern Munich"], correctOptionIndex: 1 },
      { question: "Liverpool's 2005 'Miracle of Istanbul' comeback from 3-0 down came against which club?", options: ["Juventus", "AC Milan", "Inter Milan", "Real Madrid"], correctOptionIndex: 1 },
      { question: "Which Scottish club became the first British side to win the European Cup, in 1967?", options: ["Rangers", "Celtic", "Aberdeen", "Hearts"], correctOptionIndex: 1 },
      { question: "Barcelona completed a treble by winning the 2009 Champions League final in Rome against which club?", options: ["Manchester United", "Chelsea", "Arsenal", "Manchester City"], correctOptionIndex: 0 },
      { question: "Which manager led Real Madrid to three consecutive Champions League titles between 2016 and 2018?", options: ["Carlo Ancelotti", "Zinedine Zidane", "Rafael Benítez", "José Mourinho"], correctOptionIndex: 1 },
      { question: "Which stadium hosted the chaotic 2022 Champions League final between Liverpool and Real Madrid?", options: ["Stade de France", "Wembley Stadium", "Allianz Arena", "San Siro"], correctOptionIndex: 0 },
      { question: "Sergio Ramos's dramatic stoppage-time equalizer helped Real Madrid win the 2014 Champions League final, 'La Décima', against which local rival?", options: ["Barcelona", "Atlético Madrid", "Sevilla", "Valencia"], correctOptionIndex: 1 },
      { question: "Manchester City won their first-ever Champions League title in which year, as part of a domestic and European treble?", options: ["2021", "2022", "2023", "2024"], correctOptionIndex: 2 },
      { question: "Which club won a surprise Champions League title in 2004 under manager José Mourinho, before his move to Chelsea?", options: ["Porto", "Benfica", "Sporting CP", "Villarreal"], correctOptionIndex: 0 },
      { question: "Bayern Munich completed a continental treble, including the Champions League, in which season?", options: ["2012-13", "2019-20", "2021-22", "2015-16"], correctOptionIndex: 1 },
    ],
  },
  {
    title: "Football Legends Quiz",
    description: "The greatest to ever play the game - how much do you know about football's legendary players?",
    wikiTitle: "Ballon_d%27Or",
    questions: [
      { question: "Who has won the most Ballon d'Or awards?", options: ["Cristiano Ronaldo", "Lionel Messi", "Michel Platini", "Johan Cruyff"], correctOptionIndex: 1 },
      { question: "Which player holds the record for most international goals in men's football?", options: ["Lionel Messi", "Pelé", "Cristiano Ronaldo", "Romelu Lukaku"], correctOptionIndex: 2 },
      { question: "Which player is nicknamed 'The Egyptian King'?", options: ["Mohamed Salah", "Sadio Mané", "Riyad Mahrez", "Amr Warda"], correctOptionIndex: 0 },
      { question: "Which player scored the infamous 'Hand of God' goal in 1986?", options: ["Pelé", "Diego Maradona", "Gary Lineker", "Michel Platini"], correctOptionIndex: 1 },
      { question: "Which Brazilian legend won three World Cups as a player (1958, 1962, 1970)?", options: ["Ronaldinho", "Pelé", "Zico", "Ronaldo Nazário"], correctOptionIndex: 1 },
      { question: "Which country does Erling Haaland represent internationally?", options: ["Sweden", "Denmark", "Norway", "Iceland"], correctOptionIndex: 2 },
      { question: "Which player is widely known by the nickname 'CR7'?", options: ["Cristiano Ronaldo", "Ronaldinho", "Ronaldo Nazário", "Carlos Tevez"], correctOptionIndex: 0 },
      { question: "Which club did Lionel Messi join after leaving Barcelona in 2021?", options: ["Inter Miami", "Paris Saint-Germain", "Manchester City", "Al-Hilal"], correctOptionIndex: 1 },
      { question: "Which Dutch legend popularised the '360-degree turn' move that bears his name?", options: ["Johan Cruyff", "Dennis Bergkamp", "Marco van Basten", "Ruud Gullit"], correctOptionIndex: 0 },
      { question: "Which player is nicknamed 'The Special One' - but as a manager, not a player?", options: ["Pep Guardiola", "José Mourinho", "Arsène Wenger", "Carlo Ancelotti"], correctOptionIndex: 1 },
      { question: "Which French legend won the Ballon d'Or three years in a row (1983-85)?", options: ["Zinedine Zidane", "Michel Platini", "Thierry Henry", "Eric Cantona"], correctOptionIndex: 1 },
      { question: "Which player scored a famous solo goal against England at the 1986 World Cup, dribbling past five players?", options: ["Diego Maradona", "Pelé", "Zico", "Carlos Valderrama"], correctOptionIndex: 0 },
      { question: "Which German legend is nicknamed 'Der Bomber' for his prolific goalscoring?", options: ["Franz Beckenbauer", "Gerd Müller", "Lothar Matthäus", "Jürgen Klinsmann"], correctOptionIndex: 1 },
      { question: "Which player is widely regarded as the first global football superstar, playing in the 1930s for Italy?", options: ["Giuseppe Meazza", "Silvio Piola", "Giovanni Ferrari", "Luisito Monti"], correctOptionIndex: 0 },
      { question: "Zinedine Zidane was sent off in his final match, the 2006 World Cup final, for what incident?", options: ["A reckless tackle", "Headbutting Marco Materazzi", "Dissent towards the referee", "A second yellow card for time-wasting"], correctOptionIndex: 1 },
      { question: "Which Brazilian, known simply by one name, was FIFA World Player of the Year three times in the 1990s and 2000s?", options: ["Ronaldinho", "Rivaldo", "Ronaldo Nazário", "Kaká"], correctOptionIndex: 2 },
      { question: "Which player has won the most UEFA Champions League titles as a player?", options: ["Cristiano Ronaldo", "Paco Gento", "Lionel Messi", "Alfredo Di Stéfano"], correctOptionIndex: 1 },
      { question: "Which legendary striker retired as Barcelona and Sweden's record goalscorer before returning to AC Milan in his late 30s?", options: ["Henrik Larsson", "Zlatan Ibrahimović", "Freddie Ljungberg", "Kim Källström"], correctOptionIndex: 1 },
      { question: "Which player's famous celebration involves running to a corner flag and 'firing' an imaginary bow and arrow?", options: ["Roger Milla", "Didier Drogba", "Samuel Eto'o", "George Weah"], correctOptionIndex: 0 },
      { question: "Which Liberian legend won the Ballon d'Or in 1995, the only African winner to date?", options: ["Didier Drogba", "Samuel Eto'o", "George Weah", "Yaya Touré"], correctOptionIndex: 2 },
      { question: "Which England striker is the Premier League and England men's national team's all-time record goalscorer?", options: ["Wayne Rooney", "Alan Shearer", "Harry Kane", "Michael Owen"], correctOptionIndex: 2 },
      { question: "Which German goalkeeper is widely credited with pioneering the modern 'sweeper-keeper' role?", options: ["Oliver Kahn", "Manuel Neuer", "Jens Lehmann", "Andreas Köpke"], correctOptionIndex: 1 },
      { question: "Which player is nicknamed 'The Phenomenon'?", options: ["Ronaldinho", "Ronaldo Nazário", "Cristiano Ronaldo", "Romário"], correctOptionIndex: 1 },
      { question: "Diego Maradona's 1984 transfer from Barcelona to Napoli set what world record at the time?", options: ["The largest transfer fee ever paid", "The longest contract in football history", "The first transfer to include performance bonuses", "The first million-pound transfer for a South American"], correctOptionIndex: 0 },
      { question: "Which Brazilian legend is affectionately known as 'O Rei' (The King) in his home country?", options: ["Ronaldinho", "Pelé", "Zico", "Garrincha"], correctOptionIndex: 1 },
      { question: "Franz Beckenbauer, who pioneered the modern sweeper role, captained which country to the 1974 World Cup title?", options: ["Germany", "West Germany", "Austria", "Switzerland"], correctOptionIndex: 1 },
      { question: "Which Argentine legend won the 2021 Copa América, his first major senior trophy with the national team?", options: ["Lionel Messi", "Ángel Di María", "Sergio Agüero", "Paulo Dybala"], correctOptionIndex: 0 },
      { question: "Which player is affectionately nicknamed 'The Flea' due to his small stature and dribbling style?", options: ["Sergio Agüero", "Lionel Messi", "Neymar", "Ángel Di María"], correctOptionIndex: 1 },
      { question: "Which country does Robert Lewandowski represent internationally?", options: ["Germany", "Poland", "Czech Republic", "Ukraine"], correctOptionIndex: 1 },
      { question: "Which England legend is famous for his precisely bent free kicks, becoming a global icon on and off the pitch?", options: ["Frank Lampard", "Steven Gerrard", "David Beckham", "Paul Scholes"], correctOptionIndex: 2 },
      { question: "Which Uruguayan striker's career is known for both his goalscoring and a history of on-pitch biting incidents?", options: ["Edinson Cavani", "Luis Suárez", "Diego Forlán", "Darwin Núñez"], correctOptionIndex: 1 },
      { question: "Which defender is one of the rare few in history to win the Ballon d'Or, doing so in 2006?", options: ["Fabio Cannavaro", "Paolo Maldini", "Carles Puyol", "Sergio Ramos"], correctOptionIndex: 0 },
      { question: "Which Welsh player became the world's most expensive footballer in 2013, moving from Tottenham to Real Madrid?", options: ["Aaron Ramsey", "Gareth Bale", "Ryan Giggs", "Ashley Williams"], correctOptionIndex: 1 },
    ],
  },
  {
    title: "La Liga Quiz",
    description: "El Clásico, Camp Nou and the Bernabéu - how well do you know Spanish football?",
    wikiTitle: "La_Liga",
    questions: [
      { question: "Which two clubs contest 'El Clásico'?", options: ["Real Madrid and Atlético Madrid", "Real Madrid and Barcelona", "Barcelona and Espanyol", "Sevilla and Real Betis"], correctOptionIndex: 1 },
      { question: "Which club has won the most La Liga titles?", options: ["Barcelona", "Atlético Madrid", "Real Madrid", "Valencia"], correctOptionIndex: 2 },
      { question: "What is Barcelona's home stadium called during its ongoing renovation branding?", options: ["Camp Nou", "Spotify Camp Nou", "Estadi Barça", "Nou Camp Arena"], correctOptionIndex: 1 },
      { question: "Which Basque club has never been relegated from La Liga?", options: ["Real Sociedad", "Athletic Bilbao", "Deportivo Alavés", "CA Osasuna"], correctOptionIndex: 1 },
      { question: "Which club plays home matches at the Metropolitano?", options: ["Real Madrid", "Getafe", "Atlético Madrid", "Rayo Vallecano"], correctOptionIndex: 2 },
      { question: "Who is La Liga's all-time top scorer?", options: ["Cristiano Ronaldo", "Lionel Messi", "Karim Benzema", "Telmo Zarra"], correctOptionIndex: 1 },
      { question: "Which teenage winger became a breakout Barcelona and Spain star at Euro 2024?", options: ["Nico Williams", "Lamine Yamal", "Pedri", "Fermín López"], correctOptionIndex: 1 },
      { question: "Athletic Bilbao's traditional squad-building policy focuses on players from which region?", options: ["Catalonia", "Andalusia", "The Basque Country", "Galicia"], correctOptionIndex: 2 },
      { question: "Which club is nicknamed 'Los Che'?", options: ["Valencia", "Villarreal", "Real Betis", "Celta Vigo"], correctOptionIndex: 0 },
      { question: "What is Real Madrid's home stadium called?", options: ["Camp Nou", "Santiago Bernabéu", "Wanda Metropolitano", "Mestalla"], correctOptionIndex: 1 },
      { question: "Which club is known as 'Los Colchoneros' (The Mattress Makers)?", options: ["Real Madrid", "Real Sociedad", "Atlético Madrid", "Sevilla"], correctOptionIndex: 2 },
      { question: "Which club won its first-ever La Liga title in 2020-21, ending a long wait?", options: ["Real Sociedad", "Villarreal", "Atlético Madrid", "Real Betis"], correctOptionIndex: 2 },
      { question: "Real Madrid and Barcelona are the only clubs never to have been relegated from La Liga - true or false?", options: ["True", "False"], correctOptionIndex: 0 },
      { question: "Which club plays home matches at the Ramón Sánchez-Pizjuán stadium?", options: ["Real Betis", "Sevilla", "Málaga", "Cádiz"], correctOptionIndex: 1 },
      { question: "Which player scored the most goals in a single La Liga season?", options: ["Cristiano Ronaldo", "Lionel Messi", "Telmo Zarra", "Hugo Sánchez"], correctOptionIndex: 1 },
      { question: "Which club is Barcelona's fiercest local rival within Catalonia?", options: ["Girona", "Espanyol", "Real Zaragoza", "Levante"], correctOptionIndex: 1 },
      { question: "Which manager led Barcelona's famous 'tiki-taka' era in the late 2000s and early 2010s?", options: ["Louis van Gaal", "Frank Rijkaard", "Pep Guardiola", "Tito Vilanova"], correctOptionIndex: 2 },
      { question: "How many clubs are relegated from a 20-team La Liga season?", options: ["2", "3", "4", "1"], correctOptionIndex: 1 },
      { question: "Which club has finished as La Liga runner-up the most times without ever winning the title?", options: ["Athletic Bilbao", "Valencia", "Real Sociedad", "Deportivo La Coruña"], correctOptionIndex: 0 },
      { question: "Real Madrid's academy and youth setup is commonly known by what name?", options: ["La Masia", "La Fábrica", "El Vivero", "La Cantera"], correctOptionIndex: 1 },
      { question: "Which club won a surprise La Liga title in the 2003-04 season?", options: ["Valencia", "Deportivo La Coruña", "Villarreal", "Real Sociedad"], correctOptionIndex: 0 },
      { question: "What is Barcelona's youth academy, one of the most famous in world football, called?", options: ["La Fábrica", "La Masia", "El Vivero", "La Cantera"], correctOptionIndex: 1 },
      { question: "Which club has won the most Copa del Rey titles in Spanish football history?", options: ["Real Madrid", "Barcelona", "Athletic Bilbao", "Atlético Madrid"], correctOptionIndex: 1 },
      { question: "Diego Maradona played for which La Liga club before his move to Napoli in 1984?", options: ["Real Madrid", "Sevilla", "Barcelona", "Atlético Madrid"], correctOptionIndex: 2 },
      { question: "Which La Liga club is nicknamed 'El Submarino Amarillo' (The Yellow Submarine)?", options: ["Villarreal", "Cádiz", "Real Betis", "Getafe"], correctOptionIndex: 0 },
      { question: "Barcelona's motto, reflecting its status as a member-owned club, translates to what?", options: ["\"Champions forever\"", "\"More than a club\"", "\"One club, one city\"", "\"Unity is strength\""], correctOptionIndex: 1 },
      { question: "Which club is nicknamed 'Los Blancos' due to their traditional all-white kit?", options: ["Barcelona", "Atlético Madrid", "Real Madrid", "Valencia"], correctOptionIndex: 2 },
      { question: "Along with Barcelona and Athletic Bilbao, which other major club is run as a member-owned 'socio' club rather than by private investors?", options: ["Atlético Madrid", "Real Madrid", "Sevilla", "Valencia"], correctOptionIndex: 1 },
      { question: "Which manager has led Atlético Madrid since 2011, becoming one of La Liga's longest-serving current managers?", options: ["Unai Emery", "Diego Simeone", "Marcelino", "Quique Setién"], correctOptionIndex: 1 },
      { question: "Which club plays home matches at the Coliseum, formerly known as the Coliseum Alfonso Pérez?", options: ["Getafe", "Rayo Vallecano", "Leganés", "Alavés"], correctOptionIndex: 0 },
      { question: "Which two clubs share the city of Seville and contest the 'Seville derby'?", options: ["Sevilla and Real Betis", "Sevilla and Cádiz", "Real Betis and Málaga", "Sevilla and Córdoba"], correctOptionIndex: 0 },
      { question: "Which stadium was Atlético Madrid's home ground before their 2017 move to the Wanda Metropolitano?", options: ["Vicente Calderón", "Ramón Sánchez-Pizjuán", "Mestalla", "Riazor"], correctOptionIndex: 0 },
    ],
  },
  {
    title: "Bundesliga Quiz",
    description: "From Der Klassiker to the Yellow Wall - test your knowledge of German football.",
    wikiTitle: "Bundesliga",
    questions: [
      { question: "Which club has won the most Bundesliga titles?", options: ["Borussia Dortmund", "Bayern Munich", "Werder Bremen", "Bayer Leverkusen"], correctOptionIndex: 1 },
      { question: "Borussia Dortmund's famous stand of standing supporters is nicknamed what?", options: ["The Kop", "The Yellow Wall", "The Curva", "The Ultras Bank"], correctOptionIndex: 1 },
      { question: "Which match is known as 'Der Klassiker'?", options: ["Bayern Munich vs Borussia Dortmund", "Schalke vs Dortmund", "Bayern vs Leverkusen", "Hamburg vs Werder Bremen"], correctOptionIndex: 0 },
      { question: "Which club won the Bundesliga title in 2023-24, ending Bayern's title streak?", options: ["RB Leipzig", "Bayer Leverkusen", "Borussia Dortmund", "VfB Stuttgart"], correctOptionIndex: 1 },
      { question: "What is the Bundesliga's unique rule about club ownership commonly known as?", options: ["The 6+5 Rule", "The 50+1 Rule", "The Financial Fair Play Rule", "The Homegrown Rule"], correctOptionIndex: 1 },
      { question: "Which stadium is the largest in Germany and Borussia Dortmund's home?", options: ["Allianz Arena", "Signal Iduna Park", "Olympiastadion Berlin", "Veltins-Arena"], correctOptionIndex: 1 },
      { question: "Which legendary striker is Bayern Munich and the Bundesliga's all-time top scorer?", options: ["Miroslav Klose", "Robert Lewandowski", "Gerd Müller", "Klaus Fischer"], correctOptionIndex: 2 },
      { question: "How many teams are relegated (or enter play-offs) from a 18-team Bundesliga season?", options: ["1", "2", "3", "4"], correctOptionIndex: 1 },
      { question: "Which club won the Bundesliga's very first season in 1963-64?", options: ["Bayern Munich", "1. FC Köln", "Borussia Dortmund", "Hamburger SV"], correctOptionIndex: 1 },
      { question: "Which club is the only one never to have been relegated from the Bundesliga?", options: ["Bayern Munich", "Werder Bremen", "Hamburger SV", "Borussia Mönchengladbach"], correctOptionIndex: 0 },
      { question: "Which club is nicknamed 'Die Fohlen' (The Foals)?", options: ["Bayer Leverkusen", "Borussia Mönchengladbach", "VfL Wolfsburg", "RB Leipzig"], correctOptionIndex: 1 },
      { question: "Which club won the Bundesliga title unbeaten in the 2023-24 season?", options: ["Bayern Munich", "Bayer Leverkusen", "Borussia Dortmund", "RB Leipzig"], correctOptionIndex: 1 },
      { question: "Which German legend managed Bayern Munich to a treble in 2012-13?", options: ["Jupp Heynckes", "Pep Guardiola", "Carlo Ancelotti", "Niko Kovač"], correctOptionIndex: 0 },
      { question: "What is Bayern Munich's home stadium called?", options: ["Signal Iduna Park", "Allianz Arena", "Olympiastadion", "Veltins-Arena"], correctOptionIndex: 1 },
      { question: "Which club plays home matches at the Veltins-Arena?", options: ["Schalke 04", "Borussia Mönchengladbach", "1. FC Köln", "VfL Bochum"], correctOptionIndex: 0 },
      { question: "Which club is backed by the Red Bull company and rose through the German league system in the 2010s?", options: ["Bayer Leverkusen", "RB Leipzig", "TSG Hoffenheim", "1899 Hoffenheim"], correctOptionIndex: 1 },
      { question: "Which player became the youngest ever Bundesliga goalscorer as a teenager at Borussia Dortmund?", options: ["Youssoufa Moukoko", "Jamal Musiala", "Florian Wirtz", "Jude Bellingham"], correctOptionIndex: 0 },
      { question: "Which two clubs contest the fixture nicknamed 'Der Klassiker'?", options: ["Bayern Munich and Borussia Dortmund", "Schalke and Dortmund", "Bayern and Leverkusen", "Hamburg and Werder Bremen"], correctOptionIndex: 0 },
      { question: "Which rivalry between Schalke 04 and Borussia Dortmund is known as?", options: ["Der Klassiker", "Revierderby", "Nordderby", "Bundesliga Clásico"], correctOptionIndex: 1 },
      { question: "Which manager guided Bayer Leverkusen to their unbeaten Bundesliga title in 2023-24?", options: ["Xabi Alonso", "Julian Nagelsmann", "Gerardo Seoane", "Peter Bosz"], correctOptionIndex: 0 },
      { question: "Which German club is majority fan-owned under the '50+1' rule, giving members voting control?", options: ["RB Leipzig", "Bayer Leverkusen", "Bayern Munich", "VfL Wolfsburg"], correctOptionIndex: 2 },
      { question: "Which country's top flight is the Bundesliga?", options: ["Austria", "Germany", "Switzerland", "Belgium"], correctOptionIndex: 1 },
      { question: "Which stadium famously has a retractable pitch that slides outside the stadium for maintenance?", options: ["Allianz Arena", "Veltins-Arena", "Signal Iduna Park", "Volkswagen Arena"], correctOptionIndex: 1 },
      { question: "Franz Beckenbauer is a playing legend of which Bundesliga club, where he won four league titles and the European Cup?", options: ["Borussia Mönchengladbach", "Bayern Munich", "Hamburger SV", "1. FC Köln"], correctOptionIndex: 1 },
      { question: "Borussia Dortmund lost the 2012-13 Champions League final at Wembley to which fellow Bundesliga club in an all-German final?", options: ["Bayer Leverkusen", "Bayern Munich", "Schalke 04", "RB Leipzig"], correctOptionIndex: 1 },
      { question: "Jürgen Klopp made his name managing which Bundesliga club, winning back-to-back titles, before moving to Liverpool?", options: ["Bayern Munich", "Mainz 05", "Borussia Dortmund", "Bayer Leverkusen"], correctOptionIndex: 2 },
      { question: "Which prolific striker won multiple Bundesliga Golden Boots at Bayern Munich before later moving to Barcelona?", options: ["Thomas Müller", "Robert Lewandowski", "Mario Gómez", "Miroslav Klose"], correctOptionIndex: 1 },
      { question: "Borussia Dortmund's Signal Iduna Park is famous for having the highest average attendance in world football, thanks largely to which standing terrace?", options: ["The Yellow Wall", "The Kop End", "The South Curve", "The Fan Block"], correctOptionIndex: 0 },
      { question: "Along with Bayer Leverkusen, which other Bundesliga club is exempted from the '50+1' fan-ownership rule due to long-term backing from its parent company, Volkswagen?", options: ["RB Leipzig", "VfL Wolfsburg", "TSG Hoffenheim", "Bayern Munich"], correctOptionIndex: 1 },
      { question: "Which Bundesliga club has won more DFB-Pokal (German Cup) titles than any other?", options: ["Borussia Dortmund", "Bayern Munich", "Werder Bremen", "Eintracht Frankfurt"], correctOptionIndex: 1 },
      { question: "Which Bundesliga club plays its home matches at Borussia-Park?", options: ["Borussia Dortmund", "Borussia Mönchengladbach", "1. FC Köln", "Bayer Leverkusen"], correctOptionIndex: 1 },
      { question: "Toni Kroos, later a Real Madrid legend, began his professional career at which Bundesliga club?", options: ["Borussia Dortmund", "Bayern Munich", "Bayer Leverkusen", "RB Leipzig"], correctOptionIndex: 1 },
      { question: "Which club won back-to-back Bundesliga titles in 2011-12 and 2012-13 under manager Jürgen Klopp?", options: ["Bayern Munich", "Borussia Dortmund", "Schalke 04", "Bayer Leverkusen"], correctOptionIndex: 1 },
    ],
  },
  {
    title: "Football Records Quiz",
    description: "The fastest, the highest-scoring, the most decorated - how well do you know football's record books?",
    wikiTitle: "European_Golden_Shoe",
    questions: [
      { question: "Which country has won the most Ballon d'Or team awards through individual winners (as of the mid-2020s)?", options: ["Brazil", "Argentina", "France", "Germany"], correctOptionIndex: 1 },
      { question: "Who holds the record for most career club goals across competitions?", options: ["Lionel Messi", "Pelé", "Cristiano Ronaldo", "Josef Bican"], correctOptionIndex: 2 },
      { question: "Which club has won the most official international club titles overall?", options: ["Barcelona", "Al-Ahly", "Real Madrid", "Boca Juniors"], correctOptionIndex: 2 },
      { question: "What is the largest official winning margin in a men's international football match?", options: ["Australia 31-0 American Samoa", "Germany 13-0 San Marino", "Iran 19-0 Guam", "Spain 13-0 Bulgaria"], correctOptionIndex: 0 },
      { question: "Which players share the record for most FIFA World Cup tournament appearances (5), a group Lionel Messi joined in 2026?", options: ["Cristiano Ronaldo and Pelé", "Antonio Carbajal, Rafael Márquez and Lothar Matthäus", "Diego Maradona and Franz Beckenbauer", "Miroslav Klose and Cafu"], correctOptionIndex: 1 },
      { question: "Which country holds the record for the fastest goal ever scored in a World Cup match?", options: ["Turkey", "England", "Brazil", "Argentina"], correctOptionIndex: 0 },
      { question: "What is the record transfer fee ever paid for a footballer, set by Neymar's 2017 move?", options: ["Paris Saint-Germain signing Neymar from Barcelona", "Real Madrid signing Mbappé", "Manchester City signing Haaland", "Chelsea signing Enzo Fernández"], correctOptionIndex: 0 },
      { question: "Which goalkeeper has kept the most clean sheets in Champions League history?", options: ["Manuel Neuer", "Iker Casillas", "Gianluigi Buffon", "Petr Čech"], correctOptionIndex: 1 },
      { question: "Who holds the record for most international caps in men's football history?", options: ["Cristiano Ronaldo", "Bader Al-Mutawa", "Soh Chin Ann", "Ahmed Hassan"], correctOptionIndex: 1 },
      { question: "Which country has appeared in the most FIFA World Cup finals overall (winning and losing)?", options: ["Brazil", "Germany", "Argentina", "Italy"], correctOptionIndex: 1 },
      { question: "What is the record attendance for a single football match, set at the 1950 World Cup final in the Maracanã?", options: ["Around 100,000", "Around 150,000", "Around 173,000", "Around 200,000"], correctOptionIndex: 2 },
      { question: "Which club holds the record for the longest unbeaten run in a European top-flight league?", options: ["Celtic (1915-17)", "Arsenal (2003-04)", "Steaua București (1986-89)", "Milan (1991-93)"], correctOptionIndex: 2 },
      { question: "Who is the youngest player to ever play in a men's World Cup?", options: ["Norman Whiteside", "Samuel Eto'o", "Femi Opabunmi", "Pelé"], correctOptionIndex: 0 },
      { question: "Which player holds the record for most hat-tricks in international football?", options: ["Cristiano Ronaldo", "Lionel Messi", "Ali Daei", "Sunil Chhetri"], correctOptionIndex: 0 },
      { question: "What is the record for most goals scored in a single top-flight European league season by one player?", options: ["50 (Lionel Messi)", "40 (Robert Lewandowski)", "45 (Gerd Müller)", "36 (Cristiano Ronaldo)"], correctOptionIndex: 0 },
      { question: "Which club has the most official league titles across the top divisions of Europe's 'big five' leagues (as of the mid-2020s)?", options: ["Real Madrid", "Juventus", "Bayern Munich", "Rangers"], correctOptionIndex: 0 },
      { question: "Which player scored the fastest hat-trick in Premier League history?", options: ["Sadio Mané", "Robbie Fowler", "Alan Shearer", "Sergio Agüero"], correctOptionIndex: 0 },
      { question: "What is the record for the longest goal celebration-to-restart delay, i.e. the most goals scored in a single World Cup match?", options: ["12 goals (Austria 7-5 Switzerland, 1954)", "10 goals", "8 goals", "9 goals"], correctOptionIndex: 0 },
      { question: "Which manager has won the most top-flight league titles across a career in Europe's major leagues?", options: ["Sir Alex Ferguson", "Pep Guardiola", "José Mourinho", "Carlo Ancelotti"], correctOptionIndex: 0 },
      { question: "What is the record fee ever paid for a goalkeeper, set by Chelsea's signing of Kepa Arrizabalaga in 2018?", options: ["Around €70 million", "Around €80 million", "Around €65 million", "Around €90 million"], correctOptionIndex: 1 },
      { question: "Which two countries are tied for the most men's Olympic football gold medals, with three each?", options: ["Brazil and Argentina", "Hungary and Great Britain", "Uruguay and Italy", "Spain and France"], correctOptionIndex: 1 },
      { question: "Who holds the record for the most goals scored in a calendar year in men's football?", options: ["Cristiano Ronaldo", "Lionel Messi", "Robert Lewandowski", "Pelé"], correctOptionIndex: 1 },
      { question: "Which club has won the most domestic league titles of any club in the world?", options: ["Al-Ahly", "Rangers", "Linfield", "Real Madrid"], correctOptionIndex: 1 },
      { question: "Kylian Mbappé's 2026 World Cup Golden Boot made him the first man to win the award in consecutive tournaments (2022 and 2026) - true or false?", options: ["True", "False"], correctOptionIndex: 0 },
      { question: "Following the 2026 World Cup, who stands as the tournament's all-time leading goalscorer?", options: ["Miroslav Klose", "Kylian Mbappé", "Lionel Messi", "Just Fontaine"], correctOptionIndex: 1 },
      { question: "Bayern Munich hold the European record for most consecutive top-flight league titles, winning how many in a row (2013-2020)?", options: ["6", "7", "8", "9"], correctOptionIndex: 2 },
      { question: "Which manager holds the record for most UEFA Champions League titles won as a manager, with 5?", options: ["Pep Guardiola", "Carlo Ancelotti", "Sir Alex Ferguson", "Zinedine Zidane"], correctOptionIndex: 1 },
      { question: "Which country holds the record for the most FIFA World Cup semi-final appearances of any nation?", options: ["Brazil", "Germany", "Argentina", "Italy"], correctOptionIndex: 1 },
      { question: "What is the maximum squad size permitted at a FIFA World Cup finals tournament, as used at the 2022 and 2026 editions?", options: ["23", "25", "26", "28"], correctOptionIndex: 2 },
      { question: "Which Spanish club has won the Copa del Rey more times than any other club?", options: ["Real Madrid", "Barcelona", "Athletic Bilbao", "Atlético Madrid"], correctOptionIndex: 1 },
      { question: "Which country is home to Sheffield FC, widely recognized as the oldest football club still in existence, founded in 1857?", options: ["Scotland", "England", "Wales", "Ireland"], correctOptionIndex: 1 },
      { question: "Which country is the only nation to have played in every single FIFA World Cup tournament since the first in 1930?", options: ["Germany", "Italy", "Brazil", "Argentina"], correctOptionIndex: 2 },
      { question: "Which English stadium was the most expensive football stadium ever built at the time of its 2019 completion?", options: ["Wembley Stadium", "Emirates Stadium", "Tottenham Hotspur Stadium", "Etihad Stadium"], correctOptionIndex: 2 },
    ],
  },
];

const BUNDESLIGA_TEAMS: TeamSeed[] = [
  { name: "Bayern Munich", wikiTitle: "Bayern_Munich", stadium: "Allianz Arena", leagueName: "Bundesliga" },
  { name: "Bayer Leverkusen", wikiTitle: "Bayer_04_Leverkusen", stadium: "BayArena", leagueName: "Bundesliga" },
  { name: "RB Leipzig", wikiTitle: "RB_Leipzig", stadium: "Red Bull Arena", leagueName: "Bundesliga" },
  { name: "Borussia Dortmund", wikiTitle: "Borussia_Dortmund", stadium: "Signal Iduna Park", leagueName: "Bundesliga" },
  { name: "Eintracht Frankfurt", wikiTitle: ["Eintracht_Frankfurt", "Eintracht_Frankfurt_(football)"], stadium: "Deutsche Bank Park", leagueName: "Bundesliga", commonsFile: "Eintracht Frankfurt Logo.svg" },
  { name: "VfB Stuttgart", wikiTitle: "VfB_Stuttgart", stadium: "MHPArena", leagueName: "Bundesliga" },
  { name: "SC Freiburg", wikiTitle: "SC_Freiburg", stadium: "Europa-Park Stadion", leagueName: "Bundesliga" },
  { name: "TSG Hoffenheim", wikiTitle: ["TSG_1899_Hoffenheim", "1899_Hoffenheim"], stadium: "PreZero Arena", leagueName: "Bundesliga" },
  { name: "Werder Bremen", wikiTitle: "Werder_Bremen", stadium: "Weserstadion", leagueName: "Bundesliga" },
  { name: "Borussia Mönchengladbach", wikiTitle: "Borussia_M%C3%B6nchengladbach", stadium: "Borussia-Park", leagueName: "Bundesliga" },
  { name: "FC Augsburg", wikiTitle: "FC_Augsburg", stadium: "WWK Arena", leagueName: "Bundesliga" },
  { name: "Union Berlin", wikiTitle: "Union_Berlin", stadium: "Stadion An der Alten Försterei", leagueName: "Bundesliga" },
  { name: "Mainz 05", wikiTitle: "1._FSV_Mainz_05", stadium: "Mewa Arena", leagueName: "Bundesliga" },
  { name: "VfL Bochum", wikiTitle: "VfL_Bochum", stadium: "Vonovia Ruhrstadion", leagueName: "Bundesliga" },
  { name: "Holstein Kiel", wikiTitle: "Holstein_Kiel", stadium: "Holstein-Stadion", leagueName: "Bundesliga" },
  { name: "Schalke 04", wikiTitle: "FC_Schalke_04", stadium: "Veltins-Arena", leagueName: "Bundesliga" },
  { name: "SV Elversberg", wikiTitle: "SV_Elversberg", stadium: "Ursapharm-Arena Saar", leagueName: "Bundesliga" },
  { name: "SC Paderborn", wikiTitle: "SC_Paderborn_07", stadium: "Home Deluxe Arena", leagueName: "Bundesliga" },
];

const SERIE_A_TEAMS: TeamSeed[] = [
  { name: "Inter Milan", wikiTitle: "Inter_Milan", stadium: "San Siro", leagueName: "Serie A" },
  { name: "Napoli", wikiTitle: "SSC_Napoli", stadium: "Stadio Diego Armando Maradona", leagueName: "Serie A" },
  { name: "AS Roma", wikiTitle: "AS_Roma", stadium: "Stadio Olimpico", leagueName: "Serie A" },
  { name: "Como 1907", wikiTitle: "Como_1907", stadium: "Stadio Giuseppe Sinigaglia", leagueName: "Serie A" },
  { name: "AC Milan", wikiTitle: "AC_Milan", stadium: "San Siro", leagueName: "Serie A" },
  { name: "Juventus", wikiTitle: "Juventus_FC", stadium: "Allianz Stadium", leagueName: "Serie A" },
  { name: "Atalanta", wikiTitle: "Atalanta_BC", stadium: "Gewiss Stadium", leagueName: "Serie A" },
  { name: "Bologna", wikiTitle: "Bologna_F.C._1909", stadium: "Stadio Renato Dall'Ara", leagueName: "Serie A" },
  { name: "Fiorentina", wikiTitle: "ACF_Fiorentina", stadium: "Stadio Artemio Franchi", leagueName: "Serie A" },
  { name: "Lazio", wikiTitle: "S.S._Lazio", stadium: "Stadio Olimpico", leagueName: "Serie A" },
  { name: "Torino", wikiTitle: "Torino_F.C.", stadium: "Stadio Olimpico Grande Torino", leagueName: "Serie A" },
  { name: "Udinese", wikiTitle: "Udinese_Calcio", stadium: "Bluenergy Stadium", leagueName: "Serie A" },
  { name: "Genoa", wikiTitle: "Genoa_C.F.C.", stadium: "Stadio Luigi Ferraris", leagueName: "Serie A" },
  { name: "Cagliari", wikiTitle: "Cagliari_Calcio", stadium: "Unipol Domus", leagueName: "Serie A" },
  { name: "Parma", wikiTitle: "Parma_Calcio_1913", stadium: "Stadio Ennio Tardini", leagueName: "Serie A" },
  { name: "Lecce", wikiTitle: "US_Lecce", stadium: "Stadio Via del Mare", leagueName: "Serie A" },
  { name: "Sassuolo", wikiTitle: "US_Sassuolo_Calcio", stadium: "Mapei Stadium", leagueName: "Serie A" },
  { name: "Venezia", wikiTitle: "Venezia_F.C.", stadium: "Stadio Pier Luigi Penzo", leagueName: "Serie A" },
  { name: "Frosinone", wikiTitle: "Frosinone_Calcio", stadium: "Stadio Benito Stirpe", leagueName: "Serie A" },
  { name: "Monza", wikiTitle: "AC_Monza", stadium: "U-Power Stadium", leagueName: "Serie A" },
];

const LIGUE_1_TEAMS: TeamSeed[] = [
  { name: "Paris Saint-Germain", wikiTitle: "Paris_Saint-Germain_F.C.", stadium: "Parc des Princes", leagueName: "Ligue 1" },
  { name: "Marseille", wikiTitle: "Olympique_de_Marseille", stadium: "Stade Vélodrome", leagueName: "Ligue 1" },
  { name: "Monaco", wikiTitle: "AS_Monaco_FC", stadium: "Stade Louis II", leagueName: "Ligue 1" },
  { name: "Lille", wikiTitle: "LOSC_Lille", stadium: "Stade Pierre-Mauroy", leagueName: "Ligue 1" },
  { name: "Lyon", wikiTitle: "Olympique_Lyonnais", stadium: "Groupama Stadium", leagueName: "Ligue 1" },
  { name: "Nice", wikiTitle: "OGC_Nice", stadium: "Allianz Riviera", leagueName: "Ligue 1" },
  { name: "RC Lens", wikiTitle: "RC_Lens", stadium: "Stade Bollaert-Delelis", leagueName: "Ligue 1" },
  { name: "Strasbourg", wikiTitle: "RC_Strasbourg_Alsace", stadium: "Stade de la Meinau", leagueName: "Ligue 1" },
  { name: "Rennes", wikiTitle: "Stade_Rennais_F.C.", stadium: "Roazhon Park", leagueName: "Ligue 1" },
  { name: "Toulouse", wikiTitle: "Toulouse_FC", stadium: "Stadium de Toulouse", leagueName: "Ligue 1" },
  { name: "AJ Auxerre", wikiTitle: "AJ_Auxerre", stadium: "Stade Abbé-Deschamps", leagueName: "Ligue 1" },
  { name: "Angers SCO", wikiTitle: "Angers_SCO", stadium: "Stade Raymond Kopa", leagueName: "Ligue 1" },
  { name: "Le Havre AC", wikiTitle: "Le_Havre_AC", stadium: "Stade Océane", leagueName: "Ligue 1" },
  { name: "Stade Brestois", wikiTitle: "Stade_Brestois_29", stadium: "Stade Francis-Le Blé", leagueName: "Ligue 1" },
  { name: "FC Lorient", wikiTitle: "FC_Lorient", stadium: "Stade du Moustoir", leagueName: "Ligue 1" },
  { name: "Paris FC", wikiTitle: "Paris_FC", stadium: "Stade Jean-Bouin", leagueName: "Ligue 1" },
  { name: "ES Troyes AC", wikiTitle: "ES_Troyes_AC", stadium: "Stade de l'Aube", leagueName: "Ligue 1" },
  { name: "Le Mans FC", wikiTitle: "Le_Mans_FC", stadium: "MMArena", leagueName: "Ligue 1" },
];

const LIGA_PORTUGAL_TEAMS: TeamSeed[] = [
  { name: "Sporting CP", wikiTitle: "Sporting_CP", stadium: "Estádio José Alvalade", leagueName: "Liga Portugal" },
  { name: "FC Porto", wikiTitle: "FC_Porto", stadium: "Estádio do Dragão", leagueName: "Liga Portugal" },
  { name: "SL Benfica", wikiTitle: "S.L._Benfica", stadium: "Estádio da Luz", leagueName: "Liga Portugal" },
  { name: "SC Braga", wikiTitle: "S.C._Braga", stadium: "Estádio Municipal de Braga", leagueName: "Liga Portugal" },
  { name: "Vitória de Guimarães", wikiTitle: "Vit%C3%B3ria_S.C.", stadium: "Estádio D. Afonso Henriques", leagueName: "Liga Portugal" },
  { name: "Gil Vicente FC", wikiTitle: "Gil_Vicente_F.C.", stadium: "Estádio Cidade de Barcelos", leagueName: "Liga Portugal" },
  { name: "CD Santa Clara", wikiTitle: "C.D._Santa_Clara", stadium: "Estádio de São Miguel", leagueName: "Liga Portugal" },
  { name: "FC Famalicão", wikiTitle: "F.C._Famalic%C3%A3o", stadium: "Estádio Municipal 22 de Junho", leagueName: "Liga Portugal" },
  { name: "Moreirense FC", wikiTitle: "Moreirense_F.C.", stadium: "Estádio Comendador Joaquim de Almeida Freitas", leagueName: "Liga Portugal" },
  { name: "CD Nacional", wikiTitle: "C.D._Nacional", stadium: "Estádio da Madeira", leagueName: "Liga Portugal" },
  { name: "Rio Ave FC", wikiTitle: "Rio_Ave_F.C.", stadium: "Estádio dos Arcos", leagueName: "Liga Portugal" },
  { name: "FC Arouca", wikiTitle: "F.C._Arouca", stadium: "Estádio Municipal de Arouca", leagueName: "Liga Portugal" },
  { name: "Casa Pia AC", wikiTitle: "Casa_Pia_A.C.", stadium: "Estádio Municipal de Rio Maior", leagueName: "Liga Portugal" },
  { name: "FC Alverca", wikiTitle: "F.C._Alverca", stadium: "Complexo Desportivo FC Alverca", leagueName: "Liga Portugal" },
  { name: "Estoril Praia", wikiTitle: "G.D._Estoril_Praia", stadium: "Estádio António Coimbra da Mota", leagueName: "Liga Portugal" },
  { name: "CF Estrela da Amadora", wikiTitle: "C.F._Estrela_da_Amadora", stadium: "Estádio José Gomes", leagueName: "Liga Portugal" },
  { name: "CS Marítimo", wikiTitle: "C.S._Mar%C3%ADtimo", stadium: "Estádio da Madeira", leagueName: "Liga Portugal" },
  { name: "Académico de Viseu", wikiTitle: "Acad%C3%A9mico_de_Viseu_F.C.", stadium: "Estádio Municipal do Fontelo", leagueName: "Liga Portugal" },
];

const SAUDI_PRO_LEAGUE_TEAMS: TeamSeed[] = [
  { name: "Al-Nassr", wikiTitle: "Al_Nassr_FC", stadium: "Al-Awwal Park", leagueName: "Saudi Pro League" },
  { name: "Al-Hilal", wikiTitle: "Al_Hilal_SFC", stadium: "Kingdom Arena", leagueName: "Saudi Pro League" },
  { name: "Al-Ittihad", wikiTitle: "Al-Ittihad_Club_(Jeddah)", stadium: "King Abdullah Sports City", leagueName: "Saudi Pro League" },
  { name: "Al-Ahli", wikiTitle: "Al-Ahli_Saudi_FC", stadium: "King Abdullah Sports City", leagueName: "Saudi Pro League" },
  { name: "Al-Qadsiah", wikiTitle: "Al-Qadsiah_FC", stadium: "Prince Mohammed bin Fahd Stadium", leagueName: "Saudi Pro League" },
  { name: "Al-Taawoun", wikiTitle: "Al-Taawoun_FC", stadium: "King Abdullah Sports City (Buraidah)", leagueName: "Saudi Pro League" },
  { name: "Al-Ettifaq", wikiTitle: "Al-Ettifaq_FC", stadium: "Prince Mohamed bin Fahd Stadium", leagueName: "Saudi Pro League" },
  { name: "Al-Shabab", wikiTitle: "Al-Shabab_FC_(Riyadh)", stadium: "Prince Faisal bin Fahd Stadium", leagueName: "Saudi Pro League" },
  { name: "Al-Fateh", wikiTitle: "Al-Fateh_SC", stadium: "Prince Abdullah bin Jalawi Stadium", leagueName: "Saudi Pro League" },
  { name: "Al-Fayha", wikiTitle: "Al-Fayha_FC", stadium: "Al-Majma'ah Sports City Stadium", leagueName: "Saudi Pro League" },
  { name: "Al-Khaleej", wikiTitle: "Al-Khaleej_Club_(Saudi_Arabia)", stadium: "Prince Saud bin Jalawi Stadium", leagueName: "Saudi Pro League" },
  { name: "Al-Kholood", wikiTitle: "Al-Kholood_Club", stadium: "Prince Saud bin Jalawi Stadium", leagueName: "Saudi Pro League" },
  { name: "Al-Riyadh", wikiTitle: "Al-Riyadh_SC", stadium: "Prince Turki bin Abdulaziz Stadium", leagueName: "Saudi Pro League" },
  { name: "Al-Hazem", wikiTitle: "Al-Hazem_FC", stadium: "King Abdulaziz Stadium", leagueName: "Saudi Pro League" },
  { name: "Al-Tai", wikiTitle: "Al-Tai_FC", stadium: "Prince Abdulaziz bin Musaid Stadium", leagueName: "Saudi Pro League" },
  { name: "Abha Club", wikiTitle: "Abha_Club", stadium: "Prince Sultan bin Abdulaziz Stadium", leagueName: "Saudi Pro League" },
  { name: "Al-Faisaly", wikiTitle: "Al_Faisaly_FC", stadium: "Al-Majma'ah Sports City", leagueName: "Saudi Pro League" },
  { name: "Al-Diriyah", wikiTitle: "Diriyah_Club", stadium: "Diriyah Arena", leagueName: "Saudi Pro League" },
];

type LogStatus = "pending" | "success" | "skipped" | "error";
interface LogEntry {
  name: string;
  status: LogStatus;
  message?: string;
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getWikipediaImageUrl(
  titleOrTitles: string | string[],
  attempt = 1,
  preferOriginal = false
): Promise<string> {
  const titles = Array.isArray(titleOrTitles) ? titleOrTitles : [titleOrTitles];
  // Player photos ask for a bigger render of the SAME curated infobox
  // crop (not the raw lead image, which is often a match action shot,
  // sometimes with other players in frame, and often cropped oddly).
  // Logos/crests stay smaller since they're simple graphics.
  const targetWidth = preferOriginal ? 500 : 330;
  let lastError: Error | null = null;

  for (const title of titles) {
    try {
      // The MediaWiki Action API's pageimages module is the same
      // engine that picks Wikipedia's infobox thumbnail, but lets us
      // request an exact pixel width directly - more reliable than
      // the REST summary endpoint (which sometimes has no image for
      // pages using certain infobox templates) and it upscales the
      // curated crop instead of falling back to an uncropped photo.
      const apiUrl = `https://en.wikipedia.org/w/api.php?action=query&format=json&formatversion=2&prop=pageimages&piprop=thumbnail&pithumbsize=${targetWidth}&redirects=1&titles=${encodeURIComponent(
        title
      )}&origin=*`;
      const res = await fetch(apiUrl);
      if (!res.ok) throw new Error(`Wikipedia API request failed for "${title}"`);
      const data = await res.json();
      const page = data?.query?.pages?.[0];
      const imageUrl = page?.thumbnail?.source;
      if (!imageUrl) throw new Error(`No image available on Wikipedia for "${title}"`);
      return imageUrl;
    } catch (err) {
      lastError = err as Error;
    }
  }
  if (attempt < 7) {
    // Exponential-ish backoff: 1200ms, 2400ms, 3600ms, 4800ms, 6000ms,
    // 7200ms - widened from the original 5-attempt/900ms version since
    // large back-to-back batches (18-19 teams in a row for Portugal and
    // Saudi Pro League) are the ones most likely to hit a sustained
    // rate limit rather than a one-off blip, and need more total room
    // to clear before giving up.
    await delay(1200 * attempt);
    return getWikipediaImageUrl(titles, attempt + 1, preferOriginal);
  }
  throw lastError ?? new Error("Wikipedia image lookup failed");
}

/**
 * Downloads an image in the browser (retrying on rate limits) and
 * uploads the file straight to Cloudinary. This avoids Cloudinary's
 * own servers fetching from Wikimedia, which Wikimedia often throttles.
 * Falls back to Cloudinary's fetch-by-URL only if the browser download
 * genuinely fails.
 */
async function fetchImageBlob(url: string): Promise<Blob> {
  let lastStatus = 0;
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const res = await fetch(url);
      if (res.ok) {
        const blob = await res.blob();
        if (blob.size > 0 && blob.type.startsWith("image/")) return blob;
        throw new Error("The download was not an image");
      }
      lastStatus = res.status;
      if (res.status !== 429 && res.status < 500) break;
    } catch (err) {
      if (attempt === 4) throw err;
    }
    await delay(1500 * attempt);
  }
  throw new Error(`Image download failed (status ${lastStatus})`);
}

async function uploadRemoteImageReliably(
  imageUrl: string,
  folder: string
): Promise<CloudinaryUploadResult> {
  try {
    const blob = await fetchImageBlob(imageUrl);
    const ext = blob.type.split("/")[1]?.split("+")[0] || "png";
    const file = new File([blob], `wiki-image.${ext}`, { type: blob.type });
    return await uploadImage(file, { folder });
  } catch {
    return uploadImageFromUrl(imageUrl, folder);
  }
}

async function importWikipediaImage(
  titleOrTitles: string | string[],
  folder: string,
  preferOriginal = false
): Promise<CloudinaryUploadResult> {
  const imageUrl = await getWikipediaImageUrl(titleOrTitles, 1, preferOriginal);
  return uploadRemoteImageReliably(imageUrl, folder);
}

function LogList({ entries }: { entries: LogEntry[] }) {
  if (entries.length === 0) return null;
  return (
    <div className="mt-4 max-h-72 overflow-y-auto rounded-card border border-border bg-surface p-3 space-y-1">
      {entries.map((entry, i) => (
        <div key={i} className="flex items-start gap-2 text-small">
          {entry.status === "pending" && (
            <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-text-secondary mt-0.5" />
          )}
          {entry.status === "success" && (
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-accent mt-0.5" />
          )}
          {entry.status === "skipped" && (
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-text-secondary mt-0.5" />
          )}
          {entry.status === "error" && (
            <XCircle className="h-3.5 w-3.5 shrink-0 text-danger mt-0.5" />
          )}
          <span className="text-text">{entry.name}</span>
          {entry.message && (
            <span className="text-caption text-text-secondary">
              {entry.message}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

export default function DataImport() {
  const [leagueLog, setLeagueLog] = useState<LogEntry[]>([]);
  const [isImportingLeagues, setIsImportingLeagues] = useState(false);
  const [plTeamLog, setPlTeamLog] = useState<LogEntry[]>([]);
  const [isImportingPlTeams, setIsImportingPlTeams] = useState(false);
  const [laLigaTeamLog, setLaLigaTeamLog] = useState<LogEntry[]>([]);
  const [isImportingLaLigaTeams, setIsImportingLaLigaTeams] = useState(false);
  const [bundesligaTeamLog, setBundesligaTeamLog] = useState<LogEntry[]>([]);
  const [isImportingBundesligaTeams, setIsImportingBundesligaTeams] = useState(false);
  const [serieATeamLog, setSerieATeamLog] = useState<LogEntry[]>([]);
  const [isImportingSerieATeams, setIsImportingSerieATeams] = useState(false);
  const [ligue1TeamLog, setLigue1TeamLog] = useState<LogEntry[]>([]);
  const [isImportingLigue1Teams, setIsImportingLigue1Teams] = useState(false);
  const [ligaPortugalTeamLog, setLigaPortugalTeamLog] = useState<LogEntry[]>([]);
  const [isImportingLigaPortugalTeams, setIsImportingLigaPortugalTeams] = useState(false);
  const [saudiTeamLog, setSaudiTeamLog] = useState<LogEntry[]>([]);
  const [isImportingSaudiTeams, setIsImportingSaudiTeams] = useState(false);
  const [playersLog, setPlayersLog] = useState<LogEntry[]>([]);
  const [isImportingPlayers, setIsImportingPlayers] = useState(false);
  const [players2Log, setPlayers2Log] = useState<LogEntry[]>([]);
  const [isImportingPlayers2, setIsImportingPlayers2] = useState(false);
  const [players3Log, setPlayers3Log] = useState<LogEntry[]>([]);
  const [isImportingPlayers3, setIsImportingPlayers3] = useState(false);
  const [players4Log, setPlayers4Log] = useState<LogEntry[]>([]);
  const [isImportingPlayers4, setIsImportingPlayers4] = useState(false);
  const [players5Log, setPlayers5Log] = useState<LogEntry[]>([]);
  const [isImportingPlayers5, setIsImportingPlayers5] = useState(false);
  const [players6Log, setPlayers6Log] = useState<LogEntry[]>([]);
  const [isImportingPlayers6, setIsImportingPlayers6] = useState(false);
  const [players7Log, setPlayers7Log] = useState<LogEntry[]>([]);
  const [isImportingPlayers7, setIsImportingPlayers7] = useState(false);
  const [players8Log, setPlayers8Log] = useState<LogEntry[]>([]);
  const [isImportingPlayers8, setIsImportingPlayers8] = useState(false);
  const [players9Log, setPlayers9Log] = useState<LogEntry[]>([]);
  const [isImportingPlayers9, setIsImportingPlayers9] = useState(false);
  const [playerStatsLog, setPlayerStatsLog] = useState<LogEntry[]>([]);
  const [isUpdatingPlayerStats, setIsUpdatingPlayerStats] = useState(false);
  const [slugFixLog, setSlugFixLog] = useState<LogEntry[]>([]);
  const [isFixingSlugs, setIsFixingSlugs] = useState(false);
  const [articleLog, setArticleLog] = useState<LogEntry[]>([]);
  const [isImportingArticles, setIsImportingArticles] = useState(false);
  const [quizLog, setQuizLog] = useState<LogEntry[]>([]);
  const [isImportingQuizzes, setIsImportingQuizzes] = useState(false);
  const [hotTakesLog, setHotTakesLog] = useState<LogEntry[]>([]);
  const [isImportingHotTakes, setIsImportingHotTakes] = useState(false);
  const [hotTakes2Log, setHotTakes2Log] = useState<LogEntry[]>([]);
  const [isImportingHotTakes2, setIsImportingHotTakes2] = useState(false);
  const [hotTakes3Log, setHotTakes3Log] = useState<LogEntry[]>([]);
  const [isImportingHotTakes3, setIsImportingHotTakes3] = useState(false);

  async function importArticles() {
    setIsImportingArticles(true);
    setArticleLog(ARTICLES.map((a) => ({ name: a.title, status: "pending" })));

    for (let i = 0; i < ARTICLES.length; i++) {
      const article = ARTICLES[i];
      const slug = slugify(article.title);
      try {
        const existing = await getDocumentBySlug<{ id: string; coverImageUrl?: string; createdAt?: number }>("articles", slug);
        if (existing) {
          // Already imported. If it has no cover image yet, try to add one now.
          if (!existing.coverImageUrl && article.imageWikiTitle) {
            try {
              const uploaded = await importWikipediaImage(article.imageWikiTitle, "dg-tribune/articles");
              await updateDocumentById("articles", existing.id, { coverImageUrl: uploaded.url });
              setArticleLog((prev) =>
                prev.map((e, idx) => (idx === i ? { ...e, status: "success", message: "cover image added" } : e))
              );
            } catch (imgErr) {
              setArticleLog((prev) =>
                prev.map((e, idx) => (idx === i ? { ...e, status: "error", message: `cover image still failing: ${(imgErr as Error).message}` } : e))
              );
            }
            await delay(1000);
            continue;
          }
          setArticleLog((prev) =>
            prev.map((e, idx) => (idx === i ? { ...e, status: "skipped", message: "already imported" } : e))
          );
          continue;
        }

        let coverImageUrl = "";
        if (article.imageWikiTitle) {
          try {
            const uploaded = await importWikipediaImage(article.imageWikiTitle, "dg-tribune/articles");
            coverImageUrl = uploaded.url;
          } catch {
            // Cover image is best-effort - article still saves without one.
          }
        }

        await createDocument("articles", {
          title: article.title,
          slug,
          excerpt: article.excerpt,
          body: article.body,
          coverImageUrl: coverImageUrl || "",
          categoryId: null,
          tags: [],
          authorName: "DG Tribune Staff",
          isFeatured: false,
          viewCount: 0,
          status: "draft",
        });

        setArticleLog((prev) =>
          prev.map((e, idx) => (idx === i ? { ...e, status: "success", message: "saved as draft - add a cover image and publish" } : e))
        );
      } catch (err) {
        setArticleLog((prev) =>
          prev.map((e, idx) =>
            idx === i ? { ...e, status: "error", message: (err as Error).message } : e
          )
        );
      }
    }
    setIsImportingArticles(false);
  }

  async function importQuizzes() {
    setIsImportingQuizzes(true);
    setQuizLog(QUIZZES.map((q) => ({ name: q.title, status: "pending" })));

    for (let i = 0; i < QUIZZES.length; i++) {
      const quiz = QUIZZES[i];
      const slug = slugify(quiz.title);
      try {
        const existing = await getDocumentBySlug("quizzes", slug);
        if (existing) {
          setQuizLog((prev) =>
            prev.map((e, idx) => (idx === i ? { ...e, status: "skipped", message: "already imported" } : e))
          );
          continue;
        }

        // Quiz covers are now generated automatically (QuizCoverArt) from the
        // title, so imports no longer fetch a Wikipedia photo for this.
        await createDocument("quizzes", {
          title: quiz.title,
          slug,
          description: quiz.description,
          coverImageUrl: "",
          questions: quiz.questions.map((q) => ({ ...q, id: crypto.randomUUID() })),
          playCount: 0,
          status: "published",
        });

        setQuizLog((prev) =>
          prev.map((e, idx) => (idx === i ? { ...e, status: "success" } : e))
        );
      } catch (err) {
        setQuizLog((prev) =>
          prev.map((e, idx) =>
            idx === i ? { ...e, status: "error", message: (err as Error).message } : e
          )
        );
      }
      await delay(700);
    }
    setIsImportingQuizzes(false);
  }

  async function importHotTakes(
    batch: ShortUpdateSeed[],
    setLog: Dispatch<SetStateAction<LogEntry[]>>,
    setIsImporting: Dispatch<SetStateAction<boolean>>
  ) {
    setIsImporting(true);
    setLog(batch.map((h) => ({ name: h.text.slice(0, 50) + "...", status: "pending" })));

    for (let i = 0; i < batch.length; i++) {
      const take = batch[i];
      const slug = slugify(take.text).slice(0, 60) || `hot-take-${i}`;
      try {
        const existing = await getDocumentBySlug("shortUpdates", slug);
        if (existing) {
          setLog((prev) =>
            prev.map((e, idx) => (idx === i ? { ...e, status: "skipped", message: "already imported" } : e))
          );
          continue;
        }

        let imageUrl: string | null = null;
        if (take.wikiTitle) {
          // preferOriginal=true - a clean, full-resolution photo.
          const photo = await importWikipediaImage(take.wikiTitle, "dg-tribune/hot-takes", true);
          imageUrl = photo.url;
        }

        await createDocument("shortUpdates", {
          text: take.text,
          slug,
          imageUrl,
          linkedArticleId: null,
          likeCount: 0,
          status: "published",
        });

        setLog((prev) => prev.map((e, idx) => (idx === i ? { ...e, status: "success" } : e)));
      } catch (err) {
        setLog((prev) =>
          prev.map((e, idx) =>
            idx === i ? { ...e, status: "error", message: (err as Error).message } : e
          )
        );
      }
      await delay(700);
    }
    setIsImporting(false);
  }

  async function importLeagues() {
    setIsImportingLeagues(true);
    setLeagueLog(LEAGUES.map((l) => ({ name: l.name, status: "pending" })));

    for (let i = 0; i < LEAGUES.length; i++) {
      const league = LEAGUES[i];
      const slug = slugify(league.name);
      try {
        const existing = await getDocumentBySlug("leagues", slug);
        if (existing) {
          setLeagueLog((prev) =>
            prev.map((e, idx) => (idx === i ? { ...e, status: "skipped", message: "already imported" } : e))
          );
          continue;
        }

        const logo = await importWikipediaImage(league.wikiTitle, "dg-tribune/leagues");

        await createDocument("leagues", {
          name: league.name,
          slug,
          logoUrl: logo.url,
          country: league.country,
          bio: `${league.name} - one of the world's top football competitions.`,
          status: "published",
        });
        createDocument("media", {
          url: logo.url,
          cloudinaryPublicId: logo.publicId,
          width: logo.width,
          height: logo.height,
          uploadedAt: Date.now(),
          usedIn: [],
        }).catch(() => {});

        setLeagueLog((prev) =>
          prev.map((e, idx) => (idx === i ? { ...e, status: "success" } : e))
        );
      } catch (err) {
        setLeagueLog((prev) =>
          prev.map((e, idx) =>
            idx === i ? { ...e, status: "error", message: (err as Error).message } : e
          )
        );
      }
      await delay(700);
    }
    setIsImportingLeagues(false);
  }

/**
 * Builds a direct Wikimedia Commons file URL via Special:FilePath -
 * bypasses Wikipedia's pageimages algorithm entirely by requesting a
 * known file by name. Used as a fallback for the handful of clubs
 * whose Wikipedia page has no extractable pageimage (Wikidata-sourced
 * infobox images, mainly).
 */
function getCommonsFileUrl(filename: string, width = 320): string {
  return `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(
    filename
  )}?width=${width}`;
}

  async function importTeams(
    teams: TeamSeed[],
    leagueSlug: string,
    setLog: (fn: (prev: LogEntry[]) => LogEntry[]) => void,
    setIsImporting: (v: boolean) => void
  ) {
    setIsImporting(true);
    setLog(() => teams.map((t) => ({ name: t.name, status: "pending" })));

    const league = await getDocumentBySlug<{ id: string }>("leagues", leagueSlug);

    for (let i = 0; i < teams.length; i++) {
      const team = teams[i];
      const slug = slugify(team.name);
      try {
        const existing = await getDocumentBySlug("teams", slug);
        if (existing) {
          setLog((prev) =>
            prev.map((e, idx) => (idx === i ? { ...e, status: "skipped", message: "already imported" } : e))
          );
          continue;
        }

        const logo = team.commonsFile
          ? await uploadRemoteImageReliably(getCommonsFileUrl(team.commonsFile), "dg-tribune/teams")
          : await importWikipediaImage(team.wikiTitle, "dg-tribune/teams");

        await createDocument("teams", {
          name: team.name,
          slug,
          logoUrl: logo.url,
          leagueId: league?.id ?? null,
          founded: team.founded ?? null,
          stadium: team.stadium,
          bio: `${team.name} compete in the ${team.leagueName}, playing home matches at ${team.stadium}.`,
          status: "published",
        });
        createDocument("media", {
          url: logo.url,
          cloudinaryPublicId: logo.publicId,
          width: logo.width,
          height: logo.height,
          uploadedAt: Date.now(),
          usedIn: [],
        }).catch(() => {});

        setLog((prev) =>
          prev.map((e, idx) => (idx === i ? { ...e, status: "success" } : e))
        );
      } catch (err) {
        setLog((prev) =>
          prev.map((e, idx) =>
            idx === i ? { ...e, status: "error", message: (err as Error).message } : e
          )
        );
      }
      await delay(1100);
    }
    setIsImporting(false);
  }

  async function importPlayers(
    batch: PlayerSeed[],
    setLog: Dispatch<SetStateAction<LogEntry[]>>,
    setIsImporting: Dispatch<SetStateAction<boolean>>
  ) {
    setIsImporting(true);
    setLog(batch.map((p) => ({ name: p.name, status: "pending" })));

    // Cache each team lookup - many players share a club, and there's
    // no reason to re-query Firestore for the same team repeatedly.
    const teamCache = new Map<string, { id: string; name: string } | null>();
    async function resolveTeam(slug: string) {
      if (!teamCache.has(slug)) {
        teamCache.set(
          slug,
          await getDocumentBySlug<{ id: string; name: string }>("teams", slug)
        );
      }
      return teamCache.get(slug) ?? null;
    }

    for (let i = 0; i < batch.length; i++) {
      const player = batch[i];
      const slug = slugify(player.name);
      try {
        const existing = await getDocumentBySlug("players", slug);
        if (existing) {
          setLog((prev) =>
            prev.map((e, idx) => (idx === i ? { ...e, status: "skipped", message: "already imported" } : e))
          );
          continue;
        }

        const team = await resolveTeam(player.teamSlug);
        if (!team) {
          setLog((prev) =>
            prev.map((e, idx) =>
              idx === i
                ? { ...e, status: "error", message: `team not found - import that league's clubs first` }
                : e
            )
          );
          continue;
        }

        // preferOriginal=true - a clean, full-resolution photo rather
        // than a small blurry thumbnail.
        const photo = await importWikipediaImage(player.wikiTitle, "dg-tribune/players", true);

        await createDocument("players", {
          name: player.name,
          slug,
          photoUrl: photo.url,
          position: player.position,
          nationality: player.nationality,
          dateOfBirth: player.dateOfBirth,
          currentTeamId: team.id,
          jerseyNumber: player.jerseyNumber,
          bio: `${player.name} plays as a ${player.position.toLowerCase()} for ${team.name}.`,
          stats: player.stats ?? {},
          cleanSheets: player.cleanSheets ?? 0,
          status: "published",
        });
        createDocument("media", {
          url: photo.url,
          cloudinaryPublicId: photo.publicId,
          width: photo.width,
          height: photo.height,
          uploadedAt: Date.now(),
          usedIn: [],
        }).catch(() => {});

        setLog((prev) => prev.map((e, idx) => (idx === i ? { ...e, status: "success" } : e)));
      } catch (err) {
        setLog((prev) =>
          prev.map((e, idx) =>
            idx === i ? { ...e, status: "error", message: (err as Error).message } : e
          )
        );
      }
      await delay(1000);
    }
    setIsImporting(false);
  }

  return (
    <div className="max-w-2xl">
      <Badge variant="warning" className="mb-3">
        One-time admin tool
      </Badge>
      <h1 className="font-heading text-page-title text-text mb-2">
        Data Import
      </h1>
      <p className="text-body text-text-secondary mb-8">
        Bulk-populates real leagues and teams using each Wikipedia page's
        real, current image. Safe to click more than once - anything
        already imported is skipped automatically.
      </p>

      <div className="rounded-card border border-border bg-surface p-5 mb-6">
        <h2 className="font-heading text-card-title text-text mb-1">
          Step 1 - Leagues
        </h2>
        <p className="text-small text-text-secondary mb-4">
          Premier League, La Liga, Bundesliga, Serie A, Ligue 1, Liga
          Portugal.
        </p>
        <Button onClick={importLeagues} isLoading={isImportingLeagues}>
          Import Leagues
        </Button>
        <LogList entries={leagueLog} />
      </div>

      <div className="rounded-card border border-border bg-surface p-5 mb-6">
        <h2 className="font-heading text-card-title text-text mb-1">
          Step 2 - Premier League Clubs
        </h2>
        <p className="text-small text-text-secondary mb-4">
          All 20 clubs confirmed for the 2026-27 season, with real crests
          and stadiums. Run Step 1 first so teams can link to their league.
        </p>
        <Button
          onClick={() =>
            importTeams(PREMIER_LEAGUE_TEAMS, "premier-league", setPlTeamLog, setIsImportingPlTeams)
          }
          isLoading={isImportingPlTeams}
        >
          Import Premier League Clubs
        </Button>
        <LogList entries={plTeamLog} />
      </div>

      <div className="rounded-card border border-border bg-surface p-5">
        <h2 className="font-heading text-card-title text-text mb-1">
          Step 3 - La Liga Clubs
        </h2>
        <p className="text-small text-text-secondary mb-4">
          19 confirmed clubs for the 2026-27 season (a 3rd promoted club's
          play-off spot wasn't confirmed yet at build time, so it's left
          out rather than guessed). Run Step 1 first.
        </p>
        <Button
          onClick={() =>
            importTeams(LA_LIGA_TEAMS, "la-liga", setLaLigaTeamLog, setIsImportingLaLigaTeams)
          }
          isLoading={isImportingLaLigaTeams}
        >
          Import La Liga Clubs
        </Button>
        <LogList entries={laLigaTeamLog} />
      </div>

      <div className="rounded-card border border-border bg-surface p-5 mt-6">
        <h2 className="font-heading text-card-title text-text mb-1">
          Step 3b - Bundesliga Clubs
        </h2>
        <p className="text-small text-text-secondary mb-4">
          All 18 confirmed clubs for the 2026-27 season. Run Step 1 first.
        </p>
        <Button
          onClick={() =>
            importTeams(BUNDESLIGA_TEAMS, "bundesliga", setBundesligaTeamLog, setIsImportingBundesligaTeams)
          }
          isLoading={isImportingBundesligaTeams}
        >
          Import Bundesliga Clubs
        </Button>
        <LogList entries={bundesligaTeamLog} />
      </div>

      <div className="rounded-card border border-border bg-surface p-5 mt-6">
        <h2 className="font-heading text-card-title text-text mb-1">
          Step 3c - Serie A Clubs
        </h2>
        <p className="text-small text-text-secondary mb-4">
          All 20 confirmed clubs for the 2026-27 season, including newly
          promoted Venezia, Frosinone and Monza. Run Step 1 first.
        </p>
        <Button
          onClick={() =>
            importTeams(SERIE_A_TEAMS, "serie-a", setSerieATeamLog, setIsImportingSerieATeams)
          }
          isLoading={isImportingSerieATeams}
        >
          Import Serie A Clubs
        </Button>
        <LogList entries={serieATeamLog} />
      </div>

      <div className="rounded-card border border-border bg-surface p-5 mt-6">
        <h2 className="font-heading text-card-title text-text mb-1">
          Step 3d - Ligue 1 Clubs
        </h2>
        <p className="text-small text-text-secondary mb-4">
          All 18 confirmed clubs for the 2026-27 season, including newly
          promoted Troyes and Le Mans. Run Step 1 first.
        </p>
        <Button
          onClick={() =>
            importTeams(LIGUE_1_TEAMS, "ligue-1", setLigue1TeamLog, setIsImportingLigue1Teams)
          }
          isLoading={isImportingLigue1Teams}
        >
          Import Ligue 1 Clubs
        </Button>
        <LogList entries={ligue1TeamLog} />
      </div>

      <div className="rounded-card border border-border bg-surface p-5 mt-6">
        <h2 className="font-heading text-card-title text-text mb-1">
          Step 3e - Liga Portugal Clubs
        </h2>
        <p className="text-small text-text-secondary mb-4">
          All 18 confirmed clubs for the 2026-27 season, including newly
          promoted Marítimo and Académico de Viseu. Run Step 1 first.
        </p>
        <Button
          onClick={() =>
            importTeams(LIGA_PORTUGAL_TEAMS, "liga-portugal", setLigaPortugalTeamLog, setIsImportingLigaPortugalTeams)
          }
          isLoading={isImportingLigaPortugalTeams}
        >
          Import Liga Portugal Clubs
        </Button>
        <LogList entries={ligaPortugalTeamLog} />
      </div>

      <div className="rounded-card border border-border bg-surface p-5 mt-6">
        <h2 className="font-heading text-card-title text-text mb-1">
          Step 3f - Saudi Pro League Clubs
        </h2>
        <p className="text-small text-text-secondary mb-4">
          All 18 confirmed clubs for the 2026-27 season, including newly
          promoted Abha, Al-Faisaly and Al-Diriyah. Run Step 1 first (adds
          the Saudi Pro League itself if it isn't imported yet).
        </p>
        <Button
          onClick={() =>
            importTeams(SAUDI_PRO_LEAGUE_TEAMS, "saudi-pro-league", setSaudiTeamLog, setIsImportingSaudiTeams)
          }
          isLoading={isImportingSaudiTeams}
        >
          Import Saudi Pro League Clubs
        </Button>
        <LogList entries={saudiTeamLog} />
      </div>

      <div className="rounded-card border border-border bg-surface p-5 mt-6">
        <h2 className="font-heading text-card-title text-text mb-1">
          Step 3g - Players (Batch 1)
        </h2>
        <p className="text-small text-text-secondary mb-4">
          77 real, current marquee players across the clubs already
          imported - real positions, nationalities, dates of birth and
          jersey numbers, with a clean, full-resolution Wikipedia photo
          for each (not a small thumbnail). Not full squads yet, just a
          strong first batch to unblock the Dream Team Builder, quizzes,
          and predictors. Run the league/club import steps above first
          so each player can link to their team.
        </p>
        <Button onClick={() => importPlayers(PLAYERS_BATCH_1, setPlayersLog, setIsImportingPlayers)} isLoading={isImportingPlayers}>
          Import Players (Batch 1)
        </Button>
        <LogList entries={playersLog} />
      </div>

      <div className="rounded-card border border-border bg-surface p-5 mt-6">
        <h2 className="font-heading text-card-title text-text mb-1">
          Step 3h - Players (Batch 2)
        </h2>
        <p className="text-small text-text-secondary mb-4">
          32 more real players, closing the gap on Batch 1 - every
          remaining Premier League club now has at least one player,
          plus more Serie A, Ligue 1 and Liga Portugal depth. Same
          full-resolution photo approach. Run Batch 1 first (or at
          least the league/club import steps above).
        </p>
        <Button onClick={() => importPlayers(PLAYERS_BATCH_2, setPlayers2Log, setIsImportingPlayers2)} isLoading={isImportingPlayers2}>
          Import Players (Batch 2)
        </Button>
        <LogList entries={players2Log} />
      </div>

      <div className="rounded-card border border-border bg-surface p-5 mt-6">
        <h2 className="font-heading text-card-title text-text mb-1">
          Step 3i - Players (Batch 3 - Full Squads)
        </h2>
        <p className="text-small text-text-secondary mb-4">
          51 more players - instead of spreading thin, this batch goes
          deep on six of the biggest clubs already in the database
          (Arsenal, Liverpool, Manchester City, Real Madrid, Barcelona,
          Bayern Munich), bringing each up to a genuinely full squad
          across every position. Run the league/club import steps above
          first.
        </p>
        <Button onClick={() => importPlayers(PLAYERS_BATCH_3, setPlayers3Log, setIsImportingPlayers3)} isLoading={isImportingPlayers3}>
          Import Players (Batch 3)
        </Button>
        <LogList entries={players3Log} />
      </div>

      <div className="rounded-card border border-border bg-surface p-5 mt-6">
        <h2 className="font-heading text-card-title text-text mb-1">
          Step 3j - Players (Batch 4 - Full Squads)
        </h2>
        <p className="text-small text-text-secondary mb-4">
          40 more players, deepening six more clubs into full squads:
          Chelsea, Manchester United, Tottenham Hotspur, Paris
          Saint-Germain, Juventus and Inter Milan. Run the league/club
          import steps above first.
        </p>
        <Button onClick={() => importPlayers(PLAYERS_BATCH_4, setPlayers4Log, setIsImportingPlayers4)} isLoading={isImportingPlayers4}>
          Import Players (Batch 4)
        </Button>
        <LogList entries={players4Log} />
      </div>

      <div className="rounded-card border border-border bg-surface p-5 mt-6">
        <h2 className="font-heading text-card-title text-text mb-1">
          Step 3k - Players (Batch 5 - Full Squads)
        </h2>
        <p className="text-small text-text-secondary mb-4">
          33 more players, deepening six more clubs into full squads:
          Napoli, AC Milan, AS Roma, Newcastle United, Atlético Madrid
          and Borussia Dortmund. Run the league/club import steps above
          first.
        </p>
        <Button onClick={() => importPlayers(PLAYERS_BATCH_5, setPlayers5Log, setIsImportingPlayers5)} isLoading={isImportingPlayers5}>
          Import Players (Batch 5)
        </Button>
        <LogList entries={players5Log} />
      </div>

      <div className="rounded-card border border-border bg-surface p-5 mt-6">
        <h2 className="font-heading text-card-title text-text mb-1">
          Step 3l - Players (Batch 6 - Full Squads)
        </h2>
        <p className="text-small text-text-secondary mb-4">
          30 more players, deepening six more clubs that only had 1-2
          players: Bayer Leverkusen, RB Leipzig, Athletic Bilbao, Aston
          Villa, Sporting CP and SL Benfica. Run the league/club import
          steps above first.
        </p>
        <Button onClick={() => importPlayers(PLAYERS_BATCH_6, setPlayers6Log, setIsImportingPlayers6)} isLoading={isImportingPlayers6}>
          Import Players (Batch 6)
        </Button>
        <LogList entries={players6Log} />
      </div>

      <div className="rounded-card border border-border bg-surface p-5 mt-6">
        <h2 className="font-heading text-card-title text-text mb-1">
          Step 3m - Players (Batch 7 - Saudi Pro League)
        </h2>
        <p className="text-small text-text-secondary mb-4">
          14 more players across the four Saudi Pro League clubs
          (only had 2 each): Al-Nassr, Al-Hilal, Al-Ittihad, Al-Ahli.
          Al-Nassr actually won the 2025-26 title - their first since
          2018-19 - verified via search, not assumed. Run the
          league/club import steps above first.
        </p>
        <Button onClick={() => importPlayers(PLAYERS_BATCH_7, setPlayers7Log, setIsImportingPlayers7)} isLoading={isImportingPlayers7}>
          Import Players (Batch 7)
        </Button>
        <LogList entries={players7Log} />
      </div>

      <div className="rounded-card border border-border bg-surface p-5 mt-6">
        <h2 className="font-heading text-card-title text-text mb-1">
          Step 3n - Players (Batch 8 - Full Squads)
        </h2>
        <p className="text-small text-text-secondary mb-4">
          40 more players, deepening 11 more clubs that only had 1
          player: FC Porto, six more Serie A clubs (Atalanta, Bologna,
          Fiorentina, Lazio, Torino, Udinese) and four more Ligue 1
          clubs (Lille, Lyon, Nice, RC Lens). Jersey numbers stay
          conservative - only set where widely known, null otherwise.
          Run the league/club import steps above first.
        </p>
        <Button onClick={() => importPlayers(PLAYERS_BATCH_8, setPlayers8Log, setIsImportingPlayers8)} isLoading={isImportingPlayers8}>
          Import Players (Batch 8)
        </Button>
        <LogList entries={players8Log} />
      </div>

      <div className="rounded-card border border-border bg-surface p-5 mt-6">
        <h2 className="font-heading text-card-title text-text mb-1">
          Step 3o - Players (Batch 9 - Full Squads)
        </h2>
        <p className="text-small text-text-secondary mb-4">
          34 more players - the last 10 clubs that only had 1 player:
          Genoa, Cagliari, Parma, Lecce, Sassuolo, Strasbourg, Toulouse,
          Stade Brestois, AJ Auxerre and SC Braga. Every imported club
          now has a real squad. Run the league/club import steps above
          first.
        </p>
        <Button onClick={() => importPlayers(PLAYERS_BATCH_9, setPlayers9Log, setIsImportingPlayers9)} isLoading={isImportingPlayers9}>
          Import Players (Batch 9)
        </Button>
        <LogList entries={players9Log} />
      </div>

      <div className="rounded-card border border-border bg-surface p-5 mt-6">
        <h2 className="font-heading text-card-title text-text mb-1">
          Step 3p - Fix Broken Slugs
        </h2>
        <p className="text-small text-text-secondary mb-4">
          A bug in the old slug generator dropped accented letters entirely
          instead of converting them (e.g. "Mbappé" became "kylian-mbapp"
          instead of "kylian-mbappe"), which affects live URLs for players,
          teams, and leagues with accented names. This scans every
          collection, recalculates the correct slug, and updates anything
          that's wrong. Safe to run any time - it does nothing if slugs are
          already correct. Run this before Update Player Stats below, since
          that tool looks players up by their (now corrected) slug.
        </p>
        <Button onClick={() => fixBrokenSlugs(setSlugFixLog, setIsFixingSlugs)} isLoading={isFixingSlugs}>
          Fix Broken Slugs
        </Button>
        <LogList entries={slugFixLog} />
      </div>

      <div className="rounded-card border border-border bg-surface p-5 mt-6">
        <h2 className="font-heading text-card-title text-text mb-1">
          Step 3q - Update Player Stats
        </h2>
        <p className="text-small text-text-secondary mb-4">
          Fills in real, verified season stats (appearances, goals, assists)
          for players already imported above - this only updates existing
          player records, it never creates new ones, so run the player
          import steps first. Only players with every field confirmed across
          multiple sources are included; anyone with a conflicting or
          unconfirmable number is deliberately left out rather than guessed.
        </p>
        <Button
          onClick={() => updatePlayerStats(PLAYER_STAT_UPDATES, setPlayerStatsLog, setIsUpdatingPlayerStats)}
          isLoading={isUpdatingPlayerStats}
        >
          Update Player Stats
        </Button>
        <LogList entries={playerStatsLog} />
      </div>

      <div className="rounded-card border border-border bg-surface p-5 mt-6">
        <h2 className="font-heading text-card-title text-text mb-1">
          Step 4 - Articles
        </h2>
        <p className="text-small text-text-secondary mb-4">
          3 real, current articles (2026 World Cup recap, World Cup winners
          history, transfer window overview) saved as drafts - add a cover
          image to each and publish when ready.
        </p>
        <Button onClick={importArticles} isLoading={isImportingArticles}>
          Import Articles
        </Button>
        <LogList entries={articleLog} />
      </div>

      <div className="rounded-card border border-border bg-surface p-5 mt-6">
        <h2 className="font-heading text-card-title text-text mb-1">
          Step 5 - Quizzes
        </h2>
        <p className="text-small text-text-secondary mb-4">
          7 real trivia quizzes (World Cup Legends, Premier League History,
          Champions League, Football Legends, La Liga, Bundesliga, Football
          Records), each with a real cover thumbnail, published and ready to
          play immediately.
        </p>
        <Button onClick={importQuizzes} isLoading={isImportingQuizzes}>
          Import Quizzes
        </Button>
        <LogList entries={quizLog} />
      </div>

      <div className="rounded-card border border-border bg-surface p-5 mt-6">
        <h2 className="font-heading text-card-title text-text mb-1">
          Step 6 - Hot Takes
        </h2>
        <p className="text-small text-text-secondary mb-4">
          14 real, current, opinion-style hot takes for the public Hot
          Takes feed - tied to storylines already reflected in the
          imported squads (Rodri to Barcelona, Isak and Wirtz at
          Liverpool, Gyökeres at Arsenal, De Bruyne and McTominay at
          Napoli, Ronaldo at Al-Nassr). Most include a real,
          full-resolution photo. No fabricated stats - these are
          opinions, not claims.
        </p>
        <Button onClick={() => importHotTakes(HOT_TAKES, setHotTakesLog, setIsImportingHotTakes)} isLoading={isImportingHotTakes}>
          Import Hot Takes (Batch 1)
        </Button>
        <LogList entries={hotTakesLog} />
      </div>

      <div className="rounded-card border border-border bg-surface p-5 mt-6">
        <h2 className="font-heading text-card-title text-text mb-1">
          Step 7 - Hot Takes (Batch 2)
        </h2>
        <p className="text-small text-text-secondary mb-4">
          12 more real, current hot takes - including Arsenal's actual
          2025-26 Premier League title win, Haaland's Golden Boot,
          David Raya's Golden Glove, and Antoine Semenyo's real
          British-record move to Manchester City. Same real-photo
          approach as Batch 1.
        </p>
        <Button onClick={() => importHotTakes(HOT_TAKES_BATCH_2, setHotTakes2Log, setIsImportingHotTakes2)} isLoading={isImportingHotTakes2}>
          Import Hot Takes (Batch 2)
        </Button>
        <LogList entries={hotTakes2Log} />
      </div>

      <div className="rounded-card border border-border bg-surface p-5 mt-6">
        <h2 className="font-heading text-card-title text-text mb-1">
          Step 8 - Hot Takes (Batch 3 - Spicier)
        </h2>
        <p className="text-small text-text-secondary mb-4">
          12 more hot takes with a sharper, funnier, more current tone -
          fan-culture banter and jokes (with emojis), still grounded in
          real facts and moments, not fabricated claims about anyone.
        </p>
        <Button onClick={() => importHotTakes(HOT_TAKES_BATCH_3, setHotTakes3Log, setIsImportingHotTakes3)} isLoading={isImportingHotTakes3}>
          Import Hot Takes (Batch 3)
        </Button>
        <LogList entries={hotTakes3Log} />
      </div>
    </div>
  );
}
