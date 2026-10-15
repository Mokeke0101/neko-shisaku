// 画面を消さない仕組み（RS01-D01）。
// アプリは1つのページで、ホーム・3つのゲーム・設定のどの画面もこのページの中にある。
// そのため、このページが Screen Wake Lock を取っていれば、どの画面でも画面は消えない。
// 外れた時（アプリが後ろへ回った等）は、前に出た時と画面に触れた時に取り直す。
export const wake = {
  sentinel: null,
  state: '未準備',
  supported: 'wakeLock' in navigator,
  onChange: null,

  held() {
    return !!(this.sentinel && !this.sentinel.released);
  },

  async request(reason) {
    if (!this.supported) {
      this.state = '使えません（iOS 18.4 以降のホーム画面のアプリで動きます）';
      this.notify();
      return;
    }
    if (this.held() || document.visibilityState !== 'visible') return;
    try {
      const s = await navigator.wakeLock.request('screen');
      this.sentinel = s;
      this.state = '動いている';
      s.addEventListener('release', () => {
        this.state = '外れた（画面に触れると取り直します）';
        this.notify();
      });
    } catch (e) {
      this.state = `取れませんでした（${reason}：${e.name}）`;
    }
    this.notify();
  },

  notify() {
    if (this.onChange) this.onChange();
  },

  start() {
    this.request('ひらいた');
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') this.request('まえに でた');
    });
    document.addEventListener('pointerdown', () => {
      if (!this.held()) this.request('がめんに ふれた');
    }, { capture: true });
  },
};
