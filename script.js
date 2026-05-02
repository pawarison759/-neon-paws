const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const timerEl = document.getElementById('timer');
const overlay = document.getElementById('overlay');
const gameOverEl = document.getElementById('game-over');
const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');
const finalScoreEl = document.getElementById('final-score');
const leaderboardList = document.getElementById('leaderboard-list');
const leaderboardInputSection = document.getElementById('leaderboard-input-section');
const playerNameInput = document.getElementById('player-name');
const saveScoreBtn = document.getElementById('save-score-btn');

// Game State
let score = 0;
let timeLeft = 60;
let gameActive = false;
let animationId = null;
let timerInterval = null;

// Assets
const catSVG = `data:image/svg+xml;base64,${btoa(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <filter id="g"><feGaussianBlur stdDeviation="3"/></filter>
  <path d="M30 80 Q50 90 70 80 L75 50 Q75 30 60 20 L55 5 L45 5 L40 20 Q25 30 25 50 Z" fill="none" stroke="#00f2ff" stroke-width="4" filter="url(#g)"/>
  <path d="M30 80 Q50 90 70 80 L75 50 Q75 30 60 20 L55 5 L45 5 L40 20 Q25 30 25 50 Z" fill="none" stroke="#00f2ff" stroke-width="2"/>
  <circle cx="40" cy="40" r="3" fill="#00f2ff" /><circle cx="60" cy="40" r="3" fill="#00f2ff" />
</svg>`)}`;

const mouseSVG = `data:image/svg+xml;base64,${btoa(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <filter id="g2"><feGaussianBlur stdDeviation="2"/></filter>
  <ellipse cx="50" cy="60" rx="30" ry="20" fill="none" stroke="#ff007a" stroke-width="5" filter="url(#g2)"/>
  <ellipse cx="50" cy="60" rx="30" ry="20" fill="none" stroke="#ff007a" stroke-width="2"/>
  <circle cx="35" cy="40" r="15" fill="none" stroke="#ff007a" stroke-width="3" />
  <circle cx="65" cy="40" r="15" fill="none" stroke="#ff007a" stroke-width="3" />
</svg>`)}`;

const catImg = new Image(); catImg.src = catSVG;
const mouseImg = new Image(); mouseImg.src = mouseSVG;

// DPI Scaling
function resize() {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    canvas.style.width = window.innerWidth + 'px';
    canvas.style.height = window.innerHeight + 'px';
    ctx.scale(dpr, dpr);
}
window.addEventListener('resize', resize);
resize();

// Input
const keys = new Set();
window.addEventListener('keydown', e => keys.add(e.code));
window.addEventListener('keyup', e => keys.delete(e.code));

class Particle {
    constructor(x, y, color) {
        this.x = x; this.y = y;
        this.size = Math.random() * 4 + 2;
        this.vx = (Math.random() - 0.5) * 10;
        this.vy = (Math.random() - 0.5) * 10;
        this.color = color; this.alpha = 1;
    }
    update() {
        this.x += this.vx; this.y += this.vy;
        this.alpha -= 0.02;
    }
    draw() {
        ctx.globalAlpha = this.alpha;
        ctx.fillStyle = this.color;
        ctx.beginPath(); ctx.arc(this.x, this.y, this.size, 0, Math.PI*2); ctx.fill();
        ctx.globalAlpha = 1;
    }
}

class Player {
    constructor() { this.reset(); this.size = 80; }
    reset() { this.x = window.innerWidth/2; this.y = window.innerHeight/2; this.angle = 0; }
    update() {
        let dx = 0, dy = 0;
        if (keys.has('ArrowUp') || keys.has('KeyW')) dy -= 1;
        if (keys.has('ArrowDown') || keys.has('KeyS')) dy += 1;
        if (keys.has('ArrowLeft') || keys.has('KeyA')) dx -= 1;
        if (keys.has('ArrowRight') || keys.has('KeyD')) dx += 1;
        
        if (dx !== 0 || dy !== 0) {
            const mag = Math.hypot(dx, dy);
            this.angle = Math.atan2(dy, dx);
            this.x += (dx / mag) * 9;
            this.y += (dy / mag) * 9;
        }
        
        // Clamp with padding
        const pad = this.size/2;
        this.x = Math.max(pad, Math.min(window.innerWidth - pad, this.x));
        this.y = Math.max(pad, Math.min(window.innerHeight - pad, this.y));
    }
    draw() {
        ctx.save(); ctx.translate(this.x, this.y); ctx.rotate(this.angle + Math.PI/2);
        ctx.shadowBlur = 20; ctx.shadowColor = '#00f2ff';
        ctx.drawImage(catImg, -this.size/2, -this.size/2, this.size, this.size);
        ctx.restore();
    }
}

class Mouse {
    constructor() { this.reset(); this.size = 40; }
    reset() {
        this.x = Math.random() * (window.innerWidth - 100) + 50;
        this.y = Math.random() * (window.innerHeight - 100) + 50;
        this.angle = Math.random() * Math.PI*2;
        this.speed = 3;
    }
    update(player) {
        const dX = this.x - player.x, dY = this.y - player.y;
        const dist = Math.hypot(dX, dY);
        
        if (dist < 200) {
            const fleeAngle = Math.atan2(dY, dX);
            this.angle += (fleeAngle - this.angle) * 0.1;
            this.speed = 6;
        } else {
            this.speed = 3;
            if (Math.random() < 0.02) this.angle += (Math.random() - 0.5);
        }
        
        this.x += Math.cos(this.angle) * this.speed;
        this.y += Math.sin(this.angle) * this.speed;
        
        // Bounce and Push back
        const pad = 40;
        if (this.x < pad) { this.x = pad; this.angle = 0; }
        if (this.x > window.innerWidth - pad) { this.x = window.innerWidth - pad; this.angle = Math.PI; }
        if (this.y < pad) { this.y = pad; this.angle = Math.PI/2; }
        if (this.y > window.innerHeight - pad) { this.y = window.innerHeight - pad; this.angle = -Math.PI/2; }
    }
    draw() {
        ctx.save(); ctx.translate(this.x, this.y); ctx.rotate(this.angle + Math.PI/2);
        ctx.shadowBlur = 15; ctx.shadowColor = '#ff007a';
        ctx.drawImage(mouseImg, -this.size/2, -this.size/2, this.size, this.size);
        ctx.restore();
    }
}

let player = new Player();
let mice = [];
let particles = [];

function startGame() {
    score = 0; timeLeft = 60;
    mice = Array.from({length: 8}, () => new Mouse());
    particles = [];
    player.reset();
    
    scoreEl.innerText = score;
    timerEl.innerText = timeLeft;
    overlay.classList.add('hidden');
    gameOverEl.classList.add('hidden');
    gameActive = true;
    
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        timeLeft--; timerEl.innerText = timeLeft;
        if (timeLeft <= 0) endGame();
    }, 1000);
    
    if (animationId) cancelAnimationFrame(animationId);
    loop();
}

