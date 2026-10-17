import {test} from 'node:test';
import assert from 'node:assert/strict';
import {accountStem,namedCredentials} from '../account-naming.mjs';
test('Vietnamese names become readable unique credentials across roles',()=>{
 const used=new Set(['tranvananh']),a=namedCredentials({name:'Trần Văn Anh',role:'student',used}),b=namedCredentials({name:'Trần Văn Anh',role:'student',used}),p=namedCredentials({name:'Phụ huynh',studentName:'Trần Văn Anh',role:'parent',used});
 assert.equal(accountStem('Đặng Thị Ánh'), 'dangthianh');assert.equal(a.username,'tranvananh2');assert.equal(b.username,'tranvananh3');assert.equal(p.username,'ph.tranvananh');
 for(const r of [a,b,p])assert.match(r.password,new RegExp('^'+r.username.replaceAll('.','\\.')+'@[1-9][0-9]{3}$'));
 assert.ok(accountStem('a'.repeat(90)).length<=52);
});
