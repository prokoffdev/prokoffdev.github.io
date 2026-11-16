import { ContentPanel } from '../ui/ContentPanel.js';

export const VideoPhase = Object.freeze({
  CODING: 'CODING',       // 0.0s - 2.85s (ambient coding loop: pure typing, locked tripod camera)
  CAT_REACT: 'CAT_REACT', // 1.9s - 8.0s (cat wakes up, glowing blue LED eyes, stretches, sits upright alert)
  COFFEE: 'COFFEE',       // 2.9s - 6.9s (Oleg reaches for DEV mug on desk, takes sip, puts back down)
  BUILD: 'BUILD',         // compilation / opening projects
  RELAX: 'RELAX',         // developer profile / about me
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
    this.catPhase = 'SLEEP'; // 'SLEEP' | 'WAKE' | 'ALERT'
    
    // Video elements
    this.devVideoEl = null;
    this.catVideoEl = null;
    this.videoEl = null; // Alias to devVideoEl for backward compatibility

    // Overlays & HUD
    this.devOverlayEl = null;
    this.catOverlayEl = null;
    this.overlayEl = null;
    this.hudEl = null;
    this.toastEl = null;
    this.contentPanel = null;

    this.isMuted = true;
    this.toastTimeout = null;
    this.pendingModal = null;
    this.devFrameCallbackId = null;
    this.catFrameCallbackId = null;

    this.boundDevTimeUpdate = this.handleDevTimeUpdate.bind(this);
    this.boundCatTimeUpdate = this.handleCatTimeUpdate.bind(this);
    this.boundDevFrameCheck = this.handleDevFrameCheck.bind(this);
    this.boundCatFrameCheck = this.handleCatFrameCheck.bind(this);

    this.init();
  }

  init() {
    if (!this.container || typeof document === 'undefined') return;

    this.container.innerHTML = '';
    this.container.className = 'living-studio-container split-cockpit-layout';

    // Top Global HUD (Audio, Mode Toggle, Profile quicklink)
    this.createGlobalHud();

    // Main Cockpit Grid Wrapper
    const gridWrapper = document.createElement('div');
    gridWrapper.className = 'cockpit-grid-wrapper';

    // 1. LEFT COLUMN: Developer Workstation (16:9 video + Bottom Console HUD)
    const devCol = document.createElement('div');
    devCol.className = 'cockpit-col cockpit-col-dev';

    const devVideoWrapper = document.createElement('div');
    devVideoWrapper.className = 'cockpit-video-box dev-video-box';

    this.devVideoEl = document.createElement('video');
    this.devVideoEl.className = 'living-studio-video dev-video';
    this.devVideoEl.autoplay = true;
    this.devVideoEl.muted = true;
    this.devVideoEl.loop = false;
    this.devVideoEl.playsInline = true;
    this.devVideoEl.setAttribute('playsinline', '');
    this.devVideoEl.setAttribute('webkit-playsinline', '');
    this.devVideoEl.poster = 'assets/video/studio_dev_poster.jpg';
    this.devVideoEl.preload = 'auto';

    const devWebm = document.createElement('source');
    devWebm.src = 'assets/video/studio_dev.webm';
    devWebm.type = 'video/webm';

    const devMp4 = document.createElement('source');
    devMp4.src = 'assets/video/studio_dev.mp4';
    devMp4.type = 'video/mp4';

    this.devVideoEl.appendChild(devWebm);
    this.devVideoEl.appendChild(devMp4);
    devVideoWrapper.appendChild(this.devVideoEl);

    // Overlay for Developer Hotspots
    this.devOverlayEl = document.createElement('div');
    this.devOverlayEl.className = 'living-studio-overlay dev-overlay';
    this.createDevHotspots();
    devVideoWrapper.appendChild(this.devOverlayEl);

    // Badge
    const devBadge = document.createElement('div');
    devBadge.className = 'cockpit-badge dev-badge';
    devBadge.innerHTML = '<span class=\"badge-dot live\"></span> OLEG // LEAD DEV WORKSTATION';
    devVideoWrapper.appendChild(devBadge);

    devCol.appendChild(devVideoWrapper);

    // Dev Cockpit Console HUD (Directly beneath 16:9 video)
    const consoleHud = this.createConsoleHud();
    devCol.appendChild(consoleHud);

    gridWrapper.appendChild(devCol);

    // 2. RIGHT COLUMN: Robo-Cat Companion Terminal (9:16 vertical stream)
    const catCol = document.createElement('div');
    catCol.className = 'cockpit-col cockpit-col-cat';

    const catVideoWrapper = document.createElement('div');
    catVideoWrapper.className = 'cockpit-video-box cat-video-box';

    this.catVideoEl = document.createElement('video');
    this.catVideoEl.className = 'living-studio-video cat-video';
    this.catVideoEl.autoplay = true;
    this.catVideoEl.muted = true;
    this.catVideoEl.loop = false;
    this.catVideoEl.playsInline = true;
    this.catVideoEl.setAttribute('playsinline', '');
    this.catVideoEl.setAttribute('webkit-playsinline', '');
    this.catVideoEl.poster = 'assets/video/studio_cat_poster.jpg';
    this.catVideoEl.preload = 'auto';

    const catWebm = document.createElement('source');
    catWebm.src = 'assets/video/studio_cat.webm';
    catWebm.type = 'video/webm';

    const catMp4 = document.createElement('source');
    catMp4.src = 'assets/video/studio_cat.mp4';
    catMp4.type = 'video/mp4';

    this.catVideoEl.appendChild(catWebm);
    this.catVideoEl.appendChild(catMp4);
    catVideoWrapper.appendChild(this.catVideoEl);

    // Overlay for Cat Hotspots
    this.catOverlayEl = document.createElement('div');
    this.catOverlayEl.className = 'living-studio-overlay cat-overlay';
    this.createCatHotspots();
    catVideoWrapper.appendChild(this.catOverlayEl);

    // Badge
    const catBadge = document.createElement('div');
    catBadge.className = 'cockpit-badge cat-badge';
    catBadge.innerHTML = '<span class=\"badge-dot cyan\"></span> NEOW-11 // AI AGENT DOCK';
    catVideoWrapper.appendChild(catBadge);

    // Cat Quick Action Floating Buttons
    const catActions = document.createElement('div');
    catActions.className = 'cat-floating-actions';
    
    const petCatBtn = document.createElement('button');
    petCatBtn.className = 'cat-quick-btn';
    petCatBtn.innerHTML = '🐱 Погладить';
    petCatBtn.addEventListener('click', () => this.triggerCat());

    const askAiBtn = document.createElement('button');
    askAiBtn.className = 'cat-quick-btn';
    askAiBtn.innerHTML = '🤖 Спросить AI';
    askAiBtn.addEventListener('click', () => this.contentPanel.open('assistant-help'));

    catActions.appendChild(petCatBtn);
    catActions.appendChild(askAiBtn);
    catVideoWrapper.appendChild(catActions);

    catCol.appendChild(catVideoWrapper);
    gridWrapper.appendChild(catCol);

    this.container.appendChild(gridWrapper);

    // Alias for backward compatibility
    this.videoEl = this.devVideoEl;
    this.overlayEl = this.devOverlayEl;

    // Toast Notification Element
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

    // Event Listeners for Video Loops
    this.devVideoEl.addEventListener('timeupdate', this.boundDevTimeUpdate);
    this.catVideoEl.addEventListener('timeupdate', this.boundCatTimeUpdate);
    this.startFrameLoops();

    // Initial Play
    this.devVideoEl.play().catch(() => {});
    this.catVideoEl.play().catch(() => {});
  }

  createDevHotspots() {
    const hotspots = [
      {
        id: 'hotspot-dev-window',
        label: '🌆 Дождливый Нео-Токио (Звуки города)',
        style: { left: '2.0%', top: '2.0%', width: '36.0%', height: '48.0%' },
        action: () => {
          this.toggleSound();
          this.showToast('🌆 Санкт-Петербург / Нео-Токио • За окном дождь, в терминале чистый код');
        },
      },
      {
        id: 'hotspot-dev-monitors',
        label: '🚀 Проекты & Репозитории',
        style: { left: '38.0%', top: '22.0%', width: '42.0%', height: '44.0%' },
        action: () => this.triggerBuild('projects'),
      },
      {
        id: 'hotspot-dev-oleg',
        label: '👤 Олег (Обо мне)',
        style: { left: '2.0%', top: '22.0%', width: '36.0%', height: '76.0%' },
        action: () => this.triggerRelax(),
      },
      {
        id: 'hotspot-dev-coffee',
        label: '☕ Выпить кофе DEV',
        style: { left: '60.0%', top: '64.0%', width: '15.0%', height: '26.0%' },
        action: () => this.triggerCoffee(),
      },
      {
        id: 'hotspot-dev-pc',
        label: '⚡ Стек технологий (RGB Rig)',
        style: { left: '80.0%', top: '24.0%', width: '19.0%', height: '65.0%' },
        action: () => this.triggerHologram('skills'),
      },
    ];

    this.mountHotspots(this.devOverlayEl, hotspots);
  }

  createCatHotspots() {
    const hotspots = [
      {
        id: 'hotspot-cat-body',
        label: '🐱 Погладить NEOW-11',
        style: { left: '8.0%', top: '30.0%', width: '84.0%', height: '52.0%' },
        action: () => this.triggerCat(),
      },
      {
        id: 'hotspot-cat-ai',
        label: '🤖 AI Боты & Автоматизации',
        style: { left: '52.0%', top: '5.0%', width: '46.0%', height: '40.0%' },
        action: () => {
          this.showToast('🤖 Нейросетевой хаб: Чат-боты, парсеры и AI агенты готовы к работе');
          this.contentPanel.open('assistant-help');
        },
      },
      {
        id: 'hotspot-cat-dock',
        label: '⚡ Магнитная док-станция',
        style: { left: '8.0%', top: '72.0%', width: '84.0%', height: '22.0%' },
        action: () => {
          this.showToast('⚡ Док-станция активна • Батарея NEOW-11: 100% • Все системы в норме');
        },
      },
    ];

    this.mountHotspots(this.catOverlayEl, hotspots);
  }

  mountHotspots(container, list) {
    list.forEach((h) => {
      const el = document.createElement('div');
      el.className = `living-hotspot ${h.id}`;
      Object.assign(el.style, h.style);
      el.setAttribute('tabindex', '0');
      el.setAttribute('role', 'button');
      el.setAttribute('aria-label', h.label);

      const radar = document.createElement('div');
      radar.className = 'living-hotspot-radar';
      el.appendChild(radar);

      const label = document.createElement('span');
      label.className = 'living-hotspot-label';
      label.textContent = h.label;
      el.appendChild(label);

      el.addEventListener('click', (e) => {
        e.stopPropagation();
        h.action();
      });

      el.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          h.action();
        }
      });

      container.appendChild(el);
    });
  }

  createGlobalHud() {
    this.hudEl = document.createElement('div');
    this.hudEl.className = 'living-studio-hud';

    const leftTitle = document.createElement('div');
    leftTitle.className = 'living-hud-title';
    leftTitle.innerHTML = '⚡ CYBERPUNK DUAL-STUDIO // <span class=\"text-cyan\">LIVE WORKSPACE</span>';

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

  createConsoleHud() {
    const bar = document.createElement('div');
    bar.className = 'cockpit-console-hud';

    const actions = document.createElement('div');
    actions.className = 'console-hud-actions';

    const coffeeBtn = this.createHudButton('☕ Выпить кофе', () => this.triggerCoffee());
    const buildBtn = this.createHudButton('🚀 Проекты', () => this.triggerBuild('projects'));
    const stackBtn = this.createHudButton('⚡ Стек технологий', () => this.triggerHologram('skills'));
    const profileBtn = this.createHudButton('👤 Обо мне', () => this.triggerRelax());
    const contactBtn = this.createHudButton('📬 Контакты', () => this.contentPanel.open('contacts'));

    actions.appendChild(coffeeBtn);
    actions.appendChild(buildBtn);
    actions.appendChild(stackBtn);
    actions.appendChild(profileBtn);
    actions.appendChild(contactBtn);

    const diagnostics = document.createElement('div');
    diagnostics.className = 'console-hud-diag';
    diagnostics.innerHTML = `
      <div class="diag-item"><span class="diag-label">SYSTEM:</span> <span class="diag-val cyan">READY</span></div>
      <div class="diag-item"><span class="diag-label">IDE:</span> <span class="diag-val">ACTIVE</span></div>
      <div class="diag-item"><span class="diag-label">COMPANION:</span> <span class="diag-val pink">NEOW-11 CONNECTED</span></div>
    `;

    bar.appendChild(actions);
    bar.appendChild(diagnostics);
    return bar;
  }

  createHudButton(text, onClick) {
    const btn = document.createElement('button');
    btn.className = 'console-hud-btn';
    btn.textContent = text;
    btn.addEventListener('click', onClick);
    return btn;
  }

  startFrameLoops() {
    if (typeof window === 'undefined') return;

    const devLoop = () => {
      this.handleDevFrameCheck();
      if (!this.devVideoEl) return;
      if ('requestVideoFrameCallback' in this.devVideoEl) {
        this.devFrameCallbackId = this.devVideoEl.requestVideoFrameCallback(devLoop);
      } else if (typeof requestAnimationFrame !== 'undefined') {
        this.devFrameCallbackId = requestAnimationFrame(devLoop);
      }
    };

    if (this.devVideoEl) {
      if ('requestVideoFrameCallback' in this.devVideoEl) {
        this.devFrameCallbackId = this.devVideoEl.requestVideoFrameCallback(devLoop);
      } else if (typeof requestAnimationFrame !== 'undefined') {
        this.devFrameCallbackId = requestAnimationFrame(devLoop);
      }
    }

    const catLoop = () => {
      this.handleCatFrameCheck();
      if (!this.catVideoEl) return;
      if ('requestVideoFrameCallback' in this.catVideoEl) {
        this.catFrameCallbackId = this.catVideoEl.requestVideoFrameCallback(catLoop);
      } else if (typeof requestAnimationFrame !== 'undefined') {
        this.catFrameCallbackId = requestAnimationFrame(catLoop);
      }
    };

    if (this.catVideoEl) {
      if ('requestVideoFrameCallback' in this.catVideoEl) {
        this.catFrameCallbackId = this.catVideoEl.requestVideoFrameCallback(catLoop);
      } else if (typeof requestAnimationFrame !== 'undefined') {
        this.catFrameCallbackId = requestAnimationFrame(catLoop);
      }
    }
  }

  handleDevFrameCheck() {
    if (!this.devVideoEl) return;
    const t = this.devVideoEl.currentTime;

    switch (this.phase) {
      case VideoPhase.CODING:
        // Seamless loop of pure typing before reaching coffee segment
        if (t >= 2.85) {
          this.devVideoEl.currentTime = 0.05;
        }
        break;

      case VideoPhase.COFFEE:
        // Coffee sip plays from 2.9s to 6.9s, then returns to typing
        if (t >= 6.85) {
          this.playCodingLoop();
        }
        break;

      case VideoPhase.BUILD:
        if (t >= 2.85) {
          this.devVideoEl.currentTime = 0.05;
        }
        break;

      case VideoPhase.RELAX:
        if (t >= 2.85) {
          this.devVideoEl.currentTime = 0.05;
        }
        break;
    }
  }

  handleCatFrameCheck() {
    if (!this.catVideoEl) return;
    const t = this.catVideoEl.currentTime;

    if (this.catPhase === 'SLEEP') {
      // Cat sleeping on dock: loops 0.05s to 1.85s
      if (t >= 1.85) {
        this.catVideoEl.currentTime = 0.05;
      }
    } else if (this.catPhase === 'WAKE') {
      // Cat waking up & stretching alert (1.9s to 8.0s)
      if (t >= 7.95) {
        this.catPhase = 'ALERT';
      }
    } else if (this.catPhase === 'ALERT') {
      // Loop alert companion breathing (7.5s to 9.95s)
      if (t >= 9.90) {
        this.catVideoEl.currentTime = 7.50;
      }
    }
  }

  handleDevTimeUpdate() {
    this.handleDevFrameCheck();
  }

  handleCatTimeUpdate() {
    this.handleCatFrameCheck();
  }

  // Alias for backward compatibility in test suites
  handleTimeUpdate() {
    this.handleDevFrameCheck();
    this.handleCatFrameCheck();
  }

  playCodingLoop() {
    this.phase = VideoPhase.CODING;
    if (!this.devVideoEl) return;
    this.devVideoEl.currentTime = 0.05;
    this.devVideoEl.play().catch(() => {});
  }

  triggerCoffee() {
    this.phase = VideoPhase.COFFEE;
    this.showToast('☕ Олег берет кружку DEV со стола, делает глоток кофе и возвращается к коду');
    if (!this.devVideoEl) return;
    this.devVideoEl.currentTime = 2.90;
    this.devVideoEl.play().catch(() => {});
  }

  triggerBuild(target = 'projects') {
    this.phase = VideoPhase.BUILD;
    this.pendingModal = target;
    this.showToast('🚀 Компиляция проектов: Сборка Vite успешна, тесты пройдены!');
    if (this.contentPanel) {
      this.contentPanel.open(target);
    }
  }

  triggerHologram(target = 'skills') {
    this.phase = VideoPhase.BUILD;
    this.pendingModal = target;
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

  triggerCat() {
    this.catPhase = 'WAKE';
    this.showToast('🐱 NEOW-11 просыпается, синие LED глаза активируются! Робо-кот готов помочь');
    if (!this.catVideoEl) return;
    this.catVideoEl.currentTime = 1.90;
    this.catVideoEl.play().catch(() => {});
  }

  toggleSound() {
    this.isMuted = !this.isMuted;
    if (this.devVideoEl) {
      this.devVideoEl.muted = this.isMuted;
      if (!this.isMuted) {
        this.devVideoEl.volume = 0.8;
        this.devVideoEl.play().catch(() => {});
      }
    }
    if (this.catVideoEl) {
      this.catVideoEl.muted = this.isMuted;
      if (!this.isMuted) {
        this.catVideoEl.volume = 0.5;
        this.catVideoEl.play().catch(() => {});
      }
    }
    if (this.soundBtn) {
      this.soundBtn.innerHTML = this.isMuted ? '🔇' : '🔊';
      this.soundBtn.setAttribute('title', this.isMuted ? 'Включить звук студии' : 'Выключить звук студии');
    }
    this.showToast(this.isMuted ? '🔇 Звук выключен' : '🔊 Звук включен (дождь за окном, клавиатура и кибер-студия)');
  }

  showToast(message) {
    if (!this.toastEl) return;
    if (this.toastTimeout) {
      clearTimeout(this.toastTimeout);
    }
    this.toastEl.textContent = message;
    this.toastEl.classList.add('is-visible');

    this.toastTimeout = setTimeout(() => {
      this.toastEl.classList.remove('is-visible');
    }, 3000);
  }

  destroy() {
    if (this.devFrameCallbackId && this.devVideoEl) {
      if ('cancelVideoFrameCallback' in this.devVideoEl) {
        this.devVideoEl.cancelVideoFrameCallback(this.devFrameCallbackId);
      } else if (typeof cancelAnimationFrame !== 'undefined') {
        cancelAnimationFrame(this.devFrameCallbackId);
      }
      this.devFrameCallbackId = null;
    }
    if (this.catFrameCallbackId && this.catVideoEl) {
      if ('cancelVideoFrameCallback' in this.catVideoEl) {
        this.catVideoEl.cancelVideoFrameCallback(this.catFrameCallbackId);
      } else if (typeof cancelAnimationFrame !== 'undefined') {
        cancelAnimationFrame(this.catFrameCallbackId);
      }
      this.catFrameCallbackId = null;
    }
    if (this.devVideoEl) {
      this.devVideoEl.removeEventListener('timeupdate', this.boundDevTimeUpdate);
      this.devVideoEl.pause();
      this.devVideoEl.src = '';
    }
    if (this.catVideoEl) {
      this.catVideoEl.removeEventListener('timeupdate', this.boundCatTimeUpdate);
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
