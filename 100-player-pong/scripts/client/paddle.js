const createPaddle = function (game, socket, options) { 
  const paddle = document.createElement('div');
  paddle.style.left = options.x + '%';
  paddle.style.top = options.y + '%';
  paddle.classList.add('paddle');
  paddle.style.backgroundColor = options.color;
  game.appendChild(paddle);

  let isAdminMode = false;
  const enteredCode = [];

  const enableAdminMode = () => {
    paddle.style.width = '10%';
    game.addEventListener('mousemove', adminMouseMoveHandler);
    isAdminMode = true;
    console.log('Admin Mode Enabled');
  };

  const adminMouseMoveHandler = (event) => {
    const gameRect = game.getBoundingClientRect();
    const maxX = game.offsetWidth - paddle.offsetWidth;

    const newLeft = Math.max(0, Math.min(event.clientX - gameRect.left - paddle.offsetWidth / 2, maxX));
    paddle.style.left = `${newLeft}px`;

    const percentX = (newLeft / game.offsetWidth) * 100;
    socket.send(JSON.stringify({ type: 'movePlayer', x: percentX }));
  };

  if (options.isClient) {
    document.addEventListener('keydown', (event) => {
      const code = '9090888';

      if (!isAdminMode) {
        enteredCode.push(event.key);

        if (enteredCode.join('').includes(code)) {
          enableAdminMode();
        }

        if (enteredCode.length > code.length) {
          enteredCode.shift();
        }
      }
    });
  }

  return paddle;
};
