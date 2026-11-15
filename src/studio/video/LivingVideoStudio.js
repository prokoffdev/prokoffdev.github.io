import { ContentPanel } from '../ui/ContentPanel.js';

export const VideoPhase = Object.freeze({
  CODING: 'CODING',       // 0.0s - 3.5s (ambient coding loop: pure typing, locked tripod camera)
  CAT_REACT: 'CAT_REACT', // 3.5s - 6.5s (cat wake & pet: stretches, glowing cyan LED eyes, wags tail, curls back to sleep)
  COFFEE: 'COFFEE',       // 6.5s - 10.0s (Oleg reaches for mug on desk, takes sip, puts back down)
  BUILD: 'BUILD',         // 10.0s - 13.0s (holographic globe spins with glowing cyber grid & tech stack)
  RELAX: 'RELAX',         // success & developer profile
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
    this.pendingModal = null;
    this.frameCallbackId = null;
    this.boundTimeUpdate = this.handleTimeUpdate.bind(this);
    this.boundFrameCheck = this.handleFrameCheck.bind(this);

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
    this.startFrameLoop();

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
        style: { left: '70.3%', top: '37.3%', width: '4.2%', height: '8.5%' },
        action: () => this.triggerCoffee(),
      },
      {
        id: 'hotspot-monitors',
        label: '🚀 Проекты & Билд',
        style: { left: '52.0%', top: '14.0%', width: '17.5%', height: '22.0%' },
        action: () => this.triggerBuild('projects'),
      },
      {
        id: 'hotspot-oleg',
        label: '👤 Олег (Обо мне)',
        style: { left: '49.0%', top: '23.5%', width: '10.0%', height: '37.5%' },
        action: () => this.triggerRelax(),
      },
      {
        id: 'hotspot-cat',
        label: '🐱 Погладить робо-кота',
        style: { left: '33.5%', top: '65.0%', width: '12.5%', height: '23.5%' },
        action: () => this.triggerCat(),
      },
      {
        id: 'hotspot-window',
        label: '🌆 Окно в город',
        style: { left: '21.0%', top: '4.8%', width: '11.8%', height: '27.0%' },
        action: () => this.showToast('🌆 Санкт-Петербург • Киберпанк-вечер • Код пишется без остановки'),
      },
      {
        id: 'hotspot-hologram',
        label: '🌐 Стек технологий',
        style: { left: '87.0%', top: '30.0%', width: '8.0%', height: '20.5%' },
        action: () => this.triggerHologram('skills'),
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

  startFrameLoop() {
    if (!this.videoEl || typeof window === 'undefined') return;
    const loop = () => {
      this.handleFrameCheck();
      if (!this.videoEl) return;
      if ('requestVideoFrameCallback' in this.videoEl) {
        this.frameCallbackId = this.videoEl.requestVideoFrameCallback(loop);
      } else if (typeof requestAnimationFrame !== 'undefined') {
        this.frameCallbackId = requestAnimationFrame(loop);
      }
    };
    if ('requestVideoFrameCallback' in this.videoEl) {
      this.frameCallbackId = this.videoEl.requestVideoFrameCallback(loop);
    } else if (typeof requestAnimationFrame !== 'undefined') {
      this.frameCallbackId = requestAnimationFrame(loop);
    }
  }

  handleFrameCheck() {
    if (!this.videoEl) return;
    const t = this.videoEl.currentTime;

    switch (this.phase) {
      case VideoPhase.CODING:
        // Seamless loop before reaching cat segment boundary at 3.5s
        if (t >= 3.45) {
          this.videoEl.currentTime = 0.05;
        }
        break;

      case VideoPhase.CAT_REACT:
        // Cat reaction completes cleanly at 6.45s and returns to typing
        if (t >= 6.45) {
          this.playCodingLoop();
          this.contentPanel.open('assistant-help');
        }
        break;

      case VideoPhase.COFFEE:
        // Oleg drinks coffee from 6.5s to 10.0s, puts mug back on desk, returns to typing
        if (t >= 9.95) {
          this.playCodingLoop();
        }
        break;

      case VideoPhase.BUILD:
        // Holographic globe spins from 10.0s to 13.0s
        if (t >= 12.95) {
          this.playCodingLoop();
          const target = this.pendingModal || 'projects';
          this.pendingModal = null;
          this.contentPanel.open(target);
        }
        break;
    }
  }

  handleTimeUpdate() {
    this.handleFrameCheck();
  }

  playCodingLoop() {
    this.phase = VideoPhase.CODING;
    if (!this.videoEl) return;
    this.videoEl.currentTime = 0.05;
    this.videoEl.play().catch(() => {});
  }

  triggerCoffee() {
    this.phase = VideoPhase.COFFEE;
    this.showToast('☕ Кофе заварен: Олег берет кружку со стола, делает глоток и возвращается к коду');
    if (!this.videoEl) return;
    this.videoEl.currentTime = 6.52;
    this.videoEl.play().catch(() => {});
  }

  triggerBuild(target = 'projects') {
    this.phase = VideoPhase.BUILD;
    this.pendingModal = target;
    this.showToast('🚀 Запуск компиляции: Голограмма проектов активна, билд успешен!');
    if (!this.videoEl) return;
    this.videoEl.currentTime = 10.02;
    this.videoEl.play().catch(() => {});
  }

  triggerHologram(target = 'skills') {
    this.phase = VideoPhase.BUILD;
    this.pendingModal = target;
    this.showToast('🌐 Голографический процессор: React, TypeScript, Node.js, WebGL');
    if (!this.videoEl) return;
    this.videoEl.currentTime = 10.02;
    this.videoEl.play().catch(() => {});
  }

  triggerRelax() {
    this.phase = VideoPhase.RELAX;
    this.showToast('🧘 Все задачи закрыты! Олег отдыхает и готов к новым вызовам');
    this.contentPanel.open('about');
  }

  triggerCat() {
    this.phase = VideoPhase.CAT_REACT;
    this.showToast('🐱 Мурр! Робо-кот потягивается, открывает глаза и мурлычет');
    if (!this.videoEl) return;
    this.videoEl.currentTime = 3.52;
    this.videoEl.play().catch(() => {});
  }

  toggleSound() {
    if (!this.videoEl) return;
    this.isMuted = !this.isMuted;
    this.videoEl.muted = this.isMuted;
    if (!this.isMuted) {
      this.videoEl.volume = 1.0;
      this.videoEl.play().catch(() => {});
    }
    if (this.soundBtn) {
      this.soundBtn.innerHTML = this.isMuted ? '🔇' : '🔊';
      this.soundBtn.setAttribute('title', this.isMuted ? 'Включить звук студии' : 'Выключить звук студии');
    }
    this.showToast(this.isMuted ? '🔇 Звук студии выключен' : '🔊 Звук студии включен (эмбиент клавиш и студии)');
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
    if (this.frameCallbackId && this.videoEl) {
      if ('cancelVideoFrameCallback' in this.videoEl) {
        this.videoEl.cancelVideoFrameCallback(this.frameCallbackId);
      } else if (typeof cancelAnimationFrame !== 'undefined') {
        cancelAnimationFrame(this.frameCallbackId);
      }
      this.frameCallbackId = null;
    }
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
