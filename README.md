# Task API — Auth (Supabase) & AI Classification

REST API aman dengan fitur **Sign Up, Log In, Log Out** dan **rute terlindungi**. Manajemen akun dan penerbitan token diserahkan ke **Supabase Auth** sebagai *Identity Provider (IdP)*. Backend hanya memverifikasi **JWT (access token)** yang dikirim client lewat header `Authorization: Bearer <token>`.

Selain itu tersedia satu endpoint **"AI judgement"**: `POST /ai/classify` yang mengklasifikasikan teks memakai penyedia **OpenAI-compatible**. Output model **selalu divalidasi skema** sebelum dikembalikan.

> Prinsip utama: **tidak menulis kriptografi atau hashing password sendiri.** Semua kredensial ditangani Supabase.

Proyek ini dibangun dengan **Node.js + Express** dan menyediakan **Swagger UI** di `/docs` (dengan tombol **Authorize**).

## Fitur

- `POST /auth/signup` — daftar akun baru (via `supabase.auth.signUp`).
- `POST /auth/login` — login dan dapatkan `access_token` + `refresh_token` (via `signInWithPassword`).
- `POST /auth/logout` — akhiri sesi (rute terlindungi).
- `GET /protected/profile` — data profil privat (verifikasi token via `getUser`).
- `GET /protected/dashboard` — rute terlindungi kedua (bukti middleware dapat dipakai ulang).
- `GET /public/info` — informasi publik tanpa login.
- `POST /ai/classify` — klasifikasi teks (kategori + prioritas + confidence) dengan validasi skema.
- Middleware autentikasi yang dapat dipakai ulang (`src/middleware/auth.js`).

## Alur Autentikasi (segitiga kepercayaan)

```
1. Client  --(email,password)-->  Backend  --signUp/signInWithPassword-->  Supabase Auth
2. Supabase Auth  --(JWT access token + refresh token)-->  Backend  -->  Client
3. Client  --(Authorization: Bearer <JWT>)-->  Backend
4. Backend  --getUser(token)-->  Supabase Auth  (verifikasi)
   valid   -> buka rute terlindungi
   invalid -> 401
```

## Pilihan Teknologi

| Aspek | Implementasi |
| --- | --- |
| Runtime | Node.js (diuji v22) |
| Framework | Express |
| SDK Supabase | `@supabase/supabase-js` |
| Swagger UI | `swagger-ui-express` + `openapi.json` di `/docs` |
| Port default | 3000 |
| Skema Bearer | `securitySchemes.bearerAuth` (type `http`, scheme `bearer`, format JWT) |

## Prasyarat

- Node.js 18+ (diuji Node.js v22)
- npm
- Akun/proyek Supabase (URL + **anon public key**)

## Environment Variable

Buat file `.env` dari contoh (`.env.example`):

```env
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_KEY=<anon-public-key>
PORT=3000
OPENAI_API_KEY=<openai-api-key>
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-4o-mini
AI_TIMEOUT_MS=10000
AI_MAX_RETRIES=2
AI_MAX_INPUT_CHARS=2000
AI_REQUIRE_AUTH=false
```

> **Penting:** hanya gunakan **anon key**. Jangan pernah memakai atau menaruh `service_role` key di repo. `.env` sudah masuk `.gitignore` sehingga tidak ikut ter-commit. **`OPENAI_API_KEY` juga rahasia — jangan pernah di-commit; segera rotate bila bocor.**

Di dashboard Supabase, untuk latihan ini **nonaktifkan "Confirm email"** (Authentication → Providers → Email) agar akun langsung bisa login, atau konfirmasi email uji terlebih dahulu.

## Menjalankan (satu perintah)

```bash
npm install && npm start
```

Saat start, server mencatat:

```
Task API listening on http://localhost:3000 (docs at /docs)
Server running and connected to Supabase
AI endpoint ready: POST /ai/classify (model=gpt-4o-mini, auth=false)
```

Buka Swagger UI di <http://localhost:3000/docs>.

## Referensi API

