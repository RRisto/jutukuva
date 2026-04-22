# Jutukuva

Reaalajas eestikeelse kõne tekstiks muutmise rakendus. Rakendus tuvastab kõne automaatselt ja kuvab selle tekstina, mida saab koheselt redigeerida ja teistega jagada.

See on minu fork sellest projektist: https://github.com/taltechnlp/jutukuva
Lisasin failist transkribeerimise ning mudel on kohe rakenduse sees, ei pea midagi alla laadima esimesel käivitamisel.

<p align="center">
  <a href="https://youtube.com/watch?v=WjRNXt27Dbs">
    <img src="https://img.youtube.com/vi/WjRNXt27Dbs/maxresdefault.jpg" alt="Jutukuva tutvustusvideo" width="640"><br>
    <img src="https://img.shields.io/badge/▶%20Vaata%20videot%20YouTube'is-red?style=for-the-badge&logo=youtube&logoColor=white" alt="Vaata YouTube'is">
  </a>
</p>

## Allalaadimine

### Jutukuva (põhirakendus)

| Platvorm | Allalaadimine |
|----------|---------------|
| Windows | [Jutukuva.Setup.1.0.2.exe](https://github.com/RRisto/jutukuva/releases/download/v1.0.2/Jutukuva.Setup.1.0.2.exe) |
| macOS (Intel) | [Jutukuva-1.0.2.dmg](https://github.com/RRisto/jutukuva/releases/download/v1.0.2/Jutukuva-1.0.2.dmg) |
| macOS (Apple Silicon) | [Jutukuva-1.0.2-arm64.dmg](https://github.com/RRisto/jutukuva/releases/download/v1.0.2/Jutukuva-1.0.2-arm64.dmg) |
| Linux (Debian) | [jutukuva_1.0.2_amd64.deb](https://github.com/RRisto/jutukuva/releases/download/v1.0.2/jutukuva_1.0.2_amd64.deb) |

### Jutukuva Subtiitrid (ülekatte rakendus)

Kuvab subtiitreid mis tahes rakenduse kohal - ideaalne videokõnede, esitluste ja otseülekannete jaoks.

| Platvorm | Allalaadimine |
|----------|---------------|
| Windows | [Jutukuva.Subtiitrid_1.0.2_x64-setup.exe](https://github.com/RRisto/jutukuva/releases/download/v1.0.2/Jutukuva.Subtiitrid_1.0.2_x64-setup.exe) |
| macOS (Apple Silicon) | [Jutukuva.Subtiitrid_1.0.2_aarch64.dmg](https://github.com/RRisto/jutukuva/releases/download/v1.0.2/Jutukuva.Subtiitrid_1.0.2_aarch64.dmg) |
| Linux (AppImage) | [Jutukuva.Subtiitrid_1.0.2_amd64.AppImage](https://github.com/RRisto/jutukuva/releases/download/v1.0.2/Jutukuva.Subtiitrid_1.0.2_amd64.AppImage) |
| Linux (Debian) | [Jutukuva.Subtiitrid_1.0.2_amd64.deb](https://github.com/RRisto/jutukuva/releases/download/v1.0.2/Jutukuva.Subtiitrid_1.0.2_amd64.deb) |

---

## Süsteeminõuded

Kõnetuvastus toimub täielikult kohalikus arvutis (offline), nii et mudel tuleb mällu laadida. Hinnangulised ressursinõuded:

**Mälu (RAM):**
- Electroni raamistik + kasutajaliides: ~400–600 MB
- Otsekõnetuvastus (sherpa-onnx laadib suure zipformer mudeli): ~600 MB – 1 GB
- Faili transkribeerimine käivitab eraldi protsessi oma kõnetuvastuse mootoriga: **+600 MB – 1 GB** transkribeerimise ajal. Mitmekanalilisi faile töödeldakse kanalite kaupa järjestikku, seega mälukasutus ei korrutu kanalite arvuga.

**Tüüpiline kasutus:**
- Tavaline töö (otsekõnetuvastus): **~1–1,5 GB**
- Faili transkribeerimine samaaegselt otsekõnetuvastusega: **~2–2,5 GB tipphetkel**

**Soovituslik miinimum:**
- **RAM**: 8 GB töötab; 16 GB on mugavam (kui kasutad samal ajal brauserit/muid rakendusi)
- **Protsessor**: tavaline 64-bitine x64 protsessor (zipformer töötab protsessoril, GPU-d ei kasutata). Transkribeerimise ajal koormatakse 1–2 tuuma
- **Ketas**: ~500 MB – 1 GB vaba ruumi (sisaldab kaasapakitud mudelit)
- **Operatsioonisüsteem**: Windows, Linux või macOS

Need on hinnangud — tegelik kasutus sõltub riistvarast ja samaaegselt jooksvatest protsessidest.

---

## Kasutusjuhend

### Alustamine

1. **Lae rakendus alla** ja paigalda see oma arvutisse
2. **Käivita Jutukuva**
3. **Vali heliallikas:**
   - **Mikrofon** - oma kõne salvestamiseks
   - **Süsteemiheli** - arvutist tuleva heli salvestamiseks (nt videokõne)
4. **Vajuta salvestamise nuppu** - kõnetuvastus käivitub automaatselt

### Teksti redigeerimine

- Tuvastatud tekst ilmub redaktorisse kohe, kui räägid
- Teksti saab redigeerida paralleelselt kõnetuvastusega
- Vigu saab parandada otse tekstis

**Kiirklahvid:**
| Klahv | Tegevus |
|-------|---------|
| **Enter** | Loo uus lõik |
| **Ctrl+Enter** | Uus lõik ja vali kõneleja |
| **Ctrl+Z** | Võta tagasi |
| **Ctrl+Shift+Z** | Tee uuesti |
| **Tab** | Vali järgmine sõna |
| **Shift+Tab** | Vali eelmine sõna |

### Faili transkribeerimine

Lisaks otseülekandele saab rakendus transkribeerida ka olemasolevaid helifaile - sh pikki salvestusi ja mitmekanalisi faile, kus iga kanal on eraldi kõneleja.

1. Ava **Transkribeeri fail** menüüst
2. Vali helifail (WAV, MP3, M4A, FLAC, OGG, MP4/MKV/MOV jm)
3. Kui failis on mitu kanalit, vali kas transkribeerida kõik kanalid eraldi
4. Vajuta **Alusta transkribeerimist** - tekst ilmub toimetajasse reaalajas
5. Valmis transkriptsiooni saab salvestada **JSONina** või **tekstifailina** (aegmärkidega)

Fail voogedastatakse mällu koormuseta - mitmetunnised salvestused toimivad ilma mäluprobleemita. Kui seanss on veel avamata, luuakse see automaatselt failinime järgi.

### Asendussõnastikud

Asendussõnastikud võimaldavad lühendeid automaatselt pikemaks tekstiks muuta:

1. Ava **Asendused** menüüst
2. Loo uus sõnastik või vali olemasolev
3. Lisa kirjeid: päästik (nt "tln") → asendus (nt "Tallinn")

Kasutamine:
- Kirjuta päästik ja näed asenduse eelvaadet
- Vajuta **Tühik** asenduse rakendamiseks
- Vajuta **Escape** asenduse tühistamiseks

Sõnastikke saab importida ja eksportida JSON formaadis.

### Sessiooni jagamine

Jaga oma kõnetuvastuse sessiooni teistega:

1. **Sessiooni kood** - 6-kohaline kood (nt ABC123), mida teised saavad sisestada
2. **QR-kood** - skaneeri mobiilseadmega kiireks liitumiseks
3. **Veebilink** - jaga linki `tekstiks.ee/kt/KOOD` veebilehitseja kaudu vaatamiseks

Jagatud sessioonis saavad kõik osalejad:
- Näha teksti reaalajas
- Redigeerida ja parandada vigu

### Ülekatte subtiitrite kasutamine

**Jutukuva Subtiitrid** kuvab subtiitreid läbipaistva aknana mis tahes rakenduse kohal:

1. Paigalda **Jutukuva Subtiitrid** rakendus
2. Käivita põhirakenduses sessioon
3. Ava **Jutukuva Subtiitrid** ja sisesta sessiooni kood
4. Liiguta subtiitrite aken soovitud kohta ekraanil

Alternatiivina saab ülekatte rakenduse avada otse põhirakendusest jagamise dialoogist.

---

## Nõuanded

- **Kasuta kvaliteetset mikrofoni** - selgem heli annab parema tulemuse
- **Räägi selgelt ja mõõdukas tempos** - kiire kõne võib tekitada rohkem vigu
- **Vaikne keskkond** - taustamüra võib segada tuvastust
- **Eesti keel** - rakendus on optimeeritud eesti keele tuvastamiseks

### Andmebaasi asukoht

Rakenduse andmed salvestatakse:
- **Linux:** `~/.config/jutukuva/database.sqlite`
- **macOS:** `~/Library/Application Support/jutukuva/database.sqlite`
- **Windows:** `%APPDATA%/jutukuva/database.sqlite`


---

## Tehniline ülevaade

### Tehnoloogiad

- **SvelteKit** - kasutajaliidese raamistik
- **Electron** - töölauarakenduse raamistik (põhirakendus)
- **Tauri** - töölauarakenduse raamistik (ülekatte rakendus)
- **SQLite** - kohalik andmebaas (better-sqlite3)
- **sherpa-onnx** - kõnetuvastuse mootor
- **Yjs** - reaalajas koostöö (CRDT)
- **ProseMirror** - tekstiredaktor

### Projekti struktuur

```
kirikaja/
├── electron/           # Electron põhiprotsess
├── src/                # SvelteKit kasutajaliides
├── packages/
│   ├── overlay-captions/  # Tauri ülekatte rakendus
│   ├── web-viewer/        # Veebivaataja server
│   └── yjs-server/        # Koostöö sünkroniseerimise server
└── build/              # Ehituse väljund
```

### Arendamine

```bash
# Sõltuvuste paigaldamine
npm install

# Arendusrežiimis käivitamine (kõnetuvastuse mudel laaditakse vajadusel esmakäivitusel)
npm run electron:dev

# Kõnetuvastuse mudeli käsitsi allalaadimine (~300 MB, valikuline)
npm run download-model

# Tootmisversiooni ehitamine (mudel laaditakse automaatselt ja pannakse installerisse kaasa)
npm run electron:build
```

**Kõnetuvastuse mudel** on Eesti keele streaming-zipformer mudel (TalTechNLP/streaming-zipformer-large.et-en.w2n, ~300 MB). Ehitamise ajal laaditakse see automaatselt HuggingFace'ist ja pakitakse installerisse, nii et lõppkasutaja saab rakenduse kasutada kohe pärast installimist - ilma interneti- või esmakäivituse allalaadimiseta.

**Platvormipõhine ehitamine:**
- **Windows**: ehita Windowsi arvutis natiivselt (`npm run electron:build`)
- **Linux**: ehita WSL2-s või Linuxi masinas
- **macOS**: vajalik on macOS masin või GitHub Actions (`.github/workflows/build.yml` ehitab kõik kolm platvormi paralleelselt)

## Litsents

MIT

---

# English

# Jutukuva

A real-time Estonian speech-to-text application. The app automatically detects speech and displays it as text that can be instantly edited and shared with others.

## Download

### Jutukuva (main application)

| Platform | Download |
|----------|----------|
| Windows | [Jutukuva.Setup.1.0.2.exe](https://github.com/RRisto/jutukuva/releases/download/v1.0.2/Jutukuva.Setup.1.0.2.exe) |
| macOS (Intel) | [Jutukuva-1.0.2.dmg](https://github.com/RRisto/jutukuva/releases/download/v1.0.2/Jutukuva-1.0.2.dmg) |
| macOS (Apple Silicon) | [Jutukuva-1.0.2-arm64.dmg](https://github.com/RRisto/jutukuva/releases/download/v1.0.2/Jutukuva-1.0.2-arm64.dmg) |
| Linux (Debian) | [jutukuva_1.0.2_amd64.deb](https://github.com/RRisto/jutukuva/releases/download/v1.0.2/jutukuva_1.0.2_amd64.deb) |

### Jutukuva Subtitles (overlay application)

Displays subtitles on top of any application - ideal for video calls, presentations, and live broadcasts.

| Platform | Download |
|----------|----------|
| Windows | [Jutukuva.Subtiitrid_1.0.2_x64-setup.exe](https://github.com/RRisto/jutukuva/releases/download/v1.0.2/Jutukuva.Subtiitrid_1.0.2_x64-setup.exe) |
| macOS (Apple Silicon) | [Jutukuva.Subtiitrid_1.0.2_aarch64.dmg](https://github.com/RRisto/jutukuva/releases/download/v1.0.2/Jutukuva.Subtiitrid_1.0.2_aarch64.dmg) |
| Linux (AppImage) | [Jutukuva.Subtiitrid_1.0.2_amd64.AppImage](https://github.com/RRisto/jutukuva/releases/download/v1.0.2/Jutukuva.Subtiitrid_1.0.2_amd64.AppImage) |
| Linux (Debian) | [Jutukuva.Subtiitrid_1.0.2_amd64.deb](https://github.com/RRisto/jutukuva/releases/download/v1.0.2/Jutukuva.Subtiitrid_1.0.2_amd64.deb) |

---

## System Requirements

Speech recognition runs entirely on your local machine (offline), so the model has to be loaded into memory. Approximate resource needs:

**Memory (RAM):**
- Electron shell + UI baseline: ~400–600 MB
- Live ASR (sherpa-onnx loads the large zipformer into memory): ~600 MB – 1 GB
- File transcription spawns a separate process with its own recognizer: **+600 MB – 1 GB** while a file job is running. Multi-channel files process channels sequentially, so memory does not multiply per channel.

**Typical usage:**
- Normal use (live ASR): **~1–1.5 GB**
- File transcription alongside live ASR: **~2–2.5 GB peak**

**Recommended minimums:**
- **RAM**: 8 GB works; 16 GB comfortable (especially if you run a browser / IDE / other apps alongside)
- **CPU**: any modern 64-bit x64 CPU (zipformer inference is CPU-bound; no GPU is used). Expect 1–2 cores pinned during transcription
- **Disk**: ~500 MB – 1 GB free for the installed app including the bundled model
- **OS**: Windows, Linux, or macOS

These are estimates — actual numbers depend on your hardware and what else is running.

---

## User Guide

### Getting Started

1. **Download the application** and install it on your computer
2. **Launch Jutukuva**
3. **Select an audio source:**
   - **Microphone** - to record your own speech
   - **System audio** - to record audio from your computer (e.g., video calls)
4. **Press the record button** - speech recognition starts automatically

### Text Editing

- Recognized text appears in the editor as you speak
- Text can be edited in parallel with speech recognition
- Errors can be corrected directly in the text

**Keyboard Shortcuts:**
| Key | Action |
|-----|--------|
| **Enter** | Create new paragraph |
| **Ctrl+Enter** | New paragraph and select speaker |
| **Ctrl+Z** | Undo |
| **Ctrl+Shift+Z** | Redo |
| **Tab** | Select next word |
| **Shift+Tab** | Select previous word |

### File Transcription

In addition to live recording, the app can also transcribe existing audio files — including long recordings and multi-channel files where each channel is a separate speaker.

1. Open **Transcribe file** from the menu
2. Choose an audio file (WAV, MP3, M4A, FLAC, OGG, MP4/MKV/MOV, etc.)
3. If the file has multiple channels, choose whether to transcribe each channel separately
4. Click **Start transcription** — text streams into the editor in real time
5. The finished transcript can be saved as **JSON** or **TXT** (with timestamps)

Files are streamed through memory — multi-hour recordings work without memory issues. If no session is open, one is created automatically using the file name.

### Substitution Dictionaries

Substitution dictionaries allow you to automatically expand abbreviations into longer text:

1. Open **Substitutions** from the menu
2. Create a new dictionary or select an existing one
3. Add entries: trigger (e.g., "tln") → replacement (e.g., "Tallinn")

Usage:
- Type the trigger and see a preview of the replacement
- Press **Space** to apply the replacement
- Press **Escape** to cancel the replacement

Dictionaries can be imported and exported in JSON format.

### Session Sharing

Share your speech recognition session with others:

1. **Session code** - a 6-character code (e.g., ABC123) that others can enter
2. **QR code** - scan with a mobile device for quick access
3. **Web link** - share a link `tekstiks.ee/kt/CODE` for viewing in a browser

In a shared session, all participants can:
- See text in real-time
- Edit and correct errors

### Using Overlay Subtitles

**Jutukuva Subtitles** displays subtitles as a transparent window on top of any application:

1. Install the **Jutukuva Subtitles** application
2. Start a session in the main application
3. Open **Jutukuva Subtitles** and enter the session code
4. Move the subtitle window to the desired location on screen

Alternatively, the overlay application can be opened directly from the sharing dialog in the main application.

---

## Tips

- **Use a quality microphone** - clearer audio produces better results
- **Speak clearly at a moderate pace** - fast speech may cause more errors
- **Quiet environment** - background noise can interfere with recognition
- **Estonian language** - the application is optimized for Estonian speech recognition

### Database Location

Application data is stored at:
- **Linux:** `~/.config/jutukuva/database.sqlite`
- **macOS:** `~/Library/Application Support/jutukuva/database.sqlite`
- **Windows:** `%APPDATA%/jutukuva/database.sqlite`


---

## Technical Overview

### Technologies

- **SvelteKit** - UI framework
- **Electron** - desktop application framework (main app)
- **Tauri** - desktop application framework (overlay app)
- **SQLite** - local database (better-sqlite3)
- **sherpa-onnx** - speech recognition engine
- **Yjs** - real-time collaboration (CRDT)
- **ProseMirror** - text editor

### Project Structure

```
kirikaja/
├── electron/           # Electron main process
├── src/                # SvelteKit user interface
├── packages/
│   ├── overlay-captions/  # Tauri overlay application
│   ├── web-viewer/        # Web viewer server
│   └── yjs-server/        # Collaboration sync server
└── build/              # Build output
```

### Development

```bash
# Install dependencies
npm install

# Run in development mode (ASR model downloads on first use if not bundled)
npm run electron:dev

# Pre-download the ASR model (~300 MB, optional for dev)
npm run download-model

# Build for production (model is fetched automatically and bundled into the installer)
npm run electron:build
```

**The ASR model** is the Estonian streaming-zipformer (TalTechNLP/streaming-zipformer-large.et-en.w2n, ~300 MB). At build time it is fetched from HuggingFace and packed into the installer, so end users can use the app immediately after installation — no network access or first-run download required.

**Platform-specific builds:**
- **Windows**: build natively on a Windows machine (`npm run electron:build`)
- **Linux**: build inside WSL2 or on a Linux machine
- **macOS**: requires a macOS machine or GitHub Actions (`.github/workflows/build.yml` builds all three platforms in parallel)

## License

MIT
