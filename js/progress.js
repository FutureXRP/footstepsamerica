/* Footsteps Through America — shared namespace, config, and localStorage progress.
   Phase 1: localStorage only. Phase 3 swaps this module's storage for Supabase sync. */

var FTA = (function () {
  var CONFIG = {
    // Launch state: paywall STRIPPED. Purchase flow exists but stays behind this flag.
    paywallEnabled: false,
    freeStories: 3,
    priceLabel: '$29',
    totalEras: 10,
    dataRoot: '../data/',
    audioRoot: '../'
  };

  var cache = {};
  function getJSON(path) {
    if (cache[path]) return cache[path];
    cache[path] = fetch(path).then(function (r) {
      if (!r.ok) throw new Error('Failed to load ' + path + ' (' + r.status + ')');
      return r.json();
    });
    return cache[path];
  }

  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function eraDir(era) { return CONFIG.dataRoot + 'tier1/era-' + pad2(era) + '/'; }
  function storyPath(era, slot) { return eraDir(era) + 'story-' + pad2(slot) + '.json'; }
  function quizPath(era) { return eraDir(era) + 'quiz.json'; }

  return {
    CONFIG: CONFIG,
    getJSON: getJSON,
    pad2: pad2,
    storyPath: storyPath,
    quizPath: quizPath,
    erasPath: CONFIG.dataRoot + 'eras.json'
  };
})();

var Progress = (function () {
  var KEY = 'fta-progress-v1';

  function load() {
    try { return JSON.parse(localStorage.getItem(KEY)) || {}; }
    catch (e) { return {}; }
  }
  function save(state) {
    try { localStorage.setItem(KEY, JSON.stringify(state)); }
    catch (e) { /* private mode etc.; progress just won't persist */ }
  }
  function state() {
    var s = load();
    s.read = s.read || {};       // storyId -> true
    s.quizzes = s.quizzes || {}; // era -> {passed:true, best:score, total:n}
    s.name = s.name || '';
    s.purchased = !!s.purchased; // Phase 4: set by Stripe success redirect
    return s;
  }

  return {
    isRead: function (storyId) { return !!state().read[storyId]; },
    markRead: function (storyId) {
      var s = state(); s.read[storyId] = true; save(s);
    },
    readCount: function (storyIds) {
      var s = state();
      return storyIds.filter(function (id) { return s.read[id]; }).length;
    },
    recordQuiz: function (era, score, total) {
      var s = state();
      var prev = s.quizzes[era] || { best: 0 };
      var passed = (score / total) * 100 >= 80;
      s.quizzes[era] = {
        passed: prev.passed || passed,
        best: Math.max(prev.best || 0, score),
        total: total
      };
      save(s);
      return passed;
    },
    isEraPassed: function (era) {
      var q = state().quizzes[era];
      return !!(q && q.passed);
    },
    quizBest: function (era) {
      var q = state().quizzes[era];
      return q ? q.best : null;
    },
    badgeCount: function () {
      var s = state(), n = 0;
      Object.keys(s.quizzes).forEach(function (k) { if (s.quizzes[k].passed) n++; });
      return n;
    },
    hasPatriot: function () { return this.badgeCount() >= FTA.CONFIG.totalEras; },
    getName: function () { return state().name; },
    setName: function (name) { var s = state(); s.name = String(name || '').slice(0, 60); save(s); },
    isPurchased: function () { return state().purchased; },
    // Paywall gate: story is playable if paywall is off, purchased, already read,
    // or within the free allowance. Built now, dormant until launch.
    canReadStory: function (storyId, globalIndex) {
      if (!FTA.CONFIG.paywallEnabled) return true;
      if (this.isPurchased()) return true;
      if (this.isRead(storyId)) return true;
      return globalIndex < FTA.CONFIG.freeStories;
    }
  };
})();
