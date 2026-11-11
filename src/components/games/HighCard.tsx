import React, { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors, radius, shadow } from '../../theme';
import { GameProps, PlayerIndex, RESULT_PAUSE_MS } from './types';

const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A']; // index = strength
const SUITS = ['♠', '♥', '♦', '♣'];
type Card = { rank: number; suit: string };

function shuffledDeck(): Card[] {
  const deck = RANKS.flatMap((_, rank) => SUITS.map((suit) => ({ rank, suit })));
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

/** A card that flips over (squash to 0 width, swap to the face, expand) when `card` is set. */
function FlipCard({ card, color }: { card: Card | null; color: string }) {
  const scale = useRef(new Animated.Value(1)).current;
  const [face, setFace] = useState<Card | null>(null);

  useEffect(() => {
    if (!card) {
      setFace(null);
      return;
    }
    Animated.timing(scale, { toValue: 0, duration: 140, useNativeDriver: true }).start(() => {
      setFace(card);
      Animated.timing(scale, { toValue: 1, duration: 140, useNativeDriver: true }).start();
    });
  }, [card, scale]);

  const red = face && (face.suit === '♥' || face.suit === '♦');
  return (
    <Animated.View style={[styles.card, { transform: [{ scaleX: scale }] }, !face && { backgroundColor: color }]}>
      {face ? (
        <>
          <Text style={[styles.corner, { color: red ? colors.red : colors.ink }]}>
            {RANKS[face.rank]}
            {'\n'}
            {face.suit}
          </Text>
          <Text style={[styles.bigSuit, { color: red ? colors.red : colors.ink }]}>{face.suit}</Text>
          <Text style={[styles.rankBig, { color: red ? colors.red : colors.ink }]}>{RANKS[face.rank]}</Text>
        </>
      ) : (
        <View style={styles.back}>
          <Text style={styles.backText}>?</Text>
        </View>
      )}
    </Animated.View>
  );
}

export function HighCard({ players, onWinner }: GameProps) {
  const deck = useRef(shuffledDeck());
  const [cards, setCards] = useState<[Card | null, Card | null]>([null, null]);
  const [round, setRound] = useState(1);

  const bothDrawn = cards[0] && cards[1];
  const winner: PlayerIndex | null =
    bothDrawn && cards[0]!.rank !== cards[1]!.rank ? (cards[0]!.rank > cards[1]!.rank ? 0 : 1) : null;
  const tie = !!bothDrawn && winner === null;
  const nextUp: PlayerIndex | null = !cards[0] ? 0 : !cards[1] ? 1 : null;

  useEffect(() => {
    if (winner === null) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    const t = setTimeout(() => onWinner(winner), RESULT_PAUSE_MS);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [winner]);

  const draw = (p: PlayerIndex) => {
    if (nextUp !== p) return;
    if (deck.current.length === 0) deck.current = shuffledDeck();
    const card = deck.current.pop()!;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setCards((prev) => (p === 0 ? [card, prev[1]] : [prev[0], card]));
  };

  const redraw = () => {
    setCards([null, null]);
    setRound((r) => r + 1);
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.status}>
        {winner !== null
          ? `${players[winner].name} wins with ${RANKS[cards[winner]!.rank]}${cards[winner]!.suit}!`
          : tie
            ? 'Same rank! Draw again.'
            : `${players[nextUp!].name}, tap your card to draw!`}
      </Text>
      {round > 1 && winner === null && !tie && <Text style={styles.round}>Tiebreaker round {round}</Text>}

      <View style={styles.table}>
        {players.map((p, i) => {
          const idx = i as PlayerIndex;
          return (
            <Pressable key={i} onPress={() => draw(idx)} disabled={nextUp !== idx} style={styles.seat}>
              <Text style={[styles.name, { color: p.color }]} numberOfLines={1}>
                {p.name}
              </Text>
              <View style={[styles.cardRing, { borderColor: winner === idx ? p.color : 'transparent' }]}>
                <FlipCard card={cards[idx]} color={p.color} />
              </View>
              <Text style={[styles.hint, { opacity: nextUp === idx ? 1 : 0 }]}>Tap to draw</Text>
            </Pressable>
          );
        })}
      </View>

      {tie && (
        <Pressable onPress={redraw} style={styles.again}>
          <Text style={styles.againText}>Draw again</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', alignSelf: 'stretch' },
  status: { fontSize: 20, fontWeight: '900', color: colors.ink, textAlign: 'center' },
  round: { color: colors.muted, marginTop: 4 },
  table: { flexDirection: 'row', justifyContent: 'center', gap: 20, marginTop: 20 },
  seat: { alignItems: 'center', width: 140 },
  name: { fontSize: 17, fontWeight: '900', marginBottom: 10 },
  cardRing: { borderWidth: 3, borderRadius: 18, padding: 4 },
  card: {
    width: 116,
    height: 164,
    borderRadius: 12,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    ...shadow,
  },
  corner: { position: 'absolute', top: 8, left: 10, fontWeight: '900', fontSize: 16, lineHeight: 18, textAlign: 'center' },
  bigSuit: { fontSize: 54 },
  rankBig: { position: 'absolute', bottom: 8, right: 12, fontWeight: '900', fontSize: 22 },
  back: {
    width: 96,
    height: 144,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backText: { color: '#fff', fontSize: 48, fontWeight: '900' },
  hint: { marginTop: 8, color: colors.muted, fontWeight: '700' },
  again: { marginTop: 20, backgroundColor: colors.orange, paddingHorizontal: 22, paddingVertical: 12, borderRadius: radius.pill },
  againText: { color: '#fff', fontWeight: '800', fontSize: 16 },
});
