/* Word-span rendering for narration highlight sync.
   Every word in the story body becomes <span class="w">word</span>, in document
   order, so player.js can light words by index against the timestamp file. */

var Highlight = (function () {

  // Render paragraphs into container; returns flat array of word elements.
  function renderParagraphs(container, paragraphs) {
    var wordEls = [];
    paragraphs.forEach(function (text) {
      var p = document.createElement('p');
      var words = text.split(/\s+/).filter(Boolean);
      words.forEach(function (word, i) {
        var span = document.createElement('span');
        span.className = 'w';
        span.textContent = word;
        p.appendChild(span);
        wordEls.push(span);
        if (i < words.length - 1) p.appendChild(document.createTextNode(' '));
      });
      container.appendChild(p);
    });
    return wordEls;
  }

  function clearLit(wordEls) {
    for (var i = 0; i < wordEls.length; i++) {
      if (wordEls[i].classList.contains('lit')) wordEls[i].classList.remove('lit');
    }
  }

  function light(wordEls, index, lastIndex) {
    if (lastIndex >= 0 && wordEls[lastIndex]) wordEls[lastIndex].classList.remove('lit');
    if (index >= 0 && wordEls[index]) wordEls[index].classList.add('lit');
  }

  return {
    renderParagraphs: renderParagraphs,
    clearLit: clearLit,
    light: light
  };
})();
