// script.js

// ============================
// Global Variables and Constants
// ============================

const boardElement = document.getElementById('board');
const historyList = document.getElementById('history-list');
const playerColorSpan = document.getElementById('player-color');
const currentPlayerDiv = document.getElementById('current-player');
const timeSpan = document.getElementById('time');
const levelSelect = document.getElementById('level-select');
const computerBtn = document.getElementById('computer-btn');
const twoPlayerBtn = document.getElementById('two-player-btn');
const newGameBtn = document.getElementById('new-game-btn');
const promotionModal = document.getElementById('promotion-modal');
const promotionOptions = document.getElementById('promotion-options');
const moveSound = document.getElementById('move-sound');
const captureSound = document.getElementById('capture-sound');
const checkSound = document.getElementById('check-sound');
const backgroundMusic = document.getElementById('background-music');

let board = [];
let selectedPiece = null;
let currentPlayer = 'white';
let moveHistory = [];
let timerInterval = null;
let elapsedTime = 0;
let gameMode = 'two-player'; // 'two-player' or 'one-player'
let difficulty = 2; // 1: Easy, 2: Medium, 3: Hard
let castlingRights = {
    white: { kingside: true, queenside: true },
    black: { kingside: true, queenside: true }
};
let enPassantTarget = null; // { row, col }
let halfMoveClock = 0; // For fifty-move rule (optional)
let fullMoveNumber = 1;

// ============================
// Game Initialization
// ============================

function initGame() {
    // Initialize board array with standard positions
    board = [
        ['r', 'n', 'b', 'q', 'k', 'b', 'n', 'r'],
        ['p', 'p', 'p', 'p', 'p', 'p', 'p', 'p'],
        ['', '', '', '', '', '', '', ''],
        ['', '', '', '', '', '', '', ''],
        ['', '', '', '', '', '', '', ''],
        ['', '', '', '', '', '', '', ''],
        ['P', 'P', 'P', 'P', 'P', 'P', 'P', 'P'],
        ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R']
    ];

    currentPlayer = 'white';
    moveHistory = [];
    historyList.innerHTML = '';
    playerColorSpan.textContent = '⚪ Blanco';
    currentPlayerDiv.classList.remove('check');
    elapsedTime = 0;
    fullMoveNumber = 1;
    updateTimer();
    clearInterval(timerInterval);
    timerInterval = setInterval(updateTimer, 1000);
    renderBoard();
    castlingRights = {
        white: { kingside: true, queenside: true },
        black: { kingside: true, queenside: true }
    };
    enPassantTarget = null;
}

// ============================
// Rendering the Board
// ============================

function renderBoard() {
    boardElement.innerHTML = '';
    boardElement.style.pointerEvents = 'auto';

    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const square = document.createElement('div');
            square.classList.add('square');
            square.dataset.row = row;
            square.dataset.col = col;

            // Determine square color
            if ((row + col) % 2 === 0) {
                square.classList.add('light');
            } else {
                square.classList.add('dark');
            }

            const piece = board[row][col];
            if (piece !== '') {
                const pieceElement = document.createElement('div');
                pieceElement.classList.add('piece');
                pieceElement.textContent = getPieceUnicode(piece);
                pieceElement.dataset.piece = piece;
                pieceElement.dataset.row = row;
                pieceElement.dataset.col = col;
                pieceElement.addEventListener('click', onPieceClick);
                square.appendChild(pieceElement);
            }

            boardElement.appendChild(square);
        }
    }
}

// ============================
// Helper Functions
// ============================

// Map pieces to Unicode symbols
function getPieceUnicode(piece) {
    const pieces = {
        'P': '♙',
        'R': '♖',
        'N': '♘',
        'B': '♗',
        'Q': '♕',
        'K': '♔',
        'p': '♟︎',
        'r': '♜',
        'n': '♞',
        'b': '♝',
        'q': '♛',
        'k': '♚'
    };
    return pieces[piece] || '';
}

// Check if a character is uppercase (White piece)
function isUpperCase(char) {
    return char === char.toUpperCase();
}

