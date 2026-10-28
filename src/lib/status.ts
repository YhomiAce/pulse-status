import type { MonitorState, OverallStatus, Service } from '@/api/schemas';

/** Visual tone shared by the banner and state badges. */
export type Tone = 'operational' | 'degraded' | 'major' | 'unknown';

/** What the overall status banner shows. */
export interface BannerInfo {
  tone: Tone;
  title: string;
  detail: string;
}

/**
 * Builds the overall status banner from pulse's overall status and the services.
 * pulse ignores pending monitors when it computes `status`; the detail line says
 * how many services are affected.
 */
export function bannerFor(status: OverallStatus, services: readonly Pick<Service, 'state'>[]): BannerInfo {
  const total = services.length;
  const down = services.filter((service) => service.state === 'down').length;
  const pending = services.filter((service) => service.state === 'pending').length;

  if (total === 0) {
    return { tone: 'unknown', title: 'No services monitored yet', detail: 'Services will appear here once they are added.' };
  }
  switch (status) {
    case 'operational':
      return {
        tone: 'operational',
        title: 'All systems operational',
        detail: pending > 0 ? `${countLabel(pending)} still waiting for a first check.` : `${countLabel(total)} running normally.`,
      };
    case 'degraded':
      return {
        tone: 'degraded',
        title: 'Partial outage',
        detail: `${down} of ${countLabel(total)} ${down === 1 ? 'is' : 'are'} down.`,
      };
    case 'major_outage':
      return { tone: 'major', title: 'Major outage', detail: 'All monitored services are down.' };
    case 'unknown':
      return { tone: 'unknown', title: 'Checking services', detail: 'Waiting for the first checks to complete.' };
  }
}

/** Tone and label of a single service state. */
export function stateInfo(state: MonitorState): { tone: Tone; label: string } {
  switch (state) {
    case 'up':
      return { tone: 'operational', label: 'Operational' };
    case 'down':
      return { tone: 'major', label: 'Down' };
    case 'pending':
      return { tone: 'unknown', label: 'Pending' };
  }
}

function countLabel(count: number): string {
  return `${count} service${count === 1 ? '' : 's'}`;
}
