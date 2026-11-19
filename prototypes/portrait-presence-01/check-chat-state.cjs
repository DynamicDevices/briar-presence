'use strict';
const assert=require('node:assert/strict');
const {snapshot,carousel}=require('./chat-demo-state.js');
for(const t of [0,6,8,18,26,39,43,51,52,55,59]){
  const state=snapshot(t),page=carousel(state,t);
  assert.equal(state.chats.length,8);assert.equal(new Set(page.rows.map(c=>c.id)).size,2);
  assert(state.chats.every(c=>c.source==='synthetic'));
  assert.equal(state.overall.concerns,state.chats.filter(c=>c.concern).length);
  if(page.pinnedId)assert.equal(page.rows[0].id,page.pinnedId);
}
for(const n of [5,6,7,8,9,10]){
  const state=snapshot(20);state.chats=state.chats.slice(0,n);
  while(state.chats.length<n)state.chats.push({...state.chats[0],id:'extra-'+state.chats.length,title:'Extra demo chat',concern:false,nextActor:'Briar'});
  const seen=new Set();
  for(let k=0;k<n*2;k++)for(const c of carousel(state,k*6).rows)seen.add(c.id);
  assert.equal(seen.size,n,'Every chat remains reachable with attention pinned');
}
const concern=t=>snapshot(t).chats.find(c=>c.id==='demo-chat-3');
assert(concern(18).concern);assert(concern(39).concern&&!concern(39).fresh);
assert(concern(51).concern&&!concern(51).fresh);assert(!concern(55).concern);
assert(snapshot(43).overall.unknown);assert(snapshot(43).chats.every(c=>c.state==='unknown'));
assert(snapshot(38).overall.urgent);
const state=snapshot(20),before=JSON.stringify(state.overall);
for(let t=0;t<60;t+=6)carousel(state,t);
assert.equal(JSON.stringify(state.overall),before,'Carousel cannot change face aggregate');
assert(snapshot(20).chats.some(c=>c.state==='working'));
assert(snapshot(20).chats.some(c=>c.nextActor==='Alex'));
console.log('PASS: 5–10 chat carousel reachability; pinned attention; two unique rows; independent timelines/next actors; retained stale concerns; all-unknown handling; aggregate independent of scrolling.');
