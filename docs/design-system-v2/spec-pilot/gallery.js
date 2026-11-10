/* global document, URLSearchParams */
const controls = [...document.querySelectorAll('select')];
function update() {
  const values = Object.fromEntries(controls.map(c => [c.id, c.value]));
  document.querySelector('iframe').width = values.width;
  document.querySelector('iframe').src = `specimen.html?${new URLSearchParams(values)}`;
}
controls.forEach(c => c.addEventListener('change', update));
update();
