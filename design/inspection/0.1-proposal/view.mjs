// Design-only local inspection model. Does not mutate accepted/shared focus.
const ref = (producerId, id) => JSON.stringify([producerId, id]);
export function inspectionModel(semantic, selected = null) {
  const concerns = semantic.concerns.filter(c => c.lifecycle === 'open');
  const requests = semantic.requests.filter(r => r.state === 'open' && r.category !== 'for-awareness');
  const relatedWork = r => r.workId ?? semantic.concerns.find(c => c.producerId === r.producerId && c.id === r.concernId)?.workId;
  const tasks = semantic.work.map(w => ({...w, key: ref(w.producerId, w.id),
    concerns: concerns.filter(c => c.producerId === w.producerId && c.workId === w.id),
    requests: requests.filter(r => r.producerId === w.producerId && relatedWork(r) === w.id)}));
  tasks.sort((a, b) => Number(b.concerns.length > 0 || b.requests.length > 0) - Number(a.concerns.length > 0 || a.requests.length > 0) || a.label.localeCompare(b.label, 'en'));
  const chosen = tasks.find(w => w.key === selected) ?? null;
  return {tasks, selected: chosen, unknown: semantic.baseState === 'unknown',
    counts: {work: tasks.length, concerns: concerns.length, requests: requests.length},
    unassignedConcerns: concerns.filter(c => !tasks.some(w => c.producerId === w.producerId && c.workId === w.id)),
    unassignedRequests: requests.filter(r => !tasks.some(w => r.producerId === w.producerId && relatedWork(r) === w.id)),
    details: chosen ? {concerns: semantic.concerns.filter(c => c.producerId === chosen.producerId && c.workId === chosen.id), requests: chosen.requests} : null};
}
