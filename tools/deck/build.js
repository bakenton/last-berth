// LAST BERTH — 企画書 / pitch deck (JA). Brutalist: black, bone, one red.
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
  if(tag) s.addText(tag,{x:0.6,y:0.38,w:8,h:0.3,fontFace:MONO,fontSize:10,color:INK2,charSpacing:3,isTextBox:true,margin:0});
  if(title) s.addText(title,{x:0.6,y:0.65,w:12.1,h:0.8,fontFace:JP,fontSize:27,bold:true,color:INK,isTextBox:true,margin:0,valign:'top'});
  s.addText('LAST BERTH  ·  企画書  ·  '+String(n).padStart(2,'0'),{x:0.6,y:7.0,w:4,h:0.3,fontFace:MONO,fontSize:9,color:INK3,charSpacing:2,isTextBox:true,margin:0});
  s.addText(CRED,{x:4.7,y:7.0,w:8.03,h:0.3,fontFace:JP,fontSize:8.5,color:INK3,align:'right',isTextBox:true,margin:0});
  return s;
}
const T=(s,t,o)=>s.addText(t,Object.assign({fontFace:JP,fontSize:14,color:INK,isTextBox:true,margin:0,valign:'top'},o));
const box=(s,x,y,w,h,fill)=>s.addShape(P.ShapeType.rect,{x,y,w,h,fill:{color:fill||PANEL},line:{color:LINE,width:0.75}});
const rule=(s,x,y,w,c)=>s.addShape(P.ShapeType.line,{x,y,w,h:0,line:{color:c||LINE,width:0.75}});
const stat=(s,x,y,w,num,label,col)=>{ T(s,num,{x,y,w,h:0.9,fontSize:44,bold:true,color:col||INK}); T(s,label,{x,y:y+0.95,w,h:0.5,fontSize:11,color:INK2}); };

// ---------- 01 表紙 ----------
{
  const s=P.addSlide(); s.background={color:BG}; n++;
  s.addImage({data:IMG('map.png'),x:5.6,y:0.9,w:7.7,h:4.36,transparency:62});
  s.addShape(P.ShapeType.rect,{x:0.6,y:0.6,w:0.22,h:0.22,fill:{color:RED},line:{color:RED}});
  T(s,'LAST BERTH',{x:0.95,y:0.5,w:8,h:0.5,fontFace:MONO,fontSize:16,bold:true,color:INK,charSpacing:8});
  T(s,'仮題',{x:3.9,y:0.57,w:2,h:0.4,fontSize:11,color:INK2});
  T(s,'生き延びろ。\nそして、すべてを畳んで去れ。',{x:0.6,y:2.0,w:11,h:2.4,fontSize:48,bold:true,color:INK,lineSpacingMultiple:1.1});
  T(s,'拡張型ストラテジーの逆再生。勝利条件は、期限までに自分の帝国を解体し、人を方舟に乗せること。',{x:0.6,y:4.55,w:9.5,h:0.8,fontSize:16,color:INK2});
  const meta=[['ジャンル','戦略 × 放置 · コロニー経営'],['想定ハード','PC (Steam) · ブラウザ試作あり'],['プレイ','1人 · 1ラン約60分'],['状態','プレイアブル試作 v3.6.1（結末まで実装）']];
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
  T(s,'太陽に寿命がある。日付が判明した瞬間から、伸ばした帝国は資産ではなく負債になる。航路を解き、入植地を撤収し、船を解体して乗員を家に帰す。最終幕は拡張の逆再生であり、スコアは「連れて帰れた人数」のみ。',{x:0.6,y:4.5,w:5.6,h:2.2,fontSize:13,color:INK});
  box(s,6.9,1.8,5.8,4.9);
  stat(s,7.3,2.1,2.5,'2200','年。日付判明から出航までの猶予',INK);
  stat(s,10.0,2.1,2.5,'100','席。方舟1ブロックの定員',INK);
  stat(s,7.3,3.9,2.5,'0','乗れる乗員・入植者の数。家にいる者だけが乗る',RED);
  stat(s,10.0,3.9,2.5,'1','評価軸。乗った人数だけ',GREEN);
  T(s,'「拡張のゲーム」を「撤退のゲーム」に反転させる、たった一つの日付。',{x:7.3,y:5.9,w:5.1,h:0.6,fontSize:12,color:INK2,italic:true});
}

