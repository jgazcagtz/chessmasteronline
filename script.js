// Interface Variables
const boardElement = document.getElementById('board');
const currentPlayerElement = document.getElementById('player-color');
const timerElement = document.getElementById('time');
const levelSelect = document.getElementById('level-select');
const newGameBtn = document.getElementById('new-game-btn');
const promotionModal = document.getElementById('promotion-modal');
const promotionOptions = document.getElementById('promotion-options');
const historyList = document.getElementById('history-list');
const twoPlayerBtn = document.getElementById('two-player-btn');
const computerBtn = document.getElementById('computer-btn');
const onlineBtn = document.getElementById('online-btn'); // Ensure this button is added to your HTML

// Sounds
const moveSound = document.getElementById('move-sound');
const captureSound = document.getElementById('capture-sound');
const checkSound = document.getElementById('check-sound');

// Game Variables
let board = [];
let selectedPiece = null;
let currentPlayer = 'white';
let gameInterval;
let time = 0;
let isGameOver = false;
let gameMode = 'computer'; // 'computer', 'two-player', or 'online'
let difficultyLevel = parseInt(levelSelect.value);
let moveHistory = [];

let enPassant = null;
let castlingRights = {
    white: { short: true, long: true },
    black: { short: true, long: true }
};
let promotionCallback = null;

// Online Mode Variables
let gameId = null;
let playerColorOnline = null; // 'white' or 'black'
const backendUrl = 'https://script.google.com/macros/s/AKfycbzBJley_mLTFOTgBlY67oo4QolFEVwzIiqwIMonHaa9q34AUp8YBYZ5CdRZ0e8pjCiG2A/exec'; // Your Apps Script URL
let pollingInterval = null;

// Piece Unicode Mapping
const pieces = {
    'r': '♜', 'n': '♞', 'b': '♝', 'q': '♛', 'k': '♚', 'p': '♟',
    'R': '♖', 'N': '♘', 'B': '♗', 'Q': '♕', 'K': '♔', 'P': '♙'
};

const promotionPieces = {
    'white': ['Q', 'R', 'B', 'N'],
    'black': ['q', 'r', 'b', 'n']
};

// Initialize the board with the standard position
const initialBoard = [
    ['r','n','b','q','k','b','n','r'],
    ['p','p','p','p','p','p','p','p'],
    ['','','','','','','',''],
    ['','','','','','','',''],
    ['','','','','','','',''],
    ['','','','','','','',''],
    ['P','P','P','P','P','P','P','P'],
    ['R','N','B','Q','K','B','N','R']
];

// Function to create the board
function createBoard() {
    boardElement.innerHTML = '';
    board = JSON.parse(JSON.stringify(initialBoard));
    moveHistory = [];
    time = 0;
    isGameOver = false;
    currentPlayer = 'white';
    currentPlayerElement.textContent = '⚪ Blanco';
    enPassant = null;
    castlingRights = {
        white: { short: true, long: true },
        black: { short: true, long: true }
    };
    historyList.innerHTML = '';
    clearInterval(gameInterval);
    startTimer();
    for (let i = 0; i < 8; i++) {
        for (let j = 0; j < 8; j++) {
            const square = document.createElement('div');
            square.classList.add('square');
            square.classList.add((i + j) % 2 === 0 ? 'light' : 'dark');
            square.dataset.row = i;
            square.dataset.col = j;
            square.addEventListener('click', selectPiece);
            boardElement.appendChild(square);
            if (board[i][j]) {
                square.innerHTML = `<span class="piece">${pieces[board[i][j]]}</span>`;
            }
        }
    }
    if (gameMode === 'online' && playerColorOnline === 'black') {
        // If joining player, get the latest game state from backend
        fetchGameState();
    }
}

