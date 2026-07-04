/* Era mastery quiz: 25 questions, 4 options, pass at 80% (20/25).
   Passing awards the era badge and unlocks the printable certificate. */

var Quiz = (function () {

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function render(view, era) {
    return FTA.getJSON(FTA.quizPath(era)).then(function (quiz) {
      var idx = 0;
      var score = 0;
      var total = quiz.questions.length;
      var passNeeded = Math.ceil(total * (quiz.passPercent / 100));

      function showQuestion() {
        var q = quiz.questions[idx];
        var html =
          '<a class="crumb" href="#/era/' + era + '">&larr; Back to ' + esc(quiz.title) + '</a>' +
          '<div class="quiz-card">' +
          '  <span class="label">Mastery quiz &middot; ' + esc(quiz.title) + '</span>' +
          '  <div class="quiz-progress">Question ' + (idx + 1) + ' of ' + total + '</div>' +
          '  <h2 class="quiz-q">' + esc(q.q) + '</h2>' +
          '  <div class="quiz-options">';
        q.options.forEach(function (opt, i) {
          html += '<button class="quiz-opt" data-i="' + i + '">' + esc(opt) + '</button>';
        });
        html += '</div><div class="quiz-feedback" id="quizFeedback"></div></div>';
        view.innerHTML = html;

        var answered = false;
        Array.prototype.forEach.call(view.querySelectorAll('.quiz-opt'), function (btn) {
          btn.addEventListener('click', function () {
            if (answered) return;
            answered = true;
            var picked = parseInt(btn.getAttribute('data-i'), 10);
            var correct = picked === q.answer;
            if (correct) score++;
            btn.classList.add(correct ? 'right' : 'wrong');
            view.querySelectorAll('.quiz-opt')[q.answer].classList.add('right');
            Array.prototype.forEach.call(view.querySelectorAll('.quiz-opt'), function (b) { b.disabled = true; });
            var fb = document.getElementById('quizFeedback');
            fb.innerHTML =
              '<p>' + (correct ? 'Right.' : 'Not quite. The answer is highlighted.') + '</p>' +
              '<button class="btn btn-ink" id="quizNext">' + (idx + 1 < total ? 'Next question' : 'See results') + '</button>';
            document.getElementById('quizNext').addEventListener('click', function () {
              idx++;
              if (idx < total) showQuestion(); else showResults();
            });
          });
        });
      }

      function showResults() {
        var passed = Progress.recordQuiz(era, score, total);
        var html =
          '<div class="quiz-card quiz-results">' +
          '  <span class="label">Mastery quiz &middot; ' + esc(quiz.title) + '</span>' +
          '  <div class="quiz-score">' + score + '<span>/' + total + '</span></div>';

        if (passed) {
          html +=
            '  <h2>&#9733; Badge earned.</h2>' +
            '  <p class="screen-sub">The ' + esc(quiz.title) + ' badge is yours. Earned, not given. Put a name on the certificate and print it.</p>' +
            '  <div class="cert-name-row">' +
            '    <input type="text" id="certName" maxlength="60" placeholder="Name for the certificate" value="' + esc(Progress.getName()) + '">' +
            '    <a class="btn btn-ink" id="certLink" href="../certificates/era-' + FTA.pad2(era) + '.html" target="_blank" rel="noopener">Print certificate</a>' +
            '  </div>' +
            '  <div class="quiz-actions"><a class="btn btn-ghost" href="#/trail">Back to the Trail</a></div>';
        } else {
          html +=
            '  <h2>Not this time.</h2>' +
            '  <p class="screen-sub">You need ' + passNeeded + ' of ' + total + ' to earn the badge. Walk back through the stories and try again. The trail is not going anywhere.</p>' +
            '  <div class="quiz-actions">' +
            '    <a class="btn btn-ink" href="#/quiz/' + era + '" id="retryBtn">Try again</a>' +
            '    <a class="btn btn-ghost" href="#/era/' + era + '">Reread the stories</a>' +
            '  </div>';
        }
        html += '</div>';
        view.innerHTML = html;

        var nameInput = document.getElementById('certName');
        if (nameInput) {
          nameInput.addEventListener('input', function () { Progress.setName(nameInput.value); });
        }
        var retry = document.getElementById('retryBtn');
        if (retry) {
          retry.addEventListener('click', function (e) {
            e.preventDefault();
            idx = 0; score = 0;
            showQuestion();
          });
        }
      }

      showQuestion();
    });
  }

  return { render: render };
})();