function endGame() {
    gameActive = false;
    clearInterval(timerInterval);
    finalScoreEl.innerText = score;
    gameOverEl.classList.remove('hidden');
    displayLeaderboard();
}

function loop() {
    if (!gameActive) return;
    
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    
    // Draw Grid
    ctx.strokeStyle = 'rgba(112, 0, 255, 0.1)';
    ctx.lineWidth = 1;
    for(let i=0; i<window.innerWidth; i+=80) { ctx.beginPath(); ctx.moveTo(i,0); ctx.lineTo(i, window.innerHeight); ctx.stroke(); }
    for(let i=0; i<window.innerHeight; i+=80) { ctx.beginPath(); ctx.moveTo(0,i); ctx.lineTo(window.innerWidth, i); ctx.stroke(); }

    player.update();
    mice.forEach(m => {
        m.update(player);
        if (Math.hypot(player.x - m.x, player.y - m.y) < 50) {
            score += 10; scoreEl.innerText = score;
            for(let i=0; i<15; i++) particles.push(new Particle(m.x, m.y, '#ff007a'));
            m.reset();
        }
        m.draw();
    });
    
    player.draw();
    particles = particles.filter(p => p.alpha > 0);
    particles.forEach(p => { p.update(); p.draw(); });
    
    animationId = requestAnimationFrame(loop);
}

// Leaderboard
function getLeaderboard() { return JSON.parse(localStorage.getItem('neon_scores')) || []; }
function displayLeaderboard() {
    const list = getLeaderboard();
    leaderboardList.innerHTML = list.map((s,i) => `<li><span>#${i+1} ${s.n}</span><span>${s.s}</span></li>`).join('');
    if (score > 0 && (list.length < 5 || score > list[list.length-1].s)) leaderboardInputSection.classList.remove('hidden');
    else leaderboardInputSection.classList.add('hidden');
}

saveScoreBtn.onclick = () => {
    const list = getLeaderboard();
    list.push({n: playerNameInput.value || 'Cat', s: score});
    list.sort((a,b) => b.s - a.s);
    localStorage.setItem('neon_scores', JSON.stringify(list.slice(0,5)));
    leaderboardInputSection.classList.add('hidden');
    displayLeaderboard();
};

startBtn.onclick = startGame;
restartBtn.onclick = startGame;

displayLeaderboard();
ctx.fillStyle = 'white'; ctx.font = '20px Outfit'; ctx.textAlign = 'center';
ctx.fillText('กดปุ่มเริ่มเกมเพื่อสนุกกัน!', window.innerWidth/2, window.innerHeight/2 + 100);