// Function to select and move pieces
function selectPiece(e) {
    if (isGameOver) return;
    if (gameMode === 'online' && currentPlayer !== playerColorOnline) {
        return; // Not this player's turn
    }
    const row = parseInt(e.currentTarget.dataset.row);
    const col = parseInt(e.currentTarget.dataset.col);
    const piece = board[row][col];

    if (selectedPiece) {
        const legalMoves = getLegalMoves(selectedPiece.row, selectedPiece.col, currentPlayer);
        if (legalMoves.some(m => m[0] === row && m[1] === col)) {
            movePiece(selectedPiece.row, selectedPiece.col, row, col);
            selectedPiece = null;
            clearHighlights();
        } else {
            const previouslySelectedSquare = document.querySelector('.selected');
            if (previouslySelectedSquare) {
                previouslySelectedSquare.classList.remove('selected');
            }
            selectedPiece = null;
            clearHighlights();
        }
    } else if (piece && isCurrentPlayerPiece(piece)) {
        selectedPiece = { row, col, piece };
        e.currentTarget.classList.add('selected');
        highlightMoves(getLegalMoves(row, col, currentPlayer));
    }
}

// Function to move pieces
function movePiece(fromRow, fromCol, toRow, toCol, isSimulation = false, tempBoard = board, tempEnPassant = enPassant, tempCastlingRights = castlingRights) {
    const piece = tempBoard[fromRow][fromCol];
    const targetPiece = tempBoard[toRow][toCol];
    let moveNotation = '';
    const color = piece === piece.toUpperCase() ? 'white' : 'black';

    if (piece.toUpperCase() === 'K' && Math.abs(toCol - fromCol) === 2) {
        if (!isSimulation) moveSound.play();
        const side = toCol > fromCol ? 'short' : 'long';
        performCastlingSimulation(color, side, tempBoard);
        moveNotation = side === 'short' ? 'O-O' : 'O-O-O';
        updateCastlingRights(piece, fromRow, fromCol, toRow, toCol, tempCastlingRights, tempBoard);
        if (!isSimulation) {
            saveMoveNotation(piece, fromRow, fromCol, toRow, toCol, targetPiece, moveNotation);
            postMoveActions();
        }
    } else {
        const enPassantTarget = tempEnPassant;
        tempEnPassant = null;

        if (piece.toUpperCase() === 'P' && toCol !== fromCol && targetPiece === '' && enPassantTarget && enPassantTarget.row === toRow && enPassantTarget.col === toCol) {
            if (!isSimulation) captureSound.play();
            tempBoard[fromRow][toCol] = '';
        } else if (targetPiece !== '') {
            if (!isSimulation) captureSound.play();
        } else {
            if (!isSimulation) moveSound.play();
        }

        if (piece.toUpperCase() === 'P' && Math.abs(toRow - fromRow) === 2) {
            tempEnPassant = { row: (fromRow + toRow) / 2, col: fromCol };
        } else {
            tempEnPassant = null;
        }

        updateCastlingRights(piece, fromRow, fromCol, toRow, toCol, tempCastlingRights, tempBoard);
        tempBoard[toRow][toCol] = piece;
        tempBoard[fromRow][fromCol] = '';

        if ((piece === 'P' && toRow === 0) || (piece === 'p' && toRow === 7)) {
            if (!isSimulation) {
                showPromotionModal(toRow, toCol, piece === 'P' ? 'white' : 'black');
                promotionCallback = () => {
                    saveMoveNotation(piece, fromRow, fromCol, toRow, toCol, targetPiece, moveNotation);
                    postMoveActions();
                };
                return;
            } else {
                tempBoard[toRow][toCol] = piece === 'P' ? 'Q' : 'q';
            }
        }

        if (!isSimulation) {
            enPassant = tempEnPassant;
            castlingRights = tempCastlingRights;
            updateBoard();
            saveMoveNotation(piece, fromRow, fromCol, toRow, toCol, targetPiece, moveNotation);
            postMoveActions();
        }
    }

    if (!isSimulation) {
        if (gameMode === 'online') {
            sendMoveToServer({
                boardState: JSON.stringify(board),
                currentPlayer,
                enPassant,
                castlingRights,
                moveHistory
            });
        }
    }
}

