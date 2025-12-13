// ai-worker.js

self.onmessage = function(e) {
    const { 
        board, 
        currentPlayer, 
        castlingRights, 
        enPassantTarget, 
        level, 
        gameMode,
        depth
    } = e.data;

    // Reconstruct state
    const gameState = {
        board: board,
        currentPlayer: currentPlayer,
        castlingRights: castlingRights,
        enPassantTarget: enPassantTarget
    };

    let move;
    if (level === 1) {
        move = randomMove(gameState);
    } else if (level === 2) {
        move = basicAI(gameState);
    } else if (level === 3) {
        move = advancedAI(gameState);
    } else {
        const searchDepth = Math.min(level, 5); // Cap depth for performance in worker for now
        move = minimaxAI(gameState, searchDepth);
    }

    self.postMessage(move);
};

// ============================
// AI Logic
// ============================

function randomMove(gameState) {
    const moves = getAllValidMoves(gameState, gameState.currentPlayer);
    if (moves.length === 0) return null;
    return moves[Math.floor(Math.random() * moves.length)];
}

function basicAI(gameState) {
    const moves = getAllValidMoves(gameState, gameState.currentPlayer);
    const captureMoves = moves.filter(m => m.capture);
    
    if (captureMoves.length > 0) {
        return captureMoves[Math.floor(Math.random() * captureMoves.length)];
    } else if (moves.length > 0) {
        return moves[Math.floor(Math.random() * moves.length)];
    }
    return null;
}

function advancedAI(gameState) {
    const moves = getAllValidMoves(gameState, gameState.currentPlayer);
    const captureMoves = moves.filter(m => m.capture);
    const nonCaptureMoves = moves.filter(m => !m.capture);

    if (captureMoves.length > 0) {
        captureMoves.sort((a, b) => {
            const valA = getPieceValue(gameState.board[a.toRow][a.toCol]);
            const valB = getPieceValue(gameState.board[b.toRow][b.toCol]);
            return valB - valA;
        });
        return captureMoves[0];
    }

    if (nonCaptureMoves.length > 0) {
        // Center control
        nonCaptureMoves.sort((a, b) => {
            const center = 3.5;
            const distA = Math.abs(a.toRow - center) + Math.abs(a.toCol - center);
            const distB = Math.abs(b.toRow - center) + Math.abs(b.toCol - center);
            return distA - distB;
        });
        return nonCaptureMoves[0];
    }
    return null;
}

function minimaxAI(gameState, depth) {
    const moves = getAllValidMoves(gameState, gameState.currentPlayer);
    if (moves.length === 0) return null;

    let bestMove = null;
    let bestValue = gameState.currentPlayer === 'black' ? -Infinity : Infinity;
    let alpha = -Infinity;
    let beta = Infinity;

    // Sort moves for better pruning (captures first)
    moves.sort((a, b) => (b.capture ? 1 : 0) - (a.capture ? 1 : 0));

    for (const move of moves) {
        // Clone state
        const nextState = cloneState(gameState);
        applyMove(nextState, move);
        nextState.currentPlayer = gameState.currentPlayer === 'white' ? 'black' : 'white';

        const value = minimax(nextState, depth - 1, alpha, beta, gameState.currentPlayer === 'black'); // false if white to move next (which means current was black)

        if (gameState.currentPlayer === 'black') {
            if (value > bestValue) {
                bestValue = value;
                bestMove = move;
            }
            alpha = Math.max(alpha, bestValue);
        } else {
            if (value < bestValue) {
                bestValue = value;
                bestMove = move;
            }
            beta = Math.min(beta, bestValue);
        }
        if (beta <= alpha) break;
    }

    return bestMove || moves[0];
}

function minimax(gameState, depth, alpha, beta, isMaximizingPlayer) {
    if (depth === 0) {
        return evaluateBoard(gameState.board);
    }

    const moves = getAllValidMoves(gameState, gameState.currentPlayer);

    if (moves.length === 0) {
        if (isInCheck(gameState, gameState.currentPlayer)) {
            return isMaximizingPlayer ? -100000 : 100000;
        }
        return 0;
    }

    if (isMaximizingPlayer) { // Black maximizing
        let maxEval = -Infinity;
        for (const move of moves) {
            const nextState = cloneState(gameState);
            applyMove(nextState, move);
            nextState.currentPlayer = 'white';
            
            const eval = minimax(nextState, depth - 1, alpha, beta, false);
            maxEval = Math.max(maxEval, eval);
            alpha = Math.max(alpha, eval);
            if (beta <= alpha) break;
        }
        return maxEval;
    } else { // White minimizing
        let minEval = Infinity;
        for (const move of moves) {
            const nextState = cloneState(gameState);
            applyMove(nextState, move);
            nextState.currentPlayer = 'black';

            const eval = minimax(nextState, depth - 1, alpha, beta, true);
            minEval = Math.min(minEval, eval);
            beta = Math.min(beta, eval);
            if (beta <= alpha) break;
        }
        return minEval;
    }
}

