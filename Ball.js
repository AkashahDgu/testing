import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// WebGL check
function webgl() { try { const c = document.createElement('canvas'); return !!(window.WebGLRenderingContext && (c.getContext('webgl') || c.getContext('experimental-webgl'))); } catch (e) { return false; } }
if (!webgl()) document.getElementById('no-webgl').style.display = 'block';

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setClearColor(0x111111);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 100);
camera.position.set(0, 5, 7); // good default so ball is in view
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableRotate = false; controls.enableZoom = false; controls.autoRotate = false;
scene.background = new THREE.Color(0x0b0b0b);
	scene.add(new THREE.HemisphereLight(0xffffff, 0x444444, 1.2));
	scene.add(new THREE.AmbientLight(0xffffff, 0.7));
	const dLight = new THREE.DirectionalLight(0xffffff, 1.6);
dLight.position.set(5, 5, 5);
	dLight.castShadow = true;
scene.add(dLight);

// ~~~ Texture (compact Voronoi style) ~~~
function makeTex(w=1024,h=512){ const c=document.createElement('canvas'); c.width=w; c.height=h; const ctx=c.getContext('2d'); ctx.fillStyle='#fff'; ctx.fillRect(0,0,w,h);
 const N=42, seeds=[]; for(let i=0;i<N;i++){ const t=(i+0.5)/N, z=1-2*t, r=Math.sqrt(Math.max(0,1-z*z)), theta=2*Math.PI*i/((1+Math.sqrt(5))/2), x=Math.cos(theta)*r, y=Math.sin(theta)*r; seeds.push({x,y,z}); }
 const black=new Set([...Array(12)].map((_,k)=>Math.floor(k*N/12)));
 const img=ctx.createImageData(w,h), data=img.data, L=new THREE.Vector3(0.6,0.8,0.3).normalize();
 for(let j=0;j<h;j++){ const v=1-(j+0.5)/h, lat=Math.PI/2 - v*Math.PI; for(let i=0;i<w;i++){ const u=(i+0.5)/w, lon=u*2*Math.PI - Math.PI, vx=Math.cos(lat)*Math.cos(lon), vy=Math.cos(lat)*Math.sin(lon), vz=Math.sin(lat); let best=-1,bDot=-2,second=-2; for(let s=0;s<seeds.length;s++){ const sd=seeds[s], dot=vx*sd.x+vy*sd.y+vz*sd.z; if(dot>bDot){second=bDot; bDot=dot; best=s;} else if(dot>second) second=dot; }
 const seam=(bDot-second)<0.02, blackpatch=black.has(best); let rcol=blackpatch?20:250,gcol=blackpatch?20:250,bcol=blackpatch?20:250; const ndot=Math.max(0,vx*L.x+vy*L.y+vz*L.z), shade=0.15*ndot; if(blackpatch){ rcol=Math.max(0,rcol-100*shade); gcol=Math.max(0,gcol-100*shade); bcol=Math.max(0,bcol-100*shade);} else { rcol=Math.min(255,rcol-30*(1-ndot)); gcol=Math.min(255,gcol-30*(1-ndot)); bcol=Math.min(255,bcol-30*(1-ndot)); }
 if(seam){ rcol=Math.max(10,rcol-120); gcol=Math.max(10,gcol-120); bcol=Math.max(10,bcol-120);} const idx=(j*w+i)*4; data[idx]=rcol; data[idx+1]=gcol; data[idx+2]=bcol; data[idx+3]=255; }} ctx.putImageData(img,0,0); try{ ctx.filter='blur(0.4px)'; ctx.drawImage(c,0,0); ctx.filter='none'; } catch(e){} const tex=new THREE.CanvasTexture(c); tex.anisotropy=4; tex.generateMipmaps=true; tex.needsUpdate=true; return tex; }

