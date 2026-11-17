import { ContentPanel } from '../ui/ContentPanel.js';

export const VideoPhase = Object.freeze({
  CODING: 'CODING',
  CAT_REACT: 'CAT_REACT',
  COFFEE: 'COFFEE',
  BUILD: 'BUILD',
  RELAX: 'RELAX',
});

export class LivingVideoStudio {
  /**
   * @param {HTMLElement} container - The container element to mount into.
   * @param {object} [options]
   * @param {Function} [options.onSwitchMode] - Callback when user toggles to 2.5D canvas.
   */
  constructor(container, options = {}) {
    this.container = container;
    this.options = options;
    this.phase = VideoPhase.CODING;
    this.catPhase = 'SLEEP';

    // Video elements
    this.devVideoEl = null;
    this.catVideoEl = null;
    this.videoEl = null; // Alias to devVideoEl

    // Busy flags to enforce single click per action
    this.isDevBusy = false;
    this.isCatBusy = false;

    // UI Buttons for state management
    this.coffeeBtn = null;
    this.petCatBtn = null;

    // HUD & Modals
    this.hudEl = null;
    this.toastEl = null;
    this.contentPanel = null;
    this.isMuted = true;
    this.toastTimeout = null;

    this.init();
  }

  init() {
    if (!this.container || typeof document === 'undefined') return;

    this.container.innerHTML = '';
    this.container.className = 'living-studio-container split-cockpit-layout';

    // 1. Top HUD Header
    this.createGlobalHud();

    // 2. Main Grid Layout
    const gridWrapper = document.createElement('div');
    gridWrapper.className = 'cockpit-grid-wrapper';

    // --- LEFT COLUMN: Developer Workstation ---
    const devCol = document.createElement('div');
    devCol.className = 'cockpit-col cockpit-col-dev';

    const devVideoWrapper = document.createElement('div');
    devVideoWrapper.className = 'cockpit-video-box dev-video-box';

    this.devVideoEl = document.createElement('video');
    this.devVideoEl.className = 'living-studio-video dev-video';
    this.devVideoEl.autoplay = true;
    this.devVideoEl.muted = true;
    this.devVideoEl.loop = true;
    this.devVideoEl.playsInline = true;
    this.devVideoEl.setAttribute('playsinline', '');
    this.devVideoEl.setAttribute('webkit-playsinline', '');
    this.devVideoEl.poster = 'assets/video/studio_dev_poster.jpg';
    this.devVideoEl.preload = 'auto';

    devVideoWrapper.appendChild(this.devVideoEl);

    // Dev Station Badge
    const devBadge = document.createElement('div');
    devBadge.className = 'cockpit-badge dev-badge';
    devBadge.innerHTML = '<span class="badge-dot live"></span> OLEG // LEAD DEV WORKSTATION';
    devVideoWrapper.appendChild(devBadge);

    devCol.appendChild(devVideoWrapper);

    // Dev Control Console
    const devConsole = this.createDevConsole();
    devCol.appendChild(devConsole);
    gridWrapper.appendChild(devCol);

    // --- RIGHT COLUMN: Robo-Cat Companion Terminal ---
    const catCol = document.createElement('div');
    catCol.className = 'cockpit-col cockpit-col-cat';

    const catVideoWrapper = document.createElement('div');
    catVideoWrapper.className = 'cockpit-video-box cat-video-box';

    this.catVideoEl = document.createElement('video');
    this.catVideoEl.className = 'living-studio-video cat-video';
    this.catVideoEl.autoplay = true;
    this.catVideoEl.muted = true;
    this.catVideoEl.loop = true;
    this.catVideoEl.playsInline = true;
    this.catVideoEl.setAttribute('playsinline', '');
    this.catVideoEl.setAttribute('webkit-playsinline', '');
    this.catVideoEl.poster = 'assets/video/studio_cat_poster.jpg';
    this.catVideoEl.preload = 'auto';

    catVideoWrapper.appendChild(this.catVideoEl);

    // Cat Station Badge
    const catBadge = document.createElement('div');
    catBadge.className = 'cockpit-badge cat-badge';
    catBadge.innerHTML = '<span class="badge-dot cyan"></span> NEOW-11 // AI AGENT DOCK';
    catVideoWrapper.appendChild(catBadge);

    catCol.appendChild(catVideoWrapper);

    // Cat Control Console
    const catConsole = this.createCatConsole();
    catCol.appendChild(catConsole);
    gridWrapper.appendChild(catCol);

    this.container.appendChild(gridWrapper);

    // Alias for backward compatibility
    this.videoEl = this.devVideoEl;

    // Toast Container
    this.toastEl = document.createElement('div');
    this.toastEl.className = 'living-studio-toast';
    this.container.appendChild(this.toastEl);

    // Shared ContentPanel Modal
    this.contentPanel = new ContentPanel(this.container, {
      onClose: () => {
        if (this.phase === VideoPhase.RELAX || this.phase === VideoPhase.BUILD) {
          this.playCodingLoop();
        }
      },
    });

    // Start default seamless idle loops
    this.playDevIdleLoop();
    this.playCatSleepLoop();
  }

