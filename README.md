# Task API

REST API sederhana untuk mengelola daftar to-do. Dibuat dengan **Node.js + Express**, menyimpan data **di memori** (tanpa database/file), dan menyediakan **Swagger UI** di `/docs`.

Proyek ini adalah tugas pembelajaran W2 · A1 — fokus pada pemahaman siklus request → response dari sisi server.

## Prasyarat

- **Node.js 18+** (diuji pada Node.js v22)
- npm
- Git (opsional, untuk clone)

## Instalasi & Menjalankan

```bash
npm install
npm start
```

Server berjalan di `http://localhost:3000`. Buka dokumentasi interaktif di `http://localhost:3000/docs`.

> Butuh satu perintah saja setelah clone? `npm install && npm start`.

## Tabel Endpoint

| # | Method | Path | Fungsi | Sukses | Error |
| - | ------ | ---- | ------ | ------ | ----- |
| 1 | GET | `/` | Info API | 200 | — |
| 2 | GET | `/health` | Cek hidup | 200 | — |
| 3 | GET | `/tasks` | Daftar semua task | 200 | — |
| 4 | GET | `/tasks/:id` | Ambil satu task | 200 | 404 |
| 5 | POST | `/tasks` | Buat task baru | 201 | 400 |
| 6 | PUT | `/tasks/:id` | Ubah `title` dan/atau `done` | 200 | 400, 404 |
| 7 | DELETE | `/tasks/:id` | Hapus task (tanpa body) | 204 | 404 |
| — | GET | `/stats` | Statistik (extras) | 200 | — |
| — | POST | `/reset` | Kembalikan 3 seed task (extras) | 200 | — |
| — | GET | `/docs` | Swagger UI | 200 | — |

Setiap error mengembalikan JSON berbentuk `{ "error": "<pesan>" }`.

## Model Data

| Field | Tipe | Aturan |
| ----- | ---- | ------ |
| `id` | number | Dibuat server, unik, berurutan. Field `id` dari client diabaikan. |
| `title` | string | Wajib, tidak boleh kosong (setelah di-trim). |
| `done` | boolean | Default `false` saat dibuat. |

Data awal (seed): 3 task contoh didefinisikan di bagian atas `index.js`.

## Aturan Validasi

- **POST** — `title` wajib ada, bertipe string, dan tidak kosong. Jika tidak → **400**.
- **PUT** — body harus berisi minimal satu dari `title` atau `done`; `title` (jika ada) harus string tidak kosong, `done` (jika ada) harus boolean. Selain itu → **400**.
- `PUT` melakukan **update parsial**: kirim hanya field yang ingin diubah.

## Contoh `curl -i`

Membuat task baru:

```bash
curl -i -X POST http://localhost:3000/tasks \
  -H "Content-Type: application/json" \
  -d '{"title":"Buy milk"}'
```

Output:

```
HTTP/1.1 201 Created
X-Powered-By: Express
Content-Type: application/json; charset=utf-8
Content-Length: 40
ETag: W/"28-PpSBYV7i68cXyGc7AhjVpkZkY5Q"
Date: Thu, 15 Oct 2026 22:16:16 GMT
Connection: keep-alive

{"id":4,"title":"Buy milk","done":false}
```

Siklus CRUD lengkap via `curl`:

```bash
curl -i http://localhost:3000/tasks                 # 200 daftar
curl -i http://localhost:3000/tasks/1               # 200 satu task
curl -i http://localhost:3000/tasks/99              # 404 { "error": "Task 99 not found" }
curl -i -X POST http://localhost:3000/tasks -H "Content-Type: application/json" -d '{"title":"Buy milk"}'   # 201
curl -i -X POST http://localhost:3000/tasks -H "Content-Type: application/json" -d '{}'                     # 400
curl -i -X PUT http://localhost:3000/tasks/4 -H "Content-Type: application/json" -d '{"done":true}'         # 200
curl -i -X DELETE http://localhost:3000/tasks/4                                                             # 204
```

## Swagger UI

Semua endpoint terdokumentasi di **`http://localhost:3000/docs`** dan tombol **"Try it out"** menjalankan siklus CRUD penuh. Spesifikasi OpenAPI ada di `openapi.json`.

![Swagger UI](docs/swagger.png)

## Catatan: Data In-Memory

Data disimpan hanya di variabel program, **bukan** database atau file. Semua perubahan (termasuk task baru) **hilang saat server di-restart** — ini disengaja untuk pembelajaran.

### Mortality experiment

Buat beberapa task, lalu hentikan server (`Ctrl+C`) dan jalankan ulang, kemudian `GET /tasks`. Yang Anda lihat adalah daftar seed semula: task yang baru dibuat tidak muncul. Ini terjadi karena `tasks` hidup di memori proses Node; saat proses berhenti, memori dibebaskan dan variabel diinisialisasi ulang dari `SEED`.

## Extras

- **Filter** — `GET /tasks?done=true` hanya mengembalikan task selesai.
- **Search** — `GET /tasks?search=milk` mencari pada `title` (case-insensitive).
- **Stats** — `GET /stats` → `{ "total": 3, "done": 1, "open": 2 }`.
- **Reset** — `POST /reset` mengembalikan 3 task contoh.

## Struktur Proyek

```
.
├── index.js        # seluruh API (±100 baris)
├── openapi.json    # spesifikasi OpenAPI 3 untuk Swagger UI
├── package.json
└── docs/
    └── swagger.png # screenshot Swagger UI
```

## Lisensi

ISC
