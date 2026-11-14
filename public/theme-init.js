(function () {
  try {
    var saved = localStorage.getItem('gastoia_theme');
    var root = document.documentElement;
    if (saved === 'light') {
      root.classList.remove('dark');
    } else {
      root.classList.add('dark');
    }
  } catch (e) {}
})();