// Get movement directions based on piece type
function getPieceDirections(pieceType, isWhite) {
    const directions = [];

    switch (pieceType) {
        case 'N': // Knight
            directions.push({
                type: 'single',
                vectors: [
                    [-2, -1], [-2, 1],
                    [-1, -2], [-1, 2],
                    [1, -2], [1, 2],
                    [2, -1], [2, 1]
                ]
            });
            break;
        case 'B': // Bishop
            directions.push({
                type: 'multiple',
                vectors: [
                    [-1, -1], [-1, 1],
                    [1, -1], [1, 1]
                ]
            });
            break;
        case 'R': // Rook
            directions.push({
                type: 'multiple',
                vectors: [
                    [-1, 0], [1, 0],
                    [0, -1], [0, 1]
                ]
            });
            break;
        case 'Q': // Queen
            directions.push({
                type: 'multiple',
                vectors: [
                    [-1, -1], [-1, 1],
                    [1, -1], [1, 1],
                    [-1, 0], [1, 0],
                    [0, -1], [0, 1]
                ]
            });
            break;
        case 'K': // King
            directions.push({
                type: 'single',
                vectors: [
                    [-1, -1], [-1, 1],
                    [1, -1], [1, 1],
                    [-1, 0], [1, 0],
                    [0, -1], [0, 1]
                ]
            });
            break;
        default:
            break;
    }

    return directions;
}

// Check if position is within the board
function isInBounds(row, col) {
    return row >= 0 && row < 8 && col >= 0 && col < 8;
}

// ============================
// User Interaction Handlers
// ============================

// Handle piece click
function onPieceClick(e) {
    const pieceElement = e.currentTarget;
    const row = parseInt(pieceElement.dataset.row);
    const col = parseInt(pieceElement.dataset.col);
    const piece = board[row][col];
    const pieceColor = isUpperCase(piece) ? 'white' : 'black';

    if (pieceColor !== currentPlayer) return;

    // If already selected, deselect
    if (selectedPiece && selectedPiece.row === row && selectedPiece.col === col) {
        deselectPiece();
        return;
    }

    // Select the piece
    selectPiece(row, col, piece);
}

// Select a piece and highlight possible moves
function selectPiece(row, col, piece) {
    deselectPiece();
    selectedPiece = { row, col, piece };
    highlightSquare(row, col, 'selected');

    const moves = getValidMoves(row, col, piece);
    moves.forEach(move => {
        highlightSquare(move.toRow, move.toCol, 'highlight');
    });
}

// Deselect the currently selected piece and remove highlights
function deselectPiece() {
    if (selectedPiece) {
        removeHighlights();
        selectedPiece = null;
    }
}

// Highlight a specific square
function highlightSquare(row, col, className) {
    const index = row * 8 + col;
    const square = boardElement.children[index];
    square.classList.add(className);
}

// Remove all highlights
function removeHighlights() {
    const squares = boardElement.querySelectorAll('.square');
    squares.forEach(square => {
        square.classList.remove('selected', 'highlight');
    });
}

// ============================
// Move Validation and Handling
// ============================

