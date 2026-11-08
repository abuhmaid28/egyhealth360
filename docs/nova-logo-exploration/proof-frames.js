/* global document, ResizeObserver */
for (const frame of document.querySelectorAll('iframe')) {
  const attach = () => {
    const body = frame.contentDocument.body;
    const fit = () => { frame.style.height = Math.ceil(body.getBoundingClientRect().height + 4) + 'px'; };
    new ResizeObserver(fit).observe(body);
    frame.contentDocument.fonts.ready.then(fit);
    fit();
  };
  frame.addEventListener('load', attach);
  if (frame.contentDocument?.readyState === 'complete') attach();
}
