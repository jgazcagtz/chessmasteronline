// ========================= Chess Game Logic =========================

// Interface Elements
const boardElement = document.getElementById('board');
const currentPlayerElement = document.getElementById('player-color');
const timerElement = document.getElementById('time');
const levelSelect = document.getElementById('level-select');
const newGameBtn = document.getElementById('new-game-btn');
const promotionModal = document.getElementById('promotion-modal');
const promotionOptions = document.getElementById('promotion-options');
const historyList = document.getElementById('history-list');

// Sound Elements
const moveSound = document.getElementById('move-sound');
const captureSound = document.getElementById('capture-sound');
const checkSound = document.getElementById('check-sound');

// Game State Variables
let board = [];
let currentPlayer = 'white';
let selectedPiece = null;
let gameInterval;
let timeElapsed = 0;
let isGameOver = false;
let difficultyLevel = parseInt(levelSelect.value);
let moveHistory = [];
let enPassantTarget = null;
let castlingRights = {
    white: { kingside: true, queenside: true },
    black: { kingside: true, queenside: true }
};
let promotionCallback = null;

// Piece Unicode Mapping
const pieces = {
    'r': '♜', 'n': '♞', 'b': '♝', 'q': '♛', 'k': '♚', 'p': '♟', // Black pieces
    'R': '♖', 'N': '♘', 'B': '♗', 'Q': '♕', 'K': '♔', 'P': '♙'  // White pieces
};

// Promotion Options
const promotionPieces = {
    white: ['Q', 'R', 'B', 'N'],
    black: ['q', 'r', 'b', 'n']
};

// Piece-Square Tables for Evaluation
const pieceSquareTables = {
    // Pawn Tables
    'P': [
        0, 0, 0, 0, 0, 0, 0, 0,
        5, 10, 10, -20, -20, 10, 10, 5,
        5, -5, -10, 0, 0, -10, -5, 5,
        0, 0, 0, 20, 20, 0, 0, 0,
        5, 5, 10, 25, 25, 10, 5, 5,
        10, 10, 20, 30, 30, 20, 10, 10,
        50, 50, 50, 50, 50, 50, 50, 50,
        0, 0, 0, 0, 0, 0, 0, 0
    ],
    'p': [
        0, 0, 0, 0, 0, 0, 0, 0,
        -5, -10, -10, 20, 20, -10, -10, -5,
        -5, 0, 0, 0, 0, 0, 0, -5,
        -5, 0, 0, 0, 0, 0, 0, -5,
        -5, 0, 0, 0, 0, 0, 0, -5,
        -5, 0, 0, 0, 0, 0, 0, -5,
        -5, 0, 0, 0, 0, 0, 0, -5,
        0, 0, 0, 0, 0, 0, 0, 0
    ],
    // Knight Tables
    'N': [
        -50, -40, -30, -30, -30, -30, -40, -50,
        -40, -20, 0, 0, 0, 0, -20, -40,
        -30, 0, 10, 15, 15, 10, 0, -30,
        -30, 5, 15, 20, 20, 15, 5, -30,
        -30, 0, 15, 20, 20, 15, 0, -30,
        -30, 5, 10, 15, 15, 10, 5, -30,
        -40, -20, 0, 5, 5, 0, -20, -40,
        -50, -40, -30, -30, -30, -30, -40, -50
    ],
    'n': [
        -50, -40, -30, -30, -30, -30, -40, -50,
        -40, -20, 0, 5, 5, 0, -20, -40,
        -30, 5, 10, 15, 15, 10, 5, -30,
        -30, 0, 15, 20, 20, 15, 0, -30,
        -30, 5, 15, 20, 20, 15, 5, -30,
        -30, 0, 10, 15, 15, 10, 0, -30,
        -40, -20, 0, 0, 0, 0, -20, -40,
        -50, -40, -30, -30, -30, -30, -40, -50
    ],
    // Bishop Tables
    'B': [
        -20, -10, -10, -10, -10, -10, -10, -20,
        -10, 5, 0, 0, 0, 0, 5, -10,
        -10, 10, 10, 10, 10, 10, 10, -10,
        -10, 0, 10, 10, 10, 10, 0, -10,
        -10, 5, 5, 10, 10, 5, 5, -10,
        -10, 0, 5, 10, 10, 5, 0, -10,
        -10, 0, 0, 0, 0, 0, 0, -10,
        -20, -10, -10, -10, -10, -10, -10, -20
    ],
    'b': [
        -20, -10, -10, -10, -10, -10, -10, -20,
        -10, 0, 0, 0, 0, 0, 0, -10,
        -10, 5, 5, 10, 10, 5, 5, -10,
        -10, 0, 5, 10, 10, 5, 0, -10,
        -10, 5, 10, 10, 10, 10, 5, -10,
        -10, 10, 10, 10, 10, 10, 10, -10,
        -10, 0, 0, 0, 0, 0, 0, -10,
        -20, -10, -10, -10, -10, -10, -10, -20
    ],
    // Rook Tables
    'R': [
        0, 0, 0, 0, 0, 0, 0, 0,
        5, 10, 10, 10, 10, 10, 10, 5,
        -5, 0, 0, 0, 0, 0, 0, -5,
        -5, 0, 0, 0, 0, 0, 0, -5,
        -5, 0, 0, 0, 0, 0, 0, -5,
        -5, 0, 0, 0, 0, 0, 0, -5,
        -5, 0, 0, 0, 0, 0, 0, -5,
        0, 0, 0, 5, 5, 0, 0, 0
    ],
    'r': [
        0, 0, 0, 5, 5, 0, 0, 0,
        -5, 0, 0, 0, 0, 0, 0, -5,
        -5, 0, 0, 0, 0, 0, 0, -5,
        -5, 0, 0, 0, 0, 0, 0, -5,
        -5, 0, 0, 0, 0, 0, 0, -5,
        -5, 0, 0, 0, 0, 0, 0, -5,
        5, 10, 10, 10, 10, 10, 10, 5,
        0, 0, 0, 0, 0, 0, 0, 0
    ],
    // Queen Tables
    'Q': [
        -20, -10, -10, -5, -5, -10, -10, -20,
        -10, 0, 5, 0, 0, 0, 0, -10,
        -10, 5, 5, 5, 5, 5, 0, -10,
        0, 0, 5, 5, 5, 5, 0, -5,
        -5, 0, 5, 5, 5, 5, 0, -5,
        -10, 5, 5, 5, 5, 5, 0, -10,
        -10, 0, 5, 0, 0, 0, 0, -10,
        -20, -10, -10, -5, -5, -10, -10, -20
    ],
    'q': [
        -20, -10, -10, -5, -5, -10, -10, -20,
        -10, 0, 0, 0, 0, 0, 0, -10,
        -10, 0, 5, 0, 0, 0, 0, -10,
        -5, 0, 5, 5, 5, 5, 0, -5,
        0, 0, 5, 5, 5, 5, 0, -5,
        -10, 5, 5, 5, 5, 5, 0, -10,
        -10, 0, 5, 0, 0, 0, 0, -10,
        -20, -10, -10, -5, -5, -10, -10, -20
    ],
    // King Tables
    'K': [
        -30, -40, -40, -50, -50, -40, -40, -30,
        -30, -40, -40, -50, -50, -40, -40, -30,
        -30, -40, -40, -50, -50, -40, -40, -30,
        -30, -40, -40, -50, -50, -40, -40, -30,
        -20, -30, -30, -40, -40, -30, -30, -20,
        -10, -20, -20, -20, -20, -20, -20, -10,
        20, 20, 0, 0, 0, 0, 20, 20,
        20, 30, 10, 0, 0, 10, 30, 20
    ],
    'k': [
        20, 30, 10, 0, 0, 10, 30, 20,
        20, 20, 0, 0, 0, 0, 20, 20,
        -10, -20, -20, -20, -20, -20, -20, -10,
        -20, -30, -30, -40, -40, -30, -30, -20,
        -30, -40, -40, -50, -50, -40, -40, -30,
        -30, -40, -40, -50, -50, -40, -40, -30,
        -30, -40, -40, -50, -50, -40, -40, -30,
        -30, -40, -40, -50, -50, -40, -40, -30
    ]
};

