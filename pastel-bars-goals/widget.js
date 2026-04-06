let fieldData;
let currencySymbol = '$';
let customCounterValue = 0;
var lastSessionData = {};

function persistSession(obj) {
  if (!obj || !obj.detail) return;
  var s = obj.detail.session;
  lastSessionData = s && s.data !== undefined ? s.data : s;
}

function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}

function formatTip(amount, decimals) {
  var n = Number(amount) || 0;
  var d = parseInt(decimals, 10);
  return n.toFixed(clamp(isNaN(d) ? 0 : d, 0, 2));
}

function truthy(v) {
  return v === true || v === 'true' || v === 1;
}

function counterValue(counter) {
  if (!counter) return 0;
  if (typeof counter.value !== 'undefined') return parseInt(counter.value, 10) || 0;
  if (typeof counter.count !== 'undefined') return parseInt(counter.count, 10) || 0;
  return 0;
}

function setRowHidden(el, hidden) {
  if (!el) return;
  if (hidden) el.classList.add('goal-row--hidden');
  else el.classList.remove('goal-row--hidden');
}

function setFillAndStat(fillEl, statEl, current, target, pct, formatStat) {
  if (fillEl) fillEl.style.width = pct + '%';
  if (statEl) statEl.textContent = formatStat(current, target, pct);
}

function getSessionMetric(d, key, prefer) {
  var o = d[key];
  if (!o || typeof o !== 'object') return 0;
  if (prefer === 'amount' && typeof o.amount !== 'undefined') return Number(o.amount) || 0;
  if (prefer === 'count' && typeof o.count !== 'undefined') return Number(o.count) || 0;
  if (typeof o.amount !== 'undefined') return Number(o.amount) || 0;
  if (typeof o.count !== 'undefined') return Number(o.count) || 0;
  return 0;
}

function tf(fieldKey) {
  var v = fieldData[fieldKey];
  if (!v || typeof v !== 'string') return 'manual';
  return v;
}

function valueForMetric(d, metric, timeframe) {
  var tfm = timeframe || 'manual';
  if (metric === 'tip') {
    if (tfm === 'total') return getSessionMetric(d, 'tip-total', 'amount');
    if (tfm === 'month') return getSessionMetric(d, 'tip-month', 'amount');
    if (tfm === 'week') return getSessionMetric(d, 'tip-week', 'amount');
    if (tfm === 'session') return getSessionMetric(d, 'tip-session', 'amount');
    return getSessionMetric(d, 'tip-goal', 'amount');
  }
  if (metric === 'follower') {
    if (tfm === 'total') return getSessionMetric(d, 'follower-total', 'count');
    if (tfm === 'month') return getSessionMetric(d, 'follower-month', 'count');
    if (tfm === 'week') return getSessionMetric(d, 'follower-week', 'count');
    if (tfm === 'session') return getSessionMetric(d, 'follower-session', 'count');
    return getSessionMetric(d, 'follower-goal', 'amount');
  }
  if (metric === 'sub') {
    if (tfm === 'total') return getSessionMetric(d, 'subscriber-total', 'count');
    if (tfm === 'month') return getSessionMetric(d, 'subscriber-month', 'count');
    if (tfm === 'week') return getSessionMetric(d, 'subscriber-week', 'count');
    if (tfm === 'session') return getSessionMetric(d, 'subscriber-session', 'count');
    return getSessionMetric(d, 'subscriber-goal', 'amount');
  }
  if (metric === 'cheer') {
    if (tfm === 'total') return getSessionMetric(d, 'cheer-total', 'amount');
    if (tfm === 'month') return getSessionMetric(d, 'cheer-month', 'amount');
    if (tfm === 'week') {
      var w = d['cheer-week'];
      if (w && typeof w.amount !== 'undefined') return Number(w.amount) || 0;
      return 0;
    }
    if (tfm === 'session') return getSessionMetric(d, 'cheer-session', 'amount');
    return getSessionMetric(d, 'cheer-goal', 'amount');
  }
  return 0;
}

