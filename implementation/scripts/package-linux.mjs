import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {packager} from '@electron/packager';
import {allowedAppPath,packageSourceDigest,digestFile,writeManifest,verifyPackage} from './package-files.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
if(process.platform!=='linux')throw new Error('This candidate build targets Linux only');
const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
const lock=JSON.parse(fs.readFileSync(path.join(root,'package-lock.json'),'utf8'));
const sourceDigest=await packageSourceDigest(root),out=path.join(root,'dist',sourceDigest.slice(0,16));
const expected=path.join(out,`BriarPresence-linux-${process.arch}`);
if(fs.existsSync(expected)){
 const manifest=await verifyPackage(expected);if(manifest.sourceDigest!==sourceDigest)throw new Error('Existing package has a different source identity');
 console.log(JSON.stringify({package:expected,sourceDigest,reusedVerifiedPackage:true}));
}else{
 const paths=await packager({dir:root,out,name:'BriarPresence',executableName:'briar-presence',platform:'linux',arch:process.arch,electronVersion:pkg.devDependencies.electron,appVersion:pkg.version,asar:true,prune:false,overwrite:false,ignore:file=>!allowedAppPath(file)});
 if(paths.length!==1||path.resolve(paths[0])!==expected)throw new Error('Unexpected packaging destination');
 const buildInfo={sourceDigest,appVersion:pkg.version,electronVersion:pkg.devDependencies.electron,packagerVersion:pkg.devDependencies['@electron/packager'],platform:'linux',arch:process.arch,electronNpmIntegrity:lock.packages['node_modules/electron'].integrity,lockSha256:await digestFile(path.join(root,'package-lock.json')),status:'Local feasibility candidate; not accepted as a final toolkit or public release.'};
 fs.writeFileSync(path.join(expected,'BUILD-INFO.json'),JSON.stringify(buildInfo,null,2)+'\n');
 fs.writeFileSync(path.join(expected,'LOCAL-USE.md'),'# Briar Presence local candidate\n\nRun ./briar-presence from this directory. All application code and the Electron runtime are included; the development checkout and Node/npm are not needed.\n\nSynthetic visual states only. Click the image to open separate display settings, then drag the image to move Briar. Done, Escape or closing settings returns to the quiet view; Quit Briar exits. Native dragging and window placement need human verification on your compositor. Transparent pixels do not imply click-through. Desktop behaviour and resource cost still require evaluation. No auto-start or live harness connection.\n\nElectron licensing is in LICENSE and Chromium/other bundled notices are in LICENSES.chromium.html. Original Briar project source remains private; no public redistribution licence is granted here.\n');
 await writeManifest(expected,{sourceDigest,executable:'briar-presence',appVersion:pkg.version,electronVersion:pkg.devDependencies.electron});
 const manifest=await verifyPackage(expected);
 console.log(JSON.stringify({package:expected,sourceDigest,files:Object.keys(manifest.files).length,standaloneRuntime:true,publicRelease:false}));
}
