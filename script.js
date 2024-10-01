// Interface variables
const boardElement = document.getElementById('board');
const currentPlayerElement = document.getElementById('player-color');
const timerElement = document.getElementById('time');
const levelSelect = document.getElementById('level-select');
const newGameBtn = document.getElementById('new-game-btn');
const promotionModal = document.getElementById('promotion-modal');
const promotionOptions = document.getElementById('promotion-options');
const historyList = document.getElementById('history-list');

// Sounds
const moveSound = document.getElementById('move-sound');
const captureSound = document.getElementById('capture-sound');
const checkSound = document.getElementById('check-sound');

// Game variables
let board = [];
let currentPlayer = 'white';
let selectedPiece = null;
let gameInterval;
let time = 0;
let isGameOver = false;
let difficultyLevel = parseInt(levelSelect.value);
let moveHistory = [];
let enPassantTarget = null;
let castlingRights = {
    white: { kingside: true, queenside: true },
    black: { kingside: true, queenside: true }
};
let promotionCallback = null;

// Map pieces to Unicode characters
const pieces = {
    'r': '♜', 'n': '♞', 'b': '♝', 'q': '♛', 'k': '♚', 'p': '♟',  // Black pieces
    'R': '♖', 'N': '♘', 'B': '♗', 'Q': '♕', 'K': '♔', 'P': '♙'   // White pieces
};

const promotionPieces = {
    'white': ['Q', 'R', 'B', 'N'],
    'black': ['q', 'r', 'b', 'n']
};

// Piece-Square Tables (Comprehensive)
const pieceSquareTables = {
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

// Initialize the game
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
    time = 0;

    currentPlayerElement.textContent = currentPlayer === 'white' ? '⚪ Blanco' : '⚫ Negro';

    historyList.innerHTML = '';
    clearInterval(gameInterval);
    startTimer();

    drawBoard();
}

// Draw the board
function drawBoard() {
    boardElement.innerHTML = '';
    for (let i = 0; i < 8; i++) {
        for (let j = 0; j < 8; j++) {
            const square = document.createElement('div');
            square.classList.add('square');
            square.classList.add((i + j) % 2 === 0 ? 'light' : 'dark');
            square.dataset.row = i;
            square.dataset.col = j;
            square.addEventListener('click', onSquareClick);
            boardElement.appendChild(square);

            const piece = board[i][j];
            if (piece) {
                const pieceElem = document.createElement('span');
                pieceElem.classList.add('piece');
                pieceElem.textContent = pieces[piece];
                square.appendChild(pieceElem);
            }
        }
    }
}

// Handle square clicks
function onSquareClick(e) {
    if (isGameOver) return;

    const row = parseInt(e.currentTarget.dataset.row);
    const col = parseInt(e.currentTarget.dataset.col);
    const piece = board[row][col];

    if (selectedPiece) {
        const legalMoves = getLegalMoves(selectedPiece.row, selectedPiece.col);
        const moveIsLegal = legalMoves.some(move => move.row === row && move.col === col);

        if (moveIsLegal) {
            const moveDetails = legalMoves.find(move => move.row === row && move.col === col);
            makeMove(selectedPiece.row, selectedPiece.col, row, col, moveDetails);
            selectedPiece = null;
            clearHighlights();
        } else {
            selectedPiece = null;
            clearHighlights();
        }
    } else {
        if (piece && isCurrentPlayerPiece(piece)) {
            selectedPiece = { row, col, piece };
            highlightSquare(row, col, 'selected');
            const legalMoves = getLegalMoves(row, col);
            highlightMoves(legalMoves);
        }
    }
}

