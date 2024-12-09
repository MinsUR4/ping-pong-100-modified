const createPaddle = function(game, socket, options) {
  const paddle = document.createElement('div');
  paddle.style.left = options.x + '%';
  paddle.style.top = options.y + '%';
  paddle.classList.add('paddle');
  paddle.style.backgroundColor = options.color;
  game.appendChild(paddle);

  // add mouse controls if this paddle is the one we (the player) are to control
  if (options.isClient) {
    let paddleY = options.y; // Initial paddle position
    let isLocked = false; // Track whether the mouse is "locked" to the paddle

    // Throttle parameters
    const throttleDelay = 50;
    let lastMoveTime = 0;

    // Mouse lock logic for moving the paddle smoothly without holding the mouse button
    game.addEventListener('mousemove', function(event) {
      // Only move paddle if mouse is within the game area and is "locked"
      if (isLocked) {
        const maxY = game.offsetHeight - paddle.offsetHeight;
        const mouseY = event.clientY;
        const newY = Math.max(0, Math.min(mouseY, maxY)); // Clamping the paddle position

        paddle.style.top = `${newY}px`;

        // Send position to the server with throttling
        const percent = (newY / game.offsetHeight) * 100;

        const now = Date.now();
        if (now - lastMoveTime >= throttleDelay) {
          socket.send({ type: 'movePlayer', y: percent });
          lastMoveTime = now;
        }
      }
    });

    // Start "locking" the paddle to mouse when the player moves the mouse over it
    paddle.addEventListener('mouseenter', function() {
      isLocked = true;
      game.style.cursor = 'grab'; // Change cursor to indicate locked state
    });

    // Stop locking the paddle when mouse leaves the paddle area
    paddle.addEventListener('mouseleave', function() {
      isLocked = false;
      game.style.cursor = 'default'; // Reset cursor when leaving
    });
  }

  return paddle;
};
