export type BarStatus = {
  isOpen: boolean;
  manualOverride: 'open' | 'closed' | null;
  lastUpdate: string | null;
  lastDistance: number | null;
};

export type BarConfig = {
  locationLat: number | null;
  locationLng: number | null;
  address: string;
  nearestStation: string;
  phone: string;
  hours: string;
  cover: string;
  defaultClosed: number[]; // 0=Sun, 1=Mon, ... 6=Sat
  radius: number;
};

export type BarData = {
  config: BarConfig;
  status: BarStatus;
  calendar: Record<string, 'open' | 'closed' | 'special'>;
};

export const DEFAULT_DATA: BarData = {
  config: {
    locationLat: 33.5844987,
    locationLng: 130.3911537,
    address: '福岡市中央区警固2-15-23 2F',
    nearestStation: '〒810-0023 / 西鉄薬院駅・天神駅より徒歩圏',
    phone: '080-3940-8155',
    hours: '21:00 — 26:00',
    cover: '¥1,000',
    defaultClosed: [0], // 0=Sun のみ定休
    radius: 80, // ビル2Fなので少し狭めに
  },
  status: {
    isOpen: false,
    manualOverride: null,
    lastUpdate: null,
    lastDistance: null,
  },
  calendar: {},
};
