const $ = id => document.getElementById(id);
let notes = [], editing = null, busy = false;
function status(message, error = false) { $('status').textContent = message; $('status').className = error ? 'error' : ''; }
async function api(path = '', options = {}) {
  const response = await fetch('/notes' + path, { ...options, headers: { 'Content-Type': 'application/json' } });
  const data = await response.json();
  if (!response.ok) throw new Error(data.details?.join(' ') || data.error || 'Request failed.');
  return data;
}
function reset() { editing = null; $('note-form').reset(); $('editor-title').textContent = 'A fresh note'; $('save').textContent = 'Save note ↗'; $('cancel').hidden = true; }
function render() {
  const term = $('search').value.toLowerCase().trim();
  const shown = notes.filter(n => (n.title + ' ' + n.content).toLowerCase().includes(term));
  $('count').textContent = notes.length;
  $('notes').replaceChildren();
  if (!shown.length) { const empty = document.createElement('p'); empty.className = 'empty'; empty.textContent = term ? 'No matching notes. Try another search.' : 'Your next great idea starts here. Add your first note.'; $('notes').append(empty); }
  for (const note of shown) {
    const card = document.createElement('article'); card.className = 'note';
    const title = document.createElement('h3'); title.textContent = note.title;
    const content = document.createElement('p'); content.textContent = note.content;
    const date = document.createElement('small'); date.textContent = 'UPDATED ' + new Date(note.updatedAt).toLocaleString();
    const actions = document.createElement('div'); actions.className = 'note-actions';
    const edit = document.createElement('button'); edit.type = 'button'; edit.className = 'secondary'; edit.textContent = 'Edit'; edit.setAttribute('aria-label', 'Edit ' + note.title);
    edit.onclick = () => { if (busy) return; editing = note.id; $('title').value = note.title; $('content').value = note.content; $('editor-title').textContent = 'A little revision'; $('save').textContent = 'Save changes ↗'; $('cancel').hidden = false; status('Editing your note.'); $('title').focus(); };
    const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'secondary'; remove.textContent = 'Delete'; remove.setAttribute('aria-label', 'Delete ' + note.title);
    remove.onclick = async () => { if (busy || !confirm('Delete this note?')) return; busy = true; remove.disabled = true; try { await api('/' + note.id, { method: 'DELETE' }); if (editing === note.id) reset(); await load(); status('Note deleted.'); } catch (error) { status(error.message, true); } finally { busy = false; remove.disabled = false; } };
    actions.append(edit, remove); card.append(title, content, date, actions); $('notes').append(card);
  }
}
async function load() { notes = await api(); render(); }
$('note-form').onsubmit = async event => {
  event.preventDefault(); if (busy) return;
  if (!$('title').value.trim() || !$('content').value.trim()) return status('Please enter a title and a note.', true);
  busy = true; $('save').disabled = true; $('cancel').disabled = true;
  try { await api(editing === null ? '' : '/' + editing, { method: editing === null ? 'POST' : 'PUT', body: JSON.stringify({ title: $('title').value, content: $('content').value }) }); reset(); await load(); status('Your note has been saved.'); }
  catch (error) { status(error.message, true); }
  finally { busy = false; $('save').disabled = false; $('cancel').disabled = false; }
};
$('cancel').onclick = () => { reset(); status('Edit cancelled.'); };
$('search').oninput = render;
$('refresh').onclick = () => load().catch(error => status(error.message, true));
load().catch(error => status('Could not load notes. ' + error.message, true));
