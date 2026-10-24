// upscale a picked frame: node upscale.js <file in ComfyUI/input> <out.png> [W H] — 4x-UltraSharp, then lanczos down to W x H (default 3072x1280)
const fs = require('fs'), URL = 'http://127.0.0.1:8188';
const [inp, out, W = 3072, H = 1280] = process.argv.slice(2);
const g = {
 1:{class_type:'LoadImage',inputs:{image:inp}},
 2:{class_type:'UpscaleModelLoader',inputs:{model_name:'4x-UltraSharp.pth'}},
 3:{class_type:'ImageUpscaleWithModel',inputs:{upscale_model:['2',0],image:['1',0]}},
 4:{class_type:'ImageScale',inputs:{image:['3',0],upscale_method:'lanczos',width:+W,height:+H,crop:'disabled'}},
 5:{class_type:'SaveImage',inputs:{filename_prefix:'lastberth/up_'+inp.replace(/\.png$/,''),images:['4',0]}}
};
(async () => {
  const r = await (await fetch(URL + '/prompt', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ prompt: g }) })).json();
  if (!r.prompt_id) return console.log('submit failed', JSON.stringify(r).slice(0, 400));
  let h; for (;;) { await new Promise(s => setTimeout(s, 1500)); h = (await (await fetch(URL + '/history/' + r.prompt_id)).json())[r.prompt_id]; if (h && h.status && (h.status.completed || h.status.status_str === 'error')) break; }
  const img = h.outputs['5'].images[0], q = new URLSearchParams({ filename: img.filename, subfolder: img.subfolder, type: img.type });
  fs.writeFileSync(out, Buffer.from(await (await fetch(URL + '/view?' + q)).arrayBuffer())); console.log('wrote', out);
})();
