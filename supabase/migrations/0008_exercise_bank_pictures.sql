-- Bild-Schlüssel für Übungen mit Bildern (Format 'picture_sentence').
-- Enthält NUR { key: "..." }-Objekte, die auf lib/imagelibrary.js verweisen –
-- niemals Bild-Rohdaten oder generierte Bilder direkt.
alter table exercise_bank add column if not exists pictures jsonb;
