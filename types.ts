
export interface Player {
  id: string;
  name: string;
  jerseyNumber: number;
  position: string;
  age: number;
  photoUrl: string;
  goals: number;
  assists: number;
  appearances: number;
}

export interface Team {
  id: string;
  name: string;
  logo: string;
  manager: string;
  contact: string;
  homeGround: string;
  players: Player[];
}

export interface GoalScorer {
  playerId: string;
  playerName: string;
  teamId: string;
  goals: number;
  minute: number; 
}

export interface CardEvent {
  playerId: string;
  playerName: string;
  teamId: string;
  type: 'yellow' | 'red';
  minute: number;
}

export interface Match {
  id: string;
  date: string;
  time: string;
  venue: string;
  homeTeamId: string;
  awayTeamId: string;
  homeScore?: number;
  awayScore?: number;
  scorers?: GoalScorer[];
  cards?: CardEvent[];
  isCompleted: boolean;
  matchWeek: number;
}

export interface Standing {
  teamId: string;
  teamName: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
}

export enum UserRole {
  PUBLIC = 'PUBLIC',
  TEAM_MANAGER = 'TEAM_MANAGER',
  ADMIN = 'ADMIN'
}