// Get legal moves for a piece
function getLegalMoves(row, col, tempBoard = board, tempEnPassantTarget = enPassantTarget, tempCastlingRights = castlingRights) {
    const piece = tempBoard[row][col];
    if (!piece || !isCurrentPlayerPiece(piece)) return [];

    const moves = [];
    const isWhite = piece === piece.toUpperCase();

    // Define movement directions
    const directions = {
        'P': [[-1, 0]],
        'p': [[1, 0]],
        'N': [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]],
        'B': [[-1,-1],[-1,1],[1,-1],[1,1]],
        'R': [[-1,0],[1,0],[0,-1],[0,1]],
        'Q': [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]],
        'K': [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]]
    };

    const upperPiece = piece.toUpperCase();

    if (upperPiece === 'P') {
        // Pawn moves
        const dir = isWhite ? -1 : 1;
        const startRow = isWhite ? 6 : 1;

        // One square forward
        if (isEmptySquare(row + dir, col, tempBoard)) {
            moves.push({ row: row + dir, col: col });
            // Two squares forward from starting position
            if (row === startRow && isEmptySquare(row + 2 * dir, col, tempBoard)) {
                moves.push({ row: row + 2 * dir, col: col });
            }
        }
        // Captures
        for (let dc of [-1, 1]) {
            const newRow = row + dir;
            const newCol = col + dc;
            if (isOnBoard(newRow, newCol)) {
                const targetPiece = tempBoard[newRow][newCol];
                if (targetPiece && !isCurrentPlayerPiece(targetPiece)) {
                    moves.push({ row: newRow, col: newCol });
                }
                // En passant
                if (newRow === tempEnPassantTarget?.row && newCol === tempEnPassantTarget?.col) {
                    moves.push({ row: newRow, col: newCol, enPassant: true });
                }
            }
        }
    } else {
        // Other pieces
        const pieceDirections = directions[upperPiece];
        for (let [dr, dc] of pieceDirections) {
            let newRow = row + dr;
            let newCol = col + dc;
            while (isOnBoard(newRow, newCol)) {
                const targetPiece = tempBoard[newRow][newCol];
                if (!targetPiece) {
                    moves.push({ row: newRow, col: newCol });
                } else {
                    if (!isCurrentPlayerPiece(targetPiece)) {
                        moves.push({ row: newRow, col: newCol });
                    }
                    break;
                }
                if (upperPiece === 'N' || upperPiece === 'K') break;
                newRow += dr;
                newCol += dc;
            }
        }

        // Castling for King
        if (upperPiece === 'K' && tempBoard === board) { // Only for main board, not in simulations
            if (canCastle('kingside', tempBoard, tempCastlingRights)) {
                if (isEmptySquare(row, col + 1, tempBoard) && isEmptySquare(row, col + 2, tempBoard)) {
                    if (!isSquareAttacked(row, col, currentPlayer, tempBoard) &&
                        !isSquareAttacked(row, col + 1, currentPlayer, tempBoard) &&
                        !isSquareAttacked(row, col + 2, currentPlayer, tempBoard)) {
                        moves.push({ row: row, col: col + 2, castling: 'kingside' });
                    }
                }
            }
            if (canCastle('queenside', tempBoard, tempCastlingRights)) {
                if (isEmptySquare(row, col - 1, tempBoard) && isEmptySquare(row, col - 2, tempBoard) && isEmptySquare(row, col - 3, tempBoard)) {
                    if (!isSquareAttacked(row, col, currentPlayer, tempBoard) &&
                        !isSquareAttacked(row, col - 1, currentPlayer, tempBoard) &&
                        !isSquareAttacked(row, col - 2, currentPlayer, tempBoard)) {
                        moves.push({ row: row, col: col - 2, castling: 'queenside' });
                    }
                }
            }
        }
    }

    // Additional Heuristics for Evaluation
    // Mobility: Number of legal moves available
    // King Safety: Penalize if king is under threat
    // Piece-Square Tables are already incorporated in the evaluation function

    // Filter out moves that leave king in check
    const legalMoves = [];
    for (let move of moves) {
        const tempBoardCopy = JSON.parse(JSON.stringify(tempBoard));
        const tempCastlingRightsCopy = JSON.parse(JSON.stringify(tempCastlingRights));
        makeTemporaryMove(tempBoardCopy, tempCastlingRightsCopy, row, col, move.row, move.col, move.castling, move.enPassant);
        if (!isKingInCheck(tempBoardCopy, currentPlayer)) {
            legalMoves.push(move);
        }
    }

    return legalMoves;
}

// Get all legal moves for a color
function getAllLegalMoves(color, tempBoard = board, tempEnPassant = enPassantTarget, tempCastlingRights = castlingRights) {
    const moves = [];
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const piece = tempBoard[row][col];
            if (piece && isPieceColor(piece, color)) {
                const legalMoves = getLegalMoves(row, col, tempBoard, tempEnPassant, tempCastlingRights);
                for (let move of legalMoves) {
                    moves.push({
                        fromRow: row,
                        fromCol: col,
                        toRow: move.row,
                        toCol: move.col,
                        castling: move.castling,
                        enPassant: move.enPassant
                    });
                }
            }
        }
    }
    return moves;
}

