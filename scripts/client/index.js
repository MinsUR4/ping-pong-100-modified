(function startGame() {
  const ws = new WebSocket('wss://banjo.benjikay.com/100ng');
  const game = document.querySelector('#game');
  const scoreA = document.querySelector('#a.score');
  const scoreB = document.querySelector('#b.score');
  const ball = document.querySelector('.ball');
  
  let id;
  let paddles = {};
  let player;

  const socket = {
    send(message) {
      const messageWithId = { ...message, id };
      ws.send(JSON.stringify(messageWithId));
    }
  };

  // Utility functions
  const createPaddle = (container, options) => {
    const paddle = document.createElement('div');
    paddle.className = options.isClient ? 'paddle client' : 'paddle';
    paddle.style.backgroundColor = options.color;
    paddle.style.top = options.y + '%';
    container.appendChild(paddle);
    return paddle;
  };

  const destroyPlayer = (playerId) => {
    if (paddles[playerId]) {
      game.removeChild(paddles[playerId]);
      delete paddles[playerId];
    }
  };

  const updateScore = (element, score) => {
    const format = (number) => (number < 10 ? '0' : '') + number;
    const maxScore = 11;
    const blinkClass = 'blink';

    if (score === maxScore) {
      element.classList.add(blinkClass);
    } else {
      element.classList.remove(blinkClass);
    }
    element.textContent = format(score);
  };

  const smoothMove = (element, newY) => {
    const currentY = parseFloat(element.style.top) || 0;
    const delta = (newY - currentY) * 0.1; // Adjust 0.1 for smoothing speed
    element.style.top = (currentY + delta) + '%';
  };

  // WebSocket message handlers
  const handleMessages = {
    id(msg) {
      id = msg.id;
    },
    spawnPlayer(msg) {
      const options = { x: msg.x, y: msg.y, color: msg.color, isClient: msg.id === id };
      paddles[msg.id] = createPaddle(game, options);
      if (msg.id === id) {
        player = paddles[msg.id];
      }
    },
    movePlayer(msg) {
      if (msg.id !== id && paddles[msg.id]) {
        smoothMove(paddles[msg.id], msg.y);
      }
    },
    destroyPlayer(msg) {
      destroyPlayer(msg.id);
    },
    moveBall(msg) {
      ball.style.left = msg.x + '%';
      ball.style.top = msg.y + '%';
    },
    score(msg) {
      updateScore(scoreA, msg.score.a);
      updateScore(scoreB, msg.score.b);
    },
    goal() {
      document.getElementById('goalSound').play();
    },
    hit() {
      document.getElementById('hitSound').play();
    },
    win() {
      document.getElementById('winSound').play();
    }
  };

  ws.onmessage = (data) => {
    const msg = JSON.parse(data.data);
    if (handleMessages[msg.type]) {
      handleMessages[msg.type](msg);
    }
  };

  ws.onclose = () => {
    Object.keys(paddles).forEach(destroyPlayer);
    setTimeout(startGame, 3000); // Reconnect after 3 seconds
  };

  // Improved client movement
  if ('pointerLockElement' in document) {
    game.requestPointerLock();
  }

  window.addEventListener('mousemove', (event) => {
    if (player && document.pointerLockElement === game) {
      const moveY = event.movementY * 0.1; // Adjust 0.1 for sensitivity
      const currentY = parseFloat(player.style.top) || 0;
      player.style.top = Math.min(100, Math.max(0, currentY + moveY)) + '%'; // Clamp between 0 and 100
      socket.send({ type: 'movePlayer', y: parseFloat(player.style.top) });
    }
  });
}());