const soccerTex = makeTex();
const ball = new THREE.Mesh(
	new THREE.SphereGeometry(1,64,64),
	new THREE.MeshStandardMaterial({ map: soccerTex, roughness: 0.6, metalness: 0.05 })
);
ball.position.set(0, 1.0, 0);
scene.add(ball);
ball.castShadow = true;
// outline helper and axes so the ball is visible against dark background
const outline = new THREE.Mesh(new THREE.SphereGeometry(1.02, 32, 32), new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true, opacity: 0.85, transparent: true }));
ball.add(outline);
const axes = new THREE.AxesHelper(1.6);
ball.add(axes);

const arenaSize = 80; const ground = new THREE.Mesh(new THREE.PlaneGeometry(arenaSize,arenaSize), new THREE.MeshStandardMaterial({color:0x101216})); ground.rotation.x=-Math.PI/2; ground.receiveShadow = true; scene.add(ground);
scene.add(new THREE.GridHelper(arenaSize, arenaSize/2, 0x222233,0x121218));

// Mini-map camera (top-down orthographic)
let miniMapSize = Math.min(220, Math.floor(Math.min(window.innerWidth, window.innerHeight) * 0.2));
const halfArena = arenaSize / 2;
const miniCam = new THREE.OrthographicCamera(-halfArena, halfArena, halfArena, -halfArena, 0.1, 200);
miniCam.position.set(0, 150, 0); // high above
miniCam.lookAt(0, 0, 0);
miniCam.up.set(0, 0, -1); // set up so +z is upwards visually

// controls & movement
const ballRadius = 1, vel=new THREE.Vector3(), accel=10, maxS=6, friction=6; let autoRotate=false;
const keys={forward:false,back:false,left:false,right:false,shift:false,space:false};
const hint=document.getElementById('hint'); if(hint) hint.textContent='Drag mouse to look — WASD/arrows. Shift speed. Space jump.';
// mouse camera
const mouse={x:0,y:0,drag:false}, camE={x:-0.35,y:0}, camDist=10, sens=0.005;
renderer.domElement.addEventListener('mousedown',e=>{ mouse.drag=true; mouse.x=e.clientX; mouse.y=e.clientY; });
renderer.domElement.addEventListener('mousemove',e=>{ if(mouse.drag){ const dx=e.clientX-mouse.x, dy=e.clientY-mouse.y; camE.y+=dx*sens; camE.x+=dy*sens; camE.x=Math.max(-Math.PI/2.5,Math.min(Math.PI/2.5, camE.x)); mouse.x=e.clientX; mouse.y=e.clientY } });
['mouseup','mouseleave'].forEach(n=>renderer.domElement.addEventListener(n,()=>mouse.drag=false));
function down(e){ const k=e.key.toLowerCase(); if(k==='w'||e.key==='ArrowUp') keys.forward=true; if(k==='s'||e.key==='ArrowDown') keys.back=true; if(k==='a'||e.key==='ArrowLeft') keys.left=true; if(k==='d'||e.key==='ArrowRight') keys.right=true; if(e.key==='Shift') keys.shift=true; if(e.key===' '){ keys.space=true; e.preventDefault(); } }
function up(e){ const k=e.key.toLowerCase(); if(k==='w'||e.key==='ArrowUp') keys.forward=false; if(k==='s'||e.key==='ArrowDown') keys.back=false; if(k==='a'||e.key==='ArrowLeft') keys.left=false; if(k==='d'||e.key==='ArrowRight') keys.right=false; if(e.key==='Shift') keys.shift=false; if(e.key===' ') keys.space=false; }
window.addEventListener('keydown',down); window.addEventListener('keyup',up);

const clock=new THREE.Clock(); let vY=0, G=20, J=12; const onGround=()=>Math.abs(ball.position.y-ballRadius)<0.05;