// ---------- 03 世界観 ----------
{
  const s=base('プレイヤーは人間ではない。死にゆく地球の「通信卓」という機関だ。','世界観 · プレイヤーの立場');
  const rows=[['誰にも会わない','地図の印はすべて報告であり、報告は常に古い。惑星も船も、数字と一行の記録としてしか存在しない。'],['年単位で進む','1ティック＝1年。担当者は交代し、卓だけが残る。80年ごとに新しい班が着任し、引き継いだ状況を一行書き残す。'],['記録が物語','キャラクターも会話もない。年代記（着任記録、消えた世界の墓碑銘、方舟の最後の記録）がナラティブの全て。安く、世界観に忠実。'],['ブルータリズムの管制室','黒・骨白・警告の赤。数字が装飾。資源はアイコンと色で常に同じ。']];
  rows.forEach((r,i)=>{ const y=1.85+i*1.2; T(s,r[0],{x:0.6,y,w:2.3,h:1.1,fontSize:14,bold:true,color:INK}); T(s,r[1],{x:3.0,y,w:3.9,h:1.1,fontSize:12,color:INK2}); rule(s,0.6,y+1.1,6.3); });
  s.addImage({data:IMG('chronicle.png'),x:7.2,y:1.9,w:5.5,h:1.4});
  T(s,'▲ 年代記。80年ごとの着任記録と、撤収した世界の墓碑銘（試作）',{x:7.2,y:3.4,w:5.5,h:0.4,fontSize:10,color:INK2});
  s.addImage({data:IMG('end.png'),x:7.2,y:4.0,w:2.6,h:2.5});
  s.addImage({data:IMG('lang.png'),x:10.1,y:4.0,w:2.6,h:1.7});
  T(s,'▲ 結末画面と、起動時の言語選択（EN / RU 実装済、JAは追加可能）',{x:7.2,y:6.55,w:5.5,h:0.4,fontSize:10,color:INK2});
}

// ---------- 04 コアループ ----------
{
  const s=base('コアループ：入植 → 航路 → 資源 → 次の世代 → もっと遠くへ。地球は毎年燃やし、毎年増える。','プレイサイクル');
  const steps=[['01','入植','空いている船を選び、世界をクリック、26人を降ろす'],['02','航路を引く','船は世界⇄地球を自動で往復。行きは人、帰りは産物'],['03','地球が食う','金属と食糧を毎年消費。消費は暦とともに超線形に増える'],['04','探査 · 推進機関','部品で次のセクターを開き、次世代の船を解禁'],['05','もっと遠くへ','遠いほど豊かで、危険で、高い。最後のセクターは存在しない']];
  steps.forEach((st,i)=>{ const x=0.6+i*2.5; box(s,x,1.85,2.3,2.1); T(s,st[0],{x:x+0.2,y:2.0,w:1,h:0.4,fontFace:MONO,fontSize:11,color:RED,bold:true}); T(s,st[1],{x:x+0.2,y:2.4,w:2,h:0.45,fontSize:15,bold:true,color:INK}); T(s,st[2],{x:x+0.2,y:2.9,w:1.95,h:1.0,fontSize:10.5,color:INK2}); if(i<4) T(s,'→',{x:x+2.28,y:2.6,w:0.3,h:0.4,fontSize:14,color:INK3}); });
  T(s,'ループの裏側：鉱脈が枯れる → 世界を撤収 → 地図に墓標が残る → 次の世界へ',{x:0.6,y:4.05,w:12,h:0.4,fontSize:11,color:INK2});
  s.addImage({data:IMG('map.png'),x:0.6,y:4.6,w:3.0,h:1.7});
  T(s,'一度も手で荷を積まない',{x:3.9,y:4.6,w:4.2,h:0.4,fontSize:14,bold:true,color:INK});
  T(s,'判断の単位は「どの世界に、どの船を、何隻置くか」だけ。航路は勝手に走り、追いつかなければ2隻目を置く。放置系の快感（勝手に増える）と、経営系の判断（どこに投資するか）を同じ画面に置く。',{x:3.9,y:5.0,w:4.2,h:1.9,fontSize:11.5,color:INK2});
  T(s,'卓が代わりに計算する',{x:8.5,y:4.6,w:4.2,h:0.4,fontSize:14,bold:true,color:INK});
  T(s,'左上の「要判断」パネルが、悪い順に並べて何が決断を待っているかを示す。HOLDで船の帰港や事件のたびに時計が止まる。プレイヤーは算数ではなく、優先順位を決める。',{x:8.5,y:5.0,w:4.2,h:1.9,fontSize:11.5,color:INK2});
}

