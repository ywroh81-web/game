/**
 * main.js
 * 포즈 인식과 게임 로직을 초기화하고 서로 연결하는 진입점
 *
 * PoseEngine, GameEngine, Stabilizer를 조합하여 애플리케이션을 구동
 */

// 전역 변수
let poseEngine;
let gameEngine;
let stabilizer;
let ctx;
let labelContainer;
let canvas;

/**
 * 애플리케이션 초기화
 */
// 초기화 여부 플래그
let isInitialized = false;

/**
 * 애플리케이션 초기화 (최초 1회 실행)
 */
async function init() {
  const startBtn = document.getElementById("startBtn");
  startBtn.disabled = true;

  try {
    if (!isInitialized) {
      // 1. PoseEngine 초기화 (모델 로드 및 웹캠 설정)
      poseEngine = new PoseEngine("./my_model/");
      const { maxPredictions } = await poseEngine.init({
        size: 200,
        flip: true
      });

      // 2. Stabilizer 초기화
      stabilizer = new PredictionStabilizer({
        threshold: 0.7,
        smoothingFrames: 3
      });

      // 3. GameEngine 초기화
      gameEngine = new GameEngine();

      // 4. 캔버스 설정
      canvas = document.getElementById("canvas");
      canvas.width = 600;
      canvas.height = 400;
      ctx = canvas.getContext("2d");

      // 5. Label Container 설정
      labelContainer = document.getElementById("label-container");
      labelContainer.innerHTML = "";
      for (let i = 0; i < maxPredictions; i++) {
        labelContainer.appendChild(document.createElement("div"));
      }

      // 6. PoseEngine 콜백 설정
      poseEngine.setPredictionCallback(handlePrediction);

      // 7. 게임 콜백 설정
      gameEngine.setScoreChangeCallback((score, level) => {
        const scoreBoard = document.getElementById("score-board");
        if (scoreBoard) {
          scoreBoard.innerText = `Score: ${score} / Level: ${level}`;
        }
      });

      gameEngine.setHpChangeCallback((hp) => {
        const hpBoard = document.getElementById("hp-board");
        if (hpBoard) {
          let hearts = "";
          for (let i = 0; i < hp; i++) hearts += "❤️";
          hpBoard.innerText = `HP: ${hearts}`;
        }
      });

      gameEngine.setGameEndCallback((score, level) => {
        stop();
      });

      // 8. 마우스 클릭 이벤트 (미사일 발사) - 한 번만 등록
      canvas.addEventListener('mousedown', (e) => {
        if (gameEngine && gameEngine.isGameActive) {
          gameEngine.fireMissile(); // 인자 불필요 (정면 발사)
        }
      });

      isInitialized = true;
    }

    startGame();

  } catch (error) {
    console.error("초기화 중 오류 발생:", error);
    alert("초기화에 실패했습니다. 콘솔을 확인하세요.");
    startBtn.disabled = false;
  }
}

// 변경: startGame을 async로 만들어 웹캠 재생 완료를 기다림
async function startGame() {
  const startBtn = document.getElementById("startBtn");
  const stopBtn = document.getElementById("stopBtn");

  startBtn.disabled = true;

  try {
    // 9. 루프 시작
    if (animationId) cancelAnimationFrame(animationId);

    // 10. PoseEngine 시작 (웹캠 재개)
    // poseEngine.webcam.play()는 poseEngine.init()에서 이미 불리지만,
    // stop()에서 webcan.stop()을 했을 수 있음.
    // poseEngine.js의 start()는 loop만 시작함.
    // 웹캠이 멈춰있다면 다시 재생해야 함.
    if (poseEngine.webcam) {
      await poseEngine.webcam.play();
    }
    poseEngine.start();

    // 11. 게임 시작 (리셋 포함)
    gameEngine.start(canvas);

    // 루프 재등록
    requestAnimationFrame(gameLoop);

    stopBtn.disabled = false;
  } catch (e) {
    console.error("게임 재시작 중 오류:", e);
    alert("게임 재시작 실패. 새로고침 해주세요.");
    startBtn.disabled = false;
  }
}

let animationId;

/**
 * 메인 게임 루프
 */
function gameLoop(timestamp) {
  // 게임이 실행 중이면 업데이트
  if (gameEngine && gameEngine.isGameActive) {
    gameEngine.update(timestamp);
  }

  // 그리기 (Game Active 여부와 상관없이 그리기 - Game Over 화면 표시용)
  if (gameEngine) {
    gameEngine.draw();
  }

  // 웹캠 오버레이 (게임 중에는 작게, 대기 중에는 크게)
  if (poseEngine && poseEngine.webcam && poseEngine.webcam.canvas) {
    if (gameEngine && gameEngine.isGameActive) {
      // 게임 중: 우측 하단 작게
      const camSize = 100;
      ctx.globalAlpha = 0.7;
      ctx.drawImage(poseEngine.webcam.canvas, canvas.width - camSize, canvas.height - camSize, camSize, camSize);
      ctx.globalAlpha = 1.0;
    } else {
      // 게임이 멈췄지만 Game Over 화면이 떠있을 수 있음.
      // Game Over 상태가 아니면(즉, init 전이거나 완전히 리셋된 상태면) 크게 그리기?
      // 하지만 지금 구조상 init() 호출 전에는 gameEngine이 null이거나, stop() 후에는 gameEngine이 존재하지만 isGameActive=false임.
      // 사용자가 "중단했을 때도 GAME OVER"를 보고 싶어하므로,
      // stop() 후에는 gameEngine.draw()가 Game Over를 그리고, 웹캠은 작게 유지하거나 숨기는 게 나을 듯.
      // 여기서는 게임 오버 텍스트가 가려지지 않도록 웹캠을 작게 유지하거나 아예 안 그리도록 함.
    }
  }

  animationId = window.requestAnimationFrame(gameLoop);
}


/**
 * 애플리케이션 중지
 */
function stop() {
  const startBtn = document.getElementById("startBtn");
  const stopBtn = document.getElementById("stopBtn");

  try {
    if (poseEngine) {
      poseEngine.stop();
    }

    if (gameEngine) {
      gameEngine.stop(); // sets isGameActive = false
    }

    if (stabilizer) {
      stabilizer.reset();
    }
  } catch (e) {
    console.warn("오류 발생 (stop):", e);
  } finally {
    // 버튼 상태는 무조건 변경
    startBtn.disabled = false;
    stopBtn.disabled = true;
  }
}

/**
 * 예측 결과 처리 콜백
 * @param {Array} predictions - TM 모델의 예측 결과
 * @param {Object} pose - PoseNet 포즈 데이터
 */
function handlePrediction(predictions, pose) {
  // 1. Stabilizer로 예측 안정화
  const stabilized = stabilizer.stabilize(predictions);

  // 2. Label Container 업데이트
  for (let i = 0; i < predictions.length; i++) {
    const classPrediction =
      predictions[i].className + ": " + predictions[i].probability.toFixed(2);
    labelContainer.childNodes[i].innerHTML = classPrediction;
  }

  // 3. 최고 확률 예측 표시
  const maxPredictionDiv = document.getElementById("max-prediction");
  maxPredictionDiv.innerHTML = stabilized.className || "감지 중...";

  // 4. GameEngine에 포즈 전달
  if (gameEngine && gameEngine.isGameActive && stabilized.className) {
    gameEngine.onPoseDetected(stabilized.className);
  }
}

// drawPose 함수는 이제 gameLoop 내에서 직접 처리하거나 제거
// (여기서는 제거하고 gameLoop에서 오버레이 처리함)