function animate(){ const dt=Math.min(0.05, clock.getDelta()); requestAnimationFrame(animate);
 if(keys.space && onGround()){ vY=J; keys.space=false; }
 vY -= G*dt; ball.position.y += vY*dt; if(ball.position.y<ballRadius){ ball.position.y=ballRadius; vY=0; }
 const inV=new THREE.Vector3(); if(keys.forward) inV.z-=1; if(keys.back) inV.z+=1; if(keys.left) inV.x-=1; if(keys.right) inV.x+=1;
 if(inV.lengthSq()>0){ inV.normalize(); const camF=new THREE.Vector3(); camera.getWorldDirection(camF); camF.y=0; camF.normalize(); const camR=new THREE.Vector3().crossVectors(camF, new THREE.Vector3(0,1,0)).normalize(); const Dir=new THREE.Vector3(); Dir.addScaledVector(camF,-inV.z); Dir.addScaledVector(camR,inV.x); Dir.normalize(); const ac = keys.shift?accel*1.8:accel, ms = keys.shift?maxS*1.5:maxS; vel.addScaledVector(Dir, ac*dt); const h=new THREE.Vector3(vel.x,0,vel.z), sp=h.length(); if(sp>ms){ h.multiplyScalar(ms/sp); vel.x=h.x; vel.z=h.z; } autoRotate=false; } else { const h=new THREE.Vector3(vel.x,0,vel.z), sp=h.length(); if(sp>0){ const dec=Math.max(0, sp-friction*dt); h.multiplyScalar(dec/sp); vel.x=h.x; vel.z=h.z; } if(Math.abs(vel.x)<0.001 && Math.abs(vel.z)<0.001){ vel.x=0; vel.z=0; } }
 const disp = vel.clone().multiplyScalar(dt); if(disp.lengthSq()>0){ const axis=new THREE.Vector3(disp.z,0,-disp.x).normalize(); const ang=disp.length()/ballRadius; ball.rotateOnWorldAxis(axis,ang); }
 ball.position.add(disp);
 const half=arenaSize/2-ballRadius-0.1; ball.position.x=Math.max(-half,Math.min(half,ball.position.x)); ball.position.z=Math.max(-half,Math.min(half,ball.position.z));
 // camera
 const cx=Math.cos(camE.x), sx=Math.sin(camE.x), cy=Math.cos(camE.y), sy=Math.sin(camE.y); const offset=new THREE.Vector3(camDist*sy*cx, camDist*sx, camDist*cy*cx); camera.position.copy(ball.position).add(offset); camera.lookAt(ball.position.clone().add(new THREE.Vector3(0,1.5,0))); controls.target.copy(ball.position); controls.update();
 renderer.render(scene,camera);
 // draw mini-map to top-left using orthographic camera
 const margin = 10; const mm = Math.floor(Math.min(miniMapSize, Math.min(window.innerWidth, window.innerHeight)*0.25));
 // flip Y coordinate for WebGL viewport origin (bottom-left)
 const left = margin;
 const bottom = window.innerHeight - margin - mm;
 renderer.clearDepth();
 renderer.setScissorTest(true);
 renderer.setScissor(left, bottom, mm, mm);
 renderer.setViewport(left, bottom, mm, mm);
 // render with miniCam: center camera to arena so it always shows whole arena
 miniCam.position.set(0, 150, 0);
 miniCam.updateProjectionMatrix();
 renderer.render(scene, miniCam);
 renderer.setScissorTest(false);
}
console.log('Ball scene ready');
animate();

window.addEventListener('resize',()=>{ camera.aspect=innerWidth/innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth,innerHeight);
	// also update minimap size and camera
	const newSize = Math.min(220, Math.floor(Math.min(window.innerWidth, window.innerHeight) * 0.2));
	miniMapSize = newSize; // reassign dynamic
	const half = arenaSize/2; miniCam.left = -half; miniCam.right = half; miniCam.top = half; miniCam.bottom = -half; miniCam.updateProjectionMatrix();
});
renderer.domElement.addEventListener('dblclick',()=>{ autoRotate=!autoRotate; });