  createGlobalHud() {
    this.hudEl = document.createElement('div');
    this.hudEl.className = 'living-studio-hud';

    const leftTitle = document.createElement('div');
    leftTitle.className = 'living-hud-title';
    leftTitle.innerHTML = '⚡ CYBERPITER 2088 // <span class="text-cyan">БУДУЩЕЕ ПЕТЕРБУРГА</span>';

    const controls = document.createElement('div');
    controls.className = 'living-hud-controls';

    // Sound toggle
    this.soundBtn = document.createElement('button');
    this.soundBtn.className = 'living-hud-btn living-hud-btn-sound';
    this.soundBtn.innerHTML = '🔇';
    this.soundBtn.setAttribute('title', 'Включить атмосферный звук студии');
    this.soundBtn.addEventListener('click', () => this.toggleSound());
    controls.appendChild(this.soundBtn);

    // 2.5D Canvas toggle
    if (typeof this.options.onSwitchMode === 'function') {
      const modeBtn = document.createElement('button');
      modeBtn.className = 'living-hud-btn living-hud-btn-mode';
      modeBtn.innerHTML = '🎮 2.5D Холст';
      modeBtn.setAttribute('title', 'Переключить в режим изометрической комнаты');
      modeBtn.addEventListener('click', () => this.options.onSwitchMode());
      controls.appendChild(modeBtn);
    }

    this.hudEl.appendChild(leftTitle);
    this.hudEl.appendChild(controls);
    this.container.appendChild(this.hudEl);
  }

  createDevConsole() {
    const bar = document.createElement('div');
    bar.className = 'cockpit-console-hud dev-console-hud';

    const actions = document.createElement('div');
    actions.className = 'console-hud-actions';

    this.coffeeBtn = this.createConsoleBtn('☕ Выпить кофе', () => this.triggerCoffee());
    const buildBtn = this.createConsoleBtn('🚀 Проекты', () => this.triggerBuild('projects'));
    const stackBtn = this.createConsoleBtn('⚡ Стек технологий', () => this.triggerHologram('skills'));
    const profileBtn = this.createConsoleBtn('👤 Обо мне', () => this.triggerRelax());
    const contactBtn = this.createConsoleBtn('📬 Контакты', () => this.contentPanel.open('contacts'));

    actions.appendChild(this.coffeeBtn);
    actions.appendChild(buildBtn);
    actions.appendChild(stackBtn);
    actions.appendChild(profileBtn);
    actions.appendChild(contactBtn);

    const diagnostics = document.createElement('div');
    diagnostics.className = 'console-hud-diag';
    diagnostics.innerHTML = `
      <div class="diag-item"><span class="diag-label">SYSTEM:</span> <span class="diag-val cyan">READY</span></div>
      <div class="diag-item"><span class="diag-label">IDE:</span> <span class="diag-val">ACTIVE</span></div>
    `;

    bar.appendChild(actions);
    bar.appendChild(diagnostics);
    return bar;
  }

