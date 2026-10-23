const fs=require('fs');
const FRAMES={
 1:{name:'intro1_pult',seed:1102,prompt:'Wide cinematic film still, ultra-wide 2.4:1, dark circular command hall of a vast starship seen from the back of the room. A giant curved wall of tall screens with amber and blue columns of data surrounds the room; at its centre a glowing blue wireframe globe with thin orbit rings. Rows of dark consoles with thin amber light lines curve across the room; the operators are dark silhouettes in deep shadow seen from behind. In the central aisle two figures stand seen from behind: a slim android of smooth matte pale-grey ceramic plating with dark seams, wearing a plain long pale tunic, with a faceless smooth oval head and no hair, and next to it a taller figure in a long dark coat. Volumetric haze, glossy dark floor reflecting the screens, teal and amber colour grade, anamorphic lens, shallow depth of field, moody, strictly no visible faces, no text, no logos.'},
 2:{name:'intro2_window',seed:2202,prompt:'Wide cinematic film still, ultra-wide 2.4:1, vast observation window with thick black mullions looking out over a lifeless grey-brown cratered planet with a razor-sharp horizon in the lower half, a dense starfield above, a low white-gold star grazing the rim of the planet on the right with a soft lens flare. Two small silhouettes seen from behind stand at the sill, one slim pale smooth android and one taller dark figure, dark consoles with thin amber light lines at both sides, long hard cold shadows on a glossy floor, almost dark interior, cold cinematic colour grade, anamorphic, no faces visible, no text, no logos, no atmosphere, no clouds.'},
 3:{name:'intro3_port',seed:3303,prompt:'Wide cinematic film still, ultra-wide 2.4:1, vast hangar interior in one-point perspective, ribbed ceiling beams with rows of lamps, glossy dark floor with reflections. Two enormous dark cargo ships with ribbed hulls and rows of amber portholes docked on both sides, their warm amber engines glowing toward the camera. A huge open gate at the end filled with cold white light. A crowd of about fifty silhouettes stands with their backs to the camera, and in front of them on a low platform a slim pale smooth android with a hairless oval head faces the crowd, right arm extended forward and upward toward the ships, backlit by the gate. Volumetric haze and light shafts, teal and amber colour grade, anamorphic, no faces visible, no text, no logos, no flags.'}
};
try{ Object.assign(FRAMES, require('./extra.js')) }catch(e){}
const n=+process.argv[2]||1, F=FRAMES[n], W=+process.argv[3]||1536, H=+process.argv[4]||640, steps=+process.argv[5]||4, batch=+process.argv[6]||3;
const wf={
 "1":{class_type:"UNETLoader",inputs:{unet_name:"flux-2-klein-4b.safetensors",weight_dtype:"default"}},
 "2":{class_type:"CLIPLoader",inputs:{clip_name:"qwen_3_4b.safetensors",type:"flux2",device:"default"}},
 "3":{class_type:"VAELoader",inputs:{vae_name:"flux2-vae.safetensors"}},
 "4":{class_type:"CLIPTextEncode",inputs:{text:F.prompt,clip:["2",0]}},
 "5":{class_type:"ConditioningZeroOut",inputs:{conditioning:["4",0]}},
 "6":{class_type:"EmptyFlux2LatentImage",inputs:{width:W,height:H,batch_size:batch}},
 "7":{class_type:"Flux2Scheduler",inputs:{steps:steps,width:W,height:H}},
 "8":{class_type:"KSamplerSelect",inputs:{sampler_name:"euler"}},
 "9":{class_type:"CFGGuider",inputs:{model:["1",0],positive:["4",0],negative:["5",0],cfg:1}},
 "10":{class_type:"RandomNoise",inputs:{noise_seed:F.seed}},
 "11":{class_type:"SamplerCustomAdvanced",inputs:{noise:["10",0],guider:["9",0],sampler:["8",0],sigmas:["7",0],latent_image:["6",0]}},
 "12":{class_type:"VAEDecode",inputs:{samples:["11",0],vae:["3",0]}},
 "13":{class_type:"SaveImage",inputs:{filename_prefix:"lastberth/"+F.name,images:["12",0]}}
};
fs.writeFileSync(F.name+'.api.json',JSON.stringify(wf,null,1)); console.log('wrote',F.name+'.api.json',W+'x'+H,steps,'steps',batch,'images');
