// script.js

// ============================
// Global Variables and Constants
// ============================

const boardElement = document.getElementById('board');
const historyList = document.getElementById('history-list');
let playerColorSpan = document.getElementById('player-color');
const currentPlayerDiv = document.getElementById('current-player');
const timeSpan = document.getElementById('time');
const levelSelect = document.getElementById('level-select');
const computerBtn = document.getElementById('computer-btn');
const twoPlayerBtn = document.getElementById('two-player-btn');
const newGameBtn = document.getElementById('new-game-btn');
const promotionModal = document.getElementById('promotion-modal');
const promotionOptions = document.getElementById('promotion-options');
const gameOverModal = document.getElementById('game-over-modal');
const gameOverTitle = document.getElementById('game-over-title');
const gameOverMessage = document.getElementById('game-over-message');
const playAgainBtn = document.getElementById('play-again-btn');
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
let castlingRights = {
    white: { kingside: true, queenside: true },
    black: { kingside: true, queenside: true }
};
let enPassantTarget = null;
let halfMoveClock = 0;
let fullMoveNumber = 1;
let lastMove = null;
let gameOver = false;

// Drag & Drop State
let isDragging = false;
let draggedPiece = null;

// ============================
// Game Initialization
// ============================

function initGame() {
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
    playerColorSpan.textContent = "White's Turn";
    currentPlayerDiv.classList.remove('check');
    elapsedTime = 0;
    fullMoveNumber = 1;
    halfMoveClock = 0;
    lastMove = null;
    gameOver = false;
    selectedPiece = null;
    gameOverModal.style.display = 'none';
    
    clearInterval(timerInterval);
    timerInterval = setInterval(updateTimer, 1000);
    
    castlingRights = {
        white: { kingside: true, queenside: true },
        black: { kingside: true, queenside: true }
    };
    enPassantTarget = null;
    
    renderBoard();
}

// ============================
// Rendering the Board
// ============================

function renderBoard() {
    boardElement.innerHTML = '';
    boardElement.style.pointerEvents = 'auto';
    boardElement.style.opacity = '1';

    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const square = document.createElement('div');
            square.classList.add('square');
            square.dataset.row = row;
            square.dataset.col = col;

            if ((row + col) % 2 === 0) {
                square.classList.add('light');
            } else {
                square.classList.add('dark');
            }

            const piece = board[row][col];
            if (piece !== '') {
                const pieceElement = document.createElement('div');
                pieceElement.classList.add('piece');
                pieceElement.innerHTML = getPieceSVG(piece);
                pieceElement.dataset.piece = piece;
                pieceElement.dataset.row = row;
                pieceElement.dataset.col = col;
                
                pieceElement.addEventListener('pointerdown', onPiecePointerDown);
                pieceElement.addEventListener('click', onPieceClick);
                
                square.appendChild(pieceElement);
            }

            if (lastMove && 
                ((lastMove.fromRow === row && lastMove.fromCol === col) ||
                 (lastMove.toRow === row && lastMove.toCol === col))) {
                square.classList.add('last-move');
            }

            boardElement.appendChild(square);
        }
    }
}

// ============================
// Helper Functions
// ============================

function getPieceSVG(piece) {
    // Map piece notation to SVG sprite IDs
    const svgIds = {
        'P': 'wP', 'R': 'wR', 'N': 'wN', 'B': 'wB', 'Q': 'wQ', 'K': 'wK',
        'p': 'bP', 'r': 'bR', 'n': 'bN', 'b': 'bB', 'q': 'bQ', 'k': 'bK'
    };
    const id = svgIds[piece];
    if (!id) return '';
    return `<svg viewBox="0 0 45 45"><use href="#${id}"/></svg>`;
}

function getPieceSymbol(piece) {
    // Text symbols for algebraic notation in history
    const symbols = {
        'P': '', 'R': 'R', 'N': 'N', 'B': 'B', 'Q': 'Q', 'K': 'K',
        'p': '', 'r': 'R', 'n': 'N', 'b': 'B', 'q': 'Q', 'k': 'K'
    };
    return symbols[piece] || '';
}

function isUpperCase(char) {
    return char === char.toUpperCase();
}

