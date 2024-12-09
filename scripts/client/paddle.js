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
  }

  return paddle;
};
