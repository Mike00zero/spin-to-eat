export type PlayerIndex = 0 | 1;
export type Player = { name: string; color: string };

/** Every minigame gets the two players and reports the winner once it's decided (ties replay inside the game). */
export type GameProps = { players: [Player, Player]; onWinner: (winner: PlayerIndex) => void };

export type GameId = 'tictactoe' | 'dice' | 'card';

export const GAMES: { id: GameId; name: string; emoji: string; blurb: string }[] = [
  { id: 'tictactoe', name: 'Tic-Tac-Toe', emoji: '❌⭕', blurb: 'Three in a row takes it.' },
  { id: 'dice', name: 'Dice Duel', emoji: '🎲', blurb: 'Roll two dice. Highest total wins.' },
  { id: 'card', name: 'High Card', emoji: '🃏', blurb: 'Draw a card. Highest card wins (aces high).' },
];

export function randomGame(except?: GameId): GameId {
  const pool = GAMES.filter((g) => g.id !== except);
  return pool[Math.floor(Math.random() * pool.length)].id;
}

/** How long a game shows its final result before handing the win over. */
export const RESULT_PAUSE_MS = 1400;
