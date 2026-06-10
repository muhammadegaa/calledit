import type { Call } from "./game";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const headers = {
  apikey: KEY,
  Authorization: `Bearer ${KEY}`,
  "Content-Type": "application/json",
};

export async function insertCalls(
  anonId: string,
  roundDate: string,
  calls: { launch_id: string; call: Call }[]
) {
  const rows = calls.map((c) => ({ anon_id: anonId, round_date: roundDate, ...c }));
  const res = await fetch(`${URL}/rest/v1/calls?on_conflict=anon_id,round_date,launch_id`, {
    method: "POST",
    headers: { ...headers, Prefer: "resolution=ignore-duplicates" },
    body: JSON.stringify(rows),
  });
  if (!res.ok) throw new Error(`insertCalls ${res.status}: ${(await res.text()).slice(0, 120)}`);
}

export async function getCrowd(
  roundDate: string
): Promise<Record<string, { ships: number; total: number }>> {
  const res = await fetch(
    `${URL}/rest/v1/crowd?round_date=eq.${roundDate}&select=launch_id,ships,total`,
    { headers, next: { revalidate: 60 } }
  );
  if (!res.ok) return {};
  const out: Record<string, { ships: number; total: number }> = {};
  for (const r of await res.json()) out[r.launch_id] = { ships: r.ships, total: r.total };
  return out;
}
