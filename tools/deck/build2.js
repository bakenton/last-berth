// LAST BERTH — 企画書 v2 (JA), 23.09.2026, prototype v3.9.1. Brutalist: black, bone, one red.
const pptxgen=require('pptxgenjs');
const fs=require('fs');
const P=new pptxgen(); P.layout='LAYOUT_WIDE'; // 13.33 x 7.5
const BG='000000', INK='F2F1EC', INK2='9C9B95', INK3='5E5D58', RED='FF2A1A', RED2='FFB1A8', GREEN='3DDC84', ORANGE='FF8A1F', YELLOW='FFD23F', SILVER='C9CFD6', PANEL='0E0E0E', LINE='2A2A28';
const JP='Noto Sans JP', MONO='Courier New';
const CRED='企画：ドロシェンコ ニキータ  ｜  東京クールジャパン・アカデミー  ゲームプログラマー専攻  ｜  2026';
const img=f=>fs.readFileSync('/home/claude/ln/deck/'+f).toString('base64');
const IMG=f=>'image/png;base64,'+img(f);
let n=0;
function base(title,tag){
  const s=P.addSlide(); s.background={color:BG}; n++;
  if(tag) s.addText(tag,{x:0.6,y:0.38,w:8,h:0.3,fontFace:/[^\x00-\x7F]/.test(tag)?JP:MONO,fontSize:10,color:INK2,charSpacing:3,isTextBox:true,margin:0});
  if(title) s.addText(title,{x:0.6,y:0.65,w:12.1,h:0.8,fontFace:JP,fontSize:27,bold:true,color:INK,isTextBox:true,margin:0,valign:'top'});
  s.addText('LAST BERTH  ·  企画書 v2  ·  '+String(n).padStart(2,'0'),{x:0.6,y:7.0,w:4,h:0.3,fontFace:JP,fontSize:9,color:INK3,charSpacing:2,isTextBox:true,margin:0});
  s.addText(CRED,{x:4.7,y:7.0,w:8.03,h:0.3,fontFace:JP,fontSize:8.5,color:INK3,align:'right',isTextBox:true,margin:0});
  return s;
}
const T=(s,t,o)=>{ o=Object.assign({fontFace:JP,fontSize:14,color:INK,isTextBox:true,margin:0,valign:'top'},o); if(o.fontFace===MONO&&/[^\x00-\x7F×·²ᵏⁿ→]/.test(String(t))) o.fontFace=JP; return s.addText(t,o) };
const box=(s,x,y,w,h,fill)=>s.addShape(P.ShapeType.rect,{x,y,w,h,fill:{color:fill||PANEL},line:{color:LINE,width:0.75}});
const rule=(s,x,y,w,c)=>s.addShape(P.ShapeType.line,{x,y,w,h:0,line:{color:c||LINE,width:0.75}});
const stat=(s,x,y,w,num,label,col)=>{ T(s,num,{x,y,w,h:0.9,fontSize:44,bold:true,color:col||INK}); T(s,label,{x,y:y+0.95,w,h:0.5,fontSize:11,color:INK2}); };


// ---------- 01 表紙 ----------
{
  const s=P.addSlide(); s.background={color:BG}; n++;
  s.addImage({data:IMG('desk.png'),x:5.3,y:0.8,w:8.0,h:5.0,transparency:62});
  s.addShape(P.ShapeType.rect,{x:0.6,y:0.6,w:0.22,h:0.22,fill:{color:RED},line:{color:RED}});
  T(s,'LAST BERTH',{x:0.95,y:0.5,w:8,h:0.5,fontFace:MONO,fontSize:16,bold:true,color:INK,charSpacing:8});
  T(s,'仮題',{x:3.9,y:0.57,w:2,h:0.4,fontSize:11,color:INK2});
  T(s,'生き延びろ。\nそして、すべてを畳んで去れ。',{x:0.6,y:2.0,w:11,h:2.4,fontSize:48,bold:true,color:INK,lineSpacingMultiple:1.1});
  T(s,'拡張型ストラテジーの逆再生。勝利条件は、期限までに自分の帝国を解体し、人を方舟に乗せること。',{x:0.6,y:4.55,w:9.5,h:0.8,fontSize:16,color:INK2});
  const meta=[['ジャンル','戦略 × 放置 · コロニー経営'],['想定ハード','PC (Steam) · ブラウザ試作あり'],['プレイ','1人 · 序章10分 + 1ラン約60分'],['状態','プレイアブル試作 v3.9.1（序章〜結末）']];
  meta.forEach((m,i)=>{ const x=0.6+i*3.15; T(s,m[0],{x,y:5.75,w:3,h:0.3,fontFace:MONO,fontSize:9,color:INK2,charSpacing:2}); T(s,m[1],{x,y:6.05,w:3,h:0.6,fontSize:12,color:INK}); });
  rule(s,0.6,6.72,12.1);
  T(s,CRED,{x:0.6,y:6.85,w:12.1,h:0.35,fontSize:11,color:INK2});
}

