/**
 * aim_main.js
 * Entry point for Aim Trainer
 */

let aimEngine;
let animationId;
let canvas;

window.onload = () => {
    canvas = document.getElementById("aim-canvas");
    canvas.width = 600;
    canvas.height = 400;

    // Initialize Engine
    aimEngine = new AimGameEngine();

    // Set Callbacks
    aimEngine.setScoreCallback((score) => {
        document.getElementById("score-board").innerText = `Score: ${score}`;
    });

    aimEngine.setTimeCallback((time) => {
        document.getElementById("time-board").innerText = `Time: ${time}`;
    });

    aimEngine.setGameEndCallback((score) => {
        stopGame();
        // Maybe remove alert since we draw on canvas
    });

    // Click Listener
    canvas.addEventListener('mousedown', (e) => {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        aimEngine.handleClick(x, y);
    });

    // Initial Draw (Black screen)
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#1e1e2e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = 'white';
    ctx.font = '24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText("Click 'Start Game' to Begin", canvas.width / 2, canvas.height / 2);
};

function startGame() {
    const startBtn = document.getElementById("startBtn");
    const stopBtn = document.getElementById("stopBtn");

    startBtn.disabled = true;
    stopBtn.disabled = false;

    aimEngine.start(canvas);

    if (animationId) cancelAnimationFrame(animationId);
    requestAnimationFrame(gameLoop);
}

function stopGame() {
    const startBtn = document.getElementById("startBtn");
    const stopBtn = document.getElementById("stopBtn");

    startBtn.disabled = false;
    stopBtn.disabled = true;

    aimEngine.stop();
}

function gameLoop() {
    if (aimEngine && aimEngine.isGameActive) {
        aimEngine.draw();
        animationId = requestAnimationFrame(gameLoop);
    } else {
        // Draw one last time for Game Over screen
        aimEngine.draw();
    }
}