// Function for actions after moving
function postMoveActions() {
    if (isCheckMate(opponentColor())) {
        checkSound.play();
        alert(`¡Jaque mate! Gana el jugador ${currentPlayer === 'white' ? 'Blanco' : 'Negro'}`);
        isGameOver = true;
        clearInterval(gameInterval);
        if (pollingInterval) clearInterval(pollingInterval);
        return;
    } else if (isInCheck(opponentColor())) {
        checkSound.play();
        highlightKing(opponentColor());
    }

    currentPlayer = opponentColor();
    currentPlayerElement.textContent = currentPlayer === 'white' ? '⚪ Blanco' : '⚫ Negro';

    if (!isGameOver && gameMode === 'computer' && currentPlayer === 'black') {
        setTimeout(() => {
            computerMove();
        }, 500);
    }
}

// Function to update castling rights
function updateCastlingRights(piece, fromRow, fromCol, toRow, toCol, tempCastlingRights, tempBoard) {
    if (piece === 'K') {
        tempCastlingRights.white.short = false;
        tempCastlingRights.white.long = false;
    } else if (piece === 'k') {
        tempCastlingRights.black.short = false;
        tempCastlingRights.black.long = false;
    } else if (piece === 'R') {
        if (fromRow === 7 && fromCol === 7) tempCastlingRights.white.short = false;
        if (fromRow === 7 && fromCol === 0) tempCastlingRights.white.long = false;
    } else if (piece === 'r') {
        if (fromRow === 0 && fromCol === 7) tempCastlingRights.black.short = false;
        if (fromRow === 0 && fromCol === 0) tempCastlingRights.black.long = false;
    }

    if (toRow !== undefined && toCol !== undefined) {
        const targetPiece = tempBoard[toRow][toCol];
        if (targetPiece === 'R') {
            if (toRow === 7 && toCol === 7) tempCastlingRights.white.short = false;
            if (toRow === 7 && toCol === 0) tempCastlingRights.white.long = false;
        } else if (targetPiece === 'r') {
            if (toRow === 0 && toCol === 7) tempCastlingRights.black.short = false;
            if (toRow === 0 && toCol === 0) tempCastlingRights.black.long = false;
        }
    }
}

// Function to perform castling
function performCastlingSimulation(color, side, tempBoard) {
    const row = color === 'white' ? 7 : 0;
    if (side === 'short') {
        tempBoard[row][6] = tempBoard[row][4];
        tempBoard[row][4] = '';
        tempBoard[row][5] = tempBoard[row][7];
        tempBoard[row][7] = '';
    } else {
        tempBoard[row][2] = tempBoard[row][4];
        tempBoard[row][4] = '';
        tempBoard[row][3] = tempBoard[row][0];
        tempBoard[row][0] = '';
    }
}

// Function to show promotion modal
function showPromotionModal(row, col, color) {
    promotionModal.style.display = 'flex';
    promotionOptions.innerHTML = '';

    promotionPieces[color].forEach(piece => {
        const pieceElem = document.createElement('span');
        pieceElem.classList.add('promotion-piece');
        pieceElem.innerHTML = pieces[piece];
        pieceElem.addEventListener('click', () => {
            board[row][col] = piece;
            updateBoard();
            promotionModal.style.display = 'none';
            if (promotionCallback) promotionCallback();
        });
        promotionOptions.appendChild(pieceElem);
    });
}

// Function for computer move
function computerMove() {
    if (isGameOver || currentPlayer !== 'black') return;

    let move;

    if (difficultyLevel === 1) {
        move = getRandomMove('black');
    } else if (difficultyLevel === 2) {
        move = getBestMove('black', 2);
    } else {
        move = getBestMove('black', 3);
    }

    if (!move) {
        if (isInCheck('black')) {
            alert('¡Jaque mate! Ganas la partida');
        } else {
            alert('La computadora no puede mover pero no está en jaque. Esto no debería ocurrir.');
        }
        isGameOver = true;
        clearInterval(gameInterval);
        return;
    }

    movePiece(move.from[0], move.from[1], move.to[0], move.to[1]);

    if (isGameOver) return;

    currentPlayerElement.textContent = '⚪ Blanco';

    if (isCheckMate('white')) {
        checkSound.play();
        alert('¡Jaque mate! La computadora gana.');
        isGameOver = true;
        clearInterval(gameInterval);
    } else if (isInCheck('white')) {
        checkSound.play();
        highlightKing('white');
    }

    currentPlayer = 'white';
    currentPlayerElement.textContent = '⚪ Blanco';
}

