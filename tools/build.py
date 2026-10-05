# LAST BERTH — assemble the page from live.html + edited core.js / ui.js + text rows.
# python3 ../tools/build.py   (run in work/)
#   live.html        = the published index.html (Artifact read), never edited by hand
#   core.js, ui.js   = cut from live.html (see status doc), edited in place
#   new-texts.tsv    = table \t key \t en \t ru   — rows to ADD (may be empty)
#   changed-texts.tsv= same format                — rows to REPLACE (may be empty)
# Writes page.html (= long-night.html, for Playwright and the chat) and artifact.html (body only, published).
# Idempotent against an already-built live.html: HTML/CSS patches from v4.0–4.2 are skipped when present,
# and a "new" row that is already baked with the same text is skipped (different text = error: use changed-texts).
# Every row is checked: {placeholders} must match between EN and RU.
import re,json,os
rd=lambda p:open(p,encoding='utf-8',newline='').read()
wr=lambda p,t:open(p,'w',encoding='utf-8',newline='').write(t)   # utf-8 and LF on any platform: builds are compared byte for byte
live=rd('live.html')
core=rd('core.js'); ui=rd('ui.js')
parts=re.split(r'(<script>\n.*?</script>)',live,flags=re.S)
idx=[i for i,x in enumerate(parts) if x.startswith('<script>\n')]
assert len(idx)==2,'expected two <script> blocks (core, ui)'
parts[idx[0]]='<script>\n'+core+'</script>'; parts[idx[1]]='<script>\n'+ui+'</script>'
s=''.join(parts)
def patch(a,b,done_marker):
    """apply a one-shot HTML/CSS patch unless done_marker is already in the page"""
    global s
    if done_marker in s: return
    assert s.count(a)==1,(a[:60],s.count(a)); s=s.replace(a,b)
# v4.12 feedback / sound / icons
patch('<button class="sp" id="b-lang" type="button">RU</button>',
      '<button class="sp" id="b-lang" type="button">RU</button>\n      <button class="sp" id="b-sfx" type="button" aria-pressed="true">&#9835;</button>',
      'id="b-sfx"')
