#!/usr/bin/env bash
# Live validatie van de Topzorg afspraakflow, in één commando.
#
# Dit script is bewust zelfstandig: het zoekt zelf de juiste repository, zet de
# juiste branch klaar, installeert wat nodig is, draait de scan en legt het
# resultaat klaar als zipbestand. Het maakt nooit een afspraak.
#
# Draai het vanaf een werkplek met gewone internettoegang:
#
#     bash live-validatie.sh
#
# Met TOPZORG_GEISOLEERD=1 blijft het script strikt binnen zijn eigen kopie en
# kijkt het niet naar andere repositories op de machine. Dat is de modus die het
# copy-paste commando gebruikt.
#
set -u

BRANCH="claude/topzorg-appointment-poc-h2f5e7"
REPO_URL="https://github.com/ftrprf-labs/website.git"
SUBMAP="tools/topzorg-scan"

melding() { printf '\n==> %s\n' "$1"; }
fout() { printf '\nFOUT: %s\n' "$1" >&2; exit 1; }

# ---------------------------------------------------------------------------
# 1. Node beschikbaar?
# ---------------------------------------------------------------------------
command -v node >/dev/null 2>&1 || fout "Node.js is niet gevonden. Installeer Node 18 of nieuwer via https://nodejs.org en draai dit script opnieuw."
NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
if [ "$NODE_MAJOR" -lt 18 ]; then
  fout "Node $NODE_MAJOR is te oud. Versie 18 of nieuwer is nodig."
fi
command -v git >/dev/null 2>&1 || fout "Git is niet gevonden. Installeer de Xcode command line tools met: xcode-select --install"

# ---------------------------------------------------------------------------
# 2. De juiste repository vinden. Dit is precies wat handmatig misging.
# ---------------------------------------------------------------------------
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO=""

if REPO_KANDIDAAT="$(cd "$SCRIPT_DIR" && git rev-parse --show-toplevel 2>/dev/null)"; then
  if [ -d "$REPO_KANDIDAAT/$SUBMAP" ]; then REPO="$REPO_KANDIDAAT"; fi
fi

# In geïsoleerde modus blijft het script binnen zijn eigen kopie. Andere
# repositories op de machine worden dan niet eens bekeken.
if [ -z "$REPO" ] && [ "${TOPZORG_GEISOLEERD:-0}" != "1" ]; then
  for kandidaat in "$HOME/website" "$HOME/Documents/website" "$HOME/Developer/website" "$HOME/projects/website" "$PWD"; do
    if [ -d "$kandidaat/.git" ] && [ -d "$kandidaat/$SUBMAP" ]; then REPO="$kandidaat"; break; fi
  done
fi

if [ -z "$REPO" ] && [ "${TOPZORG_GEISOLEERD:-0}" = "1" ]; then
  fout "De geïsoleerde kopie is onvolledig. Verwacht $SUBMAP naast dit script."
fi

if [ -z "$REPO" ]; then
  DOEL="$HOME/topzorg-live-validatie/website"
  melding "Geen lokale kopie met $SUBMAP gevonden. Ik haal de repository op naar $DOEL"
  mkdir -p "$(dirname "$DOEL")" || fout "Kan $DOEL niet aanmaken."
  if [ ! -d "$DOEL/.git" ]; then
    git clone --branch "$BRANCH" "$REPO_URL" "$DOEL" || fout "Klonen mislukt. Controleer je GitHub toegang tot ftrprf-labs/website."
  fi
  REPO="$DOEL"
fi

melding "Repository: $REPO"

# ---------------------------------------------------------------------------
# 3. Branch klaarzetten, zonder lokaal werk te overschrijven.
# ---------------------------------------------------------------------------
cd "$REPO" || fout "Kan niet naar $REPO gaan."
HUIDIG="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo onbekend)"

if [ "$HUIDIG" != "$BRANCH" ]; then
  if [ -n "$(git status --porcelain)" ]; then
    melding "Let op: er staan lokale wijzigingen open op branch $HUIDIG. Ik laat die met rust en draai de scan met de code die er nu staat."
  else
    melding "Branch $BRANCH klaarzetten"
    git fetch origin "$BRANCH" >/dev/null 2>&1 || melding "Ophalen van origin mislukte. Ik ga verder met wat lokaal aanwezig is."
    git checkout "$BRANCH" >/dev/null 2>&1 || git checkout -b "$BRANCH" "origin/$BRANCH" >/dev/null 2>&1 || melding "Kon niet naar $BRANCH wisselen. Ik ga verder op $HUIDIG."
  fi
