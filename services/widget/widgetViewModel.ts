import type { CountdownState } from '@/services/countdown/countdownService';

export type WidgetDisplayProps = {
  primaryValue: string;
  unitLabel: string;
  routeBadge: string;
  headsign: string;
  /** Footer line 1 — leave timing for the following bus. */
  footerTitle: string;
  /** Footer line 2 — e.g. "for next 301". */
  footerLabel: string;
  state: 'leave_in' | 'bus_in' | 'fallback' | 'empty';
  /** Open in Maps when the widget supports a URL (app + widget bridge). */
  mapsUrl: string;
};

export const widgetPlaceholderProps: WidgetDisplayProps = {
  primaryValue: '03',
  unitLabel: 'minutes',
  routeBadge: '2B',
  headsign: '',
  footerTitle: 'leave in 14 minutes',
  footerLabel: 'for next 2B',
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
  if (busArrivalSec == null) return '';
  if (busArrivalSec < 60) {
    return `in ${busArrivalSec} ${busArrivalSec === 1 ? 'second' : 'seconds'}`;
  }
  const mins = Math.ceil(busArrivalSec / 60);
  return `in ${mins} ${mins === 1 ? 'minute' : 'minutes'}`;
}

export function formatFollowingBusFooterParts(params: {
  routeShort: string;
  nextBusLeaveMinutes?: number;
  nextBusLeaveSeconds?: number;
  nextBusLeaveNow?: boolean;
  fromRealtime?: boolean;
}): { title: string; subtitle: string } {
  const { routeShort, nextBusLeaveMinutes, nextBusLeaveSeconds, nextBusLeaveNow, fromRealtime } =
    params;
  if (!fromRealtime) return { title: '', subtitle: '' };
  if (nextBusLeaveMinutes == null && nextBusLeaveSeconds == null && !nextBusLeaveNow) {
    return { title: '', subtitle: '' };
  }
  const route = routeShort || '—';
  const subtitle = `for next ${route}`;
  if (nextBusLeaveNow) return { title: 'leave now', subtitle };
  if (nextBusLeaveSeconds != null && nextBusLeaveSeconds > 0) {
    const unit = nextBusLeaveSeconds === 1 ? 'second' : 'seconds';
    return { title: `leave in ${nextBusLeaveSeconds} ${unit}`, subtitle };
  }
  const minutes = nextBusLeaveMinutes ?? 0;
  const unit = minutes === 1 ? 'minute' : 'minutes';
  return { title: `leave in ${minutes} ${unit}`, subtitle };
}

/** @deprecated Use formatFollowingBusFooterParts — kept for widget inline copy. */
export function formatFollowingBusFooterLabel(params: {
  routeShort: string;
  nextBusLeaveMinutes?: number;
  nextBusLeaveSeconds?: number;
  nextBusLeaveNow?: boolean;
  fromRealtime?: boolean;
}): string {
  const { title, subtitle } = formatFollowingBusFooterParts(params);
  if (!title) return '';
  if (!subtitle) return title;
  return `${title}\n${subtitle}`;
}

export function getWidgetFooterTitle(props: Partial<WidgetDisplayProps>) {
  return props.footerTitle ?? '';
}

export function getWidgetNextBusText(props: Partial<WidgetDisplayProps>) {
  const title = getWidgetFooterTitle(props);
  const subtitle = props.footerLabel ?? '';
  if (!title && !subtitle) return '';
  if (!title) return subtitle;
  if (!subtitle) return title;
  return `${title}\n${subtitle}`;
}

function followingFooter(state: CountdownState, badge: string) {
  return formatFollowingBusFooterParts({
    routeShort: badge,
    nextBusLeaveMinutes: state.nextBusLeaveMinutes,
    nextBusLeaveSeconds: state.nextBusLeaveSeconds,
    nextBusLeaveNow: state.nextBusLeaveNow,
    fromRealtime: state.nextBusFromRealtime,
  });
}

function primaryLeaveDisplay(state: CountdownState): { primaryValue: string; unitLabel: string } {
  const b = state.busMinutes;
  const busHint = state.realtimeOk && b != null && b > 0 ? ` · Bus in ${b} min` : '';

  if (state.leaveSeconds != null && state.leaveSeconds > 0) {
    return {
      primaryValue: String(state.leaveSeconds).padStart(2, '0'),
      unitLabel: (state.leaveSeconds === 1 ? 'Second to leave' : 'Seconds to leave') + busHint,
    };
  }

  const m = state.leaveMinutes ?? 0;
  return {
    primaryValue: formatWidgetPrimaryValue(m),
    unitLabel: (m === 1 ? 'Minute to leave' : 'Minutes to leave') + busHint,
  };
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
        footerTitle: '',
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
        footerTitle: '',
        footerLabel: formatWidgetFooterLabel({
          state: 'fallback',
        }),
        state: 'fallback',
        mapsUrl: state.mapsUrl,
      };
    case 'leave_now': {
      const footer = followingFooter(state, badge);
      const busSec = state.busArrivalSec;
      if (busSec != null && busSec > 0 && busSec <= 90) {
        return {
          primaryValue: String(busSec).padStart(2, '0'),
          unitLabel: busSec === 1 ? 'Second until bus' : 'Seconds until bus',
          routeBadge: badge,
          headsign: head,
          footerTitle: footer.title,
          footerLabel: footer.subtitle,
          state: 'leave_in',
          mapsUrl: state.mapsUrl,
        };
      }
      return {
        primaryValue: '00',
        unitLabel: 'leave now',
        routeBadge: badge,
        headsign: head,
        footerTitle: footer.title,
        footerLabel: footer.subtitle,
        state: 'bus_in',
        mapsUrl: state.mapsUrl,
      };
    }
    case 'leave_in': {
      const footer = followingFooter(state, badge);
      const primary = primaryLeaveDisplay(state);
      return {
        primaryValue: primary.primaryValue,
        unitLabel: primary.unitLabel,
        routeBadge: badge,
        headsign: head,
        footerTitle: footer.title,
        footerLabel: footer.subtitle,
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
        footerTitle: '',
        footerLabel: '',
        state: 'empty',
        mapsUrl: state.mapsUrl,
      };
  }
}
