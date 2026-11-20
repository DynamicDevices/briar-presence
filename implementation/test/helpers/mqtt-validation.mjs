// Complete schema oracle for finite synthetic hosts. Not a production validator.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {createViewSchema, syncRequestSchema} from '../../transports/mqtt/view-schema.mjs';

const input = JSON.parse(fs.readFileSync(new URL('../../../design/api/0.1-draft/schema.json', import.meta.url)));
const oracle = fileURLToPath(new URL('./view_schema_oracle.py', import.meta.url));
function validator(schema) {
  const cache = new Map();
  return message => {
    const key = JSON.stringify(message);
    if (!cache.has(key)) {
      const result = spawnSync('python3', [oracle], {input: JSON.stringify({schema, message}), encoding: 'utf8', timeout: 15000, maxBuffer: 4096});
      assert.equal(result.status, 0, result.error?.message || result.stderr);
      cache.set(key, JSON.parse(result.stdout));
    }
    return cache.get(key);
  };
}
export const validateView = validator(createViewSchema(input));
export const validateSync = validator(syncRequestSchema);
