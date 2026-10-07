/**
 * PHASE 3 - FIREBASE INTEGRATION VERIFICATION SCREEN.
 *
 * Temporary checkpoint page. Runs a real, live check against each
 * of the three external services using your actual credentials:
 *   1. Firebase (app init + a Firestore read)
 *   2. Cloudinary (config presence - full upload test happens once
 *      the CMS media uploader is built in Phase 6)
 *   3. Football-Data.org (a real competitions request)
 *
 * Replaced by the real Homepage in Phase 7.
 */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, XCircle, Loader2, AlertCircle } from "lucide-react";
import { Navbar } from "@/components/navigation/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Container } from "@/components/layout/Container";
import { Badge } from "@/components/ui/Badge";
import { ROUTES } from "@/constants/routes";
import { app } from "@/services/firebase/config";
import { getCollectionDocs } from "@/services/firebase/firestore";
import { getCompetitions, type Competition } from "@/services/footballAPI/client";

type CheckStatus = "pending" | "success" | "error";

interface CheckResult {
  status: CheckStatus;
  message: string;
}

function StatusRow({ label, result }: { label: string; result: CheckResult }) {
  const icon =
    result.status === "pending" ? (
      <Loader2 className="h-5 w-5 animate-spin text-text-secondary" />
    ) : result.status === "success" ? (
      <CheckCircle2 className="h-5 w-5 text-accent" />
    ) : (
      <XCircle className="h-5 w-5 text-danger" />
    );

  return (
    <div className="flex items-start gap-3 py-3 border-b border-divider last:border-0">
      {icon}
      <div>
        <p className="text-body text-text font-medium">{label}</p>
        <p className="text-small text-text-secondary">{result.message}</p>
      </div>
    </div>
  );
}

export default function Phase3Status() {
  const [firebaseCheck, setFirebaseCheck] = useState<CheckResult>({
    status: "pending",
    message: "Connecting…",
  });
  const [cloudinaryCheck, setCloudinaryCheck] = useState<CheckResult>({
    status: "pending",
    message: "Checking configuration…",
  });
  const [footballCheck, setFootballCheck] = useState<CheckResult>({
    status: "pending",
    message: "Requesting live data…",
  });
  const [competitions, setCompetitions] = useState<Competition[]>([]);

  useEffect(() => {
    // 1. Firebase: app initialized + a real Firestore read attempt.
    (async () => {
      try {
        if (!app.options.projectId) throw new Error("no project id");
        await getCollectionDocs("siteSettings", { limit: 1 });
        setFirebaseCheck({
          status: "success",
          message: `Connected to Firebase project "${app.options.projectId}" and read from Firestore successfully.`,
        });
      } catch (err) {
        setFirebaseCheck({
          status: "error",
          message:
            (err as Error).message ||
            "Firebase app initialized, but the Firestore read failed - check your security rules are published.",
        });
      }
    })();

    // 2. Cloudinary: verify env vars are present (real upload test comes in Phase 6's CMS uploader).
    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
    const preset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
    if (cloudName && preset) {
      setCloudinaryCheck({
        status: "success",
        message: `Cloud name "${cloudName}" and upload preset "${preset}" are configured. Full upload test happens in Phase 6.`,
      });
    } else {
      setCloudinaryCheck({
        status: "error",
        message: "Missing Cloudinary environment variables.",
      });
    }

    // 3. Football-Data.org: a real live request.
    (async () => {
      try {
        const data = await getCompetitions();
        setCompetitions(data.slice(0, 6));
        setFootballCheck({
          status: "success",
          message: `Fetched ${data.length} competitions from the live API.`,
        });
      } catch (err) {
        setFootballCheck({
          status: "error",
          message: (err as Error).message,
        });
      }
    })();
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 py-10">
        <Container>
          <Badge variant="accent" className="mb-3">
            Phase 3 · Firebase Integration
          </Badge>
          <h1 className="font-heading text-page-title text-text mb-2">
            Connection Check
          </h1>
          <p className="text-body text-text-secondary mb-8">
            Live results against your real Firebase, Cloudinary, and
            Football-Data.org credentials.
          </p>

          <div className="max-w-2xl rounded-card border border-border bg-surface p-6 mb-8">
            <StatusRow label="Firebase (Auth + Firestore)" result={firebaseCheck} />
            <StatusRow label="Cloudinary" result={cloudinaryCheck} />
            <StatusRow label="Football-Data.org API" result={footballCheck} />
          </div>

          {footballCheck.status === "error" && (
            <div className="max-w-2xl flex gap-3 rounded-card border border-warning/30 bg-warning/5 p-4 mb-8">
              <AlertCircle className="h-5 w-5 shrink-0 text-warning" />
              <p className="text-small text-text-secondary">
                If this keeps failing with a network-style error (not a 429),
                it's likely football-data.org blocking direct browser requests
                (CORS) rather than a problem with your token. That's normal -
                we'll route football data through a Netlify function at
                deployment (Phase 14) so it's never called straight from the
                browser in production.
              </p>
            </div>
          )}

          {competitions.length > 0 && (
            <div className="max-w-2xl">
              <h2 className="font-heading text-card-title text-text mb-3">
                Sample live data
              </h2>
              <ul className="space-y-2">
                {competitions.map((c) => (
                  <li
                    key={c.id}
                    className="flex items-center gap-3 rounded-button border border-border bg-surface px-4 py-3"
                  >
                    {c.emblem && (
                      <img src={c.emblem} alt="" className="h-6 w-6 object-contain" />
                    )}
                    <span className="text-body text-text">{c.name}</span>
                    <span className="text-caption text-text-secondary ml-auto">
                      {c.area.name}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <p className="mt-10 text-caption text-text-secondary">
            Ready for Phase 4 - Authentication.{" "}
            <Link to={ROUTES.adminLogin} className="text-accent underline">
              Go to Admin Login →
            </Link>
          </p>
        </Container>
      </main>
      <Footer />
    </div>
  );
}