// Initial Standard Chess Position
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

// ========================= Initialization =========================

/**
 * Initializes the game by setting up the board, resetting variables, and starting the timer.
 */
function initializeGame() {
    board = JSON.parse(JSON.stringify(initialBoard));
    currentPlayer = 'white';
    selectedPiece = null;
    moveHistory = [];
    enPassantTarget = null;
    castlingRights = {
        white: { kingside: true, queenside: true },
        black: { kingside: true, queenside: true }
    };
    isGameOver = false;
    timeElapsed = 0;

    currentPlayerElement.textContent = '⚪ Blanco';
    historyList.innerHTML = '';
    clearInterval(gameInterval);
    startTimer();
    drawBoard();
}

// ========================= Board Rendering =========================

/**
 * Renders the current state of the board in the UI.
 */
function drawBoard() {
    boardElement.innerHTML = '';
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const square = document.createElement('div');
            square.classList.add('square', (row + col) % 2 === 0 ? 'light' : 'dark');
            square.dataset.row = row;
            square.dataset.col = col;
            square.addEventListener('click', onSquareClick);

            const piece = board[row][col];
            if (piece) {
                const pieceElem = document.createElement('span');
                pieceElem.classList.add('piece');
                pieceElem.textContent = pieces[piece];
                square.appendChild(pieceElem);
            }

            boardElement.appendChild(square);
        }
    }
}

/**
 * Highlights the king when in check.
 * @param {string} color - 'white' or 'black'
 */
function highlightKing(color) {
    const kingPos = findKing(color);
    if (kingPos) {
        const square = document.querySelector(`.square[data-row="${kingPos.row}"][data-col="${kingPos.col}"]`);
        if (square) square.classList.add('check');
    }
}

// ========================= Event Handlers =========================

/**
 * Handles click events on squares.
 * @param {Event} e - The click event
 */
function onSquareClick(e) {
    if (isGameOver) return;

    const row = parseInt(e.currentTarget.dataset.row);
    const col = parseInt(e.currentTarget.dataset.col);
    const piece = board[row][col];

    if (selectedPiece) {
        const legalMoves = getLegalMoves(selectedPiece.row, selectedPiece.col);
        const move = legalMoves.find(m => m.row === row && m.col === col);

        if (move) {
            makeMove(selectedPiece.row, selectedPiece.col, row, col, move);
            clearSelection();
            return;
        }
    }

    if (piece && isCurrentPlayerPiece(piece)) {
        selectedPiece = { row, col, piece };
        highlightSelection(row, col);
        const legalMoves = getLegalMoves(row, col);
        highlightMoves(legalMoves);
    } else {
        clearSelection();
    }
}

/**
 * Clears all highlights and selection.
 */
function clearSelection() {
    selectedPiece = null;
    clearHighlights();
}

/**
 * Highlights the selected square and possible moves.
 * @param {number} row - Row index
 * @param {number} col - Column index
 */
function highlightSelection(row, col) {
    clearHighlights();
    const square = document.querySelector(`.square[data-row="${row}"][data-col="${col}"]`);
    if (square) square.classList.add('selected');
}

/**
 * Highlights all possible move squares.
 * @param {Array} moves - List of move objects
 */
function highlightMoves(moves) {
    moves.forEach(move => {
        const square = document.querySelector(`.square[data-row="${move.row}"][data-col="${move.col}"]`);
        if (square) square.classList.add('highlight');
    });
}

