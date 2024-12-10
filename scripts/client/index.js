(function startGame() {
  const game = document.querySelector('#game');
  const chatBox = document.getElementById('chat-box');
  const chatInput = document.getElementById('chat-input');
  const sendButton = document.getElementById('send-button');
  const scoreA = document.querySelector('#a.score');
  const scoreB = document.querySelector('#b.score');
  const ball = document.querySelector('.ball');
  let id;
  let playerName;
  let paddles = {};
  let player;

  // WebSocket for player-related messages (chat, assignPlayer, etc.)
  const wsPlayer = new WebSocket("wss://resilient-synonymous-hat.glitch.me/");

  // WebSocket for game-related messages (movement, ball, goal sound, etc.)
  const wsGame = new WebSocket("https://banjo.benjikay.com/100ng");

  const socket = {
    send(message) {
      // append client id to all outgoing messages
      const messageWithId = Object.assign({}, message, {id: id});
      const msg = JSON.stringify(messageWithId);
      wsGame.send(msg);
    }
  };

  const destroy = function(playerId) {
    game.removeChild(paddles[playerId]);
    delete paddles[playerId];
  };

  // WebSocket for player-related messages handler
  const handlePlayerMessage = function(msg) {
    const messageHandlersPlayer = {
      assignPlayer() {
        playerName = msg.playerName;
        console.log(`You are assigned as ${playerName}`);
      },
      chat() {
        const messageElement = document.createElement('div');
        messageElement.textContent = msg.message;
        chatBox.appendChild(messageElement);
        chatBox.scrollTop = chatBox.scrollHeight;
      },
      playerJoined() {
        console.log(`${msg.playerName} has joined the game.`);
      },
      playerLeft() {
        console.log(`${msg.playerName} has left the game.`);
      }
    };

    if (messageHandlersPlayer[msg.type]) {
      messageHandlersPlayer[msg.type]();
    }
  };

  // WebSocket for game-related messages handler
  const handleGameMessage = function(msg) {
    const messageHandlersGame = {
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
      movePlayer() {
        if (msg.id !== id) {
          paddles[msg.id].style.top = msg.y + '%';
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
      goal() {
        document.getElementById('goalSound').play();
      },
      hit() {
        document.getElementById('hitSound').play();
      },
      win() {
        document.getElementById('winSound').play();
      },
      score() {
        function updateScore(element, score) {
          function format(number) {
            return number < 10 ? '0' + number : number;
          }
          element.innerHTML = format(score);
        }

        updateScore(scoreA, msg.score.a);
        updateScore(scoreB, msg.score.b);
      }
    };

    if (messageHandlersGame[msg.type]) {
      messageHandlersGame[msg.type]();
    }
  };

  // WebSocket message handling
  wsPlayer.onmessage = function(data) {
    const msg = JSON.parse(data.data);
    console.log('Received player message:', msg);
    handlePlayerMessage(msg);
  };

  wsGame.onmessage = function(data) {
    const msg = JSON.parse(data.data);
    //console.log('Received game message:', msg);
    handleGameMessage(msg);
  };

  wsGame.onclose = function() {
    setTimeout(startGame, 3000);
  };

  // Send chat message when the send button is clicked
  sendButton.addEventListener('click', () => {
    const message = chatInput.value.trim();
    if (message) {
      wsPlayer.send(JSON.stringify({ type: 'chat', message }));
      chatInput.value = ''; // Clear input field
    }
  });
})();