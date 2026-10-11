import {createStore} from '../auth-store.mjs';
import {createPostgresStorage} from './storage.mjs';

export function createApplicationStore(){
  const mode=process.env.MATH_STORAGE||'json';
  if(mode==='json')return createStore();
  if(mode!=='supabase')throw Error('MATH_STORAGE must be json or supabase.');
  const storage=createPostgresStorage();
  try{return createStore(undefined,{storage});}
  catch(error){storage.close();throw error;}
}