/**
 * Removes all highlights from the board.
 */
function clearHighlights() {
    document.querySelectorAll('.square').forEach(square => {
        square.classList.remove('selected', 'highlight', 'check');
    });
}

// ========================= Move Generation =========================

/**
 * Retrieves all legal moves for a piece at a given position.
 * @param {number} row - Current row of the piece
 * @param {number} col - Current column of the piece
 * @param {object} [state] - Optional game state for simulations
 * @returns {Array} List of legal move objects
 */
function getLegalMoves(row, col, state = null) {
    const currentBoard = state ? state.board : board;
    const currentEnPassant = state ? state.enPassantTarget : enPassantTarget;
    const currentCastlingRights = state ? state.castlingRights : castlingRights;

    const piece = currentBoard[row][col];
    if (!piece || !isPieceColor(piece, currentPlayer)) return [];

    const moves = [];
    const isWhite = piece === piece.toUpperCase();
    const directions = getPieceDirections(piece);

    for (const [dr, dc] of directions) {
        let newRow = row + dr;
        let newCol = col + dc;

        while (isOnBoard(newRow, newCol)) {
            const targetPiece = currentBoard[newRow][newCol];
            if (!targetPiece) {
                moves.push({ row: newRow, col: newCol });
            } else {
                if (!isPieceColor(targetPiece, currentPlayer)) {
                    moves.push({ row: newRow, col: newCol, capture: true });
                }
                break;
            }

            if (isSlidingPiece(piece)) {
                newRow += dr;
                newCol += dc;
            } else {
                break;
            }
        }
    }

    // Special Moves
    if (isPawn(piece)) {
        moves.push(...getPawnMoves(row, col, isWhite, currentBoard, currentEnPassant));
    }

    if (isKing(piece)) {
        moves.push(...getCastlingMoves(row, col, isWhite, currentBoard, currentCastlingRights));
    }

    // Filter out moves that leave the king in check
    return moves.filter(move => {
        const tempState = simulateMove(row, col, move.row, move.col, move, currentBoard, currentCastlingRights, currentEnPassant);
        return !isKingInCheck(tempState.board, currentPlayer);
    });
}

/**
 * Determines if a piece is a sliding piece (Bishop, Rook, Queen).
 * @param {string} piece - The piece character
 * @returns {boolean} True if sliding, else false
 */
function isSlidingPiece(piece) {
    const slidingPieces = ['B', 'b', 'R', 'r', 'Q', 'q'];
    return slidingPieces.includes(piece);
}

/**
 * Determines if a piece is a pawn.
 * @param {string} piece - The piece character
 * @returns {boolean} True if pawn, else false
 */
function isPawn(piece) {
    return piece.toUpperCase() === 'P';
}

/**
 * Determines if a piece is a king.
 * @param {string} piece - The piece character
 * @returns {boolean} True if king, else false
 */
function isKing(piece) {
    return piece.toUpperCase() === 'K';
}

/**
 * Retrieves movement directions based on piece type.
 * @param {string} piece - The piece character
 * @returns {Array} List of [dr, dc] directions
 */
