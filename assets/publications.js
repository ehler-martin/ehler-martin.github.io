(() => {
  const root = document.getElementById('publication-archive');
  if (!root) return;

  const controls = root.querySelector('#pub-tools');
  const chooseAuthor = root.querySelector('#pub-person');
  const toggle = root.querySelector('#pub-network-toggle');
  const network = root.querySelector('#pub-network');
  const reset = root.querySelector('.pub-reset');
  const status = root.querySelector('.pub-status');
  const people = [...root.querySelectorAll('[data-graph-person]')];
  const edges = [...root.querySelectorAll('[data-graph-edge]')];
  const years = [...root.querySelectorAll('.pub-year')].map(section => ({
    section,
    papers: [...section.querySelectorAll('.pub-record')].map(paper => ({
      paper,
      people: paper.dataset.collaborators.split(' ')
    }))
  }));
  const total = years.reduce((sum, year) => sum + year.papers.length, 0);

  function render() {
    const author = chooseAuthor.value;
    let shown = 0;
    years.forEach(({section, papers}) => {
      let yearCount = 0;
      papers.forEach(entry => {
        const match = !author || entry.people.includes(author);
        entry.paper.hidden = !match;
        entry.paper.classList.toggle('first-visible', match && yearCount === 0);
        if (match) yearCount++;
      });
      section.hidden = yearCount === 0;
      shown += yearCount;
    });
    const authorName = author ? chooseAuthor.selectedOptions[0].textContent.replace(/ \(\d+\)$/, '') : '';
    const noun = total === 1 ? 'work' : 'works';
    status.textContent = (author ? shown + ' of ' + total : total) + ' ' + noun +
      (author ? ' · Collaborator: ' + authorName : '');
    reset.hidden = !author;
    people.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.graphPerson === author)));
    edges.forEach(edge => edge.classList.toggle('selected', edge.dataset.graphEdge === author));
  }

  people.forEach(button => button.addEventListener('click', () => {
    chooseAuthor.value = chooseAuthor.value === button.dataset.graphPerson ? '' : button.dataset.graphPerson;
    render();
  }));
  toggle.addEventListener('click', () => {
    network.hidden = !network.hidden;
    toggle.setAttribute('aria-expanded', String(!network.hidden));
  });
  reset.addEventListener('click', () => {
    chooseAuthor.value = '';
    render();
    (network.hidden ? toggle : chooseAuthor).focus();
  });
  chooseAuthor.addEventListener('change', render);
  render();
  controls.hidden = false;
})();
