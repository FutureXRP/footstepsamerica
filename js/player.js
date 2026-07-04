/* Sticky audio player + word-highlight sync (ported pattern from Footsteps).

   Sync loop: requestAnimationFrame polling (~16ms), binary search over the
   word-timing array for the active word, toggle .lit (FOOTSTEPS_AMERICA.md §7).

   Timestamp file formats accepted:
   1. ElevenLabs character-level alignment:
      { "characters": [...], "character_start_times_seconds": [...],
        "character_end_times_seconds": [...] }
      Word timings are derived by walking the character stream against the
      rendered word spans (whitespace-insensitive).
   2. Pre-baked word timings: { "words": [ { "start": 0.0, "end": 0.32 }, ... ] }
      in document order matching the rendered word spans.

   If the audio file is missing (no narration recorded yet), the player mount
   shows a quiet "narration coming soon" note instead. */

var Player = (function () {

  function fmtTime(sec) {
    if (!isFinite(sec)) sec = 0;
    var m = Math.floor(sec / 60);
    var s = Math.floor(sec % 60);
    return m + ':' + (s < 10 ? '0' : '') + s;
  }

  // Build [{start,end}] per rendered word from character-level alignment.
  function wordTimingsFromChars(data, wordEls) {
    var chars = data.characters;
    var starts = data.character_start_times_seconds;
    var ends = data.character_end_times_seconds;
    if (!chars || !starts || !ends) return null;

    var timings = [];
    var ci = 0;
    for (var wi = 0; wi < wordEls.length; wi++) {
      var word = wordEls[wi].textContent;
      // skip whitespace in the character stream
      while (ci < chars.length && /\s/.test(chars[ci])) ci++;
      var first = ci;
      var matched = 0;
      while (ci < chars.length && matched < word.length) {
        if (!/\s/.test(chars[ci])) matched++;
        ci++;
      }
      if (matched === 0) return null; // stream ended early; text/audio mismatch
      timings.push({ start: starts[first], end: ends[ci - 1] });
    }
    return timings;
  }

  function normalizeTimings(data, wordEls) {
    if (data && Array.isArray(data.words)) {
      return data.words.length >= wordEls.length ? data.words : null;
    }
    return wordTimingsFromChars(data, wordEls);
  }

  // Binary search: index of last word whose start <= t (or -1).
  function findWordIndex(timings, t) {
    var lo = 0, hi = timings.length - 1, ans = -1;
    while (lo <= hi) {
      var mid = (lo + hi) >> 1;
      if (timings[mid].start <= t) { ans = mid; lo = mid + 1; }
      else hi = mid - 1;
    }
    return ans;
  }

  function mount(opts) {
    var el = opts.mount;
    el.innerHTML =
      '<div class="player" hidden>' +
      '  <button class="playbtn" aria-label="Play narration">' +
      '    <svg class="ic-play" width="18" height="18" viewBox="0 0 18 18" fill="currentColor"><path d="M4 2.5v13l11-6.5z"/></svg>' +
      '    <svg class="ic-pause" width="18" height="18" viewBox="0 0 18 18" fill="currentColor" hidden><path d="M4 2.5h3.5v13H4zM10.5 2.5H14v13h-3.5z"/></svg>' +
      '  </button>' +
      '  <div class="player-mid">' +
      '    <span class="label">Follow-along audio</span>' +
      '    <input class="scrub" type="range" min="0" max="1000" value="0" aria-label="Seek">' +
      '  </div>' +
      '  <span class="ptime">0:00</span>' +
      '</div>' +
      '<p class="player-soon" hidden><em>Narration for this story is coming soon. Read it aloud together for now.</em></p>';

    var ui = {
      root: el.querySelector('.player'),
      soon: el.querySelector('.player-soon'),
      btn: el.querySelector('.playbtn'),
      icPlay: el.querySelector('.ic-play'),
      icPause: el.querySelector('.ic-pause'),
      scrub: el.querySelector('.scrub'),
      time: el.querySelector('.ptime')
    };

    var audio = new Audio();
    var timings = null;
    var lastLit = -1;
    var rafId = null;
    var wordEls = opts.wordEls || [];

    audio.preload = 'metadata';
    audio.src = opts.audioSrc;

    audio.addEventListener('loadedmetadata', function () {
      ui.root.hidden = false;
      ui.time.textContent = fmtTime(audio.duration);
    });
    audio.addEventListener('error', function () {
      ui.root.hidden = true;
      ui.soon.hidden = false;
    });

    if (opts.timestampsSrc) {
      fetch(opts.timestampsSrc)
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (data) { if (data) timings = normalizeTimings(data, wordEls); })
        .catch(function () { timings = null; });
    }

    function setPlaying(playing) {
      ui.icPlay.hidden = playing;
      ui.icPause.hidden = !playing;
      ui.btn.setAttribute('aria-label', playing ? 'Pause narration' : 'Play narration');
    }

    function tick() {
      var t = audio.currentTime;
      if (timings) {
        var idx = findWordIndex(timings, t);
        if (idx !== lastLit) {
          Highlight.light(wordEls, idx, lastLit);
          lastLit = idx;
        }
      }
      if (audio.duration) {
        ui.scrub.value = Math.round((t / audio.duration) * 1000);
        ui.time.textContent = fmtTime(audio.duration - t);
      }
      if (!audio.paused && !audio.ended) rafId = requestAnimationFrame(tick);
    }

    ui.btn.addEventListener('click', function () {
      if (audio.paused) {
        audio.play().then(function () {
          setPlaying(true);
          rafId = requestAnimationFrame(tick);
        }).catch(function () { ui.soon.hidden = false; ui.root.hidden = true; });
      } else {
        audio.pause();
        setPlaying(false);
        if (rafId) cancelAnimationFrame(rafId);
      }
    });

    ui.scrub.addEventListener('input', function () {
      if (audio.duration) {
        audio.currentTime = (ui.scrub.value / 1000) * audio.duration;
        tick();
      }
    });

    audio.addEventListener('ended', function () {
      setPlaying(false);
      if (rafId) cancelAnimationFrame(rafId);
      Highlight.clearLit(wordEls);
      lastLit = -1;
      ui.scrub.value = 0;
      ui.time.textContent = fmtTime(audio.duration);
    });

    // teardown hook for the router
    return {
      destroy: function () {
        audio.pause();
        audio.src = '';
        if (rafId) cancelAnimationFrame(rafId);
      }
    };
  }

  return { mount: mount };
})();