// Check if a square is on the board
function isOnBoard(row, col) {
    return row >= 0 && row < 8 && col >= 0 && col < 8;
}

// Check if a square is empty
function isEmptySquare(row, col, tempBoard = board) {
    return isOnBoard(row, col) && !tempBoard[row][col];
}

// Check if a piece belongs to the current player
function isCurrentPlayerPiece(piece) {
    return currentPlayer === 'white' ? piece === piece.toUpperCase() : piece === piece.toLowerCase();
}

// Highlight moves
function highlightMoves(moves) {
    moves.forEach(move => {
        const square = document.querySelector(`.square[data-row="${move.row}"][data-col="${move.col}"]`);
        if (square) square.classList.add('highlight');
    });
}

// Highlight square
function highlightSquare(row, col, className) {
    const square = document.querySelector(`.square[data-row="${row}"][data-col="${col}"]`);
    if (square) square.classList.add(className);
}

// Clear highlights
function clearHighlights() {
    document.querySelectorAll('.square').forEach(square => {
        square.classList.remove('selected', 'highlight', 'check');
    });
}

// Make a move
function makeMove(fromRow, fromCol, toRow, toCol, moveDetails) {
    const piece = board[fromRow][fromCol];
    const targetPiece = board[toRow][toCol];
    
    // Handle special moves: promotion, en passant, castling

    // Promotion
    if (piece.toUpperCase() === 'P' && (toRow === 0 || toRow === 7)) {
        showPromotionModal(toRow, toCol, currentPlayer);
        promotionCallback = (promotedPiece) => {
            board[toRow][toCol] = promotedPiece;
            board[fromRow][fromCol] = '';

            // Generate move notation with promotion
            let notation = '';

            const cols = 'abcdefgh';
            const pieceChar = piece.toUpperCase() !== 'P' ? piece.toUpperCase() : '';
            const captureChar = (targetPiece !== '' || moveDetails.enPassant) ? 'x' : '';
            notation = pieceChar + cols[fromCol] + (8 - fromRow) + captureChar + cols[toCol] + (8 - toRow) + '=' + promotedPiece.toUpperCase();

            // Store the move in moveHistory
            moveHistory.push({ notation });

            afterMove();
        };
        return;
    }

    // En passant
    if (piece.toUpperCase() === 'P' && moveDetails.enPassant) {
        const dir = currentPlayer === 'white' ? 1 : -1;
        board[toRow + dir][toCol] = '';
    }

    // Castling
    if (piece.toUpperCase() === 'K' && Math.abs(toCol - fromCol) === 2) {
        if (toCol > fromCol) {
            // Kingside
            board[toRow][toCol] = piece;
            board[fromRow][fromCol] = '';
            board[toRow][toCol - 1] = board[toRow][7];
            board[toRow][7] = '';
        } else {
            // Queenside
            board[toRow][toCol] = piece;
            board[fromRow][fromCol] = '';
            board[toRow][toCol + 1] = board[toRow][0];
            board[toRow][0] = '';
        }
        castlingRights[currentPlayer].kingside = false;
        castlingRights[currentPlayer].queenside = false;
        moveSound.play();

        // Generate move notation for castling
        let notation = toCol > fromCol ? 'O-O' : 'O-O-O';

        // Store the move in moveHistory
        moveHistory.push({ notation });

        afterMove();
        return;
    }

    // Regular move
    board[toRow][toCol] = piece;
    board[fromRow][fromCol] = '';

    // Update castling rights
    if (piece.toUpperCase() === 'K') {
        castlingRights[currentPlayer].kingside = false;
        castlingRights[currentPlayer].queenside = false;
    } else if (piece.toUpperCase() === 'R') {
        if (fromCol === 0) {
            castlingRights[currentPlayer].queenside = false;
        } else if (fromCol === 7) {
            castlingRights[currentPlayer].kingside = false;
        }
    }
    if (targetPiece && targetPiece.toUpperCase() === 'R') {
        const opponent = opponentColor();
        if (toCol === 0) {
            castlingRights[opponent].queenside = false;
        } else if (toCol === 7) {
            castlingRights[opponent].kingside = false;
        }
    }

    // Update enPassantTarget
    if (piece.toUpperCase() === 'P' && Math.abs(toRow - fromRow) === 2) {
        const dir = currentPlayer === 'white' ? -1 : 1;
        enPassantTarget = { row: toRow + dir, col: toCol };
    } else {
        enPassantTarget = null;
    }

    if (targetPiece || moveDetails.enPassant) {
        captureSound.play();
    } else {
        moveSound.play();
    }

    // Generate move notation
    let notation = '';

    const cols = 'abcdefgh';
    const pieceChar = piece.toUpperCase() !== 'P' ? piece.toUpperCase() : '';
    const captureChar = (targetPiece !== '' || moveDetails.enPassant) ? 'x' : '';
    notation = pieceChar + cols[fromCol] + (8 - fromRow) + captureChar + cols[toCol] + (8 - toRow);

    // Store the move in moveHistory
    moveHistory.push({ notation });

    afterMove();
}

