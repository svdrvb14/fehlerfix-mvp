# FehlerFix

KI-gestützte, **adaptive** Rechtschreib-Lern-App für Kinder der Klassen 3–7. Die App liest handgeschriebene Texte, erstellt ein unsichtbares Fehlerprofil und generiert daraus personalisierte Übungen – mit kindgerechten Erklärungen statt nur Korrekturen.

## Setup

### 1. Voraussetzungen
- Node.js **>= 18**
- Ein Anthropic API-Key (https://console.anthropic.com)

### 2. Installation
```bash
npm install
```

### 3. API-Key setzen
Kopiere `.env.example` zu `.env` und trage deinen Key ein:
```bash
cp .env.example .env
```
Öffne `.env` und ersetze `dein-key-hier`:
```
ANTHROPIC_API_KEY=sk-ant-...
```
Optional: `CLAUDE_MODEL=claude-opus-4-8` setzen für Top-Qualität (teurer).

### 4. Starten
```bash
npm start
```

Öffne http://localhost:3000 im Browser (Desktop oder iPad).

## So funktioniert FehlerFix

1. **Onboarding** – Das Kind schreibt 3 kurze Texte handschriftlich auf einem Canvas.
2. **KI-Analyse** – Claude liest die Handschrift und erkennt typische Fehlermuster.
3. **Adaptive Übungen** – Personalisierte Übungen, beginnend mit den häufigsten Fehlern, mit kindgerechten Erklärungen.
4. **Fortschritt** – Level, Punkte und Fortschrittsbalken motivieren das Kind weiterzumachen.

## Tech-Stack
- Backend: Node.js + Express
- Frontend: Vanilla HTML / CSS / JavaScript
- KI: Anthropic Claude (Sonnet 4.6 default, Opus 4.8 optional) via Messages API mit Vision
- Handschrift-Eingabe: HTML5 Canvas

## Hinweise
- State wird im Server in-memory gehalten – Server-Neustart setzt alle Sessions zurück.
- Funktioniert auf Desktop und iPad (Touch-Events unterstützt).
