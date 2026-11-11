import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors, radius, shadow } from '../../theme';
import { GameProps, PlayerIndex, RESULT_PAUSE_MS } from './types';

const LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // columns
  [0, 4, 8], [2, 4, 6],            // diagonals
];
const MARKS = ['X', 'O'] as const;

function findWin(board: (PlayerIndex | null)[]) {
  for (const line of LINES) {
    const [a, b, c] = line;
    if (board[a] !== null && board[a] === board[b] && board[a] === board[c]) return { player: board[a]!, line };
  }
  return null;
}

export function TicTacToe({ players, onWinner }: GameProps) {
  const [board, setBoard] = useState<(PlayerIndex | null)[]>(Array(9).fill(null));
  const [turn, setTurn] = useState<PlayerIndex>(() => (Math.random() < 0.5 ? 0 : 1));
  const win = findWin(board);
  const full = board.every((c) => c !== null);
  const draw = !win && full;

  useEffect(() => {
    if (!win) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    const t = setTimeout(() => onWinner(win.player), RESULT_PAUSE_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [win?.player]);

  const play = (i: number) => {
    if (board[i] !== null || win) return;
    Haptics.selectionAsync().catch(() => {});
    const next = [...board];
    next[i] = turn;
    setBoard(next);
    setTurn(turn === 0 ? 1 : 0);
  };

  const rematch = () => {
    setBoard(Array(9).fill(null));
    setTurn(Math.random() < 0.5 ? 0 : 1);
  };

  const status = win
    ? `${players[win.player].name} wins!`
    : draw
      ? "It's a draw!"
      : `${players[turn].name}'s turn (${MARKS[turn]})`;
  const statusColor = win ? players[win.player].color : draw ? colors.ink : players[turn].color;

  return (
    <View style={styles.wrap}>
      <Text style={[styles.status, { color: statusColor }]}>{status}</Text>
      <View style={styles.board}>
        {board.map((cell, i) => {
          const inWin = win?.line.includes(i);
          return (
            <Pressable
              key={i}
              onPress={() => play(i)}
              style={[styles.cell, inWin && { backgroundColor: players[win!.player].color }]}
              accessibilityLabel={`Square ${i + 1}${cell !== null ? `, ${MARKS[cell]}` : ''}`}
            >
              {cell !== null && (
                <Text style={[styles.mark, { color: inWin ? '#fff' : players[cell].color }]}>{MARKS[cell]}</Text>
              )}
            </Pressable>
          );
        })}
      </View>
      <View style={styles.legend}>
        {players.map((p, i) => (
          <Text key={i} style={[styles.legendText, { color: p.color }]}>
            {MARKS[i]} = {p.name}
          </Text>
        ))}
      </View>
      {draw && (
        <Pressable onPress={rematch} style={styles.again}>
          <Text style={styles.againText}>Play again</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center' },
  status: { fontSize: 20, fontWeight: '900', marginBottom: 16 },
  board: {
    width: 288,
    height: 288,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    padding: 6,
    backgroundColor: colors.line,
    borderRadius: radius.md,
  },
  cell: {
    width: 88,
    height: 88,
    backgroundColor: colors.card,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow,
    shadowOpacity: 0.06,
  },
  mark: { fontSize: 48, fontWeight: '900' },
  legend: { flexDirection: 'row', gap: 20, marginTop: 14 },
  legendText: { fontWeight: '800', fontSize: 15 },
  again: { marginTop: 16, backgroundColor: colors.orange, paddingHorizontal: 22, paddingVertical: 12, borderRadius: radius.pill },
  againText: { color: '#fff', fontWeight: '800', fontSize: 16 },
});