patch('<symbol id="i-people" viewBox="0 0 16 16">',
      '<symbol id="i-courier" viewBox="0 0 64 40"><path d="M2 26 L12 34 H50 L60 26 Z"/><path d="M8 26 L14 16 H40 L44 26 Z"/><path d="M28 16 L34 10 H40 V16 Z" opacity=".35"/><path d="M50 30 H64 M54 34 H66" stroke="currentColor" stroke-width="2" fill="none"/></symbol>\n'
      '  <symbol id="i-hauler" viewBox="0 0 64 40"><path d="M2 22 L8 36 H54 L60 22 Z"/><rect x="34" y="10" width="16" height="12"/><rect x="38" y="13" width="8" height="4" opacity=".35"/><rect x="18" y="2" width="3" height="20"/><path d="M20 4 L40 16 M20 4 L6 22" stroke="currentColor" stroke-width="2" fill="none"/></symbol>\n'
      '  <symbol id="i-freighter" viewBox="0 0 64 40"><path d="M0 24 L6 36 H60 L64 24 Z"/><rect x="8" y="16" width="10" height="8"/><rect x="20" y="16" width="10" height="8"/><rect x="32" y="16" width="10" height="8"/><rect x="8" y="8" width="10" height="7"/><rect x="20" y="8" width="10" height="7"/><rect x="32" y="8" width="10" height="7"/><rect x="48" y="4" width="10" height="20"/><rect x="50" y="7" width="6" height="3" opacity=".35"/></symbol>\n'
      '  <symbol id="i-k-mine" viewBox="0 0 80 60"><rect x="4" y="44" width="30" height="14"/><rect x="10" y="30" width="18" height="14"/><rect x="13" y="33" width="7" height="6" opacity=".35"/><path d="M26 34 L48 8 L66 26" stroke="currentColor" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" fill="none"/><path d="M66 26 L60 44 L74 50 L78 38 Z"/><path d="M62 46 L60 52 M68 48 L67 54 M74 50 L74 56" stroke="currentColor" stroke-width="2.5" fill="none"/></symbol>\n'
      '  <symbol id="i-k-well" viewBox="0 0 80 60"><g fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"><path d="M28 52 L38 22 L48 52"/><path d="M8 22 L68 24"/><path d="M10 26 L20 46"/><circle cx="20" cy="46" r="5"/><path d="M70 30 V52"/></g><path d="M62 16 L74 22 L66 36 Z"/><circle cx="6" cy="22" r="6"/><rect x="0" y="52" width="76" height="4"/></symbol>\n'
      '  <symbol id="i-k-farm" viewBox="0 0 80 60"><rect x="6" y="20" width="30" height="16"/><rect x="26" y="8" width="14" height="12"/><rect x="29" y="11" width="6" height="5" opacity=".35"/><circle cx="46" cy="40" r="12"/><circle cx="46" cy="40" r="4" opacity=".35"/><circle cx="12" cy="44" r="7"/><circle cx="12" cy="44" r="2" opacity=".35"/><rect x="58" y="34" width="10" height="4"/></symbol>\n'
      '  <symbol id="i-k-works" viewBox="0 0 80 60"><g transform="translate(22,28)"><circle r="12"/><rect x="-3" y="-19" width="6" height="8"/><rect x="-3" y="11" width="6" height="8"/><rect x="-19" y="-3" width="8" height="6"/><rect x="11" y="-3" width="8" height="6"/><g transform="rotate(45)"><rect x="-3" y="-19" width="6" height="8"/><rect x="-3" y="11" width="6" height="8"/><rect x="-19" y="-3" width="8" height="6"/><rect x="11" y="-3" width="8" height="6"/></g><circle r="5" opacity=".35"/></g><g transform="translate(58,28)"><circle r="12"/><rect x="-3" y="-19" width="6" height="8"/><rect x="-3" y="11" width="6" height="8"/><rect x="-19" y="-3" width="8" height="6"/><rect x="11" y="-3" width="8" height="6"/><g transform="rotate(45)"><rect x="-3" y="-19" width="6" height="8"/><rect x="-3" y="11" width="6" height="8"/><rect x="-19" y="-3" width="8" height="6"/><rect x="11" y="-3" width="8" height="6"/></g><circle r="5" opacity=".35"/></g><path d="M22 9 H58 M22 47 H58" stroke="currentColor" stroke-width="3" stroke-dasharray="5 3" fill="none"/></symbol>\n'
      '  <symbol id="i-pile" viewBox="0 0 64 48"><circle cx="16" cy="38" r="8"/><circle cx="32" cy="38" r="8"/><circle cx="48" cy="38" r="8"/><circle cx="24" cy="24" r="8"/><circle cx="40" cy="24" r="8"/><circle cx="32" cy="10" r="8"/></symbol>\n'
      '  <symbol id="i-house" viewBox="0 0 64 56"><path d="M4 26 L32 2 L60 26 V54 H4 Z" fill="none" stroke="currentColor" stroke-width="5" stroke-linejoin="round"/></symbol>\n'
      '  <symbol id="i-plant" viewBox="0 0 64 56"><path d="M4 54 V30 L18 20 V30 L32 20 V30 L46 20 V54 Z"/><rect x="50" y="6" width="10" height="48"/><path d="M6 8 H34" stroke="currentColor" stroke-width="4" fill="none"/><path d="M30 2 L40 8 L30 14 Z"/></symbol>\n'
      '  <symbol id="i-people" viewBox="0 0 16 16">',
      'id="i-courier"')
