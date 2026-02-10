/**
 * gameEngine.js
 * Sky Defender 게임 엔진
 * 포즈 인식으로 전투기를 이동하고, 마우스로 미사일을 발사하는 게임 로직을 담당
 */

class GameEngine {
  constructor() {
    this.canvas = null;
    this.ctx = null;
    this.isGameActive = false;
    this.score = 0;
    this.level = 1;

    // 게임 엔티티
    this.player = {
      x: 0,
      y: 0,
      width: 40,
      height: 40,
      color: 'blue',
      speed: 5,
      hp: 3
    };
    this.missiles = [];
    this.enemies = []; // 운석, UFO 등
    this.particles = []; // 폭발 효과 등 (옵션)

    // 입력 상태
    this.currentPose = "Center"; // Center, Left, Right

    // 게임 루프 변수
    this.lastTime = 0;
    this.enemySpawnTimer = 0;
    this.enemySpawnInterval = 1000; // 1초마다 적 생성 (기본 난이도 상향)

    // 콜백
    this.onScoreChange = null;
    this.onGameEnd = null;
    this.onHpChange = null;
  }

  /**
   * 게임 초기화 및 시작
   * @param {HTMLCanvasElement} canvas - 게임을 그릴 캔버스
   */
  start(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');

    this.resetGame();
    this.isGameActive = true;
    this.lastTime = performance.now();

    // 플레이어 초기 위치 (화면 하단 중앙)
    this.player.x = this.canvas.width / 2 - this.player.width / 2;
    this.player.y = this.canvas.height - this.player.height - 20;

    // 게임 루프 시작은 main.js에서 requestAnimationFrame으로 호출됨
  }

  resetGame() {
    this.score = 0;
    this.level = 1;
    this.player.hp = 3;
    this.missiles = [];
    this.enemies = [];
    this.missiles = [];
    this.enemies = [];
    this.enemySpawnInterval = 1000;

    if (this.onScoreChange) this.onScoreChange(this.score, this.level);
    if (this.onHpChange) this.onHpChange(this.player.hp);
  }

  stop() {
    this.isGameActive = false;
    if (this.onGameEnd) {
      this.onGameEnd(this.score, this.level);
    }
  }

  /**
   * 게임 상태 업데이트 (Main Loop)
   * @param {number} timestamp - 현재 시간
   */
  update(timestamp) {
    if (!this.isGameActive) return;

    const deltaTime = timestamp - this.lastTime;
    this.lastTime = timestamp;

    // 1. 플레이어 이동 처리 (Pose 기반 - 위치 고정 방식)
    let targetX = this.canvas.width / 2 - this.player.width / 2; // 기본: 중앙 (정면/Center)

    // 한국어 라벨("왼쪽", "오른쪽") 및 영어 라벨("Left", "Right") 모두 지원
    // 또한 사용자가 "고개를 기울이는 쪽"으로 움직이길 원하므로,
    // 기본적으로 Left -> Left Lane, Right -> Right Lane으로 설정합니다.
    // (웹캠이 flip: true 이므로, 거울처럼 내 왼쪽 = 화면 왼쪽일 것임)

    if (this.currentPose === "Left" || this.currentPose === "왼쪽") {
      targetX = (this.canvas.width / 4) - (this.player.width / 2); // Left Lane
    } else if (this.currentPose === "Right" || this.currentPose === "오른쪽") {
      targetX = (this.canvas.width * 3 / 4) - (this.player.width / 2); // Right Lane
    }

    // 부드러운 이동 (Lerp) 대신 즉시 이동 (Snap)
    this.player.x = targetX;

    // 화면 밖으로 나가지 않도록 제한 (혹시 모를 오차 방지)
    if (this.player.x < 0) this.player.x = 0;
    if (this.player.x + this.player.width > this.canvas.width) {
      this.player.x = this.canvas.width - this.player.width;
    }

    // 2. 미사일 이동
    for (let i = this.missiles.length - 1; i >= 0; i--) {
      const m = this.missiles[i];

      // 정면 발사 (직선 이동)
      m.y -= m.speed;

      // 화면 밖 체크
      if (m.y < 0) {
        this.missiles.splice(i, 1);
      }
    }

    // 3. 적 생성 및 이동
    this.enemySpawnTimer += deltaTime;
    if (this.enemySpawnTimer > this.enemySpawnInterval) {
      this.spawnEnemy();
      this.enemySpawnTimer = 0;
    }

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      e.y += e.speed;

      // 바닥에 닿았는지 체크
      if (e.y > this.canvas.height) {
        this.enemies.splice(i, 1);
        // 패널티 (점수 감점 or HP 감소 등)
        // 규칙: 적이 바닥에 닿을 때 (옵션: 점수 감점 or HP 감소)
        // 여기서는 점수만 깎거나 무시
        continue;
      }

      // 플레이어와 충돌 체크
      if (this.checkCollision(this.player, e)) {
        this.enemies.splice(i, 1);
        this.takeDamage();
      }
    }

