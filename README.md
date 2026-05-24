# Clean Uploader React + Vite

Fitur web sudah dipindahkan dari `index.html` lama ke React:

- Pilih file MP4
- Validasi file
- Patch `mvhd matrix_b` menjadi `1`
- Auto download hasil `_clean.mp4`
- UI neobrutalism
- Script Telegram bot tetap ada di `tele.js`

## Jalankan web

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Jalankan bot Telegram

```bash
npm run bot
```

Catatan: token bot di `tele.js` sebaiknya diganti/diamankan.

## Proteksi ringan

UI menambahkan pemblokiran klik kanan, beberapa shortcut inspect/devtools, dan seleksi teks. Ini hanya deterrent di sisi browser, bukan proteksi absolut.