// ---------- 02 コンセプト ----------
{
  const s=base('都市建設ゲームは、安定した瞬間に終わる。本作は終盤で「畳む」ことを強いる。','コンセプト');
  T(s,'既存ジャンルの問題',{x:0.6,y:1.8,w:5.6,h:0.35,fontFace:MONO,fontSize:10,color:INK2,charSpacing:2});
  T(s,'コロニー経営・都市建設の目標は安定。到達した瞬間、設計者は「揺さぶる」か「飽きさせる」かの二択になる（Against the Storm 開発者の指摘）。多くの作品は無限拡張か、ランの打ち切りで逃げる。',{x:0.6,y:2.2,w:5.6,h:1.8,fontSize:13,color:INK});
  T(s,'本作の答え',{x:0.6,y:4.1,w:5.6,h:0.35,fontFace:MONO,fontSize:10,color:INK2,charSpacing:2});
  T(s,'太陽に寿命がある。日付が判明した瞬間から、伸ばした帝国は資産ではなく負債になる。航路を解き、入植地を撤収し、遠くの船を呼び戻す。最終幕は拡張の逆再生であり、スコアは「連れて帰れた人数」のみ。',{x:0.6,y:4.5,w:5.6,h:2.2,fontSize:13,color:INK});
  box(s,6.9,1.8,5.8,4.9);
  stat(s,7.3,2.1,2.5,'2200','年。日付判明から出航までの猶予',INK);
  stat(s,10.0,2.1,2.5,'100','席。方舟1ブロックの定員',INK);
  stat(s,7.3,3.9,2.5,'0','入植者と、遠くにいる船の乗員が乗れる数',RED);
  stat(s,10.0,3.9,2.5,'1','評価軸。乗った人数だけ',GREEN);
  T(s,'「拡張のゲーム」を「撤退のゲーム」に反転させる、たった一つの日付。',{x:7.3,y:5.9,w:5.1,h:0.6,fontSize:12,color:INK2,italic:true});
}

// ---------- 03 世界観 ----------
{
  const s=base('プレイヤーは人間ではない。死にゆく地球の「通信卓」という機関だ。','世界観 · ナラティブ');
  const rows=[['誰にも会わない','地図の印はすべて報告であり、報告は常に古い。惑星も船も、数字と一行の記録として存在する。'],['人は駒、顔は入れ替わる','残るのは役職と船体だけ。航海は一人の任期より長く、帰ってくる船長は出発した船長ではない。'],['8つの瞬間だけ、卓に顔が出る','「人事ファイル」：手続き生成の肖像、役職、姓、職員番号、そして一言。日付の判明、着陸、撤収、最後の航海、桟橋。'],['記録が物語','80年ごとに新しい班が着任し一行を書く。消えた世界には墓碑銘。会話もカットシーンもない。']];
  rows.forEach((r,i)=>{ const y=1.85+i*1.2; T(s,r[0],{x:0.6,y,w:2.4,h:1.1,fontSize:13.5,bold:true,color:INK}); T(s,r[1],{x:3.1,y,w:3.8,h:1.1,fontSize:11.5,color:INK2}); rule(s,0.6,y+1.1,6.3); });
  s.addImage({data:IMG('pf-chief.png'),x:7.2,y:1.85,w:5.5,h:1.9});
  T(s,'▲ 人事ファイル（試作）。日付を壁に書いたシフト長。次の班には別の顔が座る',{x:7.2,y:3.8,w:5.5,h:0.4,fontSize:10,color:INK2});
  s.addImage({data:IMG('faces.png'),x:7.2,y:4.45,w:5.5,h:0.98});
  T(s,'▲ 肖像は描いていない。シードから組み立て、黒と骨白の2色にディザリング。毎回違う顔になる',{x:7.2,y:5.5,w:5.5,h:0.6,fontSize:10,color:INK2});
  T(s,'作者の判断：「人には価値があるが、駒としての価値だ」。キャラクターに愛着を持たせるのではなく、交代し続ける人員の中に一瞬だけ顔を見せる。',{x:7.2,y:6.15,w:5.5,h:0.75,fontSize:10.5,color:INK,italic:true});
}

// ---------- 04 コアループ ----------
{
  const s=base('コアループ：入植 → 航路 → 資源 → 次の世代 → もっと遠くへ。地球は毎年燃やし、毎年増える。','プレイサイクル');
  const steps=[['01','入植','空いている船を選び、世界をクリック、人を降ろす'],['02','航路を引く','船は世界⇄地球を自動で往復。行きは人、帰りは産物'],['03','地球が食う','金属と食糧を毎年消費。消費は暦とともに超線形に増える'],['04','探査 · 推進機関','部品で次のセクターを開き、次世代の船を解禁'],['05','もっと遠くへ','遠いほど豊かで、危険で、高い。最後のセクターは存在しない']];
  steps.forEach((st,i)=>{ const x=0.6+i*2.5; box(s,x,1.85,2.3,2.1); T(s,st[0],{x:x+0.2,y:2.0,w:1,h:0.4,fontFace:MONO,fontSize:11,color:RED,bold:true}); T(s,st[1],{x:x+0.2,y:2.4,w:2,h:0.45,fontSize:15,bold:true,color:INK}); T(s,st[2],{x:x+0.2,y:2.9,w:1.95,h:1.0,fontSize:10.5,color:INK2}); if(i<4) T(s,'→',{x:x+2.28,y:2.6,w:0.3,h:0.4,fontSize:14,color:INK3}); });
  T(s,'ループの裏側：鉱脈が枯れる → 世界を撤収 → 地図に墓標が残る → 次の世界へ',{x:0.6,y:4.05,w:12,h:0.4,fontSize:11,color:INK2});
  s.addImage({data:IMG('desk.png'),x:0.6,y:4.55,w:3.4,h:2.13});
  T(s,'一度も手で荷を積まない',{x:4.3,y:4.6,w:4.0,h:0.4,fontSize:14,bold:true,color:INK});
  T(s,'判断の単位は「どの世界に、どの船を、何隻置くか」だけ。航路は勝手に走り、追いつかなければ2隻目を置く。放置系の快感（勝手に増える）と、経営系の判断（どこに投資するか）を同じ画面に置く。',{x:4.3,y:5.0,w:4.0,h:1.9,fontSize:11,color:INK2});
  T(s,'卓が代わりに計算する',{x:8.6,y:4.6,w:4.1,h:0.4,fontSize:14,bold:true,color:INK});
  T(s,'左上の「要判断」パネルが、悪い順に何が決断を待っているかを示す。資源の横には過去60年の実測の増減（▲▼）。プレイヤーは算数ではなく、優先順位を決める。',{x:8.6,y:5.0,w:4.1,h:1.9,fontSize:11,color:INK2});
}