fi

[ -d "$REPO/$SUBMAP" ] || fout "De map $SUBMAP staat niet in deze repository. Controleer of branch $BRANCH is opgehaald."
cd "$REPO/$SUBMAP" || fout "Kan niet naar $SUBMAP gaan."
melding "Werkmap: $(pwd)  op branch $(git rev-parse --abbrev-ref HEAD)"

# ---------------------------------------------------------------------------
# 4. Installeren.
# ---------------------------------------------------------------------------
melding "Afhankelijkheden installeren"
if [ -f package-lock.json ]; then
  npm ci --no-audit --no-fund || npm install --no-audit --no-fund || fout "npm install mislukte."
else
  npm install --no-audit --no-fund || fout "npm install mislukte."
fi

CHROMIUM_PAD="$(node -e "try{console.log(require('playwright').chromium.executablePath())}catch(e){console.log('')}" 2>/dev/null)"
if [ -n "$CHROMIUM_PAD" ] && [ -x "$CHROMIUM_PAD" ]; then
  melding "Chromium staat al klaar op $CHROMIUM_PAD"
else
  melding "Chromium ophalen voor Playwright. De eerste keer duurt dit een paar minuten."
  npx --yes playwright install chromium || fout "Chromium installeren mislukte."
fi

# ---------------------------------------------------------------------------
# 5A. API modus. Verkent de publieke API van Mijn Zorgtoegang zonder browser.
#     Alleen lezende verzoeken, en de stappen persoonsgegevens en bevestigen
#     worden actief geweigerd.
# ---------------------------------------------------------------------------
if [ "${TOPZORG_MODUS:-scan}" = "api" ]; then
  STEMPEL="$(date +%Y-%m-%d_%H-%M-%S)"
  UIT="$(pwd)/runs/api_${STEMPEL}"
  melding "Verkenning van de publieke API. Er wordt niets vastgelegd en niets ingevuld."
  node src/api-verken.mjs --out="$UIT" ${TOPZORG_FOCUS:+--focus="$TOPZORG_FOCUS"}
  CODE=$?

  DOELMAP="$HOME/Desktop"
  [ -d "$DOELMAP" ] || DOELMAP="$HOME"
  BUNDEL="$DOELMAP/topzorg-api_${STEMPEL}.zip"
  if command -v zip >/dev/null 2>&1; then
    (cd "$(dirname "$UIT")" && zip -qr "$BUNDEL" "$(basename "$UIT")") || BUNDEL=""
  elif command -v ditto >/dev/null 2>&1; then
    ditto -c -k --sequesterRsrc --keepParent "$UIT" "$BUNDEL" || BUNDEL=""
  else
    BUNDEL=""
  fi

  melding "API verkenning klaar"
  printf 'Resultaten: %s\n' "$UIT"
  if [ -n "$BUNDEL" ] && [ -f "$BUNDEL" ]; then
    printf '\nAlles in een bestand: %s\n' "$BUNDEL"
    printf 'Deel dat bestand terug in de chat.\n'
    if command -v open >/dev/null 2>&1; then open -R "$BUNDEL" >/dev/null 2>&1 || true; fi
  fi
  exit "$CODE"
fi

