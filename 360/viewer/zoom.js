(function(){
  const scene = document.querySelector('a-scene');
  const range = document.getElementById('zoom-range');
  const inBtn = document.getElementById('zoom-in');
  const outBtn = document.getElementById('zoom-out');
  const valueLabel = document.getElementById('zoom-value');
  let minFov = 30, maxFov = 100;

  function setFov(fov){
    const camera = scene.camera;
    if(!camera) return;
    fov = Math.max(minFov, Math.min(maxFov, fov));
    camera.fov = fov;
    camera.updateProjectionMatrix();
    range.value = Math.round(fov);
    valueLabel.textContent = Math.round(fov);
  }

  function init(){
    const cam = scene.camera;
    const startFov = (cam && cam.fov) ? cam.fov : 80;
    range.min = minFov; range.max = maxFov; range.step = 1;
    range.value = Math.round(startFov);
    valueLabel.textContent = Math.round(startFov);
    setFov(startFov);
  }

  scene.addEventListener('loaded', ()=>{
    init();

    range.addEventListener('input', (e)=> setFov(Number(e.target.value)));
    inBtn.addEventListener('click', ()=> setFov(Number(range.value) - 5));
    outBtn.addEventListener('click', ()=> setFov(Number(range.value) + 5));

    // Wheel to zoom (desktop)
    window.addEventListener('wheel', (e)=>{
      if(Math.abs(e.deltaY) < 1) return;
      const delta = e.deltaY > 0 ? 2 : -2;
      setFov(Number(range.value) + delta);
    }, {passive:true});

    // Basic pinch to zoom (mobile)
    let lastDist = null;
    window.addEventListener('touchstart', (e)=>{ if(e.touches.length===2){ lastDist = getDist(e.touches); } });
    window.addEventListener('touchmove', (e)=>{
      if(e.touches.length!==2) return;
      const d = getDist(e.touches);
      if(lastDist){
        const diff = lastDist - d;
        setFov(Number(range.value) + diff*0.05);
      }
      lastDist = d;
    }, {passive:true});
    window.addEventListener('touchend', ()=>{ lastDist = null; });

    // Fullscreen toggle (custom button top-right)
    const fsBtn = document.getElementById('fullscreen-btn');
    function updateFsLabel(){ fsBtn.textContent = document.fullscreenElement ? '⤡' : '⤢'; }
    fsBtn.addEventListener('click', ()=>{
      if(!document.fullscreenElement){ document.documentElement.requestFullscreen().catch(()=>{}); }
      else { document.exitFullscreen().catch(()=>{}); }
    });
    document.addEventListener('fullscreenchange', updateFsLabel);
    updateFsLabel();
  });

  function getDist(touches){
    const a = touches[0], b = touches[1];
    const dx = a.clientX - b.clientX, dy = a.clientY - b.clientY;
    return Math.hypot(dx,dy);
  }
})();
