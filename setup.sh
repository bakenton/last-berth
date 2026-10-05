#!/bin/bash
# Готовит рабочую папку (по умолчанию /tmp/ln) из этой папки в Linux-песочнице Claude.
# live/index.html должен быть последней опубликованной страницей — перед работой сверить с Artifact read.
# Браузер для Playwright: cdn.playwright.dev закрыт фильтром, поэтому Chromium берётся из npm-пакета @sparticuz/chromium.
# Пути в сценариях (/opt/..., /home/claude/ln) переписываются только в рабочей копии; tools/ не трогаются.
set -e
HERE="$(cd "$(dirname "$0")" && pwd)"; W=${1:-/tmp/ln}
rm -rf "$W"; mkdir -p "$W"; cp -r "$HERE/tools/." "$W/"; cp "$HERE/live/index.html" "$W/live.html"
cd "$W"
python3 -c "import re;s=open('live.html').read();b=re.findall(r'<script>\n(.*?)</script>',s,re.S);assert len(b)==2;open('core.js','w').write(b[0]);open('ui.js','w').write(b[1])"
node --check core.js && node --check ui.js
: > new-texts.tsv; : > changed-texts.tsv
python3 build.py
if [ "${NO_BROWSER:-0}" != 1 ]; then
  npm init -y >/dev/null; npm i playwright-core@1 @sparticuz/chromium --silent >/dev/null 2>&1
  CH=$(node -e "const m=require('@sparticuz/chromium');(m.default||m).executablePath().then(p=>console.log(p))")
  sed -i "s#/opt/node-tools/node_modules/playwright#$W/node_modules/playwright-core#g; s#/opt/pw-browsers/chromium#$CH#g; s#/home/claude/ln#$W#g" *.js
  echo "chromium: $CH"
fi
echo "ready: $W"
