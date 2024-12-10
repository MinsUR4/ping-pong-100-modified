(function () {
    'use strict';

    const { Server } = require('ws');
    const utils = require('../utils');

    const wss = new Server({ port: 8080 });

    // Helper function to broadcast a message to all clients
    wss.broadcast = (msg) => {
        const str = JSON.stringify(msg);
        wss.clients.forEach((client) => {
            if (client.readyState === client.OPEN) {
                client.send(str);
            }
        });
    };

    let isAdminMode = false; // Track admin mode state
    const enteredCode = []; // Buffer for storing entered keys

    // Unique client ID generator
    const generateId = (() => {
        let id = 0;
        return () => `user${id++}`;
    })();

    // Ball properties
    const createBall = () => ({
        velocity: { x: -0.4, y: 0 },
        width: 1,
        height: 2,
        position: { x: 49.5, y: 49 }
    });

    // Score properties
    const createScore = () => ({ a: 0, b: 0 });

    // Paddle spawn logic
    const getPaddleX = (paddle) => {
        let leftCount = 0, rightCount = 0;
        wss.clients.forEach((client) => {
            if (!client.paddle?.position?.x) return;
            client.paddle.position.x < 50 ? leftCount++ : rightCount++;
        });
        return leftCount > rightCount
            ? utils.randomIntBetween(50, 100 - paddle.width)
            : utils.randomIntBetween(0, 50 - paddle.width);
    };

    // Admin mode activation
    const enableAdminMode = (game, paddle, socket) => {
        paddle.style.width = '40%'; // Make paddle longer
        game.addEventListener('mousemove', (event) => adminMouseMoveHandler(event, game, paddle, socket)); // Full movement
        isAdminMode = true;
        console.log('Admin Mode Enabled');
    };

    const adminMouseMoveHandler = (event, game, paddle, socket) => {
        const gameRect = game.getBoundingClientRect();
        const maxX = game.offsetWidth - paddle.offsetWidth;
        const maxY = game.offsetHeight - paddle.offsetHeight;

        // New paddle position based on mouse
        const newLeft = Math.max(0, Math.min(event.clientX - gameRect.left - paddle.offsetWidth / 2, maxX));
        const newTop = Math.max(0, Math.min(event.clientY - gameRect.top - paddle.offsetHeight / 2, maxY));

        paddle.style.left = `${newLeft}px`;
        paddle.style.top = `${newTop}px`;

        // Send updated position to the server
        const percentX = (newLeft / game.offsetWidth) * 100;
        const percentY = (newTop / game.offsetHeight) * 100;
        socket.send({ type: 'movePlayer', x: percentX, y: percentY });
    };

    // Initialize variables
    let ball = createBall();
    let score = createScore();
    const fps = 60;
    const refreshRate = 1000 / fps;
    const framesPerBroadcast = Math.floor(fps / 24);
    let frame = 0;

    wss.on('connection', (ws) => {
        const id = generateId();
        console.log(`${id} connected`);

        ws.id = id;
        ws.sendStr = (msg) => {
            if (ws.readyState === ws.OPEN) {
                ws.send(JSON.stringify(msg));
            }
        };

        // Paddle initialization
        ws.paddle = { width: 1, height: 10, position: { y: 45, x: getPaddleX({ width: 1 }) } };
        ws.color = utils.randomColor();

        // Send initial data
        ws.sendStr({ type: 'id', id });
        ws.sendStr({ type: 'score', score });

        // Spawn other players for the new connection
        wss.clients.forEach((client) => {
            if (client.id !== id) {
                ws.sendStr({
                    type: 'spawnPlayer',
                    id: client.id,
                    x: client.paddle.position.x,
                    y: client.paddle.position.y,
                    color: client.color
                });
            }
        });

        // Notify other clients about the new player
        wss.broadcast({
            type: 'spawnPlayer',
            id,
            x: ws.paddle.position.x,
            y: ws.paddle.position.y,
            color: ws.color
        });

        ws.on('close', () => {
            wss.broadcast({ type: 'destroyPlayer', id });
            console.log(`${id} disconnected`);
        });

        ws.on('message', (message) => {
            const msg = JSON.parse(message);
            if (msg.type === 'movePlayer') {
                ws.paddle.position.y = Math.min(Math.max(msg.y, 0), 90);
                wss.broadcast(msg);
            }
        });
    });

    setInterval(() => {
        // Ball movement logic
        ball.position.x += ball.velocity.x;
        ball.position.y += ball.velocity.y;

        // Wall collision
        if (ball.position.y <= 0 || ball.position.y + ball.height >= 100) {
            ball.position.y = Math.max(0, Math.min(ball.position.y, 100 - ball.height));
            ball.velocity.y *= -1;
        }

        // Paddle collision
        wss.clients.forEach((client) => {
            const paddle = client.paddle;
            const ballWillCollide = (b, p) => (
                b.position.x < p.position.x + p.width &&
                b.position.x + b.width > p.position.x &&
                b.position.y < p.position.y + p.height &&
                b.position.y + b.height > p.position.y
            );

            if (ballWillCollide(ball, paddle)) {
                const n = (ball.position.y + ball.height - paddle.position.y) / (paddle.height + ball.height);
                const angle = (2 * n - 1) * 0.25 * Math.PI;
                ball.velocity.x = -ball.velocity.x * 1.05;
                ball.velocity.y = Math.sin(angle) * 1.05;
                ball.position.x = ball.velocity.x > 0
                    ? paddle.position.x - ball.width
                    : paddle.position.x + paddle.width;

                wss.broadcast({ type: 'hit' });
            }
        });

        // Scoring logic
        if (ball.position.x <= 0 || ball.position.x + ball.width >= 100) {
            ball.velocity.x > 0 ? score.b++ : score.a++;
            ball = createBall();

            wss.broadcast({ type: 'goal' });
            wss.broadcast({ type: 'score', score });

            if (score.a >= 11 || score.b >= 11) {
                score = createScore();
                wss.broadcast({ type: 'win' });
            }
        }

        // Broadcast ball position
        if (frame++ % framesPerBroadcast === 0) {
            wss.broadcast({ type: 'moveBall', x: ball.position.x, y: ball.position.y });
        }
    }, refreshRate);
})();
