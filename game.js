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

  // Game state
  const GRAVITY = 0.0022;      // px/ms^2 scaled by dpr
  const JUMP_VELOCITY = -0.9;  // px/ms
  const GROUND_H = 0.14;       // fraction of H
  const SPEED = 0.35;          // obstacle speed px/ms
  const OBST_MIN = 240;        // min gap ms
  const OBST_MAX = 1200;       // max gap ms

  let started = false;
  let over = false;
  let score = 0;
  let best = 0;
  let lastTime = 0;
  let holdJump = false;

  // Player (a small bulldog-esque cube)
  const player = {
    x: 0,
    y: 0,
    w: 0,
    h: 0,
    vy: 0,
    onGround: true,
  };

  const obstacles = [];
  function reset() {
    over = false;
    score = 0;
    lastTime = performance.now();
    obstacles.length = 0;
    // player size relative to screen
    player.w = Math.floor(Math.min(W, H) * 0.055);
    player.h = player.w;
    player.x = Math.floor(W * 0.16);
    player.y = groundY() - player.h;
    player.vy = 0;
    player.onGround = true;
    spawnTimer = rand(500, 1200);
  }

  function groundY() {
    return Math.floor(H * (1 - GROUND_H));
  }

  function drawBackground() {
    // Gradient sky
    const grad = ctx.createLinearGradient(0,0,0,H);
    grad.addColorStop(0, '#0b0e14');
    grad.addColorStop(1, '#141a24');
    ctx.fillStyle = grad;
    ctx.fillRect(0,0,W,H);

    // Ground
    ctx.fillStyle = '#1e2533';
    ctx.fillRect(0, groundY(), W, H - groundY());

    // Stars/particles
    const n = 40;
    ctx.globalAlpha = 0.25;
    for (let i=0;i<n;i++) {
      const x = (i * 97 % W);
      const y = (i * 229 % groundY());
      ctx.fillRect(x, y, 2, 2);
    }
    ctx.globalAlpha = 1;
  }

  function drawPlayer() {
    // Body
    ctx.fillStyle = '#d9d9e0';
    ctx.fillRect(player.x, player.y, player.w, player.h);
    // Ears
    ctx.fillStyle = '#c0c0c8';
    ctx.fillRect(player.x + player.w*0.1, player.y - player.h*0.2, player.w*0.22, player.h*0.2);
    ctx.fillRect(player.x + player.w*0.68, player.y - player.h*0.2, player.w*0.22, player.h*0.2);
    // Eye
    ctx.fillStyle = '#222';
    ctx.fillRect(player.x + player.w*0.65, player.y + player.h*0.35, player.w*0.12, player.w*0.12);
    // Collar
    ctx.fillStyle = '#6a5acd';
    ctx.fillRect(player.x, player.y + player.h*0.75, player.w, player.h*0.1);
  }

  function drawObstacles() {
    ctx.fillStyle = '#ffdd55';
    for (const o of obstacles) {
      ctx.fillRect(o.x, o.y, o.w, o.h);
    }
  }

  function drawScore() {
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.font = `${Math.floor(32 * dpr)}px -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica, Arial`;
    ctx.textAlign = 'left';
    ctx.fillText(`Score: ${Math.floor(score)}`, Math.floor(16*dpr), Math.floor(40*dpr));
    ctx.textAlign = 'right';
    ctx.fillText(`Best: ${Math.floor(best)}`, W - Math.floor(16*dpr), Math.floor(40*dpr));
  }

  function rand(a,b){ return a + Math.random()*(b-a); }

  let spawnTimer = 800;
  function update(dt) {
    // Player physics
    player.vy += GRAVITY * dt * (holdJump ? 0.6 : 1.0);
    player.y += player.vy * dt;
    const gy = groundY() - player.h;
    if (player.y >= gy) {
      player.y = gy;
      player.vy = 0;
      player.onGround = true;
    } else {
      player.onGround = false;
    }

    // Obstacles
    for (const o of obstacles) {
      o.x -= SPEED * dt;
    }
    // Remove off-screen
    while (obstacles.length && obstacles[0].x + obstacles[0].w < 0) obstacles.shift();

    spawnTimer -= dt;
    if (spawnTimer <= 0) {
      const h = rand(player.h*0.7, player.h*1.8);
      const w = rand(player.w*0.6, player.w*1.2);
      obstacles.push({
        x: W + w,
        y: groundY() - h,
        w, h
      });
      spawnTimer = rand(OBST_MIN, OBST_MAX);
    }

    // Collision
    for (const o of obstacles) {
      if (player.x < o.x + o.w && player.x + player.w > o.x &&
          player.y < o.y + o.h && player.y + player.h > o.y) {
        over = true;
      }
    }

    // Score
    score += dt * 0.01;
    if (score > best) best = score;
  }

  function render() {
    drawBackground();
    drawObstacles();
    drawPlayer();
    drawScore();

    if (over) {
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

  function loop(t) {
    const now = t || performance.now();
    let dt = now - lastTime;
    lastTime = now;
    if (started && !over) update(dt);
    render();
    requestAnimationFrame(loop);
  }
  requestAnimationFrame((t)=>{ lastTime = t; loop(t); });

  // Input: tap/hold to jump
  function jumpStart() {
    if (!started) {
      started = true;
      ui.classList.add('hidden');
      reset();
      return;
    }
    if (over) {
      reset();
      return;
    }
    if (player.onGround) {
      player.vy = JUMP_VELOCITY;
    }
    holdJump = true;
  }
  function jumpEnd() {
    holdJump = false;
  }

  canvas.addEventListener('touchstart', (e)=>{ e.preventDefault(); jumpStart(); }, {passive:false});
  canvas.addEventListener('touchend', (e)=>{ e.preventDefault(); jumpEnd(); }, {passive:false});
  canvas.addEventListener('mousedown', (e)=>{ e.preventDefault(); jumpStart(); });
  canvas.addEventListener('mouseup', (e)=>{ e.preventDefault(); jumpEnd(); });
})();