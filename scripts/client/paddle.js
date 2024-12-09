const createPaddle = function(game, socket, options) {
  const paddle = document.createElement('div');
  paddle.style.left = options.x + '%';
  paddle.style.top = options.y + '%';
  paddle.classList.add('paddle');
  paddle.style.backgroundColor = options.color;
  game.appendChild(paddle);

  // add mouse controls if this paddle is the one we (the player) are to control
  if (options.isClient) {
    let startY = 0;
    let lastSentY = options.y; // Initialize the last sent position
    const throttleDelay = 50; // Delay in milliseconds
    let lastMoveTime = 0;

    // Mouse movement control
    game.addEventListener('mousemove', function movePaddle(event) {
      const newY = event.clientY - startY;
      const maxY = game.offsetHeight - paddle.offsetHeight;
      const boundedY = Math.max(0, Math.min(newY, maxY)); // Clamp to the game bounds
      paddle.style.top = `${boundedY}px`;

      if (boundedY === 0) {
        startY = event.clientY;
      } else if (boundedY === maxY) {
        startY = event.clientY - maxY;
      }

      const percent = (boundedY / game.offsetHeight) * 100;

      // Throttle the sending of paddle movement to the server
      const now = Date.now();
      if (now - lastMoveTime >= throttleDelay) {
        if (Math.abs(lastSentY - percent) >= 0.5) { // Send if the position changed significantly
          socket.send({ type: 'movePlayer', y: percent });
          lastSentY = percent;
          lastMoveTime = now;
        }
      }
    });

    // Keyboard controls (W, S, and Arrow keys)
    let keyThrottleDelay = 100; // Delay between key movements
    let lastKeyPressTime = 0;

    const movePaddleWithKeys = (direction) => {
      const currentTime = Date.now();
      if (currentTime - lastKeyPressTime < keyThrottleDelay) return; // Throttle keypress actions

      const maxY = game.offsetHeight - paddle.offsetHeight;
      let currentTop = parseFloat(paddle.style.top);
      if (direction === 'down') {
        currentTop = Math.min(currentTop + 10, maxY); // Move down
      } else if (direction === 'up') {
        currentTop = Math.max(currentTop - 10, 0); // Move up
      }

      paddle.style.top = `${currentTop}px`;

      const percent = (currentTop / game.offsetHeight) * 100;
      socket.send({ type: 'movePlayer', y: percent });

      lastKeyPressTime = currentTime;
    };

    // Listen for keydown events
    document.addEventListener('keydown', (event) => {
      if (event.key === 'ArrowDown' || event.key === 's') {
        movePaddleWithKeys('down');
      } else if (event.key === 'ArrowUp' || event.key === 'w') {
        movePaddleWithKeys('up');
      }
    });
  }

  return paddle;
};
