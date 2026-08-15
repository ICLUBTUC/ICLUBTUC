// phone3d.js — shared 3D iPhone builder/viewer for ICLUB catalog cards.
// Reused by Apple, Producto (and later other categories).

const THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';
let THREE = null;

export async function ensureThree(){
  if(!THREE){
    const url = (typeof window!=='undefined' && window.__resources && window.__resources.three) || THREE_URL;
    THREE = await import(url);
  }
  return THREE;
}

/* ---------- model presets ---------- */
export const MODELS = {
  iphone13:   { body:0x3E6187, frame:0x5D86AC, finish:'gloss',    cameras:'dual',   wallpaper:'ios15', name:'iPhone 13' },
  iphone14:   { body:0x2C2C31, frame:0x4A4A50, finish:'gloss',    cameras:'dual',   name:'iPhone 14' },
  iphone15:   { body:0x1B1B1E, frame:0x2A2A2E, finish:'gloss',    cameras:'dual',   name:'iPhone 15' },
  iphone16pro:{ body:0x37363C, frame:0x6E6B73, finish:'titanium', cameras:'triple', name:'iPhone 16 Pro' },
  iphone17promax:{ body:0xCB4F27, frame:0xB8471F, finish:'gloss', cameras:'triple', name:'iPhone 17 Pro Max' }
};

/* ---------- geometry helpers ---------- */
function roundedRect(T,w,h,r){
  const s=new T.Shape(), x=-w/2, y=-h/2;
  s.moveTo(x+r,y);
  s.lineTo(x+w-r,y); s.quadraticCurveTo(x+w,y,x+w,y+r);
  s.lineTo(x+w,y+h-r); s.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
  s.lineTo(x+r,y+h); s.quadraticCurveTo(x,y+h,x,y+h-r);
  s.lineTo(x,y+r); s.quadraticCurveTo(x,y,x+r,y);
  return s;
}
function fixUV(T,geo,w,h){
  const pos=geo.attributes.position, uv=[];
  for(let i=0;i<pos.count;i++){ const x=pos.getX(i), y=pos.getY(i); uv.push((x+w/2)/w,(y+h/2)/h); }
  geo.setAttribute('uv', new T.Float32BufferAttribute(uv,2));
}