// Actions after a move
function afterMove() {
    // Update move history display
    updateMoveHistory();

    // Switch current player
    currentPlayer = opponentColor();
    currentPlayerElement.textContent = currentPlayer === 'white' ? '⚫ Negro' : '⚪ Blanco';

    // Redraw the board
    drawBoard();

    // Check for check, checkmate, or stalemate
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

    // If it's the computer's turn, make the computer move
    if (currentPlayer === 'black' && !isGameOver) {
        setTimeout(computerMove, 500);
    }
}

// Update move history
function updateMoveHistory() {
    if (moveHistory.length === 0) return; // No moves to display

    const lastMove = moveHistory[moveHistory.length - 1];
    const moveNumber = Math.ceil(moveHistory.length / 2);
    const notation = lastMove.notation;

    if (currentPlayer === 'black') {
        // White's move
        const listItem = document.createElement('li');
        listItem.textContent = `${moveNumber}. ${notation}`;
        historyList.appendChild(listItem);
    } else {
        // Black's move
        const listItem = historyList.lastElementChild;
        if (listItem) {
            listItem.textContent += `   ${notation}`;
        }
    }
}

// Show promotion modal
function showPromotionModal(row, col, color) {
    promotionModal.style.display = 'flex';
    promotionOptions.innerHTML = '';

    promotionPieces[color].forEach(piece => {
        const pieceElem = document.createElement('span');
        pieceElem.classList.add('promotion-piece');
        pieceElem.innerHTML = pieces[piece];
        pieceElem.title = getPieceName(piece);
        pieceElem.addEventListener('click', () => {
            promotionModal.style.display = 'none';
            if (promotionCallback) promotionCallback(piece);
        });
        promotionOptions.appendChild(pieceElem);
    });
}

// Get piece name for title
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

// Computer move with AI
function computerMove() {
    if (isGameOver) return;

    let depth;
    switch (difficultyLevel) {
        case 1:
            depth = 2; // Fácil
            break;
        case 2:
            depth = 3; // Medio
            break;
        case 3:
            depth = 4; // Difícil
            break;
        default:
            depth = 3;
    }
    const bestMove = getBestMove(currentPlayer, depth);
    if (bestMove) {
        makeMove(bestMove.fromRow, bestMove.fromCol, bestMove.toRow, bestMove.toCol, bestMove);
    } else {
        // No legal moves available
        isGameOver = true;
        const isInCheck = isKingInCheck(board, currentPlayer);
        alert(`🏆 ¡${isInCheck ? 'Jaque mate' : 'Empate por ahogado'}!`);
        clearInterval(gameInterval);
    }
}

