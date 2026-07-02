# Villa Joka – Admin-Panel einrichten

## Was du bekommst

Nach diesem Setup erreichst du das Admin-Panel unter:
**https://villa-joka.eu/admin/**

Dort kannst du bearbeiten:
- Galerie-Fotos (hochladen, sortieren, beschriften)
- Preistabellen (Villa + Einliegerwohnung)
- WhatsApp-Nummer, E-Mail, Formspree-ID

---

## Einmaliges Setup (ca. 20 Minuten)

### Schritt 1 – GitHub-Konto anlegen (falls noch keines)
→ https://github.com → Sign up → kostenloses Konto

### Schritt 2 – Neues Repository anlegen
1. https://github.com → New repository
2. Name: `villa-joka` (oder beliebig)
3. Private oder Public – egal
4. → Create repository

### Schritt 3 – Dateien hochladen
1. Im neuen Repo → „uploading an existing file"
2. Den gesamten Inhalt des Ordners **Villa Joka** hochladen:
   - `index.html`
   - `content.json`
   - `admin/` (Ordner mit index.html + config.yml)
   - `images/` (Ordner mit allen Fotos)
3. → Commit changes

### Schritt 4 – Netlify-Konto anlegen
→ https://netlify.com → Sign up with GitHub → kostenloses Konto

### Schritt 5 – Website auf Netlify deployen
1. Netlify Dashboard → **Add new site → Import an existing project**
2. → GitHub auswählen → dein Repository auswählen
3. Build-Einstellungen: alle leer lassen (kein Build-Befehl nötig)
4. → **Deploy site**
5. Netlify vergibt eine zufällige URL (z.B. `happy-villa-123.netlify.app`)
6. Unter Site settings → Domain management → eigene Domain `villa-joka.eu` verknüpfen

### Schritt 6 – Netlify Identity aktivieren
1. Im Netlify Dashboard → **Site settings → Identity → Enable Identity**
2. Unter „Registration" → **Invite only** wählen (sicher!)
3. Unter „Git Gateway" → **Enable Git Gateway**

### Schritt 7 – Admin-Benutzer einladen
1. Netlify Dashboard → **Identity → Invite users**
2. E-Mail-Adresse eingeben (z.B. stevano91@gmail.com)
3. Du erhältst eine E-Mail mit einem Link → Passwort setzen
4. Fertig – Admin-Login aktiv

---

## So funktioniert das Admin-Panel

1. Browser öffnen → **https://villa-joka.eu/admin/**
2. Login mit E-Mail + Passwort
3. Änderungen vornehmen → **Publish** klicken
4. Netlify deployt automatisch innerhalb von ~30 Sekunden
5. Website zeigt sofort die neuen Inhalte

---

## Fotos austauschen

Im Admin-Panel → **Galerie-Fotos** → Foto anklicken → neues Bild hochladen
oder neuen Eintrag hinzufügen und Reihenfolge per Drag & Drop anpassen.

**Empfohlene Bildgröße:** 1200 × 800 px, JPG, max. 500 KB

---

## Formspree aktivieren

1. https://formspree.io → kostenloses Konto anlegen
2. → New Form → Name: „Villa Joka Kontakt"
3. Die Form-ID kopieren (z.B. `xpzvwkgr`)
4. Im Admin-Panel → **Kontakt & Links → Formspree Form-ID** → eintragen → Publish

---

## Sicherheit

- Das Admin-Panel ist unter `/admin/` – kein Link auf der öffentlichen Website
- Login nur per Netlify Identity (echter Auth-Server, kein JS-Passwort)
- „Invite only" = nur wer explizit eingeladen wird, kann sich registrieren
- Netlify Identity kostenlos bis 1.000 aktive Nutzer

---

## Technische Details (für Neugierige)

- `content.json` enthält alle editierbaren Inhalte
- `index.html` lädt `content.json` beim Start per `fetch()` und überschreibt Galerie, Preise und Kontaktdaten
- Fällt `content.json` weg, zeigt die Seite den eingebetteten Fallback-Inhalt (kein Absturz)
- Netlify CMS (Decap CMS) committet Änderungen direkt ins GitHub-Repo
- Netlify erkennt den Commit und baut die Website neu (statisch, kein Server-Backend)
