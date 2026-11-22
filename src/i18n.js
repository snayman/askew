// Vantage i18n: V.i18n.t(key, params), setLang(l), lang(), pick({ru,en}), apply(root), onChange(fn).
// Markup: data-i18n="key" (text), data-i18n-aria="key" (aria-label), data-i18n-title="key" (title).
(function (root) {
  const V = (root.V = root.V || {});
  const D = {
    ru: {
      'app.tagline': 'Мир, где расстояние — вопрос ракурса',
      'menu.play': 'Играть', 'menu.continue': 'Продолжить', 'menu.levels': 'Уровни', 'menu.how': 'Как играть', 'menu.settings': 'Настройки',
      'menu.credit': '',
      'pw.title': 'Полная версия', 'pw.p': 'Главы 3–5 и все будущие уровни. Первые две главы бесплатны навсегда.', 'pw.buy': 'Купить полную версию', 'pw.code': 'Уже есть лицензия? Вставьте код или ссылку', 'pw.ok': 'Открыть', 'pw.later': 'Позже', 'pw.bad': 'Код не подходит', 'pw.on': 'Полная версия открыта. Спасибо!', 'pw.open': 'Полная версия', 'pw.active': 'Полная версия · открыта', 'pw.support': 'Поддержать автора', 'levels.pro': 'Полная версия',
      'hint.idle': 'Застрял? Нажми на лампочку: подскажу следующий шаг',
      'daily.t': 'Уровень дня', 'daily.lock': 'Уровень дня · откроется после {n} ур.', 'daily.streak': 'Серия: {n}', 'daily.done': 'Пройден · завтра новый', 'daily.note': 'Новый уровень завтра', 'share.btn': 'Поделиться', 'share.copied': 'Скопировано', 'share.fail': 'Не удалось скопировать', 'photo.btn': 'Фото',
      'share.level': 'Vantage · Уровень {n}', 'share.daily': 'Vantage · Уровень дня №{n}',
      'win.par': 'Эталон', 'win.tip.par': 'Ещё звезда: уложись в {n} или меньше', 'win.tip.hint': 'Ещё звезда: пройди без подсказок', 'win.tip.full': 'Идеальное прохождение',
      'dead.t': 'Отсюда путь не найти', 'dead.undo': 'Отменить ход', 'dead.reset': 'Заново', 'bar.reset': 'Уровень сброшен', 'bar.restore': 'Вернуть',
      'common.back': 'Назад', 'common.close': 'Закрыть', 'common.cancel': 'Отмена',
      'hud.level': 'Уровень {n}', 'hud.moves': 'Ходы', 'hud.undo': 'Отменить ход', 'hud.hint': 'Подсказка', 'hud.reset': 'Начать заново',
      'hud.rotl': 'Повернуть мир влево', 'hud.rotr': 'Повернуть мир вправо', 'hud.menu': 'К уровням',
      'levels.title': 'Уровни', 'levels.sub': 'Пройдено {n} из {m}', 'levels.locked': 'Закрыт', 'levels.best': 'Лучший: {n}', 'levels.new': 'Новый',
      'win.title': 'Путь найден', 'win.moves': 'Ходов', 'win.best': 'Лучший', 'win.hints': 'Подсказок',
      'win.next': 'Дальше', 'win.levels': 'К уровням', 'win.replay': 'Ещё раз', 'win.last': 'Ты прошёл все уровни. Новые главы скоро', 'ch.n': 'Глава {n}',
      'toast.blocked': 'Нет пути с этой стороны', 'toast.fixed': 'Ты стоишь на этом блоке — его не сдвинуть',
      'toast.nohint': 'Для этой позиции подсказки нет. Начни заново', 'toast.gate': 'Ворота открылись',
      'toast.stuck': 'Сначала дождись конца шага',
      'hint.rotl': 'Поверни мир влево', 'hint.rotr': 'Поверни мир вправо', 'hint.step': 'Иди сюда', 'hint.slide': 'Сдвинь блок: положение {n} из {m}',
      'coach.rot': 'Мир можно вращать: перетащи', 'coach.rotkey': 'Или нажми ← → на клавиатуре',
      'coach.seam': 'Смотри: острова сошлись на экране — теперь они соединены. Коснись плитки, чтобы идти',
      'coach.seamno': 'Здесь острова ещё не сошлись. Поверни мир дальше',
      'coach.goal': 'Дойди до светящегося портала',
      'coach.lever': 'Наступи на рычаг — ворота откроются и останутся открытыми',
      'coach.slider': 'Этот блок можно сдвинуть — перетащи его', 'coach.crumble': 'Рыжие плитки рассыпаются, как только ты с них сошёл. Назад дороги нет — планируй путь', 'coach.phase': 'Призрачные плитки видны только с двух сторон. Поворачивай мир, чтобы они появлялись', 'coach.toggle': 'Этот рычаг переключает: одни ворота открывает, другие закрывает. Каждое наступание меняет всё обратно', 'toast.gateoff': 'Ворота закрылись', 'coach.ok': 'Понятно',
      'set.title': 'Настройки', 'set.lang': 'Язык', 'set.sound': 'Звуки', 'set.sound.s': 'Шаги, щелчки, финал', 'set.music': 'Музыка', 'set.music.s': 'Тихий фон',
      'set.haptics': 'Вибрация', 'set.haptics.s': 'Отклик на касания', 'set.reset': 'Сбросить прогресс',
      'set.reset.q': 'Сбросить прогресс?', 'set.reset.p': 'Пройденные уровни, звёзды, серия уровня дня и подсказки обучения будут удалены.', 'set.reset.go': 'Сбросить',
      'how.title': 'Как играть', 'how.sub': 'Три правила этого мира',
      'how.1.h': 'Вращай мир', 'how.1.p': 'Перетащи по экрану или нажми стрелки: вид переключается между четырьмя сторонами.',
      'how.2.h': 'Соединяй на экране', 'how.2.p': 'Если плитки касаются на экране, между ними можно пройти — даже когда в мире они далеко друг от друга.',
      'how.3.h': 'Дойди до портала', 'how.3.p': 'Коснись плитки, чтобы идти. Рычаги открывают ворота, а блоки можно двигать.',
      'how.stars': 'Звёзды: пройти уровень, обойтись без подсказок, уложиться в эталон ходов. Повороты мира не считаются.', 'how.go': 'К игре',
    },
    en: {
      'app.tagline': 'A world where distance is a matter of angle',
      'menu.play': 'Play', 'menu.continue': 'Continue', 'menu.levels': 'Levels', 'menu.how': 'How to play', 'menu.settings': 'Settings',
      'menu.credit': '',
      'pw.title': 'Full version', 'pw.p': 'Chapters 3–5 and every future level. The first two chapters stay free forever.', 'pw.buy': 'Buy the full version', 'pw.code': 'Already have a licence? Paste the code or link', 'pw.ok': 'Unlock', 'pw.later': 'Not now', 'pw.bad': 'That code does not work', 'pw.on': 'Full version unlocked. Thank you!', 'pw.open': 'Full version', 'pw.active': 'Full version · unlocked', 'pw.support': 'Support the author', 'levels.pro': 'Full version',
      'hint.idle': 'Stuck? Tap the bulb for the next step',
      'daily.t': 'Daily level', 'daily.lock': 'Daily level · unlocks after {n} more', 'daily.streak': 'Streak: {n}', 'daily.done': 'Solved · new one tomorrow', 'daily.note': 'A new level tomorrow', 'share.btn': 'Share', 'share.copied': 'Copied', 'share.fail': 'Could not copy', 'photo.btn': 'Photo',
      'share.level': 'Vantage · Level {n}', 'share.daily': 'Vantage · Daily level #{n}',
      'win.par': 'Par', 'win.tip.par': 'One more star: finish in {n} or fewer', 'win.tip.hint': 'One more star: finish without hints', 'win.tip.full': 'A perfect run',
      'dead.t': 'There is no way out from here', 'dead.undo': 'Undo move', 'dead.reset': 'Restart', 'bar.reset': 'Level restarted', 'bar.restore': 'Bring back',
      'common.back': 'Back', 'common.close': 'Close', 'common.cancel': 'Cancel',
      'hud.level': 'Level {n}', 'hud.moves': 'Moves', 'hud.undo': 'Undo move', 'hud.hint': 'Hint', 'hud.reset': 'Restart',
      'hud.rotl': 'Turn the world left', 'hud.rotr': 'Turn the world right', 'hud.menu': 'To levels',
      'levels.title': 'Levels', 'levels.sub': '{n} of {m} solved', 'levels.locked': 'Locked', 'levels.best': 'Best: {n}', 'levels.new': 'New',
      'win.title': 'Path found', 'win.moves': 'Moves', 'win.best': 'Best', 'win.hints': 'Hints',
      'win.next': 'Next', 'win.levels': 'Levels', 'win.replay': 'Replay', 'win.last': 'You finished every level. New chapters are coming', 'ch.n': 'Chapter {n}',
      'toast.blocked': 'No path from this side', 'toast.fixed': 'You are standing on this block, so it cannot move',
      'toast.nohint': 'No hint for this position. Try restarting', 'toast.gate': 'The gate opened',
      'toast.stuck': 'Wait for the step to finish',
      'hint.rotl': 'Turn the world left', 'hint.rotr': 'Turn the world right', 'hint.step': 'Go here', 'hint.slide': 'Slide the block: position {n} of {m}',
      'coach.rot': 'You can turn the world: drag', 'coach.rotkey': 'Or press the arrow keys',
      'coach.seam': 'Look: the islands meet on screen, so now they are connected. Tap a tile to walk',
      'coach.seamno': 'The islands do not meet from here yet. Keep turning',
      'coach.goal': 'Reach the glowing portal',
      'coach.lever': 'Step on the lever: the gate opens and stays open',
      'coach.slider': 'This block can slide. Drag it', 'coach.crumble': 'Orange tiles crumble once you step off. There is no way back, so plan your path', 'coach.phase': 'Ghost tiles exist only from two opposite sides. Turn the world to make them appear', 'coach.toggle': 'This lever flips: it opens some gates and closes others. Every visit switches them back', 'toast.gateoff': 'The gate closed', 'coach.ok': 'Got it',
      'set.title': 'Settings', 'set.lang': 'Language', 'set.sound': 'Sound', 'set.sound.s': 'Steps, clicks, finale', 'set.music': 'Music', 'set.music.s': 'Quiet backdrop',
      'set.haptics': 'Haptics', 'set.haptics.s': 'Touch feedback', 'set.reset': 'Reset progress',
      'set.reset.q': 'Reset progress?', 'set.reset.p': 'Solved levels, stars, the daily streak and tutorial hints will be erased.', 'set.reset.go': 'Reset',
      'how.title': 'How to play', 'how.sub': 'Three rules of this world',
      'how.1.h': 'Turn the world', 'how.1.p': 'Drag across the screen or press the arrows: the view snaps between four sides.',
      'how.2.h': 'Connect on screen', 'how.2.p': 'If two tiles touch on screen you can walk between them, even when they are far apart in the world.',
      'how.3.h': 'Reach the portal', 'how.3.p': 'Tap a tile to walk. Levers open gates, and some blocks can be slid.',
      'how.stars': 'Stars: solve the level, use no hints, finish within par. Turning the world is free.', 'how.go': 'Back to game',
    },
  };
  let cur = 'ru'; const subs = [];
  const t = (k, p) => {
    const d = D[cur]; let s = d && k in d ? d[k] : k in D.ru ? D.ru[k] : k;
    if (p) for (const n in p) s = s.split('{' + n + '}').join(p[n]);
    return s;
  };
  function apply(el) {
    const r = el || document;
    r.querySelectorAll('[data-i18n]').forEach((n) => { n.textContent = t(n.dataset.i18n); });
    r.querySelectorAll('[data-i18n-aria]').forEach((n) => n.setAttribute('aria-label', t(n.dataset.i18nAria)));
    r.querySelectorAll('[data-i18n-title]').forEach((n) => n.setAttribute('title', t(n.dataset.i18nTitle)));
  }
  function setLang(l) {
    if (!D[l]) l = 'ru';
    cur = l;
    if (typeof document !== 'undefined') { document.documentElement.lang = l; apply(); }
    subs.forEach((f) => { try { f(l); } catch (e) { /* ignore */ } });
  }
  V.i18n = { t, setLang, lang: () => cur, apply, pick: (o) => (o && (o[cur] || o.ru)) || '', onChange: (f) => subs.push(f) };
})(typeof window !== 'undefined' ? window : globalThis);
