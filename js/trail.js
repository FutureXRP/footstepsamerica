/* Trail, Era, and Story views. All rendering is JSON-driven off data/. */

var Trail = (function () {

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function eraStoryIds(era) {
    var ids = [];
    for (var slot = 1; slot <= 5; slot++) ids.push('era' + FTA.pad2(era) + '-story' + FTA.pad2(slot));
    return ids;
  }

  function parseStoryId(id) {
    var m = /^era(\d\d)-story(\d\d)$/.exec(id);
    return m ? { era: parseInt(m[1], 10), slot: parseInt(m[2], 10) } : null;
  }

  /* ---------- Trail screen ---------- */

  function renderTrail(view) {
    return FTA.getJSON(FTA.erasPath).then(function (data) {
      var badges = Progress.badgeCount();
      var html =
        '<div class="screen-head">' +
        '  <span class="label">The Trail</span>' +
        '  <h1>Walk the whole road.</h1>' +
        '  <p class="screen-sub">Ten eras, in order. Read the stories, pass the mastery quiz, earn the badge. ' +
        badges + ' of ' + FTA.CONFIG.totalEras + ' badges earned.</p>' +
        '</div>' +
        '<div class="trail-screen"><div class="trail-line" aria-hidden="true"></div>';

      data.eras.forEach(function (e) {
        var passed = Progress.isEraPassed(e.era);
        var readCount = Progress.readCount(eraStoryIds(e.era));
        var cls = 'trail-era' + (passed ? ' earned' : '') + (e.available ? '' : ' locked');
        var status = passed
          ? 'Badge earned'
          : e.available
            ? (readCount + ' of ' + e.storyCount + ' stories read')
            : 'Coming soon';
        var inner =
          '<div class="era-badge">' + (passed ? '&#9733;' : esc(e.numeral)) + '</div>' +
          '<div class="trail-era-body">' +
          '  <div class="years">' + esc(e.years) + '</div>' +
          '  <h3>' + esc(e.title) + '</h3>' +
          '  <p>' + esc(e.blurb) + '</p>' +
          '  <span class="era-status">' + status + '</span>' +
          '</div>';
        html += e.available
          ? '<a class="' + cls + '" href="#/era/' + e.era + '">' + inner + '</a>'
          : '<div class="' + cls + '">' + inner + '</div>';
      });

      var patriot = Progress.hasPatriot();
      html +=
        '<div class="trail-era final' + (patriot ? ' earned' : ' locked') + '">' +
        '  <div class="era-badge">&#9733;</div>' +
        '  <div class="trail-era-body">' +
        '    <div class="years">' + esc(data.capstone.years) + '</div>' +
        '    <h3>' + esc(data.capstone.title) + '</h3>' +
        '    <p>' + esc(data.capstone.blurb) + '</p>' +
        '    <span class="era-status">' + (patriot ? 'Earned' : 'Locked') + '</span>' +
        '  </div>' +
        '</div>';

      html += '</div>';
      view.innerHTML = html;
    });
  }

  /* ---------- Era screen ---------- */

  function renderEra(view, era) {
    var storyFetches = [];
    for (var slot = 1; slot <= 5; slot++) storyFetches.push(FTA.getJSON(FTA.storyPath(era, slot)));

    return Promise.all([FTA.getJSON(FTA.erasPath), Promise.all(storyFetches)]).then(function (res) {
      var eraMeta = res[0].eras.filter(function (e) { return e.era === era; })[0];
      var stories = res[1];
      if (!eraMeta) { view.innerHTML = '<p class="screen-sub">Unknown era.</p>'; return; }

      var passed = Progress.isEraPassed(era);
      var readCount = Progress.readCount(stories.map(function (s) { return s.id; }));

      var html =
        '<a class="crumb" href="#/trail">&larr; The Trail</a>' +
        '<div class="screen-head">' +
        '  <span class="label">Era ' + esc(eraMeta.numeral) + ' &middot; ' + esc(eraMeta.years) + '</span>' +
        '  <h1>' + esc(eraMeta.title) + '</h1>' +
        '  <p class="screen-sub">' + esc(eraMeta.blurb) + '</p>' +
        '</div>' +
        '<div class="story-list">';

      stories.forEach(function (s) {
        var read = Progress.isRead(s.id);
        html +=
          '<a class="story-row' + (read ? ' read' : '') + '" href="#/story/' + esc(s.id) + '">' +
          '  <span class="story-num">' + s.slot + '</span>' +
          '  <span class="story-row-body">' +
          '    <strong>' + esc(s.title) + '</strong>' +
          '    <span class="story-row-sub">' + esc(s.subtitle) + ' &middot; ' + s.readMinutes + ' min</span>' +
          '  </span>' +
          '  <span class="story-check">' + (read ? '&#10003;' : '') + '</span>' +
          '</a>';
      });

      html += '</div>' +
        '<div class="era-quiz-card">' +
        '  <div>' +
        '    <span class="label">Mastery quiz</span>' +
        '    <h3>Earn the ' + esc(eraMeta.title) + ' badge</h3>' +
        '    <p>25 questions from the five stories. Pass with 20 or more and the badge is yours. Earned, not given.</p>' +
        (passed
          ? '    <p class="quiz-passed">&#9733; Badge earned' + (Progress.quizBest(era) !== null ? ' &middot; best score ' + Progress.quizBest(era) + '/25' : '') + '</p>'
          : (readCount < 5 ? '    <p class="quiz-hint">Tip: read all five stories first. ' + readCount + ' of 5 done.</p>' : '')) +
        '  </div>' +
        '  <div class="era-quiz-actions">' +
        '    <a class="btn btn-ink" href="#/quiz/' + era + '">' + (passed ? 'Retake the quiz' : 'Take the quiz') + '</a>' +
        (passed ? '    <a class="btn btn-ghost" href="../certificates/era-' + FTA.pad2(era) + '.html" target="_blank" rel="noopener">Print certificate</a>' : '') +
        '  </div>' +
        '</div>';

      view.innerHTML = html;
    });
  }

  /* ---------- Story screen ---------- */

  function renderStory(view, id) {
    var loc = parseStoryId(id);
    if (!loc) { view.innerHTML = '<p class="screen-sub">Unknown story.</p>'; return Promise.resolve(); }

    return Promise.all([
      FTA.getJSON(FTA.storyPath(loc.era, loc.slot)),
      FTA.getJSON(FTA.erasPath)
    ]).then(function (res) {
      var s = res[0];
      var eraMeta = res[1].eras.filter(function (e) { return e.era === s.era; })[0];

      var globalIndex = (s.era - 1) * 5 + (s.slot - 1);
      if (!Progress.canReadStory(s.id, globalIndex)) {
        view.innerHTML =
          '<a class="crumb" href="#/era/' + s.era + '">&larr; ' + esc(eraMeta.title) + '</a>' +
          '<div class="paywall-card">' +
          '  <span class="label">The free trail ends here</span>' +
          '  <h1>Unlock every story, every badge, the whole family.</h1>' +
          '  <p class="screen-sub">One purchase, ' + FTA.CONFIG.priceLabel + ', forever. No subscription, no ads.</p>' +
          '  <a class="btn btn-ink" href="#">Buy once &middot; ' + FTA.CONFIG.priceLabel + '</a>' +
          '</div>';
        return;
      }

      var html =
        '<a class="crumb" href="#/era/' + s.era + '">&larr; ' + esc(eraMeta.title) + '</a>' +

        '<div class="story-hero">' +
        '  <span class="years">' + esc(eraMeta.title) + ' &middot; Story ' + s.slot + '</span>' +
        '  <span class="stars" aria-hidden="true">&#9733; &#9733; &#9733;</span>' +
        '  <h1>' + esc(s.title) + '</h1>' +
        '  <p class="story-hero-sub">' + esc(s.subtitle) + '</p>' +
        '</div>' +

        '<div id="playerMount" class="player-mount"></div>' +
        '<article class="story-text" id="storyText"></article>' +

        '<div class="connections-card">' +
        '  <strong>Connections &middot; ' + esc(s.connections.trait) + '</strong>' +
        '  <p>' + esc(s.connections.body) + '</p>' +
        '  <p class="ask"><em>Ask together:</em> ' + esc(s.connections.askTogether) + '</p>' +
        '</div>' +

        '<div class="story-footer" id="storyFooter"></div>';

      view.innerHTML = html;

      var wordEls = Highlight.renderParagraphs(document.getElementById('storyText'), s.paragraphs);

      var player = Player.mount({
        mount: document.getElementById('playerMount'),
        audioSrc: FTA.CONFIG.audioRoot + s.audio.src,
        timestampsSrc: FTA.CONFIG.audioRoot + s.audio.timestamps,
        wordEls: wordEls
      });
      App.onLeaveView(function () { player.destroy(); });

      // footer nav: prev / finish / next
      var footer = document.getElementById('storyFooter');
      var fhtml = '';
      if (s.slot > 1) {
        fhtml += '<a class="btn btn-ghost" href="#/story/era' + FTA.pad2(s.era) + '-story' + FTA.pad2(s.slot - 1) + '">&larr; Previous</a>';
      } else {
        fhtml += '<a class="btn btn-ghost" href="#/era/' + s.era + '">&larr; ' + esc(eraMeta.title) + '</a>';
      }
      fhtml += '<button class="btn btn-ink" id="finishBtn">' + (Progress.isRead(s.id) ? 'Finished &#10003;' : 'Finish story') + '</button>';
      if (s.slot < 5) {
        fhtml += '<a class="btn btn-ghost" href="#/story/era' + FTA.pad2(s.era) + '-story' + FTA.pad2(s.slot + 1) + '">Next &rarr;</a>';
      } else {
        fhtml += '<a class="btn btn-ghost" href="#/quiz/' + s.era + '">Take the quiz &rarr;</a>';
      }
      footer.innerHTML = fhtml;

      document.getElementById('finishBtn').addEventListener('click', function () {
        Progress.markRead(s.id);
        this.innerHTML = 'Finished &#10003;';
      });
    });
  }

  return {
    renderTrail: renderTrail,
    renderEra: renderEra,
    renderStory: renderStory,
    eraStoryIds: eraStoryIds
  };
})();
