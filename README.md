# 불안구독해지센터 출석

UID 기반 QR 출석 인증 웹 서비스. 휴대폰(개인 QR·출석 달력), 현장 노트북(카메라 QR 스캔 키오스크), 관리자(대시보드·일정 관리)가 하나의 DB 로 연동되고, 노트북에서 출석하면 휴대폰 달력이 새로고침 없이 바뀝니다.

| URL | 대상 | 내용 |
|---|---|---|
| `/my-qr` | 사용자(모바일) | UID + PIN 본인 인증 → 개인 QR 표시·PNG 저장·재발급 |
| `/my-page` | 사용자(모바일) | 누적/월/주 출석, 주간 목표, 월별 달력, 날짜 상세, 실시간 출석 팝업 |
| `/check-in` | 현장 노트북 | 관리자 로그인 1회 → 카메라 자동 시작, 연속 QR 스캔, 결과 2.5초 표시 후 자동 대기 |
| `/admin` | 관리자 | 통계, 날짜별 출석 목록, 검색, 프로그램별 통계, 사용자 등록·PIN 변경·QR 재발급, 사용자별 기록 |
| `/admin/programs` | 관리자 | 프로그램 등록(요일로 회차 자동 생성), 주간 목표, 회차 날짜 변경·휴강·보강·삭제 |

## 1. 바로 실행 (데모 모드)

```bash
npm install
npm run dev            # http://localhost:3000
```

`.env` 가 없으면 **데모 모드**입니다. 메모리 Postgres(PGlite)에 데모 데이터를 만들고, 서버를 끄면 사라집니다. 운영 DB 에는 절대 접속하지 않습니다.

- 사용자: `김하늘 / 1234`, `이바다 / 2345`, `박초록 / 3456` (이름 / 비밀번호)
- 관리자·키오스크 비밀번호: `admin1234`
- 데모 모드의 휴대폰 실시간 반영은 3초 폴링입니다(운영은 Supabase Realtime).

**같은 Wi-Fi 의 휴대폰으로 테스트**하려면 카메라·보안 쿠키 때문에 HTTPS 가 필요합니다.

```bash
npm run dev:https      # https://<노트북IP>:3000 (자체 서명 인증서 경고는 '계속' 선택)
```

### 테스트

```bash
npm test                                      # 출석 통계·달력 상태 계산 단위 테스트
npm run build && npm start                    # 다른 터미널에서 ↓
npm run smoke -- http://localhost:3000        # 최종 시나리오(등록→인증→QR→체크인→중복→관리자 조회) API 검증
```

## 2. Supabase 설정

1. [supabase.com](https://supabase.com) 에서 프로젝트 생성
2. **SQL Editor** 에서 순서대로 실행
   1. `db/schema.sql` — 테이블·제약조건(중복 출석 방지 `unique(user_id, session_id)`)
   2. `db/supabase.sql` — RLS(본인 출석만 조회) + Realtime 방송 설정
3. `.env.example` 을 `.env.local` 로 복사해서 채우기
   - `DATABASE_URL`: Project Settings → Database → Connection string (**Transaction pooler**, 비밀번호 포함)
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Project Settings → API
   - `SUPABASE_JWT_SECRET`: Project Settings → JWT Keys → **Legacy JWT Secret**
   - `SESSION_SECRET`: `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"`
   - `ADMIN_PASSWORD`: 충분히 긴 비밀번호
4. `npm run dev` → `/admin` 에서 사용자 등록, `/admin/programs` 에서 프로그램 등록

### 권한 구조

- 서버(API)는 `DATABASE_URL` 로 접속해 모든 읽기·쓰기를 처리합니다. 휴대폰·노트북은 DB 에 직접 쓰지 않습니다.
- 사용자: UID + PIN 으로 인증하면 서명된 httpOnly 쿠키가 생깁니다. PIN 을 5번 틀리면 10분간 잠깁니다.
- 실시간: 서버가 `sub = users.id`, `role = authenticated` 인 JWT(6시간)를 발급하고, 휴대폰은 이 JWT 로 `attendance` 변경을 구독합니다. RLS 정책 `user_id = auth.uid()` 때문에 **본인 출석 변경만** 받습니다. 구독이 다시 연결되거나 앱이 백그라운드에서 돌아오거나 네트워크가 복구되면 최신 데이터를 다시 받습니다.
- 관리자·키오스크: `ADMIN_PASSWORD` 로그인 쿠키(30일). `/api/check-in` 은 이 쿠키가 있어야 동작하므로, QR 캡처 이미지로 집에서 출석할 수 없습니다.

### QR 보안

- QR 에는 UID 가 아닌 `BORIGIN1:<HMAC(SESSION_SECRET, 사용자id:버전)>` 만 들어갑니다. DB 에는 이 값의 sha256 만 저장합니다.
- 같은 버전이면 다시 접속해도 같은 QR 이 나옵니다. 재발급(사용자 `/my-qr` 하단 또는 관리자 화면)하면 버전이 올라가고 이전 QR 은 즉시 무효가 됩니다.
- `SESSION_SECRET` 을 바꾸면 모든 QR 과 로그인이 함께 바뀝니다.

## 3. Vercel 배포

1. GitHub 에 push → Vercel 에서 Import
2. Environment Variables 에 `.env.example` 의 6개 값 입력 (`DATABASE_URL` 은 Transaction pooler 주소)
3. Deploy. Vercel 은 기본으로 HTTPS 라서 노트북 카메라가 바로 동작합니다.
4. 현장 노트북: Chrome 으로 `https://<도메인>/check-in` → 관리자 비밀번호 → 카메라 권한 **허용**. 전체 화면(F11)을 권장합니다.

## 출석 규칙

- 출석은 **회차(program_sessions)** 에 기록합니다. 하루에 프로그램이 여러 개면, 스캔 한 번으로 그날 진행 중인 모든 회차에 출석합니다.
- 통계(누적·월·주)는 **출석한 날짜 수**로 셉니다.
- 주간 기준은 월~일입니다. 주간 목표는 그 주에 걸친 프로그램 목표의 최댓값이고, **그 주 실제 진행일(휴강 제외) 수를 넘지 않습니다**.
- 달력: 회차가 없는 날은 일반 날짜, 휴강한 날은 '휴강', 지난 진행일에 출석하지 않았으면 미출석 점, 앞으로 진행일은 연한 블루로 표시합니다.
- 회차 날짜를 옮기면 그 회차의 출석 기록 날짜도 함께 옮겨집니다.

## 폴더 구조

```
app/            페이지(my-qr, my-page, check-in, admin, admin/programs) + api/
components/     qr, camera(키오스크), attendance(마이페이지·모달·로그인), calendar, dashboard, layout
lib/            db(Postgres/PGlite), auth·crypto, qr/token, attendance(통계·사용자·프로그램), supabase(JWT·Realtime), dates
db/             schema.sql(공통), supabase.sql(RLS·Realtime)
public/reference/  디자인 레퍼런스 이미지 위치 (b-origin.png, attendance-mobile.png)
scripts/smoke.mjs  최종 시나리오 API 검증
```

## 디자인

`app/globals.css` 의 `@theme` 에 브랜드 토큰이 있습니다(`brand` 블루, `leaf` 그린, `navy`, `mist`, `sprout`, `line`). 레퍼런스 이미지를 `public/reference/` 에 넣은 뒤 실제 팜플렛 색과 다르면 이 값만 바꾸면 전체에 반영됩니다. 로고는 `components/layout/Logo.tsx` 의 텍스트 워드마크이고, 로고 파일이 생기면 이 컴포넌트만 바꾸면 됩니다.
