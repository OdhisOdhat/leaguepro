
import { Team, Match } from './types';

export const MAX_SQUAD_SIZE = 30;

export const INITIAL_TEAMS: Team[] = [
  {
    id: 't1',
    name: 'Thunder FC',
    logo: 'https://picsum.photos/seed/thunder/100/100',
    manager: 'Alex Ferguson',
    contact: 'alex@thunder.com',
    homeGround: 'Storm Arena',
    players: []
  },
  {
    id: 't2',
    name: 'Lightning United',
    logo: 'https://picsum.photos/seed/lightning/100/100',
    manager: 'Pep Guardiola',
    contact: 'pep@lightning.com',
    homeGround: 'Voltage Stadium',
    players: []
  },
  {
    id: 't3',
    name: 'Gale Warriors',
    logo: 'https://picsum.photos/seed/gale/100/100',
    manager: 'Jurgen Klopp',
    contact: 'jurgen@gale.com',
    homeGround: 'Windy Park',
    players: []
  }
];

export const INITIAL_MATCHES: Match[] = [
  {
    id: 'm1',
    date: '2024-06-01',
    time: '15:00',
    venue: 'Storm Arena',
    homeTeamId: 't1',
    awayTeamId: 't2',
    isCompleted: false,
    matchWeek: 1
  },
  {
    id: 'm2',
    date: '2024-06-02',
    time: '18:00',
    venue: 'Windy Park',
    homeTeamId: 't3',
    awayTeamId: 't1',
    isCompleted: false,
    matchWeek: 2
  }
];
