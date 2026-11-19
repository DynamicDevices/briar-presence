'use strict';
const DEFAULTS=Object.freeze({brightness:100,scale:100,reducedMotion:null,desktopContrast:true});
function validateDisplay(value){
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).sort().join(',')!=='brightness,desktopContrast,reducedMotion,scale')throw new TypeError('Only display preferences are accepted');
 if(!Number.isFinite(value.brightness)||value.brightness<35||value.brightness>100||!Number.isFinite(value.scale)||value.scale<70||value.scale>120||![null,true,false].includes(value.reducedMotion))throw new TypeError('Invalid display preferences');
 if(typeof value.desktopContrast!=='boolean')throw new TypeError('Invalid contrast preference');
 return{brightness:value.brightness,scale:value.scale,reducedMotion:value.reducedMotion,desktopContrast:value.desktopContrast};
}
function migrateDisplay(value){
 if(value&&typeof value==='object'&&Object.keys(value).sort().join(',')==='brightness,reducedMotion,scale')return validateDisplay({...value,desktopContrast:true});
 return validateDisplay(value);
}
module.exports={DEFAULTS,validateDisplay,migrateDisplay};