// Function to get random move
function getRandomMove(color) {
    const allMoves = getAllLegalMoves(color);
    if (allMoves.length === 0) return null;
    return allMoves[Math.floor(Math.random() * allMoves.length)];
}

// Function to get the best move using Minimax
function getBestMove(color, depth) {
    let bestMove = null;
    let bestScore = color === 'white' ? -Infinity : Infinity;

    const allMoves = getAllLegalMoves(color);

    for (let move of allMoves) {
        const tempBoard = JSON.parse(JSON.stringify(board));
        const tempEnPassant = enPassant ? { ...enPassant } : null;
        const tempCastlingRights = JSON.parse(JSON.stringify(castlingRights));

        movePiece(move.from[0], move.from[1], move.to[0], move.to[1], true, tempBoard, tempEnPassant, tempCastlingRights);

        const score = minimax(depth - 1, -Infinity, Infinity, color === 'white' ? false : true, tempBoard, tempEnPassant, tempCastlingRights);

        if (color === 'black') {
            if (score < bestScore) {
                bestScore = score;
                bestMove = move;
            }
        } else {
            if (score > bestScore) {
                bestScore = score;
                bestMove = move;
            }
        }
    }
    return bestMove;
}

// Minimax algorithm with alpha-beta pruning
function minimax(depth, alpha, beta, isMaximizingPlayer, tempBoard, tempEnPassant, tempCastlingRights) {
    if (depth === 0 || isGameOver) {
        return evaluateBoard(tempBoard);
    }

    const color = isMaximizingPlayer ? 'white' : 'black';
    const allMoves = getAllLegalMoves(color, tempBoard, tempEnPassant, tempCastlingRights);

    if (allMoves.length === 0) {
        if (isInCheck(color, tempBoard, tempEnPassant, tempCastlingRights)) {
            return isMaximizingPlayer ? -Infinity : Infinity;
        } else {
            return 0;
        }
    }

    if (isMaximizingPlayer) {
        let maxEval = -Infinity;
        for (let move of allMoves) {
            const newTempBoard = JSON.parse(JSON.stringify(tempBoard));
            const newTempEnPassant = tempEnPassant ? { ...tempEnPassant } : null;
            const newTempCastlingRights = JSON.parse(JSON.stringify(tempCastlingRights));

            movePiece(move.from[0], move.from[1], move.to[0], move.to[1], true, newTempBoard, newTempEnPassant, newTempCastlingRights);

            const evalScore = minimax(depth - 1, alpha, beta, false, newTempBoard, newTempEnPassant, newTempCastlingRights);
            maxEval = Math.max(maxEval, evalScore);
            alpha = Math.max(alpha, evalScore);
            if (beta <= alpha) break;
        }
        return maxEval;
    } else {
        let minEval = Infinity;
        for (let move of allMoves) {
            const newTempBoard = JSON.parse(JSON.stringify(tempBoard));
            const newTempEnPassant = tempEnPassant ? { ...tempEnPassant } : null;
            const newTempCastlingRights = JSON.parse(JSON.stringify(tempCastlingRights));

            movePiece(move.from[0], move.from[1], move.to[0], move.to[1], true, newTempBoard, newTempEnPassant, newTempCastlingRights);

            const evalScore = minimax(depth - 1, alpha, beta, true, newTempBoard, newTempEnPassant, newTempCastlingRights);
            minEval = Math.min(minEval, evalScore);
            beta = Math.min(beta, evalScore);
            if (beta <= alpha) break;
        }
        return minEval;
    }
}

// Function to evaluate the board
function evaluateBoard(tempBoard = board) {
    const pieceValues = {
        'p': -1, 'n': -3, 'b': -3, 'r': -5, 'q': -9, 'k': -1000,
        'P': 1, 'N': 3, 'B': 3, 'R': 5, 'Q': 9, 'K': 1000
    };
    let total = 0;
    for (let row of tempBoard) {
        for (let piece of row) {
            if (piece && pieceValues[piece]) {
                total += pieceValues[piece];
            }
        }
    }
    return total;
}