patch('.gkick{color:var(--ink2);font-size:13px;line-height:1.6;margin:0 0 12px}',
      '.gkick{color:var(--ink2);font-size:13px;line-height:1.6;margin:0 0 12px}\n'
      '/* v4.12: press marks, blocked buttons that answer, ship silhouettes, planet pictograms */\n'
      '@media(max-width:880px){#toast{position:fixed;top:auto;bottom:14px;z-index:40}}\n'
      '.pfx{position:fixed;z-index:60;width:18px;height:18px;margin:-9px 0 0 -9px;border:2px solid var(--ink);pointer-events:none;animation:pfx .34s ease-out forwards}\n'
      '.pfx.bad{border-color:var(--red)}@keyframes pfx{0%{transform:scale(.4);opacity:1}100%{transform:scale(2.4);opacity:0}}\n'
      '@keyframes shake{0%,100%{transform:none}25%{transform:translateX(-3px)}75%{transform:translateX(3px)}}.shake{animation:shake .18s linear}\n'
      '.btn:active:not([aria-disabled]),.dbtn:active:not([aria-disabled]),.chip:active,.sp:active,.tab:active,.tg:active{transform:translate(1px,1px)}\n'
      '.btn[aria-disabled="true"]{opacity:.32;cursor:not-allowed}.btn[aria-disabled="true"]:hover{background:transparent;color:inherit;border-color:var(--line2)}\n'
      '.btn.prim[aria-disabled="true"]:hover{background:var(--red);border-color:var(--red);color:var(--bg)}\n'
      '.dbtn[aria-disabled="true"]{cursor:not-allowed}.dbtn[aria-disabled="true"] b,.dbtn[aria-disabled="true"] .dsub{opacity:.45}.dbtn[aria-disabled="true"]:hover{background:transparent}\n'
      '.sp.mute{color:var(--ink3);text-decoration:line-through}\n'
      '.sico{display:inline-block;vertical-align:-3px;margin-right:6px;fill:currentColor;flex:0 0 auto}.sico-courier{width:18px;height:11px}.sico-hauler{width:24px;height:15px}.sico-freighter{width:32px;height:20px}\n'
      '.chip .sico{vertical-align:-2px}.chip .sico-freighter{width:26px;height:16px}.chip .sico-hauler{width:20px;height:13px}.chip .sico-courier{width:15px;height:9px}\n'
      '.dbtn b .sico{vertical-align:-3px}.yq .sico{vertical-align:-2px}.row .sico{vertical-align:-2px}\n'
      '.kico{width:20px;height:15px;fill:currentColor;flex:0 0 auto}\n'
      '.blk.kb{position:relative;overflow:hidden}.blk.kb .wm{position:absolute;right:8px;bottom:4px;width:84px;height:63px;fill:var(--ink);opacity:.14;pointer-events:none}\n'
      '.pico{position:relative;display:inline-block;width:20px;height:18px;vertical-align:-4px;margin-right:4px;flex:0 0 auto}.pico .pi{position:absolute;left:0;top:0;width:20px;height:18px;fill:currentColor}\n'
      '.pico .ico{position:absolute;left:5px;top:6px;width:10px;height:10px;margin:0}.bs b .pico{margin-right:2px}.row .pico{width:16px;height:14px;vertical-align:-3px}.row .pico .pi{width:16px;height:14px}.row .pico .ico{left:3px;top:3px;width:9px;height:9px}',
      '.pfx{')
# v4.11 save button, pile bar
patch('<button class="btn go" type="button" data-act="copylog" data-t="copyBtn">Copy to clipboard</button>',
      '<button class="btn go" type="button" data-act="savelog" data-t="saveBtn">Save as file</button>\n    <button class="btn" type="button" data-act="copylog" data-t="copyBtn">Copy to clipboard</button>',
      'data-act="savelog"')
patch('.gkick{color:var(--ink2);font-size:13px;line-height:1.6;margin:0 0 12px}',
      '.gkick{color:var(--ink2);font-size:13px;line-height:1.6;margin:0 0 12px}\n'
      '.pile{margin-top:10px}.pile-bar{position:relative;height:12px;background:var(--panel3);border:1px solid var(--line2)}.pile-fill{position:absolute;left:0;top:0;bottom:0;background:var(--ink2)}.pile-take{position:absolute;left:0;top:0;bottom:0;background:var(--red);opacity:.85}.pile-lbl{font-size:11px;font-family:var(--mono);margin-top:4px}',
      '.pile-bar{')