// ---------- 05 経済 ----------
{
  const s=base('4つの資源と、第5の通貨「人」。すべてに出口があり、余りは発生しない。','経済設計');
  const hdr=['資源','産出','用途 · 出口','設計上の役割'];
  const rows=[
    ['金属',SILVER,'鉱山世界（有限の鉱脈）','地球が毎年燃やす · 船 · 探査 · 方舟','常にボトルネック。工業航路も地球の25年分には手を付けない（v3.8.1）'],
    ['食糧',GREEN,'農業世界（有限）','地球が毎年燃やす · 工業世界の原料 · 方舟','工業世界へはレシピ比（金属1：食糧0.4）でしか運ばない（v3.9.1）'],
    ['燃料',ORANGE,'油井世界（有限）','出航ごとに消費 · 方舟','距離の税。現状は余りやすい（→リスク）'],
    ['部品',INK,'工業世界：運び込んだ金属+食糧から製造','船 · 探査 · 推進機関 · 方舟','唯一の「加工」資源。4つの用途が奪い合う'],
    ['人',YELLOW,'地球が年1.5人 · 食わない','船の乗員（除籍まで拘束） · 探査隊（戻らない） · 入植 · 方舟の乗客','家に残せば地球の産出↑（逓減）。家か、闇の中の船か'],
  ];
  const X=[0.6,2.0,5.0,8.6], W=[1.3,2.9,3.5,4.1];
  hdr.forEach((h,i)=>T(s,h,{x:X[i],y:1.8,w:W[i],h:0.3,fontFace:MONO,fontSize:9,color:INK2,charSpacing:2}));
  rule(s,0.6,2.15,12.1,INK2);
  rows.forEach((r,i)=>{ const y=2.3+i*0.82; T(s,r[0],{x:X[0],y,w:W[0],h:0.7,fontSize:15,bold:true,color:r[1]}); T(s,r[2],{x:X[1],y,w:W[1],h:0.7,fontSize:11,color:INK}); T(s,r[3],{x:X[2],y,w:W[2],h:0.7,fontSize:11,color:INK}); T(s,r[4],{x:X[3],y,w:W[3],h:0.7,fontSize:10.5,color:INK2}); rule(s,0.6,y+0.74,12.1); });
  box(s,0.6,6.35,12.1,0.6);
  T(s,'原則：地球の消費は暦だけで増える（速度は超線形）。停滞したチャートは、どれだけ豊かでも必ず飢える。260年の飢饉で敗北。',{x:0.8,y:6.45,w:11.7,h:0.45,fontSize:12,color:INK});
}

// ---------- 06 ロングナイト ----------
{
  const s=base('ロングナイト：第3セクターの探査が、太陽の寿命を持ち帰る。','終盤 · 方舟');
  const steps=[['①  日付が判明','3つ目のセクターを開いた瞬間（遅くとも1000年目）、太陽が消える年が確定。猶予は2200年。ゲームは一度止まり、シフト長が一度だけ告げる。'],['②  方舟を積む','100席ブロック。金属・部品・食糧・燃料をすべて要求し、価格は逓増。後半に余る資源は、ここで全部吸われる。'],['③  家にいる者だけが乗る','入植者も、遠くの船の乗員も、航行中の人間も乗れない。地球に停泊した船の乗員は乗れる。だから最終幕は撤収：航路を解き、世界から人を運び出し、船を呼び戻す。']];
  steps.forEach((st,i)=>{ const y=1.85+i*1.55; T(s,st[0],{x:0.6,y,w:6.2,h:0.45,fontSize:16,bold:true,color:i===2?RED:INK}); T(s,st[1],{x:0.6,y:y+0.5,w:6.2,h:1.0,fontSize:12,color:INK2}); });
  s.addImage({data:IMG('night.png'),x:7.2,y:1.85,w:5.5,h:3.06});
  T(s,'▲ 告知画面（試作）。400 / 100 / 25年前に卓が再び止まり、最後の数十年には「間に合わない船長」の一言が届く。',{x:7.2,y:5.0,w:5.5,h:0.55,fontSize:10,color:INK2});
  box(s,7.2,5.65,5.5,1.2);
  T(s,'なぜ「家にいる者だけ」か',{x:7.4,y:5.75,w:5.1,h:0.35,fontSize:12,bold:true,color:INK});
  T(s,'この一条件が、拡張の全資産を負債に変える。席を買うだけなら経営の延長。人を帰す作業が、自分の帝国を手で解体させる。',{x:7.4,y:6.1,w:5.1,h:0.75,fontSize:10.5,color:INK2});
}

