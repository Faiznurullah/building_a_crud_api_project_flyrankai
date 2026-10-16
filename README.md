# Auth: Login & Protect (Supabase Auth + JWT)

REST API aman dengan fitur **Sign Up, Log In, Log Out** dan **rute terlindungi**. Manajemen akun dan penerbitan token diserahkan ke **Supabase Auth** sebagai *Identity Provider (IdP)*. Backend hanya memverifikasi **JWT (access token)** yang dikirim client lewat header `Authorization: Bearer <token>`.

> Prinsip utama: **tidak menulis kriptografi atau hashing password sendiri.** Semua kredensial ditangani Supabase.

Proyek ini dibangun dengan **Node.js + Express** dan menyediakan **Swagger UI** di `/docs` (dengan tombol **Authorize**).

## Fitur

- `POST /auth/signup` — daftar akun baru (via `supabase.auth.signUp`).
- `POST /auth/login` — login dan dapatkan `access_token` + `refresh_token` (via `signInWithPassword`).
- `POST /auth/logout` — akhiri sesi (rute terlindungi).
- `GET /protected/profile` — data profil privat (verifikasi token via `getUser`).
- `GET /protected/dashboard` — rute terlindungi kedua (bukti middleware dapat dipakai ulang).
- `GET /public/info` — informasi publik tanpa login.
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
```

> **Penting:** hanya gunakan **anon key**. Jangan pernah memakai atau menaruh `service_role` key di repo. `.env` sudah masuk `.gitignore` sehingga tidak ikut ter-commit.

Di dashboard Supabase, untuk latihan ini **nonaktifkan "Confirm email"** (Authentication → Providers → Email) agar akun langsung bisa login, atau konfirmasi email uji terlebih dahulu.

## Menjalankan (satu perintah)

```bash
npm install && npm start
```

Saat start, server mencatat:

```
Task API listening on http://localhost:3000 (docs at /docs)
Server running and connected to Supabase
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

## Swagger UI

Buka `/docs`, klik **Authorize**, tempelkan access token (tanpa prefix `Bearer`), lalu coba **Try it out** pada `/protected/profile`.

![Swagger UI](docs/swagger.png)

## Struktur Proyek

```
src/
  app.js                      # membangun Express app (inject dependencies)
  server.js                   # composition root: env, Supabase, listen
  lib/supabaseClient.js       # inisialisasi client Supabase dari env (anon key)
  middleware/auth.js          # middleware: ekstraksi + verifikasi Bearer token
  routes/authRoutes.js        # /auth/signup, /auth/login
  routes/protectedRoutes.js   # /protected/*, /auth/logout, /public/info
  repositories/               # (Task API) in-memory / sqlite / postgres
  services/                   # (Task API) business logic + error mapping
openapi.json                  # spesifikasi OpenAPI 3 (skema Bearer)
.env.example
```

### Middleware `auth.js`

Satu fungsi yang mengekstrak token dari header `Authorization: Bearer <token>`, memverifikasinya lewat `supabase.auth.getUser(token)`, lalu menaruh `req.user` (data terverifikasi) dan meneruskan ke handler. Diterapkan ke `/protected/profile`, `/protected/dashboard`, dan `/auth/logout`.

## Catatan & Batasan

- **Server tidak mempercayai client:** token selalu diverifikasi ke Supabase (`getUser`), tidak hanya di-*decode*.
- **Sign out:** karena sesi tidak disimpan di server (stateless), `signOut` tidak "mencabut" JWT yang sudah diterbitkan sampai token kedaluwarsa. Ini batasan umum pada auth berbasis JWT — dicatat di sini sesuai anjuran PRD.
- **Rate limit & domain email:** Supabase membatasi frekuensi email (mis. `email rate limit exceeded`) dan menolak domain tertentu seperti `example.com`. Gunakan email uji yang wajar dan hindari signup berulang saat menguji. Untuk latihan, nonaktifkan *Confirm email*.
- Tidak ada rahasia yang di-commit: `.env` masuk `.gitignore`, hanya `service_role`-free **anon key** yang dipakai.

## Lisensi

ISC
