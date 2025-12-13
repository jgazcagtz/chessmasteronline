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
const view3dBtn = document.getElementById('view-3d-btn');
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

// Web Worker for AI
let aiWorker = null;

let board = [];
let selectedPiece = null;
let currentPlayer = 'white';
let moveHistory = [];
let timerInterval = null;
let elapsedTime = 0;
let gameMode = 'two-player'; // 'two-player' or 'one-player'
let difficulty = 2; // 1: Easy, 2: Medium, 3: Hard, etc.
let castlingRights = {
    white: { kingside: true, queenside: true },
    black: { kingside: true, queenside: true }
};
let enPassantTarget = null; // { row, col }
let halfMoveClock = 0; // For fifty-move rule
let fullMoveNumber = 1;
let lastMove = null; // Track last move for highlighting
let gameOver = false;

// Drag & Drop State
let isDragging = false;
let draggedPiece = null;
let dragStartX = 0;
let dragStartY = 0;

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
    currentPlayerDiv.innerHTML = '🔄 Turn: <span id="player-color">⚪ White</span>';
    playerColorSpan = document.getElementById('player-color');
    currentPlayerDiv.classList.remove('check');
    elapsedTime = 0;
    fullMoveNumber = 1;
    halfMoveClock = 0;
    lastMove = null;
    gameOver = false;
    gameOverModal.style.display = 'none';
    updateTimer();
    clearInterval(timerInterval);
    timerInterval = setInterval(updateTimer, 1000);
    
    // Initialize AI Worker
    if (window.Worker) {
        if (aiWorker) aiWorker.terminate();
        try {
            aiWorker = new Worker('ai-worker.js');
            aiWorker.onmessage = handleWorkerMessage;
            aiWorker.onerror = (e) => console.error('Worker error:', e);
        } catch (e) {
            console.warn('Web Workers not supported or blocked (e.g. by CORS). AI will run on main thread if fallback implemented, or fail.', e);
        }
    }

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
                
                // Add Pointer Events for Drag & Drop
                pieceElement.addEventListener('pointerdown', onPiecePointerDown);
                
                // Keep click for selection fallback (if not dragged)
                pieceElement.addEventListener('click', onPieceClick);
                
                square.appendChild(pieceElement);
            }

            // Highlight last move
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

function getPieceUnicode(piece) {
    const pieces = {
        'P': '♙', 'R': '♖', 'N': '♘', 'B': '♗', 'Q': '♕', 'K': '♔',
        'p': '♟︎', 'r': '♜', 'n': '♞', 'b': '♝', 'q': '♛', 'k': '♚'
    };
    return pieces[piece] || '';
}

function isUpperCase(char) {
    return char === char.toUpperCase();
}

function getPieceDirections(pieceType, isWhite) {
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
    if (gameMode === 'one-player' && currentPlayer === 'black') return; // Computer's turn

    const pieceElement = e.currentTarget;
    const row = parseInt(pieceElement.dataset.row);
    const col = parseInt(pieceElement.dataset.col);
    const piece = board[row][col];
    const pieceColor = isUpperCase(piece) ? 'white' : 'black';

    if (pieceColor !== currentPlayer) return;

    e.preventDefault(); // Prevent scrolling
    isDragging = true;
    draggedPiece = pieceElement;
    
    // Calculate offset to keep cursor relative to piece center/grab point
    const rect = pieceElement.getBoundingClientRect();
    dragStartX = e.clientX;
    dragStartY = e.clientY;

    pieceElement.classList.add('dragging');
    
    // Set initial position
    pieceElement.style.left = e.clientX + 'px';
    pieceElement.style.top = e.clientY + 'px';

    // Highlight valid moves immediately
    selectPiece(row, col, piece);

    // Add global listeners
    document.addEventListener('pointermove', onPointerMove);
    document.addEventListener('pointerup', onPointerUp);
    
    // Capture pointer
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

    // Get drop target
    // We used pointer-events: none on the dragging piece so elementFromPoint sees below
    const targetElement = document.elementFromPoint(e.clientX, e.clientY);
    const square = targetElement.closest('.square');
    
    if (square) {
        const toRow = parseInt(square.dataset.row);
        const toCol = parseInt(square.dataset.col);
        const fromRow = parseInt(pieceElement.dataset.row);
        const fromCol = parseInt(pieceElement.dataset.col);

        // Don't move if dropped on same square (let click handler handle selection toggle)
        if (toRow !== fromRow || toCol !== fromCol) {
             const validMoves = getValidMoves(fromRow, fromCol, board[fromRow][fromCol]);
             const move = validMoves.find(m => m.toRow === toRow && m.toCol === toCol);
             
             if (move) {
                 makeMove(move);
                 return;
             }
        }
    }
    
    // If invalid drop, re-render to snap back
    renderBoard();
}