// ---------- 05 経済 ----------
{
  const s=base('4つの資源と、第5の通貨「人」。すべてに出口があり、余りは発生しない。','経済設計');
  const hdr=['資源','産出','用途 · 出口','設計上の役割'];
  const rows=[
    ['金属',SILVER,'鉱山世界（有限の鉱脈）','地球が毎年燃やす · 船 · 探査 · 方舟','常にボトルネック。全シードで最初に枯れる'],
    ['食糧',GREEN,'農業世界（有限）','地球が毎年燃やす · 工業世界の原料 · 方舟','余りやすい → 方舟が吸う（v3.5.1）'],
    ['燃料',ORANGE,'油井世界（有限）','出航ごとに消費 · 方舟','距離の税。長い航路ほど飲む'],
    ['部品',INK,'工業世界：運び込んだ金属+食糧から製造','船 · 探査 · 推進機関 · 方舟','唯一の「加工」資源。3つの用途が奪い合う'],
    ['人',YELLOW,'地球が年1.5人 · 食わない','船の乗員（除籍まで拘束） · 探査隊（戻らない） · 入植26人 · 方舟の乗客','家に残せば地球の産出↑（逓減）。家か、闇の中の船か'],
  ];
  const X=[0.6,2.0,5.0,8.6], W=[1.3,2.9,3.5,4.1];
  hdr.forEach((h,i)=>T(s,h,{x:X[i],y:1.8,w:W[i],h:0.3,fontFace:MONO,fontSize:9,color:INK2,charSpacing:2}));
  rule(s,0.6,2.15,12.1,INK2);
  rows.forEach((r,i)=>{ const y=2.3+i*0.82; T(s,r[0],{x:X[0],y,w:W[0],h:0.7,fontSize:15,bold:true,color:r[1]}); T(s,r[2],{x:X[1],y,w:W[1],h:0.7,fontSize:11,color:INK}); T(s,r[3],{x:X[2],y,w:W[2],h:0.7,fontSize:11,color:INK}); T(s,r[4],{x:X[3],y,w:W[3],h:0.7,fontSize:11,color:INK2}); rule(s,0.6,y+0.74,12.1); });
  box(s,0.6,6.35,12.1,0.6);
  T(s,'原則：地球の消費は暦だけで増える（速度は超線形）。停滞したチャートは、どれだけ豊かでも必ず飢える。260年の飢饉で敗北。',{x:0.8,y:6.45,w:11.7,h:0.45,fontSize:12,color:INK});
}