// ---------- 07 エンディング ----------
{
  const s=base('スコアは「乗った人数」だけ。ボートか、国民か。','結末');
  const tiers=[['0','夜が来た','方舟なし、または乗る者なし。掘り続ける帝国の上で太陽が消えた。',RED],['〜300','ボート。国民ではない','残りは働いていた世界と共に残った。',RED2],['〜1200','どこかでやり直せる数','建てたものの大半と、人の大半は残った。',INK],['1200〜','帝国を方舟に載せた','間に合った。卓はそのためにあった。',GREEN]];
  tiers.forEach((t,i)=>{ const y=1.85+i*0.95; T(s,t[0],{x:0.6,y,w:1.6,h:0.8,fontFace:MONO,fontSize:22,bold:true,color:t[3]}); T(s,t[1],{x:2.3,y,w:3.9,h:0.4,fontSize:14,bold:true,color:INK}); T(s,t[2],{x:2.3,y:y+0.42,w:3.9,h:0.5,fontSize:11,color:INK2}); rule(s,0.6,y+0.88,5.6); });
  T(s,'実際の通しプレイ',{x:0.6,y:5.7,w:5.6,h:0.3,fontFace:MONO,fontSize:9,color:INK2,charSpacing:2});
  const runs=[['v3.5 · 作者','1000 / 1000','席が足りず952人が桟橋に残る',INK],['v3.6 · 他者','0','金属が1100年ゼロ。方舟は1ブロックも買われず',RED],['v3.8 · 作者','900 / 900','最後の壁は金属、次に食糧',GREEN]];
  runs.forEach((r,i)=>{ const y=6.0+i*0.32; T(s,r[0],{x:0.6,y,w:1.5,h:0.3,fontSize:10,color:INK2}); T(s,r[1],{x:2.1,y,w:1.3,h:0.3,fontFace:MONO,fontSize:10,bold:true,color:r[3]}); T(s,r[2],{x:3.4,y,w:2.9,h:0.3,fontSize:10,color:INK2}); });
  s.addImage({data:IMG('end.png'),x:7.0,y:1.85,w:5.2,h:5.0,sizing:{type:'contain',w:5.2,h:5.0}});
}

// ---------- 08 序章 ----------
{
  const s=base('初見の他者テストで「今は遊べない」と言われた。だから序章を作った。','オンボーディング · 序章');
  box(s,0.6,1.8,6.2,1.55,'150A08');
  T(s,'「アイデアは好き。でも今は遊べない。最初の長いガイドは覚えられないし、いきなり全部開いた世界に放り出される。航路と入植の違いが分からない。入植者の人数が何に効くのかも分からない」',{x:0.8,y:1.92,w:5.8,h:1.1,fontSize:11,color:INK,italic:true});
  T(s,'── 初見テスター（v3.6）',{x:0.8,y:3.02,w:5.8,h:0.3,fontSize:9.5,color:INK2});
  T(s,'診断：一度に見せすぎ。そして、押す前に結果が見えない。',{x:0.6,y:3.5,w:6.2,h:0.4,fontSize:13,bold:true,color:INK});
  const rules=[['行動で進む','6段階。時間ではなく、プレイヤーの行動が次を開く。1つの鉱山と1隻の船から始まる'],['第0–1段はレール','押せるのは脈打つ1つだけ。最初の二手「入植」と「航路」を取り違えようがない'],['押す前に結果を見せる','「26人 → 金属1.86/年、世界の定員60」「往復30年・1回70」。序章の外でも常に表示'],['新しい数字は1つずつ','資源・造船所・探査が登場した瞬間に、その場で一言の吹き出し']];
  rules.forEach((r,i)=>{ const y=4.0+i*0.72; T(s,r[0],{x:0.6,y,w:2.0,h:0.65,fontSize:11.5,bold:true,color:INK}); T(s,r[1],{x:2.7,y,w:4.1,h:0.65,fontSize:10.5,color:INK2}); });
  s.addImage({data:IMG('pro-1.png'),x:7.2,y:1.8,w:5.5,h:3.44});
  T(s,'▲ 序章 1/6。見えるのは地球と鉱山1つ、資源は「人」だけ。対象の世界が赤く脈打ち、右に入植のプレビュー',{x:7.2,y:5.3,w:5.5,h:0.55,fontSize:10,color:INK2});
  const st=['鉱山','航路 +金属','農業 +食糧','油井 +燃料 +造船','工業 +部品','全地図 → 卓を継ぐ'];
  st.forEach((t,i)=>{ const x=7.2+i*0.92; box(s,x,5.95,0.86,0.75,i<2?'150A08':PANEL); T(s,String(i+1),{x:x+0.08,y:6.0,w:0.7,h:0.25,fontFace:MONO,fontSize:9,bold:true,color:i<2?RED:INK2}); T(s,t,{x:x+0.08,y:6.24,w:0.76,h:0.44,fontSize:7.5,color:INK}); });
  T(s,'参考：Ixion のプロローグ · Against the Storm（設計図1枚から順に解禁）· Slipways（行動前のプレビュー）',{x:0.6,y:6.6,w:6.2,h:0.3,fontSize:8.5,color:INK3});
}