function getPieceDirections(piece) {
    const upper = piece.toUpperCase();
    switch (upper) {
        case 'N':
            return [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
        case 'B':
            return [[-1, -1], [-1, 1], [1, -1], [1, 1]];
        case 'R':
            return [[-1, 0], [1, 0], [0, -1], [0, 1]];
        case 'Q':
            return [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
        case 'K':
            return [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
        default:
            return [];
    }
}

/**
 * Generates all possible pawn moves, including captures, en passant, and promotions.
 * @param {number} row - Current row of the pawn
 * @param {number} col - Current column of the pawn
 * @param {boolean} isWhite - True if white pawn, else black
 * @param {Array} currentBoard - Current board state
 * @param {object} enPassant - Current en passant target square
 * @returns {Array} List of pawn move objects
 */
function getPawnMoves(row, col, isWhite, currentBoard, enPassant) {
    const moves = [];
    const direction = isWhite ? -1 : 1;
    const startRow = isWhite ? 6 : 1;
    const promotionRow = isWhite ? 0 : 7;

    // One square forward
    const forwardRow = row + direction;
    if (isOnBoard(forwardRow, col) && !currentBoard[forwardRow][col]) {
        if (forwardRow === promotionRow) {
            moves.push({ row: forwardRow, col, promote: true });
        } else {
            moves.push({ row: forwardRow, col });
        }

        // Two squares forward from starting position
        const doubleForwardRow = row + 2 * direction;
        if (row === startRow && !currentBoard[doubleForwardRow][col]) {
            moves.push({ row: doubleForwardRow, col, doubleStep: true });
        }
    }

    // Captures
    for (const dc of [-1, 1]) {
        const captureCol = col + dc;
        if (isOnBoard(forwardRow, captureCol)) {
            const target = currentBoard[forwardRow][captureCol];
            if (target && isOpponentPiece(target, isWhite)) {
                if (forwardRow === promotionRow) {
                    moves.push({ row: forwardRow, col: captureCol, capture: true, promote: true });
                } else {
                    moves.push({ row: forwardRow, col: captureCol, capture: true });
                }
            }

            // En Passant
            if (enPassant && forwardRow === enPassant.row && captureCol === enPassant.col) {
                moves.push({ row: forwardRow, col: captureCol, enPassant: true });
            }
        }
    }

    return moves;
}

/**
 * Generates all possible castling moves for the king.
 * @param {number} row - Current row of the king
 * @param {number} col - Current column of the king
 * @param {boolean} isWhite - True if white king, else black
 * @param {Array} currentBoard - Current board state
 * @param {object} currentCastlingRights - Current castling rights
 * @returns {Array} List of castling move objects
 */
function getCastlingMoves(row, col, isWhite, currentBoard, currentCastlingRights) {
    const moves = [];
    if (isKingInCheck(currentBoard, isWhite ? 'white' : 'black')) return moves;

    const rights = currentCastlingRights[isWhite ? 'white' : 'black'];
    if (!rights) return moves;

    // Kingside Castling
    if (rights.kingside &&
        !currentBoard[row][col + 1] &&
        !currentBoard[row][col + 2] &&
        !isSquareAttacked(row, col + 1, isWhite ? 'white' : 'black', currentBoard) &&
        !isSquareAttacked(row, col + 2, isWhite ? 'white' : 'black', currentBoard)) {
        const rook = currentBoard[row][7];
        if (rook && rook.toUpperCase() === 'R') {
            moves.push({ row, col: col + 2, castling: 'kingside' });
        }
    }

    // Queenside Castling
    if (rights.queenside &&
        !currentBoard[row][col - 1] &&
        !currentBoard[row][col - 2] &&
        !currentBoard[row][col - 3] &&
        !isSquareAttacked(row, col - 1, isWhite ? 'white' : 'black', currentBoard) &&
        !isSquareAttacked(row, col - 2, isWhite ? 'white' : 'black', currentBoard)) {
        const rook = currentBoard[row][0];
        if (rook && rook.toUpperCase() === 'R') {
            moves.push({ row, col: col - 2, castling: 'queenside' });
        }
    }

    return moves;
}

/**
 * Checks if a piece belongs to the opponent.
 * @param {string} piece - The piece character
 * @param {boolean} isWhite - True if current player is white, else black
 * @returns {boolean} True if opponent's piece, else false
 */
function isOpponentPiece(piece, isWhite) {
    return isWhite ? piece === piece.toLowerCase() : piece === piece.toUpperCase();
}

/**
 * Simulates a move on a temporary board and returns the new state.
 * @param {number} fromRow - Source row
 * @param {number} fromCol - Source column
 * @param {number} toRow - Destination row
 * @param {number} toCol - Destination column
 * @param {object} move - Move details
 * @param {Array} currentBoard - Current board state
 * @param {object} currentCastlingRights - Current castling rights
 * @param {object} currentEnPassant - Current en passant target
 * @returns {object} New game state after the move
 */
function simulateMove(fromRow, fromCol, toRow, toCol, move, currentBoard, currentCastlingRights, currentEnPassant) {
    const newBoard = JSON.parse(JSON.stringify(currentBoard));
    const newCastlingRights = JSON.parse(JSON.stringify(currentCastlingRights));
    let newEnPassant = null;

    const piece = newBoard[fromRow][fromCol];
    const target = newBoard[toRow][toCol];

    // Move the piece
    newBoard[toRow][toCol] = piece;
    newBoard[fromRow][fromCol] = '';

    // Handle special moves
    if (move.castling) {
        if (move.castling === 'kingside') {
            newBoard[toRow][toCol - 1] = newBoard[toRow][7];
            newBoard[toRow][7] = '';
        } else if (move.castling === 'queenside') {
            newBoard[toRow][toCol + 1] = newBoard[toRow][0];
            newBoard[toRow][0] = '';
        }
    }

    if (move.enPassant) {
        const dir = piece === 'P' ? 1 : -1;
        newBoard[toRow + dir][toCol] = '';
    }

    // Handle promotion
    if (move.promote) {
        newBoard[toRow][toCol] = piece.toUpperCase() === 'P' ? 'Q' : 'q'; // Default promotion to Queen
    }

    // Update castling rights
    if (piece.toUpperCase() === 'K') {
        newCastlingRights[currentPlayer].kingside = false;
        newCastlingRights[currentPlayer].queenside = false;
    }
    if (piece.toUpperCase() === 'R') {
        if (fromCol === 0) {
            newCastlingRights[currentPlayer].queenside = false;
        } else if (fromCol === 7) {
            newCastlingRights[currentPlayer].kingside = false;
        }
    }
    if (target && target.toUpperCase() === 'R') {
        const opponent = currentPlayer === 'white' ? 'black' : 'white';
        if (toCol === 0) {
            newCastlingRights[opponent].queenside = false;
        } else if (toCol === 7) {
            newCastlingRights[opponent].kingside = false;
        }
    }

    // Update enPassantTarget
    if (isPawn(piece) && Math.abs(toRow - fromRow) === 2) {
        const dir = piece === 'P' ? 1 : -1;
        newEnPassant = { row: toRow + dir, col: toCol };
    }

    return {
        board: newBoard,
        castlingRights: newCastlingRights,
        enPassantTarget: newEnPassant
    };
}

/**
 * Retrieves all legal moves for a given color.
 * @param {string} color - 'white' or 'black'
 * @param {object} [state] - Optional game state for simulations
 * @returns {Array} List of all legal move objects
 */
function getAllLegalMoves(color, state = null) {
    const moves = [];
    const currentBoard = state ? state.board : board;
    const currentEnPassant = state ? state.enPassantTarget : enPassantTarget;
    const currentCastlingRights = state ? state.castlingRights : castlingRights;

    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const piece = currentBoard[row][col];
            if (piece && isPieceColor(piece, color)) {
                const pieceMoves = getLegalMoves(row, col, state);
                pieceMoves.forEach(move => {
                    moves.push({
                        fromRow: row,
                        fromCol: col,
                        toRow: move.row,
                        toCol: move.col,
                        capture: !!move.capture,
                        promote: !!move.promote,
                        castling: move.castling || null,
                        enPassant: !!move.enPassant
                    });
                });
            }
        }
    }

    return moves;
}

/**
 * Checks if a piece belongs to the current player.
 * @param {string} piece - The piece character
 * @returns {boolean} True if belongs to current player, else false
 */
function isCurrentPlayerPiece(piece) {
    return currentPlayer === 'white' ? piece === piece.toUpperCase() : piece === piece.toLowerCase();
}

/**
 * Checks if a piece belongs to a specific color.
 * @param {string} piece - The piece character
 * @param {string} color - 'white' or 'black'
 * @returns {boolean} True if belongs to the color, else false
 */
function isPieceColor(piece, color) {
    return color === 'white' ? piece === piece.toUpperCase() : piece === piece.toLowerCase();
}

/**
 * Determines if a square is within the board boundaries.
 * @param {number} row - Row index
 * @param {number} col - Column index
 * @returns {boolean} True if on board, else false
 */
function isOnBoard(row, col) {
    return row >= 0 && row < 8 && col >= 0 && col < 8;
}

// ========================= Move Execution =========================

/**
 * Executes a move on the board, updates game state, and handles special moves.
 * @param {number} fromRow - Source row
 * @param {number} fromCol - Source column
 * @param {number} toRow - Destination row
 * @param {number} toCol - Destination column
 * @param {object} move - Move details
 */
function makeMove(fromRow, fromCol, toRow, toCol, move) {
    const piece = board[fromRow][fromCol];
    const targetPiece = board[toRow][toCol];

    // Handle Special Moves
    if (move.castling) {
        performCastling(fromRow, fromCol, toRow, toCol, move.castling);
    } else if (move.enPassant) {
        performEnPassant(fromRow, fromCol, toRow, toCol, piece);
    } else {
        // Regular Move
        board[toRow][toCol] = piece;
        board[fromRow][fromCol] = '';
    }

    // Handle Promotion
    if (move.promote) {
        showPromotionModal(toRow, toCol, currentPlayer, promotedPiece => {
            board[toRow][toCol] = promotedPiece;
            moveSound.play();
            addMoveToHistory(fromRow, fromCol, toRow, toCol, move, promotedPiece);
            finalizeMove();
        });
        return; // Wait for promotion choice
    }

    // Play sounds
    if (targetPiece || move.enPassant) {
        captureSound.play();
    } else {
        moveSound.play();
    }

    // Add move to history
    addMoveToHistory(fromRow, fromCol, toRow, toCol, move);

    // Finalize Move
    finalizeMove();
}

/**
 * Performs castling move on the board.
 * @param {number} fromRow - Source row
 * @param {number} fromCol - Source column
 * @param {number} toRow - Destination row
 * @param {number} toCol - Destination column
 * @param {string} side - 'kingside' or 'queenside'
 */
function performCastling(fromRow, fromCol, toRow, toCol, side) {
    const king = board[fromRow][fromCol];
    board[toRow][toCol] = king;
    board[fromRow][fromCol] = '';

    if (side === 'kingside') {
        const rook = board[fromRow][7];
        board[toRow][toCol - 1] = rook;
        board[fromRow][7] = '';
    } else if (side === 'queenside') {
        const rook = board[fromRow][0];
        board[toRow][toCol + 1] = rook;
        board[fromRow][0] = '';
    }

    // Update castling rights
    castlingRights[currentPlayer].kingside = false;
    castlingRights[currentPlayer].queenside = false;
}

/**
 * Performs en passant capture on the board.
 * @param {number} fromRow - Source row
 * @param {number} fromCol - Source column
 * @param {number} toRow - Destination row
 * @param {number} toCol - Destination column
 * @param {string} piece - The pawn performing en passant
 */
function performEnPassant(fromRow, fromCol, toRow, toCol, piece) {
    board[toRow][toCol] = piece;
    board[fromRow][fromCol] = '';
    const dir = currentPlayer === 'white' ? 1 : -1;
    board[toRow + dir][toCol] = '';
}

/**
 * Adds a move to the move history and updates the UI.
 * @param {number} fromRow - Source row
 * @param {number} fromCol - Source column
 * @param {number} toRow - Destination row
 * @param {number} toCol - Destination column
 * @param {object} move - Move details
 * @param {string} [promotedPiece] - Piece chosen during promotion
 */
function addMoveToHistory(fromRow, fromCol, toRow, toCol, move, promotedPiece = null) {
    const cols = 'abcdefgh';
    const from = `${cols[fromCol]}${8 - fromRow}`;
    const to = `${cols[toCol]}${8 - toRow}`;
    let notation = '';

    if (move.castling) {
        notation = move.castling === 'kingside' ? 'O-O' : 'O-O-O';
    } else {
        const piece = board[toRow][toCol].toUpperCase();
        const capture = move.capture || move.enPassant ? 'x' : '';
        notation = (piece !== 'P' ? piece : '') + from + capture + to;
        if (promotedPiece) {
            notation += `=${promotedPiece.toUpperCase()}`;
        }
    }

    moveHistory.push(notation);
    updateMoveHistoryUI();
}

/**
 * Updates the move history list in the UI.
 */
function updateMoveHistoryUI() {
    const moveCount = Math.ceil(moveHistory.length / 2);
    const moveText = moveHistory[moveHistory.length - 1];
    if (currentPlayer === 'black') {
        // Black's move, append to the last list item
        const lastItem = historyList.lastElementChild;
        if (lastItem) {
            lastItem.textContent += `   ${moveText}`;
        }
    } else {
        // White's move, create a new list item
        const listItem = document.createElement('li');
        listItem.textContent = `${moveCount}. ${moveText}`;
        historyList.appendChild(listItem);
    }
}

/**
 * Finalizes the move by updating game state, checking for game over conditions, and triggering AI move if necessary.
 */
function finalizeMove() {
    // Switch Player
    currentPlayer = currentPlayer === 'white' ? 'black' : 'white';
    currentPlayerElement.textContent = currentPlayer === 'white' ? '⚫ Negro' : '⚪ Blanco';

    // Redraw Board
    drawBoard();

    // Check for Check, Checkmate, or Stalemate
    if (isKingInCheck(board, currentPlayer)) {
        if (getAllLegalMoves(currentPlayer).length === 0) {
            isGameOver = true;
            checkSound.play();
            alert(`🏆 ¡Jaque mate! Gana el jugador ${currentPlayer === 'white' ? '⚫ Negro' : '⚪ Blanco'}`);
            clearInterval(gameInterval);
            return;
        } else {
            checkSound.play();
            highlightKing(currentPlayer);
        }
    } else {
        if (getAllLegalMoves(currentPlayer).length === 0) {
            isGameOver = true;
            alert('🤝 ¡Empate por ahogado!');
            clearInterval(gameInterval);
            return;
        }
    }

    // If it's AI's turn, make the computer move
    if (currentPlayer === 'black' && !isGameOver) {
        setTimeout(computerMove, 500);
    }
}

// ========================= Promotion Handling =========================

/**
 * Displays the promotion modal for the player to choose a piece.
 * @param {number} row - Destination row
 * @param {number} col - Destination column
 * @param {string} color - 'white' or 'black'
 * @param {function} callback - Function to call with the chosen piece
 */
function showPromotionModal(row, col, color, callback) {
    promotionModal.style.display = 'flex';
    promotionOptions.innerHTML = '';

    promotionPieces[color].forEach(piece => {
        const pieceElem = document.createElement('span');
        pieceElem.classList.add('promotion-piece');
        pieceElem.innerHTML = pieces[piece];
        pieceElem.title = getPieceName(piece);
        pieceElem.addEventListener('click', () => {
            promotionModal.style.display = 'none';
            callback(piece);
        });
        promotionOptions.appendChild(pieceElem);
    });
}

/**
 * Returns the name of a piece for tooltip purposes.
 * @param {string} piece - The piece character
 * @returns {string} Name of the piece
 */
function getPieceName(piece) {
    const names = {
        'Q': '♕ Reina',
        'R': '♖ Torre',
        'B': '♗ Alfil',
        'N': '♘ Caballo',
        'q': '♛ Reina',
        'r': '♜ Torre',
        'b': '♝ Alfil',
        'n': '♞ Caballo'
    };
    return names[piece] || 'Promoción';
}

// ========================= AI Logic =========================

/**
 * Triggers the computer's move based on the current difficulty level.
 */
function computerMove() {
    if (isGameOver) return;

    let depth;
    switch (difficultyLevel) {
        case 1:
            depth = 2; // Fácil
            break;
        case 2:
            depth = 4; // Medio
            break;
        case 3:
            depth = 6; // Difícil
            break;
        default:
            depth = 4;
    }

    const bestMove = getBestMove('black', depth);
    if (bestMove) {
        makeMove(bestMove.fromRow, bestMove.fromCol, bestMove.toRow, bestMove.toCol, bestMove);
    } else {
        // No legal moves available
        isGameOver = true;
        const isInCheck = isKingInCheck(board, 'black');
        alert(`🏆 ¡${isInCheck ? 'Jaque mate' : 'Empate por ahogado'}!`);
        clearInterval(gameInterval);
    }
}

/**
 * Retrieves the best move for the AI using the Minimax algorithm with alpha-beta pruning.
 * @param {string} color - 'white' or 'black'
 * @param {number} depth - Search depth
 * @returns {object|null} Best move object or null if no moves available
 */
function getBestMove(color, depth) {
    const maximizing = color === 'white';
    let bestScore = maximizing ? -Infinity : Infinity;
    let bestMove = null;
    const allMoves = getAllLegalMoves(color);

    // Move Ordering: Prioritize captures and checks
    allMoves.sort((a, b) => {
        const aValue = board[a.toRow][a.toCol] ? getPieceValue(board[a.toRow][a.toCol]) : 0;
        const bValue = board[b.toRow][b.toCol] ? getPieceValue(board[b.toRow][b.toCol]) : 0;
        return bValue - aValue; // Higher captures first
    });

    for (const move of allMoves) {
        const tempState = simulateMove(move.fromRow, move.fromCol, move.toRow, move.toCol, move, board, castlingRights, enPassantTarget);
        const score = minimax(tempState.board, depth - 1, -Infinity, Infinity, !maximizing, tempState);

        if (maximizing && score > bestScore) {
            bestScore = score;
            bestMove = move;
        } else if (!maximizing && score < bestScore) {
            bestScore = score;
            bestMove = move;
        }
    }

    return bestMove;
}

/**
 * Minimax algorithm with alpha-beta pruning.
 * @param {Array} currentBoard - Current board state
 * @param {number} depth - Remaining depth
 * @param {number} alpha - Alpha value for pruning
 * @param {number} beta - Beta value for pruning
 * @param {boolean} maximizingPlayer - True if maximizing player, else minimizing
 * @param {object} state - Current game state
 * @returns {number} Evaluation score
 */
function minimax(currentBoard, depth, alpha, beta, maximizingPlayer, state) {
    if (depth === 0 || isTerminal(state)) {
        return evaluateBoard(state.board);
    }

    const color = maximizingPlayer ? 'white' : 'black';
    const allMoves = getAllLegalMoves(color, state);

    if (allMoves.length === 0) {
        if (isKingInCheck(state.board, color)) {
            return maximizingPlayer ? -Infinity : Infinity;
        } else {
            return 0; // Stalemate
        }
    }

    // Move Ordering: Prioritize captures and checks
    allMoves.sort((a, b) => {
        const aValue = state.board[a.toRow][a.toCol] ? getPieceValue(state.board[a.toRow][a.toCol]) : 0;
        const bValue = state.board[b.toRow][b.toCol] ? getPieceValue(state.board[b.toRow][b.toCol]) : 0;
        return bValue - aValue; // Higher captures first
    });

    if (maximizingPlayer) {
        let maxEval = -Infinity;
        for (const move of allMoves) {
            const tempState = simulateMove(move.fromRow, move.fromCol, move.toRow, move.toCol, move, state.board, state.castlingRights, state.enPassantTarget);
            const evalScore = minimax(tempState.board, depth - 1, alpha, beta, false, tempState);
            maxEval = Math.max(maxEval, evalScore);
            alpha = Math.max(alpha, evalScore);
            if (beta <= alpha) break; // Beta cut-off
        }
        return maxEval;
    } else {
        let minEval = Infinity;
        for (const move of allMoves) {
            const tempState = simulateMove(move.fromRow, move.fromCol, move.toRow, move.toCol, move, state.board, state.castlingRights, state.enPassantTarget);
            const evalScore = minimax(tempState.board, depth - 1, alpha, beta, true, tempState);
            minEval = Math.min(minEval, evalScore);
            beta = Math.min(beta, evalScore);
            if (beta <= alpha) break; // Alpha cut-off
        }
        return minEval;
    }
}

/**
 * Evaluates the board position and returns a score.
 * @param {Array} tempBoard - Board state to evaluate
 * @returns {number} Evaluation score
 */
function evaluateBoard(tempBoard) {
    const pieceValues = {
        'p': 100, 'n': 320, 'b': 330, 'r': 500, 'q': 900, 'k': 20000,
        'P': 100, 'N': 320, 'B': 330, 'R': 500, 'Q': 900, 'K': 20000
    };

    let score = 0;

    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const piece = tempBoard[row][col];
            if (piece) {
                const value = pieceValues[piece];
                score += currentPlayer === 'white' ? value : -value;
                score += getPieceSquareValue(piece, row, col);
            }
        }
    }

    // Additional Factors
    score += mobility(tempBoard, 'white') * 10;
    score -= mobility(tempBoard, 'black') * 10;
    score += kingSafety(tempBoard, 'white');
    score -= kingSafety(tempBoard, 'black');

    return score;
}

