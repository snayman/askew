// Askew i18n: V.i18n.t(key, params), setLang(l), lang(), pick({ru,en}), apply(root), onChange(fn).
// Markup: data-i18n="key" (text), data-i18n-aria="key" (aria-label), data-i18n-title="key" (title).
(function (root) {
  const V = (root.V = root.V || {});
  const D = {
    ru: {
      'app.tagline': 'Мир, где расстояние — вопрос ракурса',
      'menu.play': 'Играть', 'menu.continue': 'Продолжить', 'menu.levels': 'Уровни', 'menu.how': 'Как играть', 'menu.settings': 'Настройки',
      'menu.credit': 'RBW', 'splash.presents': 'представляет',
      'pw.title': 'Полная версия', 'pw.p': 'Все остальные главы и будущие уровни. Бесплатные главы остаются бесплатными навсегда. Разовая покупка, без подписки.', 'pw.buy': 'Купить полную версию', 'pw.restore': 'Восстановить покупку', 'pw.later': 'Позже', 'pw.bad': 'Покупка не завершена', 'pw.on': 'Полная версия открыта. Спасибо!', 'pw.open': 'Полная версия', 'pw.active': 'Полная версия · открыта', 'levels.pro': 'Полная версия',
      'hint.idle': 'Застрял? Нажми на лампочку: подскажу идею. Один раз на уровень',
      'daily.t': 'Уровень дня', 'daily.lock': 'Уровень дня · ещё {n}', 'daily.done': 'Пройден · завтра новый', 'daily.note': 'Новый уровень завтра', 'share.btn': 'Поделиться', 'share.copied': 'Скопировано', 'share.fail': 'Не удалось скопировать', 'photo.btn': 'Фото',
      'share.level': 'Askew · Уровень {n}', 'share.daily': 'Askew · Уровень дня №{n}',
      'win.par': 'Эталон', 'win.tip.par': 'Ещё звезда: уложись в {n} или меньше', 'win.tip.hint': 'Ещё звезда: пройди без подсказок', 'win.tip.full': 'Идеальное прохождение',
      'dead.t': 'Отсюда путь не найти', 'dead.undo': 'Отменить ход', 'dead.reset': 'Заново', 'bar.reset': 'Уровень сброшен', 'bar.restore': 'Вернуть',
      'common.back': 'Назад', 'common.close': 'Закрыть', 'common.cancel': 'Отмена',
      'hud.level': 'Уровень {n}', 'hud.moves': 'Ходы', 'hud.undo': 'Отменить ход', 'hud.hint': 'Подсказка', 'hud.reset': 'Начать заново',
      'hud.rotl': 'Повернуть мир влево', 'hud.rotr': 'Повернуть мир вправо', 'hud.menu': 'К уровням',
      'levels.title': 'Уровни', 'levels.sub': 'Пройдено {n} из {m}', 'levels.locked': 'Закрыт', 'levels.best': 'Лучший: {n}', 'levels.new': 'Новый',
      'win.title': 'Путь найден', 'win.moves': 'Ходов', 'win.best': 'Лучший', 'win.hints': 'Подсказок',
      'win.next': 'Дальше', 'win.levels': 'Уровни', 'win.replay': 'Ещё раз', 'win.last': 'Ты прошёл все уровни. Новые главы скоро', 'ch.n': 'Глава {n}',
      'toast.blocked': 'Нет пути с этой стороны', 'toast.fixed': 'Ты стоишь на этом блоке — его не сдвинуть',
      'toast.nohint': 'Для этой позиции подсказки нет. Начни заново', 'toast.gate': 'Ворота открылись',
      'toast.stuck': 'Сначала дождись конца шага',
      'hint.rotl': 'Поверни мир влево', 'hint.rotr': 'Поверни мир вправо', 'hint.go': 'Отсюда можно дойти до подсвеченной плитки.', 'hint.rt.l': 'Поверни мир влево{x}: потом дойдёшь до подсвеченной плитки.', 'hint.rt.r': 'Поверни мир вправо{x}: потом дойдёшь до подсвеченной плитки.', 'hint.twice': ' дважды', 'hint.lever': 'Сначала нужен рычаг: он подсвечен.', 'hint.warp': 'Шагни в портал: он перенесёт тебя на другую сторону.', 'hint.spent': 'Подсказка на этом уровне уже использована. Дальше сам.', 'hint.step': 'Иди сюда', 'hint.slide': 'Сдвинь блок: положение {n} из {m}',
      'coach.rot': 'Мир можно вращать: перетащи', 'coach.rotkey': 'Или нажми ← → на клавиатуре',
      'coach.seam': 'Смотри: острова сошлись на экране — теперь они соединены. Коснись плитки, чтобы идти',
      'coach.seamno': 'Здесь острова ещё не сошлись. Поверни мир дальше',
      'coach.goal': 'Дойди до светящегося портала',
      'coach.lever': 'Наступи на рычаг — ворота откроются и останутся открытыми',
      'coach.warp': 'Фиолетовое кольцо — портал. Шагни в него, и выйдешь из его пары', 'coach.twin': 'Голубой двойник повторяет твои шаги зеркально. Оба должны дойти до своих колец', 'coach.slider': 'Этот блок можно сдвинуть — перетащи его', 'coach.crumble': 'Рыжие плитки рассыпаются, как только ты с них сошёл. Назад дороги нет — планируй путь', 'coach.phase': 'Призрачные плитки видны только с двух сторон. Поворачивай мир, чтобы они появлялись', 'coach.toggle': 'Этот рычаг переключает: одни ворота открывает, другие закрывает. Каждое наступание меняет всё обратно', 'toast.gateoff': 'Ворота закрылись', 'coach.ok': 'Понятно',
      'set.title': 'Настройки', 'set.lang': 'Язык', 'set.sound': 'Звуки', 'set.sound.s': 'Шаги, щелчки, финал', 'set.music': 'Музыка', 'set.music.s': 'Тихий фон',
      'set.haptics': 'Вибрация', 'set.haptics.s': 'Отклик на касания', 'set.reset': 'Сбросить прогресс',
      'set.reset.q': 'Сбросить прогресс?', 'set.reset.p': 'Пройденные уровни, звёзды и подсказки обучения будут удалены.', 'set.reset.go': 'Сбросить',
      'how.title': 'Как играть', 'how.sub': 'Три правила этого мира',
      'how.1.h': 'Вращай мир', 'how.1.p': 'Перетащи по экрану или нажми стрелки: вид переключается между четырьмя сторонами.',
      'how.2.h': 'Соединяй на экране', 'how.2.p': 'Если плитки касаются на экране, между ними можно пройти — даже когда в мире они далеко друг от друга.',
      'how.3.h': 'Дойди до кольца', 'how.3.p': 'Коснись плитки, чтобы идти. Рычаги открывают ворота, а блоки можно двигать.',
      'set.foot': 'Askew · {n} уровней · работает без интернета', 'how.legend': 'Что встретится', 'how.l.lever': 'Рычаг и ворота', 'how.l.lever.p': 'Наступи на рычаг, и ворота откроются. Переключатель меняет их туда и обратно.', 'how.l.slider': 'Блок-ползунок', 'how.l.slider.p': 'Его можно сдвинуть пальцем: новое положение соединяет другие плитки.', 'how.l.crumble': 'Хрупкая плитка', 'how.l.crumble.p': 'Рассыпается, как только ты с неё сошёл. Назад нельзя.', 'how.l.ghost': 'Призрак', 'how.l.ghost.p': 'Есть только с двух противоположных сторон. Поворачивай мир.', 'how.l.portal': 'Портал', 'how.l.portal.p': 'Шагни в кольцо, и выйдешь из парного.', 'how.l.twin': 'Двойник', 'how.l.twin.p': 'Повторяет твои шаги зеркально. Оба должны дойти до своих колец.', 'how.hint': 'Подсказка одна на уровень и открывает идею, а не весь путь.',
      'how.stars': 'Звёзды: пройти уровень, обойтись без подсказок, уложиться в эталон ходов. Повороты мира не считаются.', 'how.go': 'К игре',
    },
    en: {
      'app.tagline': 'A world where distance is a matter of angle',
      'menu.play': 'Play', 'menu.continue': 'Continue', 'menu.levels': 'Levels', 'menu.how': 'How to play', 'menu.settings': 'Settings',
      'menu.credit': 'RBW', 'splash.presents': 'presents',
      'pw.title': 'Full version', 'pw.p': 'Every remaining chapter and all future levels. Free chapters stay free forever. One purchase, no subscription.', 'pw.buy': 'Buy the full version', 'pw.restore': 'Restore purchase', 'pw.later': 'Not now', 'pw.bad': 'Purchase was not completed', 'pw.on': 'Full version unlocked. Thank you!', 'pw.open': 'Full version', 'pw.active': 'Full version · unlocked', 'levels.pro': 'Full version',
      'hint.idle': 'Stuck? Tap the bulb for an idea. One per level',
      'daily.t': 'Daily level', 'daily.lock': 'Daily level · {n} to go', 'daily.done': 'Solved · new one tomorrow', 'daily.note': 'A new level tomorrow', 'share.btn': 'Share', 'share.copied': 'Copied', 'share.fail': 'Could not copy', 'photo.btn': 'Photo',
      'share.level': 'Askew · Level {n}', 'share.daily': 'Askew · Daily level #{n}',
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
      'hint.rotl': 'Turn the world left', 'hint.rotr': 'Turn the world right', 'hint.go': 'From here you can reach the glowing tile.', 'hint.rt.l': 'Turn the world left{x}: then you can reach the glowing tile.', 'hint.rt.r': 'Turn the world right{x}: then you can reach the glowing tile.', 'hint.twice': ' twice', 'hint.lever': 'You need the lever first: it is lit.', 'hint.warp': 'Step into the portal: it carries you to the other side.', 'hint.spent': 'The hint on this level is already used. You are on your own.', 'hint.step': 'Go here', 'hint.slide': 'Slide the block: position {n} of {m}',
      'coach.rot': 'You can turn the world: drag', 'coach.rotkey': 'Or press the arrow keys',
      'coach.seam': 'Look: the islands meet on screen, so now they are connected. Tap a tile to walk',
      'coach.seamno': 'The islands do not meet from here yet. Keep turning',
      'coach.goal': 'Reach the glowing portal',
      'coach.lever': 'Step on the lever: the gate opens and stays open',
      'coach.warp': 'The violet ring is a portal. Step into it and you come out of its twin', 'coach.twin': 'The blue twin copies your steps in a mirror. Both of you must reach your rings', 'coach.slider': 'This block can slide. Drag it', 'coach.crumble': 'Orange tiles crumble once you step off. There is no way back, so plan your path', 'coach.phase': 'Ghost tiles exist only from two opposite sides. Turn the world to make them appear', 'coach.toggle': 'This lever flips: it opens some gates and closes others. Every visit switches them back', 'toast.gateoff': 'The gate closed', 'coach.ok': 'Got it',
      'set.title': 'Settings', 'set.lang': 'Language', 'set.sound': 'Sound', 'set.sound.s': 'Steps, clicks, finale', 'set.music': 'Music', 'set.music.s': 'Quiet backdrop',
      'set.haptics': 'Haptics', 'set.haptics.s': 'Touch feedback', 'set.reset': 'Reset progress',
      'set.reset.q': 'Reset progress?', 'set.reset.p': 'Solved levels, stars, tutorial hints will be erased.', 'set.reset.go': 'Reset',
      'how.title': 'How to play', 'how.sub': 'Three rules of this world',
      'how.1.h': 'Turn the world', 'how.1.p': 'Drag across the screen or press the arrows: the view snaps between four sides.',
      'how.2.h': 'Connect on screen', 'how.2.p': 'If two tiles touch on screen you can walk between them, even when they are far apart in the world.',
      'how.3.h': 'Reach the ring', 'how.3.p': 'Tap a tile to walk. Levers open gates, and some blocks can be slid.',
      'set.foot': 'Askew · {n} levels · works offline', 'how.legend': 'What you will meet', 'how.l.lever': 'Lever and gate', 'how.l.lever.p': 'Step on the lever and the gate opens. A toggle flips gates back and forth.', 'how.l.slider': 'Sliding block', 'how.l.slider.p': 'Drag it: its new position joins other tiles.', 'how.l.crumble': 'Fragile tile', 'how.l.crumble.p': 'Crumbles once you step off. No way back.', 'how.l.ghost': 'Ghost', 'how.l.ghost.p': 'Exists only from two opposite sides. Keep turning the world.', 'how.l.portal': 'Portal', 'how.l.portal.p': 'Step into a ring and you come out of its twin.', 'how.l.twin': 'Twin', 'how.l.twin.p': 'Copies your steps in a mirror. Both must reach their rings.', 'how.hint': 'One hint per level, and it gives the idea, not the whole path.',
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
