/** DATABASE_URL 이 없으면 로컬 데모 모드 (메모리 PGlite, 운영 DB 와 완전히 분리) */
export const isDemo = !process.env.DATABASE_URL;