// Get the best move using Minimax algorithm with enhancements
function getBestMove(color, depth) {
    const maximizingPlayer = color === 'white';
    let bestScore = maximizingPlayer ? -Infinity : Infinity;
    let bestMove = null;
    const allMoves = getAllLegalMoves(color);

    // Move Ordering: Prioritize captures and checks to optimize alpha-beta pruning
    allMoves.sort((a, b) => {
        const aCapture = board[a.toRow][a.toCol] ? getPieceValue(board[a.toRow][a.toCol]) : 0;
        const bCapture = board[b.toRow][b.toCol] ? getPieceValue(board[b.toRow][b.toCol]) : 0;
        return bCapture - aCapture; // Prioritize higher captures first
    });

    for (let move of allMoves) {
        const tempBoard = JSON.parse(JSON.stringify(board));
        const tempEnPassant = enPassantTarget ? { ...enPassantTarget } : null;
        const tempCastlingRights = JSON.parse(JSON.stringify(castlingRights));

        makeTemporaryMove(tempBoard, tempCastlingRights, move.fromRow, move.fromCol, move.toRow, move.toCol, move.castling, move.enPassant);

        const score = minimax(tempBoard, depth - 1, -Infinity, Infinity, !maximizingPlayer, tempEnPassant, tempCastlingRights);

        if (maximizingPlayer && score > bestScore) {
            bestScore = score;
            bestMove = move;
        } else if (!maximizingPlayer && score < bestScore) {
            bestScore = score;
            bestMove = move;
        }
    }

    return bestMove;
}

// Minimax algorithm with alpha-beta pruning and enhancements
function minimax(tempBoard, depth, alpha, beta, isMaximizingPlayer, tempEnPassant, tempCastlingRights) {
    if (depth === 0 || isGameOverState(tempBoard, tempCastlingRights)) {
        return evaluateBoard(tempBoard);
    }

    const color = isMaximizingPlayer ? 'white' : 'black';
    const allMoves = getAllLegalMoves(color, tempBoard, tempEnPassant, tempCastlingRights);

    if (allMoves.length === 0) {
        if (isKingInCheck(tempBoard, color)) {
            return isMaximizingPlayer ? -Infinity : Infinity;
        } else {
            return 0; // Stalemate
        }
    }

    // Enhanced move ordering: prioritize captures and checks
    allMoves.sort((a, b) => {
        const aCapture = tempBoard[a.toRow][a.toCol] ? getPieceValue(tempBoard[a.toRow][a.toCol]) : 0;
        const bCapture = tempBoard[b.toRow][b.toCol] ? getPieceValue(tempBoard[b.toRow][b.toCol]) : 0;
        return bCapture - aCapture; // Prioritize higher captures first
    });

    if (isMaximizingPlayer) {
        let maxEval = -Infinity;
        for (let move of allMoves) {
            const newBoard = JSON.parse(JSON.stringify(tempBoard));
            const newEnPassant = tempEnPassant ? { ...tempEnPassant } : null;
            const newCastlingRights = JSON.parse(JSON.stringify(tempCastlingRights));

            makeTemporaryMove(newBoard, newCastlingRights, move.fromRow, move.fromCol, move.toRow, move.toCol, move.castling, move.enPassant);

            const evalScore = minimax(newBoard, depth - 1, alpha, beta, false, newEnPassant, newCastlingRights);
            maxEval = Math.max(maxEval, evalScore);
            alpha = Math.max(alpha, evalScore);
            if (beta <= alpha) break;
        }
        return maxEval;
    } else {
        let minEval = Infinity;
        for (let move of allMoves) {
            const newBoard = JSON.parse(JSON.stringify(tempBoard));
            const newEnPassant = tempEnPassant ? { ...tempEnPassant } : null;
            const newCastlingRights = JSON.parse(JSON.stringify(tempCastlingRights));

            makeTemporaryMove(newBoard, newCastlingRights, move.fromRow, move.fromCol, move.toRow, move.toCol, move.castling, move.enPassant);

            const evalScore = minimax(newBoard, depth - 1, alpha, beta, true, newEnPassant, newCastlingRights);
            minEval = Math.min(minEval, evalScore);
            beta = Math.min(beta, evalScore);
            if (beta <= alpha) break;
        }
        return minEval;
    }
}

// Evaluate the board position with enhanced factors
function evaluateBoard(tempBoard) {
    const pieceValues = {
        'p': -100, 'n': -320, 'b': -330, 'r': -500, 'q': -900, 'k': -20000,
        'P': 100, 'N': 320, 'B': 330, 'R': 500, 'Q': 900, 'K': 20000
    };

    let total = 0;

    for (let i = 0; i < 8; i++) {
        for (let j = 0; j < 8; j++) {
            const piece = tempBoard[i][j];
            if (piece && pieceValues[piece] !== undefined) {
                total += pieceValues[piece] + getPieceSquareValue(piece, i, j);
            }
        }
    }

    // Additional Evaluation Factors
    total += mobility(tempBoard, 'white') * 10;
    total -= mobility(tempBoard, 'black') * 10;
    total += kingSafety(tempBoard, 'white');
    total -= kingSafety(tempBoard, 'black');

    return total;
}

