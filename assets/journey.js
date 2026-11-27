(() => {
  const journey = document.querySelector('.journey');
  if (!journey) return;
  const links = [...journey.querySelectorAll('nav a')];
  const details = [...journey.querySelectorAll('.journey-detail')];
  const stages = journey.querySelector('.journey-stages');

  function select(hash) {
    const current = details.find(panel => '#' + panel.id === hash);
    if (!current) return;
    for (const panel of details) panel.hidden = panel !== current;
    for (const link of links) {
      if (link.getAttribute('href') === hash) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    }
    const stage = stages.querySelector('[aria-current="location"]').getBoundingClientRect();
    const row = stages.getBoundingClientRect();
    if (stage.left < row.left) stages.scrollLeft += stage.left - row.left;
    else if (stage.right > row.right) stages.scrollLeft += stage.right - row.right;
  }

  for (const link of links) {
    link.addEventListener('click', event => {
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      select(link.getAttribute('href'));
    });
    link.addEventListener('keydown', event => {
      const group = [...link.closest('nav').querySelectorAll('a')];
      const index = group.indexOf(link);
      const next = {ArrowLeft: (index + group.length - 1) % group.length,
        ArrowRight: (index + 1) % group.length, Home: 0, End: group.length - 1}[event.key];
      if (next === undefined) return;
      event.preventDefault();
      group[next].focus();
      select(group[next].getAttribute('href'));
    });
  }
  function selectFromLocation() {
    select(links.some(link => link.getAttribute('href') === location.hash)
      ? location.hash : '#journey-vienna');
  }
  window.addEventListener('hashchange', selectFromLocation);
  selectFromLocation();
})();
