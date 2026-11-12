import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { searchAllRestaurants } from '../api/places';
import { CUISINES, cuisineById } from '../cuisines';
import { Button, formatDistance } from '../components/ui';
import { DiceDuel } from '../components/games/DiceDuel';
import { HighCard } from '../components/games/HighCard';
import { TicTacToe } from '../components/games/TicTacToe';
import { GAMES, GameId, Player, PlayerIndex } from '../components/games/types';
import { Coords, Cuisine, Restaurant } from '../types';
import { colors, radius, shadow } from '../theme';

type Mode = 'cuisine' | 'restaurant';
type Pick = { kind: 'cuisine'; cuisine: Cuisine } | { kind: 'restaurant'; restaurant: Restaurant };

type Step =
  | { name: 'setup' }
  | { name: 'pick'; player: PlayerIndex }
  | { name: 'versus' }
  | { name: 'game' }
  | { name: 'winner'; winner: PlayerIndex | null }; // null = both picked the same thing

const PLAYER_COLORS = [colors.orange, colors.navy];

/** Best of 3: first to this many round wins takes the battle. */
const WINS_NEEDED = 2;
const MAX_ROUNDS = WINS_NEEDED * 2 - 1;

/** A random order of the games, so each round of a match plays a different one. */
function shuffledGames(): GameId[] {
  const ids = GAMES.map((g) => g.id);
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }
  return ids;
}

type Props = {
  coords: Coords | null;
  onBack: () => void;
  onCuisine: (c: Cuisine) => void;
  /** `list` is every restaurant loaded for the battle, so "back" from details lands on it. */
  onRestaurant: (r: Restaurant, list: Restaurant[]) => void;
};

function pickId(p: Pick) {
  return p.kind === 'cuisine' ? `c:${p.cuisine.id}` : `r:${p.restaurant.id}`;
}
function pickEmoji(p: Pick) {
  return p.kind === 'cuisine' ? p.cuisine.emoji : cuisineById(p.restaurant.cuisineId).emoji;
}
function pickLabel(p: Pick) {
  return p.kind === 'cuisine' ? p.cuisine.label : p.restaurant.name;
}