// ---------- 09 他者のログから ----------
{
  const s=base('他者のプレイログを読んで、ルールの穴を塞ぐ。','プレイテスト · ログ分析');
  T(s,'他者のラン（v3.6, シード57539013）：3200年、方舟0席、0人',{x:0.6,y:1.8,w:6.3,h:0.4,fontSize:13,bold:true,color:INK});
  const ex=[['観察','鉱脈は1450年までに枯れ、次の鉱山は2826年。金属0が約1100年続く。一方、工業航路は地球から金属を運び出し続け、部品が3802個余った'],['原因','「金属が残りN年」の警告は108年目に×で消され、二度と出なかった。消す操作が「永久」だった'],['変更','×は150年で失効、赤になれば即復活。工業航路は地球の25年分の消費に手を付けない。解除できない船（予約中の航路が残る）を修正']];
  ex.forEach((e,i)=>{ const y=2.3+i*1.05; T(s,e[0],{x:0.6,y,w:1.0,h:0.4,fontFace:MONO,fontSize:10,color:RED,bold:true}); T(s,e[1],{x:1.7,y,w:5.2,h:1.0,fontSize:10.5,color:INK2}); });
  T(s,'同じテストが直した見た目',{x:7.2,y:1.8,w:5.5,h:0.4,fontSize:13,bold:true,color:INK});
  s.addImage({data:IMG('res-strip.png'),x:7.2,y:2.3,w:5.5,h:0.96});
  const vis=[['世界は資源の色','銀＝金属、緑＝食糧、橙＝燃料。小さい文字を読まなくても地図が読める'],['数字には必ずアイコン','倉庫、搬出記録、生産量。すべて同じ色と形で'],['増減の矢印','▲▼は過去60年の実測。配達込みの本当の増減'],['「速さが同じ」は表示バグ','航路の所要年数が選んだ船でなく先頭の船で計算されていた']];
  vis.forEach((v,i)=>{ const y=3.4+i*0.56; T(s,v[0],{x:7.2,y,w:2.2,h:0.6,fontSize:11,bold:true,color:INK}); T(s,v[1],{x:9.45,y,w:3.25,h:0.6,fontSize:10,color:INK2}); });
  box(s,0.6,5.75,12.1,1.15);
  T(s,'原則',{x:0.8,y:5.82,w:2,h:0.3,fontFace:MONO,fontSize:9,color:INK2,charSpacing:2});
  T(s,'プレイヤーの失敗は、まずルールの失敗として読む。「警告を消した」「工場に金属を送った」はプレイヤーの判断ミスではなく、ゲームがそう誘導した結果。ゲームは全操作と50年ごとの状態をログに書き出し、テスターはボタン一つでそれを渡せる。',{x:0.8,y:6.1,w:11.7,h:0.75,fontSize:11.5,color:INK});
}

// ---------- 10 差別化 ----------
{
  const s=base('近い作品はある。同じ終わり方をする作品はない。','差別化 · 競合');
  const hdr=['作品','売り文句','本作との関係'];
  const rows=[
    ['Frostpunk','「社会サバイバル」。負けられる都市建設。500万本。','生存の先の「撤退」を描く。負ける条件は共有、勝つ条件が逆'],
    ['Against the Storm','Banished × Slay the Spire。定住は一時的。200万本。','安定後の退屈をラン制で解決。本作は一つの長い運営を、終盤で自ら解体させる'],
    ['Slipways','1時間で遊べる宇宙帝国パズル。戦闘なし。個人開発。','最も近い。本作は「期限」と「喪失」を足し、放置性でセッションを伸ばす'],
    ['Ixion','地球滅亡、方舟の宇宙ステーション経営。Metacritic 71。','同じ前提で失敗した例。「魅力的な前提を、平坦なテンポが殺した」（PC Gamer）。本作最大のリスクと同じ'],
    ['Rusty\'s Retirement','画面の端で走る放置農場。55万本。個人開発。','放置系は形が売る。本作の放置性は「航路が勝手に走る」＋HOLD停止'],
  ];
  const X=[0.6,3.1,7.6], W=[2.4,4.3,5.1];
  hdr.forEach((h,i)=>T(s,h,{x:X[i],y:1.8,w:W[i],h:0.3,fontFace:MONO,fontSize:9,color:INK2,charSpacing:2}));
  rule(s,0.6,2.15,12.1,INK2);
  rows.forEach((r,i)=>{ const y=2.28+i*0.82; T(s,r[0],{x:X[0],y,w:W[0],h:0.7,fontSize:13,bold:true,color:r[0]==='Ixion'?RED2:INK}); T(s,r[1],{x:X[1],y,w:W[1],h:0.7,fontSize:10.5,color:INK}); T(s,r[2],{x:X[2],y,w:W[2],h:0.7,fontSize:10.5,color:INK2}); rule(s,0.6,y+0.74,12.1); });
  box(s,0.6,6.35,12.1,0.6,'150A08');
  T(s,'ポジション：Slipwaysの手触り × Frostpunkの敗北条件 × 誰もやっていない勝利条件（帝国の自主解体）。',{x:0.8,y:6.45,w:11.7,h:0.45,fontSize:12,bold:true,color:INK});
}