  createCatConsole() {
    const bar = document.createElement('div');
    bar.className = 'cockpit-console-hud cat-console-hud';

    const actions = document.createElement('div');
    actions.className = 'console-hud-actions cat-actions';

    this.petCatBtn = this.createConsoleBtn('🐱 Погладить кота', () => this.triggerCat());
    const miskaBtn = this.createConsoleBtn('🐾 Проект «Миска»', () => this.triggerCatMiska());
    miskaBtn.classList.add('btn-featured');
    const askAiBtn = this.createConsoleBtn('🤖 Автоматизации & AI', () => this.contentPanel.open('assistant-help'));

    actions.appendChild(this.petCatBtn);
    actions.appendChild(miskaBtn);
    actions.appendChild(askAiBtn);

    const diagnostics = document.createElement('div');
    diagnostics.className = 'console-hud-diag';
    diagnostics.innerHTML = `
      <div class="diag-item"><span class="diag-label">DOCK:</span> <span class="diag-val cyan">100%</span></div>
      <div class="diag-item"><span class="diag-label">AI HUB:</span> <span class="diag-val pink">ONLINE</span></div>
    `;

    bar.appendChild(actions);
    bar.appendChild(diagnostics);
    return bar;
  }

  createConsoleBtn(text, onClick) {
    const btn = document.createElement('button');
    btn.className = 'console-hud-btn';
    btn.textContent = text;
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      onClick(e);
    });
    return btn;
  }

  playDevVideo(basePath, loop = true, onEnded = null) {
    if (!this.devVideoEl) return;
    this.devVideoEl.innerHTML = '';
    this.devVideoEl.loop = loop;

    if (typeof document !== 'undefined') {
      const sourceWebM = document.createElement('source');
      sourceWebM.src = `${basePath}.webm`;
      sourceWebM.type = 'video/webm';

      const sourceMP4 = document.createElement('source');
      sourceMP4.src = `${basePath}.mp4`;
      sourceMP4.type = 'video/mp4';

      this.devVideoEl.appendChild(sourceWebM);
      this.devVideoEl.appendChild(sourceMP4);
    }
    if (typeof this.devVideoEl.load === 'function') {
      this.devVideoEl.load();
    }

    if (onEnded) {
      this.devVideoEl.onended = () => {
        this.devVideoEl.onended = null;
        onEnded();
      };
    } else {
      this.devVideoEl.onended = null;
    }

    if (typeof this.devVideoEl.play === 'function') {
      this.devVideoEl.play().catch(() => {});
    }
  }

  playCatVideo(basePath, loop = true, onEnded = null) {
    if (!this.catVideoEl) return;
    this.catVideoEl.innerHTML = '';
    this.catVideoEl.loop = loop;

    if (typeof document !== 'undefined') {
      const sourceWebM = document.createElement('source');
      sourceWebM.src = `${basePath}.webm`;
      sourceWebM.type = 'video/webm';

      const sourceMP4 = document.createElement('source');
      sourceMP4.src = `${basePath}.mp4`;
      sourceMP4.type = 'video/mp4';

      this.catVideoEl.appendChild(sourceWebM);
      this.catVideoEl.appendChild(sourceMP4);
    }
    if (typeof this.catVideoEl.load === 'function') {
      this.catVideoEl.load();
    }

    if (onEnded) {
      this.catVideoEl.onended = () => {
        this.catVideoEl.onended = null;
        onEnded();
      };
    } else {
      this.catVideoEl.onended = null;
    }

    if (typeof this.catVideoEl.play === 'function') {
      this.catVideoEl.play().catch(() => {});
    }
  }

  playDevIdleLoop() {
    this.phase = VideoPhase.CODING;
    this.isDevBusy = false;
    this.playDevVideo('assets/video/studio_dev_idle', true);
  }

  playCatSleepLoop() {
    this.catPhase = 'SLEEP';
    this.isCatBusy = false;
    this.playCatVideo('assets/video/studio_cat_sleep', true);
  }

  playCodingLoop() {
    this.playDevIdleLoop();
  }

  triggerCoffee() {
    // Prevent multiple clicks while animation is running
    if (this.isDevBusy) return;
    this.isDevBusy = true;
    this.phase = VideoPhase.COFFEE;

    if (this.coffeeBtn) {
      if (typeof this.coffeeBtn.blur === 'function') {
        this.coffeeBtn.blur();
      }
      this.coffeeBtn.disabled = true;
      this.coffeeBtn.classList.add('is-busy');
      this.coffeeBtn.textContent = '☕ Пьет кофе...';
    }

    // Play full coffee sip animation once, then return smoothly to typing
    this.playDevVideo('assets/video/studio_dev_coffee', false, () => {
      this.playDevIdleLoop();
      if (this.coffeeBtn) {
        this.coffeeBtn.disabled = false;
        this.coffeeBtn.classList.remove('is-busy');
        this.coffeeBtn.textContent = '☕ Выпить кофе';
      }
    });
  }

  triggerCat() {
    // Prevent multiple clicks while cat animation is running
    if (this.isCatBusy) return;
    this.isCatBusy = true;
    this.catPhase = 'WAKE';

    if (this.petCatBtn) {
      if (typeof this.petCatBtn.blur === 'function') {
        this.petCatBtn.blur();
      }
      this.petCatBtn.disabled = true;
      this.petCatBtn.classList.add('is-busy');
      this.petCatBtn.textContent = '🐱 Просыпается...';
    }

    // Play waking animation once
    this.playCatVideo('assets/video/studio_cat_wake', false, () => {
      this.catPhase = 'ALERT';

      // Stay upright for 3 seconds, then calmly return to sleep
      setTimeout(() => {
        this.playCatSleepLoop();
        if (this.petCatBtn) {
          this.petCatBtn.disabled = false;
          this.petCatBtn.classList.remove('is-busy');
          this.petCatBtn.textContent = '🐱 Погладить кота';
        }
      }, 3000);
    });
  }

  triggerCatMiska() {
    // Gently wake up cat if sleeping to create a responsive, living feel
    if (!this.isCatBusy) {
      this.triggerCat();
    }
    if (this.contentPanel) {
      this.contentPanel.open('miska');
    }
  }

  triggerBuild(target = 'projects') {
    this.phase = VideoPhase.BUILD;
    this.showToast('🚀 Компиляция проектов: Сборка успешна, тесты пройдены!');
    if (this.contentPanel) {
      this.contentPanel.open(target);
    }
  }

  triggerHologram(target = 'skills') {
    this.phase = VideoPhase.BUILD;
    this.showToast('⚡ Стек технологий: React, TypeScript, Node.js, WebGL & AI');
    if (this.contentPanel) {
      this.contentPanel.open(target);
    }
  }

  triggerRelax() {
    this.phase = VideoPhase.RELAX;
    this.showToast('👤 Разработчик Олег: Профиль, опыт и выполненные проекты');
    if (this.contentPanel) {
      this.contentPanel.open('about');
    }
  }

  toggleSound() {
    this.isMuted = !this.isMuted;
    if (this.devVideoEl) {
      this.devVideoEl.muted = this.isMuted;
      if (!this.isMuted) {
        this.devVideoEl.volume = 0.8;
      }
    }
    if (this.catVideoEl) {
      this.catVideoEl.muted = this.isMuted;
      if (!this.isMuted) {
        this.catVideoEl.volume = 0.5;
      }
    }
    if (this.soundBtn) {
      this.soundBtn.innerHTML = this.isMuted ? '🔇' : '🔊';
      this.soundBtn.setAttribute('title', this.isMuted ? 'Включить звук студии' : 'Выключить звук студии');
    }
    this.showToast(this.isMuted ? '🔇 Звук выключен' : '🔊 Звук включен (дождь за окном, клавиатура и студия)');
  }

  showToast(message) {
    // Disabled to eliminate visual banner overlays popping over video frames
  }

  // Aliases for compatibility in tests
  handleDevTimeUpdate() {}
  handleCatTimeUpdate() {}
  handleTimeUpdate() {}

  destroy() {
    if (this.devVideoEl) {
      this.devVideoEl.pause();
      this.devVideoEl.src = '';
    }
    if (this.catVideoEl) {
      this.catVideoEl.pause();
      this.catVideoEl.src = '';
    }
    if (this.contentPanel) {
      this.contentPanel.close();
    }
    if (this.container) {
      this.container.innerHTML = '';
    }
  }
}