// ============================
// Helpers
// ============================

function cloneState(state) {
    return {
        board: state.board.map(row => row.slice()),
        currentPlayer: state.currentPlayer,
        castlingRights: JSON.parse(JSON.stringify(state.castlingRights)),
        enPassantTarget: state.enPassantTarget ? { ...state.enPassantTarget } : null
    };
}

function applyMove(state, move) {
    const piece = state.board[move.fromRow][move.fromCol];
    state.board[move.toRow][move.toCol] = piece;
    state.board[move.fromRow][move.fromCol] = '';

    if (move.special === 'en-passant') {
        const direction = state.currentPlayer === 'white' ? 1 : -1;
        state.board[move.toRow + direction][move.toCol] = '';
    } else if (move.special === 'castling-kingside') {
        const row = move.fromRow;
        state.board[row][5] = state.board[row][7];
        state.board[row][7] = '';
    } else if (move.special === 'castling-queenside') {
        const row = move.fromRow;
        state.board[row][3] = state.board[row][0];
        state.board[row][0] = '';
    }

    // Auto promote to Queen
    if (piece.toUpperCase() === 'P' && (move.toRow === 0 || move.toRow === 7)) {
        state.board[move.toRow][move.toCol] = isUpperCase(piece) ? 'Q' : 'q';
    }

    // Update castling rights
    updateCastlingRights(state, move, piece);
}

function updateCastlingRights(state, move, piece) {
    const player = isUpperCase(piece) ? 'white' : 'black';
    if (piece.toUpperCase() === 'K') {
        state.castlingRights[player].kingside = false;
        state.castlingRights[player].queenside = false;
    }
    if (piece.toUpperCase() === 'R') {
        if (move.fromRow === (player === 'white' ? 7 : 0)) {
            if (move.fromCol === 0) state.castlingRights[player].queenside = false;
            if (move.fromCol === 7) state.castlingRights[player].kingside = false;
        }
    }
}

function getAllValidMoves(gameState, player) {
    const allMoves = [];
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const piece = gameState.board[r][c];
            if (piece === '' || (player === 'white' ? !isUpperCase(piece) : isUpperCase(piece))) continue;
            const moves = getValidMoves(gameState, r, c, piece);
            allMoves.push(...moves);
        }
    }
    return allMoves;
}

function getValidMoves(gameState, row, col, piece) {
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
                    const target = gameState.board[newRow][newCol];
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
                    const target = gameState.board[newRow][newCol];
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

    // Pawn Logic
    if (pieceType === 'P') {
        const dir = isWhite ? -1 : 1;
        const startRow = isWhite ? 6 : 1;
        const oneForward = row + dir;
        if (isInBounds(oneForward, col) && gameState.board[oneForward][col] === '') {
            moves.push({ fromRow: row, fromCol: col, toRow: oneForward, toCol: col, capture: false, special: null });
            const twoForward = row + 2 * dir;
            if (row === startRow && gameState.board[twoForward][col] === '') {
                moves.push({ fromRow: row, fromCol: col, toRow: twoForward, toCol: col, capture: false, special: 'double-pawn' });
            }
        }
        [[dir, -1], [dir, 1]].forEach(offset => {
            const captureRow = row + offset[0];
            const captureCol = col + offset[1];
            if (isInBounds(captureRow, captureCol)) {
                const target = gameState.board[captureRow][captureCol];
                if (target !== '' && isUpperCase(target) !== isWhite) {
                    moves.push({ fromRow: row, fromCol: col, toRow: captureRow, toCol: captureCol, capture: true, special: null });
                }
                if (gameState.enPassantTarget && captureRow === gameState.enPassantTarget.row && captureCol === gameState.enPassantTarget.col) {
                    moves.push({ fromRow: row, fromCol: col, toRow: captureRow, toCol: captureCol, capture: true, special: 'en-passant' });
                }
            }
        });
    }

    // Castling Logic (Simplified for worker - we assume validation in detailed check)
    // Note: AI needs full validation to avoid illegal moves
    if (pieceType === 'K') {
       if (gameState.castlingRights[isWhite ? 'white' : 'black'].kingside) {
           const r = isWhite ? 7 : 0;
           if (gameState.board[r][5] === '' && gameState.board[r][6] === '') {
               if (!isSquareUnderAttack(gameState, r, 4, isWhite) && !isSquareUnderAttack(gameState, r, 5, isWhite) && !isSquareUnderAttack(gameState, r, 6, isWhite)) {
                   moves.push({ fromRow: row, fromCol: col, toRow: r, toCol: 6, capture: false, special: 'castling-kingside' });
               }
           }
       }
       if (gameState.castlingRights[isWhite ? 'white' : 'black'].queenside) {
           const r = isWhite ? 7 : 0;
           if (gameState.board[r][1] === '' && gameState.board[r][2] === '' && gameState.board[r][3] === '') {
               if (!isSquareUnderAttack(gameState, r, 4, isWhite) && !isSquareUnderAttack(gameState, r, 3, isWhite) && !isSquareUnderAttack(gameState, r, 2, isWhite)) {
                   moves.push({ fromRow: row, fromCol: col, toRow: r, toCol: 2, capture: false, special: 'castling-queenside' });
               }
           }
       }
    }

    // Filter checks
    return moves.filter(m => !wouldCauseCheck(gameState, m));
}

