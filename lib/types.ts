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
    locationLat: null,
    locationLng: null,
    address: '— ',
    nearestStation: '— ',
    phone: '— ',
    hours: '19:00 — 02:00',
    cover: '¥1,000',
    defaultClosed: [0, 1],
    radius: 150,
  },
  status: {
    isOpen: false,
    manualOverride: null,
    lastUpdate: null,
    lastDistance: null,
  },
  calendar: {},
};
