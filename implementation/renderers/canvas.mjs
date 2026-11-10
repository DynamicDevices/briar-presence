// Canvas adapter only. Coordinates in the scene are normalised to its view box.
export function drawCanvas(ctx,scene,{contrast=false}={}){
 const width=360,height=460,TAU=Math.PI*2;
 ctx.setTransform(ctx.canvas.width/width,0,0,ctx.canvas.height/height,0,0);
 ctx.clearRect(0,0,width,height);ctx.save();ctx.translate(180,224);
 // Desktop-only contrast treatment, following the irregular light clusters.
 // The portable scene and the default reference renderer remain unchanged.
 if(contrast)for(const c of scene.glows){
  ctx.save();ctx.translate(c.x*width-180,c.y*height-224);ctx.scale(c.rx*width*1.12,c.ry*height*1.12);
  const shade=ctx.createRadialGradient(0,0,0,0,0,1);
  shade.addColorStop(0,'rgba(3,9,17,.9)');shade.addColorStop(.45,'rgba(3,9,17,.78)');shade.addColorStop(1,'rgba(3,9,17,0)');
  ctx.fillStyle=shade;ctx.beginPath();ctx.arc(0,0,1,0,TAU);ctx.fill();ctx.restore();
 }
 for(const c of scene.glows){
  ctx.save();ctx.translate(c.x*width-180,c.y*height-224);ctx.scale(c.rx*width,c.ry*height);
  const rgb=c.color.join(','),glow=ctx.createRadialGradient(0,0,0,0,0,1);
  glow.addColorStop(0,`rgba(${rgb},${.24*c.opacity})`);
  glow.addColorStop(.4,`rgba(${rgb},${.08*c.opacity})`);
  glow.addColorStop(1,`rgba(${rgb},0)`);
  ctx.fillStyle=glow;ctx.beginPath();ctx.arc(0,0,1,0,TAU);ctx.fill();ctx.restore();
 }
 for(const p of scene.lights){
  const x=p.x*width-180,y=p.y*height-224,r=p.radius*width,rgb=p.color.join(',');
  if(p.halo){ctx.beginPath();ctx.arc(x,y,r*4,0,TAU);ctx.fillStyle=`rgba(${rgb},${p.opacity*.06})`;ctx.fill();}
  ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.fillStyle=`rgba(${rgb},${p.opacity})`;ctx.fill();
 }
 ctx.restore();
}
