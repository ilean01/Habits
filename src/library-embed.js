// One explicit navigation destination; no DOM replacement based on tab labels.
export function mountEmbeddedLibrary(query='') {
  const host=document.querySelector('[data-library-host]');
  if(!host||host.querySelector('iframe'))return;
  const frame=document.createElement('iframe');
  frame.className='habits-library-frame';frame.title='Biblioteca';
  const url=new URL('./biblioteca.html',location.href);url.searchParams.set('embedded','1');
  if(query)url.searchParams.set('q',query);
  frame.src=url.href;host.append(frame);
}
