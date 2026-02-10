/**
 * moveGameEngine.js
 * Movement Trainer Logic
 */
class MoveGameEngine {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.isGameActive = false;

        this.survivalTime = 0;
        this.startTime = 0;

        // Player
        this.player = {
            x: 0,
            y: 0,
            width: 30,
            height: 30,
            speed: 5,
            color: '#00d2ff',
            isJumping: false,
            jumpHeight: 0,
            jumpVelocity: 0,
            isSliding: false,
            vx: 0,
            vy: 0
        };

        // Input State
        this.keys = {
            w: false, a: false, s: false, d: false,
            space: false, c: false
        };

        this.bullets = [];
        this.bulletSpawnTimer = 0;
        this.bulletSpawnInterval = 1000; // Initial spawn rate

        this.onTimeUpdate = null;
        this.onGameEnd = null;

        this.animationId = null;
    }

    start(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');

        this.resetGame();
        this.isGameActive = true;
        this.startTime = Date.now();

        this.updateUI();
    }

    resetGame() {
        this.player.x = this.canvas.width / 2 - 15;
        this.player.y = this.canvas.height / 2 - 15;
        this.player.vx = 0;
        this.player.vy = 0;
        this.bullets = [];
        this.survivalTime = 0;
        this.bulletSpawnInterval = 1000;
        this.bulletSpawnTimer = 0;
    }

    stop() {
        if (!this.isGameActive) return; // 이미 종료된 경우 중복 실행 방지 (재귀 호출 방지)

        this.isGameActive = false;
        const finalTime = ((Date.now() - this.startTime) / 1000).toFixed(2);

        if (this.onGameEnd) {
            this.onGameEnd(finalTime);
        }

        this.draw();
    }

    update(deltaTime) { // deltaTime in ms
        if (!this.isGameActive) return;

        // Time
        this.survivalTime = (Date.now() - this.startTime) / 1000;
        if (this.onTimeUpdate) this.onTimeUpdate(this.survivalTime.toFixed(2));

        // Difficulty Ramp up
        this.bulletSpawnInterval = Math.max(200, 1000 - (this.survivalTime * 20)); // Spawn faster over time

        // --- Player Movement ---

        // Speed modifier
        let currentSpeed = this.player.speed;
        if (this.player.isSliding) currentSpeed *= 1.5; // Slide is faster

        // Velocity (Simple WASD)
        this.player.vx = 0;
        this.player.vy = 0;

        if (this.keys.a) this.player.vx = -currentSpeed;
        if (this.keys.d) this.player.vx = currentSpeed;
        if (this.keys.w) this.player.vy = -currentSpeed;
        if (this.keys.s) this.player.vy = currentSpeed;

        // Diagonal normalization - Keep track of last direction for sliding
        if (this.player.vx !== 0 || this.player.vy !== 0) {
            // Normalize current input for direction tracking
            const mag = Math.sqrt(this.player.vx * this.player.vx + this.player.vy * this.player.vy);
            if (mag > 0) {
                this.player.lastDirX = this.player.vx / mag;
                this.player.lastDirY = this.player.vy / mag;
            }
        } else if (!this.player.lastDirX) {
            this.player.lastDirX = 0;
            this.player.lastDirY = -1; // Default facing up
        }

        // --- Slide / Crouch Logic ---
        this.player.isCrouching = false;
        this.player.isSliding = false;

        if (this.keys.c) {
            // If moving significantly (or WASD pressed), Slide. Else Crouch.
            if (this.keys.w || this.keys.a || this.keys.s || this.keys.d || Math.abs(this.player.vx) > 0.1 || Math.abs(this.player.vy) > 0.1) {
                this.player.isSliding = true;
                // Slide in the last known direction with high speed
                const slideSpeed = this.player.speed * 2.0;
                this.player.vx = this.player.lastDirX * slideSpeed;
                this.player.vy = this.player.lastDirY * slideSpeed;
            } else {
                this.player.isCrouching = true;
                this.player.vx = 0;
                this.player.vy = 0;
            }
        } else {
            // Diagonal normalization for normal movement
            if (this.player.vx !== 0 && this.player.vy !== 0) {
                this.player.vx *= 0.707;
                this.player.vy *= 0.707;
            }
        }

        // Apply Position
        this.player.x += this.player.vx;
        this.player.y += this.player.vy;

        // Boundary Check
        if (this.player.x < 0) this.player.x = 0;
        if (this.player.y < 0) this.player.y = 0;
        if (this.player.x + this.player.width > this.canvas.width) this.player.x = this.canvas.width - this.player.width;
        if (this.player.y + this.player.height > this.canvas.height) this.player.y = this.canvas.height - this.player.height;

        // --- Actions ---

        // Jump Logic (Space)
        if (this.keys.space && !this.player.isJumping && !this.player.isCrouching) {
            this.player.isJumping = true;
            this.player.jumpVelocity = 10;
        }

        if (this.player.isJumping) {
            this.player.jumpHeight += this.player.jumpVelocity;
            this.player.jumpVelocity -= 0.8; // Gravity

            if (this.player.jumpHeight <= 0) {
                this.player.jumpHeight = 0;
                this.player.isJumping = false;
                this.player.jumpVelocity = 0;
            }
        }

        // Slide Logic (C)
        this.player.isSliding = this.keys.c;

        // --- Bullets ---
        this.bulletSpawnTimer += deltaTime;
        if (this.bulletSpawnTimer > this.bulletSpawnInterval) {
            this.spawnBullet();
            this.bulletSpawnTimer = 0;
        }

        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const b = this.bullets[i];
            b.x += b.vx;
            b.y += b.vy;

            // Remove if out of bounds
            if (b.x < -50 || b.x > this.canvas.width + 50 || b.y < -50 || b.y > this.canvas.height + 50) {
                this.bullets.splice(i, 1);
                continue;
            }

            // Collision Detection
            // If Jumping, Player is "Airborne" -> immune to bullets? 
            // Let's make Jump = Invincible Frames for gameplay balance. (Dodge Roll effect)
            if (this.player.isJumping && this.player.jumpHeight > 10) {
                // Invincible (High enough)
                continue;
            }

            // Collision Box
            // Slide reduces hitbox height
            let pHeight = this.player.height;
            let pY = this.player.y;

            if (this.player.isSliding) {
                pHeight = this.player.height / 2;
                pY = this.player.y + this.player.height / 2;
            }

            if (
                b.x < this.player.x + this.player.width &&
                b.x + b.width > this.player.x &&
                b.y < pY + pHeight &&
                b.y + b.height > pY
            ) {
                // Game Over
                this.stop();
                break;
            }
        }
    }

    draw() {
        if (!this.ctx) return;

        // BG
        this.ctx.fillStyle = '#222';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Grid (Optional visual)
        this.ctx.strokeStyle = '#333';
        this.ctx.lineWidth = 1;
        for (let i = 0; i < this.canvas.width; i += 50) {
            this.ctx.beginPath(); this.ctx.moveTo(i, 0); this.ctx.lineTo(i, this.canvas.height); this.ctx.stroke();
        }
        for (let i = 0; i < this.canvas.height; i += 50) {
            this.ctx.beginPath(); this.ctx.moveTo(0, i); this.ctx.lineTo(this.canvas.width, i); this.ctx.stroke();
        }

        if (this.isGameActive) {
            // Shadow (if jumping)
            if (this.player.isJumping) {
                this.ctx.fillStyle = 'rgba(0,0,0,0.5)';
                this.ctx.beginPath();
                this.ctx.ellipse(
                    this.player.x + this.player.width / 2,
                    this.player.y + this.player.height,
                    this.player.width / 2 * (1 - this.player.jumpHeight / 100),
                    5, 0, 0, Math.PI * 2
                );
                this.ctx.fill();
            }

            // Player Visual (Ninja Style)
            const visualY = this.player.y - this.player.jumpHeight;
            const cx = this.player.x + this.player.width / 2;
            const cy = visualY + this.player.height / 2;

            this.ctx.save();
            this.ctx.translate(cx, cy);

            // Rotate towards movement direction
            let angle = 0;
            if (this.player.lastDirX !== 0 || this.player.lastDirY !== 0) {
                angle = Math.atan2(this.player.lastDirY, this.player.lastDirX);
            }
            this.ctx.rotate(angle);

            // Calculate Visual Height for Sliding/Crouching
            let scaleY = 1;
            if (this.player.isSliding || this.player.isCrouching) scaleY = 0.5;

            this.ctx.scale(1, scaleY);

            // Body (Triangle/Arrow)
            this.ctx.fillStyle = this.player.color;
            if (this.player.isJumping) this.ctx.fillStyle = '#ffff00';

            this.ctx.beginPath();
            this.ctx.moveTo(15, 0); // Front tip
            this.ctx.lineTo(-10, 10); // Back Left
            this.ctx.lineTo(-5, 0);   // Back Center (indent)
            this.ctx.lineTo(-10, -10);// Back Right
            this.ctx.closePath();
            this.ctx.fill();

            // Cockpit / Head
            this.ctx.fillStyle = 'white';
            this.ctx.beginPath();
            this.ctx.arc(5, 0, 5, 0, Math.PI * 2);
            this.ctx.fill();

            // Trail (if sliding)
            if (this.player.isSliding) {
                this.ctx.strokeStyle = 'rgba(0, 255, 255, 0.5)';
                this.ctx.lineWidth = 2;
                this.ctx.beginPath();
                this.ctx.moveTo(-10, 5);
                this.ctx.lineTo(-30, 10);
                this.ctx.moveTo(-10, -5);
                this.ctx.lineTo(-30, -10);
                this.ctx.stroke();
            }

            this.ctx.restore();

            // Bullets
            for (const b of this.bullets) {
                this.ctx.fillStyle = b.color || 'red';
                this.ctx.beginPath();
                // b.radius is dynamic now
                const r = b.radius || b.width / 2;
                this.ctx.arc(b.x + r, b.y + r, r, 0, Math.PI * 2);
                this.ctx.fill();

                // Shadow for High Bullets (to indicate height)
                if (b.isHigh) {
                    this.ctx.fillStyle = 'rgba(0,0,0,0.3)';
                    this.ctx.beginPath();
                    this.ctx.arc(b.x + r, b.y + r + 15, r * 0.8, 0, Math.PI * 2);
                    this.ctx.fill();
                }
            }
        } else {
            // Game Over
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

            this.ctx.fillStyle = '#ff3333';
            this.ctx.font = 'bold 48px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText("YOU DIED", this.canvas.width / 2, this.canvas.height / 2 - 20);

            this.ctx.fillStyle = 'white';
            this.ctx.font = '24px Arial';
            this.ctx.fillText(`Survived: ${this.survivalTime}s`, this.canvas.width / 2, this.canvas.height / 2 + 40);

            // Ranking
            if (window.calculatePercentile) {
                const result = window.calculatePercentile('movementTrainer', this.survivalTime);
                this.ctx.fillStyle = '#ffcc00';
                this.ctx.font = '24px Arial';
                this.ctx.fillText(`Rank: ${result.tier} (Top ${100 - result.percentile}%)`, this.canvas.width / 2, this.canvas.height / 2 + 80);
            }
        }
    }

    spawnBullet() {
        // Spawn from random edge
        const side = Math.floor(Math.random() * 4); // 0:Top, 1:Right, 2:Bottom, 3:Left
        const bullet = {
            x: 0, y: 0, width: 10, height: 10, vx: 0, vy: 0, speed: 3 + (this.survivalTime / 10)
        };

        switch (side) {
            case 0: // Top
                bullet.x = Math.random() * this.canvas.width;
                bullet.y = -20;
                bullet.vy = bullet.speed;
                // bullet.vx = (Math.random() - 0.5) * bullet.speed; // Slight angle
                break;
            case 1: // Right
                bullet.x = this.canvas.width + 20;
                bullet.y = Math.random() * this.canvas.height;
                bullet.vx = -bullet.speed;
                break;
            case 2: // Bottom
                bullet.x = Math.random() * this.canvas.width;
                bullet.y = this.canvas.height + 20;
                bullet.vy = -bullet.speed;
                break;
            case 3: // Left
                bullet.x = -20;
                bullet.y = Math.random() * this.canvas.height;
                bullet.vx = bullet.speed;
                break;
        }

        // Aim at player
        const dx = (this.player.x + this.player.width / 2) - bullet.x;
        const dy = (this.player.y + this.player.height / 2) - bullet.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > 0) {
            bullet.vx = (dx / dist) * bullet.speed;
            bullet.vy = (dy / dist) * bullet.speed;
        } else {
            bullet.vx = bullet.speed;
            bullet.vy = 0;
        }

        // High Bullet Logic (30% chance)
        // High bullets can be ducked under (Crouch/Slide)
        if (Math.random() < 0.3) {
            bullet.isHigh = true;
            bullet.color = '#ffff00'; // Yellow
            bullet.radius = 8; // Slightly smaller
        } else {
            bullet.isHigh = false;
            bullet.color = 'red';
            bullet.radius = 5;
        }

        this.bullets.push(bullet);
    }

    updateUI() {
        if (this.onTimeUpdate) this.onTimeUpdate(this.survivalTime.toFixed(2));
    }

    // Input Handling
    handleKey(key, isPressed) {
        key = key.toLowerCase();
        if (key === 'w' || key === 'arrowup') this.keys.w = isPressed;
        if (key === 'a' || key === 'arrowleft') this.keys.a = isPressed;
        if (key === 's' || key === 'arrowdown') this.keys.s = isPressed;
        if (key === 'd' || key === 'arrowright') this.keys.d = isPressed;
        if (key === ' ') this.keys.space = isPressed;
        if (key === 'c') this.keys.c = isPressed;
    }

    // Callbacks
    setTimeCallback(cb) { this.onTimeUpdate = cb; }
    setGameEndCallback(cb) { this.onGameEnd = cb; }
}

window.MoveGameEngine = MoveGameEngine;
