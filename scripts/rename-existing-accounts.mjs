import fs from 'node:fs/promises';
import path from 'node:path';
import {randomBytes,scryptSync} from 'node:crypto';
import ExcelJS from 'exceljs';
import assert from 'node:assert/strict';
import {namedCredentials} from '../account-naming.mjs';

try{process.loadEnvFile('.env');}catch(error){if(error.code!=='ENOENT')throw error;}
if(process.env.MATH_STORAGE&&process.env.MATH_STORAGE!=='json')throw Error('Cần chạy chuyển tài khoản qua đúng kho đang hoạt động; script này chỉ dành cho JSON.');
const file=path.resolve(process.env.MATH_DB_PATH||'private/accounts.json'),raw=await fs.readFile(file),db=JSON.parse(raw.toString('utf8'));
const destination=path.resolve('private/tai-khoan-hien-tai'),used=new Set(),credentials=[];
const roleNames={admin:'Quản trị',teacher:'Giáo viên',student:'Học sinh',parent:'Phụ huynh'};
const before=structuredClone(db);
for(const u of db.users){
 const child=db.users.find(s=>s.role==='student'&&u.studentIds?.includes(s.id));
 const {username,password}=namedCredentials({name:u.name,role:u.role,studentName:child?.name,used});
 const classes=(db.classes||[]).filter(c=>u.role==='teacher'?c.teacherId===u.id:u.role==='student'?c.studentIds.includes(u.id):u.role==='parent'?c.studentIds.some(id=>u.studentIds.includes(id)):false).map(c=>c.name).join(', ');
 credentials.push({id:u.id,role:u.role,roleName:roleNames[u.role],name:u.name,classes,oldUsername:u.username,username,password});
 u.username=username;u.salt=randomBytes(16).toString('hex');u.hash=scryptSync(password,u.salt,64).toString('hex');
}
const strip=d=>({...d,users:d.users.map(({username,salt,hash,...u})=>u)});
assert.deepEqual(strip(db),strip(before));
for(const row of credentials){const u=db.users.find(u=>u.id===row.id);assert.equal(scryptSync(row.password,u.salt,64).toString('hex'),u.hash);}
if(!process.argv.includes('--apply')){console.log(JSON.stringify({accounts:credentials.length,roles:Object.fromEntries(Object.keys(roleNames).map(role=>[role,credentials.filter(c=>c.role===role).length])),action:'Chạy --apply khi máy chủ đã dừng.'}));process.exit(0);}
if(!(await fs.readFile(file)).equals(raw))throw Error('Dữ liệu đã thay đổi; dừng máy chủ rồi chạy lại.');
const backup=file+'.before-named-accounts-'+Date.now()+'.bak';await fs.copyFile(file,backup);
const book=new ExcelJS.Workbook(),sheet=book.addWorksheet('Tài khoản',{views:[{state:'frozen',ySplit:1}]});
sheet.addRow(['Vai trò','Họ tên','Lớp','Tên đăng nhập','Mật khẩu']);
for(const r of credentials)sheet.addRow([r.roleName,r.name,r.classes,r.username,r.password]);
sheet.columns=[18,32,24,32,40].map(width=>({width,style:{numFmt:'@',alignment:{vertical:'middle',wrapText:true}}}));
sheet.getRow(1).eachCell(cell=>{cell.font={bold:true,color:{argb:'FFFFFFFF'}};cell.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF173B67'}};});
sheet.autoFilter={from:'A1',to:'E'+sheet.rowCount};
await fs.writeFile(destination+'.xlsx',Buffer.from(await book.xlsx.writeBuffer()),{mode:0o600});
await fs.writeFile(destination+'.json',JSON.stringify(credentials,null,2),{mode:0o600});
await fs.writeFile(destination+'.md','# Danh sách tài khoản hiện tại\n\n| Vai trò | Họ tên | Lớp | Tên đăng nhập | Mật khẩu |\n|---|---|---|---|---|\n'+credentials.map(r=>`| ${r.roleName} | ${r.name} | ${r.classes} | ${r.username} | ${r.password} |`).join('\n')+'\n',{mode:0o600});
await fs.writeFile(file+'.tmp',JSON.stringify(db),{mode:0o600});await fs.rename(file+'.tmp',file);
console.log(JSON.stringify({updated:credentials.length,backup,excel:destination+'.xlsx',list:destination+'.md'}));
