import type { CountdownState } from '@/services/countdown/countdownService';

export type WidgetDisplayProps = {
  primaryValue: string;
  unitLabel: string;
  routeBadge: string;
  headsign: string;
  state: 'leave_in' | 'bus_in' | 'due' | 'fallback' | 'empty';
  /** Open in Maps when the widget supports a URL (app + widget bridge). */
  mapsUrl: string;
};

export const widgetPlaceholderProps: WidgetDisplayProps = {
  primaryValue: '90',
  unitLabel: 'seconds',
  routeBadge: '102',
  headsign: '',
  state: 'leave_in',
  mapsUrl: '',
};

function formatWidgetPrimaryValue(value: number) {
  return String(Math.max(0, value)).padStart(2, '0');
}

export function normalizeWidgetProps(props?: Partial<WidgetDisplayProps> | null): WidgetDisplayProps {
  return {
    ...widgetPlaceholderProps,
    ...props,
  };
}

export function getWidgetPrimaryUnitLabel(props: Partial<WidgetDisplayProps>) {
  if (props.state === 'due') return 'bus due';
  if (props.state === 'empty') return 'setup';
  if (props.primaryValue?.toLowerCase() === 'now') return 'leave now';
  return Number(props.primaryValue) === 1 ? 'minute' : 'minutes';
}

export function getWidgetNextBusText(props: Partial<WidgetDisplayProps>) {
  if (!props.routeBadge) return props.unitLabel || props.headsign;

  const busMinutes = props.unitLabel?.match(/bus in (\d+) min/i)?.[1];
  if (busMinutes) {
    return `${props.routeBadge} in ${busMinutes} ${busMinutes === '1' ? 'minute' : 'minutes'}`;
  }

  if (props.state === 'due') return `${props.routeBadge} due now`;
  if (props.state === 'fallback') return 'Realtime unavailable';
  return props.headsign || props.unitLabel;
}

export function countdownToWidgetProps(state: CountdownState): WidgetDisplayProps {
  const badge = state.routeShort || '—';
  const head = state.headsign || badge;

  switch (state.kind) {
    case 'no_setup':
      return {
        primaryValue: '—',
        unitLabel: 'Add your commute in Stumbl',
        routeBadge: '',
        headsign: '',
        state: 'empty',
        mapsUrl: '',
      };
    case 'no_realtime':
      return {
        primaryValue: '…',
        unitLabel: 'Realtime unavailable',
        routeBadge: badge,
        headsign: head,
        state: 'fallback',
        mapsUrl: state.mapsUrl,
      };
    case 'due':
      return {
        primaryValue: '!',
        unitLabel: 'Bus due',
        routeBadge: badge,
        headsign: head,
        state: 'due',
        mapsUrl: state.mapsUrl,
      };
    case 'leave_now': {
      const b = state.busMinutes;
      return {
        primaryValue: 'Now',
        unitLabel: b != null && b > 0 ? `Leave · bus in ${b} min` : 'Leave now',
        routeBadge: badge,
        headsign: head,
        state: 'bus_in',
        mapsUrl: state.mapsUrl,
      };
    }
    case 'leave_in': {
      const m = state.leaveMinutes ?? 0;
      const b = state.busMinutes;
      const busHint =
        state.realtimeOk && b != null && b > 0 ? ` · Bus in ${b} min` : '';
      return {
        primaryValue: formatWidgetPrimaryValue(m),
        unitLabel: (m === 1 ? 'Minute to leave' : 'Minutes to leave') + busHint,
        routeBadge: badge,
        headsign: head,
        state: 'leave_in',
        mapsUrl: state.mapsUrl,
      };
    }
    default:
      return {
        primaryValue: '—',
        unitLabel: '',
        routeBadge: badge,
        headsign: head,
        state: 'empty',
        mapsUrl: state.mapsUrl,
      };
  }
}