// ---------- 07 ロングナイト ----------
{
  const s=base('ロングナイト：第3セクターの探査が、太陽の寿命を持ち帰る。','終盤 · 方舟');
  const steps=[['①  日付が判明','3つ目のセクターを開いた瞬間（遅くとも1000年目）、太陽が消える年が確定。猶予は2200年。ゲームは一度止まり、一度だけ告げる。'],['②  方舟を積む','100席ブロック。金属・部品・食糧・燃料をすべて要求し、価格は逓増。序盤に余る資源は、ここで全部吸われる。'],['③  家にいる者だけが乗る','船の乗員も、入植者も、航行中の人間も乗れない。だから最終幕は解体：航路を解き、世界を撤収し、船を潰して乗員を歩いて帰らせる。']];
  steps.forEach((st,i)=>{ const y=1.85+i*1.55; T(s,st[0],{x:0.6,y,w:6.2,h:0.45,fontSize:16,bold:true,color:i===2?RED:INK}); T(s,st[1],{x:0.6,y:y+0.5,w:6.2,h:1.0,fontSize:12,color:INK2}); });
  s.addImage({data:IMG('night.png'),x:7.2,y:1.85,w:5.5,h:3.06});
  T(s,'▲ 告知画面（試作）。400 / 100 / 25年前に卓が再び止まる。',{x:7.2,y:5.0,w:5.5,h:0.4,fontSize:10,color:INK2});
  box(s,7.2,5.5,5.5,1.3);
  T(s,'なぜ「家にいる者だけ」か',{x:7.4,y:5.6,w:5.1,h:0.35,fontSize:12,bold:true,color:INK});
  T(s,'この一条件が、拡張の全資産を負債に変える。方舟の席を買うだけなら経営ゲームの延長。人を帰す作業が、プレイヤーに自分の帝国を手で解体させる。',{x:7.4,y:5.95,w:5.1,h:0.85,fontSize:10.5,color:INK2});
}

// ---------- 08 エンディング ----------
{
  const s=base('スコアは「乗った人数」だけ。ボートか、国民か。','結末');
  const tiers=[['0','夜が来た','方舟なし、または乗る者なし。掘り続ける帝国の上で太陽が消えた。',RED],['〜300','ボート。国民ではない','残りは働いていた世界と共に残った。',RED2],['〜1200','どこかでやり直せる数','建てたものの大半と、人の大半は残った。',INK],['1200〜','帝国を方舟に載せた','間に合った。卓はそのためにあった。',GREEN]];
  tiers.forEach((t,i)=>{ const y=1.85+i*1.05; T(s,t[0],{x:0.6,y,w:1.6,h:0.8,fontFace:MONO,fontSize:22,bold:true,color:t[3]}); T(s,t[1],{x:2.3,y,w:3.9,h:0.4,fontSize:14,bold:true,color:INK}); T(s,t[2],{x:2.3,y:y+0.42,w:3.9,h:0.55,fontSize:11,color:INK2}); rule(s,0.6,y+0.95,5.6); });
  box(s,0.6,6.1,5.6,0.8);
  T(s,'初回の通しプレイ（v3.5）：2917年目、1000席 / 1000人。ただし家には1952人 ── 席が足りず952人が桟橋に残った。',{x:0.8,y:6.18,w:5.3,h:0.65,fontSize:10.5,color:INK});
  s.addImage({data:IMG('end.png'),x:7.0,y:1.85,w:5.2,h:4.96});
}

// ---------- 09 差別化 ----------
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

// ---------- 10 ターゲット ----------
{
  const s=base('誰に、どこで、いくらで。','ターゲット · プラットフォーム');
  const cols=[['誰が遊ぶか','Frostpunk / Slipways / RimWorld を遊び切った層。システムを読んで楽しむ人。30〜40代中心、PCゲーマー。\n\n「一度手を離しても進む」経営を求める層（放置系耐性）と重なる。'],['セッション','1ラン 約60分（実測：1600年で30分、結末は2917年）。HOLDで自動停止するため、片手間にも一気にも遊べる。\n\n現状のリプレイ軸はシードのみ。ここは弱い（→リスク）。'],['プラットフォーム · 価格','PC / Steam。試作はブラウザで動く単一HTML（依存なし、インストール不要）。\n\n想定価格 ¥1,500 前後：Rusty\'s Retirement（$6.99）と Slipways（$19.99）の間。']];
  cols.forEach((c,i)=>{ const x=0.6+i*4.1; box(s,x,1.85,3.9,4.0); T(s,c[0],{x:x+0.25,y:2.0,w:3.4,h:0.45,fontSize:15,bold:true,color:INK}); T(s,c[1],{x:x+0.25,y:2.55,w:3.4,h:3.2,fontSize:11.5,color:INK2}); });
  T(s,'一言で売るなら',{x:0.6,y:6.1,w:3,h:0.3,fontFace:MONO,fontSize:9,color:INK2,charSpacing:2});
  T(s,'「帝国を広げるゲームは山ほどある。畳むゲームはこれだけだ。」',{x:0.6,y:6.4,w:12,h:0.5,fontSize:16,bold:true,color:INK});
}