/* ---------- shared textures (built once) ---------- */
let _wall=null, _env=null;
function wallpaper(T){
  if(_wall) return _wall;
  const c=document.createElement('canvas'); c.width=1080; c.height=2240; const x=c.getContext('2d');
  const rr=(px,py,pw,ph,rad)=>{x.beginPath();x.moveTo(px+rad,py);x.arcTo(px+pw,py,px+pw,py+ph,rad);x.arcTo(px+pw,py+ph,px,py+ph,rad);x.arcTo(px,py+ph,px,py,rad);x.arcTo(px,py,px+pw,py,rad);x.closePath();};
  x.fillStyle='#050505'; x.fillRect(0,0,1080,2240);
  const inset=30,r=175,w=1080-60,h=2240-60;
  x.save(); rr(inset,inset,w,h,r); x.clip();
  const grd=x.createLinearGradient(0,0,900,2240);
  grd.addColorStop(0,'#FFA05C'); grd.addColorStop(0.42,'#F26D2E'); grd.addColorStop(1,'#B23610');
  x.fillStyle=grd; x.fillRect(0,0,1080,2240);
  const rg=x.createRadialGradient(380,600,40,380,600,980); rg.addColorStop(0,'rgba(255,224,188,.5)'); rg.addColorStop(1,'rgba(255,224,188,0)');
  x.fillStyle=rg; x.fillRect(0,0,1080,2240);
  const vg=x.createLinearGradient(0,1350,0,2240); vg.addColorStop(0,'rgba(60,15,0,0)'); vg.addColorStop(1,'rgba(45,10,0,.55)');
  x.fillStyle=vg; x.fillRect(0,0,1080,2240);
  x.restore();
  x.fillStyle='#000'; rr(392,74,296,94,47); x.fill();
  x.textAlign='center';
  x.fillStyle='rgba(255,255,255,.97)'; x.font='600 122px -apple-system, system-ui, sans-serif'; x.fillText('9:41',540,590);
  x.fillStyle='rgba(255,255,255,.82)'; x.font='500 42px -apple-system, system-ui, sans-serif'; x.fillText('lunes, 6 de julio',540,672);
  x.globalAlpha=0.03;
  for(let i=0;i<9000;i++){ x.fillStyle=Math.random()>0.5?'#fff':'#000'; x.fillRect(Math.random()*1080,Math.random()*2240,2,2); }
  x.globalAlpha=1;
  const tex=new T.CanvasTexture(c); tex.colorSpace=T.SRGBColorSpace; tex.anisotropy=8; _wall=tex; return tex;
}
let _wall2=null;
function wallpaperIOS(T){
  if(_wall2) return _wall2;
  const c=document.createElement('canvas'); c.width=1080; c.height=2240; const x=c.getContext('2d');
  const rr=(px,py,pw,ph,rad)=>{x.beginPath();x.moveTo(px+rad,py);x.arcTo(px+pw,py,px+pw,py+ph,rad);x.arcTo(px+pw,py+ph,px,py+ph,rad);x.arcTo(px,py+ph,px,py,rad);x.arcTo(px,py,px+pw,py,rad);x.closePath();};
  x.fillStyle='#04060a'; x.fillRect(0,0,1080,2240);
  const inset=30,r=175,w=1080-60,h=2240-60;
  x.save(); rr(inset,inset,w,h,r); x.clip();
  x.fillStyle='#05080e'; x.fillRect(0,0,1080,2240);
  // iOS15-style diagonal swirl (teal -> blue -> magenta -> pink)
  const g=x.createLinearGradient(200,420,900,1880);
  g.addColorStop(0,'#1f8f7a'); g.addColorStop(0.32,'#2f6bd4'); g.addColorStop(0.55,'#6d3fb0'); g.addColorStop(0.78,'#e0518a'); g.addColorStop(1,'#f4b7cf');
  x.save(); x.translate(540,1150); x.rotate(-0.42); x.fillStyle=g;
  x.beginPath(); x.ellipse(0,0,392,940,0,0,Math.PI*2); x.fill(); x.restore();
  const glow=x.createRadialGradient(430,760,60,430,760,900); glow.addColorStop(0,'rgba(120,230,220,.35)'); glow.addColorStop(1,'rgba(120,230,220,0)');
  x.fillStyle=glow; x.fillRect(0,0,1080,2240);
  const vg=x.createLinearGradient(0,1500,0,2240); vg.addColorStop(0,'rgba(4,6,10,0)'); vg.addColorStop(1,'rgba(4,6,10,.6)');
  x.fillStyle=vg; x.fillRect(0,0,1080,2240);
  x.restore();
  x.fillStyle='#000'; rr(392,74,296,94,47); x.fill();
  x.textAlign='center';
  x.fillStyle='rgba(255,255,255,.97)'; x.font='600 122px -apple-system, system-ui, sans-serif'; x.fillText('9:41',540,590);
  x.fillStyle='rgba(255,255,255,.8)'; x.font='500 42px -apple-system, system-ui, sans-serif'; x.fillText('lunes, 6 de julio',540,672);
  x.globalAlpha=0.03;
  for(let i=0;i<9000;i++){ x.fillStyle=Math.random()>0.5?'#fff':'#000'; x.fillRect(Math.random()*1080,Math.random()*2240,2,2); }
  x.globalAlpha=1;
  const tex=new T.CanvasTexture(c); tex.colorSpace=T.SRGBColorSpace; tex.anisotropy=8; _wall2=tex; return tex;
}
function envTexture(T){
  if(_env) return _env;
  const c=document.createElement('canvas'); c.width=1024; c.height=512; const x=c.getContext('2d');
  const g=x.createLinearGradient(0,0,0,512);
  g.addColorStop(0,'#ffffff'); g.addColorStop(0.42,'#dcdce2'); g.addColorStop(0.55,'#c4c4cc'); g.addColorStop(1,'#6b6b74');
  x.fillStyle=g; x.fillRect(0,0,1024,512);
  x.fillStyle='rgba(255,255,255,.95)';
  x.beginPath(); x.ellipse(300,150,220,90,0,0,Math.PI*2); x.fill();
  x.beginPath(); x.ellipse(760,120,150,60,0,0,Math.PI*2); x.fill();
  x.fillStyle='rgba(255,235,215,.5)'; x.beginPath(); x.ellipse(540,360,260,120,0,0,Math.PI*2); x.fill();
  const tex=new T.CanvasTexture(c); tex.mapping=T.EquirectangularReflectionMapping; tex.colorSpace=T.SRGBColorSpace; _env=tex; return tex;
}
let _logo=null;
function appleLogo(T){
  if(_logo) return _logo;
  const c=document.createElement('canvas'); c.width=256; c.height=256; const x=c.getContext('2d');
  const p=new Path2D('M16.365 1.43c0 1.14-.42 2.2-1.24 3.02-.99.99-2.18 1.56-3.35 1.47-.14-1.13.44-2.28 1.2-3.04.86-.86 2.28-1.5 3.39-1.45zM20.5 17.02c-.55 1.27-.82 1.84-1.53 2.96-.99 1.57-2.39 3.52-4.12 3.53-1.54.01-1.93-.99-4.02-.98-2.09.01-2.52.99-4.06.98-1.73-.02-3.06-1.78-4.05-3.35C-.02 16.4-.2 11.7 1.6 9.19c1.02-1.43 2.63-2.34 4.09-2.34 1.49 0 2.42 1 3.65 1 1.19 0 1.92-1 3.65-1 1.3 0 2.68.71 3.66 1.93-3.22 1.76-2.7 6.36.85 8.24z');
  x.save();
  x.translate(128,134); const s=8.4; x.scale(s,s); x.translate(-10.2,-12.4);
  const grd=x.createLinearGradient(0,0,0,24); grd.addColorStop(0,'rgba(244,244,246,.96)'); grd.addColorStop(1,'rgba(196,196,202,.9)');
  x.fillStyle=grd; x.fill(p); x.restore();
  const tex=new T.CanvasTexture(c); tex.colorSpace=T.SRGBColorSpace; tex.repeat.x=-1; tex.offset.x=1; _logo=tex; return tex;
}