# v4.10 big status, hull rows, blinking alert
patch('.gkick{color:var(--ink2);font-size:13px;line-height:1.6;margin:0 0 12px}',
      '.gkick{color:var(--ink2);font-size:13px;line-height:1.6;margin:0 0 12px}\n'
      '.bigstat{padding:10px 12px}.bs-row{display:flex;gap:10px}.bs{flex:1 1 0;min-width:0}.bs small{display:block;color:var(--ink3);font-size:10px;letter-spacing:.1em;text-transform:uppercase;margin-bottom:4px}.bs b{display:flex;align-items:center;gap:5px;font-size:20px;font-family:var(--mono);font-weight:700}.bs b .ico{width:16px;height:16px}\n'
      '.bs-verdict{margin-top:8px;font-size:13px;letter-spacing:.1em;text-transform:uppercase;font-weight:700}.bs-verdict.bad{color:var(--red)}.bs-verdict.good{color:var(--ink)}\n'
      '.lhs{margin-bottom:8px;padding-bottom:6px;border-bottom:1px solid var(--panel3)}.lh{display:flex;justify-content:space-between;gap:10px;padding:5px 0;font-size:13px;border-bottom:1px solid var(--panel3)}.lh b{font-family:var(--mono)}.lh span{font-size:11px;font-family:var(--mono)}\n'
      '#alert.blink{animation:lbblink 1.1s ease-in-out infinite}',
      '.bigstat{')
# v4.9 toasts, alert, blink rings, big buttons, yard queue
patch('.gkick{color:var(--ink2);font-size:13px;line-height:1.6;margin:0 0 12px}',
      '.gkick{color:var(--ink2);font-size:13px;line-height:1.6;margin:0 0 12px}\n'
      '#toasts{position:fixed;right:14px;bottom:14px;z-index:14;display:flex;flex-direction:column;gap:6px;max-width:360px;pointer-events:none}\n'
      '#toasts .tst{background:var(--panel);border:1px solid var(--line2);color:var(--ink);font-size:12px;line-height:1.4;padding:8px 10px;opacity:1;transition:opacity .4s}\n'
      '#toasts .tst.bad{border-color:var(--red);color:var(--red)}#toasts .tst.gone{opacity:0}\n'
      '#alert{position:fixed;left:14px;bottom:14px;z-index:14;display:none;max-width:420px;padding:14px 18px;border:2px solid var(--red);background:var(--bg);color:var(--red)}\n'
      '#alert.show{display:block}#alert b{display:block;font-size:18px;letter-spacing:.12em;text-transform:uppercase;margin-bottom:6px}#alert span{color:var(--ink);font-size:13px}\n'
      '#alert.warn{border-color:#e0b000;color:#e0b000}\n'
      '@keyframes lbblink{0%,100%{opacity:1}50%{opacity:.15}}.pnode.dead .blinkring,.pnode.waithulls .blinkring{animation:lbblink 1.2s ease-in-out infinite}\n'
      '.bigrow{display:flex;flex-direction:column;gap:8px;margin:0 0 12px}\n'
      '.btn.bigbtn{background:var(--red);border-color:var(--red);color:#fff;font-size:15px;letter-spacing:.14em;padding:14px 12px;text-align:left}.btn.bigbtn small{display:block;margin-top:6px;font-size:11px;letter-spacing:0;text-transform:none;font-weight:400;color:#fff}\n'
      '.yardq{display:flex;flex-wrap:wrap;gap:6px 14px;align-items:center;padding:6px 10px;border-bottom:1px solid var(--panel3);font-size:11px;font-family:var(--mono)}.yardq .yq{color:var(--ink)}',
      '#toasts{')
