// Variables de interfaz
const boardElement = document.getElementById('board');
const currentPlayerElement = document.getElementById('player-color');
const timerElement = document.getElementById('time');
const levelSelect = document.getElementById('level-select');
const newGameBtn = document.getElementById('new-game-btn');
const promotionModal = document.getElementById('promotion-modal');
const promotionOptions = document.getElementById('promotion-options');
const historyList = document.getElementById('history-list');

// Sonidos
const moveSound = document.getElementById('move-sound');
const captureSound = document.getElementById('capture-sound');
const checkSound = document.getElementById('check-sound');

// Variables del juego
let board = [];
let selectedPiece = null;
let currentPlayer = 'white';
let gameInterval;
let time = 0;
let isGameOver = false;
let difficultyLevel = parseInt(levelSelect.value);
let moveHistory = [];
let repetitionPositions = {};
let enPassant = null;
let castlingRights = {
    white: { short: true, long: true },
    black: { short: true, long: true }
};
let promotionCallback = null;

// Mapear las piezas a códigos Unicode
const pieces = {
    'r': '♜', 'n': '♞', 'b': '♝', 'q': '♛', 'k': '♚', 'p': '♟',  // Black pieces
    'R': '♖', 'N': '♘', 'B': '♗', 'Q': '♕', 'K': '♔', 'P': '♙'   // White pieces
};


const promotionPieces = {
    'white': ['Q', 'R', 'B', 'N'],
    'black': ['q', 'r', 'b', 'n']
};

// Inicializar el tablero con la posición estándar
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

// Función para crear el tablero
function createBoard() {
    boardElement.innerHTML = '';
    board = JSON.parse(JSON.stringify(initialBoard));
    moveHistory = [];
    repetitionPositions = {};
    time = 0;
    isGameOver = false;
    currentPlayer = 'white';
    currentPlayerElement.textContent = 'Blanco';
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
}

// Función para seleccionar y mover piezas
function selectPiece(e) {
    if (isGameOver || currentPlayer !== 'white') return;
    const row = parseInt(e.currentTarget.dataset.row);
    const col = parseInt(e.currentTarget.dataset.col);
    const piece = board[row][col];

    if (selectedPiece) {
        const legalMoves = getLegalMoves(selectedPiece.row, selectedPiece.col, currentPlayer);
        if (legalMoves.some(m => m[0] === row && m[1] === col)) {
            movePiece(selectedPiece.row, selectedPiece.col, row, col);
            selectedPiece = null;
            clearHighlights();
            setTimeout(() => {
                if (!isGameOver) {
                    currentPlayer = 'black';
                    currentPlayerElement.textContent = 'Negro';
                    computerMove();
                }
            }, 500);
        } else {
            selectedPiece = null;
            clearHighlights();
        }
    } else if (piece && isCurrentPlayerPiece(piece)) {
        selectedPiece = { row, col, piece };
        e.currentTarget.classList.add('selected');
        highlightMoves(getLegalMoves(row, col, currentPlayer));
    }
}

// Función para mover piezas
function movePiece(fromRow, fromCol, toRow, toCol, isSimulation = false) {
    const piece = board[fromRow][fromCol];
    const targetPiece = board[toRow][toCol];
    let moveNotation = '';

    // Manejar enroque
    if (piece.toUpperCase() === 'K' && Math.abs(toCol - fromCol) === 2) {
        if (!isSimulation) moveSound.play();
        const side = toCol > fromCol ? 'short' : 'long';
        performCastling(currentPlayer, side);
        moveNotation = side === 'short' ? 'O-O' : 'O-O-O';
    } else {
        // Guardar para captura al paso
        const enPassantTarget = enPassant;
        enPassant = null;

        // Captura al paso
        if (piece.toUpperCase() === 'P' && toCol !== fromCol && targetPiece === '' && enPassantTarget && enPassantTarget.row === toRow && enPassantTarget.col === toCol) {
            board[fromRow][toCol] = '';
            if (!isSimulation) captureSound.play();
        } else if (targetPiece !== '') {
            if (!isSimulation) captureSound.play();
        } else {
            if (!isSimulation) moveSound.play();
        }

        // Actualizar enPassant
        if (piece.toUpperCase() === 'P' && Math.abs(toRow - fromRow) === 2) {
            enPassant = { row: (fromRow + toRow) / 2, col: fromCol };
        }

        board[toRow][toCol] = piece;
        board[fromRow][fromCol] = '';

        // Manejar promoción de peones
        if ((piece === 'P' && toRow === 0) || (piece === 'p' && toRow === 7)) {
            if (!isSimulation) {
                showPromotionModal(toRow, toCol, piece === 'P' ? 'white' : 'black');
                promotionCallback = () => {
                    saveMoveNotation(piece, fromRow, fromCol, toRow, toCol, targetPiece, moveNotation);
                    postMoveActions();
                };
                return;
            } else {
                board[toRow][toCol] = piece === 'P' ? 'Q' : 'q';
            }
        }

        // Actualizar derechos de enroque
        updateCastlingRights(piece, fromRow, fromCol);

        if (!isSimulation) {
            updateBoard();
            saveMoveNotation(piece, fromRow, fromCol, toRow, toCol, targetPiece, moveNotation);
            postMoveActions();
        }
    }
}

