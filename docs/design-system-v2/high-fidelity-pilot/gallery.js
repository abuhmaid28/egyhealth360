/* global document, URLSearchParams */
const ids = ['role','lang','theme','width','text'];
const controls = Object.fromEntries(ids.map(id=>[id,document.getElementById(id)]));
function update(){
  const state = Object.fromEntries(ids.map(id=>[id,controls[id].value]));
  for(const id of ['screen','light','dark']){
    const frame = document.getElementById(id);
    const query = new URLSearchParams({...state,theme:id==='screen'?state.theme:id});
    query.delete('width');
    frame.src = `screen.html?${query}`;
    frame.width = state.width;
    const link = document.getElementById(id==='screen'?'open-screen':`open-${id}`);
    link.href = frame.src;
  }
}
document.querySelector('#controls').addEventListener('submit',event=>event.preventDefault());
ids.forEach(id=>controls[id].addEventListener('change',update));
update();
