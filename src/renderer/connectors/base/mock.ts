import { ChatConnector, ChatMessage } from '@shared/types'

export class MockConnector implements ChatConnector {
  private intervalId: NodeJS.Timeout | null = null;
  private connectedCb?: () => void;
  private disconnectedCb?: () => void;
  private messageCb?: (msg: ChatMessage) => void;

  
  private platforms: Array<"youtube" | "tiktok" | "twitch" | "kick"> = ["youtube", "tiktok", "twitch", "kick"];
  private users = ["GamerSejati99", "ulfa.gg", "xX_NightOwl_Xx", "rajaclutch", "LampungGaming", "SiBontot"];
  private comments = [
    "gg banget itu tadi!", 
    "halo kak, baru nonton nih", 
    "wkwkwk kena headshot mulu", 
    "mantap permainannya",
    "lanjut push rank dong",
    "kapan main bareng subscriber?",
    "min, fps drop ga di situ?",
    "first time nonton, keren!"
  ];

  async connect(target: string): Promise<void> {
    console.log(`[MockConnector] Connecting to ${target}...`);
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 800));
    
    if (this.connectedCb) this.connectedCb();
    
    this.intervalId = setInterval(() => {
      this.generateRandomMessage();
    }, 2500);
  }

  async disconnect(): Promise<void> {
    console.log(`[MockConnector] Disconnecting...`);
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    if (this.disconnectedCb) this.disconnectedCb();
  }

  async reconnect(): Promise<void> {
    await this.disconnect();
    await this.connect('mock-target');
  }

  onConnected(cb: () => void): void {
    this.connectedCb = cb;
  }

  onDisconnected(cb: () => void): void {
    this.disconnectedCb = cb;
  }

  onMessage(cb: (msg: ChatMessage) => void): void {
    this.messageCb = cb;
  }

  onError(_cb: (err: Error) => void): void {
    // Not used in mock
  }
  
  private generateRandomMessage() {
    if (!this.messageCb) return;
    
    const platform = this.platforms[Math.floor(Math.random() * this.platforms.length)];
    const username = this.users[Math.floor(Math.random() * this.users.length)];
    const message = this.comments[Math.floor(Math.random() * this.comments.length)];
    
    const newMsg: ChatMessage = {
      id: Math.random().toString(36).substr(2, 9),
      platform,
      username,
      avatar: '',
      message,
      timestamp: Date.now(),
      badges: [],
      color: '#ffffff',
      isModerator: Math.random() > 0.85,
      isSubscriber: Math.random() > 0.7,
      isVerified: Math.random() > 0.95,
      eventType: 'chat'
    };
    
    this.messageCb(newMsg);
  }
}
