(() => {
  const form = document.getElementById('hrl-search-form');
  const result = document.getElementById('hrl-search-results');
  const query = document.getElementById('hrl-query');
  let bookRequest;
  let generation = 0;
  const normalize = text => text.toLocaleLowerCase('ru').replaceAll('ё', 'е');

  function loadBook() {
    bookRequest ??= fetch('./reader/data/b-lotman.js').then(async response => {
      if (!response.ok) throw new Error('Book data unavailable');
      const js = await response.text();
      return JSON.parse(js.slice(js.indexOf('{"b":'), js.lastIndexOf(';'))).b;
    }).catch(error => { bookRequest = undefined; throw error; });
    return bookRequest;
  }

  function hit(text, key) {
    const index = normalize(text).indexOf(key);
    if (index < 0) return null;
    return (index > 55 ? '…' : '') + text.slice(Math.max(0, index - 55), index + key.length + 110) + (index + key.length + 110 < text.length ? '…' : '');
  }

  function add(label, excerpt, href, open) {
    const link = document.createElement('a');
    link.className = 'hrl-result';
    link.href = href;
    const title = document.createElement('strong');
    const text = document.createElement('small');
    title.textContent = label;
    text.textContent = excerpt;
    link.append(title, text);
    if (open) link.addEventListener('click', event => { event.preventDefault(); open(); });
    result.append(link);
  }

  form.addEventListener('submit', async event => {
    event.preventDefault();
    const run = ++generation;
    const key = normalize(query.value.trim());
    if (!key) { result.replaceChildren(); return; }
    result.replaceChildren();
    let count = 0;
    for (const poem of window.hrlStudy.poems) {
      const excerpt = hit(poem.text, key);
      if (excerpt) { add(poem.title, excerpt, '#poems', () => window.hrlStudy.openPoem(poem.id)); count++; }
    }
    for (const panel of document.querySelectorAll('main .panel:not(#poems)')) {
      const text = panel.textContent;
      const excerpt = hit(text, key);
      if (excerpt) {
        const label = document.querySelector(`#tab-${panel.id}`)?.textContent || 'Учебные материалы';
        add(label, excerpt, `#${panel.id}`, () => window.hrlStudy.openTab(panel.id));
        count++;
      }
    }
    try {
      const blocks = await loadBook();
      if (run !== generation) return;
      let chapter = 'Беседы о русской культуре';
      for (const [i, [kind, text]] of blocks.entries()) {
        if (kind === 'h1' || kind === 'h2') chapter = text;
        const excerpt = hit(text, key);
        if (excerpt) { add(`Лотман · ${chapter}`, excerpt, `./reader/#lotman@${i}`); count++; }
        if (count >= 60) break;
      }
      if (!count) result.textContent = 'Совпадений нет.';
    } catch {
      if (run === generation && !count) result.textContent = 'Текст книги сейчас недоступен для поиска.';
    }
  });
})();