function getPieceDirections(pieceType) {
    const directions = [];
    if (pieceType === 'N') directions.push({ type: 'single', vectors: [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]] });
    if (pieceType === 'B') directions.push({ type: 'multiple', vectors: [[-1, -1], [-1, 1], [1, -1], [1, 1]] });
    if (pieceType === 'R') directions.push({ type: 'multiple', vectors: [[-1, 0], [1, 0], [0, -1], [0, 1]] });
    if (pieceType === 'Q') directions.push({ type: 'multiple', vectors: [[-1, -1], [-1, 1], [1, -1], [1, 1], [-1, 0], [1, 0], [0, -1], [0, 1]] });
    if (pieceType === 'K') directions.push({ type: 'single', vectors: [[-1, -1], [-1, 1], [1, -1], [1, 1], [-1, 0], [1, 0], [0, -1], [0, 1]] });
    return directions;
}

function isInBounds(row, col) {
    return row >= 0 && row < 8 && col >= 0 && col < 8;
}

// ============================
// Drag & Drop Handling
// ============================

function onPiecePointerDown(e) {
    if (gameOver) return;
    if (gameMode === 'one-player' && currentPlayer === 'black') return;

    const pieceElement = e.currentTarget;
    const row = parseInt(pieceElement.dataset.row);
    const col = parseInt(pieceElement.dataset.col);
    const piece = board[row][col];
    const pieceColor = isUpperCase(piece) ? 'white' : 'black';

    if (pieceColor !== currentPlayer) return;

    e.preventDefault();
    isDragging = true;
    draggedPiece = pieceElement;

    pieceElement.classList.add('dragging');
    pieceElement.style.left = e.clientX + 'px';
    pieceElement.style.top = e.clientY + 'px';

    selectPiece(row, col, piece);

    document.addEventListener('pointermove', onPointerMove);
    document.addEventListener('pointerup', onPointerUp);
    pieceElement.setPointerCapture(e.pointerId);
}

function onPointerMove(e) {
    if (!isDragging || !draggedPiece) return;
    e.preventDefault();
    draggedPiece.style.left = e.clientX + 'px';
    draggedPiece.style.top = e.clientY + 'px';
}

function onPointerUp(e) {
    if (!isDragging || !draggedPiece) return;
    
    const pieceElement = draggedPiece;
    pieceElement.classList.remove('dragging');
    pieceElement.style.removeProperty('left');
    pieceElement.style.removeProperty('top');
    
    isDragging = false;
    draggedPiece = null;
    
    document.removeEventListener('pointermove', onPointerMove);
    document.removeEventListener('pointerup', onPointerUp);

    const targetElement = document.elementFromPoint(e.clientX, e.clientY);
    const square = targetElement ? targetElement.closest('.square') : null;
    
    if (square) {
        const toRow = parseInt(square.dataset.row);
        const toCol = parseInt(square.dataset.col);
        const fromRow = parseInt(pieceElement.dataset.row);
        const fromCol = parseInt(pieceElement.dataset.col);

        if (toRow !== fromRow || toCol !== fromCol) {
            const validMoves = getValidMoves(fromRow, fromCol, board[fromRow][fromCol]);
            const move = validMoves.find(m => m.toRow === toRow && m.toCol === toCol);
             
            if (move) {
                makeMove(move);
                return;
            }
        }
    }
    
    deselectPiece();
    renderBoard();
}

// ============================
// Click Handling
// ============================

function onPieceClick(e) {
    if (isDragging) return;
    e.stopPropagation();
    
    if (gameOver) return;
    if (gameMode === 'one-player' && currentPlayer === 'black') return;
    
    const pieceElement = e.currentTarget;
    const row = parseInt(pieceElement.dataset.row);
    const col = parseInt(pieceElement.dataset.col);
    const piece = board[row][col];
    const pieceColor = isUpperCase(piece) ? 'white' : 'black';

    if (selectedPiece && pieceColor !== currentPlayer) {
        const validMoves = getValidMoves(selectedPiece.row, selectedPiece.col, selectedPiece.piece);
        const captureMove = validMoves.find(m => m.toRow === row && m.toCol === col && m.capture);
        if (captureMove) {
            makeMove(captureMove);
            return;
        }
    }

    if (pieceColor !== currentPlayer) return;

    if (selectedPiece && selectedPiece.row === row && selectedPiece.col === col) {
        deselectPiece();
        renderBoard();
        return;
    }

    selectPiece(row, col, piece);
}