// Get all valid moves for a piece at (row, col)
function getValidMoves(row, col, piece) {
    const moves = [];
    const pieceType = piece.toUpperCase();
    const isWhite = isUpperCase(piece);
    const directions = getPieceDirections(pieceType, isWhite);

    directions.forEach(direction => {
        const { type, vectors } = direction;

        if (type === 'single') {
            vectors.forEach(vector => {
                const newRow = row + vector[0];
                const newCol = col + vector[1];
                if (isInBounds(newRow, newCol)) {
                    const target = board[newRow][newCol];
                    if (target === '' || isUpperCase(target) !== isWhite) {
                        moves.push({
                            fromRow: row,
                            fromCol: col,
                            toRow: newRow,
                            toCol: newCol,
                            capture: target !== '',
                            special: null
                        });
                    }
                }
            });
        } else if (type === 'multiple') {
            vectors.forEach(vector => {
                let newRow = row + vector[0];
                let newCol = col + vector[1];
                while (isInBounds(newRow, newCol)) {
                    const target = board[newRow][newCol];
                    if (target === '') {
                        moves.push({
                            fromRow: row,
                            fromCol: col,
                            toRow: newRow,
                            toCol: newCol,
                            capture: false,
                            special: null
                        });
                    } else {
                        if (isUpperCase(target) !== isWhite) {
                            moves.push({
                                fromRow: row,
                                fromCol: col,
                                toRow: newRow,
                                toCol: newCol,
                                capture: true,
                                special: null
                            });
                        }
                        break;
                    }
                    newRow += vector[0];
                    newCol += vector[1];
                }
            });
        }
    });

    // Special moves
    if (pieceType === 'P') {
        // Forward moves
        const direction = isWhite ? -1 : 1;
        const startRow = isWhite ? 6 : 1;

        // One square forward
        const oneForward = row + direction;
        if (isInBounds(oneForward, col) && board[oneForward][col] === '') {
            moves.push({
                fromRow: row,
                fromCol: col,
                toRow: oneForward,
                toCol: col,
                capture: false,
                special: null
            });

            // Two squares forward from starting position
            const twoForward = row + 2 * direction;
            if (row === startRow && board[twoForward][col] === '') {
                moves.push({
                    fromRow: row,
                    fromCol: col,
                    toRow: twoForward,
                    toCol: col,
                    capture: false,
                    special: 'double-pawn'
                });
            }
        }

        // Captures
        [[direction, -1], [direction, 1]].forEach(offset => {
            const captureRow = row + offset[0];
            const captureCol = col + offset[1];
            if (isInBounds(captureRow, captureCol)) {
                const target = board[captureRow][captureCol];
                if (target !== '' && isUpperCase(target) !== isWhite) {
                    moves.push({
                        fromRow: row,
                        fromCol: col,
                        toRow: captureRow,
                        toCol: captureCol,
                        capture: true,
                        special: null
                    });
                }

                // En Passant
                if (enPassantTarget && captureRow === enPassantTarget.row && captureCol === enPassantTarget.col) {
                    moves.push({
                        fromRow: row,
                        fromCol: col,
                        toRow: captureRow,
                        toCol: captureCol,
                        capture: true,
                        special: 'en-passant'
                    });
                }
            }
        });
    }

    // Castling
    if (pieceType === 'K') {
        if (canCastle(currentPlayer, 'kingside')) {
            const row = isWhite ? 7 : 0;
            if (board[row][5] === '' && board[row][6] === '') {
                if (!isSquareUnderAttack(row, 4, isWhite) &&
                    !isSquareUnderAttack(row, 5, isWhite) &&
                    !isSquareUnderAttack(row, 6, isWhite)) {
                    moves.push({
                        fromRow: row,
                        fromCol: 4,
                        toRow: row,
                        toCol: 6,
                        capture: false,
                        special: 'castling-kingside'
                    });
                }
            }
        }

        if (canCastle(currentPlayer, 'queenside')) {
            const row = isWhite ? 7 : 0;
            if (board[row][1] === '' && board[row][2] === '' && board[row][3] === '') {
                if (!isSquareUnderAttack(row, 4, isWhite) &&
                    !isSquareUnderAttack(row, 3, isWhite) &&
                    !isSquareUnderAttack(row, 2, isWhite)) {
                    moves.push({
                        fromRow: row,
                        fromCol: 4,
                        toRow: row,
                        toCol: 2,
                        capture: false,
                        special: 'castling-queenside'
                    });
                }
            }
        }
    }

    // Filter out moves that would put own king in check
    return moves.filter(move => !wouldCauseCheck(move));
}

// Check if a player can castle on a given side
function canCastle(player, side) {
    return castlingRights[player][side];
}

// Check if a square is under attack by the opponent
function isSquareUnderAttack(row, col, isWhite) {
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const piece = board[r][c];
            if (piece === '' || isUpperCase(piece) === isWhite) continue;
            const enemyMoves = getValidMovesForCheck(r, c, piece, board);
            if (enemyMoves.some(m => m.toRow === row && m.toCol === col)) {
                return true;
            }
        }
    }
    return false;
}

