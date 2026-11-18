# -*- coding: utf-8 -*-
import sys, textwrap
from PIL import Image, ImageDraw, ImageFont
F=lambda s,b=False: ImageFont.truetype('C:/Windows/Fonts/'+('segoeuib.ttf' if b else 'segoeui.ttf'),s)
CAP={
 'A-onthing':('А · НА САМОЙ ВЕЩИ — Mini Metro, Into the Breach, FTL','Слов на экране нет. Гаснущее кольцо — красная линия, она укорачивается, пока идут его годы; у каждого мира на нём такие же часики. Смена — ярлык «SHIFT 36» под годом на пару секунд. Подробности — при наведении.'),
 'B-tiles':('Б · ЗНАЧКИ-ТРЕВОГИ — Factorio, RimWorld (тревоги)','Столбик значков справа: значок и одно число, цвет — насколько плохо. Значок висит ровно столько, сколько есть беда, потом исчезает. Наведение — одна строка; клик — карта прыгает туда. Заменяет ярлыки слева и «NEEDS A DECISION».'),
 'C-letters':('В · ПИСЬМА — RimWorld (письма), Stellaris','Что случилось — копится справа конвертами из трёх слов, цвет по тяжести; игра не встаёт. Клик — полный текст с Александрой; правый клик — убрать. Отчёт смены — одно из писем.'),
 'D-onethreat':('Г · ОДНА УГРОЗА, ОДИН ГОЛОС — Frostpunk (отсчёт до бури), реплики по рации','Часы получает только самая страшная угроза — рядом с Ночью, в том же виде. Смену Александра говорит одной строкой субтитра, строка гаснет. Ни окон, ни тостов; остальное — в журнале.'),
}
for k,(t,s) in CAP.items():
  im=Image.open(k+'-pc.png').convert('RGB'); W,H=im.size; band=150
  out=Image.new('RGB',(W,H+band),(255,210,26)); out.paste(im,(0,0)); d=ImageDraw.Draw(out)
  d.text((24,H+16),t,font=F(26,True),fill=(0,0,0))
  y=H+58
  for line in textwrap.wrap(s,118): d.text((24,y),line,font=F(20),fill=(0,0,0)); y+=27
  out.save('../'+k+'.png')
ph=[Image.open(k+'-phone.png').convert('RGB') for k in CAP]; w,h=ph[0].size
sc=1; w2,h2=int(w*sc),int(h*sc)
out=Image.new('RGB',(w2*4+50,h2+60),(20,20,20)); d=ImageDraw.Draw(out)
for i,(k,im) in enumerate(zip(CAP,ph)):
  out.paste(im.resize((w2,h2)),(10+i*(w2+10),50)); d.text((14+i*(w2+10),10),CAP[k][0].split(' — ')[0],font=F(22,True),fill=(255,210,26))
out.save('../phone-all.png'); print('ok',out.size)