| Method | Path | Auth | Sukses | Error |
| --- | --- | --- | --- | --- |
| POST | `/auth/signup` | Tidak | `201` + objek user | `400` |
| POST | `/auth/login` | Tidak | `200` + `access_token`, `refresh_token` | `400`, `401` |
| POST | `/auth/logout` | **Ya** (Bearer) | `204` | `401` |
| GET | `/protected/profile` | **Ya** (Bearer) | `200` + data user | `401` |
| GET | `/protected/dashboard` | **Ya** (Bearer) | `200` | `401` |
| GET | `/public/info` | Tidak | `200` | — |
| POST | `/ai/classify` | Opsional (lihat `AI_REQUIRE_AUTH`) | `200` + klasifikasi | `400`, `500`, `502`, `503`, `504` |

### Pesan error baku

| Situasi | Body |
| --- | --- |
| Kredensial login salah | `{ "error": "Invalid login credentials" }` |
| Header Authorization hilang/format salah | `{ "error": "Access token required" }` |
| Token invalid/kedaluwarsa | `{ "error": "Invalid or expired token" }` |

## Contoh `curl`

```bash
# Sign up
curl -i -X POST http://localhost:3000/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Log in
curl -i -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'
# -> { "access_token": "...", "refresh_token": "..." }

# Profil (terlindungi)
curl -i http://localhost:3000/protected/profile \
  -H "Authorization: Bearer <TOKEN>"

# Tanpa token -> 401 { "error": "Access token required" }
curl -i http://localhost:3000/protected/profile

# Token diubah 1 karakter -> 401 { "error": "Invalid or expired token" }
curl -i http://localhost:3000/protected/profile \
  -H "Authorization: Bearer <TOKEN-TIDAK-VALID>"

# Logout
curl -i -X POST http://localhost:3000/auth/logout \
  -H "Authorization: Bearer <TOKEN>"
# -> 204
```

## AI Classification (`POST /ai/classify`)

**Tugasnya:** menerima teks bebas dan mengubahnya menjadi keputusan terstruktur.

**Skema output (wajib, tanpa field tambahan):**

```json
{ "category": "bug", "priority": "high", "confidence": 0.9 }
```

| Field | Tipe | Nilai yang diizinkan |
| --- | --- | --- |
| `category` | string | `bug`, `feature`, `question`, `other` |
| `priority` | string | `low`, `medium`, `high` |
| `confidence` | number | `0` .. `1` |

**Kebijakan ketahanan (reliability):**

| Kondisi | Perilaku |
| --- | --- |
| Input kosong / bukan string / > `AI_MAX_INPUT_CHARS` | `400`, **model tidak dipanggil** |
| Timeout per panggilan | `AbortController` benar-benar membatalkan request (bukan sekadar menunggu) |
| Error transient (timeout, network, `429`, `5xx`) | Retry terbatas dengan backoff eksponensial + jitter (maks `AI_MAX_RETRIES`, hargai `Retry-After`) |
| Error permanen (`400`/`401`/`403`/`404` dari provider) | **Tidak** di-retry |
| Output bukan JSON / tidak sesuai skema | **Satu** percobaan perbaikan, lalu `502` |
| Timeout habis semua percobaan | `504` — `{ "error": "AI provider timed out" }` |
| Provider tak tersedia / rate-limited habis retry | `503` — `{ "error": "AI provider unavailable, try again later" }` |
| Output tetap tidak valid setelah perbaikan | `502` — `{ "error": "AI returned an invalid response" }` |
| Misconfigurasi (mis. API key salah) | `500` — `{ "error": "Server misconfiguration" }` (detail hanya di log server) |

**Anti prompt-injection:** instruksi sistem dan teks pengguna dikirim pada peran terpisah (`system` vs `user`), teks diperlakukan sebagai *data*, dan output tetap harus lolos validasi skema — instruksi apa pun di dalam teks tidak dapat mengubah bentuk respons.

**Contoh `curl`:**