/**
 * Retrieves the piece-square table value for a given piece.
 * @param {string} piece - The piece character
 * @param {number} row - Row index
 * @param {number} col - Column index
 * @returns {number} Piece-square table value
 */
function getPieceSquareValue(piece, row, col) {
    const upperPiece = piece.toUpperCase();
    const isWhite = piece === upperPiece;
    if (pieceSquareTables[upperPiece]) {
        const index = isWhite ? (row * 8 + col) : ((7 - row) * 8 + col);
        return pieceSquareTables[upperPiece][index];
    }
    return 0;
}

/**
 * Calculates mobility (number of legal moves) for a given color.
 * @param {Array} tempBoard - Board state
 * @param {string} color - 'white' or 'black'
 * @returns {number} Mobility count
 */
function mobility(tempBoard, color) {
    return getAllLegalMoves(color, { board: tempBoard, castlingRights, enPassantTarget }).length;
}

/**
 * Evaluates king safety by checking if the king is in check.
 * @param {Array} tempBoard - Board state
 * @param {string} color - 'white' or 'black'
 * @returns {number} King safety score
 */
function kingSafety(tempBoard, color) {
    return isKingInCheck(tempBoard, color) ? -50 : 0;
}

/**
 * Retrieves the value of a piece for move ordering.
 * @param {string} piece - The piece character
 * @returns {number} Piece value
 */
