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
   * @param {Function} [callbacks.onAction]
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
    if (typeof document === 'undefined') return;

    this.backdropEl = document.createElement('div');
    this.backdropEl.className = 'studio-modal-backdrop';
    this.backdropEl.setAttribute('role', 'dialog');
    this.backdropEl.setAttribute('aria-modal', 'true');
    this.backdropEl.setAttribute('aria-hidden', 'true');
    this.backdropEl.setAttribute('data-lenis-prevent', 'true');

    this.panelEl = document.createElement('div');
    this.panelEl.className = 'studio-panel';
    this.panelEl.setAttribute('data-lenis-prevent', 'true');
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

    // Prevent wheel propagation so Lenis smooth scroll on the background page never intercepts inner scrolling
    this.panelEl.addEventListener('wheel', (e) => {
      e.stopPropagation();
    }, { passive: false });

    // Mount to document.body for true fixed viewport overlay (avoids container overflow clipping)
    const targetParent = (typeof document !== 'undefined' && document.body) ? document.body : this.mountContainer;
    if (targetParent) {
      targetParent.appendChild(this.backdropEl);
    }
  }

  /**
   * Opens a content panel by contentKey.
   *
   * @param {string} contentKey - projects, skills, about, contact, contacts, assistant-help, automations, mobile, gamedev
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

    // Freeze page scroll while modal is active
    if (typeof window !== 'undefined') {
      if (window.__lenis && typeof window.__lenis.stop === 'function') {
        window.__lenis.stop();
      }
      if (document.body) {
        document.body.style.overflow = 'hidden';
      }
    }

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
    if (!this.isOpen || !this.backdropEl) return;

    this.isOpen = false;
    this.backdropEl.classList.remove('is-open');
    this.backdropEl.setAttribute('aria-hidden', 'true');

    // Unfreeze page scroll
    if (typeof window !== 'undefined') {
      if (window.__lenis && typeof window.__lenis.start === 'function') {
        window.__lenis.start();
      }
      if (document.body) {
        document.body.style.overflow = '';
      }
    }

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
          icon: '🚀',
          title: 'Проекты & Кейсы',
          render: () => `
            <div class="studio-panel-card" style="border-color: rgba(0, 229, 255, 0.45); background: rgba(12, 28, 44, 0.75);">
              <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px;">
                <span class="studio-badge" style="background: rgba(0, 229, 255, 0.18); color: #00e5ff; border-color: rgba(0, 229, 255, 0.5);">Реализовано & Запущено • Production</span>
                <a href="https://miska-app.ru/" target="_blank" rel="noopener" style="color: #00e5ff; font-size: 12px; text-decoration: none; font-weight: 600;">miska-app.ru ↗</a>
              </div>
              <h4 style="margin-top: 8px; color: #fff;">🥣 «Миска» — сервис и Telegram Mini App для владельцев питомцев</h4>
              <div class="studio-card-role">Full-Stack Разработка • PWA • Telegram WebApp API • Асинхронный бэкенд</div>
              <p>Кроссплатформенное приложение и Telegram Mini App для заботливых владельцев питомцев. Сервис рассчитывает научную норму рациона, следит за запасами корма, контролирует водный баланс, ведет ветеринарный календарь и синхронизирует уход за питомцем между членами семьи в реальном времени.</p>
              <div class="studio-tag-list">
                <span class="studio-tag">Python (FastAPI)</span>
                <span class="studio-tag">Async SQLAlchemy</span>
                <span class="studio-tag">PostgreSQL</span>
                <span class="studio-tag">Aiogram 3</span>
                <span class="studio-tag">Vanilla JS (PWA)</span>
                <span class="studio-tag">Offline-first</span>
                <span class="studio-tag">Telegram WebApp API</span>
              </div>
              <a href="https://miska-app.ru/" target="_blank" rel="noopener" class="studio-cta-btn" style="margin-top: 12px;">
                <span>🌐 Открыть сервис miska-app.ru ↗</span>
              </a>
            </div>

            <p style="font-size: 13px; color: #94a3b8; line-height: 1.55; margin-top: 6px;">${projectsData.disclosure}</p>
            
            <div class="studio-panel-card">
              <span class="studio-badge">В активной разработке</span>
              <h4>Сайт для строительной компании</h4>
              <div class="studio-card-role">Проектирование • UI/UX в Figma • Адаптивная вёрстка • Frontend</div>
              <p>Разработка сайта для застройщика загородных домов под ключ. Продуманный каталог типовых проектов, интерактивный калькулятор стоимости и безупречная адаптивность от 320px до 4K.</p>
              <div class="studio-tag-list">
                <span class="studio-tag">Figma</span>
                <span class="studio-tag">HTML5 / CSS3</span>
                <span class="studio-tag">Flexbox & Grid</span>
                <span class="studio-tag">JavaScript (ES6+)</span>
                <span class="studio-tag">Responsive Design</span>
              </div>
            </div>

            <div class="studio-panel-card">
              <span class="studio-badge studio-badge-nda">Реализовано • NDA</span>
              <h4>Коммерческие мобильные приложения на заказ</h4>
              <div class="studio-card-role">Архитектура • Интеграция SDK рекламы • Базы данных • Релиз</div>
              <p>Разработка и поддержка коммерческих мобильных решений под Android: интеграция рекламных сетей монетизации, работа с SQLite/REST API и адаптация экранов под широкий парк устройств.</p>
              <div class="studio-tag-list">
                <span class="studio-tag">Android Studio</span>
                <span class="studio-tag">Java</span>
                <span class="studio-tag">Dart</span>
                <span class="studio-tag">REST API</span>
                <span class="studio-tag">SQLite</span>
                <span class="studio-tag">Ad SDKs</span>
              </div>
            </div>

            <div class="studio-panel-card">
              <span class="studio-badge">R&D Прототипы</span>
              <h4>Игровые прототипы на Unreal Engine & WebGL</h4>
              <div class="studio-card-role">Геймдизайн • Логика Blueprints • UI/UMG • Сборка билдов</div>
              <p>Эксперименты с интерактивными механиками: изометрические и 3D камеры, настройка физики персонажей, шейдерные эффекты и сборка билдов под Windows и Android.</p>
              <div class="studio-tag-list">
                <span class="studio-tag">Unreal Engine 5</span>
                <span class="studio-tag">Blueprints</span>
                <span class="studio-tag">Phaser 3</span>
                <span class="studio-tag">Canvas / WebGL</span>
                <span class="studio-tag">Game Physics</span>
              </div>
            </div>

            <a href="https://t.me/oleherrr_kp" target="_blank" rel="noopener" class="studio-cta-btn">
              <span>💬 Запросить демо или примеры кода в Telegram →</span>
            </a>
          `,
        };

      case 'skills':
        return {
          icon: '⚡',
          title: 'Стек технологий & Инструменты',
          render: () => `
            <p style="font-size: 13px; color: #94a3b8; line-height: 1.55;">${skillsData.lede}</p>

            <div class="studio-panel-card">
              <h4>⚡ 01. Бэкенд, Архитектура & Базы данных</h4>
              <p style="font-size: 13px;">Проектирование надежных асинхронных API, работа с реляционными БД, миграции и бизнес-логика высокой доступности.</p>
              <div class="studio-tag-list">
                <span class="studio-tag" style="border-color: rgba(0, 229, 255, 0.45); color: #fff;">Python</span>
                <span class="studio-tag" style="border-color: rgba(0, 229, 255, 0.45); color: #fff;">FastAPI</span>
                <span class="studio-tag" style="border-color: rgba(0, 229, 255, 0.45); color: #fff;">Async SQLAlchemy</span>
                <span class="studio-tag" style="border-color: rgba(0, 229, 255, 0.45); color: #fff;">PostgreSQL</span>
                <span class="studio-tag">Aiogram 3</span>
                <span class="studio-tag">REST API</span>
                <span class="studio-tag">SQLite</span>
                <span class="studio-tag">Pydantic & Alembic</span>
              </div>
            </div>

            <div class="studio-panel-card">
              <h4>🌐 02. Веб-разработка, PWA & Telegram WebApps</h4>
              <p style="font-size: 13px;">Быстрые кроссплатформенные веб-приложения и Telegram Mini Apps: от автономного offline-first PWA до сложных анимаций интерфейса.</p>
              <div class="studio-tag-list">
                <span class="studio-tag" style="border-color: rgba(0, 229, 255, 0.45); color: #fff;">Vanilla JS (ES6+)</span>
                <span class="studio-tag" style="border-color: rgba(0, 229, 255, 0.45); color: #fff;">PWA / Offline-first</span>
                <span class="studio-tag" style="border-color: rgba(0, 229, 255, 0.45); color: #fff;">Telegram WebApp API</span>
                <span class="studio-tag">HTML5 & Семантика</span>
                <span class="studio-tag">CSS3 (Grid / Flexbox)</span>
                <span class="studio-tag">GSAP</span>
                <span class="studio-tag">Vite</span>
                <span class="studio-tag">Кроссбраузерность</span>
              </div>
            </div>

            <div class="studio-panel-card">
              <h4>📱 03. Мобильные приложения & Кроссплатформа</h4>
              <p style="font-size: 13px;">Сборка клиентских приложений для телефонов: экраны, навигация, подключение к серверам, сборка установочных пакетов и монетизация.</p>
              <div class="studio-tag-list">
                <span class="studio-tag">Android Studio</span>
                <span class="studio-tag">Java</span>
                <span class="studio-tag">Dart</span>
                <span class="studio-tag">Android & iOS</span>
                <span class="studio-tag">REST API</span>
                <span class="studio-tag">Монетизация & SDK</span>
              </div>
            </div>

            <div class="studio-panel-card">
              <h4>🎨 04. Дизайн & Прототипирование</h4>
              <p style="font-size: 13px;">Продумываю структуру и интерфейс до первой строчки кода: сетка, типографика, состояния кнопок и дизайн-системы в Figma.</p>
              <div class="studio-tag-list">
                <span class="studio-tag">Figma</span>
                <span class="studio-tag">Компоненты & Auto-layout</span>
                <span class="studio-tag">Дизайн-системы</span>
                <span class="studio-tag">UI-киты</span>
                <span class="studio-tag">Интерактивные прототипы</span>
              </div>
            </div>

            <div class="studio-panel-card">
              <h4>🎮 05. GameDev & Интерактив</h4>
              <p style="font-size: 13px;">Создание интерактивных прототипов, визуальных эффектов и игровых механик под ключ.</p>
              <div class="studio-tag-list">
                <span class="studio-tag">Unreal Engine 5</span>
                <span class="studio-tag">Blueprints</span>
                <span class="studio-tag">Phaser 3</span>
                <span class="studio-tag">WebGL / Canvas</span>
                <span class="studio-tag">Игровой UI / UMG</span>
              </div>
            </div>
          `,
        };

      case 'about':
        return {
          icon: '👤',
          title: 'Олег Прокофьев — Обо мне',
          render: () => `
            <div class="studio-avatar-badge">
              <img src="/assets/sprites/oleg_avatar_clean.jpg" class="studio-avatar-img" alt="Олег Прокофьев" />
              <div class="studio-avatar-info">
                <h4 class="studio-avatar-name">Олег Прокофьев</h4>
                <span class="studio-role-pill">Full-Stack & Systems Developer</span>
                <span class="studio-status-pill"><span class="badge-dot live"></span> Всегда на связи · Удалённо</span>
              </div>
            </div>

            <div style="display: flex; flex-direction: column; gap: 10px;">
              ${profileData.about.paragraphs.map((p) => `<p>${p}</p>`).join('')}
            </div>

            <div class="studio-panel-card">
              <h4>🎯 Принципы работы</h4>
              <div style="display: flex; flex-direction: column; gap: 8px; font-size: 13px; color: #cbd5e1;">
                <div><strong style="color: #fff;">Дизайн и код в одних руках:</strong> веду проект от макета в Figma до готовой вёрстки сам — идея не теряется на стыках.</div>
                <div><strong style="color: #fff;">Живой, понятный интерфейс:</strong> анимации подчеркивают структуру и не перегружают пользователя.</div>
                <div><strong style="color: #fff;">Инструмент под задачу:</strong> подбираю оптимальный стек, будь то сайт, мобильное приложение или интерактивный модуль.</div>
              </div>
            </div>

            <div class="studio-panel-card">
              <h4>⚡ Ключевые факты</h4>
              <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: #cbd5e1; line-height: 1.6;">
                ${profileData.about.facts.map((f) => `<li>${f}</li>`).join('')}
              </ul>
            </div>

            <a href="https://t.me/oleherrr_kp" target="_blank" rel="noopener" class="studio-cta-btn">
              <span>✈️ Написать Олегу в Telegram (@oleherrr_kp) →</span>
            </a>
          `,
        };

      case 'contact':
      case 'contacts':
        return {
          icon: '📬',
          title: 'Контакты & Связь',
          render: () => `
            <p style="font-size: 13.5px; color: #cbd5e1;">${contactsData.lede}</p>

            <div class="studio-cat-actions">
              <a href="https://t.me/oleherrr_kp" target="_blank" rel="noopener" class="studio-cat-btn" style="text-decoration: none;">
                <span>✈️ <strong>Telegram:</strong> @oleherrr_kp <span class="studio-badge" style="margin-left: 8px; font-size: 10px;">Быстрый ответ</span></span>
                <span>↗</span>
              </a>
              <a href="mailto:olegprokofev2002@gmail.com" class="studio-cat-btn" style="text-decoration: none;">
                <span>✉️ <strong>Email:</strong> olegprokofev2002@gmail.com</span>
                <span>↗</span>
              </a>
            </div>

            <div class="studio-panel-card" style="margin-top: 4px;">
              <h4>🌍 Формат сотрудничества</h4>
              <p style="font-size: 13px; color: #cbd5e1;">Удалённая работа · Любой часовой пояс · Прозрачная отчётность и демонстрация этапов разработки.</p>
            </div>

            <a href="https://t.me/oleherrr_kp" target="_blank" rel="noopener" class="studio-cta-btn">
              <span>🚀 Начать диалог в Telegram →</span>
            </a>
          `,
        };

      case 'miska':
      case 'miska-app':
        return {
          icon: '🐾',
          title: 'NEOW-11 // Проект «Миска»',
          render: () => `
            <div class="studio-avatar-badge cat-badge">
              <img src="/assets/sprites/cat_avatar_clean.jpg" class="studio-avatar-img cat-img" alt="NEOW-11 Cyber-Cat" />
              <div class="studio-avatar-info">
                <h4 class="studio-avatar-name">NEOW-11</h4>
                <span class="studio-role-pill cat-role">Амбассадор & AI Тестировщик</span>
                <span class="studio-status-pill"><span class="badge-dot cyan"></span> Реализовано & Запущено // miska-app.ru</span>
              </div>
            </div>

            <div class="studio-cat-bubble">
              Мр-р-р! 🐾 Как кибер-кот студии, лично подтверждаю: это идеальный цифровой сервис для хвостатых и их хозяев!
              Олег разработал <strong>«Миску»</strong> — умное кроссплатформенное приложение и Telegram Mini App для заботливых владельцев питомцев.
            </div>

            <div class="studio-panel-card cat-card" style="border-color: rgba(0, 229, 255, 0.35); background: rgba(13, 20, 32, 0.85);">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span class="studio-badge" style="background: rgba(0, 229, 255, 0.15); color: #00e5ff; border-color: rgba(0, 229, 255, 0.4);">Production • Live</span>
                <a href="https://miska-app.ru/" target="_blank" rel="noopener" style="color: #00e5ff; font-size: 12px; text-decoration: none; font-weight: 600;">miska-app.ru ↗</a>
              </div>
              <h4 style="margin-top: 8px; color: #fff;">🥣 «Миска» — Забота о питомце нового поколения</h4>
              <p style="font-size: 13px; line-height: 1.55; color: #cbd5e1; margin-top: 6px;">
                Кроссплатформенное приложение и Telegram Mini App для заботливых владельцев питомцев. Сервис рассчитывает научную норму рациона, следит за запасами корма, контролирует водный баланс, ведет ветеринарный календарь и синхронизирует уход за питомцем между членами семьи в реальном времени.
              </p>
            </div>

            <div class="studio-panel-card cat-card">
              <h4>✨ Что умеет сервис:</h4>
              <ul style="margin: 0; padding-left: 20px; font-size: 13px; color: #cbd5e1; line-height: 1.6;">
                <li><strong>🥣 Научный расчёт рациона:</strong> вычисление калорийности и граммовок корма с учётом веса, возраста, породы и активности.</li>
                <li><strong>📦 Контроль запасов корма:</strong> предиктивные уведомления до того, как закончится пачка.</li>
                <li><strong>💧 Водный баланс:</strong> контроль гидратации для профилактики МКБ и здоровья почек.</li>
                <li><strong>🩺 Ветеринарный календарь:</strong> график прививок, обработок от паразитов и посещений врача.</li>
                <li><strong>👨‍👩‍👧‍👦 Семейная синхронизация в реальном времени:</strong> вся семья сразу видит статус кормления, предотвращая повторное кормление.</li>
              </ul>
            </div>

            <div class="studio-panel-card cat-card">
              <h4>⚙️ Технологический стек проекта:</h4>
              <p style="font-size: 12.5px; color: #94a3b8; margin-bottom: 8px;">Отказоустойчивая асинхронная архитектура и мгновенный отклик интерфейса:</p>
              <div class="studio-tag-list">
                <span class="studio-tag" style="border-color: rgba(0, 229, 255, 0.4); color: #fff;">Python (FastAPI)</span>
                <span class="studio-tag" style="border-color: rgba(0, 229, 255, 0.4); color: #fff;">Async SQLAlchemy</span>
                <span class="studio-tag" style="border-color: rgba(0, 229, 255, 0.4); color: #fff;">PostgreSQL</span>
                <span class="studio-tag" style="border-color: rgba(0, 229, 255, 0.4); color: #fff;">Aiogram 3</span>
                <span class="studio-tag" style="border-color: rgba(0, 229, 255, 0.4); color: #fff;">Vanilla JS (PWA / Offline-first)</span>
                <span class="studio-tag" style="border-color: rgba(0, 229, 255, 0.4); color: #fff;">Telegram WebApp API</span>
              </div>
            </div>

            <a href="https://miska-app.ru/" target="_blank" rel="noopener" class="studio-cta-btn" style="background: linear-gradient(135deg, #00e5ff, #0284c7); color: #070a12; font-weight: 800; border: none; box-shadow: 0 0 20px rgba(0, 229, 255, 0.35);">
              <span>🌐 Открыть сервис miska-app.ru →</span>
            </a>

            <button type="button" class="studio-cat-btn cat-btn-accent" data-cat-action="purr">
              <span>🐾 Одобрено NEOW-11 (10/10 кошачьих лайков)</span>
              <span>❤️</span>
            </button>
          `,
        };

      case 'assistant-help':
      case 'automations':
      default:
        return {
          icon: '🤖',
          title: 'NEOW-11 // AI & Автоматизации',
          render: () => `
            <div class="studio-avatar-badge cat-badge">
              <img src="/assets/sprites/cat_avatar_clean.jpg" class="studio-avatar-img cat-img" alt="NEOW-11 Cyber-Cat" />
              <div class="studio-avatar-info">
                <h4 class="studio-avatar-name">NEOW-11</h4>
                <span class="studio-role-pill cat-role">AI Companion & Automation Module</span>
                <span class="studio-status-pill"><span class="badge-dot cyan"></span> Online // Ready to Assist</span>
              </div>
            </div>

            <div class="studio-cat-bubble">
              Мр-р! Я бортовой ИИ-ассистент студии. Моя специализация — умные чат-боты, Telegram Mini Apps и автоматизация процессов. Гордость нашего стека — сервис для питомцев «Миска»!
            </div>

            <div class="studio-panel-card cat-card" style="border-color: rgba(0, 229, 255, 0.35); background: rgba(13, 20, 32, 0.85);">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span class="studio-badge" style="background: rgba(0, 229, 255, 0.15); color: #00e5ff; border-color: rgba(0, 229, 255, 0.4);">Флагманский кейс</span>
                <a href="https://miska-app.ru/" target="_blank" rel="noopener" style="color: #00e5ff; font-size: 12px; text-decoration: none; font-weight: 600;">miska-app.ru ↗</a>
              </div>
              <h4 style="margin-top: 6px; color: #fff;">🥣 Кроссплатформенное приложение и Telegram Mini App «Миска»</h4>
              <p style="font-size: 13px;">Научный расчёт рациона, контроль запасов корма, водный баланс, ветеринарный календарь и семейная синхронизация ухода в реальном времени.</p>
              <div class="studio-tag-list">
                <span class="studio-tag">Python (FastAPI)</span>
                <span class="studio-tag">Async SQLAlchemy</span>
                <span class="studio-tag">PostgreSQL</span>
                <span class="studio-tag">Aiogram 3</span>
                <span class="studio-tag">Vanilla JS (PWA)</span>
                <span class="studio-tag">Telegram WebApp API</span>
              </div>
              <a href="https://miska-app.ru/" target="_blank" rel="noopener" class="studio-cta-btn" style="margin-top: 10px; padding: 10px 14px; font-size: 12.5px;">
                <span>🌐 Открыть кейс «Миска» (miska-app.ru) →</span>
              </a>
            </div>

            <div class="studio-panel-card cat-card">
              <span class="studio-badge studio-badge-cat">Чат-боты & LLM</span>
              <h4>🤖 01. Telegram & Discord Боты</h4>
              <p style="font-size: 13px;">Многофункциональные боты под ключ: интеграция с ChatGPT / Gemini API, сценарии продаж, генерация ответов, интерактивные меню, приём платежей, мгновенные уведомления.</p>
              <div class="studio-tag-list">
                <span class="studio-tag">Telegram Bot API</span>
                <span class="studio-tag">Python Aiogram 3</span>
                <span class="studio-tag">Discord Bots</span>
                <span class="studio-tag">OpenAI & Gemini API</span>
                <span class="studio-tag">Платежные шлюзы</span>
                <span class="studio-tag">PostgreSQL</span>
              </div>
            </div>

            <div class="studio-panel-card cat-card">
              <span class="studio-badge studio-badge-cat">Парсеры & Рутина</span>
              <h4>⚙️ 02. Сбор данных & Автоматизация</h4>
              <p style="font-size: 13px;">Сбор и мониторинг данных с сайтов и маркетплейсов, автоматическая синхронизация с Google Sheets / CRM, фоновые скрипты 24/7 без ручной работы.</p>
              <div class="studio-tag-list">
                <span class="studio-tag">Python Playwright</span>
                <span class="studio-tag">Selenium</span>
                <span class="studio-tag">Google Sheets API</span>
                <span class="studio-tag">Background Workers</span>
                <span class="studio-tag">Экспорт Excel</span>
              </div>
            </div>

            <div class="studio-panel-card cat-card">
              <span class="studio-badge studio-badge-cat">Нейросети</span>
              <h4>🧠 03. AI-Агенты & Аналитика</h4>
              <p style="font-size: 13px;">Создание автономных агентов для обработки входящих документов, классификации заявок, автоответов по базе знаний компании и взаимодействия с CRM.</p>
              <div class="studio-tag-list">
                <span class="studio-tag">LangChain</span>
                <span class="studio-tag">RAG / Векторные БД</span>
                <span class="studio-tag">FastAPI</span>
                <span class="studio-tag">Интеграция CRM</span>
              </div>
            </div>

            <a href="https://t.me/oleherrr_kp?text=%D0%9F%D1%80%D0%B8%D0%B2%D0%B5%D1%82!%20%D0%A5%D0%BE%D1%87%D1%83%20%D0%BE%D0%B1%D1%81%D1%83%D0%B4%D0%B8%D1%82%D1%8C%20%D0%BF%D1%80%D0%BE%D0%B5%D0%BA%D1%82%20%D0%B0%D0%B2%D1%82%D0%BE%D0%BC%D0%B0%D1%82%D0%B8%D0%B7%D0%B0%D1%86%D0%B8%D0%B8%2F%D0%B1%D0%BE%D1%82%D0%B0" target="_blank" rel="noopener" class="studio-cta-btn">
              <span>🚀 Обсудить проект автоматизации в Telegram →</span>
            </a>

            <button type="button" class="studio-cat-btn cat-btn-accent" data-cat-action="purr">
              <span>🐾 Активировать звуковой модуль (Purr!)</span>
              <span>❤️</span>
            </button>
          `,
        };

      case 'mobile':
        return {
          icon: '📱',
          title: 'Мобильная разработка',
          render: () => `
            <div class="studio-panel-card">
              <span class="studio-badge studio-badge-nda">Коммерческий опыт</span>
              <h4>Заказные мобильные приложения</h4>
              <p>Разработка решений под Android: встраивание SDK монетизации, сборка готовых APK/бандлов, ведение баз данных.</p>
              <div class="studio-tag-list">
                <span class="studio-tag">Android Studio</span>
                <span class="studio-tag">Java</span>
                <span class="studio-tag">Dart</span>
                <span class="studio-tag">REST API</span>
                <span class="studio-tag">SQLite</span>
              </div>
            </div>
          `,
        };

      case 'gamedev':
        return {
          icon: '🎮',
          title: 'Игры & Unreal Engine',
          render: () => `
            <div class="studio-panel-card">
              <span class="studio-badge">R&D Прототипы</span>
              <h4>Физика, камера и логика</h4>
              <p>Эксперименты с изометрическими и 3D-механиками, сборка билдов под ПК и Android.</p>
              <div class="studio-tag-list">
                <span class="studio-tag">Unreal Engine 5</span>
                <span class="studio-tag">Blueprints</span>
                <span class="studio-tag">Phaser 3</span>
                <span class="studio-tag">Интерфейс UI</span>
              </div>
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
      <div class="studio-panel-body" data-lenis-prevent="true">
        ${data.render()}
      </div>
    `;

    // Hook close button
    const closeBtn = this.panelEl.querySelector('.studio-panel-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.close());
    }

    // Hook cat purr action
    const purrBtn = this.panelEl.querySelector('[data-cat-action="purr"]');
    if (purrBtn) {
      purrBtn.addEventListener('click', () => {
        const bubble = this.panelEl.querySelector('.studio-cat-bubble');
        if (bubble) {
          bubble.innerHTML = 'Мур-р-р-р! ⚡❤️ Энергетический уровень на 100%! Всегда готов к автоматизации сложных задач!';
          bubble.style.borderColor = '#00e5ff';
        }
        if (this.callbacks.onAction) {
          this.callbacks.onAction('purr');
        }
      });
    }
  }

  destroy() {
    this.close();
    if (this.backdropEl && this.backdropEl.parentNode) {
      this.backdropEl.parentNode.removeChild(this.backdropEl);
    }
    this.backdropEl = null;
    this.panelEl = null;
  }
}