# v4.6 standing orders
patch('.gkick{color:var(--ink2);font-size:13px;line-height:1.6;margin:0 0 12px}',
      '.gkick{color:var(--ink2);font-size:13px;line-height:1.6;margin:0 0 12px}\n'
      '.so-row{display:grid;grid-template-columns:1fr auto;gap:2px 10px;align-items:center;padding:6px 0;border-bottom:1px solid var(--panel3)}\n'
      '.so-row .so-name{display:flex;flex-direction:column;gap:1px;min-width:0}.so-row .so-name small{color:var(--ink3);font-size:11px;font-family:var(--mono)}\n'
      '.so-row .so-cnt{display:flex;align-items:center;gap:6px}.so-row .so-cnt b{min-width:18px;text-align:center;font-family:var(--mono);font-size:14px}\n'
      '.so-row .so-st{grid-column:1/3;font-size:11px;font-family:var(--mono)}\n'
      '.so-row .btn.sm{display:inline-block;width:auto;padding:2px 9px;font-size:14px;line-height:1.2;text-align:center}',
      '.so-row{')
# v4.5 shift report
patch('.gkick{color:var(--ink2);font-size:13px;line-height:1.6;margin:0 0 12px}',
      '.gkick{color:var(--ink2);font-size:13px;line-height:1.6;margin:0 0 12px}\n'
      '#introbox.shift{max-width:560px}\n'
      '#introbox.shift h2{margin:0 0 10px;font-size:15px;letter-spacing:.12em;text-transform:uppercase}\n'
      '#introbox.shift .rows{display:flex;flex-direction:column;gap:6px;font-size:13px}\n'
      '#introbox.shift .rows .row{display:flex;justify-content:space-between;gap:12px;border-bottom:1px solid var(--panel3);padding:4px 0}\n'
      '#introbox.shift .rows .row span{color:var(--ink3)}\n'
      '#introbox.shift .gnav{margin-top:16px}',
      '#introbox.shift')
# v4.3 opening cards
patch('.gkick{color:var(--ink2);font-size:13px;line-height:1.6;margin:0 0 12px}',
      '.gkick{color:var(--ink2);font-size:13px;line-height:1.6;margin:0 0 12px}\n'
      '#intro:has(#introbox.opening){background:var(--bg)}\n'
      '#introbox.opening{max-width:860px;padding:0;border-color:var(--ink3)}\n'
      '#introbox.opening .oart{display:block;cursor:pointer;background:var(--bg);border-bottom:1px solid var(--panel3)}\n'
      '#introbox.opening .oart svg{display:block;width:100%;height:auto;max-height:44vh}\n'
      '#introbox.opening .otext{font-size:19px;line-height:1.5;color:var(--ink);margin:0;padding:26px 34px 22px;min-height:96px;letter-spacing:-.01em}\n'
      '#introbox.opening .gsteps{margin:0 34px 14px}\n'
      '#introbox.opening .gnav{padding:0 34px 26px}\n'
      '@media (max-width:640px){#introbox.opening .otext{font-size:16px;padding:18px 20px}#introbox.opening .gsteps{margin:0 20px 12px}#introbox.opening .gnav{padding:0 20px 18px}}',
      '#introbox.opening')
# v4.2 speed buttons
patch('<button class="sp" data-spd="3" type="button">3×</button>\n      <button class="sp" data-spd="8" type="button">8×</button>',
      '<button class="sp" data-spd="2" type="button">2×</button>\n      <button class="sp" data-spd="4" type="button">4×</button>\n      <button class="sp" data-spd="10" type="button">10×</button>',
      'data-spd="10"')
# v4.0 header: night sub-line + ark drive cell
patch('<div class="hcell grow" id="h-nightcell"><span class="k" data-t="hNight">Night</span><span class="v" id="h-night">—</span></div>',
      '<div class="hcell" id="h-nightcell"><span class="k" data-t="hNight">Night</span><span class="v" id="h-night">—</span><span class="hs" id="h-nightsub"></span></div>\n    <div class="hcell grow" id="h-arkcell" hidden><span class="k" id="h-arkk">Ark drive</span><span class="v" id="h-arkd">—</span><span class="hs" id="h-arkdsub"></span></div>',
      'id="h-arkcell"')