function getPieceValue(piece) {
    const pieceValues = {
        'p': 100, 'n': 320, 'b': 330, 'r': 500, 'q': 900, 'k': 20000,
        'P': 100, 'N': 320, 'B': 330, 'R': 500, 'Q': 900, 'K': 20000
    };
    return pieceValues[piece] || 0;
}

// ========================= Check and Checkmate Detection =========================

/**
 * Determines if the king of a given color is in check.
 * @param {Array} tempBoard - Board state
 * @param {string} color - 'white' or 'black'
 * @returns {boolean} True if in check, else false
 */
function isKingInCheck(tempBoard, color) {
    const kingPos = findKing(tempBoard, color);
    if (!kingPos) return false; // King is missing, should not happen
    return isSquareAttacked(kingPos.row, kingPos.col, color, tempBoard);
}

/**
 * Finds the position of the king for a given color.
 * @param {Array} tempBoard - Board state
 * @param {string} color - 'white' or 'black'
 * @returns {object|null} Object with row and col or null if not found
 */
function findKing(tempBoard, color) {
    const king = color === 'white' ? 'K' : 'k';
    for (let row = 0; row < 8; row++) {
        // Check if tempBoard[row] is valid before accessing its columns
        if (tempBoard[row]) {
            for (let col = 0; col < 8; col++) {
                if (tempBoard[row][col] === king) {
                    return { row, col };
                }
            }
        }
    }
    return null; // If the king is not found, return null
}