// Check if a move would cause the current player's king to be in check
function wouldCauseCheck(move) {
    // Make a copy of the board
    const tempBoard = board.map(row => row.slice());

    // Apply the move
    const piece = tempBoard[move.fromRow][move.fromCol];
    let capturedPiece = tempBoard[move.toRow][move.toCol];
    tempBoard[move.toRow][move.toCol] = piece;
    tempBoard[move.fromRow][move.fromCol] = '';

    // Handle special moves
    if (move.special === 'en-passant') {
        const direction = currentPlayer === 'white' ? 1 : -1;
        capturedPiece = tempBoard[move.toRow + direction][move.toCol];
        tempBoard[move.toRow + direction][move.toCol] = '';
    } else if (move.special === 'castling-kingside') {
        const row = move.fromRow;
        tempBoard[row][5] = tempBoard[row][7];
        tempBoard[row][7] = '';
    } else if (move.special === 'castling-queenside') {
        const row = move.fromRow;
        tempBoard[row][3] = tempBoard[row][0];
        tempBoard[row][0] = '';
    }

    // Find the king's position
    let kingPos = null;
    const kingChar = currentPlayer === 'white' ? 'K' : 'k';
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            if (tempBoard[r][c] === kingChar) {
                kingPos = { row: r, col: c };
                break;
            }
        }
        if (kingPos) break;
    }

    if (!kingPos) return true; // No king found, invalid state

    // Check if any enemy piece can attack the king
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const enemyPiece = tempBoard[r][c];
            if (enemyPiece === '' || isUpperCase(enemyPiece) === (currentPlayer === 'white')) continue;
            const enemyMoves = getValidMovesForCheck(r, c, enemyPiece, tempBoard);
            if (enemyMoves.some(m => m.toRow === kingPos.row && m.toCol === kingPos.col)) {
                return true;
            }
        }
    }

    return false;
}

// Get all valid moves for a piece at (row, col) on a given board (used for check detection)
function getValidMovesForCheck(row, col, piece, tempBoard) {
    const moves = [];
    const pieceType = piece.toUpperCase();
    const isWhite = isUpperCase(piece);
    const directions = getPieceDirectionsForCheck(pieceType, isWhite, tempBoard, row, col);

    directions.forEach(direction => {
        const { type, vectors } = direction;

        if (type === 'single') {
            vectors.forEach(vector => {
                const newRow = row + vector[0];
                const newCol = col + vector[1];
                if (isInBounds(newRow, newCol)) {
                    const target = tempBoard[newRow][newCol];
                    if (target === '' || isUpperCase(target) !== isWhite) {
                        moves.push({
                            toRow: newRow,
                            toCol: newCol
                        });
                    }
                }
            });
        } else if (type === 'multiple') {
            vectors.forEach(vector => {
                let newRow = row + vector[0];
                let newCol = col + vector[1];
                while (isInBounds(newRow, newCol)) {
                    const target = tempBoard[newRow][newCol];
                    if (target === '') {
                        moves.push({
                            toRow: newRow,
                            toCol: newCol
                        });
                    } else {
                        if (isUpperCase(target) !== isWhite) {
                            moves.push({
                                toRow: newRow,
                                toCol: newCol
                            });
                        }
                        break;
                    }
                    newRow += vector[0];
                    newCol += vector[1];
                }
            });
        }
    });

    return moves;
}

// Get movement directions for check detection based on piece type and temporary board
function getPieceDirectionsForCheck(pieceType, isWhite, tempBoard, row, col) {
    const directions = [];

    switch (pieceType) {
        case 'N': // Knight
            directions.push({
                type: 'single',
                vectors: [
                    [-2, -1], [-2, 1],
                    [-1, -2], [-1, 2],
                    [1, -2], [1, 2],
                    [2, -1], [2, 1]
                ]
            });
            break;
        case 'B': // Bishop
            directions.push({
                type: 'multiple',
                vectors: [
                    [-1, -1], [-1, 1],
                    [1, -1], [1, 1]
                ]
            });
            break;
        case 'R': // Rook
            directions.push({
                type: 'multiple',
                vectors: [
                    [-1, 0], [1, 0],
                    [0, -1], [0, 1]
                ]
            });
            break;
        case 'Q': // Queen
            directions.push({
                type: 'multiple',
                vectors: [
                    [-1, -1], [-1, 1],
                    [1, -1], [1, 1],
                    [-1, 0], [1, 0],
                    [0, -1], [0, 1]
                ]
            });
            break;
        case 'K': // King
            directions.push({
                type: 'single',
                vectors: [
                    [-1, -1], [-1, 1],
                    [1, -1], [1, 1],
                    [-1, 0], [1, 0],
                    [0, -1], [0, 1]
                ]
            });
            break;
        case 'P': // Pawn (only attacks diagonally)
            const direction = isWhite ? -1 : 1;
            directions.push({
                type: 'single',
                vectors: [
                    [direction, -1], [direction, 1]
                ]
            });
            break;
        default:
            break;
    }

    return directions;
}

