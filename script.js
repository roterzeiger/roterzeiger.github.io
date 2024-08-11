let keysPressed = [];
let ws;
let visitorCount = document.getElementById('visitorCount');

document.addEventListener("keydown", (event) => {
    keysPressed[event.key] = true;

    // Handle Pong game activation
    if (keysPressed['2'] && keysPressed['5'] && keysPressed['8']) {
        document.getElementById("pongGame").style.display = "block";
        startPongGame();
        keysPressed = [];
    }

    // Handle visitor count display
    if (keysPressed['t'] && keysPressed['u'] && keysPressed['o']) {
        document.getElementById("visitorCount").style.display = "block";
        fetchVisitorCount();
        keysPressed = [];
    }

    // Show/hide the gif
    if (event.key === "a") {
        document.getElementById("altButton").style.display = "block";
    }

    // Toggle fullscreen mode
    if (event.key === "f") {
        toggleFullScreen();
    }
});

document.addEventListener("keyup", (event) => {
    keysPressed[event.key] = false;
});

function toggleDarkMode() {
    const currentTheme = document.documentElement.getAttribute("data-theme");
    const targetTheme = currentTheme === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", targetTheme);
    localStorage.setItem("theme", targetTheme);
}

document.addEventListener("DOMContentLoaded", () => {
    const savedTheme = localStorage.getItem("theme") || "light";
    document.documentElement.setAttribute("data-theme", savedTheme);
    startCountdown();
    connectToWebSocket();
});

document.getElementById("passwordInput").addEventListener("keydown", function(event) {
    if (event.key === "Enter") {
        const password = event.target.value;
        const validPasswords = ["Roterzeiger", "ichübernehmees", "max", "sicher", "sjoker", "fujitsu", "ichhattelangeweile"];
        if (validPasswords.includes(password)) {
            document.getElementById("passwordInput").style.display = "none";
            document.getElementById("textInput").style.display = "block";
            document.getElementById("successMessage").style.display = "block";
            document.getElementById("textInput").focus();
        } else {
            alert("Falsches Passwort. Bitte versuche es erneut.");
        }
    }
});

function showGif() {
    document.getElementById("gifImage").style.display = "block";
}

function startCountdown() {
    const countdownDate = new Date("August 31, 2024 00:00:00").getTime();
    const interval = setInterval(() => {
        const now = new Date().getTime();
        const distance = countdownDate - now;

        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);

        document.getElementById("countdown").innerHTML =
            `${days} Tage ${hours} Stunden ${minutes} Minuten ${seconds} Sekunden`;

        if (distance < 0) {
            clearInterval(interval);
            document.getElementById("countdown").innerHTML = "Der Countdown ist abgelaufen!";
        }
    }, 1000);
}

function toggleFullScreen() {
    const canvas = document.getElementById("pongGame");
    if (!document.fullscreenElement) {
        canvas.requestFullscreen().catch(err => {
            alert(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
        });
    } else {
        document.exitFullscreen();
    }
}

function startPongGame() {
    const canvas = document.getElementById("pongGame");
    const ctx = canvas.getContext("2d");

    const paddleHeight = 75;
    const paddleWidth = 10;
    const ballRadius = 10;
    let player1Y = (canvas.height - paddleHeight) / 2;
    let player2Y = (canvas.height - paddleHeight) / 2;
    let ballX = canvas.width / 2;
    let ballY = canvas.height / 2;
    let ballDX = 2;
    let ballDY = 2;
    let player1UpPressed = false;
    let player1DownPressed = false;
    let player2UpPressed = false;
    let player2DownPressed = false;

    document.addEventListener("keydown", (event) => {
        if (event.key === "w") player1UpPressed = true;
        if (event.key === "s") player1DownPressed = true;
        if (event.key === "ArrowUp") player2UpPressed = true;
        if (event.key === "ArrowDown") player2DownPressed = true;
        sendPlayerUpdate();
    });

    document.addEventListener("keyup", (event) => {
        if (event.key === "w") player1UpPressed = false;
        if (event.key === "s") player1DownPressed = false;
        if (event.key === "ArrowUp") player2UpPressed = false;
        if (event.key === "ArrowDown") player2DownPressed = false;
        sendPlayerUpdate();
    });

    function drawPaddle(x, y) {
        ctx.fillStyle = "#007bff";
        ctx.fillRect(x, y, paddleWidth, paddleHeight);
    }

    function drawBall() {
        ctx.beginPath();
        ctx.arc(ballX, ballY, ballRadius, 0, Math.PI * 2);
        ctx.fillStyle = "#007bff";
        ctx.fill();
        ctx.closePath();
    }

    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawPaddle(0, player1Y);
        drawPaddle(canvas.width - paddleWidth, player2Y);
        drawBall();

        if (player1UpPressed && player1Y > 0) {
            player1Y -= 7;
        } else if (player1DownPressed && player1Y < canvas.height - paddleHeight) {
            player1Y += 7;
        }

        if (player2UpPressed && player2Y > 0) {
            player2Y -= 7;
        } else if (player2DownPressed && player2Y < canvas.height - paddleHeight) {
            player2Y += 7;
        }

        ballX += ballDX;
        ballY += ballDY;

        if (ballY + ballDY > canvas.height - ballRadius || ballY + ballDY < ballRadius) {
            ballDY = -ballDY;
        }

        if (ballX + ballDX < paddleWidth) {
            if (ballY > player1Y && ballY < player1Y + paddleHeight) {
                ballDX = -ballDX;
            } else {
                resetBall();
            }
        } else if (ballX + ballDX > canvas.width - paddleWidth) {
            if (ballY > player2Y && ballY < player2Y + paddleHeight) {
                ballDX = -ballDX;
            } else {
                resetBall();
            }
        }

        sendGameState();
        requestAnimationFrame(draw);
    }

    function resetBall() {
        ballX = canvas.width / 2;
        ballY = canvas.height / 2;
        ballDX = -ballDX;
    }

    function sendGameState() {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
                type: 'update',
                player1Y: player1Y,
                player2Y: player2Y,
                ballX: ballX,
                ballY: ballY,
                ballDX: ballDX,
                ballDY: ballDY
            }));
        }
    }

    function sendPlayerUpdate() {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
                type: 'playerUpdate',
                player1Y: player1Y,
                player2Y: player2Y
            }));
        }
    }

    draw();
}

function connectToWebSocket() {
    ws = new WebSocket("ws://localhost:8080");

    ws.onopen = () => {
        console.log('Connected to WebSocket server');
    };

    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'update') {
            player1Y = data.player1Y;
            player2Y = data.player2Y;
            ballX = data.ballX;
            ballY = data.ballY;
            ballDX = data.ballDX;
            ballDY = data.ballDY;
        } else if (data.type === 'visitorCount') {
            visitorCount.innerText = `Aktuelle Besucher: ${data.count}`;
        }
    };

    ws.onerror = (error) => {
        console.error('WebSocket Error:', error);
    };

    ws.onclose = () => {
        console.log('Disconnected from WebSocket server');
    };
}

function fetchVisitorCount() {
    if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'getVisitorCount' }));
    }
}