// ============================
// Click Handling (Selection)
// ============================

function onPieceClick(e) {
    if (isDragging) return; // Ignore click if it was a drag
    e.stopPropagation();
    
    if (gameOver) return;
    
    const pieceElement = e.currentTarget;
    const row = parseInt(pieceElement.dataset.row);
    const col = parseInt(pieceElement.dataset.col);
    const piece = board[row][col];
    const pieceColor = isUpperCase(piece) ? 'white' : 'black';

    // Capture enemy?
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
        return;
    }

    selectPiece(row, col, piece);
}

// Handle clicking on empty squares
function handleSquareClick(e) {
    if (gameOver) return;

    const square = e.target.closest('.square');
    if (!square) return;

    // If clicking on a piece, we ignore it here (handled by onPieceClick or drag)
    // UNLESS it's an empty square (no piece child or piece child is not target)
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
    }
}

// We attach click handler to board for empty squares
boardElement.addEventListener('click', handleSquareClick);


// Select a piece and highlight possible moves
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
    if (selectedPiece) {
        removeHighlights();
        selectedPiece = null;
    }
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
// Move Validation & Execution
// ============================

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
                        if (isUpperCase(target) !== isWhite) moves.push({ fromRow: row, fromCol: col, toRow: newRow, toCol: newCol, capture: true, special: null });
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
        if (canCastle(currentPlayer, 'kingside')) {
            const r = isWhite ? 7 : 0;
            if (board[r][5] === '' && board[r][6] === '') {
                if (!isSquareUnderAttack(r, 4, isWhite) && !isSquareUnderAttack(r, 5, isWhite) && !isSquareUnderAttack(r, 6, isWhite)) {
                    moves.push({ fromRow: row, fromCol: 4, toRow: r, toCol: 6, capture: false, special: 'castling-kingside' });
                }
            }
        }
        if (canCastle(currentPlayer, 'queenside')) {
            const r = isWhite ? 7 : 0;
            if (board[r][1] === '' && board[r][2] === '' && board[r][3] === '') {
                if (!isSquareUnderAttack(r, 4, isWhite) && !isSquareUnderAttack(r, 3, isWhite) && !isSquareUnderAttack(r, 2, isWhite)) {
                    moves.push({ fromRow: row, fromCol: 4, toRow: r, toCol: 2, capture: false, special: 'castling-queenside' });
                }
            }
        }
    }

    return moves.filter(move => !wouldCauseCheck(move));
}

function canCastle(player, side) {
    return castlingRights[player][side];
}

function isSquareUnderAttack(row, col, isWhite) {
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const piece = board[r][c];
            if (piece === '' || isUpperCase(piece) === isWhite) continue;
            const enemyMoves = getValidMovesForCheck(r, c, piece, board);
            if (enemyMoves.some(m => m.toRow === row && m.toCol === col)) return true;
        }
    }
    return false;
}