// ============================
// Move Execution
// ============================

// Handle square click for moving pieces
boardElement.addEventListener('click', function(e) {
    if (!selectedPiece) return;

    const square = e.target.closest('.square');
    if (!square) return;

    const toRow = parseInt(square.dataset.row);
    const toCol = parseInt(square.dataset.col);

    const validMoves = getValidMoves(selectedPiece.row, selectedPiece.col, selectedPiece.piece);
    const move = validMoves.find(m => m.toRow === toRow && m.toCol === toCol);

    if (move) {
        makeMove(move);
    }
});

// Make a move on the board
function makeMove(move) {
    const piece = board[move.fromRow][move.fromCol];
    const target = board[move.toRow][move.toCol];
    let capturedPiece = target;

    // Play sounds
    if (move.capture || move.special === 'en-passant') {
        captureSound.currentTime = 0;
        captureSound.play();
    } else {
        moveSound.currentTime = 0;
        moveSound.play();
    }

    // Move the piece
    board[move.toRow][move.toCol] = piece;
    board[move.fromRow][move.fromCol] = '';

    // Handle special moves
    if (move.special === 'double-pawn') {
        const direction = currentPlayer === 'white' ? -1 : 1;
        enPassantTarget = { row: move.toRow + direction, col: move.toCol };
    } else {
        enPassantTarget = null;
    }

    if (move.special === 'en-passant') {
        const direction = currentPlayer === 'white' ? 1 : -1;
        capturedPiece = board[move.toRow + direction][move.toCol];
        board[move.toRow + direction][move.toCol] = '';
    }

    if (move.special === 'castling-kingside') {
        const row = move.fromRow;
        // Move the rook
        board[row][5] = board[row][7];
        board[row][7] = '';
    }

    if (move.special === 'castling-queenside') {
        const row = move.fromRow;
        // Move the rook
        board[row][3] = board[row][0];
        board[row][0] = '';
    }

    // Handle pawn promotion
    if (piece.toUpperCase() === 'P') {
        if ((isUpperCase(piece) && move.toRow === 0) || (!isUpperCase(piece) && move.toRow === 7)) {
            promptPromotion(move.toRow, move.toCol);
            return; // Wait for promotion before continuing
        }
    }

    // Update castling rights if king or rook has moved or rook is captured
    updateCastlingRights(move, piece, capturedPiece);

    // Update move history
    const moveNotation = generateMoveNotation(move, capturedPiece);
    moveHistory.push(moveNotation);
    const li = document.createElement('li');
    li.textContent = moveNotation;
    historyList.appendChild(li);

    // Switch player
    switchPlayer();

    // Render the board
    renderBoard();

    // Check for check
    if (isInCheck(currentPlayer)) {
        currentPlayerDiv.classList.add('check');
        checkSound.currentTime = 0;
        checkSound.play();
    } else {
        currentPlayerDiv.classList.remove('check');
    }

    // Increment full move number after black's move
    if (currentPlayer === 'white') {
        fullMoveNumber++;
    }

    // If it's computer's turn, make AI move
    if (gameMode === 'one-player' && currentPlayer === 'black') {
        setTimeout(computerMove, 500);
    }
}

// ============================
// Castling Rights Management
// ============================