// ---------- 11 検証 ----------
{
  const s=base('バランスは目分量ではなくボットで、設計変更は実プレイのログで決める。','検証手法 · テクニカルデザイン');
  T(s,'4種のボットが同じ8シードを2600〜3400年走る',{x:0.6,y:1.85,w:6,h:0.4,fontSize:14,bold:true,color:INK});
  T(s,'不変条件：無策（idle）と欲張り（greedy）は負け、正しいプレイ（pro）が最も遠くへ行く。核心の数値を変えるたびに前版の核と A/B。',{x:0.6,y:2.3,w:6,h:0.9,fontSize:11.5,color:INK2});
  T(s,'ボット別スコア（世界 + 世代×3 + セクター×2）',{x:0.6,y:3.15,w:6,h:0.3,fontSize:10,color:INK2,align:'center'});
  s.addChart(P.ChartType.bar,[{name:'スコア',labels:['idle','greedy','expand','pro'],values:[4.0,17.7,17.7,33.1]}],{x:0.6,y:3.45,w:6,h:3.0,barDir:'col',chartColors:[INK2],showValue:true,dataLabelPosition:'outEnd',dataLabelFormatCode:'0.0',dataLabelColor:INK,dataLabelFontSize:11,catAxisLabelColor:INK,valAxisLabelColor:INK3,valGridLine:{color:LINE,size:0.5},catGridLine:{style:'none'},showLegend:false,showTitle:false,catAxisLabelFontFace:'Arial',valAxisLabelFontFace:'Arial',dataLabelFontFace:'Arial',catAxisLabelFontSize:11,valAxisLabelFontSize:9});
  T(s,'実プレイのログが設計を変えた例',{x:7.0,y:1.85,w:5.7,h:0.4,fontSize:14,bold:true,color:INK});
  const ex=[['観察','初の通しプレイ（2917年）。方舟の席が金属だけに縛られ、717年と1177年の後、1100年間ブロックを買えず。終了時に部品7712・食糧18598が倉庫に余り、952人が席なし。'],['診断','後半の経済は部品と食糧を生むのに、方舟がそれを吸わない。勝ち筋を作ったプレイヤーが、経済に裏切られる結末。'],['変更（v3.5.1）','方舟の価格を4資源制へ：金属350·部品200·食糧700·燃料500（逓増）。ボットとPlaywrightで再検証。次の実プレイで判定。']];
  ex.forEach((e,i)=>{ const y=2.35+i*1.45; T(s,e[0],{x:7.0,y,w:1.6,h:0.4,fontFace:MONO,fontSize:10,color:RED,bold:true}); T(s,e[1],{x:8.6,y,w:4.1,h:1.35,fontSize:10.5,color:INK2}); });
  T(s,'ゲームは全操作と50年ごとの状態をログに書き出す。設計者は感想ではなく、ログを読む。',{x:7.0,y:6.55,w:5.7,h:0.4,fontSize:10,color:INK3,italic:true});
}