patch('.sp{font-family:var(--sans);font-size:12px;font-weight:600;padding:0 12px;',
      '.sp{font-family:var(--sans);font-size:12px;font-weight:600;padding:0 9px;',
      'padding:0 9px;')
patch('#hdr .grow{flex:1 1 auto;border-right:0}',
      '#hdr .grow{flex:1 1 auto;border-right:0}\n.hcell .hs{font-family:var(--mono);font-size:10.5px;color:var(--ink2);white-space:nowrap;font-variant-numeric:tabular-nums;margin-top:3px;overflow:hidden;text-overflow:ellipsis}\n#hdr #h-arkcell{flex:1 1 0;min-width:110px}',
      '.hcell .hs{')
# v4.13 rail cleanup (Nikita, 30.09): header without Output and Drive; drive icon; big standing-order rows; lit block
for cell in ('    <div class="hcell"><span class="k" data-t="hOut">Output</span><span class="v" id="h-hands">\u2014</span></div>\n',
             '    <div class="hcell"><span class="k" data-t="drive">Drive</span><span class="v" id="h-drive">\u2014</span></div>\n'):
    if cell in s: assert s.count(cell)==1; s=s.replace(cell,'')
patch('  <symbol id="i-people" viewBox="0 0 16 16">',
      '  <symbol id="i-drive" viewBox="0 0 80 60"><rect x="2" y="20" width="26" height="20"/><path d="M28 24 L50 8 V52 L28 36 Z"/><rect x="8" y="26" width="14" height="8" opacity=".35"/><path d="M56 18 H72 M56 30 H80 M56 42 H72" stroke="currentColor" stroke-width="4" stroke-linecap="round" fill="none"/></symbol>\n'
      '  <symbol id="i-people" viewBox="0 0 16 16">',
      'id="i-drive"')
patch('.so-row{display:grid;grid-template-columns:1fr auto;gap:2px 10px;align-items:center;padding:6px 0;border-bottom:1px solid var(--panel3)}',
      '.so-row{display:grid;grid-template-columns:1fr auto;gap:2px 10px;align-items:center;padding:9px 0;border-bottom:1px solid var(--panel3)}\n'
      '/* v4.13: the standing order reads from across the room — silhouette, class, number */\n'
      '.so-row .so-name b{font-size:15px;letter-spacing:.06em;text-transform:uppercase;display:flex;align-items:center}\n'
      '.so-row .sico-courier{width:26px;height:16px}.so-row .sico-hauler{width:32px;height:20px}.so-row .sico-freighter{width:40px;height:25px}\n'
      '.so-row .so-cnt b{font-size:22px;min-width:26px}.so-row .btn.sm{font-size:16px;padding:3px 11px}\n'
      '#railbody>*{flex:0 0 auto}   /* v4.13 fix: a flex child with overflow:hidden (.blk.kb since v4.12) shrank to 2px and the kit block vanished */\n'
      '.blk.hl{border-color:var(--ink)}.blk.hl>h3{background:var(--ink);color:var(--bg);border-bottom-color:var(--ink)}.blk.hl>h3 .kico{fill:var(--bg)}',
      '.blk.hl{')
# v4.16 the ring sign (F-04) and the new-generation panel (F-05) live in one box on the map
patch('<div id="advisor"></div>',
      '<div id="advisor"></div><div id="ringsign"></div>',
      'id="ringsign"')
