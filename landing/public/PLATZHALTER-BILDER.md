# Platzhalter-Bilder

`logo.png` und `team-foto.png` in diesem Ordner sind **generierte Platzhalter**
(Streifenmuster in den Marken-Farben), keine echten Fotos/Logos. Diese
Session konnte die im Chat/Task angehängten Original-Bilder (FehlerFix-Logo
und das Team-Foto im Schulflur) nicht als Dateien auslesen, da sie in dieser
Remote-Umgebung nicht auf der Festplatte verfügbar sind.

**Bitte ersetzen, bevor die Seite live geht:**

- `public/logo.png` → das echte FehlerFix-Logo (Icon + Wortmarke), am besten
  in möglichst hoher Auflösung, transparenter Hintergrund empfohlen.
- `public/team-foto.png` → das Team-Foto (Salvador, Mariam, Blanca im
  Schulflur), Seitenverhältnis ca. 3:4 passt am besten zum aktuellen Layout
  in `components/TeamSection.tsx`.

Einfach die Dateien mit denselben Namen in `public/` überschreiben – im Code
muss dafür nichts angepasst werden.