/* ---------- phone mesh ---------- */
export function buildPhone(T, preset){
  preset = preset || MODELS.iphone15;
  const titanium = preset.finish==='titanium';
  const g=new T.Group(), W=1.02,H=2.12,Tk=0.11,R=0.24;
  const geo=new T.ExtrudeGeometry(roundedRect(T,W,H,R),{depth:Tk,bevelEnabled:true,bevelThickness:0.022,bevelSize:0.022,bevelSegments:6,curveSegments:44});
  geo.center();
  const bodyMat = new T.MeshPhysicalMaterial({
    color:preset.body,
    metalness: titanium?0.9:0.55,
    roughness: titanium?0.45:0.28,
    clearcoat: titanium?0.25:0.7,
    clearcoatRoughness: titanium?0.5:0.22,
    envMapIntensity: titanium?1.1:1.35
  });
  g.add(new T.Mesh(geo,bodyMat));

  // frame rim
  const frameMat=new T.MeshStandardMaterial({color:preset.frame,metalness:0.92,roughness:titanium?0.42:0.3});

  // screen
  const sw=W-0.078, sh=H-0.078, sr=R-0.035;
  const sgeo=new T.ShapeGeometry(roundedRect(T,sw,sh,sr),28); fixUV(T,sgeo,sw,sh);
  const scrMat=new T.MeshPhysicalMaterial({color:0x000000,emissive:0xffffff,emissiveMap:(preset.wallpaper==='ios15'?wallpaperIOS(T):wallpaper(T)),emissiveIntensity:0.97,roughness:0.12,metalness:0,clearcoat:1,clearcoatRoughness:0.05,envMapIntensity:1.4});
  const screen=new T.Mesh(sgeo,scrMat); screen.position.z=Tk/2+0.035; g.add(screen);

  // camera bump
  const bump=new T.Group();
  const ringMat=new T.MeshStandardMaterial({color:0x24242a,metalness:0.92,roughness:0.28});
  const glassMat=new T.MeshPhysicalMaterial({color:0x0a0a14,metalness:0.35,roughness:0.05,clearcoat:1,clearcoatRoughness:0.04,envMapIntensity:1.6});
  const mkLens=(lx,ly,rad)=>{
    const l=new T.Group();
    const ring=new T.Mesh(new T.CylinderGeometry(rad,rad*1.08,0.055,36),ringMat); ring.rotation.x=Math.PI/2; l.add(ring);
    const glass=new T.Mesh(new T.CylinderGeometry(rad*0.7,rad*0.7,0.062,36),glassMat); glass.rotation.x=Math.PI/2; glass.position.z=0.006; l.add(glass);
    l.position.set(lx,ly,0.05); return l;
  };

  if(preset.cameras==='triple'){
    const pgeo=new T.ExtrudeGeometry(roundedRect(T,0.58,0.58,0.17),{depth:0.05,bevelEnabled:true,bevelThickness:0.012,bevelSize:0.012,bevelSegments:3,curveSegments:22}); pgeo.center();
    bump.add(new T.Mesh(pgeo,bodyMat));
    bump.add(mkLens(-0.12,0.12,0.125)); bump.add(mkLens(0.12,0.12,0.125)); bump.add(mkLens(0,-0.13,0.125));
    // flash + LiDAR to the right
    const flash=new T.Mesh(new T.CylinderGeometry(0.05,0.05,0.05,24), new T.MeshStandardMaterial({color:0xf6f0d4,emissive:0x6b6042,emissiveIntensity:0.2,roughness:0.4})); flash.rotation.x=Math.PI/2; flash.position.set(0.17,-0.02,0.05); bump.add(flash);
    const lidar=new T.Mesh(new T.CylinderGeometry(0.036,0.036,0.05,20), new T.MeshStandardMaterial({color:0x14141a,metalness:0.5,roughness:0.3})); lidar.rotation.x=Math.PI/2; lidar.position.set(0.17,0.16,0.05); bump.add(lidar);
  } else {
    // dual diagonal square bump
    const pgeo=new T.ExtrudeGeometry(roundedRect(T,0.46,0.46,0.15),{depth:0.05,bevelEnabled:true,bevelThickness:0.012,bevelSize:0.012,bevelSegments:3,curveSegments:22}); pgeo.center();
    bump.add(new T.Mesh(pgeo,bodyMat));
    bump.add(mkLens(-0.09,0.09,0.13)); bump.add(mkLens(0.09,-0.09,0.13));
    // flash
    const flash=new T.Mesh(new T.CylinderGeometry(0.04,0.04,0.05,20), new T.MeshStandardMaterial({color:0xf6f0d4,emissive:0x6b6042,emissiveIntensity:0.2,roughness:0.4}));
    flash.rotation.x=Math.PI/2; flash.position.set(0.12,0.12,0.05); bump.add(flash);
  }
  bump.rotation.y=Math.PI; bump.position.set(preset.cameras==='triple'?0.3:0.26, H/2-0.36, -Tk/2-0.02); g.add(bump);

  // side buttons
  const mkBtn=(w,h)=>new T.Mesh(new T.BoxGeometry(w,h,0.05),frameMat);
  const power=mkBtn(0.02,0.36); power.position.set(W/2+0.004,0.22,0); g.add(power);
  const v1=mkBtn(0.02,0.19); v1.position.set(-W/2-0.004,0.44,0); g.add(v1);
  const v2=mkBtn(0.02,0.19); v2.position.set(-W/2-0.004,0.19,0); g.add(v2);

  // Apple logo on the back (centered)
  const logoMat=new T.MeshStandardMaterial({map:appleLogo(T),transparent:true,metalness:0.6,roughness:0.34,envMapIntensity:1.2});
  const logo=new T.Mesh(new T.PlaneGeometry(0.44,0.52), logoMat);
  logo.position.set(0,0.12,-Tk/2-0.03); logo.rotation.y=Math.PI; g.add(logo);

  return g;
}

