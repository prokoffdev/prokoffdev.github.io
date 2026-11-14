import { ContentPanel } from '../ui/ContentPanel.js';

export const VideoPhase = Object.freeze({
  CODING: 'CODING',       // 0.0s - 3.8s (ambient coding loop)
  COFFEE: 'COFFEE',       // 0.0s - 3.8s (coffee break toast & focus)
  BUILD: 'BUILD',         // 3.85s - 5.8s (compile & green terminal screen)
  RELAX: 'RELAX',         // 5.85s - 7.4s (success stretch & hands behind head)
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
    this.videoEl = null;
    this.overlayEl = null;
    this.hudEl = null;
    this.toastEl = null;
    this.contentPanel = null;
    this.isMuted = true;
    this.toastTimeout = null;
    this.boundTimeUpdate = this.handleTimeUpdate.bind(this);

    this.init();
  }

  init() {
    if (!this.container || typeof document === 'undefined') return;

    this.container.innerHTML = '';
    this.container.className = 'living-studio-container';

    // 1. Video Element
    this.videoEl = document.createElement('video');
    this.videoEl.className = 'living-studio-video';
    this.videoEl.autoplay = true;
    this.videoEl.muted = true;
    this.videoEl.loop = false; // We handle custom phase looping
    this.videoEl.playsInline = true;
    this.videoEl.setAttribute('playsinline', '');
    this.videoEl.setAttribute('webkit-playsinline', '');
    this.videoEl.poster = 'assets/video/studio_poster.jpg';
    this.videoEl.preload = 'auto';

    // WebM primary, MP4 fallback
    const sourceWebM = document.createElement('source');
    sourceWebM.src = 'assets/video/studio_living.webm';
    sourceWebM.type = 'video/webm';

    const sourceMP4 = document.createElement('source');
    sourceMP4.src = 'assets/video/studio_living.mp4';
    sourceMP4.type = 'video/mp4';

    this.videoEl.appendChild(sourceWebM);
    this.videoEl.appendChild(sourceMP4);
    this.container.appendChild(this.videoEl);

    // 2. Interactive Hotspot Overlay
    this.overlayEl = document.createElement('div');
    this.overlayEl.className = 'living-studio-overlay';
    this.createHotspots();
    this.container.appendChild(this.overlayEl);

    // 3. HUD Bar
    this.createHud();

    // 4. Toast Notification
    this.toastEl = document.createElement('div');
    this.toastEl.className = 'living-studio-toast';
    this.container.appendChild(this.toastEl);

    // 5. Shared ContentPanel
    this.contentPanel = new ContentPanel(this.container, {
      onClose: () => {
        // Return to active coding loop on modal close
        if (this.phase === VideoPhase.RELAX || this.phase === VideoPhase.BUILD) {
          this.playCodingLoop();
        }
      },
    });

    // 6. Event Listeners
    this.videoEl.addEventListener('timeupdate', this.boundTimeUpdate);

    // Initial play trigger
    this.videoEl.play().catch(() => {
      // Autoplay with muted fallback
      this.videoEl.muted = true;
      this.videoEl.play().catch(() => {});
    });
  }

  createHotspots() {
    const hotspots = [
      {
        id: 'hotspot-coffee',
        label: '☕ Выпить кофе',
        style: { left: '65.5%', top: '48.5%', width: '6%', height: '9%' },
        action: () => this.triggerCoffee(),
      },
      {
        id: 'hotspot-monitors',
        label: '🚀 Проекты & Билд',
        style: { left: '50.5%', top: '24.5%', width: '19%', height: '24%' },
        action: () => this.triggerBuild(),
      },
      {
        id: 'hotspot-oleg',
        label: '👤 Олег (Обо мне)',
        style: { left: '46.5%', top: '34.5%', width: '14%', height: '39%' },
        action: () => this.triggerRelax(),
      },
      {
        id: 'hotspot-cat',
        label: '🐱 Робо-кот',
        style: { left: '33%', top: '69%', width: '13%', height: '16%' },
        action: () => this.triggerCat(),
      },
      {
        id: 'hotspot-window',
        label: '🌆 Окно в город',
        style: { left: '16.5%', top: '16.5%', width: '16%', height: '30%' },
        action: () => this.showToast('🌆 Санкт-Петербург • Киберпанк-вечер • Код пишется без остановки'),
      },
      {
        id: 'hotspot-hologram',
        label: '🌐 Стек технологий',
        style: { left: '79%', top: '48%', width: '9%', height: '15%' },
        action: () => {
          this.showToast('🌐 Голографический процессор: React, TypeScript, Node.js, WebGL');
          setTimeout(() => this.contentPanel.open('skills'), 400);
        },
      },
    ];

    hotspots.forEach((h) => {
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

      this.overlayEl.appendChild(el);
    });
  }

  createHud() {
    this.hudEl = document.createElement('div');
    this.hudEl.className = 'living-studio-hud';

    // Left Action Pills
    const actions = document.createElement('div');
    actions.className = 'living-hud-actions';

    const coffeeBtn = this.createHudButton('☕ Кофе', () => this.triggerCoffee());
    const buildBtn = this.createHudButton('🚀 Билд & Проекты', () => this.triggerBuild());
    const profileBtn = this.createHudButton('👤 Обо мне', () => this.triggerRelax());
    const catBtn = this.createHudButton('🐱 Спросить кота', () => this.triggerCat());

    actions.appendChild(coffeeBtn);
    actions.appendChild(buildBtn);
    actions.appendChild(profileBtn);
    actions.appendChild(catBtn);

    // Right Controls
    const controls = document.createElement('div');
    controls.className = 'living-hud-controls';

    // Sound toggle
    this.soundBtn = document.createElement('button');
    this.soundBtn.className = 'living-hud-btn living-hud-btn-sound';
    this.soundBtn.innerHTML = '🔇';
    this.soundBtn.setAttribute('title', 'Включить атмосферный звук студии');
    this.soundBtn.addEventListener('click', () => this.toggleSound());
    controls.appendChild(this.soundBtn);

    // Mode Switcher (Optionally toggle to Phaser 2.5D Canvas)
    if (typeof this.options.onSwitchMode === 'function') {
      const modeBtn = document.createElement('button');
      modeBtn.className = 'living-hud-btn living-hud-btn-mode';
      modeBtn.innerHTML = '🎮 2.5D Холст';
      modeBtn.setAttribute('title', 'Переключить в режим интерактивной комнаты');
      modeBtn.addEventListener('click', () => this.options.onSwitchMode());
      controls.appendChild(modeBtn);
    }

    this.hudEl.appendChild(actions);
    this.hudEl.appendChild(controls);
    this.container.appendChild(this.hudEl);
  }

  createHudButton(text, onClick) {
    const btn = document.createElement('button');
    btn.className = 'living-hud-btn';
    btn.textContent = text;
    btn.addEventListener('click', onClick);
    return btn;
  }

  handleTimeUpdate() {
    if (!this.videoEl) return;
    const t = this.videoEl.currentTime;

    switch (this.phase) {
      case VideoPhase.CODING:
      case VideoPhase.COFFEE:
        // Seamless loop between 0.0s and 3.8s
        if (t >= 3.8) {
          this.videoEl.currentTime = 0.05;
        }
        break;

      case VideoPhase.BUILD:
        // Code compiles from 3.85s to 5.8s (green terminal screen)
        if (t >= 5.8) {
          this.contentPanel.open('projects');
          this.videoEl.pause();
        }
        break;

      case VideoPhase.RELAX:
        // Oleg relaxes with hands behind head from 5.85s to 7.35s
        if (t >= 7.35) {
          this.videoEl.pause();
          this.contentPanel.open('about');
        }
        break;
    }
  }

  playCodingLoop() {
    this.phase = VideoPhase.CODING;
    if (!this.videoEl) return;
    this.videoEl.currentTime = 0.05;
    this.videoEl.play().catch(() => {});
  }

  triggerCoffee() {
    this.phase = VideoPhase.COFFEE;
    this.showToast('☕ Кофе заварен: Олег делает глоток и анализирует архитектуру');
    if (!this.videoEl) return;
    this.videoEl.play().catch(() => {});
  }

  triggerBuild() {
    this.phase = VideoPhase.BUILD;
    this.showToast('🚀 Запуск компиляции: Тесты 100% PASS, билд успешен!');
    if (!this.videoEl) return;
    this.videoEl.currentTime = 3.85;
    this.videoEl.play().catch(() => {});
  }

  triggerRelax() {
    this.phase = VideoPhase.RELAX;
    this.showToast('🧘 Все задачи закрыты! Олег отдыхает и готов к новым вызовам');
    if (!this.videoEl) return;
    this.videoEl.currentTime = 5.85;
    this.videoEl.play().catch(() => {});
  }

  triggerCat() {
    this.showToast('🐱 Робо-кот: мурлычет во сне и генерирует голографические подсказки');
    this.contentPanel.open('assistant-help');
  }

  toggleSound() {
    if (!this.videoEl) return;
    this.isMuted = !this.isMuted;
    this.videoEl.muted = this.isMuted;
    if (this.soundBtn) {
      this.soundBtn.innerHTML = this.isMuted ? '🔇' : '🔊';
      this.soundBtn.setAttribute('title', this.isMuted ? 'Включить звук студии' : 'Выключить звук студии');
    }
    this.showToast(this.isMuted ? '🔇 Звук студии выключен' : '🔊 Звук студии включен (эмбиент клавиш и дождя)');
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
    }, 2800);
  }

  destroy() {
    if (this.videoEl) {
      this.videoEl.removeEventListener('timeupdate', this.boundTimeUpdate);
      this.videoEl.pause();
      this.videoEl.src = '';
    }
    if (this.contentPanel) {
      this.contentPanel.close();
    }
    if (this.container) {
      this.container.innerHTML = '';
    }
  }
}
