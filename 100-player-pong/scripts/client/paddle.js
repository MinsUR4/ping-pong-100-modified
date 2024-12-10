const createPaddle = function (game, socket, options) {
  const paddle = document.createElement('div');
  paddle.style.left = options.x + '%';
  paddle.style.top = options.y + '%';
  paddle.classList.add('paddle');
  paddle.style.backgroundColor = options.color;
  game.appendChild(paddle);

  let isAdminMode = false; // Track if admin mode is active
  const enteredCode = []; // Buffer for storing entered keys

  // Function to enable admin mode
  const enableAdminMode = () => {
    paddle.style.width = '10%'; // Make paddle longer
    game.addEventListener('mousemove', adminMouseMoveHandler); // Enable full movement
    isAdminMode = true;
    console.log('Admin Mode Enabled');
  };

  // Function to handle mouse movement in admin mode
  const adminMouseMoveHandler = (event) => {
    const gameRect = game.getBoundingClientRect();
    const maxX = game.offsetWidth - paddle.offsetWidth;
    const maxY = game.offsetHeight - paddle.offsetHeight;

    // Calculate new paddle position based on mouse coordinates
    const newLeft = Math.max(0, Math.min(event.clientX - gameRect.left - paddle.offsetWidth / 2, maxX));
    const newTop = Math.max(0, Math.min(event.clientY - gameRect.top - paddle.offsetHeight / 2, maxY));

    paddle.style.left = `${newLeft}px`;
    paddle.style.top = `${newTop}px`;

    // Send paddle position to server
    const percentX = (newLeft / game.offsetWidth) * 100;
    const percentY = (newTop / game.offsetHeight) * 100;
    socket.send({ type: 'movePlayer', x: percentX, y: percentY });
  };

  // Add mouse and keyboard controls if this is the client's paddle
  if (options.isClient) {
    let startY = 0;
    let lastSentY = options.y;
    const throttleDelay = 50;
    let lastMoveTime = 0;

    // Standard mouse movement control
    game.addEventListener('mousemove', function movePaddle(event) {
      if (isAdminMode) return; // Skip default movement if in admin mode
      const newY = event.clientY - startY;
      const maxY = game.offsetHeight - paddle.offsetHeight;
      const boundedY = Math.max(0, Math.min(newY, maxY));
      paddle.style.top = `${boundedY}px`;

      if (boundedY === 0) {
        startY = event.clientY;
      } else if (boundedY === maxY) {
        startY = event.clientY - maxY;
      }

      const percent = (boundedY / game.offsetHeight) * 100;

      const now = Date.now();
      if (now - lastMoveTime >= throttleDelay) {
        if (Math.abs(lastSentY - percent) >= 0.5) {
          socket.send({ type: 'movePlayer', y: percent });
          lastSentY = percent;
          lastMoveTime = now;
        }
      }
    });

    // Keyboard controls for up and down
    document.addEventListener('keydown', (event) => {
      if (isAdminMode) return; // Skip standard movement if in admin mode
      const maxY = game.offsetHeight - paddle.offsetHeight;
      let currentTop = parseFloat(paddle.style.top);
      if (event.key === 'ArrowDown' || event.key === 's') {
        currentTop = Math.min(currentTop + 10, maxY);
      } else if (event.key === 'ArrowUp' || event.key === 'w') {
        currentTop = Math.max(currentTop - 10, 0);
      }
      paddle.style.top = `${currentTop}px`;

      const percent = (currentTop / game.offsetHeight) * 100;
      socket.send({ type: 'movePlayer', y: percent });
    });

    // Listen for the admin code
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
  }

  return paddle;
};
