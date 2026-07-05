// ============================
// Zing Arena - Tic Tac Toe
// ============================

// All Cells
const cells = document.querySelectorAll(".cell");

// Status Text
const statusText = document.getElementById("status");

// Restart Button
const restartBtn = document.getElementById("restart");

// Current Player
let currentPlayer = "X";

// Game Running
let gameRunning = true;

// Game Board
let board = [
    "", "", "",
    "", "", "",
    "", "", ""
];

// Winning Positions
const winPatterns = [
    [0,1,2],
    [3,4,5],
    [6,7,8],

    [0,3,6],
    [1,4,7],
    [2,5,8],

    [0,4,8],
    [2,4,6]
];

// ============================
// Event Listeners
// ============================

cells.forEach(cell => {
    cell.addEventListener("click", cellClicked);
});

restartBtn.addEventListener("click", restartGame);

// ============================
// Cell Click
// ============================

function cellClicked(){

    const index = this.getAttribute("data-index");

    if(board[index] !== "" || !gameRunning){
        return;
    }

    board[index] = currentPlayer;
    this.textContent = currentPlayer;

    checkWinner();
}

// ============================
// Check Winner
// ============================

function checkWinner(){

    let winner = false;

    for(let pattern of winPatterns){

        const a = board[pattern[0]];
        const b = board[pattern[1]];
        const c = board[pattern[2]];

        if(a === "" || b === "" || c === ""){
            continue;
        }

        if(a === b && b === c){
            winner = true;
            break;
        }
    }

    if(winner){

        statusText.textContent = `Player ${currentPlayer} Wins!`;

        gameRunning = false;

        return;
    }

    if(!board.includes("")){

        statusText.textContent = "Match Draw";

        gameRunning = false;

        return;
    }

    currentPlayer = currentPlayer === "X" ? "O" : "X";

    statusText.textContent = `Player ${currentPlayer} Turn`;
}

// ============================
// Restart Game
// ============================

function restartGame(){

    currentPlayer = "X";

    gameRunning = true;

    board = [
        "", "", "",
        "", "", "",
        "", "", ""
    ];

    statusText.textContent = "Player X Turn";

    cells.forEach(cell => {
        cell.textContent = "";
    });
}