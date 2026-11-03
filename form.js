// Чистая логика формы Г6 «Что приехало?». Работает в браузере (глобальный CierreForm) и в node (module.exports).
// Формат ссылки: <адрес>#<base64url(UTF-8 JSON)>, JSON {"v":1,"k","t","c","d","g":[[группа,[[номер,название,на руках],…]],…]}.
(function (root) {
  'use strict';

  function plural(n, one, few, many) {
    var m10 = n % 10, m100 = n % 100;
    if (m10 === 1 && m100 !== 11) return one;
    if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
    return many;
  }

  function isInt(x) { return typeof x === 'number' && isFinite(x) && Math.floor(x) === x; }

  function validData(d) {
    if (!d || typeof d !== 'object' || d.v !== 1 || !Array.isArray(d.g) || d.g.length === 0) return false;
    for (var i = 0; i < d.g.length; i++) {
      var g = d.g[i];
      if (!Array.isArray(g) || typeof g[0] !== 'string' || !Array.isArray(g[1])) return false;
      for (var j = 0; j < g[1].length; j++) {
        var it = g[1][j];
        if (!Array.isArray(it) || !isInt(it[0]) || typeof it[1] !== 'string' || !isInt(it[2]) || it[2] < 0) return false;
      }
    }
    return true;
  }

  // '#...' или просто строка base64url -> данные или null (без исключений).
  function decodeHash(hash) {
    try {
      var s = String(hash || '');
      if (s.charAt(0) === '#') s = s.slice(1);
      if (!s) return null;
      s = s.replace(/-/g, '+').replace(/_/g, '/');
      while (s.length % 4) s += '=';
      var bin = atob(s);
      var bytes = new Uint8Array(bin.length);
      for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      var data = JSON.parse(new TextDecoder('utf-8').decode(bytes));
      return validData(data) ? data : null;
    } catch (e) {
      return null;
    }
  }

  // Оставляет только цифры, без ведущих нулей; пусто -> 0.
  function parseCount(text) {
    var digits = String(text || '').replace(/\D/g, '').replace(/^0+/, '').slice(0, 5);
    return digits ? parseInt(digits, 10) : 0;
  }

  function valueOf(vals, num) {
    var v = vals && vals[num];
    return isInt(v) && v > 0 ? v : 0;
  }

  // kind: 'left' (меньше, чем на руках) | 'over' (больше) | 'none'.
  function noteFor(onhand, value) {
    if (value > onhand) return { text: 'больше, чем на руках, на ' + (value - onhand), kind: 'over' };
    if (value > 0 && value < onhand) return { text: 'у клиента останется ' + (onhand - value), kind: 'left' };
    return { text: '', kind: 'none' };
  }

  function groupSummary(items, vals) {
    var units = 0, positions = 0;
    for (var i = 0; i < items.length; i++) {
      var v = valueOf(vals, items[i][0]);
      if (v > 0) { units += v; positions += 1; }
    }
    if (units === 0) return 'пока ничего не внесено';
    return 'внесено ' + units + ' шт · ' + positions + ' ' + plural(positions, 'позиция', 'позиции', 'позиций');
  }

  function totals(data, vals) {
    var t = { onhand: 0, entered: 0, left: 0, over: 0 };
    data.g.forEach(function (g) {
      g[1].forEach(function (it) {
        var v = valueOf(vals, it[0]);
        t.onhand += it[2];
        t.entered += v;
        if (v > it[2]) t.over += 1; else t.left += it[2] - v;
      });
    });
    return t;
  }

  function footLine(data, vals) {
    var t = totals(data, vals);
    if (t.over > 0) return 'Есть позиции больше, чем на руках — проверь их';
    if (t.left === 0) return 'Приехало всё, что было на руках';
    return 'У клиента останется ' + t.left + ' шт из ' + t.onhand + ' — бот спросит, недостача это или ещё вернут';
  }

  function mainText(data, vals) {
    return 'Принять · внесено ' + totals(data, vals).entered + ' шт';
  }

  // JSON для Telegram.WebApp.sendData: только ненулевые, в порядке групп.
  function answer(data, vals) {
    var q = [];
    data.g.forEach(function (g) {
      g[1].forEach(function (it) {
        var v = valueOf(vals, it[0]);
        if (v > 0) q.push([it[0], v]);
      });
    });
    return JSON.stringify({ v: 1, k: data.k, t: data.t, q: q });
  }

  var api = {
    decodeHash: decodeHash, parseCount: parseCount, noteFor: noteFor, groupSummary: groupSummary,
    totals: totals, footLine: footLine, mainText: mainText, answer: answer, plural: plural
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.CierreForm = api;
})(typeof window !== 'undefined' ? window : this);
