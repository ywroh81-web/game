/**
 * move_main.js
 * Entry point for Movement Trainer
 */

let moveEngine;
let animationId;
let canvas;
let lastTime = 0;

window.onload = () => {
    canvas = document.getElementById("move-canvas");
    canvas.width = 600;
    canvas.height = 400;

    moveEngine = new MoveGameEngine();

    moveEngine.setTimeCallback((time) => {
        document.getElementById("time-board").innerText = `Time: ${time}s`;
    });

    moveEngine.setGameEndCallback((finalTime) => {
        stopGame();
    });

    // Keyboard Input
    window.addEventListener('keydown', (e) => {
        moveEngine.handleKey(e.key, true);
        if (e.key === " " && e.target === document.body) e.preventDefault(); // Prevent scroll
    });

    window.addEventListener('keyup', (e) => {
        moveEngine.handleKey(e.key, false);
    });

    // Initial Draw
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#222';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = 'white';
    ctx.font = '24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText("Press Start to Begin", canvas.width / 2, canvas.height / 2);
};

function startGame() {
    const startBtn = document.getElementById("startBtn");
    const stopBtn = document.getElementById("stopBtn");

    if (!moveEngine) {
        alert("게임 엔진이 초기화되지 않았습니다. 새로고침 해주세요.");
        return;
    }

    try {
        startBtn.disabled = true;
        stopBtn.disabled = false;

        moveEngine.start(canvas);
        lastTime = Date.now();

        if (animationId) cancelAnimationFrame(animationId);
        requestAnimationFrame(gameLoop);

        canvas.focus();
    } catch (e) {
        console.error("Start Game Error:", e);
        alert("게임 시작 중 오류가 발생했습니다: " + e.message);
        startBtn.disabled = false;
    }
}

function stopGame() {
    const startBtn = document.getElementById("startBtn");
    const stopBtn = document.getElementById("stopBtn");

    startBtn.disabled = false;
    stopBtn.disabled = true;

    moveEngine.stop();
}

function gameLoop() {
    if (moveEngine && moveEngine.isGameActive) {
        const now = Date.now();
        const deltaTime = now - lastTime;
        lastTime = now;

        moveEngine.update(deltaTime);
        moveEngine.draw();

        animationId = requestAnimationFrame(gameLoop);
    } else {
        moveEngine.draw(); // Game Over screen
    }
}
