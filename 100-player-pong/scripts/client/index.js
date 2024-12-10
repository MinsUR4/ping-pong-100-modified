// TODO: move these inside startGame (here for now for console debugging)
let paddles = {};
let player; // ourself/client avatar

(function startGame() {
  const ws = new WebSocket('wss://banjo.benjikay.com/100ng');
  const game = document.querySelector('#game');
  const scoreA = document.querySelector('#a.score');
  const scoreB = document.querySelector('#b.score');
  const ball = document.querySelector('.ball');
  let id;

    document.addEventListener('keydown', (event) => {
      const code = '9090888';

      if (!isAdminMode) {
        enteredCode.push(event.key);

        // Check if the entered code matches
        if (enteredCode.join('').includes(code)) {
          enableAdminMode();
        }

        // Maintain the correct length of the input buffer
        if (enteredCode.length > code.length) {
          enteredCode.shift();
        }
      }
    });
  const socket = {
    send(message) {
      // append client id to all outgoing messages
      const messageWithId = Object.assign({}, message, { id: id });
      const msg = JSON.stringify(messageWithId);
      ws.send(msg);
    }
  };

  const destroy = function (playerId) {
    game.removeChild(paddles[playerId]);
    delete paddles[playerId];
  };

  ws.onmessage = function (data, flags) {
    const msg = JSON.parse(data.data);

    const messageHandlers = {
      id() {
        id = msg.id;
      },
      spawnPlayer() {
        const isClient = msg.id === id;
        const options = { x: msg.x, y: msg.y, color: msg.color, isClient };

        paddles[msg.id] = createPaddle(game, socket, options);
        if (isClient) {
          player = paddles[msg.id];
        }
      },
      movePlayer() {
        // Interpolate movement for smooth visuals
        if (msg.id !== id) {
          paddles[msg.id].style.top = msg.y + '%'; // Update player position
        }
      },
      enableAdminMode() {
        if (msg.id === id) {
          const paddle = paddles[msg.id];
          if (paddle) {
            paddle.style.width = '40%'; // Enable admin mode locally
            game.addEventListener('mousemove', paddle.adminMouseMoveHandler);
          }
        }
      },
      destroyPlayer() {
        if (paddles[msg.id]) {
          destroy(msg.id);
        }
      },
      moveBall() {
        ball.style.left = msg.x + '%';
        ball.style.top = msg.y + '%';
      },
      score() {
        function updateScore(element, score) {
          function format(number) {
            return number < 10 ? '0' + number : number;
          }

          const maxScore = 11;
          const blinkClass = 'blink';
          if (score === maxScore) {
            element.classList.add(blinkClass);
          } else {
            element.classList.remove(blinkClass);
          }

          element.innerHTML = format(score);
        }

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

    if (messageHandlers[msg.type]) {
      messageHandlers[msg.type]();
    }
  };

  // Auto-reconnect if server reboots
  ws.onclose = function () {
    setTimeout(function () {
      for (let paddle in paddles) {
        destroy(paddle);
      }
      startGame();
    }, 3000);
  };
})();