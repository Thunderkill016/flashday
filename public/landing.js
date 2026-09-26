// Landing interactions — external file because CSP forbids inline scripts.
(function () {
  var nav = document.querySelector('.site-nav');
  window.addEventListener('scroll', function () {
    if (nav) nav.classList.toggle('scrolled', window.scrollY > 50);
  });

  // Decay-card heartbeat: browsers throttle blur/layout animations differently,
  // so a hard restart every 8s keeps the demo from drifting out of sync.
  setInterval(function () {
    var card = document.getElementById('decay-card');
    if (card) {
      card.classList.remove('run-anim');
      void card.offsetWidth;
      card.classList.add('run-anim');
    }
  }, 8000);

  window.playNativeAudio = function (element) {
    if (element.classList.contains('playing')) return;
    element.classList.add('playing');
    element.querySelector('.play-btn').textContent = '■';

    var audio = new Audio('running_late.mp3');
    var done = function () {
      element.classList.remove('playing');
      element.querySelector('.play-btn').textContent = '▶';
    };
    audio.onended = done;
    audio.onerror = function () {
      // Fallback: synthesize the phrase if the mp3 is unavailable.
      if ('speechSynthesis' in window) {
        var u = new SpeechSynthesisUtterance("I'm running late.");
        u.lang = 'en-US';
        u.onend = done;
        speechSynthesis.speak(u);
      } else {
        done();
      }
    };
    audio.play().catch(function () {
      audio.onerror();
    });
  };
})();
