const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const scoreBoard = document.getElementById("scoreBoard");

let box = 20;
let score = 0;
// Snake 3 blocks ke sath start hoga
let snake = [{ x: 9 * box, y: 10 * box }, { x: 8 * box, y: 10 * box }, { x: 7 * box, y: 10 * box }];
let food = { x: Math.floor(Math.random() * 19 + 1) * box, y: Math.floor(Math.random() * 19 + 1) * box };
let d = "RIGHT";

document.addEventListener("keydown", direction);
canvas.addEventListener("touchstart", handleTouch);

function direction(e) {
    if (e.keyCode == 37 && d != "RIGHT") d = "LEFT";
    else if (e.keyCode == 38 && d != "DOWN") d = "UP";
    else if (e.keyCode == 39 && d != "LEFT") d = "RIGHT";
    else if (e.keyCode == 40 && d != "UP") d = "DOWN";
}

function handleTouch(e) {
    let rect = canvas.getBoundingClientRect();
    let rx = e.touches[0].clientX - rect.left;
    let ry = e.touches[0].clientY - rect.top;
    if (Math.abs(rx - snake[0].x) > Math.abs(ry - snake[0].y)) d = (rx > snake[0].x && d != "LEFT") ? "RIGHT" : "LEFT";
    else d = (ry > snake[0].y && d != "UP") ? "DOWN" : "UP";
}

function draw() {
    ctx.fillStyle = "#1e293b";
    ctx.fillRect(0, 0, 400, 400);

    for (let i = 0; i < snake.length; i++) {
        ctx.fillStyle = (i == 0) ? "#22c55e" : "#86efac";
        ctx.fillRect(snake[i].x, snake[i].y, box, box);
    }

    ctx.fillStyle = "red";
    ctx.fillRect(food.x, food.y, box, box);

    let snakeX = snake[0].x;
    let snakeY = snake[0].y;
    if (d == "LEFT") snakeX -= box;
    else if (d == "UP") snakeY -= box;
    else if (d == "RIGHT") snakeX += box;
    else if (d == "DOWN") snakeY += box;

    if (snakeX == food.x && snakeY == food.y) {
        score++;
        scoreBoard.innerText = "Score: " + score;
        food = { x: Math.floor(Math.random() * 19 + 1) * box, y: Math.floor(Math.random() * 19 + 1) * box };
    } else { snake.pop(); }

    let newHead = { x: snakeX, y: snakeY };
    if (snakeX < 0 || snakeX >= 400 || snakeY < 0 || snakeY >= 400 || collision(newHead, snake)) {
        clearInterval(game);
        alert("Game Over! Score: " + score);
        window.location.href = window.location.pathname + '?nocache=' + new Date().getTime();
    }
    snake.unshift(newHead);
}
function collision(head, array) { for(let i=0; i<array.length; i++) if(head.x==array[i].x && head.y==array[i].y) return true; return false; }
let game = setInterval(draw, 100);