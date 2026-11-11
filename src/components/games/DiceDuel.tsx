import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors, radius, shadow } from '../../theme';
import { GameProps, PlayerIndex, RESULT_PAUSE_MS } from './types';

const ROLL_MS = 800;
const FRAME_MS = 70;

// Which cells of a 3×3 grid have a pip for each face.
const PIPS: Record<number, number[]> = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

const d6 = () => 1 + Math.floor(Math.random() * 6);

function Die({ value, color }: { value: number; color: string }) {
  return (
    <View style={styles.die}>
      {Array.from({ length: 9 }, (_, i) => (
        <View key={i} style={styles.pipCell}>
          {PIPS[value].includes(i) && <View style={[styles.pip, { backgroundColor: color }]} />}
        </View>
      ))}
    </View>
  );
}

export function DiceDuel({ players, onWinner }: GameProps) {
  const [dice, setDice] = useState<[number[], number[]]>([[1, 1], [1, 1]]);
  const [done, setDone] = useState<[boolean, boolean]>([false, false]);
  const [rolling, setRolling] = useState<PlayerIndex | null>(null);
  const [round, setRound] = useState(1);
  const timer = useRef<ReturnType<typeof setInterval> | undefined>(undefined);

  useEffect(() => () => clearInterval(timer.current), []);

  const totals = dice.map((d) => d[0] + d[1]);
  const bothDone = done[0] && done[1];
  const winner: PlayerIndex | null = bothDone && totals[0] !== totals[1] ? (totals[0] > totals[1] ? 0 : 1) : null;
  const tie = bothDone && totals[0] === totals[1];
  const nextUp: PlayerIndex | null = !done[0] ? 0 : !done[1] ? 1 : null;

  useEffect(() => {
    if (winner === null) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    const t = setTimeout(() => onWinner(winner), RESULT_PAUSE_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [winner]);

  const roll = (p: PlayerIndex) => {
    if (rolling !== null || done[p] || nextUp !== p) return;
    setRolling(p);
    const started = Date.now();
    timer.current = setInterval(() => {
      const final = Date.now() - started >= ROLL_MS;
      setDice((prev) => {
        const next: [number[], number[]] = [prev[0], prev[1]];
        next[p] = [d6(), d6()];
        return next;
      });
      Haptics.selectionAsync().catch(() => {});
      if (final) {
        clearInterval(timer.current);
        setRolling(null);
        setDone((prev) => {
          const next: [boolean, boolean] = [prev[0], prev[1]];
          next[p] = true;
          return next;
        });
      }
    }, FRAME_MS);
  };

  const rollOff = () => {
    setDone([false, false]);
    setRound((r) => r + 1);
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.status}>
        {winner !== null
          ? `${players[winner].name} wins ${totals[winner]} to ${totals[winner === 0 ? 1 : 0]}!`
          : tie
            ? `Tie at ${totals[0]}! Roll again.`
            : rolling !== null
              ? 'Rolling…'
              : `${players[nextUp!].name}, roll the dice!`}
      </Text>
      {round > 1 && winner === null && !tie && <Text style={styles.round}>Tiebreaker round {round}</Text>}

      {players.map((p, i) => {
        const idx = i as PlayerIndex;
        const active = nextUp === idx && rolling === null && !bothDone;
        const shown = done[idx] || rolling === idx;
        return (
          <View key={i} style={[styles.lane, { borderColor: winner === idx ? p.color : 'transparent' }]}>
            <Text style={[styles.name, { color: p.color }]}>{p.name}</Text>
            <View style={styles.diceRow}>
              <View style={{ opacity: shown ? 1 : 0.25 }}>
                <Die value={dice[idx][0]} color={p.color} />
              </View>
              <View style={{ opacity: shown ? 1 : 0.25 }}>
                <Die value={dice[idx][1]} color={p.color} />
              </View>
              <Text style={styles.total}>{done[idx] ? totals[idx] : ''}</Text>
            </View>
            <Pressable
              onPress={() => roll(idx)}
              disabled={!active}
              style={[styles.rollBtn, { backgroundColor: p.color, opacity: active ? 1 : 0.3 }]}
            >
              <Text style={styles.rollText}>{done[idx] ? 'Rolled' : 'Roll 🎲'}</Text>
            </Pressable>
          </View>
        );
      })}

      {tie && (
        <Pressable onPress={rollOff} style={styles.again}>
          <Text style={styles.againText}>Roll again</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'stretch', alignSelf: 'stretch' },
  status: { fontSize: 20, fontWeight: '900', color: colors.ink, textAlign: 'center' },
  round: { textAlign: 'center', color: colors.muted, marginTop: 4 },
  lane: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 3,
    padding: 14,
    marginTop: 16,
    alignItems: 'center',
    ...shadow,
  },
  name: { fontSize: 18, fontWeight: '900' },
  diceRow: { flexDirection: 'row', alignItems: 'center', gap: 14, marginVertical: 12 },
  die: {
    width: 64,
    height: 64,
    borderRadius: 14,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: colors.line,
    padding: 6,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  pipCell: { width: '33.33%', height: '33.33%', alignItems: 'center', justifyContent: 'center' },
  pip: { width: 11, height: 11, borderRadius: 6 },
  total: { width: 44, fontSize: 30, fontWeight: '900', color: colors.ink, textAlign: 'center' },
  rollBtn: { paddingHorizontal: 28, paddingVertical: 12, borderRadius: radius.pill },
  rollText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  again: { marginTop: 16, alignSelf: 'center', backgroundColor: colors.orange, paddingHorizontal: 22, paddingVertical: 12, borderRadius: radius.pill },
  againText: { color: '#fff', fontWeight: '800', fontSize: 16 },
});