    // 4. 미사일과 적의 충돌 체크
    for (let mIndex = this.missiles.length - 1; mIndex >= 0; mIndex--) {
      for (let eIndex = this.enemies.length - 1; eIndex >= 0; eIndex--) {
        const m = this.missiles[mIndex];
        const e = this.enemies[eIndex];

        // 대략적인 충돌 (거리 기반 혹은 사각형)
        if (this.checkCollision(m, e)) {
          // 적 처치
          this.enemies.splice(eIndex, 1);
          this.missiles.splice(mIndex, 1);
          this.addScore(e.scoreValue);
          break; // 미사일 하나로 적 하나만 처리
        }
      }
    }
  }

  // ... (draw function, etc) ...

  // 1. 플레이어 이동 처리 (Pose 기반 - 위치 고정 방식)에서 사용되는 update() 메서드 내의 로직 수정 필요
  // update() 메서드는 위쪽에 있으니 거기를 수정해야 함.

  // (이전 툴 호출에서 update 메서드의 해당 부분을 수정하려고 했는데, line number가 안 맞을 수 있음.
  // 다시 update 메서드 전체를 보거나 해당 블록을 찾아야 함.)

  /**
   * 화면 그리기 (Render Loop)
   */
  draw() {
    if (!this.ctx) return;

    // 배경 지우기
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // 1. 플레이어 그리기 (Cool Airplane)
    const px = this.player.x;
    const py = this.player.y;
    const w = this.player.width;
    const h = this.player.height;

    this.ctx.save();
    this.ctx.translate(px + w / 2, py + h / 2); // 중심점으로 이동

    // Body Gradient
    const grad = this.ctx.createLinearGradient(-w / 2, 0, w / 2, 0);
    grad.addColorStop(0, '#00d2ff');
    grad.addColorStop(0.5, '#3a7bd5');
    grad.addColorStop(1, '#00d2ff');

    // Main Body (Fuselage)
    this.ctx.fillStyle = grad;
    this.ctx.beginPath();
    this.ctx.moveTo(0, -h / 2); // Nose
    this.ctx.lineTo(w / 4, h / 4);
    this.ctx.lineTo(0, h / 2);  // Tail center
    this.ctx.lineTo(-w / 4, h / 4);
    this.ctx.closePath();
    this.ctx.fill();

    // Wings
    this.ctx.fillStyle = '#22a6b3';
    this.ctx.beginPath();
    this.ctx.moveTo(0, -h / 4);
    this.ctx.lineTo(w / 2, h / 4);
    this.ctx.lineTo(w / 4, h / 2);
    this.ctx.lineTo(0, h / 4); // Wing connect
    this.ctx.lineTo(-w / 4, h / 2);
    this.ctx.lineTo(-w / 2, h / 4);
    this.ctx.lineTo(0, -h / 4);
    this.ctx.closePath();
    this.ctx.fill();

    // Cockpit
    this.ctx.fillStyle = '#ff9f43';
    this.ctx.beginPath();
    this.ctx.ellipse(0, -h / 6, w / 8, h / 8, 0, 0, Math.PI * 2);
    this.ctx.fill();

    // Engine Glow
    this.ctx.shadowBlur = 10;
    this.ctx.shadowColor = '#00d2ff';

    this.ctx.restore();

    // 2. 적 그리기
    for (const e of this.enemies) {
      this.ctx.fillStyle = e.color;
      if (e.type === 'meteor') {
        // 운석 (원형)
        this.ctx.beginPath();
        this.ctx.arc(e.x + e.width / 2, e.y + e.height / 2, e.width / 2, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.fillText("🪨", e.x, e.y + e.height / 2);
      } else {
        // UFO (타원형)
        this.ctx.beginPath();
        this.ctx.ellipse(e.x + e.width / 2, e.y + e.height / 2, e.width / 2, e.height / 3, 0, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.fillStyle = 'white';
        this.ctx.fillText("🛸", e.x + 5, e.y + e.height / 2 + 5);
      }
    }

    // 3. 미사일 그리기
    this.ctx.fillStyle = '#ff0000'; // Red Laser
    this.ctx.shadowBlur = 5;
    this.ctx.shadowColor = 'red';
    for (const m of this.missiles) {
      this.ctx.fillRect(m.x - 2, m.y, 4, 15); // 길쭉한 레이저
    }
    this.ctx.shadowBlur = 0;

    // 4. 게임 오버 텍스트 (게임이 끝났지만 루프가 돌 수 있음, stop 호출 전)
    if (!this.isGameActive) {
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

      this.ctx.fillStyle = '#ff3333';
      this.ctx.font = 'bold 48px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.fillText("GAME OVER", this.canvas.width / 2, this.canvas.height / 2);

      this.ctx.fillStyle = 'white';
      this.ctx.font = '24px Arial';
      this.ctx.fillText(`Final Score: ${this.score}`, this.canvas.width / 2, this.canvas.height / 2 + 50);

      // Ranking
      if (window.calculatePercentile) {
        const result = window.calculatePercentile('skyDefender', this.score);
        this.ctx.fillStyle = '#ffcc00';
        this.ctx.font = '20px Arial';
        this.ctx.fillText(`Rank: ${result.tier} (Top ${100 - result.percentile}%)`, this.canvas.width / 2, this.canvas.height / 2 + 90);
      }

      this.ctx.fillStyle = '#aaaaaa';
      this.ctx.font = '16px Arial';
      this.ctx.fillText("Press Start to Retry", this.canvas.width / 2, this.canvas.height / 2 + 130);
    }
  }

  spawnEnemy() {
    // 3개 차선 중 하나 랜덤 선택
    const lanes = [
      this.canvas.width / 4,       // Left
      this.canvas.width / 2,       // Center
      this.canvas.width * 3 / 4    // Right
    ];
    const laneX = lanes[Math.floor(Math.random() * lanes.length)];

    const type = Math.random() > 0.8 ? 'ufo' : 'meteor'; // 20% 확률로 UFO
    const width = 30; // 적 너비

    const enemy = {
      x: laneX - width / 2, // 차선 중앙에 정렬
      y: -30,
      width: 30,
      height: 30,
      type: type,
      speed: type === 'ufo' ? 5 + (this.level * 0.8) : 3 + (this.level * 0.5), // 속도 대폭 증가
      color: type === 'ufo' ? 'purple' : 'gray',
      scoreValue: type === 'ufo' ? 20 : 10
    };

    this.enemies.push(enemy);
  }

  fireMissile() {
    if (!this.isGameActive) return;

    // 플레이어 위치에서 정면으로 발사
    this.missiles.push({
      x: this.player.x + this.player.width / 2,
      y: this.player.y,
      speed: 10,  // 속도 약간 증가
      width: 5,
      height: 10   // 길쭉한 레이저 형태
    });
  }

  checkCollision(rect1, rect2) {
    return (
      rect1.x < rect2.x + rect2.width &&
      rect1.x + rect1.width > rect2.x &&
      rect1.y < rect2.y + rect2.height &&
      rect1.height + rect1.y > rect2.y
    );
  }

  takeDamage() {
    this.player.hp--;
    if (this.onHpChange) this.onHpChange(this.player.hp);

    if (this.player.hp <= 0) {
      this.stop();
    }
  }

  addScore(points) {
    this.score += points;

    // 레벨업 (100점 단위)
    if (Math.floor(this.score / 100) + 1 > this.level) {
      this.level++;
      this.enemySpawnInterval = Math.max(300, 1000 - (this.level * 100)); // 레벨업 할수록 빨라짐 (최소 0.3초)
    }

    if (this.onScoreChange) {
      this.onScoreChange(this.score, this.level);
    }
  }

  // --- 외부 입력 핸들러 ---

  onPoseDetected(poseName) {
    // "Left", "Right", "Center" 등
    this.currentPose = poseName;
  }

  setScoreChangeCallback(callback) {
    this.onScoreChange = callback;
  }

  setHpChangeCallback(callback) {
    this.onHpChange = callback;
  }

  setGameEndCallback(callback) {
    this.onGameEnd = callback;
  }
}

window.GameEngine = GameEngine;
