/**
 * aimGameEngine.js
 * Aim Trainer Logic
 */
class AimGameEngine {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.isGameActive = false;

        this.score = 0;
        this.timeLeft = 60;
        this.totalClicks = 0;
        this.hits = 0;

        this.target = {
            x: 0,
            y: 0,
            radius: 30,
            color: '#ff3333',
            active: false
        };

        this.particles = []; // Hit effects

        this.onScoreUpdate = null;
        this.onTimeUpdate = null;
        this.onGameEnd = null;

        this.timerInterval = null;
    }

    start(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');

        this.score = 0;
        this.timeLeft = 60;
        this.totalClicks = 0; // for accuracy stats later if needed
        this.hits = 0;
        this.isGameActive = true;

        this.spawnTarget();
        this.startTimer();

        this.updateUI();
    }

    stop() {
        this.isGameActive = false;
        if (this.timerInterval) clearInterval(this.timerInterval);

        // Final Score display
        if (this.onGameEnd) {
            this.onGameEnd(this.score);
        }

        this.draw(); // Draw Game Over screen
    }

    update() {
        // Update Particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.alpha -= 0.05;

            if (p.alpha <= 0) {
                this.particles.splice(i, 1);
            }
        }
    }

    draw() {
        if (!this.ctx) return;

        // Clear background
        this.ctx.fillStyle = '#1e1e2e'; // Dark background
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw Particles
        for (const p of this.particles) {
            this.ctx.globalAlpha = p.alpha;
            this.ctx.fillStyle = p.color;
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.globalAlpha = 1.0;
        }

        if (this.isGameActive) {
            // Draw Target
            if (this.target.active) {
                this.ctx.beginPath();
                this.ctx.arc(this.target.x, this.target.y, this.target.radius, 0, Math.PI * 2);
                this.ctx.fillStyle = this.target.color;
                this.ctx.fill();

                // Bullseye rings
                this.ctx.beginPath();
                this.ctx.arc(this.target.x, this.target.y, this.target.radius * 0.6, 0, Math.PI * 2);
                this.ctx.fillStyle = 'white';
                this.ctx.fill();

                this.ctx.beginPath();
                this.ctx.arc(this.target.x, this.target.y, this.target.radius * 0.3, 0, Math.PI * 2);
                this.ctx.fillStyle = '#ff3333';
                this.ctx.fill();
            }
        } else {
            // Game Over Screen
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

            this.ctx.fillStyle = '#00d2ff';
            this.ctx.font = 'bold 48px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText("Time's Up!", this.canvas.width / 2, this.canvas.height / 2 - 20);

            this.ctx.fillStyle = 'white';
            this.ctx.font = '24px Arial';
            this.ctx.fillText(`Final Score: ${this.score}`, this.canvas.width / 2, this.canvas.height / 2 + 40);

            // Ranking
            if (window.calculatePercentile) {
                const result = window.calculatePercentile('aimTrainer', this.score);
                this.ctx.fillStyle = '#ffcc00'; // Gold color
                this.ctx.font = '20px Arial';
                this.ctx.fillText(`Rank: ${result.tier} (Top ${100 - result.percentile}%)`, this.canvas.width / 2, this.canvas.height / 2 + 80);
            }
        }
    }

    spawnTarget() {
        const padding = this.target.radius + 10;
        const maxX = this.canvas.width - padding;
        const maxY = this.canvas.height - padding;
        const minX = padding;
        const minY = padding;

        this.target.x = Math.random() * (maxX - minX) + minX;
        this.target.y = Math.random() * (maxY - minY) + minY;
        this.target.active = true;
    }

    handleClick(x, y) {
        if (!this.isGameActive) return;

        this.totalClicks++;

        // Distance check
        const dx = x - this.target.x;
        const dy = y - this.target.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance <= this.target.radius) {
            // Hit!
            this.hits++;
            this.score += 1;

            // Spawn Particles
            this.createExplosion(x, y, this.target.color);

            // Spawn new target immediately
            this.spawnTarget();
        } else {
            // Miss!
        }

        this.updateUI();
    }

    startTimer() {
        if (this.timerInterval) clearInterval(this.timerInterval);
        this.timerInterval = setInterval(() => {
            this.timeLeft--;
            if (this.onTimeUpdate) this.onTimeUpdate(this.timeLeft);

            if (this.timeLeft <= 0) {
                this.stop();
            }
        }, 1000);
    }

    updateUI() {
        if (this.onScoreUpdate) this.onScoreUpdate(this.score);
        if (this.onTimeUpdate) this.onTimeUpdate(this.timeLeft);
    }

    // Callbacks
    setScoreCallback(cb) { this.onScoreUpdate = cb; }
    setTimeCallback(cb) { this.onTimeUpdate = cb; }
    setGameEndCallback(cb) { this.onGameEnd = cb; }

    createExplosion(x, y, color) {
        for (let i = 0; i < 10; i++) {
            this.particles.push({
                x: x,
                y: y,
                vx: (Math.random() - 0.5) * 8,
                vy: (Math.random() - 0.5) * 8,
                radius: Math.random() * 4 + 2,
                color: color,
                alpha: 1.0
            });
        }
    }
}

window.AimGameEngine = AimGameEngine;
