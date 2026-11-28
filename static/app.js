(() => {
  const $ = (s) => document.querySelector(s);
  const homeView = $('#homeView'), bouquetView = $('#bouquetView');
  const dialog = $('#passwordDialog'), form = $('#passwordForm');
  const input = $('#passwordInput'), errorEl = $('#passwordError');
  const letter = $('#letter'), morseEl = $('#morseText'), decodeBtn = $('#decodeButton');
  const musicBtn = $('#musicButton');

  const MORSE = {
    a:'.-',b:'-...',c:'-.-.',d:'-..',e:'.',f:'..-.',g:'--.',h:'....',i:'..',j:'.---',k:'-.-',l:'.-..',m:'--',
    n:'-.',o:'---',p:'.--.',q:'--.-',r:'.-.',s:'...',t:'-',u:'..-',v:'...-',w:'.--',x:'-..-',y:'-.--',z:'--..',
    0:'-----',1:'.----',2:'..---',3:'...--',4:'....-',5:'.....',6:'-....',7:'--...',8:'---..',9:'----.',
    '.':'.-.-.-',',':'--..--','?':'..--..','!':'-.-.--',"'":'.----.'
  };
  const REVERSE = Object.fromEntries(Object.entries(MORSE).map(([k, v]) => [v, k]));
  const SILENT = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=';
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  let pendingFriend = null, current = null, audio = null, decoding = false;

  /* ---------- music ---------- */
  function unlockAudio() {           // runs inside the click, so phones allow playback later
    if (!audio) audio = new Audio();
    audio.src = SILENT;
    audio.play().catch(() => {});
  }
  function startSong(url) {
    if (!audio || !url) return;
    audio.loop = true; audio.volume = 0.55; audio.src = url;
    audio.play().then(() => setMusic(true)).catch(() => setMusic(false));
  }
  function stopSong() { if (audio) { audio.pause(); audio.removeAttribute('src'); audio.load(); } }
  function setMusic(on) {
    musicBtn.textContent = on ? '♪ music on' : '♪ music off';
    musicBtn.setAttribute('aria-pressed', String(on));
  }
  musicBtn.addEventListener('click', () => {
    if (!audio || !audio.src) return;
    if (audio.paused) audio.play().then(() => setMusic(true)).catch(() => {});
    else { audio.pause(); setMusic(false); }
  });

  /* ---------- views ---------- */
  function showBouquet(data) {
    current = data;
    document.body.dataset.theme = data.friend;
    $('#dedicationTitle').textContent = `for ${data.name},`;
    $('#dedicationQuote').textContent = data.quote;
    closeLetter();
    homeView.hidden = true; bouquetView.hidden = false;
    if (window.Bouquet3D) Bouquet3D.show($('#bouquetCanvas'), data.friend);
    window.scrollTo({ top: 0 });
  }
  async function leave() {
    stopSong(); closeLetter();
    if (window.Bouquet3D) Bouquet3D.hide();
    delete document.body.dataset.theme; current = null;
    try { await fetch('/logout', { method: 'POST' }); } catch (_) {}
    bouquetView.hidden = true; homeView.hidden = false;
  }
  $('#backButton').addEventListener('click', leave);
  $('#logoutButton').addEventListener('click', leave);

  /* ---------- password ---------- */
  document.querySelectorAll('.friend-card').forEach((btn) =>
    btn.addEventListener('click', () => {
      pendingFriend = btn.dataset.friend;
      $('#passwordTitle').textContent = `hi ${pendingFriend}, this is for you`;
      errorEl.textContent = ''; input.value = '';
      dialog.hidden = false; input.focus();
    }));
  $('#closePassword').addEventListener('click', () => (dialog.hidden = true));
  dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.hidden = true; });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') dialog.hidden = true; });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    unlockAudio();
    errorEl.textContent = '';
    try {
      const res = await fetch('/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ friend: pendingFriend, password: input.value })
      });
      const data = await res.json();
      if (!res.ok || !data.ok) { errorEl.textContent = data.message || data.error || 'that is not quite it, try again ♡'; return; }
      dialog.hidden = true; input.value = '';
      showBouquet(data);
      startSong(data.song);
    } catch (_) { errorEl.textContent = 'something went wrong, please try again'; }
  });

  /* ---------- hidden letter + decode ---------- */
  function renderMorse() { morseEl.textContent = current ? current.morse : ''; decodeBtn.disabled = false; decodeBtn.textContent = 'decode the message'; }
  function closeLetter() { decoding = false; letter.hidden = true; }
  $('#hiddenMessageButton').addEventListener('click', () => {
    if (!current) return;
    decoding = false; renderMorse(); letter.hidden = false;
    setTimeout(() => letter.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 80);
  });
  $('#closeLetter').addEventListener('click', closeLetter);

  decodeBtn.addEventListener('click', async () => {
    if (!current || decoding) return;
    decoding = true; decodeBtn.disabled = true;
    const tokens = current.morse.split(' ');
    let done = '';
    for (let i = 0; i < tokens.length; i++) {
      if (!decoding) return;
      done += tokens[i] === '/' ? ' ' : (REVERSE[tokens[i]] || '');
      morseEl.textContent = '';
      const a = document.createElement('span'); a.className = 'done'; a.textContent = done;
      const b = document.createElement('span'); b.className = 'rest';
      const rest = tokens.slice(i + 1).join(' ');
      b.textContent = rest ? ' ' + rest : '';
      morseEl.append(a, b);
      await sleep(tokens[i] === '/' ? 160 : 260);
    }
    decoding = false; decodeBtn.textContent = 'decoded ♡';
  });

  /* ---------- already unlocked (page reload) ---------- */
  const saved = document.body.dataset.friend;
  if (saved) {
    fetch('/api/bouquet').then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => { showBouquet(d); setMusic(false); audio = new Audio(d.song); audio.loop = true; audio.volume = .55; })
      .catch(() => { bouquetView.hidden = true; homeView.hidden = false; });
  }
})();