// ---------- 12 現状とリスク ----------
{
  const s=base('できていること、できていないこと。','現状 · リスク');
  T(s,'実装済（試作 v3.6.1）',{x:0.6,y:1.85,w:5,h:0.35,fontFace:MONO,fontSize:10,color:GREEN,charSpacing:2});
  const done=['無限に生成される星図と有限の鉱脈','自動往復の航路、要判断パネル、HOLD','4資源 + 人の経済、船級×世代の射程','ロングナイト、方舟、結末（4段階）','EN / RU 二言語、6ページのガイド','年代記（着任記録・墓碑銘・最終記録）','ボット検証ハーネス、ログ出力'];
  s.addText(done.map((d,i)=>({text:d,options:{bullet:{code:'25A0'},breakLine:i<done.length-1,paraSpaceAfter:5}})),{x:0.6,y:2.25,w:5.4,h:4.4,fontFace:JP,fontSize:11.5,color:INK,isTextBox:true,margin:0,valign:'top'});
  T(s,'リスク',{x:6.4,y:1.85,w:5,h:0.35,fontFace:MONO,fontSize:10,color:RED,charSpacing:2});
  const risks=[['中盤の空白','実プレイで1100年、方舟に関する判断がなかった。Ixionが死んだ場所。','選択肢つきイベントと世界の改修で、判断の密度を上げる'],['絵作り','UIしかない。第一印象で売れない。','アートディレクション（管制室の質感）。UIの骨格は流用可'],['リプレイ性','シード以外の軸がない。','メタ進行、または日替わりシード＋記録'],['名称','LAST BERTH は仮題。','候補：OLD NIGHT / UNBUILT（付録）']];
  risks.forEach((r,i)=>{ const y=2.25+i*1.1; T(s,r[0],{x:6.4,y,w:1.6,h:1.0,fontSize:12,bold:true,color:INK}); T(s,r[1],{x:8.0,y,w:2.3,h:1.0,fontSize:10.5,color:INK2}); T(s,'→ '+r[2],{x:10.4,y,w:2.3,h:1.0,fontSize:10.5,color:INK}); rule(s,6.4,y+1.02,6.3); });
}

// ---------- 13 ロードマップ ----------
{
  const s=base('次の三手は、すべて「中盤に判断を増やす」ためにある。','ロードマップ · 制作体制');
  const steps=[['1','選択肢つきイベント','事件が起きたら二択を迫る。損失を受けるか、資源を払うか。判断の密度を上げる最短の手'],['2','世界の改修','Deep bore（鉱脈延命）、Dome（人の受け皿）、Mass driver（輸送強化）。余る人に出口を作る'],['3','中盤の圧','推進機関の値上げ、探査条件の見直し。射程が第3世代で緩む問題を締める'],['4','アートと店頭','管制室の質感、Steamページ、デモ。ここで初めて「見た目」に投資する']];
  steps.forEach((st,i)=>{ const x=0.6+i*3.1; box(s,x,1.85,2.9,3.0); T(s,st[0],{x:x+0.2,y:2.0,w:1,h:0.6,fontFace:MONO,fontSize:26,bold:true,color:RED}); T(s,st[1],{x:x+0.2,y:2.65,w:2.5,h:0.45,fontSize:14,bold:true,color:INK}); T(s,st[2],{x:x+0.2,y:3.15,w:2.5,h:1.6,fontSize:10.5,color:INK2}); });
  T(s,'制作体制',{x:0.6,y:5.2,w:3,h:0.3,fontFace:MONO,fontSize:9,color:INK2,charSpacing:2});
  T(s,'個人企画。企画とゲームデザインの判断は自分、実装とバランス計算はAIと共同。自分がプレイしてログを出し、AIと分析し、案を比べて選ぶ。約1週間で試作を25回更新。判断はすべて日付・理由・却下案つきで記録（Notion）。',{x:0.6,y:5.5,w:7.5,h:1.2,fontSize:11.5,color:INK});
  box(s,8.6,5.2,4.1,1.5);
  T(s,'今すぐ遊べる',{x:8.8,y:5.3,w:3.7,h:0.35,fontSize:12,bold:true,color:INK});
  T(s,'試作 v3.6.1 を同梱。ブラウザで開くだけ。起動時に言語を選ぶ。1ランは約60分。',{x:8.8,y:5.7,w:3.7,h:0.9,fontSize:10.5,color:INK2});
}

