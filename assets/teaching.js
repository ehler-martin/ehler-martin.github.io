(() => {
  const dialog = document.querySelector('.report-dialog');
  if (!dialog || typeof dialog.showModal !== 'function' || navigator.pdfViewerEnabled === false) return;
  const heading = dialog.querySelector('h2');
  const openPdf = dialog.querySelector('a');
  const viewer = dialog.querySelector('iframe');

  for (const link of document.querySelectorAll('.report-link')) {
    link.addEventListener('click', event => {
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      const term = link.closest('.evaluation-term').querySelector('h2').textContent;
      heading.textContent = link.textContent.trim() + ' · ' + term;
      viewer.title = heading.textContent;
      openPdf.href = link.href;
      viewer.src = link.href;
      dialog.showModal();
    });
  }
  dialog.querySelector('button').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => {
    if (!dialog.open) viewer.removeAttribute('src');
  });
})();
