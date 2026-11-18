# -*- coding: utf-8 -*-
import textwrap
from PIL import Image, ImageDraw, ImageFont
F=lambda s,b=False: ImageFont.truetype('C:/Windows/Fonts/'+('segoeuib.ttf' if b else 'segoeui.ttf'),s)
im=Image.open('5-coc-pc.png').convert('RGB'); W,H=im.size; band=200
out=Image.new('RGB',(W,H+band),(255,210,26)); out.paste(im,(0,0)); d=ImageDraw.Draw(out)
t='5 · ПО МОТИВАМ CLASH OF CLANS'; d.text((24,H+12),t,font=F(28,True),fill=(0,0,0)); d.text((24+d.textlength(t,font=F(28,True))+18,H+20),'приёмы по памяти, вид — наш: тонкие линии, гексы',font=F(20),fill=(60,50,0))
L=['Красные кружки с числом на кнопках — вместо ярлыков слева: WORLDS 4 · FLEET 2 · ARK ! · меню 5.',
   'Гекс-пузырь над миром, который просит нажатия: красный — люди отрезаны (число — сколько), белый — нет судов на линии.',
   'Полоска-таймер над тем, что идёт: RING VII · 43 Y, тает.   Задания смены — как задания сезона: что, награда значком, TAKE.',
   'Потери ждут в кнопке LOSSES с красным кружком (как журнал нападений).   Своё действие — одна строка сверху, гаснет.']
y=H+60
for line in L: d.text((24,y),line,font=F(21),fill=(0,0,0)); y+=32
out.save('../5-coc.png'); print('ok')