// ---------- 14 付録 ----------
{
  const s=base('付録 A：名称候補と主要数値。','付録');
  T(s,'名称候補（Steam で未使用を確認）',{x:0.6,y:1.85,w:6,h:0.35,fontFace:MONO,fontSize:10,color:INK2,charSpacing:2});
  const names=[['LAST BERTH','方舟の最後の一席。プレイヤーの目的を名にする。推奨'],['OLD NIGHT','太陽の消える夜。雰囲気重視。ゲーム内ではセクター名として残す'],['UNBUILT','「建てない」戦略。フックを一語で。パズルに見える恐れ']];
  names.forEach((nm,i)=>{ const y=2.3+i*0.9; T(s,nm[0],{x:0.6,y,w:2.6,h:0.5,fontFace:MONO,fontSize:16,bold:true,color:i?INK:GREEN}); T(s,nm[1],{x:3.3,y:y+0.05,w:3.3,h:0.8,fontSize:11,color:INK2}); rule(s,0.6,y+0.82,6.0); });
  T(s,'主要数値（v3.6.1）',{x:7.2,y:1.85,w:5.5,h:0.35,fontFace:MONO,fontSize:10,color:INK2,charSpacing:2});
  const nums=[['地球の初期資源','金属430 · 食糧230 · 燃料240 · 人128'],['地球の消費','年3.4食糧 · 2.6金属 × (1 + 年/520 + (年/2400)²)'],['入植','1世界26人 · 収容 35 + 70×居住性'],['探査コスト','金属140×1.4ⁿ · 食糧400×1.52ⁿ · 燃料210×1.48ⁿ · 部品40×1.5ⁿ · 人40×1.35ⁿ'],['世代スケール','積載×2.4 · 価格×3.2 · 燃料×2.2 · 乗員×1.6 · 航行×1.55'],['ロングナイト','第3セクター or 1000年目 → 2200年後 · 警告 400/100/25'],['方舟ブロック','100席：金属350×1.22ᵏ · 部品200×1.22ᵏ · 食糧700×1.2ᵏ · 燃料500×1.2ᵏ'],['敗北','地球の飢饉260年']];
  nums.forEach((r,i)=>{ const y=2.3+i*0.55; T(s,r[0],{x:7.2,y,w:1.9,h:0.5,fontSize:10.5,bold:true,color:INK}); T(s,r[1],{x:9.1,y,w:3.6,h:0.5,fontFace:MONO,fontSize:9,color:INK2}); });
}

// ---------- 06 船級と射程 ----------
{
  const s=base('付録 B：射程 ＝ 船級 ＋ 世代。近い環は快速船の仕事、辺境は大型船の国。','付録 · 船 · 世代 · 射程');
  const hdr=['船級','積載','速度','乗員','射程（第0世代）','役割'];
  const rows=[['クーリエ','70','×1.70','8','セクター1まで','短い往復。速さが利く内周'],['ハウラー','240','×1.05','20','セクター2まで','中距離の主力'],['フレイター','760','×0.70','45','セクター3まで','辺境へ届く唯一の船級。遅く、高い']];
  const X=[0.6,2.4,3.6,4.8,6.0,8.3], W=[1.7,1.1,1.1,1.1,2.2,4.4];
  hdr.forEach((h,i)=>T(s,h,{x:X[i],y:1.8,w:W[i],h:0.3,fontFace:MONO,fontSize:9,color:INK2,charSpacing:2}));
  rule(s,0.6,2.15,12.1,INK2);
  rows.forEach((r,i)=>{ const y=2.3+i*0.75; r.forEach((c,j)=>T(s,c,{x:X[j],y,w:W[j],h:0.6,fontSize:j?12:15,bold:!j,color:j===5?INK2:INK,fontFace:(j>0&&j<4)?MONO:JP})); rule(s,0.6,y+0.66,12.1); });
  const cols=[['推進機関プログラム','工業世界で部品を燃やす。完成で次世代の船が解禁、全船級の射程+1、航行速度×1.55。世代ごとに積載×2.4、価格×3.2、乗員×1.6。'],['旧世代は消えない','造船所は2世代前を作らなくなるが、飛んでいる船は飛び続ける（OpenTTDの規則）。時代感の源泉。'],['探査は射程に縛られない','届かないセクターを先に地図に載せられる。見えるのに触れない圧力が、推進機関への動機。']];
  cols.forEach((c,i)=>{ const x=0.6+i*4.1; box(s,x,4.7,3.9,2.2); T(s,c[0],{x:x+0.2,y:4.85,w:3.5,h:0.4,fontSize:13,bold:true,color:INK}); T(s,c[1],{x:x+0.2,y:5.3,w:3.5,h:1.5,fontSize:11,color:INK2}); });
}


P.writeFile({fileName:'/home/claude/ln/deck/last-berth-pitch-ja.pptx'}).then(f=>console.log('wrote',f,'slides',n));