# ---------------------------------------------------------------------------
# 5a. Verkenmodus. Legt vast hoe het centrale portaal zijn locatielijst en zijn
#     beschikbaarheid ophaalt, inclusief de netwerkverzoeken.
# ---------------------------------------------------------------------------
if [ "${TOPZORG_MODUS:-scan}" = "verken" ]; then
  STEMPEL="$(date +%Y-%m-%d_%H-%M-%S)"
  UIT="$(pwd)/runs/verken_${STEMPEL}"
  melding "Verkenning van het centrale portaal. Er wordt geen afspraak gemaakt."
  node src/verken.mjs --out="$UIT"
  CODE=$?

  BUNDEL=""
  DOELMAP="$HOME/Desktop"
  [ -d "$DOELMAP" ] || DOELMAP="$HOME"
  BUNDEL="$DOELMAP/topzorg-verkenning_${STEMPEL}.zip"
  if command -v zip >/dev/null 2>&1; then
    (cd "$(dirname "$UIT")" && zip -qr "$BUNDEL" "$(basename "$UIT")") || BUNDEL=""
  elif command -v ditto >/dev/null 2>&1; then
    ditto -c -k --sequesterRsrc --keepParent "$UIT" "$BUNDEL" || BUNDEL=""
  else
    BUNDEL=""
  fi

  melding "Verkenning klaar"
  printf 'Resultaten: %s\n' "$UIT"
  if [ -n "$BUNDEL" ] && [ -f "$BUNDEL" ]; then
    printf '\nAlles in een bestand: %s\n' "$BUNDEL"
    printf 'Deel dat bestand terug in de chat.\n'
    if command -v open >/dev/null 2>&1; then open -R "$BUNDEL" >/dev/null 2>&1 || true; fi
  fi
  exit "$CODE"
fi

# ---------------------------------------------------------------------------
# 5. Scannen. Een of meer locaties, ingesteld met TOPZORG_LOCATIES.
# ---------------------------------------------------------------------------
STEMPEL="$(date +%Y-%m-%d_%H-%M-%S)"
BASISMAP="$(pwd)/runs/live_${STEMPEL}"
LOCATIES="${TOPZORG_LOCATIES:-revalidatie-amersfoort-databankweg,fysiotherapie-amersfoort-databankweg}"
SLECHTSTE=0
OVERZICHT=""

OUD_IFS="$IFS"
IFS=','
for SLEUTEL in $LOCATIES; do
  IFS="$OUD_IFS"
  [ -n "$SLEUTEL" ] || continue

  melding "Scan starten voor $SLEUTEL. De agent stopt bij de agenda en bevestigt nooit een afspraak."
  node src/scan.mjs --locatie="$SLEUTEL" --out="$BASISMAP/$SLEUTEL" --bewaar-html
  CODE=$?

  case "$CODE" in
    0) UITSLAG="GROEN, de online route werkt tot en met de tijdselectie" ;;
    1) UITSLAG="ORANJE, de route start maar loopt vast voor de tijdselectie" ;;
    2) UITSLAG="ROOD, de online route is niet bereikt" ;;
    *) UITSLAG="de scan is afgebroken door een technische fout" ;;
  esac

  OVERZICHT="${OVERZICHT}${SLEUTEL}: ${UITSLAG}
"
  [ "$CODE" -gt "$SLECHTSTE" ] && SLECHTSTE="$CODE"
  IFS=','
done
IFS="$OUD_IFS"

UIT="$BASISMAP"
CODE="$SLECHTSTE"

# ---------------------------------------------------------------------------
# 6. Resultaat klaarzetten.
# ---------------------------------------------------------------------------
BUNDEL=""
if [ -d "$UIT" ]; then
  DOELMAP="$HOME/Desktop"
  [ -d "$DOELMAP" ] || DOELMAP="$HOME"
  BUNDEL="$DOELMAP/topzorg-scan_${STEMPEL}.zip"
  BASIS="$(dirname "$UIT")"
  NAAM="$(basename "$UIT")"
  if command -v zip >/dev/null 2>&1; then
    (cd "$BASIS" && zip -qr "$BUNDEL" "$NAAM") || BUNDEL=""
  elif command -v ditto >/dev/null 2>&1; then
    ditto -c -k --sequesterRsrc --keepParent "$UIT" "$BUNDEL" || BUNDEL=""
  else
    BUNDEL=""
  fi
fi

melding "Uitslag per locatie"
printf '%s\n' "$OVERZICHT"
printf 'Alle resultaten staan in: %s\n' "$UIT"
if [ -n "$BUNDEL" ] && [ -f "$BUNDEL" ]; then
  printf '\nAlles in een bestand: %s\n' "$BUNDEL"
  printf 'Deel dat bestand terug in de chat, dan werk ik het rapport af.\n'
  if command -v open >/dev/null 2>&1; then open -R "$BUNDEL" >/dev/null 2>&1 || true; fi
fi

exit "$CODE"