// Función para acciones después del movimiento
function postMoveActions() {
    // Verificar jaque y jaque mate
    if (isCheckMate(opponentColor())) {
        checkSound.play();
        alert(`¡Jaque mate! Gana el jugador ${currentPlayer === 'white' ? 'Blanco' : 'Negro'}`);
        isGameOver = true;
        clearInterval(gameInterval);
        return;
    } else if (isInCheck(opponentColor())) {
        checkSound.play();
        highlightKing(opponentColor());
    }

    // Verificar tablas
    if (isStalemate(opponentColor())) {
        alert('¡Empate por ahogado!');
        isGameOver = true;
        clearInterval(gameInterval);
        return;
    }

    if (isThreefoldRepetition()) {
        alert('¡Empate por repetición de posición tres veces!');
        isGameOver = true;
        clearInterval(gameInterval);
        return;
    }

    // Cambiar el turno
    currentPlayer = opponentColor();
    currentPlayerElement.textContent = currentPlayer === 'white' ? 'Blanco' : 'Negro';
}

// Función para actualizar los derechos de enroque
function updateCastlingRights(piece, row, col) {
    if (piece === 'K') {
        castlingRights.white.short = false;
        castlingRights.white.long = false;
    } else if (piece === 'k') {
        castlingRights.black.short = false;
        castlingRights.black.long = false;
    } else if (piece === 'R') {
        if (row === 7 && col === 7) castlingRights.white.short = false;
        if (row === 7 && col === 0) castlingRights.white.long = false;
    } else if (piece === 'r') {
        if (row === 0 && col === 7) castlingRights.black.short = false;
        if (row === 0 && col === 0) castlingRights.black.long = false;
    }
}

// Función para realizar el enroque
function performCastling(color, side) {
    const row = color === 'white' ? 7 : 0;
    if (side === 'short') {
        board[row][6] = board[row][4];
        board[row][4] = '';
        board[row][5] = board[row][7];
        board[row][7] = '';
    } else {
        board[row][2] = board[row][4];
        board[row][4] = '';
        board[row][3] = board[row][0];
        board[row][0] = '';
    }
    updateBoard();
}

// Función para mostrar el modal de promoción
function showPromotionModal(row, col, color) {
    promotionModal.style.display = 'block';
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

// Función para el movimiento de la computadora
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
            alert('¡Empate por ahogado!');
        }
        isGameOver = true;
        clearInterval(gameInterval);
        return;
    }

    movePiece(move.from[0], move.from[1], move.to[0], move.to[1]);

    if (isGameOver) return;

    if (currentPlayer === 'white') {
        currentPlayerElement.textContent = 'Blanco';
    }

    if (isCheckMate('white')) {
        checkSound.play();
        alert('¡Jaque mate! La computadora gana.');
        isGameOver = true;
        clearInterval(gameInterval);
    } else if (isInCheck('white')) {
        checkSound.play();
        highlightKing('white');
    }

    // Verificar tablas
    if (isStalemate('white')) {
        alert('¡Empate por ahogado!');
        isGameOver = true;
        clearInterval(gameInterval);
        return;
    }

    if (isThreefoldRepetition()) {
        alert('¡Empate por repetición de posición tres veces!');
        isGameOver = true;
        clearInterval(gameInterval);
        return;
    }

    currentPlayer = 'white';
}