// Function to get all legal moves of a color
function getAllLegalMoves(color, tempBoard = board, tempEnPassant = enPassant, tempCastlingRights = castlingRights) {
    let moves = [];
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const piece = tempBoard[row][col];
            if (piece && ((color === 'white' && piece === piece.toUpperCase()) || (color === 'black' && piece === piece.toLowerCase()))) {
                const legalMoves = getLegalMoves(row, col, color, false, tempBoard, tempEnPassant, tempCastlingRights);
                legalMoves.forEach(move => {
                    moves.push({ from: [row, col], to: move });
                });
            }
        }
    }
    return moves;
}

// Function to get legal moves of a piece
function getLegalMoves(row, col, playerColor, skipChecks = false, tempBoard = board, tempEnPassant = enPassant, tempCastlingRights = castlingRights) {
    const piece = tempBoard[row][col];
    const moves = [];

    if (!piece) return moves;

    const directions = {
        'P': [[-1, 0], [-1, -1], [-1, 1]],
        'p': [[1, 0], [1, -1], [1, 1]],
        'R': rookDirections(),
        'r': rookDirections(),
        'N': knightDirections(),
        'n': knightDirections(),
        'B': bishopDirections(),
        'b': bishopDirections(),
        'Q': queenDirections(),
        'q': queenDirections(),
        'K': kingDirections(),
        'k': kingDirections()
    };

    const isWhite = piece === piece.toUpperCase();

    if ((isWhite && playerColor !== 'white') || (!isWhite && playerColor !== 'black')) {
        return moves;
    }

    if (piece.toUpperCase() === 'P') {
        const dir = isWhite ? -1 : 1;
        const startRow = isWhite ? 6 : 1;
        if (isEmpty(row + dir, col, tempBoard)) {
            moves.push([row + dir, col]);
            if (row === startRow && isEmpty(row + 2 * dir, col, tempBoard)) {
                moves.push([row + 2 * dir, col]);
            }
        }
        [[dir, -1], [dir, 1]].forEach(([dx, dy]) => {
            const [x, y] = [row + dx, col + dy];
            if (isEnemy(x, y, isWhite, tempBoard)) {
                moves.push([x, y]);
            }
        });
        if (tempEnPassant) {
            if (row + dir === tempEnPassant.row && Math.abs(col - tempEnPassant.col) === 1) {
                moves.push([tempEnPassant.row, tempEnPassant.col]);
            }
        }
    } else if (piece.toUpperCase() === 'K') {
        directions[piece].forEach(([dx, dy]) => {
            const [x, y] = [row + dx, col + dy];
            if (isOnBoard(x, y) && !isCurrentPlayerPiece(tempBoard[x][y], playerColor)) {
                moves.push([x, y]);
            }
        });
        if (!skipChecks) {
            if (canCastle(isWhite, 'short', tempCastlingRights)) {
                if (isEmpty(row, col + 1, tempBoard) && isEmpty(row, col + 2, tempBoard)) {
                    if (!isInCheck(playerColor, tempBoard, tempEnPassant, tempCastlingRights)) {
                        if (!leavesKingInCheck(row, col, row, col + 1, playerColor, tempBoard, tempEnPassant, tempCastlingRights)) {
                            if (!leavesKingInCheck(row, col, row, col + 2, playerColor, tempBoard, tempEnPassant, tempCastlingRights)) {
                                moves.push([row, col + 2]);
                            }
                        }
                    }
                }
            }
            if (canCastle(isWhite, 'long', tempCastlingRights)) {
                if (isEmpty(row, col - 1, tempBoard) && isEmpty(row, col - 2, tempBoard) && isEmpty(row, col - 3, tempBoard)) {
                    if (!isInCheck(playerColor, tempBoard, tempEnPassant, tempCastlingRights)) {
                        if (!leavesKingInCheck(row, col, row, col - 1, playerColor, tempBoard, tempEnPassant, tempCastlingRights)) {
                            if (!leavesKingInCheck(row, col, row, col - 2, playerColor, tempBoard, tempEnPassant, tempCastlingRights)) {
                                moves.push([row, col - 2]);
                            }
                        }
                    }
                }
            }
        }
    } else {
        directions[piece].forEach(([dx, dy]) => {
            let [x, y] = [row + dx, col + dy];
            while (isOnBoard(x, y)) {
                if (isEmpty(x, y, tempBoard)) {
                    moves.push([x, y]);
                } else {
                    if (!isCurrentPlayerPiece(tempBoard[x][y], playerColor)) {
                        moves.push([x, y]);
                    }
                    break;
                }
                if (['N', 'n', 'K', 'k'].includes(piece)) break;
                x += dx;
                y += dy;
            }
        });
    }

    if (!skipChecks) {
        return moves.filter(move => !leavesKingInCheck(row, col, move[0], move[1], playerColor, tempBoard, tempEnPassant, tempCastlingRights));
    } else {
        return moves;
    }
}