function handleSquareClick(e) {
    if (gameOver) return;
    if (gameMode === 'one-player' && currentPlayer === 'black') return;

    const square = e.target.closest('.square');
    if (!square) return;
    if (e.target.closest('.piece')) return;
    if (!selectedPiece) return;

    const toRow = parseInt(square.dataset.row);
    const toCol = parseInt(square.dataset.col);

    const validMoves = getValidMoves(selectedPiece.row, selectedPiece.col, selectedPiece.piece);
    const move = validMoves.find(m => m.toRow === toRow && m.toCol === toCol);

    if (move) {
        makeMove(move);
    } else {
        deselectPiece();
        renderBoard();
    }
}

boardElement.addEventListener('click', handleSquareClick);

function selectPiece(row, col, piece) {
    deselectPiece();
    selectedPiece = { row, col, piece };
    highlightSquare(row, col, 'selected');

    const moves = getValidMoves(row, col, piece);
    moves.forEach(move => {
        const target = board[move.toRow][move.toCol];
        if (target !== '' || (move.special === 'en-passant')) {
            highlightSquare(move.toRow, move.toCol, 'highlight');
            highlightSquare(move.toRow, move.toCol, 'capture');
        } else {
            highlightSquare(move.toRow, move.toCol, 'highlight');
        }
    });
}

function deselectPiece() {
    removeHighlights();
    selectedPiece = null;
}

function highlightSquare(row, col, className) {
    const index = row * 8 + col;
    const square = boardElement.children[index];
    if (square) square.classList.add(className);
}

function removeHighlights() {
    const squares = boardElement.querySelectorAll('.square');
    squares.forEach(square => {
        square.classList.remove('selected', 'highlight', 'capture');
    });
}

// ============================
// Move Validation
// ============================

function getValidMoves(row, col, piece) {
    const moves = [];
    const pieceType = piece.toUpperCase();
    const isWhite = isUpperCase(piece);
    const directions = getPieceDirections(pieceType);

    directions.forEach(direction => {
        const { type, vectors } = direction;
        if (type === 'single') {
            vectors.forEach(vector => {
                const newRow = row + vector[0];
                const newCol = col + vector[1];
                if (isInBounds(newRow, newCol)) {
                    const target = board[newRow][newCol];
                    if (target === '' || isUpperCase(target) !== isWhite) {
                        moves.push({ fromRow: row, fromCol: col, toRow: newRow, toCol: newCol, capture: target !== '', special: null });
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
                        moves.push({ fromRow: row, fromCol: col, toRow: newRow, toCol: newCol, capture: false, special: null });
                    } else {
                        if (isUpperCase(target) !== isWhite) {
                            moves.push({ fromRow: row, fromCol: col, toRow: newRow, toCol: newCol, capture: true, special: null });
                        }
                        break;
                    }
                    newRow += vector[0];
                    newCol += vector[1];
                }
            });
        }
    });

    if (pieceType === 'P') {
        const dir = isWhite ? -1 : 1;
        const startRow = isWhite ? 6 : 1;
        const oneForward = row + dir;
        if (isInBounds(oneForward, col) && board[oneForward][col] === '') {
            moves.push({ fromRow: row, fromCol: col, toRow: oneForward, toCol: col, capture: false, special: null });
            const twoForward = row + 2 * dir;
            if (row === startRow && board[twoForward][col] === '') {
                moves.push({ fromRow: row, fromCol: col, toRow: twoForward, toCol: col, capture: false, special: 'double-pawn' });
            }
        }
        [[dir, -1], [dir, 1]].forEach(offset => {
            const captureRow = row + offset[0];
            const captureCol = col + offset[1];
            if (isInBounds(captureRow, captureCol)) {
                const target = board[captureRow][captureCol];
                if (target !== '' && isUpperCase(target) !== isWhite) {
                    moves.push({ fromRow: row, fromCol: col, toRow: captureRow, toCol: captureCol, capture: true, special: null });
                }
                if (enPassantTarget && captureRow === enPassantTarget.row && captureCol === enPassantTarget.col) {
                    moves.push({ fromRow: row, fromCol: col, toRow: captureRow, toCol: captureCol, capture: true, special: 'en-passant' });
                }
            }
        });
    }

    if (pieceType === 'K') {
        const player = isWhite ? 'white' : 'black';
        if (castlingRights[player].kingside) {
            const r = isWhite ? 7 : 0;
            if (board[r][5] === '' && board[r][6] === '') {
                if (!isSquareUnderAttack(r, 4, isWhite) && !isSquareUnderAttack(r, 5, isWhite) && !isSquareUnderAttack(r, 6, isWhite)) {
                    moves.push({ fromRow: row, fromCol: 4, toRow: r, toCol: 6, capture: false, special: 'castling-kingside' });
                }
            }
        }
        if (castlingRights[player].queenside) {
            const r = isWhite ? 7 : 0;
            if (board[r][1] === '' && board[r][2] === '' && board[r][3] === '') {
                if (!isSquareUnderAttack(r, 4, isWhite) && !isSquareUnderAttack(r, 3, isWhite) && !isSquareUnderAttack(r, 2, isWhite)) {
                    moves.push({ fromRow: row, fromCol: 4, toRow: r, toCol: 2, capture: false, special: 'castling-queenside' });
                }
            }
        }
    }

    return moves.filter(move => !wouldCauseCheck(move, isWhite ? 'white' : 'black'));
}

