import { neon } from "@neondatabase/serverless";
import dotenv from "dotenv";

dotenv.config();

const sql = neon(process.env.DATABASE_URL!);

export async function getCount(): Promise<number> {
  const rows = await sql`SELECT count(*)::int AS total FROM shifters`;
  return rows[0].total;
}

export async function findByFingerprint(
  fingerprint: string
): Promise<{ id: number } | null> {
  const rows = await sql`
    SELECT id FROM shifters WHERE fingerprint = ${fingerprint} LIMIT 1
  `;
  return rows.length > 0 ? { id: rows[0].id } : null;
}

export async function shiftVibe(fingerprint: string): Promise<number> {
  const existing = await findByFingerprint(fingerprint);
  if (existing) return existing.id;

  const rows = await sql`
    INSERT INTO shifters (fingerprint) VALUES (${fingerprint}) RETURNING id
  `;
  return rows[0].id;
}
