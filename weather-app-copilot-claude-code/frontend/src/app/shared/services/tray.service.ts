import { Injectable } from '@angular/core';

type InvokeFn = (cmd: string, args?: Record<string, unknown>) => Promise<void>;
let invoke: InvokeFn | null = null;

async function getInvoke() {
  if (invoke) return invoke;
  const isTauri = typeof window !== 'undefined' && (
    '__TAURI_INTERNALS__' in window || '__TAURI__' in window
  );
  console.log('[TrayService] isTauri:', isTauri, 'keys:', Object.keys(window).filter(k => k.startsWith('__TAURI')));
  if (isTauri) {
    try {
      const mod = await import('@tauri-apps/api/core');
      invoke = mod.invoke as unknown as InvokeFn;
      console.log('[TrayService] invoke loaded');
    } catch (e) {
      console.error('[TrayService] failed to load invoke:', e);
    }
  }
  return invoke;
}

const CONDITION_EMOJI: Record<string, string> = {
  clear: '☀️', clouds: '☁️', rain: '🌧', drizzle: '🌦',
  thunderstorm: '⛈', snow: '❄️', mist: '🌫', fog: '🌫',
  haze: '🌫', dust: '💨', tornado: '🌪',
};

@Injectable({ providedIn: 'root' })
export class TrayService {
  async updateTray(temperature: number, condition: string): Promise<void> {
    const fn = await getInvoke();
    if (!fn) {
      console.warn('[TrayService] invoke not available, skipping tray update');
      return;
    }
    const emoji = CONDITION_EMOJI[condition] ?? '🌡';
    const title = `${Math.round(temperature)}° ${emoji}`;
    console.log('[TrayService] updating tray:', title);
    try {
      await fn('update_tray_title', { title });
    } catch (e) {
      console.error('[TrayService] update_tray_title error:', e);
    }
  }
}