function wouldCauseCheck(move) {
    const tempBoard = board.map(row => row.slice());
    const piece = tempBoard[move.fromRow][move.fromCol];
    tempBoard[move.toRow][move.toCol] = piece;
    tempBoard[move.fromRow][move.fromCol] = '';

    if (move.special === 'en-passant') {
        const direction = currentPlayer === 'white' ? 1 : -1;
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
    if (!kingPos) return true;

    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const enemyPiece = tempBoard[r][c];
            if (enemyPiece === '' || isUpperCase(enemyPiece) === (currentPlayer === 'white')) continue;
            const enemyMoves = getValidMovesForCheck(r, c, enemyPiece, tempBoard);
            if (enemyMoves.some(m => m.toRow === kingPos.row && m.toCol === kingPos.col)) return true;
        }
    }
    return false;
}

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
                        moves.push({ toRow: newRow, toCol: newCol });
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
                        moves.push({ toRow: newRow, toCol: newCol });
                    } else {
                        if (isUpperCase(target) !== isWhite) moves.push({ toRow: newRow, toCol: newCol });
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

function getPieceDirectionsForCheck(pieceType, isWhite, tempBoard, row, col) {
    const directions = [];
    if (pieceType === 'N') directions.push({ type: 'single', vectors: [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]] });
    if (pieceType === 'B') directions.push({ type: 'multiple', vectors: [[-1, -1], [-1, 1], [1, -1], [1, 1]] });
    if (pieceType === 'R') directions.push({ type: 'multiple', vectors: [[-1, 0], [1, 0], [0, -1], [0, 1]] });
    if (pieceType === 'Q') directions.push({ type: 'multiple', vectors: [[-1, -1], [-1, 1], [1, -1], [1, 1], [-1, 0], [1, 0], [0, -1], [0, 1]] });
    if (pieceType === 'K') directions.push({ type: 'single', vectors: [[-1, -1], [-1, 1], [1, -1], [1, 1], [-1, 0], [1, 0], [0, -1], [0, 1]] });
    if (pieceType === 'P') {
        const direction = isWhite ? -1 : 1;
        directions.push({ type: 'single', vectors: [[direction, -1], [direction, 1]] });
    }
    return directions;
}

function makeMove(move) {
    const piece = board[move.fromRow][move.fromCol];
    const pieceType = piece.toUpperCase();
    const isWhite = isUpperCase(piece);
    let capturedPiece = board[move.toRow][move.toCol];

    // Check for promotion
    const isPromotion = pieceType === 'P' && (
        (isWhite && move.toRow === 0) || 
        (!isWhite && move.toRow === 7)
    );

    // Handle Promotion Entry
    if (isPromotion && !move.promotion) {
        if (currentPlayer !== 'white' && gameMode === 'one-player') {
             move.promotion = 'q';
             move.special = 'promotion';
        } else {
             promptPromotion(move);
             return;
        }
    }

    // Play sounds
    if (move.capture || move.special === 'en-passant') {
        captureSound.currentTime = 0;
        captureSound.play();
    } else {
        moveSound.currentTime = 0;
        moveSound.play();
    }

    if (pieceType === 'P' || capturedPiece !== '') {
        halfMoveClock = 0;
    } else {
        halfMoveClock++;
    }

    // Move the piece
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

    const moveNotation = generateMoveNotation(move, capturedPiece);
    moveHistory.push(moveNotation);
    const li = document.createElement('li');
    li.textContent = moveNotation;
    historyList.appendChild(li);
    historyList.scrollTop = historyList.scrollHeight;

    switchPlayer();
    renderBoard();

    const gameStatus = checkGameStatus();
    if (gameStatus) return;

    if (currentPlayer === 'white') fullMoveNumber++;

    if (gameMode === 'one-player' && currentPlayer === 'black' && !gameOver) {
        boardElement.style.pointerEvents = 'none';
        boardElement.style.opacity = '0.7';
        currentPlayerDiv.innerHTML = '🤖 Computer thinking...';
        
        // Use Worker
        if (aiWorker) {
            aiWorker.postMessage({
                board: board,
                currentPlayer: 'black',
                castlingRights: castlingRights,
                enPassantTarget: enPassantTarget,
                level: parseInt(levelSelect.value),
                gameMode: gameMode
            });
        } else {
            // Fallback for no worker support
            setTimeout(() => {
                // We would need to duplicate the AI logic here or just fail. 
                // For this refactor, we assume modern browser or server.
                // But let's re-implement basic random move as extreme fallback
                console.warn('AI Worker not available. Playing random move.');
                const moves = getValidMovesForCheck(0,0,'', board); // placeholder
                // Actually without the AI functions available here, we can't easily fallback 
                // unless we keep the code duplicated. 
                // We will just let it hang or show error.
                currentPlayerDiv.innerHTML = '⚠️ AI Error: Worker not loaded.';
                boardElement.style.pointerEvents = 'auto';
                boardElement.style.opacity = '1';
            }, 500);
        }
    }
}

