let paddles = {};
let player; // ourself/client avatar

(function startGame() {
  const ws = new WebSocket('ws://resilient-synonymous-hat.glitch.me/');
  const game = document.querySelector('#game');
  const scoreA = document.querySelector('#a.score');
  const scoreB = document.querySelector('#b.score');
  const ball = document.querySelector('.ball');
  let id;

  const socket = {
    send(message) {
      // append client id to all outgoing messages
      const messageWithId = Object.assign({}, message, { id: id });
      const msg = JSON.stringify(messageWithId);
      ws.send(msg);
    }
  };

  const destroy = function(playerId) {
    game.removeChild(paddles[playerId]);
    delete paddles[playerId];
  };

  // Handling WebSocket open, message, and close events
  ws.onopen = function() {
    console.log("WebSocket connection established.");
  };

  ws.onerror = function(error) {
    console.error("WebSocket Error:", error);
  };

  ws.onmessage = function(data, flags) {
    let msg;
    try {
      msg = JSON.parse(data.data); // parse the incoming message
    } catch (e) {
      console.error("Invalid JSON received:", e);
      return;
    }

    // console.log('received message:', msg);

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
        // TODO: interpolate movement!
        if (msg.id !== id) { // ignore this msg if it's us!
          paddles[msg.id].style.top = msg.y + '%'; // update player position
        }
      },
      destroyPlayer() {
        if (paddles[msg.id]) {
          destroy(msg.id);
        }
      },
      moveBall() {
        // TODO: interpolate movement!
        ball.style.left = msg.x + '%';
        ball.style.top = msg.y + '%';
      },
      score() {
        function updateScore(element, score) {
          // add a leading zero if < 10
          function format(number) {
            if (number < 10) {
              return '0' + number;
            } else {
              return number;
            }
          }

          // flash winning score
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
      // sound effect events
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

    // Execute the corresponding handler for the message type
    if (messageHandlers[msg.type]) {
      messageHandlers[msg.type]();
    } else {
      console.warn("Unknown message type:", msg.type);
    }
  };

  // auto-reconnect if server reboots
  ws.onclose = function() {
    console.log("WebSocket connection closed. Reconnecting...");
    setTimeout(function() {
      for (let paddle in paddles) {
        destroy(paddle);
      }
      startGame();
    }, 3000);
  };
}());