// Función para obtener un movimiento aleatorio
function getRandomMove(color) {
    const allMoves = getAllLegalMoves(color);
    if (allMoves.length === 0) return null;
    return allMoves[Math.floor(Math.random() * allMoves.length)];
}

// Función para obtener el mejor movimiento usando Minimax
function getBestMove(color, depth) {
    let bestMove = null;
    let bestScore = color === 'white' ? -Infinity : Infinity;

    const allMoves = getAllLegalMoves(color);

    for (let move of allMoves) {
        const tempBoard = JSON.parse(JSON.stringify(board));
        const tempEnPassant = enPassant;
        const tempCastlingRights = JSON.parse(JSON.stringify(castlingRights));

        movePiece(move.from[0], move.from[1], move.to[0], move.to[1], true);
        const score = minimax(depth - 1, -Infinity, Infinity, color === 'white' ? false : true);
        board = tempBoard;
        enPassant = tempEnPassant;
        castlingRights = tempCastlingRights;

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

// Implementación del algoritmo Minimax con poda alfa-beta
function minimax(depth, alpha, beta, isMaximizingPlayer) {
    if (depth === 0 || isGameOver) {
        return evaluateBoard();
    }

    const color = isMaximizingPlayer ? 'white' : 'black';
    const allMoves = getAllLegalMoves(color);

    if (allMoves.length === 0) {
        if (isInCheck(color)) {
            return isMaximizingPlayer ? -Infinity : Infinity;
        } else {
            return 0; // Empate por ahogado
        }
    }

    if (isMaximizingPlayer) {
        let maxEval = -Infinity;
        for (let move of allMoves) {
            const tempBoard = JSON.parse(JSON.stringify(board));
            const tempEnPassant = enPassant;
            const tempCastlingRights = JSON.parse(JSON.stringify(castlingRights));

            movePiece(move.from[0], move.from[1], move.to[0], move.to[1], true);
            const eval = minimax(depth - 1, alpha, beta, false);
            board = tempBoard;
            enPassant = tempEnPassant;
            castlingRights = tempCastlingRights;

            maxEval = Math.max(maxEval, eval);
            alpha = Math.max(alpha, eval);
            if (beta <= alpha) break;
        }
        return maxEval;
    } else {
        let minEval = Infinity;
        for (let move of allMoves) {
            const tempBoard = JSON.parse(JSON.stringify(board));
            const tempEnPassant = enPassant;
            const tempCastlingRights = JSON.parse(JSON.stringify(castlingRights));

            movePiece(move.from[0], move.from[1], move.to[0], move.to[1], true);
            const eval = minimax(depth - 1, alpha, beta, true);
            board = tempBoard;
            enPassant = tempEnPassant;
            castlingRights = tempCastlingRights;

            minEval = Math.min(minEval, eval);
            beta = Math.min(beta, eval);
            if (beta <= alpha) break;
        }
        return minEval;
    }
}

// Función para evaluar el tablero
function evaluateBoard() {
    const pieceValues = {
        'p': -1, 'n': -3, 'b': -3, 'r': -5, 'q': -9, 'k': -1000,
        'P': 1, 'N': 3, 'B': 3, 'R': 5, 'Q': 9, 'K': 1000
    };
    let total = 0;
    for (let row of board) {
        for (let piece of row) {
            if (piece && pieceValues[piece]) {
                total += pieceValues[piece];
            }
        }
    }
    return total;
}

// Función para obtener todos los movimientos legales de un color
function getAllLegalMoves(color) {
    let moves = [];
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const piece = board[row][col];
            if (piece && ((color === 'white' && piece === piece.toUpperCase()) || (color === 'black' && piece === piece.toLowerCase()))) {
                const legalMoves = getLegalMoves(row, col, color);
                legalMoves.forEach(move => {
                    moves.push({ from: [row, col], to: move });
                });
            }
        }
    }
    return moves;
}