// ---------- 11 ターゲット ----------
{
  const s=base('誰に、どこで、いくらで。','ターゲット · プラットフォーム');
  const cols=[['誰が遊ぶか','Frostpunk / Slipways / RimWorld を遊び切った層。システムを読んで楽しむ人。30〜40代中心、PCゲーマー。\n\n「一度手を離しても進む」経営を求める層（放置系耐性）と重なる。'],['セッション','序章 約10分 + 1ラン 約60分。HOLDで自動停止するため、片手間にも一気にも遊べる。\n\n現状のリプレイ軸はシードのみ。ここは弱い（→リスク）。'],['プラットフォーム · 価格','PC / Steam。試作はブラウザで動く単一HTML（依存なし、インストール不要）。\n\n想定価格 ¥1,500 前後：Rusty\'s Retirement（$6.99）と Slipways（$19.99）の間。']];
  cols.forEach((c,i)=>{ const x=0.6+i*4.1; box(s,x,1.85,3.9,4.0); T(s,c[0],{x:x+0.25,y:2.0,w:3.4,h:0.45,fontSize:15,bold:true,color:INK}); T(s,c[1],{x:x+0.25,y:2.55,w:3.4,h:3.2,fontSize:11.5,color:INK2}); });
  T(s,'一言で売るなら',{x:0.6,y:6.1,w:3,h:0.3,fontFace:MONO,fontSize:9,color:INK2,charSpacing:2});
  T(s,'「帝国を広げるゲームは山ほどある。畳むゲームはこれだけだ。」',{x:0.6,y:6.4,w:12,h:0.5,fontSize:16,bold:true,color:INK});
}

// ---------- 12 検証 ----------
{
  const s=base('バランスは目分量ではなくボットで、設計変更は実プレイのログで決める。','検証手法 · バランス');
  T(s,'4種のボットが同じ8シードを3000年走る',{x:0.6,y:1.85,w:6,h:0.4,fontSize:14,bold:true,color:INK});
  T(s,'不変条件：無策（idle）と欲張り（greedy）は負け、正しいプレイ（pro）が最も遠くへ行く。核心の数値を変えるたびに前版の核と A/B。',{x:0.6,y:2.3,w:6,h:0.9,fontSize:11.5,color:INK2});
  T(s,'ボット別スコア（v3.9.1）',{x:0.6,y:3.15,w:6,h:0.3,fontSize:10,color:INK2,align:'center'});
  s.addChart(P.ChartType.bar,[{name:'スコア',labels:['idle','greedy','expand','pro'],values:[4.0,18.4,18.4,38.4]}],{x:0.6,y:3.45,w:6,h:3.0,barDir:'col',chartColors:[INK2],showValue:true,dataLabelPosition:'outEnd',dataLabelFormatCode:'0.0',dataLabelColor:INK,dataLabelFontSize:11,catAxisLabelColor:INK,valAxisLabelColor:INK3,valGridLine:{color:LINE,size:0.5},catGridLine:{style:'none'},showLegend:false,showTitle:false,catAxisLabelFontFace:'Arial',valAxisLabelFontFace:'Arial',dataLabelFontFace:'Arial',catAxisLabelFontSize:11,valAxisLabelFontSize:9});
  T(s,'作者のラン（v3.8）が設計を変えた例',{x:7.0,y:1.85,w:5.7,h:0.4,fontSize:14,bold:true,color:INK});
  const ex=[['観察','900/900で出航。だが工業世界3つに食糧13,500が滞留し、地球は最後に251まで減った。地球に停泊した船の乗員1562人は「船上」扱いで乗れなかった。'],['診断','航路は金属と食糧を1：1で運ぶが、工場のレシピは1：0.4。停泊中の乗員を遠くの乗員と同じに数えていた。'],['変更と却下','食糧だけをレシピ比に（金属の枠は据え置き）。積載全体をレシピ比にする案は、工場が地球の金属を吸いpro 37.8→33.0に落ちたため却下。採用案で38.4。']];
  ex.forEach((e,i)=>{ const y=2.35+i*1.4; T(s,e[0],{x:7.0,y,w:1.6,h:0.4,fontFace:MONO,fontSize:10,color:RED,bold:true}); T(s,e[1],{x:8.6,y,w:4.1,h:1.35,fontSize:10.5,color:INK2}); });
  T(s,'ゲームは全操作と50年ごとの状態をログに書き出す。設計者は感想ではなく、ログを読む。',{x:7.0,y:6.55,w:5.7,h:0.4,fontSize:10,color:INK3,italic:true});
}

