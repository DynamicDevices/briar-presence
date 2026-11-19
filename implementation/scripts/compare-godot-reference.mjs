// Compare app-only captures, not compositor screenshots. No visual tolerance is assumed.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
const require = createRequire(import.meta.url);
const {createCanvas, loadImage} = require(process.env.BRIAR_CANVAS_MODULE || '@napi-rs/canvas');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../test-artifacts');
const names = ['godot-study-reference', 'godot-instanced-study-reference'];
const reports = names.map(name => JSON.parse(fs.readFileSync(path.join(root, name+'.json'))));
for (const report of reports) {
  assert.equal(report.passed, true);
  assert.equal(report.referenceFrame, true);
}
assert.equal(reports[0].sampleTime, reports[1].sampleTime);
assert.equal(reports[0].studySha256, reports[1].studySha256);
const files = names.map(name => fs.readFileSync(path.join(root, name+'.png')));
const images = await Promise.all(files.map(file => loadImage(file)));
const {width, height} = images[0];
assert.equal(images[1].width, width);
assert.equal(images[1].height, height);
const data = images.map(image => {
  const ctx = createCanvas(width, height).getContext('2d');
  ctx.drawImage(image, 0, 0);
  return ctx.getImageData(0, 0, width, height).data;
});
let changedPixels=0, totalDifference=0, maxChannelDifference=0;
const diffCanvas=createCanvas(width,height), ctx=diffCanvas.getContext('2d');
const diff=ctx.createImageData(width,height);
for(let p=0;p<width*height;p++) {
  let changed=false;
  for(let channel=0;channel<4;channel++) {
    const offset=p*4+channel, delta=Math.abs(data[0][offset]-data[1][offset]);
    totalDifference+=delta;
    maxChannelDifference=Math.max(maxChannelDifference,delta);
    changed ||= delta!==0;
    if(channel<3) diff.data[offset]=Math.min(255,delta*4);
  }
  diff.data[p*4+3]=255;
  changedPixels+=Number(changed);
}
ctx.putImageData(diff,0,0);
const result={type:'godot-reference-image-comparison',width,height,
  sampleTime:reports[0].sampleTime,changedPixels,totalPixels:width*height,
  meanAbsoluteChannelDifference:totalDifference/(width*height*4),maxChannelDifference,
  imagesSha256:files.map(file=>crypto.createHash('sha256').update(file).digest('hex')),
  scope:'One quiet frame, decoded canvas RGBA; not pixel-equivalence across states, visual acceptance or a performance benchmark. Difference image is RGB amplified 4x.'};
fs.writeFileSync(path.join(root,'godot-reference-difference.png'),diffCanvas.toBuffer('image/png'));
fs.writeFileSync(path.join(root,'godot-reference-comparison.json'),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result));