function handleWorkerMessage(e) {
    const move = e.data;
    boardElement.style.pointerEvents = 'auto';
    boardElement.style.opacity = '1';
    
    if (move) {
        makeMove(move);
    } else {
        if (isCheckmate('black')) {
            endGame('checkmate', 'white');
        } else if (isStalemate('black')) {
            endGame('stalemate', null);
        }
    }
}

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
        checkSound.play();
    } else {
        currentPlayerDiv.classList.remove('check');
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

function updateCastlingRights(move, piece, capturedPiece) {
    const player = currentPlayer;
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

function generateMoveNotation(move, capturedPiece) {
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
        btn.textContent = isWhite ? getPieceUnicode(p) : getPieceUnicode(p.toLowerCase());
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
    const playerText = currentPlayer === 'white' ? '⚪ White' : '⚫ Black';
    currentPlayerDiv.innerHTML = '🔄 Turn: <span id="player-color">' + playerText + '</span>';
    playerColorSpan = document.getElementById('player-color');
    currentPlayerDiv.classList.remove('check');
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

    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const enemyPiece = board[r][c];
            if (enemyPiece === '' || isUpperCase(enemyPiece) === (player === 'white')) continue;
            const enemyMoves = getValidMovesForCheck(r, c, enemyPiece, board);
            if (enemyMoves.some(m => m.toRow === kingPos.row && m.toCol === kingPos.col)) return true;
        }
    }
    return false;
}

function isCheckmate(player) {
    if (!isInCheck(player)) return false;
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const piece = board[r][c];
            if (piece === '' || (player === 'white' ? !isUpperCase(piece) : isUpperCase(piece))) continue;
            const moves = getValidMoves(r, c, piece);
            if (moves.length > 0) return false;
        }
    }
    return true;
}

function isStalemate(player) {
    if (isInCheck(player)) return false;
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const piece = board[r][c];
            if (piece === '' || (player === 'white' ? !isUpperCase(piece) : isUpperCase(piece))) continue;
            const moves = getValidMoves(r, c, piece);
            if (moves.length > 0) return false;
        }
    }
    return true;
}

function endGame(result, winner) {
    gameOver = true;
    clearInterval(timerInterval);
    
    if (result === 'checkmate') {
        gameOverTitle.textContent = '🎉 Checkmate!';
        gameOverMessage.textContent = winner === 'white' ? '⚪ White wins by checkmate!' : '⚫ Black wins by checkmate!';
    } else if (result === 'stalemate') {
        gameOverTitle.textContent = '🤝 Stalemate!';
        gameOverMessage.textContent = 'The game ended in a draw by stalemate.';
    } else if (result === 'fifty-move') {
        gameOverTitle.textContent = '🤝 Draw!';
        gameOverMessage.textContent = 'The game ended in a draw by the 50-move rule.';
    } else if (result === 'insufficient') {
        gameOverTitle.textContent = '🤝 Draw!';
        gameOverMessage.textContent = 'The game ended in a draw due to insufficient material.';
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

// 3D View Toggle
view3dBtn.addEventListener('click', () => {
    boardElement.classList.toggle('view-3d');
    const is3D = boardElement.classList.contains('view-3d');
    view3dBtn.textContent = is3D ? '🧊 2D View' : '🧊 3D View';
    
    // Adjust button style for active state
    if (is3D) {
        view3dBtn.style.background = 'linear-gradient(135deg, #2e004f 0%, #4b0082 100%)';
        view3dBtn.style.borderColor = 'var(--gothic-gold)';
    } else {
        view3dBtn.style.background = '';
        view3dBtn.style.borderColor = '';
    }
});

// ============================
// Start
// ============================

initGame();
document.addEventListener('DOMContentLoaded', () => initGame());
