// Live semantic 320x480 candidate. Never opens the display or consumes a tape.
import {drawCanvas} from './canvas.mjs';

export function drawTurmo(ctx, frame) {
  if (frame?.ok !== true || ctx.canvas.width !== 320 || ctx.canvas.height !== 480) throw new TypeError('TURMO frame and 320x480 canvas required');
  ctx.save();
  try {
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    drawCanvas(ctx, frame.scene);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'destination-over';
    const brightness = frame.preferences.brightness;
    ctx.fillStyle = `rgb(${[3, 9, 18].map(v => Math.round(v * brightness)).join(',')})`;
    ctx.fillRect(0, 0, 320, 480);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = brightness;
    ctx.strokeStyle = `rgb(${frame.ring.color.join(',')})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.ellipse(160, 211, 148, 181, 0, frame.ring.angle, frame.ring.angle + Math.PI / 3);
    ctx.stroke();
    ctx.font = '12px sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
    ctx.fillStyle = '#c7d9e6';
    ctx.fillText(`${frame.semantic.workCount} work · ${frame.semantic.concernCount} open concerns`, 12, 7, 296);
    ctx.font = '10px sans-serif';
    ctx.fillText(frame.ring.label, 12, 23, 296);
    ctx.fillStyle = '#030912'; ctx.fillRect(0, 396, 320, 84);
    for (const [i, row] of frame.rows.entries()) {
      const y = 401 + i * 39;
      ctx.fillStyle = row.concerns.length ? '#ffbc5f' : row.freshness === 'current' ? '#a1d7fa' : '#8898a6';
      ctx.font = '12px sans-serif'; ctx.fillText(row.label, 12, y, 296);
      ctx.font = '10px sans-serif';
      const concern = row.concerns.find(c => !c.acknowledged) ?? row.concerns[0];
      const assessment = concern ? `${concern.assessment === 'provisional' ? 'possible ' : ''}${concern.level} concern${concern.acknowledged ? ' · acknowledged, open' : ''}` : null;
      const state = row.freshness !== 'current' ? 'Unknown · last known' : row.lifecycle === 'finished' ?
        `Finished: ${row.outcome ?? 'unknown'}` : row.nextActor ? `${row.lifecycle} · ${row.nextActor}` : row.lifecycle;
      const response = row.attention.find(a => a.current);
      ctx.fillText([state, response?.category, assessment].filter(Boolean).join(' · '), 12, y + 16, 296);
    }
  } finally { ctx.restore(); }
}
