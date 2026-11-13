import { InteractionMode } from '../interactions/InteractionRouter.js';

export class StudioHud {
  /**
   * @param {HTMLElement} mountContainer
   * @param {object} [callbacks]
   * @param {Function} [callbacks.onModeChange]
   * @param {Function} [callbacks.onResetCamera]
   */
  constructor(mountContainer, callbacks = {}) {
    this.mountContainer = mountContainer;
    this.callbacks = callbacks;
    this.currentMode = InteractionMode.QUICK_VIEW;
    this.hudEl = null;

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
          <span class="studio-hud-tagline">Интерактивная студия</span>
        </div>

        <div class="studio-mode-switcher" role="tablist" aria-label="Режимы взаимодействия">
          <button type="button" class="studio-mode-btn is-active" data-mode="${InteractionMode.QUICK_VIEW}">
            <span>⚡ Быстрый просмотр</span>
          </button>
          <button type="button" class="studio-mode-btn" data-mode="${InteractionMode.EXPLORE}">
            <span>🕹️ Исследовать</span>
          </button>
        </div>
      </div>

      <!-- Quick View Hint -->
      <div class="studio-quickview-hint">
        Нажмите на любой предмет в комнате, чтобы узнать больше
      </div>

      <!-- Bottom Controls Hint -->
      <div class="studio-controls-hint">
        <div class="studio-hint-quick">
          <span>💡 Клик по объекту открывает резюме без ожидания персонажа</span>
        </div>
        <div class="studio-hint-explore" style="display: none;">
          <span class="studio-key-badge">W</span>
          <span class="studio-key-badge">A</span>
          <span class="studio-key-badge">S</span>
          <span class="studio-key-badge">D</span>
          <span>Движение</span>
          <span class="studio-key-badge" style="margin-left: 8px;">E</span>
          <span>Взаимодействие</span>
        </div>
      </div>
    `;

    this.mountContainer.appendChild(this.hudEl);
    this.setupListeners();
  }

  setupListeners() {
    if (!this.hudEl) return;

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

    if (mode === InteractionMode.QUICK_VIEW) {
      if (quickHint) quickHint.style.display = 'block';
      if (exploreHint) exploreHint.style.display = 'none';
      if (quickviewBanner) quickviewBanner.style.display = 'block';
    } else {
      if (quickHint) quickHint.style.display = 'none';
      if (exploreHint) exploreHint.style.display = 'flex';
      if (quickviewBanner) quickviewBanner.style.display = 'none';
    }
  }

  destroy() {
    if (this.hudEl) {
      this.hudEl.remove();
      this.hudEl = null;
    }
  }
}