function isSquareUnderAttack(row, col, isWhite) {
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const piece = board[r][c];
            if (piece === '' || isUpperCase(piece) === isWhite) continue;
            if (canPieceAttack(r, c, piece, row, col, board)) return true;
        }
    }
    return false;
}

function canPieceAttack(fromRow, fromCol, piece, targetRow, targetCol, theBoard) {
    const type = piece.toUpperCase();
    const isWhite = isUpperCase(piece);
    const dr = targetRow - fromRow;
    const dc = targetCol - fromCol;

    if (type === 'N') {
        return (Math.abs(dr) === 2 && Math.abs(dc) === 1) || (Math.abs(dr) === 1 && Math.abs(dc) === 2);
    }
    if (type === 'P') {
        const dir = isWhite ? -1 : 1;
        return dr === dir && Math.abs(dc) === 1;
    }
    if (type === 'K') {
        return Math.abs(dr) <= 1 && Math.abs(dc) <= 1 && !(dr === 0 && dc === 0);
    }
    if (type === 'B' || type === 'R' || type === 'Q') {
        const diagonal = Math.abs(dr) === Math.abs(dc) && dr !== 0;
        const straight = (dr === 0 || dc === 0) && (dr !== 0 || dc !== 0);
        
        if (type === 'B' && !diagonal) return false;
        if (type === 'R' && !straight) return false;
        if (type === 'Q' && !diagonal && !straight) return false;

        const stepR = dr === 0 ? 0 : dr > 0 ? 1 : -1;
        const stepC = dc === 0 ? 0 : dc > 0 ? 1 : -1;
        let r = fromRow + stepR;
        let c = fromCol + stepC;
        while (r !== targetRow || c !== targetCol) {
            if (theBoard[r][c] !== '') return false;
            r += stepR;
            c += stepC;
        }
        return true;
    }
    return false;
}

function wouldCauseCheck(move, player) {
    const tempBoard = board.map(row => row.slice());
    const piece = tempBoard[move.fromRow][move.fromCol];
    tempBoard[move.toRow][move.toCol] = piece;
    tempBoard[move.fromRow][move.fromCol] = '';

    if (move.special === 'en-passant') {
        const direction = player === 'white' ? 1 : -1;
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

    let kingPos = null;
    const kingChar = player === 'white' ? 'K' : 'k';
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            if (tempBoard[r][c] === kingChar) {
                kingPos = { row: r, col: c };
                break;
            }
        }
        if (kingPos) break;
    }
    if (!kingPos) return true;

    const isWhite = player === 'white';
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const enemyPiece = tempBoard[r][c];
            if (enemyPiece === '' || isUpperCase(enemyPiece) === isWhite) continue;
            if (canPieceAttack(r, c, enemyPiece, kingPos.row, kingPos.col, tempBoard)) return true;
        }
    }
    return false;
}