/* ---------- photo-textured phone (user's own front/back photos) ---------- */
function loadTex(T, url){
  return new Promise((res)=>{
    const img=new Image();
    img.onload=()=>{ const tex=new T.Texture(img); tex.colorSpace=T.SRGBColorSpace; tex.anisotropy=8; tex.needsUpdate=true; res({tex,w:img.naturalWidth||1,h:img.naturalHeight||1}); };
    img.onerror=()=>res(null);
    img.src=url;
  });
}
export async function buildPhotoPhone(T, photos){
  const g=new T.Group();
  const front = photos.front ? await loadTex(T, photos.front) : null;
  const back  = photos.back  ? await loadTex(T, photos.back)  : null;
  const ref = front || back;
  // keep the phone's real proportions; fit photo aspect within a tall slab
  const aspect = ref ? Math.min(2.6, Math.max(1.7, ref.h/ref.w)) : 2.16;
  const W=1.02, H=W*aspect, Tk=0.12, R=Math.min(W,H)*0.13;
  const geo=new T.ExtrudeGeometry(roundedRect(T,W,H,R),{depth:Tk,bevelEnabled:true,bevelThickness:0.02,bevelSize:0.02,bevelSegments:5,curveSegments:40});
  geo.center();
  const edgeMat=new T.MeshStandardMaterial({color:0x111114,metalness:0.55,roughness:0.42,envMapIntensity:0.8});
  g.add(new T.Mesh(geo,edgeMat));

  const faceShape=roundedRect(T, W-0.02, H-0.02, R-0.01);
  const mkFace=(t, mirror)=>{
    const fg=new T.ShapeGeometry(faceShape,40); fixUV(T,fg,W-0.02,H-0.02);
    if(mirror){ t.tex.wrapS=T.RepeatWrapping; t.tex.repeat.x=-1; t.tex.offset.x=1; t.tex.needsUpdate=true; }
    const m=new T.MeshStandardMaterial({map:t.tex,roughness:0.5,metalness:0.0,envMapIntensity:0.35,side:T.DoubleSide});
    return new T.Mesh(fg,m);
  };
  if(front){ const f=mkFace(front,false); f.position.z=Tk/2+0.032; g.add(f); }
  if(back){
    const b=mkFace(back,true);            // mirror texture so it reads correctly when flipped
    b.rotation.y=Math.PI; b.position.z=-Tk/2-0.032; g.add(b);
  }
  g.userData.photo=true;
  g.userData.height=H;
  g.userData.width=W;
  return g;
}
function disposeGroup(root){
  root.traverse((o)=>{
    if(o.geometry){ try{o.geometry.dispose();}catch(e){} }
    if(o.material){ const ms=Array.isArray(o.material)?o.material:[o.material]; ms.forEach(m=>{ if(m.map&&m.map.dispose) try{m.map.dispose();}catch(e){} try{m.dispose();}catch(e){} }); }
  });
}

