// Local Canvas -> bounded latest-frame sink. No serial port/service ownership.
import {drawTurmo} from './turmo.mjs';

export function canvasRgb565(canvas) {
  if (canvas.width !== 320 || canvas.height !== 480) throw new TypeError('320x480 Canvas required');
  const rgba = canvas.getContext('2d').getImageData(0, 0, 320, 480).data;
  const pixels = Buffer.allocUnsafe(320 * 480 * 2);
  for (let i = 0, j = 0; i < rgba.length; i += 4, j += 2) {
    const value = ((rgba[i] >> 3) << 11) | ((rgba[i + 1] >> 2) << 5) | (rgba[i + 2] >> 3);
    pixels[j] = value & 255; pixels[j + 1] = value >> 8;
  }
  return pixels;
}

export function createTurmoFrameSink({canvas, send}) {
  if (typeof send !== 'function' || canvas?.width !== 320 || canvas?.height !== 480)
    throw new TypeError('320x480 Canvas and acknowledged local sender required');
  let pending = null, active = false, stopped = false, fault = null;
  let offered = 0, replaced = 0, consumed = 0;
  const waiters = [];
  function settle() {
    if (active || pending) return;
    for (const {resolve, reject} of waiters.splice(0)) fault ? reject(fault) : resolve();
  }
  function pump() {
    if (active || stopped || fault || !pending) { settle(); return; }
    const frame = pending; pending = null; active = true;
    Promise.resolve().then(() => {
      drawTurmo(canvas.getContext('2d'), frame);
      return send(canvasRgb565(canvas));
    }).then(() => { consumed++; }, error => {
      fault = error instanceof Error ? error : new Error(String(error)); pending = null;
    }).finally(() => { active = false; pump(); });
  }
  function flush() {
    return new Promise((resolve, reject) => { waiters.push({resolve, reject}); settle(); });
  }
  return Object.freeze({
    offer(frame) {
      if (stopped || fault) return {ok:false, code:fault ? 'WRITER_FAULT' : 'STOPPED'};
      if (frame?.ok !== true) throw new TypeError('Accepted TURMO frame required');
      // Copy only the newest waiting scene; skipped frames are never rendered.
      const copy = structuredClone(frame);
      if (pending) replaced++;
      pending = copy; offered++; pump();
      return {ok:true};
    },
    read: () => Object.freeze({offered, replaced, consumed, active, waiting:pending !== null, stopped, fault}),
    flush,
    stop() { stopped = true; pending = null; return flush(); }
  });
}

// One pipe frame in flight. The worker ACKs after a transport slice, not after
// displaying every pixel. Child lifecycle/timeouts and port recovery belong to host.
export function createTurmoPipeSender(child) {
  let waiting = null, fault = null, closed = false;
  function fail(error) {
    fault ??= error;
    if (waiting) { const {reject} = waiting; waiting = null; reject(fault); }
  }
  child.on('error', fail);
  child.on('exit', () => fail(new Error('Local writer exited')));
  child.stdin.on('error', fail);
  child.stdout.on('end', () => fail(new Error('Local writer pipe ended')));
  child.stdout.on('error', fail);
  child.stdout.on('data', bytes => {
    if (!waiting || bytes.length !== 1 || bytes[0] !== 1) { fail(new Error('Invalid local writer ACK')); return; }
    waiting.ack = true; complete();
  });
  function complete() {
    if (waiting?.ack && waiting.written) { const {resolve} = waiting; waiting = null; resolve(); }
  }
  return Object.freeze({
    send(pixels) {
      if (fault || closed || waiting) return Promise.reject(fault ?? new Error('Writer closed or busy'));
      if (!Buffer.isBuffer(pixels) || pixels.length !== 307200) return Promise.reject(new TypeError('RGB565 frame required'));
      return new Promise((resolve, reject) => {
        waiting = {resolve, reject, ack:false, written:false};
        try {
          child.stdin.write(pixels, error => {
            if (error) { fail(error); return; }
            if (waiting) waiting.written = true;
            complete();
          });
        } catch (error) { fail(error); }
      });
    },
    close() { closed = true; child.stdin.end(); }
  });
}
