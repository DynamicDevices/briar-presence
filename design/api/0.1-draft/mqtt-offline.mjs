// Source-only MQTT ingress rehearsal. No MQTT library, network or authentication.
// Host owns admitted producer ports. A real broker must enforce publisher ACLs;
// a topic/session string is NOT proof of the publishing client's identity.
const token=value=>typeof value==='string'&&/^[A-Za-z0-9_-]+$/.test(value);

export function createOfflineMqttIngress({workspaceToken,bindings}) {
  if(!token(workspaceToken)||!Array.isArray(bindings))throw new TypeError('Explicit topic token and host bindings required');
  const routes=new Map(),topics=new Map();
  for(const {producerToken,port} of bindings){
    if(!token(producerToken)||typeof port?.submit!=='function'||topics.has(producerToken))throw new TypeError('Unique host-admitted producer bindings required');
    const topic=`briar-presence/v0.1/${workspaceToken}/in/producer/${producerToken}/snapshot`;
    topics.set(producerToken,topic);routes.set(topic,port);
  }
  return Object.freeze({
    mode:'offline-mqtt-ingress-rehearsal',brokerConnected:false,sourceAuthenticated:false,
    topicFor:producerToken=>topics.get(producerToken)??null,
    deliver(topic,jsonText,retained,now){
      if(typeof topic!=='string'||typeof jsonText!=='string'||typeof retained!=='boolean')return {ok:false,code:'MQTT_REHEARSAL_METADATA'};
      const port=routes.get(topic);
      if(!port)return {ok:false,code:'MQTT_REHEARSAL_TOPIC'};
      if(retained)return {ok:false,code:'MQTT_RETAINED_INPUT'};
      let message;try{message=JSON.parse(jsonText);}catch{return {ok:false,code:'JSON_PARSE'};}
      // The actual schema validator and existing bound state handler decide
      // message shape, session/revision, references and accepted effects.
      return port.submit(message,now);
    }
  });
}
