import profileData from '../../data/profile.json' with { type: 'json' };
import skillsData from '../../data/skills.json' with { type: 'json' };
import projectsData from '../../data/projects.json' with { type: 'json' };
import contactsData from '../../data/contacts.json' with { type: 'json' };

export class ContentPanel {
  /**
   * @param {HTMLElement} mountContainer
   * @param {object} [callbacks]
   * @param {Function} [callbacks.onClose]
   * @param {Function} [callbacks.onNavigate]
   */
  constructor(mountContainer, callbacks = {}) {
    this.mountContainer = mountContainer;
    this.callbacks = callbacks;
    this.isOpen = false;
    this.activeContentKey = null;
    this.backdropEl = null;
    this.panelEl = null;
    this.previousFocusedElement = null;

    this.createDom();
  }

  createDom() {
    if (!this.mountContainer || typeof document === 'undefined') return;

    this.backdropEl = document.createElement('div');
    this.backdropEl.className = 'studio-modal-backdrop';
    this.backdropEl.setAttribute('role', 'dialog');
    this.backdropEl.setAttribute('aria-modal', 'true');
    this.backdropEl.setAttribute('aria-hidden', 'true');

    this.panelEl = document.createElement('div');
    this.panelEl.className = 'studio-panel';
    this.backdropEl.appendChild(this.panelEl);

    // Close on backdrop click (outside panel)
    this.backdropEl.addEventListener('click', (e) => {
      if (e.target === this.backdropEl) {
        this.close();
      }
    });

    // Close on Escape
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) {
        this.close();
      }
    });

    this.mountContainer.appendChild(this.backdropEl);
  }

  /**
   * Opens a content panel by contentKey.
   *
   * @param {string} contentKey - projects, mobile, gamedev, skills, process, contact, about, assistant-help
   */
  open(contentKey) {
    if (!this.backdropEl || !this.panelEl) return;

    this.activeContentKey = contentKey;
    this.previousFocusedElement = document.activeElement;

    const data = this.getContentData(contentKey);
    this.renderContent(data);

    this.isOpen = true;
    this.backdropEl.classList.add('is-open');
    this.backdropEl.setAttribute('aria-hidden', 'false');

    if (this.callbacks.onOpen) {
      this.callbacks.onOpen(contentKey);
    }

    // Focus close button for accessibility
    const closeBtn = this.panelEl.querySelector('.studio-panel-close');
    if (closeBtn) {
      setTimeout(() => closeBtn.focus(), 50);
    }
  }

  /**
   * Closes the active panel.
   */
  close() {
    if (!this.isOpen) return;

    this.isOpen = false;
    this.backdropEl.classList.remove('is-open');
    this.backdropEl.setAttribute('aria-hidden', 'true');

    if (this.callbacks.onClose) {
      this.callbacks.onClose(this.activeContentKey);
    }

    if (this.previousFocusedElement && typeof this.previousFocusedElement.focus === 'function') {
      this.previousFocusedElement.focus();
    }
  }

  getContentData(key) {
    switch (key) {
      case 'projects':
        return {
          icon: '💻',
          title: 'Проекты & Разработка',
          render: () => `
            <p>${projectsData.disclosure}</p>
            ${projectsData.items.map((p) => `
              <div class="studio-panel-card">
                <span class="studio-badge ${p.ndaNotice ? 'studio-badge-nda' : ''}">${p.status}</span>
                <h4>${p.title}</h4>
                <p style="font-size: 13px; color: #94a3b8;">${p.role}</p>
                <p>${p.summary}</p>
                <div class="studio-tag-list">
                  ${p.techStack.map((t) => `<span class="studio-tag">${t}</span>`).join('')}
                </div>
              </div>
            `).join('')}
          `,
        };

      case 'mobile':
        return {
          icon: '📱',
          title: 'Мобильная разработка',
          render: () => {
            const card = skillsData.cards.find((c) => c.id === 'mobile');
            return `
              <p>${card ? card.note : 'Разработка приложений для Android и iOS.'}</p>
              <div class="studio-panel-card">
                <h4>Стек и платформа</h4>
                <div class="studio-tag-list">
                  ${(card?.items || ['Android Studio', 'Java', 'Dart', 'Android & iOS', 'REST API']).map((t) => `<span class="studio-tag">${t}</span>`).join('')}
                </div>
              </div>
              <div class="studio-panel-card">
                <span class="studio-badge studio-badge-nda">Коммерческий опыт</span>
                <h4>Заказные приложения</h4>
                <p>Встраивание SDK монетизации, сборка готовых APK/бандлов, ведение баз данных.</p>
              </div>
            `;
          },
        };

      case 'gamedev':
        return {
          icon: '🎮',
          title: 'Игры & Unreal Engine',
          render: () => {
            const card = skillsData.cards.find((c) => c.id === 'games');
            return `
              <p>${card ? card.note : 'Разработка прототипов игр на Unreal Engine.'}</p>
              <div class="studio-panel-card">
                <h4>Инструменты и возможности</h4>
                <div class="studio-tag-list">
                  ${(card?.items || ['Unreal Engine', 'Blueprints', 'Сборка уровней', 'Интерфейс UI']).map((t) => `<span class="studio-tag">${t}</span>`).join('')}
                </div>
              </div>
              <div class="studio-panel-card">
                <span class="studio-badge">R&D Прототипы</span>
                <h4>Физика, камера и логика</h4>
                <p>Эксперименты с изометрическими и 3D-механиками, сборка билдов под ПК и Android.</p>
              </div>
            `;
          },
        };

      case 'skills':
        return {
          icon: '📚',
          title: 'Технологии и навыки',
          render: () => `
            <p>${skillsData.lede}</p>
            ${skillsData.cards.map((c) => `
              <div class="studio-panel-card">
                <h4>${c.num}. ${c.title}</h4>
                <p style="font-size: 13px;">${c.note}</p>
                <div class="studio-tag-list">
                  ${c.items.map((i) => `<span class="studio-tag">${i}</span>`).join('')}
                </div>
              </div>
            `).join('')}
          `,
        };

      case 'process':
      case 'approach':
        return {
          icon: '📌',
          title: profileData.approach.title.replace('\n', ' '),
          render: () => `
            ${profileData.approach.items.map((item) => `
              <div class="studio-panel-card">
                <h4>${item.num}. ${item.title}</h4>
                <p>${item.text}</p>
              </div>
            `).join('')}
          `,
        };

      case 'about':
        return {
          icon: '👤',
          title: 'Обо мне — Олег Прокофьев',
          render: () => `
            <div class="studio-panel-avatar-badge" style="display: flex; align-items: center; gap: 14px; margin-bottom: 16px; padding: 12px; background: rgba(36, 48, 62, 0.4); border-radius: 12px; border: 1px solid rgba(100, 115, 134, 0.3);">
              <img src="/assets/sprites/oleg_face_badge.png" style="width: 52px; height: 52px; border-radius: 12px; object-fit: cover; object-position: top center; border: 2px solid #ff454d;" alt="Олег Прокофьев" />
              <div>
                <h4 style="margin: 0; color: #fff; font-size: 15px;">Олег Прокофьев</h4>
                <p style="margin: 3px 0 0 0; color: #ff454d; font-size: 11.5px; font-weight: 600;">Full-Stack & Systems Engineer</p>
              </div>
            </div>
            ${profileData.about.paragraphs.map((p) => `<p>${p}</p>`).join('')}
            <div class="studio-panel-card">
              <h4>Ключевые факты</h4>
              <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: #cbd5e1;">
                ${profileData.about.facts.map((f) => `<li>${f}</li>`).join('')}
              </ul>
            </div>
          `,
        };

      case 'contact':
        return {
          icon: '✉️',
          title: contactsData.title,
          render: () => `
            <p>${contactsData.lede}</p>
            <div class="studio-cat-actions">
              ${contactsData.channels.map((ch) => `
                <a href="${ch.url}" target="_blank" rel="noopener" class="studio-cat-btn" style="text-decoration: none;">
                  <span><strong>${ch.label}</strong>: ${ch.display}</span>
                  <span>↗</span>
                </a>
              `).join('')}
            </div>
            <p style="font-size: 12px; color: #94a3b8; margin-top: 8px;">Доступность: ${profileData.availability}</p>
          `,
        };

      case 'assistant-help':
      default:
        return {
          icon: '🐱',
          title: 'Робо-кот — Цифровой гид',
          render: () => `
            <div class="studio-cat-dialog">
              <div class="studio-cat-avatar-wrap" style="flex-shrink: 0;">
                <img src="/assets/sprites/cat_face_badge.png" style="width: 48px; height: 48px; border-radius: 12px; object-fit: cover; object-position: top center; border: 2px solid #00f0ff;" alt="Робо-кот" />
              </div>
              <div class="studio-cat-bubble">
                Мр-р! Приветствую в студии Олега. Чем могу помочь?
              </div>
            </div>
            <div class="studio-cat-actions">
              <button class="studio-cat-btn" data-cat-nav="projects">
                <span>💻 Показать проекты и кейсы</span>
                <span>→</span>
              </button>
              <button class="studio-cat-btn" data-cat-nav="skills">
                <span>📚 Какие технологии используются?</span>
                <span>→</span>
              </button>
              <button class="studio-cat-btn" data-cat-nav="contact">
                <span>✉️ Как связаться с Олегом?</span>
                <span>→</span>
              </button>
              <button class="studio-cat-btn" data-cat-nav="about">
                <span>👤 Кто такой Олег?</span>
                <span>→</span>
              </button>
              <button class="studio-cat-btn" data-cat-action="purr">
                <span>🐾 Погладить котика (Purr!)</span>
                <span>❤️</span>
              </button>
              <button class="studio-cat-btn" data-cat-action="follow">
                <span>⚡ Робо-кот: режим следования</span>
                <span>🐾</span>
              </button>
            </div>
          `,
        };
    }
  }

  renderContent(data) {
    this.panelEl.innerHTML = `
      <div class="studio-panel-header">
        <div class="studio-panel-title-wrap">
          <div class="studio-panel-icon">${data.icon}</div>
          <h3 class="studio-panel-title">${data.title}</h3>
        </div>
        <button class="studio-panel-close" aria-label="Закрыть панель">✕</button>
      </div>
      <div class="studio-panel-body">
        ${data.render()}
      </div>
    `;

    // Hook close button
    const closeBtn = this.panelEl.querySelector('.studio-panel-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.close());
    }

    // Hook cat navigation pills
    this.panelEl.querySelectorAll('[data-cat-nav]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const targetNav = btn.getAttribute('data-cat-nav');
        this.open(targetNav);
        if (this.callbacks.onNavigate) {
          this.callbacks.onNavigate(targetNav);
        }
      });
    });

    // Hook cat purr action
    const purrBtn = this.panelEl.querySelector('[data-cat-action="purr"]');
    if (purrBtn) {
      purrBtn.addEventListener('click', () => {
        const bubble = this.panelEl.querySelector('.studio-cat-bubble');
        if (bubble) {
          bubble.innerHTML = 'Мур-р-р-р! ⚡❤️ Энергетический уровень на 100%! Приятно познакомиться!';
          bubble.style.borderColor = '#ff454d';
        }
        if (this.callbacks.onAction) {
          this.callbacks.onAction('purr');
        }
      });
    }

    // Hook cat follow toggle action
    const followBtn = this.panelEl.querySelector('[data-cat-action="follow"]');
    if (followBtn) {
      followBtn.addEventListener('click', () => {
        if (this.callbacks.onAction) {
          const isFollowing = this.callbacks.onAction('toggle-follow');
          const bubble = this.panelEl.querySelector('.studio-cat-bubble');
          if (bubble) {
            bubble.innerHTML = isFollowing
              ? 'Мяу! Режим следования включён. Куда идём? 🚀'
              : 'Мр-р... Пойду вздремну на мягкой подушке. 💤';
            bubble.style.borderColor = isFollowing ? '#00f0ff' : '#647386';
          }
        }
      });
    }
  }
}
