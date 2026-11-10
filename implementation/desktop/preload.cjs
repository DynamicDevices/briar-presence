'use strict';
const {contextBridge,ipcRenderer}=require('electron');
const subscribe=(channel,callback)=>{if(typeof callback!=='function')throw new TypeError('Callback required');const handler=(_event,value)=>callback(value);ipcRenderer.on(channel,handler);return()=>ipcRenderer.removeListener(channel,handler);};
contextBridge.exposeInMainWorld('presenceHost',Object.freeze({
 getSecurityInfo:()=>Object.freeze({sandboxed:process.sandboxed,contextIsolated:process.contextIsolated}),
 ready:()=>ipcRenderer.send('presence:ready'),
 getSnapshot:()=>ipcRenderer.invoke('presence:get-snapshot'),
 saveDisplay:value=>ipcRenderer.invoke('presence:save-display',value),
 setDemoState:value=>ipcRenderer.invoke('presence:demo-state',value),
 setStayAbove:value=>ipcRenderer.invoke('presence:stay-above',value),
 showControls:()=>ipcRenderer.invoke('presence:show-controls'),
 hideControls:()=>ipcRenderer.invoke('presence:hide-controls'),
 quit:()=>ipcRenderer.invoke('presence:quit'),
 onSnapshot:callback=>subscribe('presence:snapshot',callback),
 onVisibility:callback=>subscribe('presence:visibility',callback)
}));