// ============================
// Move Execution
// ============================

function makeMove(move) {
    const piece = board[move.fromRow][move.fromCol];
    const pieceType = piece.toUpperCase();
    const isWhite = isUpperCase(piece);
    let capturedPiece = board[move.toRow][move.toCol];

    const isPromotion = pieceType === 'P' && (
        (isWhite && move.toRow === 0) || 
        (!isWhite && move.toRow === 7)
    );

    if (isPromotion && !move.promotion) {
        if (currentPlayer === 'black' && gameMode === 'one-player') {
            move.promotion = 'q';
            move.special = 'promotion';
        } else {
            promptPromotion(move);
            return;
        }
    }

    if (move.capture || move.special === 'en-passant') {
        captureSound.currentTime = 0;
        captureSound.play().catch(() => {});
    } else {
        moveSound.currentTime = 0;
        moveSound.play().catch(() => {});
    }

    if (pieceType === 'P' || capturedPiece !== '') {
        halfMoveClock = 0;
    } else {
        halfMoveClock++;
    }

    board[move.toRow][move.toCol] = piece;
    board[move.fromRow][move.fromCol] = '';

    if (move.promotion) {
        const promotedPiece = isWhite ? move.promotion.toUpperCase() : move.promotion.toLowerCase();
        board[move.toRow][move.toCol] = promotedPiece;
    }

    if (move.special === 'double-pawn') {
        const direction = isWhite ? -1 : 1;
        enPassantTarget = { row: move.toRow - direction, col: move.toCol };
    } else {
        enPassantTarget = null;
    }

    if (move.special === 'en-passant') {
        const direction = isWhite ? 1 : -1;
        capturedPiece = board[move.toRow + direction][move.toCol];
        board[move.toRow + direction][move.toCol] = '';
    }

    if (move.special === 'castling-kingside') {
        const row = move.fromRow;
        board[row][5] = board[row][7];
        board[row][7] = '';
    }

    if (move.special === 'castling-queenside') {
        const row = move.fromRow;
        board[row][3] = board[row][0];
        board[row][0] = '';
    }

    updateCastlingRights(move, piece, capturedPiece);
    lastMove = move;

    const moveNotation = generateMoveNotation(move);
    moveHistory.push(moveNotation);
    const li = document.createElement('li');
    li.textContent = moveNotation;
    historyList.appendChild(li);
    historyList.scrollTop = historyList.scrollHeight;

    deselectPiece();
    switchPlayer();
    renderBoard();

    if (checkGameStatus()) return;

    if (currentPlayer === 'white') fullMoveNumber++;

    if (gameMode === 'one-player' && currentPlayer === 'black' && !gameOver) {
        boardElement.style.pointerEvents = 'none';
        boardElement.style.opacity = '0.7';
        playerColorSpan.textContent = '🤔 Thinking...';
        
        setTimeout(() => {
            computerMove();
        }, 300);
    }
}

function updateCastlingRights(move, piece, capturedPiece) {
    const player = isUpperCase(piece) ? 'white' : 'black';
    if (piece.toUpperCase() === 'K') {
        castlingRights[player].kingside = false;
        castlingRights[player].queenside = false;
    }
    if (piece.toUpperCase() === 'R') {
        if (move.fromRow === (player === 'white' ? 7 : 0)) {
            if (move.fromCol === 0) castlingRights[player].queenside = false;
            if (move.fromCol === 7) castlingRights[player].kingside = false;
        }
    }
    if (capturedPiece && capturedPiece.toUpperCase() === 'R') {
        const capturedPlayer = isUpperCase(capturedPiece) ? 'white' : 'black';
        if (move.toRow === (capturedPlayer === 'white' ? 7 : 0)) {
            if (move.toCol === 0) castlingRights[capturedPlayer].queenside = false;
            if (move.toCol === 7) castlingRights[capturedPlayer].kingside = false;
        }
    }
}

