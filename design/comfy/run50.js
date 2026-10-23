// Submit round-8 frames (pult50.js) straight to the local ComfyUI API and save PNGs to design/intro/raw/H/.
// node run50.js [from to] — defaults to all 50; skips frames already saved.
const fs = require('fs'), path = require('path');
const P = require('./pult50.js'), URL = 'http://127.0.0.1:8188';
const OUT = path.join(__dirname, '..', 'intro', 'raw', 'H'); fs.mkdirSync(OUT, { recursive: true });
const W = 1536, Hh = 640, steps = 4;
const graph = F => ({
 1:{class_type:'UNETLoader',inputs:{unet_name:'flux-2-klein-4b.safetensors',weight_dtype:'default'}},
 2:{class_type:'CLIPLoader',inputs:{clip_name:'qwen_3_4b.safetensors',type:'flux2',device:'default'}},
 3:{class_type:'VAELoader',inputs:{vae_name:'flux2-vae.safetensors'}},
 4:{class_type:'CLIPTextEncode',inputs:{text:F.prompt,clip:['2',0]}},
 5:{class_type:'ConditioningZeroOut',inputs:{conditioning:['4',0]}},
 6:{class_type:'EmptyFlux2LatentImage',inputs:{width:W,height:Hh,batch_size:1}},
 7:{class_type:'Flux2Scheduler',inputs:{steps,width:W,height:Hh}},
 8:{class_type:'KSamplerSelect',inputs:{sampler_name:'euler'}},
 9:{class_type:'CFGGuider',inputs:{model:['1',0],positive:['4',0],negative:['5',0],cfg:1}},
 10:{class_type:'RandomNoise',inputs:{noise_seed:F.seed}},
 11:{class_type:'SamplerCustomAdvanced',inputs:{noise:['10',0],guider:['9',0],sampler:['8',0],sigmas:['7',0],latent_image:['6',0]}},
 12:{class_type:'VAEDecode',inputs:{samples:['11',0],vae:['3',0]}},
 13:{class_type:'SaveImage',inputs:{filename_prefix:'lastberth/'+F.name,images:['12',0]}}
});
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const a = +process.argv[2] || 27, b = +process.argv[3] || 76;
  for (let n = a; n <= b; n++) {
    const F = P[n], dst = path.join(OUT, F.id + '.png');
    if (fs.existsSync(dst)) continue;
    const t0 = Date.now();
    const r = await (await fetch(URL + '/prompt', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ prompt: graph(F) }) })).json();
    if (!r.prompt_id) { console.log(F.id, 'submit failed', JSON.stringify(r).slice(0, 300)); continue; }
    let h;
    for (;;) { await sleep(1500); h = (await (await fetch(URL + '/history/' + r.prompt_id)).json())[r.prompt_id]; if (h && h.status && h.status.completed !== undefined && (h.status.completed || h.status.status_str === 'error')) break; }
    const img = h.outputs && h.outputs['13'] && h.outputs['13'].images[0];
    if (!img) { console.log(F.id, 'no image', JSON.stringify(h.status).slice(0, 300)); continue; }
    const q = new URLSearchParams({ filename: img.filename, subfolder: img.subfolder, type: img.type });
    fs.writeFileSync(dst, Buffer.from(await (await fetch(URL + '/view?' + q)).arrayBuffer()));
    console.log(F.id, ((Date.now() - t0) / 1000).toFixed(0) + 's');
  }
})();