/**
 * Checks if a square is attacked by the opponent.
 * @param {number} row - Row index of the square
 * @param {number} col - Column index of the square
 * @param {string} color - 'white' or 'black' whose king is being checked
 * @param {Array} tempBoard - Board state
 * @returns {boolean} True if attacked, else false
 */
function isSquareAttacked(row, col, color, tempBoard) {
    const opponent = color === 'white' ? 'black' : 'white';
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const piece = tempBoard[r][c];
            if (piece && isPieceColor(piece, opponent)) {
                const pieceMoves = getPseudoLegalMoves(r, c, tempBoard);
                if (pieceMoves.some(m => m.row === row && m.col === col)) {
                    return true;
                }
            }
        }
    }
    return false;
}

/**
 * Generates pseudo-legal moves for a piece without considering king safety.
 * @param {number} row - Current row of the piece
 * @param {number} col - Current column of the piece
 * @param {Array} tempBoard - Board state
 * @returns {Array} List of move objects
 */
function getPseudoLegalMoves(row, col, tempBoard) {
    const piece = tempBoard[row][col];
    if (!piece) return [];

    const isWhite = piece === piece.toUpperCase();
    const directions = getPieceDirections(piece);
    const moves = [];

    for (const [dr, dc] of directions) {
        let newRow = row + dr;
        let newCol = col + dc;

        while (isOnBoard(newRow, newCol)) {
            const target = tempBoard[newRow][newCol];
            if (!target) {
                moves.push({ row: newRow, col: newCol });
            } else {
                if (isOpponentPiece(target, isWhite)) {
                    moves.push({ row: newRow, col: newCol });
                }
                break;
            }

            if (isSlidingPiece(piece)) {
                newRow += dr;
                newCol += dc;
            } else {
                break;
            }
        }
    }

    // Special handling for pawns
    if (isPawn(piece)) {
        const direction = isWhite ? -1 : 1;
        const forwardRow = row + direction;

        // Captures
        for (const dc of [-1, 1]) {
            const captureCol = col + dc;
            if (isOnBoard(forwardRow, captureCol)) {
                moves.push({ row: forwardRow, col: captureCol });
            }
        }
    }

    return moves;
}

