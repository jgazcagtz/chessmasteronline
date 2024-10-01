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

    currentPlayerElement.textContent = 'Blanco';
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
    if (isGameOver || (currentPlayer !== 'white' && !selectedPiece)) return;

    const row = parseInt(e.currentTarget.dataset.row);
    const col = parseInt(e.currentTarget.dataset.col);
    const piece = board[row][col];

    if (selectedPiece) {
        const legalMoves = getLegalMoves(selectedPiece.row, selectedPiece.col);
        const moveIsLegal = legalMoves.some(move => move.row === row && move.col === col);

        if (moveIsLegal) {
            makeMove(selectedPiece.row, selectedPiece.col, row, col);
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
function getLegalMoves(row, col) {
    const piece = board[row][col];
    if (!piece || !isCurrentPlayerPiece(piece)) return [];

    const moves = [];
    const isWhite = piece === piece.toUpperCase();
    const enemyPieces = isWhite ? 'pnbrqk' : 'PNBRQK';

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
        if (isEmptySquare(row + dir, col)) {
            moves.push({ row: row + dir, col: col });
            // Two squares forward from starting position
            if (row === startRow && isEmptySquare(row + 2 * dir, col)) {
                moves.push({ row: row + 2 * dir, col: col });
            }
        }
        // Captures
        for (let dc of [-1, 1]) {
            const newRow = row + dir;
            const newCol = col + dc;
            if (isOnBoard(newRow, newCol)) {
                const targetPiece = board[newRow][newCol];
                if (targetPiece && !isCurrentPlayerPiece(targetPiece)) {
                    moves.push({ row: newRow, col: newCol });
                }
                // En passant
                if (newRow === enPassantTarget?.row && newCol === enPassantTarget?.col) {
                    moves.push({ row: newRow, col: newCol });
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
                const targetPiece = board[newRow][newCol];
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
        if (upperPiece === 'K') {
            if (canCastle('kingside')) {
                if (isEmptySquare(row, col + 1) && isEmptySquare(row, col + 2)) {
                    if (!isSquareAttacked(row, col) && !isSquareAttacked(row, col + 1) && !isSquareAttacked(row, col + 2)) {
                        moves.push({ row: row, col: col + 2, castling: 'kingside' });
                    }
                }
            }
            if (canCastle('queenside')) {
                if (isEmptySquare(row, col - 1) && isEmptySquare(row, col - 2) && isEmptySquare(row, col - 3)) {
                    if (!isSquareAttacked(row, col) && !isSquareAttacked(row, col - 1) && !isSquareAttacked(row, col - 2)) {
                        moves.push({ row: row, col: col - 2, castling: 'queenside' });
                    }
                }
            }
        }
    }

    // Filter out moves that leave king in check
    const legalMoves = [];
    for (let move of moves) {
        const tempBoard = JSON.parse(JSON.stringify(board));
        const tempCastlingRights = JSON.parse(JSON.stringify(castlingRights));
        makeTemporaryMove(tempBoard, tempCastlingRights, row, col, move.row, move.col, move.castling);
        if (!isKingInCheck(tempBoard, currentPlayer)) {
            legalMoves.push(move);
        }
    }

    return legalMoves;
}

// Check if a square is on the board
function isOnBoard(row, col) {
    return row >= 0 && row < 8 && col >= 0 && col < 8;
}

// Check if a square is empty
function isEmptySquare(row, col) {
    return isOnBoard(row, col) && !board[row][col];
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
function makeMove(fromRow, fromCol, toRow, toCol) {
    const piece = board[fromRow][fromCol];
    const targetPiece = board[toRow][toCol];
    const move = { fromRow, fromCol, toRow, toCol, piece, targetPiece };

    // Handle special moves: promotion, en passant, castling

    // Promotion
    if (piece.toUpperCase() === 'P' && (toRow === 0 || toRow === 7)) {
        showPromotionModal(toRow, toCol, currentPlayer);
        promotionCallback = (promotedPiece) => {
            board[toRow][toCol] = promotedPiece;
            board[fromRow][fromCol] = '';
            afterMove();
        };
        return;
    }

    // En passant
    if (piece.toUpperCase() === 'P' && toRow === enPassantTarget?.row && toCol === enPassantTarget?.col) {
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
    } else {
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

        // Update en passant target
        enPassantTarget = null;
        if (piece.toUpperCase() === 'P' && Math.abs(toRow - fromRow) === 2) {
            const dir = currentPlayer === 'white' ? -1 : 1;
            enPassantTarget = { row: toRow + dir, col: toCol };
        }

        if (targetPiece) {
            captureSound.play();
        } else {
            moveSound.play();
        }
    }

    afterMove();
}

// Actions after a move
function afterMove() {
    // Switch current player
    currentPlayer = opponentColor();
    currentPlayerElement.textContent = currentPlayer === 'white' ? 'Blanco' : 'Negro';

    // Update move history
    updateMoveHistory();

    // Redraw the board
    drawBoard();

    // Check for check, checkmate, or stalemate
    if (isKingInCheck(board, currentPlayer)) {
        if (getAllLegalMoves(currentPlayer).length === 0) {
            isGameOver = true;
            checkSound.play();
            alert(`¡Jaque mate! Gana el jugador ${currentPlayer === 'white' ? 'Negro' : 'Blanco'}`);
            clearInterval(gameInterval);
            return;
        } else {
            checkSound.play();
            highlightKing(currentPlayer);
        }
    } else {
        if (getAllLegalMoves(currentPlayer).length === 0) {
            isGameOver = true;
            alert('¡Empate por ahogado!');
            clearInterval(gameInterval);
            return;
        }
    }

    // If it's the computer's turn, make the computer move
    if (currentPlayer === 'black' && !isGameOver) {
        setTimeout(computerMove, 500);
    }
}

// Update move history (simplified)
function updateMoveHistory() {
    // Implement your move notation logic here
}

// Show promotion modal
function showPromotionModal(row, col, color) {
    promotionModal.style.display = 'block';
    promotionOptions.innerHTML = '';

    promotionPieces[color].forEach(piece => {
        const pieceElem = document.createElement('span');
        pieceElem.classList.add('promotion-piece');
        pieceElem.innerHTML = pieces[piece];
        pieceElem.addEventListener('click', () => {
            promotionModal.style.display = 'none';
            if (promotionCallback) promotionCallback(piece);
        });
        promotionOptions.appendChild(pieceElem);
    });
}

// Computer move (random move for simplicity)
function computerMove() {
    const allMoves = getAllLegalMoves(currentPlayer);
    if (allMoves.length === 0) {
        isGameOver = true;
        alert('¡Jaque mate! Gana el jugador Blanco');
        clearInterval(gameInterval);
        return;
    }

    const move = allMoves[Math.floor(Math.random() * allMoves.length)];
    makeMove(move.fromRow, move.fromCol, move.toRow, move.toCol);
}

// Get all legal moves for a color
function getAllLegalMoves(color) {
    const moves = [];
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const piece = board[row][col];
            if (piece && isPieceColor(piece, color)) {
                const legalMoves = getLegalMoves(row, col);
                for (let move of legalMoves) {
                    moves.push({ fromRow: row, fromCol: col, toRow: move.row, toCol: move.col });
                }
            }
        }
    }
    return moves;
}

// Check if a piece belongs to a color
function isPieceColor(piece, color) {
    return color === 'white' ? piece === piece.toUpperCase() : piece === piece.toLowerCase();
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
                const moves = getPseudoLegalMoves(i, j, tempBoard);
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

// Get pseudo-legal moves (without considering checks)
function getPseudoLegalMoves(row, col, tempBoard) {
    const piece = tempBoard[row][col];
    if (!piece) return [];

    const moves = [];
    const isWhite = piece === piece.toUpperCase();
    const upperPiece = piece.toUpperCase();
    const enemyPieces = isWhite ? 'pnbrqk' : 'PNBRQK';

    // Similar logic as getLegalMoves but without king safety checks
    // For the purpose of isSquareAttacked, we only need to consider attack moves
    if (upperPiece === 'P') {
        const dir = isWhite ? -1 : 1;
        for (let dc of [-1, 1]) {
            const newRow = row + dir;
            const newCol = col + dc;
            if (isOnBoard(newRow, newCol)) {
                moves.push({ row: newRow, col: newCol });
            }
        }
    } else {
        const directions = {
            'N': [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]],
            'B': [[-1,-1],[-1,1],[1,-1],[1,1]],
            'R': [[-1,0],[1,0],[0,-1],[0,1]],
            'Q': [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]],
            'K': [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]]
        }[upperPiece];

        for (let [dr, dc] of directions) {
            let newRow = row + dr;
            let newCol = col + dc;
            while (isOnBoard(newRow, newCol)) {
                moves.push({ row: newRow, col: newCol });
                if (tempBoard[newRow][newCol]) break;
                if (upperPiece === 'N' || upperPiece === 'K') break;
                newRow += dr;
                newCol += dc;
            }
        }
    }

    return moves;
}

// Make a temporary move on a board
function makeTemporaryMove(tempBoard, tempCastlingRights, fromRow, fromCol, toRow, toCol, castling) {
    const piece = tempBoard[fromRow][fromCol];
    tempBoard[toRow][toCol] = piece;
    tempBoard[fromRow][fromCol] = '';

    // Handle castling rights
    if (piece.toUpperCase() === 'K') {
        tempCastlingRights[currentPlayer].kingside = false;
        tempCastlingRights[currentPlayer].queenside = false;
        if (castling) {
            // Move the rook as well
            if (castling === 'kingside') {
                tempBoard[toRow][toCol - 1] = tempBoard[toRow][7];
                tempBoard[toRow][7] = '';
            } else if (castling === 'queenside') {
                tempBoard[toRow][toCol + 1] = tempBoard[toRow][0];
                tempBoard[toRow][0] = '';
            }
        }
    }
}

// Check if castling is possible
function canCastle(side) {
    const rights = castlingRights[currentPlayer];
    if (!rights[side]) return false;
    return true;
}

// Get opponent's color
function opponentColor() {
    return currentPlayer === 'white' ? 'black' : 'white';
}

// Highlight king in check
function highlightKing(color) {
    const kingPosition = findKingPosition(board, color);
    if (kingPosition) {
        highlightSquare(kingPosition.row, kingPosition.col, 'check');
    }
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