// Update castling rights based on the move
function updateCastlingRights(move, piece, capturedPiece) {
    const player = currentPlayer;
    // If king moves, lose both castling rights
    if (piece.toUpperCase() === 'K') {
        castlingRights[player].kingside = false;
        castlingRights[player].queenside = false;
    }

    // If rook moves from original position, lose corresponding castling right
    if (piece.toUpperCase() === 'R') {
        if (move.fromRow === (player === 'white' ? 7 : 0)) {
            if (move.fromCol === 0) {
                castlingRights[player].queenside = false;
            }
            if (move.fromCol === 7) {
                castlingRights[player].kingside = false;
            }
        }
    }

    // If rook is captured from original position, lose corresponding castling right
    if (capturedPiece && capturedPiece.toUpperCase() === 'R') {
        const capturedPlayer = isUpperCase(capturedPiece) ? 'white' : 'black';
        if (move.toRow === (capturedPlayer === 'white' ? 7 : 0)) {
            if (move.toCol === 0) {
                castlingRights[capturedPlayer].queenside = false;
            }
            if (move.toCol === 7) {
                castlingRights[capturedPlayer].kingside = false;
            }
        }
    }
}

// ============================
// Move Notation and History
// ============================

// Generate move notation for history
function generateMoveNotation(move, capturedPiece) {
    const piece = board[move.toRow][move.toCol];
    const pieceType = piece.toUpperCase();
    const isCapture = move.capture || move.special === 'en-passant';
    let notation = '';

    if (move.special === 'castling-kingside') {
        return 'O-O';
    }
    if (move.special === 'castling-queenside') {
        return 'O-O-O';
    }

    if (pieceType !== 'P') {
        notation += pieceType;
    }

    if (isCapture) {
        if (pieceType === 'P') {
            notation += String.fromCharCode(97 + move.fromCol);
        }
        notation += 'x';
    }

    notation += String.fromCharCode(97 + move.toCol) + (8 - move.toRow);

    // Add promotion notation
    if (move.special === 'promotion') {
        notation += '=' + move.promotion;
    }

    return notation;
}

// ============================
// Pawn Promotion
// ============================

// Prompt for pawn promotion
function promptPromotion(row, col) {
    promotionModal.style.display = 'flex';
    promotionOptions.innerHTML = '';

    const pieces = ['Q', 'R', 'B', 'N'];
    pieces.forEach(p => {
        const btn = document.createElement('div');
        btn.classList.add('promotion-piece');
        btn.textContent = isUpperCase(board[row][col]) ? getPieceUnicode(p) : getPieceUnicode(p.toLowerCase());
        btn.addEventListener('click', () => {
            board[row][col] = isUpperCase(board[row][col]) ? p : p.toLowerCase();
            promotionModal.style.display = 'none';
            renderBoard();
        });
        promotionOptions.appendChild(btn);
    });
}

// Close promotion modal when clicking outside
promotionModal.addEventListener('click', function(e) {
    if (e.target === promotionModal) {
        promotionModal.style.display = 'none';
    }
});

// ============================
// Player Switching
// ============================

// Switch the current player
function switchPlayer() {
    currentPlayer = currentPlayer === 'white' ? 'black' : 'white';
    playerColorSpan.textContent = currentPlayer === 'white' ? '⚪ Blanco' : '⚫ Negro';
    currentPlayerDiv.classList.remove('check');
}

// ============================
// Check Detection
// ============================

// Check if the given player is in check
function isInCheck(player) {
    // Find the king
    let kingPos = null;
    const kingChar = player === 'white' ? 'K' : 'k';
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            if (board[r][c] === kingChar) {
                kingPos = { row: r, col: c };
                break;
            }
        }
        if (kingPos) break;
    }

    if (!kingPos) return false;

    // Check all enemy pieces for attacks on the king
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const enemyPiece = board[r][c];
            if (enemyPiece === '' || isUpperCase(enemyPiece) === (player === 'white')) continue;
            const enemyMoves = getValidMovesForCheck(r, c, enemyPiece, board);
            if (enemyMoves.some(m => m.toRow === kingPos.row && m.toCol === kingPos.col)) {
                return true;
            }
        }
    }

    return false;
}

// ============================
// Timer Management
// ============================

// Update the timer
function updateTimer() {
    elapsedTime++;
    const minutes = String(Math.floor(elapsedTime / 60)).padStart(2, '0');
    const seconds = String(elapsedTime % 60).padStart(2, '0');
    timeSpan.textContent = `${minutes}:${seconds}`;
}

// ============================
// Game Mode and Controls
// ============================

// Handle new game button
newGameBtn.addEventListener('click', () => {
    initGame();
});

