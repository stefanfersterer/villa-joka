# Villa Joka

Leichtgewichtige, statische Website mit dreisprachigen Inhalten (DE/EN/UK), eigenem Vermieter-Dashboard und automatischem Netlify-Build.

## So funktioniert es

1. Veränderliche Inhalte und Bildpfade liegen in `content.json`.
2. Der Gastgeber meldet sich unter `/admin/` mit E-Mail und Passwort an.
3. Eine geschützte Netlify Function schreibt freigegebene Änderungen über die GitHub API in das Repository.
4. Jeder Commit startet automatisch den Netlify-Build.
5. `scripts/build.mjs` erzeugt die statische Website in `dist/`; die öffentliche Seite benötigt keinen Laufzeit-Fetch für ihre Inhalte.

Im Dashboard editierbar sind nur vermietungsrelevante Angaben: Beschreibung, Kontakt, Adresse und Buchungslinks, Preise, Ausstattung, Entfernungen, Galerie und echte Bewertungen. Navigation, Buttons, Footer, SEO, Rechtstexte und technische Einstellungen bleiben bewusst ausgeblendet.

Galeriebilder werden bereits im Browser auf maximal 1600 Pixel Kantenlänge verkleinert und als kompaktes WebP übertragen. Die mitgelieferte Bildstrecke verwendet zusätzlich responsive Varianten mit 720 und 1200 Pixeln; kleine Geräte laden dadurch deutlich weniger Daten.

## Einmalige Einrichtung in Netlify

1. Unter **Project configuration → Identity** Netlify Identity aktivieren.
2. Registrierung auf **Invite only** stellen.
3. Den Gastgeber per E-Mail einladen und beim Benutzer die Rolle `editor` vergeben.
4. Ein Fine-grained GitHub Personal Access Token erstellen. Zugriff ausschließlich auf `stefanfersterer/villa-joka`, Berechtigung **Contents: Read and write**.
5. In Netlify unter **Environment variables** `GITHUB_CONTENT_TOKEN` mit diesem Token anlegen.
6. Optional setzen, falls die Standardwerte abweichen:
   - `GITHUB_OWNER=stefanfersterer`
   - `GITHUB_REPO=villa-joka`
   - `GITHUB_BRANCH=main`
7. Neu deployen. Der Gastgeber öffnet anschließend `https://<domain>/admin/` und legt über den Einladungslink sein Passwort fest.

Der GitHub-Schlüssel wird ausschließlich serverseitig verwendet. Das Dashboard akzeptiert nur angemeldete Benutzer mit der Rolle `editor` oder `admin`.

## Lokaler Build

Node.js 20 oder neuer verwenden:

```bash
npm install
npm run build
npm run check
```

Danach `dist/index.html` über einen lokalen Webserver öffnen, zum Beispiel mit `npx serve dist`. Anmeldung und Speichern funktionieren vollständig erst im Netlify-Projekt mit aktivierter Identity.

## Kontaktformular

Das Anfrageformular wird von Netlify Forms verarbeitet und leitet nach erfolgreichem Versand auf `/danke/` weiter. Damit jede neue Anfrage zusätzlich per E-Mail ankommt, in Netlify bei den Formular-Benachrichtigungen für `buchungsanfrage` die Adresse `info@villa-joka.eu` hinterlegen. Die Einträge bleiben unabhängig davon im Netlify-Bereich **Forms** gespeichert.

## Wichtige Dateien

- `content.json`: Inhaltsdaten
- `src/index.template.html`: Website-Vorlage
- `src/admin.js`: Dashboard-Logik
- `public/admin/index.html`: Dashboard-Oberfläche
- `netlify/functions/`: geschützter Schreib- und Upload-Endpunkt
- `scripts/build.mjs`: statischer Website-Build
- `scripts/check.mjs`: automatische Build-Prüfung
- `public/images/optimized/`: responsive, fürs Web optimierte Bilder
- `netlify.toml`: Build-, Function-, Redirect- und Cache-Konfiguration

`dist/` wird bei jedem Build neu erzeugt und darf nicht manuell bearbeitet werden.
