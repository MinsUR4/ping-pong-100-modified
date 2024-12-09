(function() {
  'use strict';

  const WebSocketServer = require('ws').Server;
  const wss = new WebSocketServer({ port: 8080 });
  const utils = require('../utils');

  wss.broadcast = function broadcast(msg) {
    const str = JSON.stringify(msg);
    wss.clients.forEach(function(client) {
      if (client.readyState !== client.OPEN) {
        console.log(client.id, 'state is', client.readyState);
        return;
      }
      client.send(str);
    });
  };

  const idGen = (function() {
    let id = 0;
    return function() {
      return 'user' + id++;
    };
  }());

  const getX = function(paddle) {
    let leftCount = 0;
    let rightCount = 0;
    wss.clients.forEach(function(client) {
      if (!client.paddle.position.x) {
        return;
      }
      if (client.paddle.position.x < 50) {
        leftCount++;
      } else {
        rightCount++;
      }
    });
    if (leftCount > rightCount) {
      return utils.randomIntBetween(50, 100 - paddle.width);
    } else {
      return utils.randomIntBetween(0, 50 - paddle.width);
    }
  };

  wss.on('connection', function connection(ws) {
    const id = idGen();
    console.log(id, 'connected');
    ws.id = id;

    ws.sendStr = function(msg) {
      if (wss.clients.indexOf(ws) === -1 || ws.readyState !== ws.OPEN) {
        console.log(ws.id, 'state is', ws.readyState);
        return;
      }
      ws.send(JSON.stringify(msg));
    };

    ws.sendStr({ type: 'id', id });
    ws.sendStr({ type: 'score', score });

    ws.paddle = { width: 1, height: 10 };
    ws.paddle.position = { y: 50 - (ws.paddle.height / 2) };
    ws.paddle.position.x = getX(ws.paddle);
    ws.color = utils.randomColor();

    wss.clients.forEach(function(client) {
      if (client.id === id) {
        return;
      }
      ws.sendStr({ type: 'spawnPlayer', id: client.id, x: client.paddle.position.x, y: client.paddle.position.y, color: client.color });
    });

    wss.broadcast({ type: 'spawnPlayer', id, x: ws.paddle.position.x, y: ws.paddle.position.y, color: ws.color });

    ws.on('close', function() {
      wss.broadcast({ type: 'destroyPlayer', id: id });
      console.log(id, 'disconnected');
    });

    ws.on('message', function incoming(message) {
      const msg = JSON.parse(message);
      const messageHandlers = {
        movePlayer() {
          ws.paddle.position.y = msg.y;
          wss.broadcast(msg);
        }
      };
      messageHandlers[msg.type]();
    });
  });

  // Game Loop
  const fps = 60;
  const refreshRate = 1000 / fps;
  const broadcastRate = 24; 
  const framesPerBroadcast = fps / broadcastRate;
  let frame = 0;

  const newBall = function() {
    let ball = {
      velocity: { x: -0.4, y: 0 },
      width: 1,
      height: 2
    };
    ball.position = { x: 50 - (ball.width / 2), y: 50 - (ball.height / 2) };
    return ball;
  };

  const newScore = function() {
    return { a: 0, b: 0 };
  };

  let ball = newBall();
  let score = newScore();

  const loop = setInterval(function() {
    ball.position.x += ball.velocity.x;
    ball.position.y += ball.velocity.y;

    if (ball.position.y < 0 || ball.position.y + ball.height > 100) {
      if (ball.velocity.y > 0) {
        ball.position.y = 100 - ball.height;
      } else {
        ball.position.y = 0;
      }
      ball.velocity.y = -ball.velocity.y;
    }

    let hasBounced = false;
    wss.clients.forEach(function(client) {
      if (hasBounced) return;

      const objectsAreColliding = function(a, b) {
        return a.position.x < b.position.x + b.width &&
               a.position.x + a.width > b.position.x &&
               a.position.y < b.position.y + b.height &&
               a.height + a.position.y > b.position.y;
      };

      const ballIntersectsPaddle = objectsAreColliding(client.paddle, ball);

      const ballWillIntersectPaddle = (function() {
        let ballYNextFrame = ball.position.y + ball.velocity.y;
        ballYNextFrame = ballYNextFrame < 0 ? 0 : ballYNextFrame + ball.height > 100 ? 100 - ball.height : ballYNextFrame;
        const ballNextFrame = Object.assign({}, ball, { position: { x: ball.position.x + ball.velocity.x, y: ballYNextFrame } });
        let ballWillPhaseThroughPaddle;
        const ballYDoesAndWillIntersectPaddleY = ball.position.y < client.paddle.position.y + client.paddle.height &&
                                                  ball.height + ball.position.y > client.paddle.position.y &&
                                                  ballNextFrame.position.y < client.paddle.position.y + client.paddle.height &&
                                                  ballNextFrame.height + ballNextFrame.position.y > client.paddle.position.y;
        if (ball.velocity.x > 0) {
          ballWillPhaseThroughPaddle = ball.position.x + ball.width < client.paddle.position.x &&
                                       ballNextFrame.position.x > client.paddle.position.x + client.paddle.width &&
                                       ballYDoesAndWillIntersectPaddleY;
        } else {
          ballWillPhaseThroughPaddle = ball.position.x > client.paddle.position.x + client.paddle.width &&
                                       ballNextFrame.position.x + ballNextFrame.width < client.paddle.position.x &&
                                       ballYDoesAndWillIntersectPaddleY;
        }
        return ballWillPhaseThroughPaddle;
      }());

      if (ballIntersectsPaddle || ballWillIntersectPaddle) {
        (function bounceOffPaddle() {
          if (ball.velocity.x > 0) {
            ball.position.x = client.paddle.position.x - ball.height;
          } else {
            ball.position.x = client.paddle.position.x + client.paddle.width;
          }

          const n = (ball.position.y + ball.width - client.paddle.position.y) / (client.paddle.height + ball.height);
          const fortyFiveDegrees = 0.25 * Math.PI;
          const n2 = 2 * n - 1;
          const phi = fortyFiveDegrees * n2;
          ball.velocity.x = -ball.velocity.x;
          ball.velocity.y = Math.sin(phi);
          ball.velocity.x *= 1.05;
          ball.velocity.y *= 1.05;
          hasBounced = true;
          wss.broadcast({ type: 'hit' });
        })();
      }
    });

    if (ball.position.x < 0) {
      score.b++;
      ball = newBall();
      wss.broadcast({ type: 'goal' });
      wss.broadcast({ type: 'score', score });
    } else if (ball.position.x > 100) {
      score.a++;
      ball = newBall();
      ball.velocity.x *= -1;
      wss.broadcast({ type: 'goal' });
      wss.broadcast({ type: 'score', score });
    }

    const maxScore = 11;
    if (score.a >= maxScore || score.b >= maxScore) {
      score = newScore();
      wss.broadcast({ type: 'win' });
    } else {
      if (frame % framesPerBroadcast === 0) {
        wss.broadcast({ type: 'moveBall', x: ball.position.x, y: ball.position.y });
      }
      frame++;
      if (frame > framesPerBroadcast) {
        frame = 0;
      }
    }
  }, refreshRate);
})();