// Handle mode selection buttons
computerBtn.addEventListener('click', () => {
    gameMode = 'one-player';
    playerColorSpan.textContent = '⚪ Blanco';
    initGame();
});

twoPlayerBtn.addEventListener('click', () => {
    gameMode = 'two-player';
    playerColorSpan.textContent = '⚪ Blanco';
    initGame();
});

// ============================
// AI Implementation
// ============================

// Computer AI move
function computerMove() {
    const level = parseInt(levelSelect.value);
    let move;
    if (level === 1) {
        move = randomMove('black');
    } else if (level === 2) {
        move = basicAI('black');
    } else {
        move = advancedAI('black');
    }

    if (move) {
        makeMove(move);
    } else {
        alert('No valid moves available. Game over.');
    }
}

// Level 1 AI: Random move
function randomMove(player) {
    const allMoves = [];
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const piece = board[r][c];
            if (piece === '' || (player === 'white' ? !isUpperCase(piece) : isUpperCase(piece))) continue;
            const moves = getValidMoves(r, c, piece);
            allMoves.push(...moves);
        }
    }

    if (allMoves.length === 0) return null;
    const randomIndex = Math.floor(Math.random() * allMoves.length);
    return allMoves[randomIndex];
}

// Level 2 AI: Basic strategy (prioritize captures, else random)
function basicAI(player) {
    const captureMoves = [];
    const nonCaptureMoves = [];

    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const piece = board[r][c];
            if (piece === '' || (player === 'white' ? !isUpperCase(piece) : isUpperCase(piece))) continue;
            const moves = getValidMoves(r, c, piece);
            moves.forEach(m => {
                if (m.capture) {
                    captureMoves.push(m);
                } else {
                    nonCaptureMoves.push(m);
                }
            });
        }
    }

    if (captureMoves.length > 0) {
        return captureMoves[Math.floor(Math.random() * captureMoves.length)];
    } else if (nonCaptureMoves.length > 0) {
        return nonCaptureMoves[Math.floor(Math.random() * nonCaptureMoves.length)];
    } else {
        return null;
    }
}

// Level 3 AI: Advanced strategy (prioritize captures, then center control)
function advancedAI(player) {
    const captureMoves = [];
    const nonCaptureMoves = [];

    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const piece = board[r][c];
            if (piece === '' || (player === 'white' ? !isUpperCase(piece) : isUpperCase(piece))) continue;
            const moves = getValidMoves(r, c, piece);
            moves.forEach(m => {
                if (m.capture) {
                    captureMoves.push(m);
                } else {
                    nonCaptureMoves.push(m);
                }
            });
        }
    }

    // Prioritize capturing moves of higher value
    if (captureMoves.length > 0) {
        captureMoves.sort((a, b) => {
            const valueA = getPieceValue(board[a.toRow][a.toCol]);
            const valueB = getPieceValue(board[b.toRow][b.toCol]);
            return valueB - valueA;
        });
        return captureMoves[0];
    }

    // Move towards center
    if (nonCaptureMoves.length > 0) {
        nonCaptureMoves.sort((a, b) => {
            const center = 3.5;
            const distanceA = Math.abs(a.toRow - center) + Math.abs(a.toCol - center);
            const distanceB = Math.abs(b.toRow - center) + Math.abs(b.toCol - center);
            return distanceA - distanceB;
        });
        return nonCaptureMoves[0];
    }

    return null;
}

// Get value of a piece for AI decision-making
function getPieceValue(piece) {
    const values = {
        'P': 1,
        'N': 3,
        'B': 3,
        'R': 5,
        'Q': 9,
        'K': 1000,
        'p': 1,
        'n': 3,
        'b': 3,
        'r': 5,
        'q': 9,
        'k': 1000
    };
    return values[piece] || 0;
}

// ============================
// Sound Integration
// ============================

// Optional: Play background music
// Uncomment the lines below if you want background music to play automatically
/*
backgroundMusic.volume = 0.1;
backgroundMusic.loop = true;
backgroundMusic.play();
*/

// ============================
// Final Initialization
// ============================

// Start the game initially
initGame();

// Ensure that the board is rendered when the page loads
document.addEventListener('DOMContentLoaded', () => {
    initGame();
});
