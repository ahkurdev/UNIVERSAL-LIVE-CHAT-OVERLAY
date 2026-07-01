import { ChatMessage, AppSettings } from '@shared/types';

// Track recent messages for duplicate detection
const recentMessages: Map<string, number[]> = new Map(); // platform:username -> timestamps
const floodTracker: Map<string, number[]> = new Map(); // platform:username -> timestamps

export function shouldFilterMessage(msg: ChatMessage, settings: AppSettings): boolean {
  const key = `${msg.platform}:${msg.username}`;

  // 1. Duplicate filter
  if (settings.duplicateFilter) {
    const recent = recentMessages.get(key) || [];
    const windowMs = (settings.duplicateFilterWindow || 3) * 1000;
    const now = Date.now();
    
    // Check if same message exists within window
    const isDuplicate = recent.some(t => now - t < windowMs);
    if (isDuplicate) {
      // Check if message text is actually the same
      const lastMsg = getLastMessage(key);
      if (lastMsg && lastMsg === msg.message.toLowerCase().trim()) {
        return true;
      }
    }
    
    // Update tracker
    const updated = recent.filter(t => now - t < windowMs);
    updated.push(now);
    recentMessages.set(key, updated);
    setLastMessage(key, msg.message.toLowerCase().trim());
  }

  // 2. Flood protection
  if (settings.floodProtection) {
    const maxPerSec = settings.floodMaxPerSecond || 5;
    const now = Date.now();
    const recent = floodTracker.get(key) || [];
    const recentSec = recent.filter(t => now - t < 1000);
    recentSec.push(now);
    floodTracker.set(key, recentSec);
    
    if (recentSec.length > maxPerSec) {
      return true;
    }
  }

  // 3. Blacklist words
  if (settings.blacklistWords) {
    const words = settings.blacklistWords.toLowerCase().split(',').map(w => w.trim()).filter(Boolean);
    const msgLower = msg.message.toLowerCase();
    if (words.some(word => msgLower.includes(word))) {
      return true;
    }
  }

  // 4. Hide links
  if (settings.hideLinks) {
    const linkPattern = /https?:\/\/[^\s]+|www\.[^\s]+|\.[a-z]{2,}\/[^\s]*/i;
    if (linkPattern.test(msg.message)) {
      return true;
    }
  }

  // 5. Hide all caps
  if (settings.hideAllCaps) {
    const letters = msg.message.replace(/[^a-zA-Z]/g, '');
    if (letters.length > 3 && letters === letters.toUpperCase()) {
      return true;
    }
  }

  // 6. Hide bots
  if (settings.hideBots) {
    const botPatterns = [
      /bot$/i, /^bot/i, /nightbot/i, /streamlabs/i, /moobot/i,
      /streamelements/i, /fossabot/i, /commandbot/i, /chatbot/i
    ];
    if (botPatterns.some(p => p.test(msg.username))) {
      return true;
    }
  }

  return false;
}

// Simple message text cache for duplicate detection
const lastMessageCache: Map<string, string> = new Map();

function getLastMessage(key: string): string | undefined {
  return lastMessageCache.get(key);
}

function setLastMessage(key: string, msg: string): void {
  lastMessageCache.set(key, msg);
  // Cleanup old entries periodically
  if (lastMessageCache.size > 1000) {
    const keys = Array.from(lastMessageCache.keys());
    keys.slice(0, 500).forEach(k => lastMessageCache.delete(k));
  }
}