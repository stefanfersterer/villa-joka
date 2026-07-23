# Deployment-Checkliste

## GitHub und Netlify

- [ ] Projektdateien in den Branch `main` übernehmen.
- [ ] Prüfen, dass Netlify weiterhin mit `stefanfersterer/villa-joka` verbunden ist.
- [ ] Ersten Build abwarten; Build-Befehl und Publish-Ordner kommen aus `netlify.toml`.
- [ ] Unter **Project configuration → Identity** Identity aktivieren.
- [ ] Registrierung auf **Invite only** stellen.
- [ ] `GITHUB_CONTENT_TOKEN` als geschützte Netlify-Umgebungsvariable anlegen.
- [ ] Token auf genau dieses Repository und **Contents: Read and write** begrenzen.
- [ ] Gastgeber per E-Mail einladen und Rolle `editor` setzen.
- [ ] Nach den Einstellungen einen neuen Deploy auslösen.
- [ ] Unter **Forms → Form notifications** für `buchungsanfrage` eine E-Mail-Benachrichtigung an `info@villa-joka.eu` anlegen.

## Dashboard testen

- [ ] Einladungslink öffnen und persönliches Passwort festlegen.
- [ ] Unter `/admin/` anmelden.
- [ ] Eine kleine Textänderung speichern.
- [ ] GitHub-Commit und anschließenden Netlify-Deploy kontrollieren.
- [ ] Änderung auf der Vorschau-Website prüfen.
- [ ] Testbild hochladen, speichern und Darstellung prüfen.
- [ ] Eine frühere Inhaltsversion wiederherstellen und erneut prüfen.
- [ ] Passwort-Reset testen.
- [ ] Prüfen, dass ein Benutzer ohne Rolle `editor` nicht speichern kann.

## Öffentliche Website testen

- [ ] DE, EN und UK vollständig durchschalten.
- [ ] Mobile Navigation öffnen und schließen.
- [ ] Galerie sowie Vor/Zurück/Escape testen.
- [ ] Preise und Zusatzkosten abgleichen.
- [ ] E-Mail-, Telefon-, WhatsApp-, Airbnb- und Booking-Links testen.
- [ ] Formular absenden, Danke-Seite prüfen und Eingang unter Netlify Forms kontrollieren.
- [ ] E-Mail-Eingang bei `info@villa-joka.eu` kontrollieren.
- [ ] Impressum und Datenschutz öffnen und schließen.
- [ ] Smartphone- und Desktop-Darstellung prüfen.

## Erst danach die Hauptdomain

- [ ] Finale Inhalte durch den Gastgeber freigeben lassen.
- [ ] `villa-joka.eu` in Netlify als Produktionsdomain hinzufügen.
- [ ] DNS-Einträge beim Domain-Hoster nach Netlify-Vorgabe setzen.
- [ ] HTTPS-Zertifikat und Weiterleitung zwischen `www` und Hauptdomain prüfen.
- [ ] Canonical-URL in `content.json` auf die endgültige bevorzugte Domain abstimmen.

Bei einem fehlenden Pflichtfeld oder Bild stoppt der Build. Die zuletzt erfolgreich veröffentlichte Netlify-Version bleibt dabei online.
