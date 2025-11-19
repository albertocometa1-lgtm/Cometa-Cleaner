import crypto from 'node:crypto';

export function getBuildHash(){
  return process.env.BUILD_HASH || process.env.COMMIT_SHA || crypto.randomBytes(6).toString('hex');
}