patch('#mapwrap{flex:1 1 auto;min-width:0;position:relative;background:var(--bg)}',
      '#mapwrap{flex:1 1 auto;min-width:0;position:relative;background:var(--bg)}\n' + '#ringsign{position:absolute;top:10px;right:10px;z-index:13;display:flex;flex-direction:column;align-items:flex-end;gap:6px;max-width:min(360px,58%);pointer-events:none}\n#ringsign>*{pointer-events:auto}\n#ringsign .rs,#ringsign .ng{display:block;text-align:left;cursor:pointer;background:var(--bg);color:var(--ink);border:1px solid var(--ink3);padding:8px 12px;font:inherit;max-width:100%}\n#ringsign .rs b,#ringsign .ng b{display:block;font-size:11px;letter-spacing:.14em;text-transform:uppercase}\n#ringsign .rs span,#ringsign .ng span{display:block;margin-top:3px;font-size:12px;line-height:1.4;color:var(--ink2)}\n#ringsign .rs.ok{border-color:var(--teal)}\n#ringsign .rs.ok b{color:var(--teal)}\n#ringsign .rs.urgent{border:2px solid var(--red);animation:lbblink 1.1s ease-in-out infinite}\n#ringsign .rs.urgent b{color:var(--red)}\n#ringsign .rs-range{font-size:11.5px;line-height:1.4;background:var(--bg);border:1px solid #e0b000;color:#e0b000;padding:6px 10px}\n#ringsign .ng{border:2px solid var(--teal)}\n#ringsign .ng b{color:var(--teal)}\n#nofree{position:fixed;left:0;top:0;right:0;bottom:0;z-index:30;background:rgba(0,0,0,.9);display:flex;align-items:center;justify-content:center;padding:20px}\n#nofree .nf-box{max-width:560px;border:2px solid var(--red);background:var(--bg);padding:26px 28px}\n#nofree h2{color:var(--red);letter-spacing:.14em;margin:0 0 12px;font-size:20px}\n#nofree p{line-height:1.55;margin:0 0 18px}\n#nofree .nf-row{display:flex;gap:10px;flex-wrap:wrap}\n@media (max-width:640px){#ringsign{left:10px;right:10px;max-width:none;align-items:stretch}#mapwrap:has(#ringsign .rs) #advisor{top:104px}}\n'.rstrip('\n'),
      '#ringsign{')
# v4.17 fleet panel (tabs, rows, progress bars), generation track
patch('#nofree{position:fixed;',
      '.advtabs{display:flex;align-items:stretch;border-bottom:1px solid var(--line2)}\n.advtab{flex:1 1 auto;min-width:0;display:flex;align-items:center;gap:7px;padding:8px 10px;background:var(--bg);border:0;border-right:1px solid var(--line);cursor:pointer;font-family:var(--sans);font-size:10px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:var(--ink2);text-align:left}\n.advtab span{white-space:nowrap}\n.advtab.on{color:var(--ink);box-shadow:inset 0 -2px 0 var(--ink)}\n.advtab b{font-size:11px;padding:1px 7px;border:1px solid var(--ink3);font-weight:800}\n.advtab.bad b{background:var(--red);border-color:var(--red);color:var(--bg)}\n.advtab small{font-weight:400;letter-spacing:0;text-transform:none;color:var(--teal);font-size:10.5px;white-space:nowrap}\n.advtog{flex:0 0 auto;width:34px;background:var(--bg);border:0;color:var(--ink);cursor:pointer}\n.advtog em{font-style:normal}\n.fl-grp{display:flex;gap:6px;align-items:center;margin:10px 0 2px;font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:var(--ink2)}\n.fl-grp b{color:var(--ink)}\n.fl-row{padding:6px 0 6px 8px;border-left:3px solid var(--ink3);border-bottom:1px solid var(--line);margin-top:3px}\n.fl-row.free{border-left-color:var(--green)}\n.fl-row.bld{border-left-color:var(--teal)}\n.fl-top{display:flex;align-items:center;gap:8px;font-size:12.5px;flex-wrap:wrap}\n.fl-top b{display:flex;align-items:center;font-size:12.5px}\n.fl-to{color:var(--ink2);font-size:11.5px}\n.fl-st{margin-left:auto;font-family:var(--mono);font-size:10.5px;color:var(--ink2);white-space:nowrap}\n.fl-sub{font-family:var(--mono);font-size:10.5px;margin-top:2px;line-height:1.4}\n.pbar{height:7px;margin:5px 0 2px;background:var(--panel3);border:1px solid var(--line2)}\n.pbar>i{display:block;height:100%;background:var(--teal)}\n.lg-box{margin:2px 0 8px}\n.lg-hd{display:flex;justify-content:space-between;font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:var(--ink2)}\n.lg-hd b{color:var(--ink)}\n.lg-row{display:flex;align-items:center;gap:6px;margin-top:4px}\n.gtrack{flex:1 1 auto;display:flex;height:32px;border:1px solid var(--line2);cursor:pointer;touch-action:none;user-select:none;-webkit-user-select:none}\n.gseg{flex:1 1 0;display:flex;align-items:center;justify-content:center;font-style:normal;border-right:1px solid var(--line)}\n.gseg:last-child{border-right:0}\n.gseg.fill{background:rgba(242,241,236,.12)}\n.gseg.on{background:var(--ink);color:var(--bg)}\n.gseg.old u{opacity:.55}\n.gseg u{text-decoration:none;font-family:var(--mono);font-size:11px;pointer-events:none}\n.lg-row .btn{width:auto;flex:0 0 auto;padding:0 12px;min-height:32px;margin:0}\n' + '#nofree{position:fixed;',
      '.advtabs{')