// Get piece-square table value
function getPieceSquareValue(piece, row, col) {
    const upperPiece = piece.toUpperCase();
    const isWhite = piece === upperPiece;
    if (pieceSquareTables[upperPiece]) {
        // For white, use the table as is; for black, mirror vertically
        const index = isWhite ? (row * 8 + col) : ((7 - row) * 8 + col);
        return pieceSquareTables[upperPiece][index];
    }
    return 0;
}

// Mobility: Number of legal moves
function mobility(tempBoard, color) {
    const legalMoves = getAllLegalMoves(color, tempBoard);
    return legalMoves.length;
}

// King Safety: Penalize if king is under threat
function kingSafety(tempBoard, color) {
    if (isKingInCheck(tempBoard, color)) {
        return -50;
    }
    return 0;
}

// Check if the game is over in a given board state
function isGameOverState(tempBoard, tempCastlingRights) {
    // For simplicity, we'll assume the game isn't over unless checkmate or stalemate is detected elsewhere
    return false;
}

// Make a temporary move on a board
function makeTemporaryMove(tempBoard, tempCastlingRights, fromRow, fromCol, toRow, toCol, castling, enPassant) {
    const piece = tempBoard[fromRow][fromCol];
    const targetPiece = tempBoard[toRow][toCol];
    const currentPlayerColor = isPieceColor(piece, 'white') ? 'white' : 'black';

    // Handle special moves: castling, en passant, promotion

    // Promotion
    if (piece.toUpperCase() === 'P' && (toRow === 0 || toRow === 7)) {
        tempBoard[toRow][toCol] = piece.toUpperCase() === 'P' ? 'Q' : 'q'; // Promote to Queen by default
        tempBoard[fromRow][fromCol] = '';
        return;
    }

    // En passant
    if (enPassant) {
        const dir = currentPlayerColor === 'white' ? 1 : -1;
        tempBoard[toRow + dir][toCol] = '';
    }

    // Castling
    if (castling) {
        if (castling === 'kingside') {
            tempBoard[toRow][toCol] = piece;
            tempBoard[fromRow][fromCol] = '';
            tempBoard[toRow][toCol - 1] = tempBoard[toRow][7];
            tempBoard[toRow][7] = '';
        } else if (castling === 'queenside') {
            tempBoard[toRow][toCol] = piece;
            tempBoard[fromRow][fromCol] = '';
            tempBoard[toRow][toCol + 1] = tempBoard[toRow][0];
            tempBoard[toRow][0] = '';
        }
        tempCastlingRights[currentPlayerColor].kingside = false;
        tempCastlingRights[currentPlayerColor].queenside = false;
    } else {
        // Regular move
        tempBoard[toRow][toCol] = piece;
        tempBoard[fromRow][fromCol] = '';

        // Update castling rights
        if (piece.toUpperCase() === 'K') {
            tempCastlingRights[currentPlayerColor].kingside = false;
            tempCastlingRights[currentPlayerColor].queenside = false;
        } else if (piece.toUpperCase() === 'R') {
            if (fromCol === 0) {
                tempCastlingRights[currentPlayerColor].queenside = false;
            } else if (fromCol === 7) {
                tempCastlingRights[currentPlayerColor].kingside = false;
            }
        }
        if (targetPiece && targetPiece.toUpperCase() === 'R') {
            const opponent = opponentColor();
            if (toCol === 0) {
                tempCastlingRights[opponent].queenside = false;
            } else if (toCol === 7) {
                tempCastlingRights[opponent].kingside = false;
            }
        }

        // Update enPassantTarget
        if (piece.toUpperCase() === 'P' && Math.abs(toRow - fromRow) === 2) {
            const dir = currentPlayerColor === 'white' ? -1 : 1;
            enPassantTarget = { row: toRow + dir, col: toCol };
        } else {
            enPassantTarget = null;
        }
    }
}

// Check if a piece belongs to a color
function isPieceColor(piece, color) {
    return color === 'white' ? piece === piece.toUpperCase() : piece === piece.toLowerCase();
}

