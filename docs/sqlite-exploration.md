# Stage 4 — SQLite exploration

Tujuan tahap ini: membuktikan bahwa API benar-benar membaca/menulis ke database (bukan salinan di memori), dengan mengubah database secara manual lalu memeriksa API **tanpa restart**.

Database: `tasks.db` (di root proyek). Isi awal: 3 seed task.

## Query yang dijalankan

| # | Query | Hasil |
| - | ----- | ----- |
| 1 | `SELECT * FROM tasks;` | 3 baris |
| 2 | `SELECT * FROM tasks WHERE done = 1;` | 1 baris (`Write trip report`) |
| 3 | `SELECT COUNT(*) FROM tasks;` | `3` |
| 4 | `UPDATE tasks SET done = 1;` | 3 baris berubah |
| 5 | `DELETE FROM tasks WHERE done = 1;` | 3 baris terhapus |

## Pengamatan (change DB → verify API)

```
GET /tasks  (sebelum)   -> [id1 done=false, id2 done=true, id3 done=false]

# ubah manual di database:
UPDATE tasks SET done = 1;          -- 3 rows changed

GET /tasks  (tanpa restart) -> [id1 done=true, id2 done=true, id3 done=true]
GET /stats                 -> {"total":3,"done":3,"open":0}

# hapus manual:
DELETE FROM tasks WHERE done = 1;   -- 3 rows deleted

GET /tasks                 -> []
```

Kesimpulan:

- Perubahan manual di database **langsung terlihat** oleh API pada request berikutnya, tanpa restart. Artinya tidak ada cache/salinan di memori — handler selalu query ke SQLite (FR-8).
- Kolom `done` tersimpan sebagai integer `0`/`1` di SQLite, tetapi API mengembalikannya sebagai `true`/`false` (JSON tidak berubah dari versi sebelumnya).
- Setelah semua baris terhapus, tabel kosong; `COUNT(*)` menjadi `0`. Restart berikutnya akan meng-seed ulang karena tabel kosong (perilaku yang diharapkan untuk `COUNT(*) = 0`).

## Screenshot

Lihat `docs/sqlite-viewer.png` — snapshot struktur tabel `tasks`, isi data (Browse Data), dan hasil query di atas, diambil langsung dari `tasks.db`.
