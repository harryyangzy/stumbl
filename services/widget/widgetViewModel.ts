import type { CountdownState } from '@/services/countdown/countdownService';

export type WidgetDisplayProps = {
  primaryValue: string;
  unitLabel: string;
  routeBadge: string;
  headsign: string;
  /** Footer line: leave time for the following bus (e.g. "leave in 14 min for next 2"). */
  footerLabel: string;
  state: 'leave_in' | 'bus_in' | 'due' | 'fallback' | 'empty';
  /** Open in Maps when the widget supports a URL (app + widget bridge). */
  mapsUrl: string;
};

export const widgetPlaceholderProps: WidgetDisplayProps = {
  primaryValue: '03',
  unitLabel: 'minutes',
  routeBadge: '2B',
  headsign: '',
  footerLabel: 'leave in 14 minutes for next 2B',
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
  if (props.primaryValue === '00' || props.state === 'bus_in') return 'leave now';
  if (props.unitLabel?.toLowerCase().includes('second')) return 'seconds';
  return Number(props.primaryValue) === 1 ? 'minute' : 'minutes';
}

export function formatWidgetFooterLabel(params: {
  busArrivalSec?: number;
  state: WidgetDisplayProps['state'];
}): string {
  const { busArrivalSec, state } = params;
  if (state === 'fallback') return 'Realtime unavailable';
  if (state === 'empty') return '';
  if (state === 'due' || (busArrivalSec != null && busArrivalSec <= 90)) {
    return 'due now';
  }
  if (busArrivalSec == null) return '';
  if (busArrivalSec < 60) {
    return `in ${busArrivalSec} ${busArrivalSec === 1 ? 'second' : 'seconds'}`;
  }
  const mins = Math.ceil(busArrivalSec / 60);
  return `in ${mins} ${mins === 1 ? 'minute' : 'minutes'}`;
}

export function formatFollowingBusFooterLabel(params: {
  routeShort: string;
  nextBusLeaveMinutes?: number;
  nextBusLeaveNow?: boolean;
  fromRealtime?: boolean;
}): string {
  const { routeShort, nextBusLeaveMinutes, nextBusLeaveNow, fromRealtime } = params;
  if (!fromRealtime) return '';
  if (nextBusLeaveMinutes == null && !nextBusLeaveNow) return '';
  const route = routeShort || '—';
  if (nextBusLeaveNow || nextBusLeaveMinutes === 0) {
    return `leave now for next ${route}`;
  }
  const minutes = nextBusLeaveMinutes ?? 0;
  return `leave in ${minutes} ${minutes === 1 ? 'minute' : 'minutes'} for next ${route}`;
}

export function getWidgetFooterTitle(props: Partial<WidgetDisplayProps>) {
  return '';
}

export function getWidgetNextBusText(props: Partial<WidgetDisplayProps>) {
  const timing =
    props.footerLabel ??
    formatWidgetFooterLabel({
      state: props.state ?? 'empty',
    });
  const title = getWidgetFooterTitle({ ...props, footerLabel: timing });
  if (!timing) return '';
  if (!title) return timing;
  return `${title}\n${timing}`;
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
        footerLabel: '',
        state: 'empty',
        mapsUrl: '',
      };
    case 'no_realtime':
      return {
        primaryValue: '…',
        unitLabel: 'Realtime unavailable',
        routeBadge: badge,
        headsign: head,
        footerLabel: formatWidgetFooterLabel({
          state: 'fallback',
        }),
        state: 'fallback',
        mapsUrl: state.mapsUrl,
      };
    case 'due':
      return {
        primaryValue: '!',
        unitLabel: 'Bus due',
        routeBadge: badge,
        headsign: head,
        footerLabel: formatFollowingBusFooterLabel({
          routeShort: badge,
          nextBusLeaveMinutes: state.nextBusLeaveMinutes,
          nextBusLeaveNow: state.nextBusLeaveNow,
          fromRealtime: state.nextBusFromRealtime,
        }),
        state: 'due',
        mapsUrl: state.mapsUrl,
      };
    case 'leave_now': {
      const b = state.busMinutes;
      return {
        primaryValue: '00',
        unitLabel: 'leave now',
        routeBadge: badge,
        headsign: head,
        footerLabel: formatFollowingBusFooterLabel({
          routeShort: badge,
          nextBusLeaveMinutes: state.nextBusLeaveMinutes,
          nextBusLeaveNow: state.nextBusLeaveNow,
          fromRealtime: state.nextBusFromRealtime,
        }),
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
        footerLabel: formatFollowingBusFooterLabel({
          routeShort: badge,
          nextBusLeaveMinutes: state.nextBusLeaveMinutes,
          nextBusLeaveNow: state.nextBusLeaveNow,
          fromRealtime: state.nextBusFromRealtime,
        }),
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
        footerLabel: '',
        state: 'empty',
        mapsUrl: state.mapsUrl,
      };
  }
}
