(() => {
  const book = window.__BOOKS.lotman;
  const chapters = window.HRL_THESIS;
  const anchors = new Map(book.b.map((block, index) => [block[2], index]));
  const dialog = document.getElementById('hrl-study-dialog');
  const body = document.getElementById('hrl-study-content');
  const title = document.getElementById('hrl-study-title');

  function node(tag, text, className) {
    const item = document.createElement(tag);
    if (text) item.textContent = text;
    if (className) item.className = className;
    return item;
  }

  function chapterLink(page, label) {
    const link = node('a', label);
    const index = anchors.get(`lotman-${page}`);
    link.href = `#lotman@${index}`;
    link.addEventListener('click', () => dialog.close());
    return link;
  }

  function showScheme() {
    title.textContent = 'Схема книги';
    const map = node('div', '', 'hrl-map');
    const groups = [
      ['I · Устройство общества', 'Служба, семья и воспитание', 'Институты задают человеку положение и круг доступных ролей.', [19, 63, 92]],
      ['II · Язык поведения', 'Жест, ритуал, репутация', 'Повседневные действия выражают эти роли и позволяют окружающим их прочесть.', [107, 120, 140, 153, 181, 197, 227]],
      ['III · Исторические типы', 'Биографии и поколения', 'В конкретных судьбах видно, как люди усваивают и изменяют правила своей эпохи.', [281, 303, 336, 363, 380]],
    ];
    for (const [label, heading, idea, pages] of groups) {
      const section = node('section');
      section.append(node('div', label, 'hrl-kicker'), node('h3', heading), node('p', idea));
      const list = node('ul');
      for (const page of pages) {
        const chapter = chapters.find(row => row[0] === page);
        const item = node('li');
        item.append(chapterLink(page, chapter[1]));
        list.append(item);
      }
      section.append(list);
      map.append(section);
    }
    body.replaceChildren(node('p', 'Лотман читает быт как язык культуры. Положение человека задаёт набор ролей, роли становятся видимыми в поведении, а биографии показывают, как эти правила меняются во времени.'), chapterLink(6, 'Метод книги во введении'), map, chapterLink(466, 'Как Лотман связывает практику и знак в заключении'));
    dialog.showModal();
  }

  function showTheses() {
    title.textContent = 'Тезисы по главам';
    body.replaceChildren(node('p', 'Редакторский конспект. Каждый раздел ведёт к соответствующей главе книги.'));
    for (const [page, chapter, points] of chapters) {
      const details = node('details');
      const list = node('ul');
      points.forEach(point => list.append(node('li', point)));
      details.append(node('summary', chapter), list, chapterLink(page, 'К началу главы'));
      body.append(details);
    }
    dialog.showModal();
  }

  document.getElementById('hrl-scheme').addEventListener('click', showScheme);
  document.getElementById('hrl-theses').addEventListener('click', showTheses);
})();
