(() => {
  'use strict';
  const schema = 'hrl-poem-notes/1';
  const key = schema + ':' + new URL('.', document.baseURI).pathname;
  let selected = null;
  let selectTimer;
  let focused = [];
  let restoreTimer;

  function make(tag, text, className) {
    const el = document.createElement(tag);
    if (text) el.textContent = text;
    if (className) el.className = className;
    return el;
  }
  function button(text, onClick, className = 'fbtn') {
    const el = make('button', text, className);
    el.type = 'button';
    el.addEventListener('click', onClick);
    return el;
  }
  function read() {
    try { const value = JSON.parse(localStorage.getItem(key) || '[]'); return Array.isArray(value) ? value : []; }
    catch { return []; }
  }
  function write(notes, status) {
    try { localStorage.setItem(key, JSON.stringify(notes)); return true; }
    catch { status.textContent = 'Не удалось сохранить заметки. Проверьте, доступно ли хранилище браузера.'; return false; }
  }
  function uid() { return crypto.randomUUID?.() || Date.now() + '-' + Math.random().toString(36).slice(2); }

  const quoteButton = button('Заметка к выделению', () => {
    const info = selected;
    if (!info || !info.verse.isConnected || info.verse.closest('[hidden]')) return;
    window.getSelection()?.removeAllRanges();
    hideQuote();
    info.verse.dispatchEvent(new CustomEvent('hrl-quote', {detail:info.anchor}));
  }, 'btn hrl-note-float');
  quoteButton.hidden = true;
  quoteButton.addEventListener('mousedown', event => event.preventDefault());
  document.body.append(quoteButton);
  function hideQuote() { quoteButton.hidden = true; selected = null; }
  function updateQuote() {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !selection.rangeCount || document.querySelector('dialog[open]')) return hideQuote();
    const range = selection.getRangeAt(0);
    const element = node => node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
    const first = element(range.startContainer)?.closest('.vline .t');
    const last = element(range.endContainer)?.closest('.vline .t');
    const verse = first?.closest('.hrl-annotatable');
    if (!verse || verse !== last?.closest('.hrl-annotatable') || verse.closest('[hidden]')) return hideQuote();
    const lines = [...verse.querySelectorAll('.vline .t')];
    const start = lines.indexOf(first), end = lines.indexOf(last);
    const offset = (line, node, n) => {
      const prefix = document.createRange();
      prefix.selectNodeContents(line);
      prefix.setEnd(node, n);
      return prefix.toString().length;
    };
    const from = offset(first, range.startContainer, range.startOffset);
    const to = offset(last, range.endContainer, range.endOffset);
    const quote = lines.slice(start, end + 1).map((line, i, group) =>
      line.textContent.slice(i === 0 ? from : 0, i === group.length - 1 ? to : undefined)).join('\n').trim().slice(0, 1200);
    if (!quote) return hideQuote();
    selected = {verse, anchor:{start, end, quote}};
    quoteButton.hidden = false;
    const rect = range.getBoundingClientRect();
    const below = matchMedia('(pointer: coarse)').matches || rect.top < 105;
    quoteButton.style.top = Math.min(window.innerHeight - quoteButton.offsetHeight - 8,
      Math.max(8, below ? rect.bottom + 10 : rect.top - quoteButton.offsetHeight - 10)) + 'px';
    quoteButton.style.left = Math.max(8, Math.min(window.innerWidth - quoteButton.offsetWidth - 8,
      rect.left + (rect.width - quoteButton.offsetWidth) / 2)) + 'px';
  }
  document.addEventListener('selectionchange', () => {
    clearTimeout(selectTimer);
    selectTimer = setTimeout(updateQuote, 120);
  });
  window.addEventListener('scroll', hideQuote, {passive:true});
  window.addEventListener('resize', hideQuote, {passive:true});
  window.addEventListener('hashchange', hideQuote);

  function mount(poem, verse) {
    verse.classList.add('hrl-annotatable');
    const box = make('details', '', 'extra hrl-poem-notes');
    const summary = make('summary');
    const status = make('p', '', 'xcap');
    status.setAttribute('role', 'status');
    const list = make('ul', '', 'hrl-note-list');
    const actions = make('div', '', 'hrl-note-actions');
    const file = make('input');
    file.type = 'file';
    file.accept = '.json,application/json';
    file.hidden = true;
    const edit = make('dialog', '', 'hrl-note-dialog');
    edit.setAttribute('aria-labelledby', 'hrl-note-title-' + poem);
    const heading = make('h3', 'Заметка');
    heading.id = 'hrl-note-title-' + poem;
    const quote = make('blockquote', '', 'hrl-note-quote');
    const form = make('form');
    const label = make('label', 'Текст заметки');
    const input = make('textarea');
    input.required = true;
    input.rows = 5;
    input.maxLength = 8000;
    label.append(input);
    const controls = make('div', '', 'hrl-note-actions');
    const save = make('button', 'Сохранить', 'btn');
    save.type = 'submit';
    const editStatus = make('p', '', 'xcap');
    editStatus.setAttribute('role', 'status');
    controls.append(save, button('Отмена', () => edit.close()));
    form.append(heading, quote, label, controls, editStatus);
    edit.append(form);
    let current;

    function open(note, anchor = null) {
      box.open = true;
      current = note || {id:uid(), poem, anchor, text:''};
      quote.hidden = !current.anchor;
      quote.textContent = current.anchor?.quote || '';
      input.value = current.text;
      editStatus.textContent = '';
      edit.showModal();
      input.focus();
    }
    form.addEventListener('submit', event => {
      event.preventDefault();
      const value = input.value.trim();
      if (!value) { editStatus.textContent = 'Введите текст заметки.'; return; }
      const notes = read();
      const i = notes.findIndex(note => note.id === current.id);
      const note = {...current, text:value};
      if (i < 0) notes.push(note); else notes[i] = note;
      if (write(notes, editStatus)) { edit.close(); render(); status.textContent = 'Заметка сохранена.'; }
    });
    verse.addEventListener('hrl-quote', event => open(null, event.detail));

    function jump(anchor) {
      focused.forEach(line => line.classList.remove('hrl-note-focus'));
      clearTimeout(restoreTimer);
      focused = [...verse.querySelectorAll('.vline')].slice(anchor.start, anchor.end + 1);
      focused.forEach(line => line.classList.add('hrl-note-focus'));
      focused[0]?.scrollIntoView({block:'center'});
      restoreTimer = setTimeout(() => {
        focused.forEach(line => line.classList.remove('hrl-note-focus'));
        focused = [];
      }, 3500);
    }
    function render() {
      const notes = read().filter(note => note.poem === poem);
      summary.textContent = 'Мои заметки' + (notes.length ? ' · ' + notes.length : '');
      list.replaceChildren();
      for (const note of notes) {
        const row = make('li');
        if (note.anchor) row.append(make('blockquote', note.anchor.quote, 'hrl-note-quote'));
        row.append(make('p', note.text, 'hrl-note-copy'));
        const tools = make('div', '', 'hrl-note-actions');
        if (note.anchor) tools.append(button('К строкам', () => jump(note.anchor)));
        tools.append(button('Изменить', () => open(note)), button('Удалить', () => {
          if (!confirm('Удалить эту заметку?')) return;
          if (write(read().filter(n => n.id !== note.id), status)) { render(); status.textContent = 'Заметка удалена.'; }
        }));
        row.append(tools);
        list.append(row);
      }
    }
    function backup() {
      const url = URL.createObjectURL(new Blob([JSON.stringify({schema, notes:read()}, null, 2)], {type:'application/json'}));
      const a = make('a');
      a.href = url;
      a.download = 'hrl-poem-notes.json';
      document.body.append(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
    file.addEventListener('change', async () => {
      const source = file.files[0];
      file.value = '';
      if (!source) return;
      try {
        if (source.size > 4_000_000) throw Error();
        const data = JSON.parse(await source.text());
        if (data?.schema !== schema || !Array.isArray(data.notes)) throw Error();
        const all = read();
        let added = 0;
        for (const note of data.notes) {
          if (!note || typeof note.id !== 'string' || !/^[a-z0-9-]{1,80}$/.test(note.poem) ||
              !window.hrlStudy?.poems.some(p => p.id === note.poem) ||
              typeof note.text !== 'string' || !note.text.trim() || note.text.length > 8000) throw Error();
          const a = note.anchor;
          if (a !== null && (!a || !Number.isInteger(a.start) || a.start < 0 || !Number.isInteger(a.end) ||
              a.end < a.start || typeof a.quote !== 'string' || !a.quote || a.quote.length > 1200)) throw Error();
          const anchor = a && {start:a.start, end:a.end, quote:a.quote};
          const old = all.find(n => n.id === note.id);
          if (old?.text === note.text && old.poem === note.poem && JSON.stringify(old.anchor) === JSON.stringify(anchor)) continue;
          all.push({id:old ? uid() : note.id, poem:note.poem, text:note.text, anchor});
          added++;
        }
        if (write(all, status)) { render(); status.textContent = 'Добавлено заметок: ' + added + '.'; }
      } catch { status.textContent = 'Не удалось загрузить файл заметок HRL.'; }
    });
    actions.append(button('Добавить заметку', () => open()), button('Скачать заметки', backup), button('Загрузить заметки', () => file.click()));
    box.append(summary, make('p', 'Выделите строки для заметки к цитате или добавьте заметку ко всему стихотворению. Заметки хранятся на этом устройстве.', 'xcap'), actions, status, list, file, edit);
    render();
    return box;
  }
  window.HRLPoemNotes = {mount};
})();