function generateMoveNotation(move) {
    const piece = board[move.toRow][move.toCol];
    const pieceType = piece.toUpperCase();
    const isCapture = move.capture || move.special === 'en-passant';
    let notation = '';

    if (move.special === 'castling-kingside') return 'O-O';
    if (move.special === 'castling-queenside') return 'O-O-O';

    if (pieceType !== 'P') notation += pieceType;
    if (isCapture) {
        if (pieceType === 'P') notation += String.fromCharCode(97 + move.fromCol);
        notation += 'x';
    }
    notation += String.fromCharCode(97 + move.toCol) + (8 - move.toRow);
    if (move.special === 'promotion' || move.promotion) notation += '=' + (move.promotion || 'Q').toUpperCase();

    return notation;
}

function promptPromotion(move) {
    promotionModal.style.display = 'flex';
    promotionOptions.innerHTML = '';
    const pieces = ['Q', 'R', 'B', 'N'];
    pieces.forEach(p => {
        const btn = document.createElement('div');
        btn.classList.add('promotion-piece');
        const isWhite = currentPlayer === 'white';
        btn.innerHTML = isWhite ? getPieceSVG(p) : getPieceSVG(p.toLowerCase());
        btn.addEventListener('click', () => {
            move.promotion = p;
            move.special = 'promotion';
            promotionModal.style.display = 'none';
            makeMove(move);
        });
        promotionOptions.appendChild(btn);
    });
}

promotionModal.addEventListener('click', function(e) {
    if (e.target === promotionModal) {
        promotionModal.style.display = 'none';
        deselectPiece();
        renderBoard();
    }
});

function switchPlayer() {
    currentPlayer = currentPlayer === 'white' ? 'black' : 'white';
    playerColorSpan.textContent = currentPlayer === 'white' ? "White's Turn" : "Black's Turn";
    currentPlayerDiv.classList.remove('check');
}

// ============================
// Game Status
// ============================

function checkGameStatus() {
    if (isCheckmate(currentPlayer)) {
        endGame('checkmate', currentPlayer === 'white' ? 'black' : 'white');
        return true;
    }
    if (isStalemate(currentPlayer)) {
        endGame('stalemate', null);
        return true;
    }
    if (halfMoveClock >= 100) {
        endGame('fifty-move', null);
        return true;
    }
    if (isInsufficientMaterial()) {
        endGame('insufficient', null);
        return true;
    }
    if (isInCheck(currentPlayer)) {
        currentPlayerDiv.classList.add('check');
        checkSound.currentTime = 0;
        checkSound.play().catch(() => {});
    } else {
        currentPlayerDiv.classList.remove('check');
    }
    return false;
}

function isInCheck(player) {
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

    const isWhite = player === 'white';
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const enemyPiece = board[r][c];
            if (enemyPiece === '' || isUpperCase(enemyPiece) === isWhite) continue;
            if (canPieceAttack(r, c, enemyPiece, kingPos.row, kingPos.col, board)) return true;
        }
    }
    return false;
}

function isCheckmate(player) {
    if (!isInCheck(player)) return false;
    return !hasAnyValidMove(player);
}

function isStalemate(player) {
    if (isInCheck(player)) return false;
    return !hasAnyValidMove(player);
}

function hasAnyValidMove(player) {
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const piece = board[r][c];
            if (piece === '') continue;
            const isWhite = isUpperCase(piece);
            if ((player === 'white' && !isWhite) || (player === 'black' && isWhite)) continue;
            const moves = getValidMoves(r, c, piece);
            if (moves.length > 0) return true;
        }
    }
    return false;
}

function isInsufficientMaterial() {
    let pieces = [];
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const piece = board[r][c];
            if (piece !== '') pieces.push(piece.toUpperCase());
        }
    }
    if (pieces.length === 2) return true;
    if (pieces.length === 3) return pieces.includes('N') || pieces.includes('B');
    if (pieces.length === 4) {
        const majors = pieces.filter(p => p === 'P' || p === 'R' || p === 'Q');
        if (majors.length === 0) return true;
    }
    return false;
}

