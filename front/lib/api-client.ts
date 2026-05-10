export async function getJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    credentials: "same-origin",
    cache: "no-store",
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      payload && typeof payload === "object" && "error" in payload && payload.error && typeof payload.error === "object"
        ? String((payload.error as { message?: string }).message ?? "Request failed.")
        : "Request failed.";
    throw new Error(message);
  }

  return payload as T;
}
