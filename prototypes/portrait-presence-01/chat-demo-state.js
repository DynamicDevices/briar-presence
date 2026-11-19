/* Pure synthetic fixture. No chat access or inferred work. Assisted-by: Briar. */
(() => {
  const names=['Face study','API contract','Display driver','Documentation','Build checks','Visual design','Packaging','Research'];
  const plans=[
    [[0,'working','Briar'],[10,'waiting','Alex'],[22,'working','Briar'],[56,'done','none']],
    [[0,'working','Briar'],[8,'decision','Alex',true],[26,'working','Briar',false],[38,'blocked','Alex',true,true],[52,'working','Briar',false],[57,'done','none']],
    [[0,'working','Briar'],[16,'revising','Briar'],[18,'revising','Briar',true],[31,'waiting','external',true],[55,'done','none',false]],
    [[0,'queued','Briar'],[5,'working','Briar'],[20,'waiting','Alex'],[32,'working','Briar'],[56,'done','none']],
    [[0,'working','Briar'],[12,'waiting','external'],[17,'working','Briar'],[29,'done','none']],
    [[0,'ready','none'],[6,'reviewing','Alex'],[12,'working','Briar'],[25,'waiting','external'],[35,'working','Briar'],[57,'done','none']],
    [[0,'queued','Briar'],[14,'working','Briar'],[27,'waiting','external'],[34,'working','Briar'],[58,'done','none']],
    [[0,'working','Briar'],[11,'waiting','external'],[23,'working','Briar'],[36,'done','none']]
  ];
  function snapshot(time){
    const chats=plans.map((events,i)=>{
      let state='ready',nextActor='none',concern=false,urgent=false,lastEvent=0;
      for(const [at,s,actor,c,u] of events){if(at>time)break;state=s;nextActor=actor;lastEvent=at;if(c!==undefined){concern=c;urgent=!!u;}}
      const fresh=!(time>=43&&time<52)&&!(i===2&&time>=39&&time<52);
      return {id:'demo-chat-'+(i+1),title:names[i],state:fresh?state:'unknown',lastKnownState:state,nextActor:fresh||concern?nextActor:'unknown',fresh,concern,urgent,source:'synthetic',lastEvent};
    });
    const active=chats.filter(c=>c.fresh&&['working','revising','reviewing'].includes(c.state)).length;
    const concerns=chats.filter(c=>c.concern).length;
    const decisions=chats.filter(c=>c.nextActor==='Alex'&&(c.concern||['waiting','decision','reviewing'].includes(c.state))).length;
    const urgent=chats.some(c=>c.urgent&&c.concern),unknown=chats.every(c=>!c.fresh);
    let mode=unknown?9:urgent?8:decisions||concerns?(active?4:5):chats.some(c=>c.state==='revising')?6:chats.some(c=>c.state==='reviewing')?2:active?3:chats.some(c=>c.state==='waiting')?5:11;
    if(!unknown&&!concerns&&!decisions&&time>=55&&time<57)mode=7;
    return {time,chats,overall:{active,concerns,decisions,urgent,unknown,mode},synthetic:true};
  }
  function carousel(state,time){
    const priority=c=>(c.urgent&&c.concern?100:0)+(c.nextActor==='Alex'?20:0)+(c.concern?10:0);
    const attention=state.chats.filter(c=>priority(c)>0).sort((a,b)=>priority(b)-priority(a)||a.id.localeCompare(b.id));
    const pinned=attention[0]||null,others=state.chats.filter(c=>!pinned||c.id!==pinned.id);
    const slot=Math.floor(time/6);
    const rows=pinned?[pinned,others[slot%others.length]]:[others[(slot*2)%others.length],others[(slot*2+1)%others.length]];
    return {rows,rowPositions:rows.map(c=>state.chats.findIndex(other=>other.id===c.id)+1),pinnedId:pinned?.id||null,attentionCount:attention.length,position:pinned?(slot%others.length)+1:(slot*2)%others.length+1,total:state.chats.length,rotationTotal:others.length,dwellSeconds:6};
  }
  const api={snapshot,carousel,names};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  else globalThis.briarChatDemo=api;
})();