/* ---------- stage (renderer + scene + lights) ---------- */
export function makeStage(T, canvas, opts){
  opts = opts || {};
  const camZ = opts.camZ || 7.6;
  const W=canvas.clientWidth||360, H=canvas.clientHeight||360;
  const renderer=new T.WebGLRenderer({canvas,antialias:true,alpha:true});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));
  renderer.setSize(W,H,false);
  renderer.toneMapping=T.ACESFilmicToneMapping; renderer.toneMappingExposure=1.06; renderer.outputColorSpace=T.SRGBColorSpace;
  const scene=new T.Scene();
  const camera=new T.PerspectiveCamera(28,W/H,0.1,100); camera.position.set(0,0,camZ);
  const pmrem=new T.PMREMGenerator(renderer);
  const envRT=pmrem.fromEquirectangular(envTexture(T));
  scene.environment=envRT.texture; pmrem.dispose();
  const d1=new T.DirectionalLight(0xffffff,0.75); d1.position.set(4,6,5); scene.add(d1);
  const d2=new T.DirectionalLight(0xfff0e6,0.32); d2.position.set(-5,2,3); scene.add(d2);
  scene.add(new T.AmbientLight(0xffffff,0.12));
  return {
    renderer, scene, camera, canvas,
    resize(){ const w=canvas.clientWidth,h=canvas.clientHeight; if(!w||!h) return; camera.aspect=w/h; camera.updateProjectionMatrix(); renderer.setSize(w,h,false); },
    dispose(){ try{ renderer.dispose(); }catch(e){} }
  };
}

/* ---------- global render ticker: only renders "active" stages ---------- */
const _stages=[];
let _ticking=false;
function _loop(now){
  for(let i=0;i<_stages.length;i++){ const s=_stages[i]; if(s.active && s.frame){ try{ s.frame(now); }catch(e){} } }
  requestAnimationFrame(_loop);
}
export function registerStage(stage){ _stages.push(stage); if(!_ticking){ _ticking=true; requestAnimationFrame(_loop); } }
export function unregisterStage(stage){ const i=_stages.indexOf(stage); if(i>=0) _stages.splice(i,1); }

