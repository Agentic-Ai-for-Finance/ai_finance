import { jsonOk } from "@/lib/server/http";
import { getCurrentAppSession } from "@/lib/server/app-auth";

export async function GET() {
  const session = await getCurrentAppSession();

  return jsonOk({
    signedIn: Boolean(session),
    session,
  });
}
