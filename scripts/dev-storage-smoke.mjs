import {
  initStorage,
  upsert,
  get,
  list,
  remove,
  exportBackup,
  importBackup,
  clearAll
} from '../src/storage/storage.js';

async function run(){
  console.log('init');
  await initStorage();
  await clearAll();
  await upsert('users',{id:'u1',name:'Mario'});
  console.log('user saved', await get('users','u1'));
  await upsert('users',{id:'u1',name:'Luigi'});
  console.log('user updated', await get('users','u1'));
  console.log('list', await list('users'));
  await remove('users','u1');
  console.log('after remove', await list('users'));
  await upsert('settings',{id:'app',theme:'dark'});
  const backup = await exportBackup();
  console.log('backup', backup.size);
  await clearAll();
  await importBackup(await backup.text());
  console.log('restored', await get('settings','app'));
}

run().catch(e=>{
  console.error('smoke failed', e);
});
