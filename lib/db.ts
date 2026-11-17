import fs from "node:fs";
import path from "node:path";
import { isDemo } from "./env";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Row = Record<string, any>;
export type Runner = (sql: string, params?: unknown[]) => Promise<Row[]>;

const g = globalThis as unknown as { __boDb?: Promise<Runner> };

async function connect(): Promise<Runner> {
  if (!isDemo) {
    const { default: pg } = await import("pg");
    pg.types.setTypeParser(1082, (v: string) => v); // date 는 문자열 그대로
    const url = process.env.DATABASE_URL!;
    const pool = new pg.Pool({
      connectionString: url,
      max: 5,
      ssl: /localhost|127\.0\.0\.1/.test(url) ? undefined : { rejectUnauthorized: false },
    });
    return async (sql, params = []) => (await pool.query(sql, params)).rows;
  }
  // 데모 모드: 메모리 Postgres. 서버를 끄면 사라지고 운영 DB 와 섞이지 않는다.
  const { PGlite } = await import("@electric-sql/pglite");
  const db = new PGlite({ parsers: { 1082: (v: string) => v } });
  await db.exec(fs.readFileSync(path.join(process.cwd(), "db/schema.sql"), "utf8"));
  const run: Runner = async (sql, params = []) => (await db.query<Row>(sql, params)).rows;
  const { seedDemo } = await import("./demo-seed");
  await seedDemo(run);
  return run;
}

export async function q<T = Row>(sql: string, params: unknown[] = []): Promise<T[]> {
  g.__boDb ??= connect().catch((e) => {
    g.__boDb = undefined;
    throw e;
  });
  return (await (await g.__boDb)(sql, params)) as T[];
}