# v4.18 the pile bar: the hold is a white frame, not red (red is danger); the verdict carries both rates
patch('.pile-take{position:absolute;left:0;top:0;bottom:0;background:var(--red);opacity:.85}',
      '.pile-take{position:absolute;left:0;top:-2px;bottom:-2px;background:transparent;border:2px solid var(--ink);box-sizing:border-box}\n.bs-rates{font-family:var(--mono);font-size:11px;margin-top:3px}\n'.rstrip('\n'),
      'border:2px solid var(--ink);box-sizing:border-box}')
# texts
m=re.search(r'(<script type="application/json" id="lb-texts" data-url="[^"]*">)(.*?)(</script>)',s,re.S)
rows=json.loads(m.group(2)); byid={r[0]+'.'+r[1]:r for r in rows}
ph=lambda t:sorted(re.findall(r'\{\w+\}',t))
def tsv(p): return [l.rstrip('\n').split('\t')[:4] for l in open(p,encoding='utf-8',newline='') if l.strip()] if os.path.exists(p) else []
added=skipped=changed=0
for r in tsv('new-texts.tsv'):
    assert len(r)==4,r; assert ph(r[2])==ph(r[3]),'placeholders differ: '+r[1]
    k=r[0]+'.'+r[1]
    if k in byid:
        if byid[k][2:4]==r[2:4]: skipped+=1; continue
        raise SystemExit('already in build with different text (put it in changed-texts.tsv): '+k)
    rows.append(r); byid[k]=r; added+=1
for c in tsv('changed-texts.tsv'):
    assert ph(c[2])==ph(c[3]),'placeholders differ: '+c[1]
    k=c[0]+'.'+c[1]; assert k in byid,'no such row to change: '+k
    if byid[k][2:4]!=c[2:4]: byid[k][2]=c[2]; byid[k][3]=c[3]; changed+=1
js=json.dumps(rows,ensure_ascii=False).replace('</','<\\/')
s=s[:m.start()]+m.group(1)+js+m.group(3)+s[m.end():]
wr('page.html',s); wr('long-night.html',s)
# v4.11: the host stores what we publish — a body fragment (no <html>/<body>), ending with the lb-tools block.
# A new chat's live.html is that fragment, so accept both shapes.
b=(s.index('<body>')+len('<body>')) if '<body>' in s else 0; e=s.rindex('</body></html>') if '</body></html>' in s else len(s)
wr('artifact.html',s[b:e])
import sys; sys.stdout.reconfigure(encoding='utf-8')
print('rows',len(rows),'· added',added,'· already baked',skipped,'· changed',changed)
