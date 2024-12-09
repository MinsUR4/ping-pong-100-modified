const createPaddle = function (game, socket, options) {
  const paddle = document.createElement('div');
  paddle.style.left = options.x + '%';
  paddle.style.top = options.y + '%';
  paddle.classList.add('paddle');
  paddle.style.backgroundColor = options.color;
  game.appendChild(paddle);

  if (options.isClient) {
    let lastSentY = null; // To track the last sent position and avoid redundant updates
    let throttleTimeout = null; // Throttle sending WebSocket updates
    let startY = 0;

    const updatePaddlePosition = (newY) => {
      const maxY = game.offsetHeight - paddle.offsetHeight;
      const clampedY = Math.min(Math.max(newY, 0), maxY); // Clamp between 0 and max height
      paddle.style.top = `${clampedY}px`;

      const percent = (clampedY / game.offsetHeight) * 100;

      if (percent !== lastSentY) {
        lastSentY = percent;

        // Throttle updates to the server
        if (!throttleTimeout) {
          throttleTimeout = setTimeout(() => {
            socket.send({ type: 'movePlayer', y: percent });
            throttleTimeout = null;
          }, 50); // Adjust throttle time (in ms) for responsiveness
        }
      }
    };

    game.addEventListener('mousemove', (event) => {
      const rect = game.getBoundingClientRect();
      const newY = event.clientY - rect.top;
      updatePaddlePosition(newY);
    });

    game.addEventListener('mousedown', (event) => {
      const rect = game.getBoundingClientRect();
      startY = event.clientY - rect.top - paddle.offsetHeight / 2;
      updatePaddlePosition(startY);
    });
  }

  return paddle;
};
