// Sound + TTS service with queue system
export class SoundService {
  private audioCtx: AudioContext | null = null;
  private ttsQueue: SpeechSynthesisUtterance[] = [];
  private speaking = false;

  private getCtx(): AudioContext {
    if (!this.audioCtx) this.audioCtx = new AudioContext();
    return this.audioCtx;
  }

  playNotification(type: string, volume = 0.8) {
    try {
      const ctx = this.getCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      gain.gain.value = volume * 0.3;
      osc.connect(gain);
      gain.connect(ctx.destination);

      // Different sounds per event type
      switch (type) {
        case 'superchat':
          osc.frequency.setValueAtTime(800, ctx.currentTime);
          osc.frequency.linearRampToValueAtTime(1200, ctx.currentTime + 0.1);
          osc.frequency.linearRampToValueAtTime(800, ctx.currentTime + 0.2);
          osc.start(ctx.currentTime);
          osc.stop(ctx.currentTime + 0.3);
          break;
        case 'gift':
          osc.frequency.setValueAtTime(600, ctx.currentTime);
          osc.frequency.linearRampToValueAtTime(900, ctx.currentTime + 0.15);
          osc.frequency.linearRampToValueAtTime(1200, ctx.currentTime + 0.25);
          osc.start(ctx.currentTime);
          osc.stop(ctx.currentTime + 0.4);
          break;
        case 'cheers':
          osc.frequency.setValueAtTime(500, ctx.currentTime);
          osc.frequency.linearRampToValueAtTime(700, ctx.currentTime + 0.2);
          osc.start(ctx.currentTime);
          osc.stop(ctx.currentTime + 0.3);
          break;
        default:
          osc.frequency.setValueAtTime(440, ctx.currentTime);
          osc.start(ctx.currentTime);
          osc.stop(ctx.currentTime + 0.15);
      }
    } catch { /* audio not available */ }
  }

  speak(text: string, voiceName = '', rate = 1, volume = 0.8) {
    if (!window.speechSynthesis) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = rate;
    utterance.volume = volume;
    if (voiceName) {
      const voices = window.speechSynthesis.getVoices();
      const found = voices.find(v => v.name === voiceName);
      if (found) utterance.voice = found;
    }
    this.ttsQueue.push(utterance);
    if (!this.speaking) this.processQueue();
  }

  private processQueue() {
    if (this.ttsQueue.length === 0) { this.speaking = false; return; }
    this.speaking = true;
    const utterance = this.ttsQueue.shift()!;
    utterance.onend = () => this.processQueue();
    utterance.onerror = () => this.processQueue();
    window.speechSynthesis.speak(utterance);
  }

  stop() {
    window.speechSynthesis?.cancel();
    this.ttsQueue = [];
    this.speaking = false;
  }
}

export const soundService = new SoundService();