export function BattleScreen({ coords, onBack, onCuisine, onRestaurant }: Props) {
  const [names, setNames] = useState(['', '']);
  const [mode, setMode] = useState<Mode>('cuisine');
  const [step, setStep] = useState<Step>({ name: 'setup' });
  const [picks, setPicks] = useState<[Pick | null, Pick | null]>([null, null]);
  // The match: one game per round, and who won each round so far.
  const [order, setOrder] = useState<GameId[]>(shuffledGames);
  const [rounds, setRounds] = useState<PlayerIndex[]>([]);
  const [gameKey, setGameKey] = useState(0); // remounts the game for each round
  const score: [number, number] = [rounds.filter((w) => w === 0).length, rounds.filter((w) => w === 1).length];
  const round = rounds.length + 1;
  const game = order[(round - 1) % order.length];
  const gameInfo = GAMES.find((g) => g.id === game)!;
  const lastRoundWinner = rounds.length ? rounds[rounds.length - 1] : null;

  const resetMatch = () => {
    setOrder(shuffledGames());
    setRounds([]);
    setGameKey((k) => k + 1);
  };

  const roundWon = (w: PlayerIndex) => {
    const next = [...rounds, w];
    setRounds(next);
    setGameKey((k) => k + 1);
    const wins = next.filter((x) => x === w).length;
    if (wins >= WINS_NEEDED || next.length >= MAX_ROUNDS) setStep({ name: 'winner', winner: w });
    else setStep({ name: 'versus' }); // scoreboard + next round's game
  };

  const players: [Player, Player] = [
    { name: names[0].trim() || 'Player 1', color: PLAYER_COLORS[0] },
    { name: names[1].trim() || 'Player 2', color: PLAYER_COLORS[1] },
  ];

  // Restaurant battles need the nearby list (all cuisines, same as browse mode).
  const [restaurants, setRestaurants] = useState<Restaurant[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const loadRestaurants = useCallback(async () => {
    if (!coords) return;
    setLoadError(null);
    setRestaurants(null);
    try {
      setRestaurants(await searchAllRestaurants(coords));
    } catch (e: any) {
      setLoadError(e?.message ?? 'Something went wrong.');
    }
  }, [coords]);
  useEffect(() => {
    if (mode === 'restaurant' && step.name !== 'setup' && !restaurants && !loadError) loadRestaurants();
  }, [mode, step.name, restaurants, loadError, loadRestaurants]);

  const choose = (p: Pick) => {
    Haptics.selectionAsync().catch(() => {});
    if (step.name !== 'pick') return;
    const next: [Pick | null, Pick | null] = step.player === 0 ? [p, picks[1]] : [picks[0], p];
    setPicks(next);
    if (step.player === 0) {
      setStep({ name: 'pick', player: 1 });
    } else if (pickId(next[0]!) === pickId(p)) {
      setStep({ name: 'winner', winner: null }); // great minds think alike — no battle needed
    } else {
      resetMatch();
      setStep({ name: 'versus' });
    }
  };

  const startOver = () => {
    setPicks([null, null]);
    resetMatch();
    setStep({ name: 'setup' });
  };

  const rematch = () => {
    resetMatch();
    setStep({ name: 'versus' });
  };

  const back = () => {
    if (step.name === 'setup') onBack();
    else if (step.name === 'pick' && step.player === 1) setStep({ name: 'pick', player: 0 });
    else startOver();
  };

  const go = (p: Pick) => {
    if (p.kind === 'cuisine') onCuisine(p.cuisine);
    else onRestaurant(p.restaurant, restaurants ?? [p.restaurant]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <Pressable onPress={back} hitSlop={12} style={styles.backBtn}>
          <Text style={styles.backText}>‹ {step.name === 'setup' ? 'Spin' : 'Back'}</Text>
        </Pressable>
        <Text style={styles.title}>⚔️ Food Battle</Text>
      </View>

      {step.name === 'setup' && (
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <Text style={styles.lead}>Two people, two cravings, one winner.</Text>

          <Text style={styles.label}>Who's battling?</Text>
          {players.map((p, i) => (
            <View key={i} style={[styles.inputRow, { borderColor: p.color }]}>
              <View style={[styles.dot, { backgroundColor: p.color }]} />
              <TextInput
                value={names[i]}
                onChangeText={(t) => setNames(i === 0 ? [t, names[1]] : [names[0], t])}
                placeholder={`Player ${i + 1}`}
                placeholderTextColor={colors.muted}
                style={styles.input}
                maxLength={16}
                returnKeyType="done"
              />
            </View>
          ))}

          <Text style={styles.label}>Battle over…</Text>
          <View style={styles.segment}>
            {(['cuisine', 'restaurant'] as const).map((m) => (
              <Pressable key={m} onPress={() => setMode(m)} style={[styles.segBtn, mode === m && styles.segActive]}>
                <Text style={[styles.segText, mode === m && styles.segTextActive]}>
                  {m === 'cuisine' ? '🍽️ Food type' : '📍 Restaurant'}
                </Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.label}>Best of 3 · first to 2 wins</Text>
          {GAMES.map((g) => (
            <Text key={g.id} style={styles.gameLine}>
              {g.emoji}  <Text style={{ fontWeight: '800', color: colors.ink }}>{g.name}</Text> · {g.blurb}
            </Text>
          ))}

          <Button title="Start battle" onPress={() => setStep({ name: 'pick', player: 0 })} style={{ marginTop: 24 }} />
        </ScrollView>
      )}

      {step.name === 'pick' && (
        <View style={{ flex: 1 }}>
          <View style={[styles.turnBanner, { backgroundColor: players[step.player].color }]}>
            <Text style={styles.turnTitle}>{players[step.player].name}, what do you want?</Text>
            <Text style={styles.turnSub}>
              {step.player === 0
                ? `${players[1].name}, no peeking!`
                : `${players[0].name} has picked ✓ (it's a secret). Your turn!`}
            </Text>
          </View>
          {mode === 'cuisine' ? (
            <CuisinePicker onPick={(cuisine) => choose({ kind: 'cuisine', cuisine })} />
          ) : (
            <RestaurantPicker
              list={restaurants}
              error={loadError}
              noLocation={!coords}
              onRetry={loadRestaurants}
              onPick={(restaurant) => choose({ kind: 'restaurant', restaurant })}
            />
          )}
        </View>
      )}

      {step.name === 'versus' && picks[0] && picks[1] && (
        <ScrollView contentContainerStyle={[styles.body, { alignItems: 'center' }]}>
          {lastRoundWinner !== null && (
            <Text style={[styles.roundResult, { color: players[lastRoundWinner].color }]}>
              {players[lastRoundWinner].name} takes round {rounds.length}!
            </Text>
          )}
          <Scoreboard players={players} score={score} rounds={rounds} />
          <PickCard player={players[0]} pick={picks[0]} />
          <Text style={styles.vs}>VS</Text>
          <PickCard player={players[1]} pick={picks[1]} />
          <View style={styles.gameAnnounce}>
            <Text style={styles.gameKicker}>
              ROUND {round}
              {score[0] === WINS_NEEDED - 1 && score[1] === WINS_NEEDED - 1 ? ' · DECIDER' : ''}
            </Text>
            <Text style={styles.gameName}>
              {gameInfo.emoji} {gameInfo.name}
            </Text>
            <Text style={styles.gameBlurb}>{gameInfo.blurb}</Text>
          </View>
          <Button
            title={round === 1 ? 'Fight! ⚔️' : `Start round ${round} ⚔️`}
            onPress={() => setStep({ name: 'game' })}
            style={{ alignSelf: 'stretch', marginTop: 20 }}
          />
        </ScrollView>
      )}

      {step.name === 'game' && (
        <ScrollView contentContainerStyle={[styles.body, { alignItems: 'center' }]}>
          <Text style={styles.gameKicker}>
            ROUND {round} OF {MAX_ROUNDS}
          </Text>
          <Scoreboard players={players} score={score} rounds={rounds} />
          {game === 'tictactoe' && <TicTacToe key={gameKey} players={players} onWinner={roundWon} />}
          {game === 'dice' && <DiceDuel key={gameKey} players={players} onWinner={roundWon} />}
          {game === 'card' && <HighCard key={gameKey} players={players} onWinner={roundWon} />}
        </ScrollView>
      )}

      {step.name === 'winner' && picks[0] && (
        <ScrollView contentContainerStyle={[styles.body, { alignItems: 'center' }]}>
          {step.winner === null ? (
            <>
              <Text style={styles.trophy}>🤝</Text>
              <Text style={styles.winTitle}>Great minds think alike!</Text>
              <Text style={styles.lead}>You both picked the same thing. No battle needed.</Text>
            </>
          ) : (
            <>
              <Text style={styles.trophy}>🏆</Text>
              <Text style={[styles.winTitle, { color: players[step.winner].color }]}>{players[step.winner].name} wins!</Text>
              <Scoreboard players={players} score={score} rounds={rounds} />
              <Text style={styles.finalScore}>
                {Math.max(...score)}–{Math.min(...score)} in the best of 3
              </Text>
              <Text style={styles.lead}>
                Sorry {players[step.winner === 0 ? 1 : 0].name}, you're having {pickLabel(picks[step.winner]!)}.
              </Text>
            </>
          )}
          {(() => {
            const prize = step.winner === null ? picks[0]! : picks[step.winner]!;
            return (
              <>
                <View style={styles.prize}>
                  <Text style={{ fontSize: 56 }}>{pickEmoji(prize)}</Text>
                  <Text style={styles.prizeText}>{pickLabel(prize)}</Text>
                </View>
                <Button
                  title={prize.kind === 'cuisine' ? `Find ${prize.cuisine.label} places` : 'View restaurant'}
                  onPress={() => go(prize)}
                  style={{ alignSelf: 'stretch', marginTop: 20 }}
                />
              </>
            );
          })()}
          {step.winner !== null && (
            <Button title="Rematch (best of 3)" variant="secondary" onPress={rematch} style={{ alignSelf: 'stretch', marginTop: 10 }} />
          )}
          <Button title="New battle" variant="secondary" onPress={startOver} style={{ alignSelf: 'stretch', marginTop: 10 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

/** Both players' round wins, with one dot per round slot (filled = round won). */
function Scoreboard({ players, score, rounds }: { players: [Player, Player]; score: [number, number]; rounds: PlayerIndex[] }) {
  return (
    <View style={styles.scoreboard}>
      {players.map((p, i) => (
        <View key={i} style={[styles.scoreSide, i === 1 && { alignItems: 'flex-end' }]}>
          <Text style={[styles.scoreName, { color: p.color }]} numberOfLines={1}>
            {p.name}
          </Text>
          <View style={styles.scoreDots}>
            {Array.from({ length: WINS_NEEDED }, (_, d) => (
              <View key={d} style={[styles.scoreDot, { borderColor: p.color }, d < score[i] && { backgroundColor: p.color }]} />
            ))}
          </View>
        </View>
      ))}
      <Text style={styles.scoreNumbers} accessibilityLabel={`Score ${score[0]} to ${score[1]}, ${rounds.length} rounds played`}>
        {score[0]} – {score[1]}
      </Text>
    </View>
  );
}

function PickCard({ player, pick }: { player: Player; pick: Pick }) {
  return (
    <View style={[styles.pickCard, { borderColor: player.color }]}>
      <Text style={[styles.pickName, { color: player.color }]}>{player.name} wants</Text>
      <Text style={styles.pickValue} numberOfLines={2}>
        {pickEmoji(pick)} {pickLabel(pick)}
      </Text>
    </View>
  );
}

function CuisinePicker({ onPick }: { onPick: (c: Cuisine) => void }) {
  return (
    <ScrollView contentContainerStyle={styles.grid}>
      {CUISINES.map((c) => (
        <Pressable
          key={c.id}
          onPress={() => onPick(c)}
          style={({ pressed }) => [styles.tile, { backgroundColor: c.color, opacity: pressed ? 0.85 : 1 }]}
        >
          <Text style={styles.tileEmoji}>{c.emoji}</Text>
          <Text style={styles.tileText}>{c.label}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

function RestaurantPicker({
  list,
  error,
  noLocation,
  onRetry,
  onPick,
}: {
  list: Restaurant[] | null;
  error: string | null;
  noLocation: boolean;
  onRetry: () => void;
  onPick: (r: Restaurant) => void;
}) {
  const [filter, setFilter] = useState<string | null>(null);
  const shown = useMemo(() => (list && filter ? list.filter((r) => r.cuisineId === filter) : list), [list, filter]);

  if (error)
    return (
      <View style={styles.center}>
        <Text style={{ color: colors.red, textAlign: 'center' }}>{error}</Text>
        <Button title="Try again" onPress={onRetry} />
      </View>
    );
  if (!shown)
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.orange} />
        <Text style={{ color: colors.muted }}>{noLocation ? 'Finding your location…' : 'Finding restaurants nearby…'}</Text>
      </View>
    );

  return (
    <FlatList
      data={shown}
      keyExtractor={(r) => r.id}
      contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
      ListHeaderComponent={
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 12 }}>
          {[null, ...CUISINES].map((c) => {
            const active = (c?.id ?? null) === filter;
            return (
              <Pressable
                key={c?.id ?? 'all'}
                onPress={() => setFilter(c?.id ?? null)}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text style={[styles.chipText, active && { color: '#fff' }]}>{c ? `${c.emoji} ${c.label}` : 'All'}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      }
      ListEmptyComponent={<Text style={{ color: colors.muted, textAlign: 'center', marginTop: 20 }}>Nothing nearby for that one.</Text>}
      renderItem={({ item }) => (
        <Pressable onPress={() => onPick(item)} style={({ pressed }) => [styles.row, { opacity: pressed ? 0.85 : 1 }]}>
          <Text style={{ fontSize: 28 }}>{cuisineById(item.cuisineId).emoji}</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowName} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={styles.rowMeta}>
              ★ {item.rating.toFixed(1)} · {formatDistance(item.distanceKm)}
            </Text>
          </View>
          <Text style={styles.rowPick}>Pick</Text>
        </Pressable>
      )}
    />
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.cream },
  header: { paddingHorizontal: 16, paddingBottom: 8 },
  backBtn: { paddingVertical: 6, alignSelf: 'flex-start' },
  backText: { fontSize: 17, color: colors.orange, fontWeight: '700' },
  title: { fontSize: 28, fontWeight: '900', color: colors.red },
  body: { padding: 20, paddingBottom: 40 },
  lead: { fontSize: 16, color: colors.muted, textAlign: 'center', marginTop: 4 },
  label: { fontSize: 13, fontWeight: '800', letterSpacing: 1.2, color: colors.muted, marginTop: 22, marginBottom: 8, textTransform: 'uppercase' },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 2,
    paddingHorizontal: 14,
    marginBottom: 10,
  },
  dot: { width: 12, height: 12, borderRadius: 6 },
  input: { flex: 1, fontSize: 17, paddingVertical: 14, color: colors.ink, fontWeight: '700' },
  segment: { flexDirection: 'row', backgroundColor: '#F3E6D0', borderRadius: radius.pill, padding: 4 },
  segBtn: { flex: 1, paddingVertical: 10, borderRadius: radius.pill, alignItems: 'center' },
  segActive: { backgroundColor: '#fff' },
  segText: { fontWeight: '700', color: colors.muted },
  segTextActive: { color: colors.ink },
  gameLine: { color: colors.muted, fontSize: 15, marginBottom: 6 },
  turnBanner: { padding: 16, marginHorizontal: 16, borderRadius: radius.lg, marginBottom: 4 },
  turnTitle: { color: '#fff', fontSize: 20, fontWeight: '900' },
  turnSub: { color: 'rgba(255,255,255,0.9)', marginTop: 4, fontWeight: '600' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, padding: 16, paddingBottom: 40 },
  // paddingBottom nudges the centered emoji + label slightly above the middle.
  tile: { width: '47.5%', aspectRatio: 1.3, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center', paddingBottom: 14, ...shadow },
  // An explicit lineHeight trims the extra space emoji fonts add above the glyph.
  tileEmoji: { fontSize: 40, lineHeight: 48 },
  tileText: { color: '#fff', fontWeight: '900', fontSize: 17, marginTop: 4 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, padding: 24 },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card },
  chipActive: { backgroundColor: colors.navy, borderColor: colors.navy },
  chipText: { fontWeight: '700', color: colors.ink, fontSize: 13 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.card, borderRadius: radius.md, padding: 12, marginBottom: 10, ...shadow, shadowOpacity: 0.06 },
  rowName: { fontSize: 16, fontWeight: '800', color: colors.ink },
  rowMeta: { color: colors.muted, marginTop: 2 },
  rowPick: { color: colors.orange, fontWeight: '800' },
  pickCard: { alignSelf: 'stretch', backgroundColor: colors.card, borderRadius: radius.lg, borderWidth: 3, padding: 18, alignItems: 'center', ...shadow },
  pickName: { fontWeight: '800', fontSize: 14, textTransform: 'uppercase', letterSpacing: 1 },
  pickValue: { fontSize: 24, fontWeight: '900', color: colors.ink, marginTop: 6, textAlign: 'center' },
  vs: { fontSize: 36, fontWeight: '900', color: colors.red, marginVertical: 10 },
  gameAnnounce: { marginTop: 24, alignItems: 'center' },
  gameKicker: { fontSize: 12, fontWeight: '800', letterSpacing: 1.5, color: colors.muted },
  gameName: { fontSize: 26, fontWeight: '900', color: colors.ink, marginTop: 6 },
  gameBlurb: { color: colors.muted, marginTop: 4 },
  roundResult: { fontSize: 22, fontWeight: '900', textAlign: 'center', marginBottom: 4 },
  scoreboard: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginVertical: 12,
    ...shadow,
    shadowOpacity: 0.06,
  },
  // 40% each leaves the middle free for the score, so long names never run under it.
  scoreSide: { maxWidth: '40%', gap: 6 },
  scoreName: { fontWeight: '900', fontSize: 15 },
  scoreDots: { flexDirection: 'row', gap: 6 },
  scoreDot: { width: 14, height: 14, borderRadius: 7, borderWidth: 2 },
  // Centered between the two sides.
  scoreNumbers: { position: 'absolute', left: 0, right: 0, textAlign: 'center', fontSize: 26, fontWeight: '900', color: colors.ink },
  finalScore: { color: colors.muted, fontWeight: '700', marginTop: -4 },
  trophy: { fontSize: 72, marginTop: 10 },
  winTitle: { fontSize: 32, fontWeight: '900', color: colors.ink, textAlign: 'center' },
  prize: { marginTop: 20, alignSelf: 'stretch', alignItems: 'center', backgroundColor: colors.card, borderRadius: radius.lg, padding: 20, ...shadow },
  prizeText: { fontSize: 24, fontWeight: '900', color: colors.ink, marginTop: 6, textAlign: 'center' },
});