function wouldCauseCheck(gameState, move) {
    const nextState = cloneState(gameState);
    
    // Manual apply because cloneState handles deep copy but applyMove needs to be atomic here
    const piece = nextState.board[move.fromRow][move.fromCol];
    nextState.board[move.toRow][move.toCol] = piece;
    nextState.board[move.fromRow][move.fromCol] = '';

    if (move.special === 'en-passant') {
        const direction = gameState.currentPlayer === 'white' ? 1 : -1;
        nextState.board[move.toRow + direction][move.toCol] = '';
    } else if (move.special === 'castling-kingside') {
        const row = move.fromRow;
        nextState.board[row][5] = nextState.board[row][7];
        nextState.board[row][7] = '';
    } else if (move.special === 'castling-queenside') {
        const row = move.fromRow;
        nextState.board[row][3] = nextState.board[row][0];
        nextState.board[row][0] = '';
    }
    
    // We are checking if the player who MOVED is now in check
    return isInCheck(nextState, gameState.currentPlayer);
}

function isInCheck(gameState, player) {
    let kingPos = null;
    const kingChar = player === 'white' ? 'K' : 'k';
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            if (gameState.board[r][c] === kingChar) {
                kingPos = { row: r, col: c };
                break;
            }
        }
        if (kingPos) break;
    }
    if (!kingPos) return true; // Should not happen

    return isSquareUnderAttack(gameState, kingPos.row, kingPos.col, player === 'white');
}

function isSquareUnderAttack(gameState, row, col, isWhiteKing) {
    // Check all enemy pieces
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const piece = gameState.board[r][c];
            if (piece === '' || isUpperCase(piece) === isWhiteKing) continue;
            
            // Check direct attacks (optimized)
            if (canPieceAttack(gameState, r, c, piece, row, col)) return true;
        }
    }
    return false;
}

function canPieceAttack(gameState, fromRow, fromCol, piece, targetRow, targetCol) {
    // Simplified attack check without generating all moves
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
        return Math.abs(dr) <= 1 && Math.abs(dc) <= 1;
    }
    // Slider pieces
    if (type === 'B' || type === 'R' || type === 'Q') {
        const diagonal = Math.abs(dr) === Math.abs(dc);
        const straight = dr === 0 || dc === 0;
        
        if (type === 'B' && !diagonal) return false;
        if (type === 'R' && !straight) return false;
        if (type === 'Q' && !diagonal && !straight) return false;

        // Check path
        const stepR = dr === 0 ? 0 : dr > 0 ? 1 : -1;
        const stepC = dc === 0 ? 0 : dc > 0 ? 1 : -1;
        let r = fromRow + stepR;
        let c = fromCol + stepC;
        while (r !== targetRow || c !== targetCol) {
            if (gameState.board[r][c] !== '') return false;
            r += stepR;
            c += stepC;
        }
        return true;
    }
    return false;
}

function getPieceDirections(pieceType) {
    // Shared direction logic
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

function isUpperCase(char) {
    return char === char.toUpperCase();
}

function evaluateBoard(board) {
    let score = 0;
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            const piece = board[r][c];
            if (piece === '') continue;
            const value = getPieceValue(piece);
            const isWhite = isUpperCase(piece);
            const pieceScore = isWhite ? value : -value;
            const positionBonus = getPositionBonus(piece, r, c);
            score += pieceScore + (isWhite ? positionBonus : -positionBonus);
        }
    }
    return score;
}

function getPieceValue(piece) {
    const values = { 'P': 100, 'N': 320, 'B': 330, 'R': 500, 'Q': 900, 'K': 20000, 'p': 100, 'n': 320, 'b': 330, 'r': 500, 'q': 900, 'k': 20000 };
    return values[piece] || 0;
}

function getPositionBonus(piece, row, col) {
    const pieceType = piece.toUpperCase();
    const isWhite = isUpperCase(piece);
    const r = isWhite ? row : 7 - row;
    const centerDistance = Math.abs(3.5 - row) + Math.abs(3.5 - col);
    let bonus = (8 - centerDistance) * 0.1;
    if (pieceType === 'P') bonus += r * 0.1;
    if (pieceType === 'N' || pieceType === 'B') if (row >= 2 && row <= 5 && col >= 2 && col <= 5) bonus += 0.2;
    if (pieceType === 'R') { /* Open file check skipped for simplicity in worker, or pass full board */ }
    return bonus;
}