/* ---------- high-level: attach a draggable floating phone viewer ---------- */
export async function attachPhone(canvas, modelKey, opts){
  opts = opts || {};
  const T = await ensureThree();
  const stage = makeStage(T, canvas, {camZ: opts.camZ || 7.6});
  stage._model = modelKey;

  const baseYaw = (opts.rotY!=null?opts.rotY:-0.3);
  const basePitch = (opts.rotX!=null?opts.rotX:0.05);
  let yaw = baseYaw, pitch = basePitch, vYaw = 0;
  let dragging = false, moved = 0, lastX = 0, lastY = 0;
  let introActive = false;
  const start = performance.now();

  const baseCamZ = opts.camZ || 7.6;
  async function build(model, photos){
    if(stage.phone){ stage.scene.remove(stage.phone); disposeGroup(stage.phone); stage.phone=null; }
    let phone;
    if(photos && (photos.front || photos.back)){
      phone = await buildPhotoPhone(T, photos);
      // auto-fit camera distance to the photo's real aspect ratio so it fills the frame consistently
      const H = phone.userData.height || 2.1;
      const fillFrac = 0.88;
      const halfFovRad = (stage.camera.fov/2) * Math.PI/180;
      const fitZ = (H/2) / (fillFrac*Math.tan(halfFovRad));
      stage.camera.position.z = Math.max(4.2, Math.min(13, fitZ));
    } else {
      phone = buildPhone(T, MODELS[model] || MODELS.iphone15);
      stage.camera.position.z = baseCamZ;
    }
    stage.scene.add(phone); stage.phone = phone;
    phone.rotation.set(pitch, yaw, 0);
    stage.renderer.render(stage.scene, stage.camera);
  }
  await build(modelKey, opts.photos);

  // public: swap in / out user photos at runtime, with an intro spin
  stage.setPhotos = async (photos)=>{ await build(stage._model, photos); yaw=baseYaw; introActive=true; };
  stage.setModel  = async (m, photos)=>{ stage._model=m; await build(m, photos); };

  canvas.style.touchAction = 'pan-y';
  canvas.style.cursor = 'grab';
  const down = (e)=>{ dragging=true; moved=0; lastX=e.clientX; lastY=e.clientY; vYaw=0; canvas.style.cursor='grabbing'; try{ canvas.setPointerCapture(e.pointerId); }catch(_){}} ;
  const move = (e)=>{ if(!dragging) return; const dx=e.clientX-lastX, dy=e.clientY-lastY; lastX=e.clientX; lastY=e.clientY; moved+=Math.abs(dx)+Math.abs(dy);
    yaw += dx*0.012; vYaw = dx*0.012;
    pitch += dy*0.007; pitch = Math.max(-0.55, Math.min(0.55, pitch)); };
  const up = ()=>{ if(!dragging) return; dragging=false; canvas.style.cursor='grab'; };
  canvas.addEventListener('pointerdown', down);
  canvas.addEventListener('pointermove', move);
  canvas.addEventListener('pointerup', up);
  canvas.addEventListener('pointercancel', up);
  canvas.addEventListener('click', (e)=>{ if(moved>6){ e.preventDefault(); e.stopPropagation(); } });

  introActive = !!opts.autoIntro;

  stage.frame=(now)=>{
    const t=(now-start)/1000;
    const phone=stage.phone; if(!phone) return;
    if(!dragging){
      if(introActive){
        const p = Math.min(1,(now-start)/4200);
        const eased = p<0.5 ? 2*p*p : 1-Math.pow(-2*p+2,2)/2;
        yaw = baseYaw + eased*Math.PI*2;
        if(p>=1){ introActive=false; yaw=baseYaw; }
      } else {
        yaw += vYaw; vYaw *= 0.94; if(Math.abs(vYaw)<0.0002) vYaw=0;
        pitch += (basePitch - pitch)*0.02;
      }
    }
    phone.position.y = Math.sin(t*1.0)*0.05;
    phone.rotation.y = yaw + (dragging?0:Math.sin(t*0.5)*0.02);
    phone.rotation.x = pitch + (dragging?0:Math.sin(t*0.75)*0.013);
    phone.rotation.z = dragging?0:Math.sin(t*0.55)*0.012;
    stage.renderer.render(stage.scene, stage.camera);
  };
  stage.active = opts.active!==false;
  registerStage(stage);
  return stage;
}

/* ---------- localStorage helpers for user photos ---------- */
export function photoKey(model){ return 'zt-photos-'+model; }
export function loadPhotos(model){
  try{ const raw=localStorage.getItem(photoKey(model)); return raw?JSON.parse(raw):null; }catch(e){ return null; }
}
export function savePhotos(model, photos){
  try{ localStorage.setItem(photoKey(model), JSON.stringify(photos)); }catch(e){}
}
export function clearPhotos(model){
  try{ localStorage.removeItem(photoKey(model)); }catch(e){}
}
