import { InteractionMode } from '../interactions/InteractionRouter.js';

export class StudioHud {
  /**
   * @param {HTMLElement} mountContainer
   * @param {object} [callbacks]
   * @param {Function} [callbacks.onModeChange]
   * @param {Function} [callbacks.onOpenPanel]
   * @param {Function} [callbacks.onResetCamera]
   */
  constructor(mountContainer, callbacks = {}) {
    this.mountContainer = mountContainer;
    this.callbacks = callbacks;
    this.currentMode = InteractionMode.QUICK_VIEW;
    this.hudEl = null;
    this.isCardDismissed = false;

    this.render();
  }

  render() {
    if (!this.mountContainer || typeof document === 'undefined') return;

    let existing = this.mountContainer.querySelector('.studio-hud-root');
    if (existing) existing.remove();

    this.hudEl = document.createElement('div');
    this.hudEl.className = 'studio-hud-root';

    this.hudEl.innerHTML = `
      <!-- Top Header -->
      <div class="studio-hud-header">
        <div class="studio-hud-brand">
          <span class="studio-hud-logo">prokoff<span>dev</span></span>
          <span class="studio-hud-tagline">Живая интерактивная диорама</span>
        </div>

        <div class="studio-hud-nav" role="navigation" aria-label="Быстрый переход">
          <button type="button" class="studio-hud-pill" data-nav-action="projects">
            <span>💻 Проекты</span>
          </button>
          <button type="button" class="studio-hud-pill" data-nav-action="about">
            <span>👤 Обо мне & Стек</span>
          </button>
          <button type="button" class="studio-hud-pill" data-nav-action="assistant-help">
            <span>🐱 Робо-кот</span>
          </button>
          <button type="button" class="studio-hud-pill" data-nav-action="contact">
            <span>✉️ Связь</span>
          </button>
        </div>
      </div>

      <!-- Quick View Hint -->
      <div class="studio-quickview-hint">
        Нажмите на любой предмет в комнате, чтобы узнать больше
      </div>

      <!-- Interactive Character Greeting Card (Refined Stage 6.2 UI) -->
      <div class="studio-character-card" id="studio-character-card">
        <div class="studio-card-avatar-wrap">
          <img src="/assets/sprites/oleg_face_badge.png" class="studio-card-avatar" alt="Олег Прокофьев" />
          <span class="studio-avatar-online" title="В сети"></span>
        </div>
        <div class="studio-card-body">
          <div class="studio-card-top">
            <div class="studio-card-author">
              <span class="studio-card-name">Олег Прокофьев</span>
              <span class="studio-card-role">Full-Stack & Systems Engineer</span>
            </div>
            <button type="button" class="studio-card-close" id="studio-card-close-btn" aria-label="Скрыть карточку" title="Скрыть карточку">✕</button>
          </div>
          <p class="studio-card-msg">
            Привет! Я Олег. Разрабатываю масштабируемые веб-сервисы, архитектуру баз данных и интерактивные системы. Нажимайте на мониторы, рабочее место или спящего робо-кота!
          </p>
          <div class="studio-card-chips">
            <button type="button" class="studio-card-chip" data-chip-action="projects">💻 Проекты</button>
            <button type="button" class="studio-card-chip" data-chip-action="resume">👤 Обо мне & Стек</button>
            <button type="button" class="studio-card-chip" data-chip-action="cat">🐱 Спросить робо-кота</button>
            <button type="button" class="studio-card-chip" data-chip-action="contact">✉️ Контакты</button>
          </div>
        </div>
      </div>

      <!-- Minimized Character Avatar Trigger -->
      <button type="button" class="studio-avatar-minipill" id="studio-avatar-minipill" style="display: none;" title="Показать приветствие Олега">
        <img src="/assets/sprites/oleg_face_badge.png" alt="Олег" />
        <span>Олег Прокофьев</span>
      </button>

      <!-- Bottom Controls Hint -->
      <div class="studio-controls-hint">
        <div class="studio-hint-quick">
          <span>💡 Наведите на любой предмет студии или кликните, чтобы открыть подробности</span>
        </div>
      </div>
    `;

    this.mountContainer.appendChild(this.hudEl);
    this.setupListeners();
  }

