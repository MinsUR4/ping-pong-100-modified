const createPaddle = function(game, socket, options) {
  const paddle = document.createElement('div');
  paddle.style.left = options.x + '%';
  paddle.style.top = options.y + '%';
  paddle.classList.add('paddle');
  paddle.style.backgroundColor = options.color;
  game.appendChild(paddle);

  if (options.isClient) {
    let paddleY = options.y;
    let isLocked = false;

    const throttleDelay = 50;
    let lastMoveTime = 0;

    game.addEventListener('mousemove', function(event) {
      if (isLocked) {
        const maxY = game.offsetHeight - paddle.offsetHeight;
        const mouseY = event.clientY;
        const newY = Math.max(0, Math.min(mouseY, maxY));
        paddle.style.top = `${newY}px`;

        const percent = (newY / game.offsetHeight) * 100;

        const now = Date.now();
        if (now - lastMoveTime >= throttleDelay) {
          socket.send({ type: 'movePlayer', y: percent });
          lastMoveTime = now;
        }
      }
    });

    paddle.addEventListener('mouseenter', function() {
      isLocked = true;
      game.style.cursor = 'grab';
    });

    paddle.addEventListener('mouseleave', function() {
      isLocked = false;
      game.style.cursor = 'default';
    });

    const moveSpeed = 2;
    const arrowKeySpeed = 5;
    const movePaddleWithKeys = function(event) {
      const maxY = game.offsetHeight - paddle.offsetHeight;
      const currentTop = parseFloat(paddle.style.top);

      if (event.key === 'ArrowUp' || event.key === 'w') {
        const speed = (event.key === 'ArrowUp') ? arrowKeySpeed : moveSpeed;
        paddleY = Math.max(0, currentTop - speed);
      }
      if (event.key === 'ArrowDown' || event.key === 's') {
        const speed = (event.key === 'ArrowDown') ? arrowKeySpeed : moveSpeed;
        paddleY = Math.min(maxY, currentTop + speed);
      }

      paddle.style.top = `${paddleY}px`;

      const percent = (paddleY / game.offsetHeight) * 100;
      const now = Date.now();
      if (now - lastMoveTime >= throttleDelay) {
        socket.send({ type: 'movePlayer', y: percent });
        lastMoveTime = now;
      }
    };

    window.addEventListener('keydown', movePaddleWithKeys);
  }

  return paddle;
};
