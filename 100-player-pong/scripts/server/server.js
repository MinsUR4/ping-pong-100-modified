(function () {
    'use strict';

    const { Server } = require('ws');
    const utils = require('../utils');

    const wss = new Server({ port: 8080 });

    // Broadcast a message to all connected clients
    wss.broadcast = (msg) => {
        const str = JSON.stringify(msg);
        wss.clients.forEach((client) => {
            if (client.readyState === client.OPEN) {
                client.send(str);
            }
        });
    };

    // Generate unique IDs for clients
    const generateId = (() => {
        let id = 0;
        return () => `user${id++}`;
    })();

    // Calculate paddle spawn position
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

    // Create a new ball object
    const createBall = () => ({
        velocity: { x: -0.4, y: 0 },
        width: 1,
        height: 2,
        position: { x: 49.5, y: 49 }
    });

    // Initialize scores
    const createScore = () => ({ a: 0, b: 0 });

    // Ball and score state
    let ball = createBall();
    let score = createScore();

    // Handle new connections
    wss.on('connection', (ws) => {
        const id = generateId();
        console.log(`${id} connected`);

        ws.id = id;
        ws.sendStr = (msg) => {
            if (ws.readyState === ws.OPEN) {
                ws.send(JSON.stringify(msg));
            }
        };

        ws.paddle = { width: 1, height: 10, position: { y: 45, x: getPaddleX({ width: 1 }) } };
        ws.color = utils.randomColor();

        ws.sendStr({ type: 'id', id });
        ws.sendStr({ type: 'score', score });

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

    // Server game loop
    const fps = 60;
    const refreshRate = 1000 / fps;
    const framesPerBroadcast = Math.floor(fps / 24);
    let frame = 0;

    setInterval(() => {
        // Update ball position
        ball.position.x += ball.velocity.x;
        ball.position.y += ball.velocity.y;

        // Ball-wall collision
        if (ball.position.y <= 0 || ball.position.y + ball.height >= 100) {
            ball.position.y = Math.max(0, Math.min(ball.position.y, 100 - ball.height));
            ball.velocity.y *= -1;
        }

        // Ball-paddle collision
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

        // Score and ball reset
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

        if (frame++ % framesPerBroadcast === 0) {
            wss.broadcast({ type: 'moveBall', x: ball.position.x, y: ball.position.y });
        }
    }, refreshRate);
})();
