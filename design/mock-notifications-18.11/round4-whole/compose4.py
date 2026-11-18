# -*- coding: utf-8 -*-
import textwrap
from PIL import Image, ImageDraw, ImageFont
F=lambda s,b=False: ImageFont.truetype('C:/Windows/Fonts/'+('segoeuib.ttf' if b else 'segoeui.ttf'),s)
V=[('1-onemenu','1 · ОДНО МЕНЮ','Civ VI: одна кнопка ведёт к нужному решению (по памяти)',
    'Всё живёт в «NEEDS A DECISION», в его же виде: задания смены, кольцо, потери — новые группы сверху. Кнопка краснеет, рядом на 3 с — новое в двух словах. Окна смены нет.',
    'Тост остаётся только на своё действие. Ярлыки слева уходят.'),
   ('2-helmcard','2 · КАРТОЧКА ПУЛЬТА','Stellaris: список справа (по памяти)',
    'Карточка цели становится единым пультом: цель → задания смены → «NOW», три строки самого важного. Меню остаётся полным списком.',
    'Тостов нет. Ярлыков слева нет. Потеря гаснет в строке, когда её увидели.'),
   ('3-mapspeaks','3 · КАРТА ГОВОРИТ','Frostpunk, Anno: значок над самим зданием (по памяти)',
    'Беда — значок меню прямо на мире; гаснущее кольцо — красной линией; погибшее судно — «✕ 52» там, где оно было. Задания смены — в карточке.',
    'Слов на карте нет, подробности — при наведении. Меню — как сейчас.'),
   ('4-helmline','4 · СТРОКА ПУЛЬТА','журнал корабля; строки сообщений RimWorld (по памяти)',
    'Одна строка под ресурсами, языком журнала. Красное держится слева, пока беда есть; новое приходит справа и уходит. Это вместо тостов.',
    'Задания смены — по клику на «SHIFT 36». Меню — как сейчас.')]
for k,t,pre,a,b in V:
  im=Image.open(k+'-pc.png').convert('RGB'); W,H=im.size; band=170
  out=Image.new('RGB',(W,H+band),(255,210,26)); out.paste(im,(0,0)); d=ImageDraw.Draw(out)
  d.text((24,H+12),t,font=F(28,True),fill=(0,0,0)); d.text((24+d.textlength(t,font=F(28,True))+18,H+20),pre,font=F(20),fill=(60,50,0))
  y=H+58
  for line in textwrap.wrap(a,120)+textwrap.wrap(b,120): d.text((24,y),line,font=F(21),fill=(0,0,0)); y+=28
  out.save('../'+k+'.png')
ph=[Image.open(v[0]+'-phone.png').convert('RGB') for v in V]; w,h=ph[0].size
out=Image.new('RGB',(w*4+50,h+60),(20,20,20)); d=ImageDraw.Draw(out)
for i,(v,im) in enumerate(zip(V,ph)):
  out.paste(im,(10+i*(w+10),50)); d.text((14+i*(w+10),10),v[1],font=F(22,True),fill=(255,210,26))
out.save('../4-phone-all.png'); print('ok')