// ---------- 13 制作の仕組み ----------
{
  const s=base('一人で回すために、制作の仕組みを先に作った。','テクニカルデザイン · パイプライン');
  const cols=[
    ['テキストは表で持つ','Google スプレッドシート約490行（EN / RU）。コードに文章は一行もない。ビルド時にプレースホルダーの不一致を検査して弾き、空欄は旧文を維持。公開CSVから、起動中のゲームに再読込できる。'],
    ['バランスはボット','idle / greedy / expand / pro の4種 × 8シード × 3000年。数値を変えるたびに前版と A/B。不変条件が崩れたら差し戻す。'],
    ['UIは実マウスで回帰','Playwright で18本のシナリオ：序章6段、夜の告知、方舟、結末、人事ファイル、テキスト再読込。「動く」と言うのは画面の文字を確認してから。'],
    ['判断はすべて記録','Notion の判断ログ：何を、なぜ、何の代わりに、誰が決めたか。AIの提案は「評価待ち」と明記し、採否を作者が決める。'],
  ];
  cols.forEach((c,i)=>{ const x=0.6+i*3.1; box(s,x,1.85,2.9,4.2); T(s,c[0],{x:x+0.2,y:2.0,w:2.5,h:0.5,fontSize:14,bold:true,color:INK}); T(s,c[1],{x:x+0.2,y:2.6,w:2.5,h:3.4,fontSize:10.5,color:INK2}); });
  box(s,0.6,6.2,12.1,0.7,'150A08');
  T(s,'役割分担：企画とゲームデザインの判断は作者、実装と数値計算はAIと共同。作者が遊び、ログを出し、AIと分析し、案を比べて選ぶ。',{x:0.8,y:6.3,w:11.7,h:0.5,fontSize:11.5,color:INK});
}

// ---------- 14 現状とリスク ----------
{
  const s=base('できていること、できていないこと。','現状 · リスク');
  T(s,'実装済（試作 v3.9.1）',{x:0.6,y:1.85,w:5,h:0.35,fontFace:MONO,fontSize:10,color:GREEN,charSpacing:2});
  const done=['序章（6段・レール・行動前プレビュー・吹き出し）','無限に生成される星図と有限の鉱脈','自動往復の航路、要判断パネル、HOLD','4資源 + 人の経済、船級×世代の射程','ロングナイト、方舟、結末（4段階）','人事ファイル（手続き生成の肖像）と年代記','資源色・アイコン・増減表示、EN / RU','テキスト外部化、ボット、回帰テスト、ログ出力'];
  s.addText(done.map((d,i)=>({text:d,options:{bullet:{code:'25A0'},breakLine:i<done.length-1,paraSpaceAfter:5}})),{x:0.6,y:2.25,w:5.4,h:4.6,fontFace:JP,fontSize:11.5,color:INK,isTextBox:true,margin:0,valign:'top'});
  T(s,'リスク',{x:6.4,y:1.85,w:5,h:0.35,fontFace:MONO,fontSize:10,color:RED,charSpacing:2});
  const risks=[['中盤の空白','作者のランでも最初の方舟は日付判明の1667年後。他者は一度も買わず。Ixionが死んだ場所。','「二つの日付」（次頁）'],['序章は未検証','作ったが、初見の他者はまだ通していない。','次の他者テストで判定'],['絵作り','UIしかない。第一印象で売れない。','管制室の質感。UIの骨格は流用可'],['リプレイ性','シード以外の軸がない。','メタ進行、または日替わりシード']];
  risks.forEach((r,i)=>{ const y=2.25+i*1.1; T(s,r[0],{x:6.4,y,w:1.6,h:1.0,fontSize:12,bold:true,color:INK}); T(s,r[1],{x:8.0,y,w:2.4,h:1.0,fontSize:10,color:INK2}); T(s,'→ '+r[2],{x:10.5,y,w:2.2,h:1.0,fontSize:10.5,color:INK}); rule(s,6.4,y+1.02,6.3); });
}

// ---------- 15 ロードマップ ----------
{
  const s=base('次の一手は「二つの日付」。中盤に、追いかける数字を置く。','ロードマップ');
  box(s,0.6,1.85,12.1,1.9,'150A08');
  T(s,'なぜすぐに飛び立たないのか？',{x:0.8,y:1.95,w:6,h:0.4,fontSize:14,bold:true,color:INK});
  T(s,'今の試作には物語の穴がある：人が少なく資源が足りる序盤に、方舟を出せばいい。答えは技術。方舟は「方舟用推進機関」なしでは出航できない。日付が判明した瞬間、ヘッダーに二つの年が並ぶ ── 夜の年と、今のペースで推進機関が完成する予測年。後者は赤く、夜より遅い。中盤の2000年間は、その数字を夜より前に引き寄せる戦いになる。',{x:0.8,y:2.35,w:11.7,h:1.35,fontSize:11.5,color:INK2});
  const steps=[['1','二つの日付','既存の推進機関プログラムを再利用。予測年はプレイに応じて毎年動く。方舟ブロックは「今の推進機関で出るか、次を待つか」の賭けになる'],['2','選択肢つきイベント','人事ファイルの人物が二択を持ってくる。答えは信号の遅延ぶん遅れて届く'],['3','世界の改修','Deep bore（鉱脈延命）、Dome（人の受け皿）。余る燃料と部品に出口を作る'],['4','アートと店頭','管制室の質感、Steamページ、デモ。ここで初めて「見た目」に投資する']];
  steps.forEach((st,i)=>{ const x=0.6+i*3.1; box(s,x,4.0,2.9,2.85); T(s,st[0],{x:x+0.2,y:4.1,w:1,h:0.55,fontFace:MONO,fontSize:24,bold:true,color:RED}); T(s,st[1],{x:x+0.2,y:4.7,w:2.5,h:0.45,fontSize:13.5,bold:true,color:INK}); T(s,st[2],{x:x+0.2,y:5.2,w:2.5,h:1.6,fontSize:10,color:INK2}); });
}

