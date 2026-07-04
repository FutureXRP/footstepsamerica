/* App shell: tiny hash router.
   Routes:
     #/trail            the Trail screen (default)
     #/era/:n           era detail
     #/story/:id        story reader
     #/quiz/:n          era mastery quiz */

var App = (function () {
  var view = null;
  var leaveHooks = [];

  function onLeaveView(fn) { leaveHooks.push(fn); }
  function runLeaveHooks() {
    leaveHooks.forEach(function (fn) { try { fn(); } catch (e) { /* noop */ } });
    leaveHooks = [];
  }

  function route() {
    runLeaveHooks();
    var hash = location.hash || '#/trail';
    var parts = hash.replace(/^#\//, '').split('/');
    view.innerHTML = '<p class="loading">Loading&hellip;</p>';
    window.scrollTo(0, 0);

    var p;
    if (parts[0] === 'era' && parts[1]) {
      p = Trail.renderEra(view, parseInt(parts[1], 10));
    } else if (parts[0] === 'story' && parts[1]) {
      p = Trail.renderStory(view, parts[1]);
    } else if (parts[0] === 'quiz' && parts[1]) {
      p = Quiz.render(view, parseInt(parts[1], 10));
    } else {
      p = Trail.renderTrail(view);
    }
    p.catch(function (err) {
      view.innerHTML =
        '<div class="screen-head"><h1>Something went off the trail.</h1>' +
        '<p class="screen-sub">' + String(err && err.message || err).replace(/</g, '&lt;') + '</p>' +
        '<p><a class="btn btn-ink" href="#/trail">Back to the Trail</a></p></div>';
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    view = document.getElementById('view');
    window.addEventListener('hashchange', route);
    route();
  });

  return { onLeaveView: onLeaveView };
})();
