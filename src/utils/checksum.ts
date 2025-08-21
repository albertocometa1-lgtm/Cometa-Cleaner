export async function sha256(data: string | ArrayBuffer){
  let buffer: ArrayBuffer;
  if(typeof data === 'string'){
    buffer = new TextEncoder().encode(data);
  }else{
    buffer = data;
  }
  const hash = await crypto.subtle.digest('SHA-256', buffer);
  const arr = Array.from(new Uint8Array(hash));
  return arr.map(b=>b.toString(16).padStart(2,'0')).join('');
}
