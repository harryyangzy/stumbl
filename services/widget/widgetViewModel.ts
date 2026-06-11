import type { CountdownState } from '@/services/countdown/countdownService';

export type WidgetDisplayProps = {
  primaryValue: string;
  unitLabel: string;
  routeBadge: string;
  headsign: string;
  /** Footer second line: bus arrival timing (e.g. "in 2 minutes"). */
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
  footerLabel: 'in 2 minutes',
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

export function getWidgetFooterTitle(props: Partial<WidgetDisplayProps>) {
  if (!props.footerLabel || props.state === 'fallback' || props.state === 'empty') return '';
  return 'Next bus';
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
        footerLabel: formatWidgetFooterLabel({
          busArrivalSec: state.busArrivalSec,
          state: 'due',
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
        footerLabel: formatWidgetFooterLabel({
          busArrivalSec: state.busArrivalSec,
          state: 'bus_in',
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
        footerLabel: formatWidgetFooterLabel({
          busArrivalSec: state.busArrivalSec,
          state: 'leave_in',
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