  setupListeners() {
    if (!this.hudEl) return;

    // Quick nav pills
    const navPills = this.hudEl.querySelectorAll('[data-nav-action]');
    navPills.forEach((pill) => {
      pill.addEventListener('click', () => {
        const action = pill.getAttribute('data-nav-action');
        if (this.callbacks.onOpenPanel) {
          this.callbacks.onOpenPanel(action);
        }
      });
    });

    // Mode buttons (compatibility fallback)
    const buttons = this.hudEl.querySelectorAll('.studio-mode-btn');
    buttons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const targetMode = btn.getAttribute('data-mode');
        this.setMode(targetMode);
        if (this.callbacks.onModeChange) {
          this.callbacks.onModeChange(targetMode);
        }
      });
    });

    // Close button for character card
    const closeBtn = this.hudEl.querySelector('#studio-card-close-btn');
    const cardEl = this.hudEl.querySelector('#studio-character-card');
    const minipillEl = this.hudEl.querySelector('#studio-avatar-minipill');

    if (closeBtn && cardEl && minipillEl) {
      closeBtn.addEventListener('click', () => {
        this.isCardDismissed = true;
        cardEl.style.display = 'none';
        minipillEl.style.display = 'inline-flex';
      });

      minipillEl.addEventListener('click', () => {
        this.isCardDismissed = false;
        minipillEl.style.display = 'none';
        cardEl.style.display = 'flex';
      });
    }

    // Action chips inside character card
    const chips = this.hudEl.querySelectorAll('.studio-card-chip');
    chips.forEach((chip) => {
      chip.addEventListener('click', (e) => {
        const action = chip.getAttribute('data-chip-action');
        if (action === 'explore') {
          this.setMode(InteractionMode.EXPLORE);
          if (this.callbacks.onModeChange) {
            this.callbacks.onModeChange(InteractionMode.EXPLORE);
          }
        } else if (action === 'projects') {
          if (this.callbacks.onOpenPanel) {
            this.callbacks.onOpenPanel('projects');
          }
        } else if (action === 'cat') {
          if (this.callbacks.onOpenPanel) {
            this.callbacks.onOpenPanel('assistant-help');
          }
        } else if (action === 'resume') {
          if (this.callbacks.onOpenPanel) {
            this.callbacks.onOpenPanel('about');
          }
        } else if (action === 'contact') {
          if (this.callbacks.onOpenPanel) {
            this.callbacks.onOpenPanel('contact');
          }
        }
      });
    });
  }

  openGreetingCard() {
    const cardEl = this.hudEl?.querySelector('#studio-character-card');
    const minipillEl = this.hudEl?.querySelector('#studio-avatar-minipill');
    if (cardEl && minipillEl) {
      this.isCardDismissed = false;
      minipillEl.style.display = 'none';
      cardEl.style.display = 'flex';
    }
  }

  setMode(mode) {
    this.currentMode = mode;
    if (!this.hudEl) return;

    const buttons = this.hudEl.querySelectorAll('.studio-mode-btn');
    buttons.forEach((btn) => {
      const btnMode = btn.getAttribute('data-mode');
      btn.classList.toggle('is-active', btnMode === mode);
    });

    const quickHint = this.hudEl.querySelector('.studio-hint-quick');
    const exploreHint = this.hudEl.querySelector('.studio-hint-explore');
    const quickviewBanner = this.hudEl.querySelector('.studio-quickview-hint');
    const cardEl = this.hudEl.querySelector('#studio-character-card');
    const minipillEl = this.hudEl.querySelector('#studio-avatar-minipill');

    if (mode === InteractionMode.QUICK_VIEW) {
      if (quickHint) quickHint.style.display = 'block';
      if (exploreHint) exploreHint.style.display = 'none';
      if (quickviewBanner) quickviewBanner.style.display = 'block';
      if (!this.isCardDismissed && cardEl) {
        cardEl.style.display = 'flex';
        if (minipillEl) minipillEl.style.display = 'none';
      }
    } else {
      if (quickHint) quickHint.style.display = 'none';
      if (exploreHint) exploreHint.style.display = 'flex';
      if (quickviewBanner) quickviewBanner.style.display = 'none';
      // In explore mode, minimize card into pill so player has clear view of avatar
      if (cardEl) cardEl.style.display = 'none';
      if (minipillEl) minipillEl.style.display = 'inline-flex';
    }
  }

  destroy() {
    if (this.hudEl) {
      this.hudEl.remove();
      this.hudEl = null;
    }
  }
}
