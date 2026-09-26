// Landing interactions — external file because CSP forbids inline scripts
// (including inline onclick attributes).
(function () {
  var nav = document.querySelector('.site-nav');
  window.addEventListener('scroll', function () {
    if (nav) nav.classList.toggle('scrolled', window.scrollY > 50);
  });

  var audioBtn = document.getElementById('demoAudioBtn');
  if (audioBtn) {
    audioBtn.addEventListener('click', function () {
      if (audioBtn.classList.contains('playing')) return;
      audioBtn.classList.add('playing');
      var playBtn = audioBtn.querySelector('.play-btn');
      if (playBtn) playBtn.textContent = '■';

      var audio = new Audio('running_late.mp3');
      var done = function () {
        audioBtn.classList.remove('playing');
        if (playBtn) playBtn.textContent = '▶';
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
    });
  }
})();