// Auxiliary functions for movements
function isEmpty(row, col, tempBoard = board) {
    return isOnBoard(row, col) && tempBoard[row][col] === '';
}

function isEnemy(row, col, isWhite, tempBoard = board) {
    if (!isOnBoard(row, col) || tempBoard[row][col] === '') return false;
    const piece = tempBoard[row][col];
    return isWhite ? piece === piece.toLowerCase() : piece === piece.toUpperCase();
}

function isOnBoard(row, col) {
    return row >= 0 && row < 8 && col >= 0 && col < 8;
}

function leavesKingInCheck(fromRow, fromCol, toRow, toCol, playerColor, tempBoard = board, tempEnPassant = enPassant, tempCastlingRights = castlingRights) {
    const simulatedBoard = JSON.parse(JSON.stringify(tempBoard));
    let simulatedEnPassant = tempEnPassant ? { ...tempEnPassant } : null;
    let simulatedCastlingRights = JSON.parse(JSON.stringify(tempCastlingRights));

    const piece = simulatedBoard[fromRow][fromCol];
    simulatedBoard[toRow][toCol] = piece;
    simulatedBoard[fromRow][fromCol] = '';

    if (piece.toUpperCase() === 'P' && Math.abs(toRow - fromRow) === 1 && Math.abs(toCol - fromCol) === 1 && simulatedBoard[toRow][toCol] === '' && simulatedEnPassant && simulatedEnPassant.row === toRow && simulatedEnPassant.col === toCol) {
        simulatedBoard[fromRow][toCol] = '';
    }

    const kingPosition = findKing(playerColor, simulatedBoard);
    return isInCheck(playerColor, simulatedBoard, simulatedEnPassant, simulatedCastlingRights);
}

function isInCheck(playerColor, tempBoard = board, tempEnPassant = enPassant, tempCastlingRights = castlingRights) {
    const kingPosition = findKing(playerColor, tempBoard);
    if (!kingPosition) {
        console.error(`King for ${playerColor} not found!`);
        return false;
    }
    const opponent = opponentColor(playerColor);
    const opponentMoves = getAllOpponentMoves(opponent, tempBoard, tempEnPassant, tempCastlingRights);
    return opponentMoves.some(move => move[0] === kingPosition[0] && move[1] === kingPosition[1]);
}

function isCheckMate(playerColor) {
    if (!isInCheck(playerColor)) {
        return false;
    }
    const allMoves = getAllLegalMoves(playerColor);
    return allMoves.length === 0;
}

function findKing(playerColor, tempBoard) {
    const king = playerColor === 'white' ? 'K' : 'k';
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            if (tempBoard[row][col] === king) return [row, col];
        }
    }
    return null;
}

function getAllOpponentMoves(opponentColor, tempBoard, tempEnPassant, tempCastlingRights) {
    let moves = [];
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const piece = tempBoard[row][col];
            if (piece && ((opponentColor === 'white' && piece === piece.toUpperCase()) || (opponentColor === 'black' && piece === piece.toLowerCase()))) {
                const pieceMoves = getLegalMoves(row, col, opponentColor, true, tempBoard, tempEnPassant, tempCastlingRights);
                moves = moves.concat(pieceMoves);
            }
        }
    }
    return moves;
}

// Movement directions
function rookDirections() { return [[-1,0],[1,0],[0,-1],[0,1]]; }
function bishopDirections() { return [[-1,-1],[-1,1],[1,-1],[1,1]]; }
function queenDirections() { return rookDirections().concat(bishopDirections()); }
function knightDirections() { return [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]; }
function kingDirections() { return [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]]; }

