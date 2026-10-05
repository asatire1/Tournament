/*
 * The old UberPadel site is retired (October 2026). New games run on
 * https://uberpadel.com. Landing pages redirect there. Links to an existing
 * event (#/t/CODE and other #/ routes, ?id=, ?key=, ?comp=) stay here, because those
 * events live only in this site's database; they get a banner instead.
 */
(function () {
  var NEW = 'https://uberpadel.com';
  var hash = location.hash || '';
  var search = location.search || '';
  var hasEvent = /^#\/./.test(hash) || /[?&](id|key|code|t|comp|competition)=/.test(search);

  if (!hasEvent) {
    var path = location.pathname.replace(/index\.html$/, '');
    var fmt = path.match(/^\/quick-play\/([a-z-]+)\/$/);
    var post = path.match(/^\/blog\/([a-z0-9-]+)\/$/);
    var target = NEW + '/';
    if (fmt) {
      var f = fmt[1] === 'tournament' ? 'fixed-pair' : fmt[1];
      target = /^(americano|mexicano|round-robin)$/.test(f)
        ? NEW + '/' + f
        : NEW + '/?format=' + f;
    } else if (post) target = NEW + '/blog/' + post[1];
    else if (path === '/blog/') target = NEW + '/blog';
    else if (/^\/(competitions|league)\b|^\/(browse|competitions)\.html$/.test(path))
      target = NEW + '/tournaments';
    else if (/^\/account\/|^\/(login|register|my-account)\.html$/.test(path))
      target = NEW + '/login';
    else if (path === '/leaderboard.html') target = NEW + '/leaderboard';
    else if (path === '/privacy.html') target = NEW + '/legal/privacy';
    location.replace(target);
    return;
  }

  function banner() {
    if (document.getElementById('up-retired')) return;
    var bar = document.createElement('div');
    bar.id = 'up-retired';
    bar.setAttribute('role', 'note');
    bar.style.cssText =
      'position:sticky;top:0;z-index:40;background:#111737;color:#fff;' +
      'font:500 14px/1.4 system-ui,-apple-system,Segoe UI,sans-serif;' +
      'padding:10px 16px;text-align:center';
    bar.innerHTML =
      'This is the old UberPadel site. Your event stays here. ' +
      '<a href="' + NEW + '/" style="color:#6EE7B7;font-weight:700">' +
      'Start new games on uberpadel.com</a>';
    document.body.insertBefore(bar, document.body.firstChild);
  }
  if (document.body) banner();
  else document.addEventListener('DOMContentLoaded', banner);
})();