// ---------- 16 付録 A ----------
{
  const s=base('付録 A：人事ファイルの8つの瞬間と、主要数値。','付録');
  T(s,'人事ファイルが開く瞬間（窓は50年に1回まで、★は必ず）',{x:0.6,y:1.85,w:6,h:0.35,fontFace:MONO,fontSize:9.5,color:INK2,charSpacing:1});
  const pf=[['シフト長','日付の判明 ★ · 搭乗締切 ★'],['入植地の長','着陸 · 撤収 · 「カウントダウンが聞こえる」★'],['通信当直','船の消息不明'],['船長','30年を超える航海の後の交代（船長No.k）· 戻れない最後の航海 ★']];
  pf.forEach((r,i)=>{ const y=2.3+i*0.8; T(s,r[0],{x:0.6,y,w:1.8,h:0.7,fontSize:12,bold:true,color:INK}); T(s,r[1],{x:2.5,y,w:4.1,h:0.7,fontSize:10.5,color:INK2}); rule(s,0.6,y+0.72,6.0); });
  T(s,'すべての一言は日誌に黄色の行として残る。名前は50の姓から、肖像はシードから。',{x:0.6,y:5.6,w:6,h:0.6,fontSize:10,color:INK3});
  T(s,'主要数値（v3.9.1）',{x:7.2,y:1.85,w:5.5,h:0.35,fontFace:MONO,fontSize:10,color:INK2,charSpacing:2});
  const nums=[['地球の初期資源','金属430 · 食糧230 · 燃料240 · 人128'],['地球の消費','年3.4食糧 · 2.6金属 × (1 + 年/520 + (年/2400)²)'],['入植','既定26人 · 収容 35 + 70×居住性'],['工業レシピ','部品1 = 金属1 + 食糧0.4 · 地球は25年分を保持'],['世代スケール','積載×2.4 · 価格×3.2 · 燃料×2.2 · 乗員×1.6 · 航行×1.55'],['ロングナイト','第3セクター or 1000年目 → 2200年後 · 警告 400/100/25'],['方舟ブロック','100席：金属350×1.22ᵏ · 部品200×1.22ᵏ · 食糧700×1.2ᵏ · 燃料500×1.2ᵏ'],['敗北','地球の飢饉260年']];
  nums.forEach((r,i)=>{ const y=2.3+i*0.55; T(s,r[0],{x:7.2,y,w:1.9,h:0.5,fontSize:10.5,bold:true,color:INK}); T(s,r[1],{x:9.1,y,w:3.6,h:0.5,fontFace:MONO,fontSize:9,color:INK2}); });
}

// ---------- 17 付録 B ----------
{
  const s=base('付録 B：射程 ＝ 船級 ＋ 世代。近い環は快速船の仕事、辺境は大型船の国。','付録 · 船 · 世代 · 射程');
  const hdr=['船級','積載','速度','乗員','射程（第0世代）','役割'];
  const rows=[['クーリエ','70','×1.70','8','セクター1まで','短い往復。速さが利く内周。金属あたりの輸送量は最良'],['ハウラー','240','×1.05','20','セクター2まで','中距離の主力'],['フレイター','760','×0.70','45','セクター3まで','辺境へ届く唯一の船級。遅く、高い']];
  const X=[0.6,2.4,3.6,4.8,6.0,8.3], W=[1.7,1.1,1.1,1.1,2.2,4.4];
  hdr.forEach((h,i)=>T(s,h,{x:X[i],y:1.8,w:W[i],h:0.3,fontFace:MONO,fontSize:9,color:INK2,charSpacing:2}));
  rule(s,0.6,2.15,12.1,INK2);
  rows.forEach((r,i)=>{ const y=2.3+i*0.75; r.forEach((c,j)=>T(s,c,{x:X[j],y,w:W[j],h:0.6,fontSize:j?12:15,bold:!j,color:j===5?INK2:INK,fontFace:(j>0&&j<4)?MONO:JP})); rule(s,0.6,y+0.66,12.1); });
  const cols=[['推進機関プログラム','工業世界で部品を燃やす。完成で次世代の船が解禁、全船級の射程+1、航行速度×1.55。世代ごとに積載×2.4、価格×3.2、乗員×1.6。'],['旧世代は消えない','造船所は2世代前を作らなくなるが、飛んでいる船は飛び続ける（OpenTTDの規則）。時代感の源泉。'],['探査は射程に縛られない','届かないセクターを先に地図に載せられる。見えるのに触れない圧力が、推進機関への動機。']];
  cols.forEach((c,i)=>{ const x=0.6+i*4.1; box(s,x,4.7,3.9,2.2); T(s,c[0],{x:x+0.2,y:4.85,w:3.5,h:0.4,fontSize:13,bold:true,color:INK}); T(s,c[1],{x:x+0.2,y:5.3,w:3.5,h:1.5,fontSize:11,color:INK2}); });
}

P.writeFile({fileName:'/home/claude/ln/deck/LAST-BERTH-企画書-v2.pptx'}).then(f=>console.log('wrote',f,'slides',n));