// ========================= Helper Functions =========================

/**
 * Simulates a move and returns the new game state.
 * @param {number} fromRow - Source row
 * @param {number} fromCol - Source column
 * @param {number} toRow - Destination row
 * @param {number} toCol - Destination column
 * @param {object} move - Move details
 * @param {Array} currentBoard - Current board state
 * @param {object} currentCastlingRights - Current castling rights
 * @param {object} currentEnPassant - Current en passant target
 * @returns {object} New game state after the move
 */
function simulateMove(fromRow, fromCol, toRow, toCol, move, currentBoard, currentCastlingRights, currentEnPassant) {
    const newBoard = JSON.parse(JSON.stringify(currentBoard));
    const newCastlingRights = JSON.parse(JSON.stringify(currentCastlingRights));
    let newEnPassant = null;

    const piece = newBoard[fromRow][fromCol];
    const target = newBoard[toRow][toCol];

    // Move the piece
    newBoard[toRow][toCol] = piece;
    newBoard[fromRow][fromCol] = '';

    // Handle special moves
    if (move.castling) {
        if (move.castling === 'kingside') {
            newBoard[toRow][toCol - 1] = newBoard[toRow][7];
            newBoard[toRow][7] = '';
        } else if (move.castling === 'queenside') {
            newBoard[toRow][toCol + 1] = newBoard[toRow][0];
            newBoard[toRow][0] = '';
        }
    }

    if (move.enPassant) {
        const dir = piece === 'P' ? 1 : -1;
        newBoard[toRow + dir][toCol] = '';
    }

    // Handle promotion
    if (move.promote) {
        newBoard[toRow][toCol] = piece.toUpperCase() === 'P' ? 'Q' : 'q'; // Default promotion to Queen
    }

    // Update castling rights
    if (piece.toUpperCase() === 'K') {
        newCastlingRights[currentPlayer].kingside = false;
        newCastlingRights[currentPlayer].queenside = false;
    }
    if (piece.toUpperCase() === 'R') {
        if (fromCol === 0) {
            newCastlingRights[currentPlayer].queenside = false;
        } else if (fromCol === 7) {
            newCastlingRights[currentPlayer].kingside = false;
        }
    }
    if (target && target.toUpperCase() === 'R') {
        const opponent = currentPlayer === 'white' ? 'black' : 'white';
        if (toCol === 0) {
            newCastlingRights[opponent].queenside = false;
        } else if (toCol === 7) {
            newCastlingRights[opponent].kingside = false;
        }
    }

    // Update enPassantTarget
    if (isPawn(piece) && Math.abs(toRow - fromRow) === 2) {
        const dir = piece === 'P' ? 1 : -1;
        newEnPassant = { row: toRow + dir, col: toCol };
    }

    return {
        board: newBoard,
        castlingRights: newCastlingRights,
        enPassantTarget: newEnPassant
    };
}

/**
 * Checks if a piece belongs to the opponent.
 * @param {string} piece - The piece character
 * @param {boolean} isWhite - True if current player is white, else black
 * @returns {boolean} True if opponent's piece, else false
 */
function isOpponentPiece(piece, isWhite) {
    return isWhite ? piece === piece.toLowerCase() : piece === piece.toUpperCase();
}

/**
 * Starts the game timer.
 */
function startTimer() {
    gameInterval = setInterval(() => {
        timeElapsed++;
        const minutes = String(Math.floor(timeElapsed / 60)).padStart(2, '0');
        const seconds = String(timeElapsed % 60).padStart(2, '0');
        timerElement.textContent = `${minutes}:${seconds}`;
    }, 1000);
}

/**
 * Retrieves the opponent's color.
 * @returns {string} 'white' or 'black'
 */
function opponentColor() {
    return currentPlayer === 'white' ? 'black' : 'white';
}

// ========================= AI Enhancements =========================

/**
 * Evaluates whether the game is over (checkmate or stalemate).
 * @param {object} state - Current game state
 * @returns {boolean} True if game is over, else false
 */
function isTerminal(state) {
    return isKingInCheck(state.board, currentPlayer) && getAllLegalMoves(currentPlayer, state).length === 0;
}

// ========================= Event Listeners =========================

// Update difficulty level based on user selection
levelSelect.addEventListener('change', () => {
    difficultyLevel = parseInt(levelSelect.value);
});

// Start a new game when the "New Game" button is clicked
newGameBtn.addEventListener('click', () => {
    initializeGame();
});

// Close promotion modal when clicking outside the modal content
window.addEventListener('click', (e) => {
    if (e.target === promotionModal) {
        promotionModal.style.display = 'none';
    }
});

// ========================= Game Initialization =========================

// Start the game upon script load
initializeGame();

// ========================= End of Chess Game Logic =========================
