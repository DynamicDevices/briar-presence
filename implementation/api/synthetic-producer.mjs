// Synthetic normalised-event sample, not a live Briar harness connector.
// Host owns admission, session, clock and the complete schema validator.
import {jsonData} from '../core/state.mjs';

const copy=value=>JSON.parse(JSON.stringify(value));
const collections={work:'work',concern:'concerns',attention:'attentionItems'};
export function createSyntheticProducer({port,session,epochMs}) {
  if(typeof port?.submit!=='function'||typeof session!=='string'||!session.trim()||!Number.isFinite(epochMs))throw new TypeError('Admitted port, session and explicit epoch required');
  let revision=0,accepted={work:[],concerns:[],attentionItems:[]};
  return Object.freeze({
    mode:'synthetic-only',
    report(kind,record,now){
      if(typeof kind!=='string'||!Object.hasOwn(collections,kind))return {ok:false,code:'SYNTHETIC_EVENT_KIND'};
      try{if(!jsonData(record))return {ok:false,code:'JSON_DATA'};}catch{return {ok:false,code:'JSON_DATA'};}
      if(!Number.isFinite(now)||now<0||!Number.isFinite(epochMs+now))return {ok:false,code:'SYNTHETIC_TIME'};
      let observedAt;try{observedAt=new Date(epochMs+now).toISOString();}catch{return {ok:false,code:'SYNTHETIC_TIME'};}
      const candidate=copy(accepted),collection=collections[kind],value=copy(record);
      // Any invalid shape/reference is rejected by the real snapshot validator
      // and state handler below, not by a second partial schema implementation.
      const index=candidate[collection].findIndex(item=>item.id===value?.id);
      if(index<0)candidate[collection].push(value);else candidate[collection][index]=value;
      const result=port.submit({kind:'producer.snapshot',version:'0.1-draft',session,revision:revision+1,observedAt,...candidate},now);
      if(result.ok){accepted=candidate;revision++;}
      return result;
    }
  });
}
