/**
 * Metro resolves `expo-widgets` here when EXPO_NO_WIDGETS=1 (Expo Go / JS-only dev).
 * The real package calls requireNativeModule('ExpoWidgets') on load, which Expo Go does not have.
 */

export type WidgetFamily =
  | 'systemSmall'
  | 'systemMedium'
  | 'systemLarge'
  | 'systemExtraLarge'
  | 'accessoryCircular'
  | 'accessoryRectangular'
  | 'accessoryInline';

export type WidgetEnvironment = {
  date: Date;
  widgetFamily: WidgetFamily;
  colorScheme?: 'light' | 'dark';
};

export function createWidget<T extends object>(
  _name: string,
  _widget: unknown
): {
  updateSnapshot(_props: T): void;
  reload(): void;
  updateTimeline(_entries: { date: Date; props: T }[]): void;
  getTimeline(): Promise<{ date: Date; props: T }[]>;
} {
  return {
    updateSnapshot() {},
    reload() {},
    updateTimeline() {},
    async getTimeline() {
      return [];
    },
  };
}

export function addUserInteractionListener(_listener: (event: unknown) => void): {
  remove: () => void;
} {
  return { remove: () => {} };
}

export function addPushToStartTokenListener(_listener: (event: unknown) => void): {
  remove: () => void;
} {
  return { remove: () => {} };
}

type StubLiveActivityInstance = {
  update(_props: unknown): Promise<void>;
  end(_dismissalPolicy?: unknown, _props?: unknown, _contentDate?: unknown): Promise<void>;
  getPushToken(): Promise<string | null>;
  addPushTokenListener(_listener: (event: unknown) => void): { remove: () => void };
};

function createStubLiveActivityInstance(): StubLiveActivityInstance {
  return {
    async update() {},
    async end() {},
    async getPushToken() {
      return null;
    },
    addPushTokenListener() {
      return { remove: () => {} };
    },
  };
}

export function createLiveActivity(
  _name: string,
  _liveActivity: unknown
): {
  start(_props: unknown, _url?: string): StubLiveActivityInstance;
  getInstances(): StubLiveActivityInstance[];
} {
  return {
    start() {
      return createStubLiveActivityInstance();
    },
    getInstances() {
      return [];
    },
  };
}

export function after(date: Date): { after: Date } {
  return { after: date };
}
