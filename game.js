(() => {
  const canvas = document.getElementById('game');
  const ui = document.getElementById('ui');
  const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  let W = 0, H = 0, ctx = null;

  function resize() {
    W = Math.floor(window.innerWidth * dpr);
    H = Math.floor(window.innerHeight * dpr);
    canvas.width = W;
    canvas.height = H;
    canvas.style.width = (W / dpr) + 'px';
    canvas.style.height = (H / dpr) + 'px';
    ctx = canvas.getContext('2d');
  }
  window.addEventListener('resize', resize, {passive: true});
  resize();

  const GRAVITY = 0.0022;
  const JUMP_VELOCITY = -0.9;
  const GROUND_H = 0.14;
  const SPEED = 0.36;
  const OBST_MIN = 240;
  const OBST_MAX = 1100;

  let started = false;
  let over = false;
  let score = 0;
  let best = 0;
  let lastTime = 0;
  let holdJump = false;

  const player = { x: 0, y: 0, w: 0, h: 0, vy: 0, onGround: true };
  const obstacles = [];

  function reset() {
    over = false;
    score = 0;
    lastTime = performance.now();
    obstacles.length = 0;
    player.w = Math.floor(Math.min(W, H) * 0.065);
    player.h = Math.floor(player.w * 0.86);
    player.x = Math.floor(W * 0.16);
    player.y = groundY() - player.h;
    player.vy = 0;
    player.onGround = true;
    spawnTimer = rand(500, 1200);
  }

  function groundY(){ return Math.floor(H * (1 - GROUND_H)); }

  function drawBackground() {
    const grad = ctx.createLinearGradient(0,0,0,H);
    grad.addColorStop(0, '#0b0e14');
    grad.addColorStop(1, '#141a24');
    ctx.fillStyle = grad;
    ctx.fillRect(0,0,W,H);
    ctx.fillStyle = '#1e2533';
    ctx.fillRect(0, groundY(), W, H - groundY());
    const n = 40;
    ctx.globalAlpha = 0.25;
    for (let i=0;i<n;i++) {
      const x = (i * 97 % W);
      const y = (i * 229 % groundY());
      ctx.fillRect(x, y, 2, 2);
    }
    ctx.globalAlpha = 1;
  }

  function drawFrenchie() {
    const x = player.x, y = player.y, w = player.w, h = player.h;
    const lilac = '#b4a9bd';
    const lilacShadow = '#9e93a8';
    const tan = '#c9a57a';
    const innerEar = '#d6c3e0';
    const nose = '#3a3542';
    const eye = '#1c1b20';
    const white = '#ffffff';
    const gold = '#d4af37';

    // Body
    const bodyW = w * 0.9, bodyH = h * 0.65;
    const bodyX = x + (w - bodyW) * 0.5;
    const bodyY = y + h - bodyH;
    roundRect(ctx, bodyX, bodyY, bodyW, bodyH, Math.min(w,h)*0.12, lilac);
    roundRect(ctx, bodyX, bodyY + bodyH*0.45, bodyW, bodyH*0.55, Math.min(w,h)*0.12, lilacShadow);
    roundRect(ctx, bodyX + bodyW*0.2, bodyY + bodyH*0.45, bodyW*0.6, bodyH*0.35, w*0.08, tan);

    // Head
    const headW = w * 0.98, headH = h * 0.6;
    const headX = x + (w - headW) * 0.5;
    const headY = y + h - bodyH - headH + h*0.08;
    roundRect(ctx, headX, headY, headW, headH, w*0.12, lilac);

    // Muzzle
    const muzW = headW * 0.48, muzH = headH * 0.42;
    const muzX = headX + headW*0.26, muzY = headY + headH*0.42;
    roundRect(ctx, muzX, muzY, muzW, muzH, w*0.08, lilacShadow);
    ctx.fillStyle = nose;
    ctx.fillRect(muzX + muzW*0.45, muzY + muzH*0.05, muzW*0.1, muzH*0.14);
    ctx.fillRect(muzX + muzW*0.48, muzY + muzH*0.24, muzW*0.04, muzH*0.4);

    // Eyes
    ctx.fillStyle = eye;
    circle(headX + headW*0.28, headY + headH*0.45, w*0.07);
    circle(headX + headW*0.72, headY + headH*0.45, w*0.07);
    ctx.fillStyle = white;
    circle(headX + headW*0.25, headY + headH*0.43, w*0.02);
    circle(headX + headW*0.69, headY + headH*0.43, w*0.02);

    // Ears
    ear(ctx, headX + headW*0.18, headY - headH*0.05, w*0.28, h*0.34, lilac, innerEar);
    ear(ctx, headX + headW*0.82 - w*0.28, headY - headH*0.05, w*0.28, h*0.34, lilac, innerEar);

    // Tan points
    roundRect(ctx, headX + headW*0.18, headY + headH*0.42, w*0.16, w*0.12, w*0.06, tan);
    roundRect(ctx, headX + headW*0.66, headY + headH*0.42, w*0.16, w*0.12, w*0.06, tan);

    // Gold collar
    const colY = bodyY - h*0.04;
    roundRect(ctx, bodyX + bodyW*0.05, colY, bodyW*0.9, h*0.06, h*0.02, gold);
    ctx.beginPath();
    ctx.arc(bodyX + bodyW*0.85, colY + h*0.03, h*0.02, 0, Math.PI*2);
    ctx.fillStyle = '#f4e389';
    ctx.fill();
  }

  function roundRect(ctx, x, y, w, h, r, color){
    ctx.fillStyle = color;
    const rr = Math.min(r, w/2, h/2);
    ctx.beginPath();
    ctx.moveTo(x+rr,y);
    ctx.arcTo(x+w,y,x+w,y+h,rr);
    ctx.arcTo(x+w,y+h,x,y+h,rr);
    ctx.arcTo(x,y+h,x,y,rr);
    ctx.arcTo(x,y,x+w,y,rr);
    ctx.closePath();
    ctx.fill();
  }
  function ear(ctx, x, y, w, h, outer, inner){
    roundRect(ctx, x, y, w, h, w*0.3, outer);
    ctx.fillStyle = inner;
    ctx.beginPath();
    ctx.moveTo(x + w*0.25, y + h*0.18);
    ctx.lineTo(x + w*0.5, y + h*0.8);
    ctx.lineTo(x + w*0.75, y + h*0.18);
    ctx.closePath();
    ctx.fill();
  }
  function circle(cx, cy, r){
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI*2);
    ctx.fill();
  }

  function drawObstacles(){
    ctx.fillStyle = '#ffdd55';
    for (const o of obstacles) ctx.fillRect(o.x, o.y, o.w, o.h);
  }

  function drawScore(){
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.font = `${Math.floor(32 * dpr)}px -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial`;
    ctx.textAlign = 'left';
    ctx.fillText(`Score: ${Math.floor(score)}`, Math.floor(16*dpr), Math.floor(40*dpr));
    ctx.textAlign = 'right';
    ctx.fillText(`Best: ${Math.floor(best)}`, W - Math.floor(16*dpr), Math.floor(40*dpr));
  }

  function rand(a,b){ return a + Math.random()*(b-a); }

  let spawnTimer = 800;
  function update(dt){
    player.vy += GRAVITY * dt * (holdJump ? 0.6 : 1.0);
    player.y += player.vy * dt;
    const gy = groundY() - player.h;
    if (player.y >= gy){
      player.y = gy;
      player.vy = 0;
      player.onGround = true;
    } else player.onGround = false;

    for (const o of obstacles) o.x -= SPEED * dt;
    while (obstacles.length && obstacles[0].x + obstacles[0].w < 0) obstacles.shift();

    spawnTimer -= dt;
    if (spawnTimer <= 0){
      const h = rand(player.h*0.7, player.h*1.8);
      const w = rand(player.w*0.6, player.w*1.2);
      obstacles.push({ x: W + w, y: groundY() - h, w, h });
      spawnTimer = rand(OBST_MIN, OBST_MAX);
    }

    for (const o of obstacles){
      if (player.x < o.x + o.w && player.x + player.w > o.x &&
          player.y < o.y + o.h && player.y + player.h > o.y){
        over = true;
      }
    }

    score += dt * 0.01;
    if (score > best) best = score;
  }

  function render(){
    drawBackground();
    drawObstacles();
    drawFrenchie();
    drawScore();

    if (over){
      ctx.fillStyle = 'rgba(0,0,0,0.45)';
      ctx.fillRect(0,0,W,H);
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.font = `${Math.floor(28*dpr)}px -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial`;
      ctx.fillText('Game Over', W/2, H/2 - 20*dpr);
      ctx.font = `${Math.floor(18*dpr)}px -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial`;
      ctx.fillText('Tippe zum Neustart', W/2, H/2 + 12*dpr);
    }
  }

  function loop(t){
    const now = t || performance.now();
    let dt = now - lastTime;
    lastTime = now;
    if (started && !over) update(dt);
    render();
    requestAnimationFrame(loop);
  }
  requestAnimationFrame((t)=>{ lastTime = t; loop(t); });

  function jumpStart(){
    if (!started){
      started = true;
      ui.classList.add('hidden');
      reset();
      return;
    }
    if (over){
      reset();
      return;
    }
    if (player.onGround) player.vy = JUMP_VELOCITY;
    holdJump = true;
  }
  function jumpEnd(){ holdJump = false; }

  canvas.addEventListener('touchstart', (e)=>{ e.preventDefault(); jumpStart(); }, {passive:false});
  canvas.addEventListener('touchend', (e)=>{ e.preventDefault(); jumpEnd(); }, {passive:false});
  canvas.addEventListener('mousedown', (e)=>{ e.preventDefault(); jumpStart(); });
  canvas.addEventListener('mouseup', (e)=>{ e.preventDefault(); jumpEnd(); });
})();