// Función para obtener movimientos legales de una pieza
function getLegalMoves(row, col, playerColor, skipChecks = false) {
    const piece = board[row][col];
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
        // Movimientos de peón
        const dir = isWhite ? -1 : 1;
        const startRow = isWhite ? 6 : 1;
        // Movimiento hacia adelante
        if (isEmpty(row + dir, col)) {
            moves.push([row + dir, col]);
            // Primer movimiento doble
            if (row === startRow && isEmpty(row + 2 * dir, col)) {
                moves.push([row + 2 * dir, col]);
            }
        }
        // Capturas
        [[dir, -1], [dir, 1]].forEach(([dx, dy]) => {
            const [x, y] = [row + dx, col + dy];
            if (isEnemy(x, y, isWhite)) {
                moves.push([x, y]);
            }
        });
        // Captura al paso
        if (enPassant) {
            if (row + dir === enPassant.row && Math.abs(col - enPassant.col) === 1) {
                moves.push([enPassant.row, enPassant.col]);
            }
        }
    } else if (piece.toUpperCase() === 'K') {
        // Movimientos del rey
        directions[piece].forEach(([dx, dy]) => {
            const [x, y] = [row + dx, col + dy];
            if (isOnBoard(x, y) && !isCurrentPlayerPiece(board[x][y], playerColor)) {
                moves.push([x, y]);
            }
        });
        // Enroque
        if (!skipChecks && canCastle(isWhite, 'short')) {
            if (isEmpty(row, col + 1) && isEmpty(row, col + 2) && !isInCheck(playerColor)) {
                moves.push([row, col + 2]);
            }
        }
        if (!skipChecks && canCastle(isWhite, 'long')) {
            if (isEmpty(row, col - 1) && isEmpty(row, col - 2) && isEmpty(row, col - 3) && !isInCheck(playerColor)) {
                moves.push([row, col - 2]);
            }
        }
    } else {
        // Movimientos de otras piezas
        directions[piece].forEach(([dx, dy]) => {
            let [x, y] = [row + dx, col + dy];
            while (isOnBoard(x, y)) {
                if (isEmpty(x, y)) {
                    moves.push([x, y]);
                } else {
                    if (!isCurrentPlayerPiece(board[x][y], playerColor)) {
                        moves.push([x, y]);
                    }
                    break;
                }
                if (['N', 'n'].includes(piece)) break;
                x += dx;
                y += dy;
            }
        });
    }

    // Filtrar movimientos que dejan al rey en jaque, si skipChecks es falso
    if (!skipChecks) {
        return moves.filter(move => !leavesKingInCheck(row, col, move[0], move[1], playerColor));
    } else {
        return moves;
    }
}

// Funciones auxiliares para movimientos
function isEmpty(row, col) {
    return isOnBoard(row, col) && board[row][col] === '';
}

function isEnemy(row, col, isWhite) {
    if (!isOnBoard(row, col) || board[row][col] === '') return false;
    const piece = board[row][col];
    return isWhite ? piece === piece.toLowerCase() : piece === piece.toUpperCase();
}

function isOnBoard(row, col) {
    return row >= 0 && row < 8 && col >= 0 && col < 8;
}

function leavesKingInCheck(fromRow, fromCol, toRow, toCol, playerColor) {
    const tempBoard = JSON.parse(JSON.stringify(board));
    const tempEnPassant = enPassant;
    const tempCastlingRights = JSON.parse(JSON.stringify(castlingRights));

    const piece = tempBoard[fromRow][fromCol];
    const targetPiece = tempBoard[toRow][toCol];
    tempBoard[toRow][toCol] = piece;
    tempBoard[fromRow][fromCol] = '';

    // Manejar captura al paso en simulación
    if (piece.toUpperCase() === 'P' && Math.abs(toRow - fromRow) === 1 && Math.abs(toCol - fromCol) === 1 && targetPiece === '' && enPassant && enPassant.row === toRow && enPassant.col === toCol) {
        tempBoard[fromRow][toCol] = '';
    }

    const inCheck = isInCheck(playerColor, tempBoard);

    enPassant = tempEnPassant;
    castlingRights = tempCastlingRights;

    return inCheck;
}

