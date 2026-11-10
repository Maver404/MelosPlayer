# Melos

Lettore musicale offline per iPhone e Android, distribuito come web app installabile (PWA).

Importi i tuoi brani (MP3, AAC/M4A, ALAC, FLAC, WAV, AIFF, OGG, Opus) da iCloud Drive, Google Drive o dall'app File: vengono copiati nell'archivio privato dell'app e restano ascoltabili senza connessione. Si possono mandare su AirPlay e Bluetooth.

> Stato: **Fase 0 — test di fattibilità** sul dispositivo (riproduzione in background, passaggio automatico tra brani, AirPlay, formati, spazio).

## Installazione su iPhone

1. Apri il link dell'app in Safari.
2. Condividi → **Aggiungi alla schermata Home**.
3. Apri Melos dall'icona.

## Sviluppo

```bash
npm install
npm run dev      # server di sviluppo
npm test         # test unitari
npm run build    # build di produzione in dist/
```

Ogni push su `main` pubblica l'app su GitHub Pages tramite `.github/workflows/deploy.yml`.

## Struttura

- `src/audio/` — lettore, coda, schermata di blocco (Media Session), AirPlay
- `src/library/` — import, lettura dei tag, archivio privato (OPFS con ripiego su IndexedDB)
- `src/db/` — database locale (Dexie): brani, copertine, playlist, preferiti
- `src/ui/` — interfaccia
