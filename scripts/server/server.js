'use strict';

const WebSocket = require('ws');
const utils = require('../utils'); // Ensure your `utils` module provides `randomColor` and `randomIntBetween`

const wss = new WebSocket.Server({ port: 8080 });

// Utility to broadcast to all clients
wss.broadcast = function (msg) {
  const message = JSON.stringify(msg);
  for (const client of wss.clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  }
};

// ID Generator
const generateId = (() => {
  let id = 0;
  return () => `user${id++}`;
})();

// Paddle spawn position logic
const getX = (paddleWidth) => {
  let leftCount = 0, rightCount = 0;

  for (const client of wss.clients) {
    if (client.readyState !== WebSocket.OPEN || !client.paddle) continue;
    if (client.paddle.position.x < 50) {
      leftCount++;
    } else {
      rightCount++;
    }
  }

  return leftCount > rightCount
    ? utils.randomIntBetween(50, 100 - paddleWidth) // Spawn on right
    : utils.randomIntBetween(0, 50 - paddleWidth);  // Spawn on left
};

// Initialize new ball state
const newBall = () => ({
  position: { x: 50, y: 50 },
  velocity: { x: -0.4, y: 0 },
  width: 1,
  height: 2,
});

// Initialize score
const newScore = () => ({ a: 0, b: 0 });

let ball = newBall();
let score = newScore();

const fps = 60;
const refreshRate = 1000 / fps;
const broadcastRate = 24;
const framesPerBroadcast = Math.floor(fps / broadcastRate);
let frame = 0;

// Connection logic
wss.on('connection', (ws) => {
  const id = generateId();
  ws.id = id;
  console.log(`${id} connected`);

  // Initialize paddle and assign position
  ws.paddle = { width: 1, height: 10, position: { y: 50 } };
  ws.paddle.position.x = getX(ws.paddle.width);
  ws.color = utils.randomColor();

  // Notify others about the new player
  wss.broadcast({
    type: 'spawnPlayer',
    id,
    x: ws.paddle.position.x,
    y: ws.paddle.position.y,
    color: ws.color,
  });

  // Send new player data about existing players
  for (const client of wss.clients) {
    if (client !== ws && client.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({
        type: 'spawnPlayer',
        id: client.id,
        x: client.paddle.position.x,
        y: client.paddle.position.y,
        color: client.color,
      }));
    }
  }

  // Send initial score and ball position
  ws.send(JSON.stringify({ type: 'score', score }));
  ws.send(JSON.stringify({ type: 'moveBall', x: ball.position.x, y: ball.position.y }));

  // Cleanup on disconnect
  ws.on('close', () => {
    console.log(`${id} disconnected`);
    wss.broadcast({ type: 'destroyPlayer', id });
  });

  // Handle player messages
  ws.on('message', (message) => {
    try {
      const msg = JSON.parse(message);
      if (msg.type === 'movePlayer') {
        ws.paddle.position.y = msg.y;
        wss.broadcast({ type: 'movePlayer', id, y: msg.y });
      }
    } catch (e) {
      console.error('Invalid message', e);
    }
  });
});

// Game loop
setInterval(() => {
  // Update ball position
  ball.position.x += ball.velocity.x;
  ball.position.y += ball.velocity.y;

  // Ball collision with walls
  if (ball.position.y < 0 || ball.position.y + ball.height > 100) {
    ball.velocity.y *= -1;
  }

  // Ball collision with paddles
  for (const client of wss.clients) {
    if (client.readyState !== WebSocket.OPEN || !client.paddle) continue;

    const paddle = client.paddle;
    const isColliding = (a, b) =>
      a.position.x < b.position.x + b.width &&
      a.position.x + a.width > b.position.x &&
      a.position.y < b.position.y + b.height &&
      a.position.y + a.height > b.position.y;

    if (isColliding(ball, paddle)) {
      ball.velocity.x *= -1.05;
      ball.velocity.y *= 1.05;
      wss.broadcast({ type: 'hit' });
      break;
    }
  }

  // Ball scoring
  if (ball.position.x < 0 || ball.position.x > 100) {
    score[ball.position.x < 0 ? 'b' : 'a']++;
    ball = newBall();
    wss.broadcast({ type: 'score', score });
  }

  // Broadcast ball position periodically
  if (frame % framesPerBroadcast === 0) {
    wss.broadcast({ type: 'moveBall', x: ball.position.x, y: ball.position.y });
  }

  frame++;
}, refreshRate);