// Function to check if castling is possible
function canCastle(isWhite, side, tempCastlingRights = castlingRights) {
    if (isWhite) {
        if (side === 'short') return tempCastlingRights.white.short;
        if (side === 'long') return tempCastlingRights.white.long;
    } else {
        if (side === 'short') return tempCastlingRights.black.short;
        if (side === 'long') return tempCastlingRights.black.long;
    }
    return false;
}

// Highlight possible moves
function highlightMoves(moves) {
    moves.forEach(([row, col]) => {
        const square = document.querySelector(`.square[data-row="${row}"][data-col="${col}"]`);
        if (square) square.classList.add('highlight');
    });
}

function clearHighlights() {
    document.querySelectorAll('.square').forEach(square => {
        square.classList.remove('selected', 'highlight', 'check');
    });
}

function highlightKing(playerColor) {
    const kingPosition = findKing(playerColor, board);
    if (kingPosition) {
        const square = document.querySelector(`.square[data-row="${kingPosition[0]}"][data-col="${kingPosition[1]}"]`);
        if (square) square.classList.add('check');
    }
}

// Update the board
function updateBoard() {
    document.querySelectorAll('.square').forEach(square => {
        const row = parseInt(square.dataset.row);
        const col = parseInt(square.dataset.col);
        const piece = board[row][col];
        square.innerHTML = piece ? `<span class="piece">${pieces[piece]}</span>` : '';
    });
}

// Check if the piece belongs to the current player
function isCurrentPlayerPiece(piece, playerColor = currentPlayer) {
    return playerColor === 'white' ? piece === piece.toUpperCase() : piece === piece.toLowerCase();
}

// Get the opponent's color
function opponentColor(playerColor = currentPlayer) {
    return playerColor === 'white' ? 'black' : 'white';
}

// Start the timer
function startTimer() {
    gameInterval = setInterval(() => {
        time++;
        const minutes = String(Math.floor(time / 60)).padStart(2, '0');
        const seconds = String(time % 60).padStart(2, '0');
        timerElement.textContent = `${minutes}:${seconds}`;
    }, 1000);
}

// Save move notation
function saveMoveNotation(piece, fromRow, fromCol, toRow, toCol, targetPiece, specialMove) {
    let notation = specialMove || '';
    if (!notation) {
        const cols = 'abcdefgh';
        const pieceChar = piece.toUpperCase() !== 'P' ? piece.toUpperCase() : '';
        notation = pieceChar;
        if (targetPiece !== '') {
            notation += 'x';
        }
        notation += cols[toCol] + (8 - toRow);
    }
    const listItem = document.createElement('li');
    listItem.textContent = notation;
    historyList.appendChild(listItem);
    historyList.scrollTop = historyList.scrollHeight;

    if (gameMode === 'online') {
        moveHistory.push(notation);
    }
}

// Update move history
function updateMoveHistory() {
    historyList.innerHTML = '';
    moveHistory.forEach(notation => {
        const listItem = document.createElement('li');
        listItem.textContent = notation;
        historyList.appendChild(listItem);
    });
    historyList.scrollTop = historyList.scrollHeight;
}

// Update the difficulty level (only for computer)
levelSelect.addEventListener('change', () => {
    difficultyLevel = parseInt(levelSelect.value);
});

// New game button
newGameBtn.addEventListener('click', () => {
    if (gameMode === 'online') {
        // Reset online game
        createOnlineGame();
    } else {
        createBoard();
    }
});

// Mode selection buttons
twoPlayerBtn.addEventListener('click', () => {
    gameMode = 'two-player';
    twoPlayerBtn.style.backgroundColor = '#17a2b8';
    computerBtn.style.backgroundColor = '#28a745';
    onlineBtn.style.backgroundColor = '#28a745';
    if (pollingInterval) clearInterval(pollingInterval);
    createBoard();
});

computerBtn.addEventListener('click', () => {
    gameMode = 'computer';
    computerBtn.style.backgroundColor = '#17a2b8';
    twoPlayerBtn.style.backgroundColor = '#28a745';
    onlineBtn.style.backgroundColor = '#28a745';
    if (pollingInterval) clearInterval(pollingInterval);
    createBoard();
});

