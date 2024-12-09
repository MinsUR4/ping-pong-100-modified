const createPaddle = function(game, socket, options) {
  const paddle = document.createElement('div');
  paddle.style.left = options.x + '%';
  paddle.style.top = options.y + '%';
  paddle.classList.add('paddle');
  paddle.style.backgroundColor = options.color;
  game.appendChild(paddle);

  // add mouse controls if this paddle is the one we (the player) are to control
  if (options.isClient) {
    let startY = options.y; // Initial paddle position
    let mouseStartY = 0; // Starting mouse Y position when drag starts
    let isDragging = false; // Track if we are dragging the paddle

    // Throttle parameters
    const throttleDelay = 50;
    let lastMoveTime = 0;

    game.addEventListener('mousedown', function(event) {
      // Check if mouse is over the paddle and start dragging
      if (event.clientY >= paddle.offsetTop && event.clientY <= paddle.offsetTop + paddle.offsetHeight) {
        isDragging = true;
        mouseStartY = event.clientY - paddle.offsetTop; // Record the starting offset
        game.style.cursor = 'grabbing'; // Change the cursor to indicate dragging
      }
    });

    game.addEventListener('mousemove', function(event) {
      if (isDragging) {
        const mouseOffsetY = event.clientY - mouseStartY;
        const maxY = game.offsetHeight - paddle.offsetHeight;
        const newY = Math.max(0, Math.min(mouseOffsetY, maxY)); // Clamp to the game bounds
        paddle.style.top = `${newY}px`;

        // Send position to the server if the position changed significantly
        const percent = (newY / game.offsetHeight) * 100;

        const now = Date.now();
        if (now - lastMoveTime >= throttleDelay) {
          socket.send({ type: 'movePlayer', y: percent });
          lastMoveTime = now;
        }
      }
    });

    // Stop dragging when mouse is released
    game.addEventListener('mouseup', function() {
      if (isDragging) {
        isDragging = false;
        game.style.cursor = 'default'; // Reset cursor
      }
    });

    // Optionally, handle mouse out of game area (stop dragging if the mouse leaves)
    game.addEventListener('mouseleave', function() {
      if (isDragging) {
        isDragging = false;
        game.style.cursor = 'default'; // Reset cursor
      }
    });
  }

  return paddle;
};