// Get opponent's color
function opponentColor() {
    return currentPlayer === 'white' ? 'black' : 'white';
}

// Check if the king is in check
function isKingInCheck(tempBoard, color) {
    const kingPosition = findKingPosition(tempBoard, color);
    if (!kingPosition) return false;
    return isSquareAttacked(kingPosition.row, kingPosition.col, color, tempBoard);
}

// Find king position
function findKingPosition(tempBoard, color) {
    const kingPiece = color === 'white' ? 'K' : 'k';
    for (let i = 0; i < 8; i++) {
        for (let j = 0; j < 8; j++) {
            if (tempBoard[i][j] === kingPiece) {
                return { row: i, col: j };
            }
        }
    }
    return null;
}

// Check if a square is attacked
function isSquareAttacked(row, col, color, tempBoard = board) {
    const opponent = color === 'white' ? 'black' : 'white';
    for (let i = 0; i < 8; i++) {
        for (let j = 0; j < 8; j++) {
            const piece = tempBoard[i][j];
            if (piece && isPieceColor(piece, opponent)) {
                const moves = getPseudoLegalMoves(i, j, tempBoard, opponent);
                for (let move of moves) {
                    if (move.row === row && move.col === col) {
                        return true;
                    }
                }
            }
        }
    }
    return false;
}

// Get pseudo-legal moves (without considering king safety)
function getPseudoLegalMoves(row, col, tempBoard, playerColor) {
    const piece = tempBoard[row][col];
    if (!piece || !isPieceColor(piece, playerColor)) return [];

    const moves = [];
    const isWhite = piece === piece.toUpperCase();

    // Define movement directions
    const directions = {
        'P': [[-1, -1], [-1, 1]],
        'p': [[1, -1], [1, 1]],
        'N': [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]],
        'B': [[-1,-1],[-1,1],[1,-1],[1,1]],
        'R': [[-1,0],[1,0],[0,-1],[0,1]],
        'Q': [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]],
        'K': [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]]
    };

    const upperPiece = piece.toUpperCase();

    if (upperPiece === 'P') {
        // Pawn attacks
        const dir = isWhite ? -1 : 1;
        for (let dc of [-1, 1]) {
            const newRow = row + dir;
            const newCol = col + dc;
            if (isOnBoard(newRow, newCol)) {
                moves.push({ row: newRow, col: newCol });
            }
        }
    } else {
        // Other pieces
        const pieceDirections = directions[upperPiece];
        for (let [dr, dc] of pieceDirections) {
            let newRow = row + dr;
            let newCol = col + dc;
            while (isOnBoard(newRow, newCol)) {
                const targetPiece = tempBoard[newRow][newCol];
                moves.push({ row: newRow, col: newCol });
                if (targetPiece) break;
                if (upperPiece === 'N' || upperPiece === 'K') break;
                newRow += dr;
                newCol += dc;
            }
        }
    }

    return moves;
}

// Highlight king in check
function highlightKing(color) {
    const kingPosition = findKingPosition(board, color);
    if (kingPosition) {
        highlightSquare(kingPosition.row, kingPosition.col, 'check');
    }
}

// Check if castling is possible
function canCastle(side, tempBoard = board, tempCastlingRights = castlingRights) {
    const rights = tempCastlingRights[currentPlayer];
    if (!rights[side]) return false;
    return true;
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

// Update difficulty level
levelSelect.addEventListener('change', () => {
    difficultyLevel = parseInt(levelSelect.value);
});

// New game button
newGameBtn.addEventListener('click', () => {
    initializeGame();
});

// Close promotion modal when clicking outside
window.addEventListener('click', (e) => {
    if (e.target === promotionModal) {
        promotionModal.style.display = 'none';
    }
});

// Start the game
initializeGame();

/* ======================== AI Enhancements ======================== */

// Get piece value for ordering moves
function getPieceValue(piece) {
    const pieceValues = {
        'p': 100, 'n': 320, 'b': 330, 'r': 500, 'q': 900, 'k': 20000,
        'P': 100, 'N': 320, 'B': 330, 'R': 500, 'Q': 900, 'K': 20000
    };
    return pieceValues[piece] || 0;
}

/* ======================== End of AI Enhancements ======================== */
