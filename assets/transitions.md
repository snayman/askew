# Экран перехода между уровнями

Подключение: `<link rel="stylesheet" href="assets/transitions.css">` после panels.css.

Разметка (один элемент в #app, поверх canvas):

```html
<div class="transition" id="transition" aria-hidden="true">
  <div class="transition__inner">
    <div class="transition__num" id="tr-num">7</div>
    <i class="transition__rule"></i>
    <div class="transition__chapter" id="tr-chapter">Глава II · Название</div>
  </div>
</div>
```

Логика:
1. Заполнить `#tr-num` и `#tr-chapter`, добавить `.is-on` (фон гаснет за 260 мс, текст появляется со сдвигом 6px, каскад 60/120/180 мс).
2. Пока экран непрозрачен (~120 мс), загрузить/перестроить уровень.
3. Снять `.is-on` (затухание 220 мс). Итого около 600 мс, не больше 700.
4. `aria-hidden` оставить true, для скринридеров озвучивать номер уровня через существующую live-область.

Только opacity и transform, без blur и теней. При `prefers-reduced-motion` остаётся простое затухание 120 мс без сдвигов. Использует токены из style.css (--ink-0, --text, --text-2, --gold) с запасными значениями.