function endGame(result, winner) {
    gameOver = true;
    clearInterval(timerInterval);
    boardElement.style.pointerEvents = 'auto';
    boardElement.style.opacity = '1';
    
    if (result === 'checkmate') {
        gameOverTitle.textContent = '👑 Checkmate!';
        gameOverMessage.textContent = winner === 'white' ? 'White wins the game!' : 'Black wins the game!';
    } else if (result === 'stalemate') {
        gameOverTitle.textContent = '🤝 Stalemate';
        gameOverMessage.textContent = 'The game is a draw.';
    } else if (result === 'fifty-move') {
        gameOverTitle.textContent = '🤝 Draw';
        gameOverMessage.textContent = 'Draw by 50-move rule.';
    } else if (result === 'insufficient') {
        gameOverTitle.textContent = '🤝 Draw';
        gameOverMessage.textContent = 'Insufficient material to checkmate.';
    }
    
    gameOverModal.style.display = 'flex';
}

function updateTimer() {
    elapsedTime++;
    const minutes = String(Math.floor(elapsedTime / 60)).padStart(2, '0');
    const seconds = String(elapsedTime % 60).padStart(2, '0');
    timeSpan.textContent = `${minutes}:${seconds}`;
}

// ============================
// AI (Computer) Logic
// ============================

function computerMove() {
    if (gameOver) return;
    
    const level = parseInt(levelSelect.value);
    let move = null;
    
    const allMoves = getAllMovesForPlayer('black');
    
    if (allMoves.length === 0) {
        boardElement.style.pointerEvents = 'auto';
        boardElement.style.opacity = '1';
        if (isCheckmate('black')) {
            endGame('checkmate', 'white');
        } else if (isStalemate('black')) {
            endGame('stalemate', null);
        }
        return;
    }
    
    if (level === 1) {
        move = allMoves[Math.floor(Math.random() * allMoves.length)];
    } else if (level === 2) {
        const captures = allMoves.filter(m => m.capture);
        move = captures.length > 0 
            ? captures[Math.floor(Math.random() * captures.length)]
            : allMoves[Math.floor(Math.random() * allMoves.length)];
    } else if (level === 3) {
        const captures = allMoves.filter(m => m.capture);
        if (captures.length > 0) {
            captures.sort((a, b) => getPieceValue(board[b.toRow][b.toCol]) - getPieceValue(board[a.toRow][a.toCol]));
            move = captures[0];
        } else {
            allMoves.sort((a, b) => {
                const distA = Math.abs(a.toRow - 3.5) + Math.abs(a.toCol - 3.5);
                const distB = Math.abs(b.toRow - 3.5) + Math.abs(b.toCol - 3.5);
                return distA - distB;
            });
            move = allMoves[0];
        }
    } else {
        const depth = Math.min(level - 1, 4);
        move = minimaxRoot(depth, 'black');
    }
    
    if (move) {
        makeMove(move);
    }
}

function getAllMovesForPlayer(player) {
    const allMoves = [];
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const piece = board[r][c];
            if (piece === '') continue;
            const isWhite = isUpperCase(piece);
            if ((player === 'white' && !isWhite) || (player === 'black' && isWhite)) continue;
            const moves = getValidMoves(r, c, piece);
            allMoves.push(...moves);
        }
    }
    return allMoves;
}

function minimaxRoot(depth, player) {
    const moves = getAllMovesForPlayer(player);
    if (moves.length === 0) return null;
    
    let bestMove = null;
    let bestValue = -Infinity;
    
    moves.sort((a, b) => (b.capture ? 1 : 0) - (a.capture ? 1 : 0));
    
    for (const move of moves) {
        const savedState = saveState();
        applyMoveToBoard(move);
        const value = minimax(depth - 1, -Infinity, Infinity, false);
        restoreState(savedState);
        
        if (value > bestValue) {
            bestValue = value;
            bestMove = move;
        }
    }
    
    return bestMove || moves[0];
}

function minimax(depth, alpha, beta, isMaximizing) {
    if (depth === 0) {
        return evaluateBoard();
    }
    
    const player = isMaximizing ? 'black' : 'white';
    const moves = getAllMovesForPlayer(player);
    
    if (moves.length === 0) {
        if (isInCheck(player)) {
            return isMaximizing ? -100000 + (10 - depth) : 100000 - (10 - depth);
        }
        return 0;
    }
    
    if (isMaximizing) {
        let maxEval = -Infinity;
        for (const move of moves) {
            const savedState = saveState();
            applyMoveToBoard(move);
            const eval_ = minimax(depth - 1, alpha, beta, false);
            restoreState(savedState);
            maxEval = Math.max(maxEval, eval_);
            alpha = Math.max(alpha, eval_);
            if (beta <= alpha) break;
        }
        return maxEval;
    } else {
        let minEval = Infinity;
        for (const move of moves) {
            const savedState = saveState();
            applyMoveToBoard(move);
            const eval_ = minimax(depth - 1, alpha, beta, true);
            restoreState(savedState);
            minEval = Math.min(minEval, eval_);
            beta = Math.min(beta, eval_);
            if (beta <= alpha) break;
        }
        return minEval;
    }
}

