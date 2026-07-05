const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const scoreElement = document.getElementById("score");

let score = 0;
let ballRadius = 8;
let x = canvas.width / 2;
let y = canvas.height - 30;
let dx = 3;
let dy = -3;
let paddleHeight = 10;
let paddleWidth = 80;
let paddleX = (canvas.width - paddleWidth) / 2;
let animationId; // Loop ko control karne ke liye ID

document.addEventListener("keydown", (e) => {
    if(e.key === "ArrowRight" && paddleX < canvas.width - paddleWidth) paddleX += 40;
    if(e.key === "ArrowLeft" && paddleX > 0) paddleX -= 40;
});

canvas.addEventListener("touchstart", (e) => {
    let touchX = e.touches[0].clientX - canvas.getBoundingClientRect().left;
    paddleX = touchX - paddleWidth / 2;
});

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw Ball
    ctx.beginPath();
    ctx.arc(x, y, ballRadius, 0, Math.PI * 2);
    ctx.fillStyle = "#fff";
    ctx.fill();
    ctx.closePath();

    // Draw Paddle
    ctx.fillStyle = "#f59e0b";
    ctx.fillRect(paddleX, canvas.height - paddleHeight - 5, paddleWidth, paddleHeight);

    // Ball movement
    if(x + dx > canvas.width - ballRadius || x + dx < ballRadius) dx = -dx;
    if(y + dy < ballRadius) dy = -dy;
    else if(y + dy > canvas.height - paddleHeight - 15) {
        if(x > paddleX && x < paddleX + paddleWidth) {
            dy = -dy;
            score++;
            scoreElement.innerText = "Score: " + score;
        } else if (y + dy > canvas.height) {
            cancelAnimationFrame(animationId); // Loop ko rok do
            alert("GAME OVER! Final Score: " + score);
            // Ab hard refresh karo
            window.location.reload(); 
            return;
        }
    }

    x += dx;
    y += dy;
    animationId = requestAnimationFrame(draw);
}

draw();