// Online mode button
onlineBtn.addEventListener('click', () => {
    gameMode = 'online';
    onlineBtn.style.backgroundColor = '#17a2b8';
    computerBtn.style.backgroundColor = '#28a745';
    twoPlayerBtn.style.backgroundColor = '#28a745';
    if (pollingInterval) clearInterval(pollingInterval);
    createOnlineGame();
});

// Function to send move to server
function sendMoveToServer(moveData) {
    fetch(`${backendUrl}?action=makeMove&gameId=${gameId}`, {
        method: 'POST',
        body: JSON.stringify(moveData),
        headers: {
            'Content-Type': 'application/json'
        }
    })
    .then(response => response.json())
    .then(data => {
        if (!data.success) {
            alert('Error al enviar el movimiento al servidor.');
        }
    })
    .catch(error => {
        console.error('Error al enviar el movimiento al servidor:', error);
    });
}

// Function to fetch game state from server
function fetchGameState() {
    fetch(`${backendUrl}?action=getGameState&gameId=${gameId}`)
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Update the game state
            board = JSON.parse(data.boardState); // Parse the boardState string
            currentPlayer = data.currentPlayer;
            enPassant = data.enPassant;
            castlingRights = data.castlingRights;
            moveHistory = data.moveHistory;
            updateBoard();
            updateMoveHistory();
            currentPlayerElement.textContent = currentPlayer === 'white' ? '⚪ Blanco' : '⚫ Negro';
            if (currentPlayer === playerColorOnline) {
                // It's the player's turn
                if (isCheckMate(playerColorOnline)) {
                    checkSound.play();
                    alert('¡Jaque mate! Has perdido.');
                    isGameOver = true;
                    clearInterval(gameInterval);
                    clearInterval(pollingInterval);
                } else if (isInCheck(playerColorOnline)) {
                    checkSound.play();
                    highlightKing(playerColorOnline);
                }
            }
        } else {
            alert('Error al obtener el estado del juego.');
        }
    })
    .catch(error => {
        console.error('Error al obtener el estado del juego:', error);
    });
}

// Function to start polling for opponent moves
function startPolling() {
    if (pollingInterval) clearInterval(pollingInterval);
    pollingInterval = setInterval(() => {
        if (isGameOver) {
            clearInterval(pollingInterval);
            return;
        }
        fetchGameState();
    }, 3000); // Poll every 3 seconds
}

// Function to create or join an online game
function createOnlineGame() {
    const action = prompt('Escribe "crear" para iniciar una nueva partida o "unir" para unirte a una partida existente:').toLowerCase();
    if (action === 'crear') {
        // Create a new game
        fetch(`${backendUrl}?action=createGame`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                gameId = data.gameId;
                playerColorOnline = 'white'; // Creator plays as white
                alert(`Juego creado. ID de la partida: ${gameId}. Comparte este ID con tu oponente.`);
                createBoard();
                startPolling();
            } else {
                alert('Error al crear el juego.');
            }
        })
        .catch(error => {
            console.error('Error al crear el juego:', error);
        });
    } else if (action === 'unir') {
        // Join an existing game
        const inputGameId = prompt('Introduce el ID de la partida:');
        fetch(`${backendUrl}?action=joinGame&gameId=${inputGameId}`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                gameId = inputGameId;
                playerColorOnline = 'black'; // Joiner plays as black
                alert('Te has unido a la partida.');
                createBoard();
                startPolling();
            } else {
                alert('No se pudo unir a la partida. Verifica el ID.');
            }
        })
        .catch(error => {
            console.error('Error al unirse al juego:', error);
        });
    } else {
        alert('Acción no reconocida. Por favor, escribe "crear" o "unir".');
    }
}

// Close promotion modal when clicking outside
window.addEventListener('click', (e) => {
    if (e.target === promotionModal) {
        promotionModal.style.display = 'none';
    }
});

// Start the game with default mode
function startGame() {
    gameMode = 'computer';
    computerBtn.style.backgroundColor = '#17a2b8';
    twoPlayerBtn.style.backgroundColor = '#28a745';
    onlineBtn.style.backgroundColor = '#28a745';
    createBoard();
}

startGame();
