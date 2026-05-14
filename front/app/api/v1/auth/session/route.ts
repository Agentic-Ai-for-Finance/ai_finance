import { jsonOk } from "@/lib/server/http";
import { getAuthEnvDiagnostics, getCurrentAppSession } from "@/lib/server/app-auth";

export async function GET() {
  const session = await getCurrentAppSession();
  const diagnostics = getAuthEnvDiagnostics();

  return jsonOk({
    signedIn: Boolean(session),
    session,
    authEnv: diagnostics,
  });
}
