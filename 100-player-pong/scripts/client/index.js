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

  const socket = {
    send(message) {
      // append client id to all outgoing messages
      const messageWithId = Object.assign({}, message, {id: id});
      const msg = JSON.stringify(messageWithId);
      ws.send(msg);
    }
  };

  const destroy = function(playerId) {
    game.removeChild(paddles[playerId]);
    delete paddles[playerId];
  };

  ws.onmessage = function(data, flags) {
    const msg = JSON.parse(data.data);
    // console.log('received message:', msg);

    const messageHandlers = {
      id() {
        id = msg.id;
      },
      spawnPlayer() {
        const isClient = msg.id === id;
        const options = {x: msg.x, y: msg.y, color: msg.color, isClient};

        paddles[msg.id] = createPaddle(game, socket, options);
        if (isClient) {
          player = paddles[msg.id];
        }
      },
      const movePlayer = (msg) => {
        if (!paddles[msg.id]) {
          console.warn(`No paddle found for player ID: ${msg.id}`);
          return;
        }
      
        // Update both x (left-right) and y (up-down) positions
        paddles[msg.id].style.left = `${msg.x}%`;
        paddles[msg.id].style.top = `${msg.y}%`;
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

    messageHandlers[msg.type]();
  };

  // auto-reconnect if server reboots
  ws.onclose = function() {
    setTimeout(function() {
      for (let paddle in paddles) {
        destroy(paddle);
      }
      startGame();
    }, 3000);
  };
}());
