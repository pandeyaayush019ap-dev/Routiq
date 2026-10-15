/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

class VoiceGuidanceService {
  private isMuted: boolean = false;
  private wakeLockSentinel: any = null;
  private lastSpokenText: string = '';
  private lastSpokenTime: number = 0;
  private alertedRestrictions: Set<string> = new Set();

  constructor() {
    if (typeof window !== 'undefined') {
      const savedMute = localStorage.getItem('routiq_voice_muted');
      if (savedMute !== null) {
        this.isMuted = savedMute === 'true';
      }

      // Re-acquire wake lock on visibility change if navigating
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && this.wakeLockSentinel !== null) {
          this.requestWakeLock().catch(() => {});
        }
      });
    }
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  public setMuted(muted: boolean): void {
    this.isMuted = muted;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('routiq_voice_muted', String(muted));
    }
    if (muted && typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  }

  public toggleMute(): boolean {
    const next = !this.isMuted;
    this.setMuted(next);
    return next;
  }

  /**
   * Speak turn instruction or safety warning
   */
  public speak(text: string, isHindi: boolean = false): void {
    if (this.isMuted || !text) return;
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    // Throttle duplicate phrases within 5 seconds
    const now = Date.now();
    if (this.lastSpokenText === text && now - this.lastSpokenTime < 5000) {
      return;
    }

    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = isHindi ? 'hi-IN' : 'en-IN';
      utterance.rate = 0.95;
      utterance.pitch = 1.0;

      // Match voice for locale if available
      const voices = window.speechSynthesis.getVoices();
      const targetLang = isHindi ? 'hi' : 'en';
      const matchedVoice = voices.find((v) => v.lang.toLowerCase().startsWith(targetLang));
      if (matchedVoice) {
        utterance.voice = matchedVoice;
      }

      this.lastSpokenText = text;
      this.lastSpokenTime = now;
      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.warn('[VoiceGuidance] Speech synthesis error:', err);
    }
  }

  /**
   * Check and alert proximity to restrictions (5km, 1km, 500m)
   */
  public checkRestrictionProximity(
    driverDistanceKm: number,
    restrictions: Array<{ id: string; distanceAlongRouteKm?: number; roadName: { en: string; hi: string }; maxClearanceMeters?: number }>,
    isHindi: boolean
  ): void {
    for (const restr of restrictions) {
      if (restr.distanceAlongRouteKm === undefined) continue;
      const distanceToRestrKm = restr.distanceAlongRouteKm - driverDistanceKm;

      // 5km, 1km, 500m intervals
      const intervals = [
        { key: '5km', maxDist: 5.2, minDist: 4.8, labelEn: '5 kilometers', labelHi: '5 किलोमीटर' },
        { key: '1km', maxDist: 1.2, minDist: 0.8, labelEn: '1 kilometer', labelHi: '1 किलोमीटर' },
        { key: '500m', maxDist: 0.6, minDist: 0.4, labelEn: '500 meters', labelHi: '500 मीटर' },
      ];

      for (const interval of intervals) {
        const alertKey = `${restr.id}_${interval.key}`;
        if (
          distanceToRestrKm >= interval.minDist &&
          distanceToRestrKm <= interval.maxDist &&
          !this.alertedRestrictions.has(alertKey)
        ) {
          this.alertedRestrictions.add(alertKey);
          const roadName = isHindi ? restr.roadName.hi : restr.roadName.en;
          const clearanceInfo = restr.maxClearanceMeters
            ? isHindi
              ? `ऊंचाई सीमा ${restr.maxClearanceMeters} मीटर`
              : `clearance ${restr.maxClearanceMeters} meters`
            : '';

          const phrase = isHindi
            ? `सावधान: आगे ${interval.labelHi} में ${roadName} पर गतिरोध है। ${clearanceInfo}`
            : `Caution: Restriction ahead on ${roadName} in ${interval.labelEn}. ${clearanceInfo}`;

          this.speak(phrase, isHindi);
        }
      }
    }
  }

  public resetProximityAlerts(): void {
    this.alertedRestrictions.clear();
    this.lastSpokenText = '';
  }

  /**
   * Screen Wake Lock to prevent screen sleep while driving
   */
  public async requestWakeLock(): Promise<void> {
    if (typeof navigator !== 'undefined' && 'wakeLock' in navigator) {
      try {
        this.wakeLockSentinel = await (navigator as any).wakeLock.request('screen');
        this.wakeLockSentinel.addEventListener('release', () => {
          this.wakeLockSentinel = null;
        });
      } catch (err) {
        console.warn('[VoiceGuidance] Wake lock request failed:', err);
      }
    }
  }

  public async releaseWakeLock(): Promise<void> {
    if (this.wakeLockSentinel) {
      try {
        await this.wakeLockSentinel.release();
      } catch (err) {
        // ignore
      }
      this.wakeLockSentinel = null;
    }
  }
}

export const voiceGuidance = new VoiceGuidanceService();
