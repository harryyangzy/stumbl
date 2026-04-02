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
        primaryValue: String(m),
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