function isInCheck(playerColor, tempBoard = board) {
    const kingPosition = findKing(playerColor, tempBoard);
    if (!kingPosition) return false;
    const opponentColor = playerColor === 'white' ? 'black' : 'white';
    const opponentMoves = getAllOpponentMoves(opponentColor, tempBoard);
    return opponentMoves.some(move => move[0] === kingPosition[0] && move[1] === kingPosition[1]);
}

function isCheckMate(playerColor) {
    if (!isInCheck(playerColor)) return false;
    const allMoves = getAllLegalMoves(playerColor);
    return allMoves.length === 0;
}

function isStalemate(playerColor) {
    if (isInCheck(playerColor)) return false;
    const allMoves = getAllLegalMoves(playerColor);
    return allMoves.length === 0;
}

function isThreefoldRepetition() {
    const position = board.map(row => row.join('')).join('/') + `_${currentPlayer}_${enPassant ? enPassant.row + ',' + enPassant.col : 'none'}`;
    repetitionPositions[position] = (repetitionPositions[position] || 0) + 1;
    return repetitionPositions[position] >= 3;
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

function getAllOpponentMoves(opponentColor, tempBoard) {
    let moves = [];
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const piece = tempBoard[row][col];
            if (piece && ((opponentColor === 'white' && piece === piece.toUpperCase()) || (opponentColor === 'black' && piece === piece.toLowerCase()))) {
                const pieceMoves = getLegalMoves(row, col, opponentColor, true); // skipChecks = true
                moves = moves.concat(pieceMoves);
            }
        }
    }
    return moves;
}

// Direcciones de movimiento
function rookDirections() { return [[-1,0],[1,0],[0,-1],[0,1]]; }
function bishopDirections() { return [[-1,-1],[-1,1],[1,-1],[1,1]]; }
function queenDirections() { return rookDirections().concat(bishopDirections()); }
function knightDirections() { return [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]; }
function kingDirections() { return [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]]; }

// Función para verificar si se puede enrocar
function canCastle(isWhite, side) {
    if (isWhite) {
        if (side === 'short') return castlingRights.white.short;
        if (side === 'long') return castlingRights.white.long;
    } else {
        if (side === 'short') return castlingRights.black.short;
        if (side === 'long') return castlingRights.black.long;
    }
    return false;
}

// Resaltar movimientos posibles
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
    const kingPosition = findKing(playerColor);
    if (kingPosition) {
        const square = document.querySelector(`.square[data-row="${kingPosition[0]}"][data-col="${kingPosition[1]}"]`);
        if (square) square.classList.add('check');
    }
}

// Actualizar el tablero
function updateBoard() {
    document.querySelectorAll('.square').forEach(square => {
        const row = parseInt(square.dataset.row);
        const col = parseInt(square.dataset.col);
        const piece = board[row][col];
        square.innerHTML = piece ? `<span class="piece">${pieces[piece]}</span>` : '';
    });
}

// Verificar si la pieza pertenece al jugador actual
function isCurrentPlayerPiece(piece, playerColor = currentPlayer) {
    return playerColor === 'white' ? piece === piece.toUpperCase() : piece === piece.toLowerCase();
}

// Obtener el color del oponente
function opponentColor() {
    return currentPlayer === 'white' ? 'black' : 'white';
}

// Iniciar el temporizador
function startTimer() {
    gameInterval = setInterval(() => {
        time++;
        const minutes = String(Math.floor(time / 60)).padStart(2, '0');
        const seconds = String(time % 60).padStart(2, '0');
        timerElement.textContent = `${minutes}:${seconds}`;
    }, 1000);
}

// Guardar notación de movimiento
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
}

// Actualizar el nivel de dificultad
levelSelect.addEventListener('change', () => {
    difficultyLevel = parseInt(levelSelect.value);
});

// Botón de nuevo juego
newGameBtn.addEventListener('click', () => {
    createBoard();
});

// Cerrar modal de promoción al hacer clic fuera
window.addEventListener('click', (e) => {
    if (e.target === promotionModal) {
        promotionModal.style.display = 'none';
    }
});

// Iniciar el juego
function startGame() {
    createBoard();
    startTimer();
}

startGame();