function updateView(d) {
  d = d || {};

  var tipCurrent = valueForMetric(d, 'tip', tf('timeframeDonation'));
  var folCurrent = valueForMetric(d, 'follower', tf('timeframeFollower'));
  var subCurrent = valueForMetric(d, 'sub', tf('timeframeSub'));
  var cheerCurrent = valueForMetric(d, 'cheer', tf('timeframeBits'));

  var tipTarget = Math.max(1, parseFloat(fieldData.tipGoalTarget) || 1);
  var folTarget = Math.max(1, parseFloat(fieldData.followerGoalTarget) || 1);
  var subTarget = Math.max(1, parseFloat(fieldData.subGoalTarget) || 1);
  var cheerTarget = Math.max(1, parseFloat(fieldData.cheerGoalTarget) || 1);
  var customTarget = Math.max(1, parseFloat(fieldData.customGoalTarget) || 1);

  var tipPct = clamp((tipCurrent / tipTarget) * 100, 0, 100);
  var folPct = clamp((folCurrent / folTarget) * 100, 0, 100);
  var subPct = clamp((subCurrent / subTarget) * 100, 0, 100);
  var cheerPct = clamp((cheerCurrent / cheerTarget) * 100, 0, 100);
  var customPct = clamp((customCounterValue / customTarget) * 100, 0, 100);

  var dec = fieldData.tipDecimals;
  var showBits = truthy(fieldData.showBitsRow);
  var showCustom = truthy(fieldData.showCustomRow);
  var customName = (fieldData.customCounterName && String(fieldData.customCounterName).trim()) || '';

  setRowHidden(document.querySelector('.js-row-bits'), !showBits);
  setRowHidden(document.querySelector('.js-row-custom'), !showCustom || !customName);

  var fmtMoney = function (cur, tgt) {
    return currencySymbol + formatTip(cur, dec) + ' / ' + currencySymbol + formatTip(tgt, dec);
  };
  var fmtPair = function (cur, tgt) {
    return Math.floor(cur) + ' / ' + Math.floor(tgt);
  };
  var fmtPct = function (cur, tgt, pct) {
    if (truthy(fieldData.showPercentPrimary)) {
      return pct.toFixed(0) + '%';
    }
    return fmtPair(cur, tgt);
  };

  setFillAndStat(
    document.querySelector('.js-donation-fill'),
    document.querySelector('.js-donation-stat'),
    tipCurrent,
    tipTarget,
    tipPct,
    function (c, t, p) {
      return truthy(fieldData.showPercentPrimary) ? p.toFixed(0) + '%' : fmtMoney(c, t);
    }
  );

  setFillAndStat(
    document.querySelector('.js-follower-fill'),
    document.querySelector('.js-follower-stat'),
    folCurrent,
    folTarget,
    folPct,
    fmtPct
  );

  setFillAndStat(
    document.querySelector('.js-sub-fill'),
    document.querySelector('.js-sub-stat'),
    subCurrent,
    subTarget,
    subPct,
    fmtPct
  );

  setFillAndStat(
    document.querySelector('.js-bits-fill'),
    document.querySelector('.js-bits-stat'),
    cheerCurrent,
    cheerTarget,
    cheerPct,
    fmtPct
  );

  setFillAndStat(
    document.querySelector('.js-custom-fill'),
    document.querySelector('.js-custom-stat'),
    customCounterValue,
    customTarget,
    customPct,
    fmtPct
  );
}

function fetchCustomCounter() {
  var name = fieldData && fieldData.customCounterName && String(fieldData.customCounterName).trim();
  if (!name || typeof SE_API === 'undefined' || !SE_API.counters || !SE_API.counters.get) {
    customCounterValue = 0;
    return Promise.resolve();
  }
  return SE_API.counters.get(name)
    .then(function (counter) {
      customCounterValue = counterValue(counter);
    })
    .catch(function () {
      customCounterValue = 0;
    });
}

function refreshFromSession() {
  fetchCustomCounter().then(function () {
    updateView(lastSessionData);
  });
}

window.addEventListener('onWidgetLoad', function (obj) {
  fieldData = obj.detail.fieldData || {};
  var c = obj.detail.currency;
  if (c && c.symbol) {
    currencySymbol = c.symbol;
  } else if (c && typeof c === 'string') {
    currencySymbol = c;
  }
  persistSession(obj);
  refreshFromSession();
});

window.addEventListener('onSessionUpdate', function (obj) {
  persistSession(obj);
  refreshFromSession();
});

window.addEventListener('onEventReceived', function (obj) {
  var listener = obj.detail && obj.detail.listener;
  var data = obj.detail && obj.detail.event;
  if (listener !== 'bot:counter' || !data) return;
  var name = fieldData && fieldData.customCounterName && String(fieldData.customCounterName).trim();
  if (!name || data.counter !== name) return;
  customCounterValue = parseInt(data.value, 10) || 0;
  updateView(lastSessionData);
});