```bash
# Klasifikasi (auth nonaktif -> tanpa token)
curl -i -X POST http://localhost:3000/ai/classify \
  -H "Content-Type: application/json" \
  -d '{"text":"The app crashes when I press pay"}'
# -> 200 { "category": "bug", "priority": "high", "confidence": 0.9 }

# Input kosong -> 400 (model tidak dipanggil)
curl -i -X POST http://localhost:3000/ai/classify \
  -H "Content-Type: application/json" \
  -d '{}'

# Bila AI_REQUIRE_AUTH=true, sertakan bearer token
curl -i -X POST http://localhost:3000/ai/classify \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"text":"Please add dark mode"}'
```

**Uji otomatis (tanpa memanggil API berbayar):** provider disuntikkan (mock) sehingga 10 kasus di `test/ai.test.js` berjalan offline — termasuk happy path, input tidak valid, output non-JSON, label di luar enum, timeout + retry terbatas, pemulihan setelah error transient, error permanen tanpa retry, dan prompt-injection.

```bash
npm test
```

## Swagger UI

Buka `/docs`, klik **Authorize**, tempelkan access token (tanpa prefix `Bearer`), lalu coba **Try it out** pada `/protected/profile`.

![Swagger UI](docs/swagger.png)

## Struktur Proyek

```
src/
  app.js                      # membangun Express app (inject dependencies)
  server.js                   # composition root: env, Supabase, listen
  lib/supabaseClient.js       # inisialisasi client Supabase dari env (anon key)
  lib/openaiClient.js         # HTTP client ke provider OpenAI + timeout (AbortController) + error bertipe
  middleware/auth.js          # middleware: ekstraksi + verifikasi Bearer token
  routes/authRoutes.js        # /auth/signup, /auth/login
  routes/protectedRoutes.js   # /protected/*, /auth/logout, /public/info
  routes/aiRoutes.js          # POST /ai/classify
  services/aiSchema.js        # skema zod + ekstraksi/validasi JSON dari output model
  services/aiService.js       # prompt, retry/backoff, satu kali repair, pemetaan error
  services/aiErrors.js        # error provider + error HTTP AI
  repositories/               # (Task API) in-memory / sqlite / postgres
  services/                   # (Task API) business logic + error mapping
openapi.json                  # spesifikasi OpenAPI 3 (skema Bearer + /ai/classify)
.env.example
```

### Middleware `auth.js`

Satu fungsi yang mengekstrak token dari header `Authorization: Bearer <token>`, memverifikasinya lewat `supabase.auth.getUser(token)`, lalu menaruh `req.user` (data terverifikasi) dan meneruskan ke handler. Diterapkan ke `/protected/profile`, `/protected/dashboard`, dan `/auth/logout`.

## Catatan & Batasan

- **Server tidak mempercayai client:** token selalu diverifikasi ke Supabase (`getUser`), tidak hanya di-*decode*.
- **Sign out:** karena sesi tidak disimpan di server (stateless), `signOut` tidak "mencabut" JWT yang sudah diterbitkan sampai token kedaluwarsa. Ini batasan umum pada auth berbasis JWT — dicatat di sini sesuai anjuran PRD.
- **Rate limit & domain email:** Supabase membatasi frekuensi email (mis. `email rate limit exceeded`) dan menolak domain tertentu seperti `example.com`. Gunakan email uji yang wajar dan hindari signup berulang saat menguji. Untuk latihan, nonaktifkan *Confirm email*.
- Tidak ada rahasia yang di-commit: `.env` masuk `.gitignore`, hanya `service_role`-free **anon key** yang dipakai.
- **AI tidak dipercaya:** output model tidak pernah dikembalikan mentah. Ia diekstrak, divalidasi skema, dan bila perlu diperbaiki sekali sebelum dipakai.
- **Provider dapat ditukar:** `src/lib/openaiClient.js` memakai endpoint Chat Completions yang kompatibel OpenAI, jadi cukup ubah `OPENAI_BASE_URL`/`OPENAI_MODEL` untuk berganti penyedia. Logika bisnis (`aiService`) tidak tahu detail HTTP — provider disuntikkan, sehingga mudah di-mock pada pengujian.

## Lisensi

ISC
