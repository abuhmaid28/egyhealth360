/* global document, FormData, URLSearchParams */
const form=document.querySelector('form'), frame=document.querySelector('iframe');
function render(){const role=form.elements.role.value;for(const option of form.elements.state.options)option.disabled=(option.value==='accepted'&&role!=='pharmacy')||(option.value==='organizations'&&role!=='admin')||(option.value==='history'&&role==='admin');if(form.elements.state.selectedOptions[0].disabled)form.elements.state.value='work';const data=new FormData(form),q=new URLSearchParams(data);q.delete('width');const url=`screen.html?${q}`;frame.src=url;frame.style.width=`${data.get('width')}px`;document.querySelector('#open').href=url;}
form.addEventListener('change',render);render();