function saveState() {
    return {
        board: board.map(row => row.slice()),
        castlingRights: JSON.parse(JSON.stringify(castlingRights)),
        enPassantTarget: enPassantTarget ? { ...enPassantTarget } : null,
        currentPlayer: currentPlayer
    };
}

function restoreState(state) {
    board = state.board;
    castlingRights = state.castlingRights;
    enPassantTarget = state.enPassantTarget;
    currentPlayer = state.currentPlayer;
}

function applyMoveToBoard(move) {
    const piece = board[move.fromRow][move.fromCol];
    const isWhite = isUpperCase(piece);
    
    board[move.toRow][move.toCol] = piece;
    board[move.fromRow][move.fromCol] = '';
    
    if (move.special === 'en-passant') {
        const direction = isWhite ? 1 : -1;
        board[move.toRow + direction][move.toCol] = '';
    } else if (move.special === 'castling-kingside') {
        const row = move.fromRow;
        board[row][5] = board[row][7];
        board[row][7] = '';
    } else if (move.special === 'castling-queenside') {
        const row = move.fromRow;
        board[row][3] = board[row][0];
        board[row][0] = '';
    }
    
    if (piece.toUpperCase() === 'P' && (move.toRow === 0 || move.toRow === 7)) {
        board[move.toRow][move.toCol] = isWhite ? 'Q' : 'q';
    }
    
    if (move.special === 'double-pawn') {
        const direction = isWhite ? -1 : 1;
        enPassantTarget = { row: move.toRow - direction, col: move.toCol };
    } else {
        enPassantTarget = null;
    }
    
    const player = isWhite ? 'white' : 'black';
    if (piece.toUpperCase() === 'K') {
        castlingRights[player].kingside = false;
        castlingRights[player].queenside = false;
    }
    if (piece.toUpperCase() === 'R') {
        if (move.fromRow === (player === 'white' ? 7 : 0)) {
            if (move.fromCol === 0) castlingRights[player].queenside = false;
            if (move.fromCol === 7) castlingRights[player].kingside = false;
        }
    }
    
    currentPlayer = currentPlayer === 'white' ? 'black' : 'white';
}

function evaluateBoard() {
    let score = 0;
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const piece = board[r][c];
            if (piece === '') continue;
            const value = getPieceValue(piece);
            const isWhite = isUpperCase(piece);
            const pieceScore = isWhite ? -value : value;
            
            const centerDistance = Math.abs(3.5 - r) + Math.abs(3.5 - c);
            const positionBonus = (8 - centerDistance) * 0.05;
            
            score += pieceScore + (isWhite ? -positionBonus : positionBonus);
        }
    }
    return score;
}

function getPieceValue(piece) {
    const values = { 'P': 100, 'N': 320, 'B': 330, 'R': 500, 'Q': 900, 'K': 20000,
                     'p': 100, 'n': 320, 'b': 330, 'r': 500, 'q': 900, 'k': 20000 };
    return values[piece] || 0;
}

// ============================
// Controls
// ============================

newGameBtn.addEventListener('click', () => initGame());

computerBtn.addEventListener('click', () => {
    gameMode = 'one-player';
    computerBtn.classList.add('active');
    twoPlayerBtn.classList.remove('active');
    initGame();
});

twoPlayerBtn.addEventListener('click', () => {
    gameMode = 'two-player';
    twoPlayerBtn.classList.add('active');
    computerBtn.classList.remove('active');
    initGame();
});

twoPlayerBtn.classList.add('active');

playAgainBtn.addEventListener('click', () => {
    gameOverModal.style.display = 'none';
    initGame();
});

// ============================
// Start
// ============================

initGame();
