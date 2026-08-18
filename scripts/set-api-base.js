#!/usr/bin/env node
/**
 * Setzt die Backend-URL in public/config.js.
 *
 * Hintergrund: Im Web liefert der Express-Server die Oberfläche selbst aus,
 * die API liegt also auf derselben Herkunft (apiBase = ''). In der nativen App
 * liegt die Oberfläche im App-Bundle – dort muss die absolute URL des Backends
 * eingetragen werden, sonst findet die App die API nicht.
 *
 * Nutzung:
 *   node scripts/set-api-base.js https://fehlerfix.onrender.com   (native Build)
 *   node scripts/set-api-base.js ""                                (zurück auf Web)
 */
const fs = require('fs');
const path = require('path');

const target = process.argv[2];
if (target === undefined) {
  console.error('Bitte Backend-URL angeben, z.B.:\n  node scripts/set-api-base.js https://fehlerfix.onrender.com');
  process.exit(1);
}

const base = target.replace(/\/+$/, ''); // abschließende Slashes weg
const file = path.join(__dirname, '..', 'public', 'config.js');
const src = fs.readFileSync(file, 'utf8');

const updated = src.replace(
  /apiBase:\s*'[^']*'/,
  `apiBase: '${base}'`
);

if (updated === src && !src.includes(`apiBase: '${base}'`)) {
  console.error('Konnte apiBase in public/config.js nicht ersetzen – bitte Datei prüfen.');
  process.exit(1);
}

fs.writeFileSync(file, updated);
console.log(`apiBase gesetzt auf: ${base || '(leer → gleiche Herkunft, Web-Modus)'}`);
