export type TransportType = 'car' | 'train' | 'bicycle' | 'walking';
export type Category = 'nature' | 'onsen' | 'history' | 'gourmet' | 'leisure' | 'urban';
export type TravelStyle = 'random' | 'nature' | 'onsen' | 'gourmet' | 'photo' | 'active';

export interface Spot {
  id: string;
  name: string;
  area: string;
  categories: Category[];
  description: string;
  access: string;
  lat: number;
  lng: number;
  missions: string[];
  transports: TransportType[];
  distanceFromMaebashi: number; // km
  difficulty: 'easy' | 'medium' | 'hard';
  points: number;
}

export interface Visit {
  id: string;
  spotId: string;
  visitDate: string; // ISO string
  transportType: TransportType;
  missionsCompleted: boolean[];
  comment: string;
  points: number;
}

export interface UserState {
  visits: Visit[];
  totalPoints: number;
  currentSpotId: string | null;
  currentTransport: TransportType | null;
  currentStyle: TravelStyle | null;
}

export const TRANSPORT_LABELS: Record<TransportType, string> = {
  car: '🚗 車',
  train: '🚃 電車',
  bicycle: '🚲 自転車',
  walking: '🚶 徒歩',
};

export const CATEGORY_LABELS: Record<Category, string> = {
  nature: '🏞 自然',
  onsen: '♨️ 温泉',
  history: '🏛 歴史・文化',
  gourmet: '🍴 グルメ',
  leisure: '🎡 レジャー',
  urban: '🏙 街・建物',
};

export const STYLE_LABELS: Record<TravelStyle, string> = {
  random: '🎲 完全おまかせ',
  nature: '🌲 自然を楽しみたい',
  onsen: '♨️ 癒やされたい',
  gourmet: '🍴 グルメを楽しみたい',
  photo: '📸 写真を撮りたい',
  active: '🏃 アクティブに動きたい',
};

export const LEVEL_THRESHOLDS = [
  { level: 1, title: '群馬初心者', minPoints: 0 },
  { level: 2, title: '群馬探索者', minPoints: 500 },
  { level: 3, title: '群馬旅人', minPoints: 1500 },
  { level: 4, title: '群馬マスター', minPoints: 3000 },
  { level: 5, title: '群馬県完全制覇', minPoints: 5000 },
];
