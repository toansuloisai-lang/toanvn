import ExcelJS from 'exceljs';
import {randomUUID,randomBytes,scryptSync} from 'node:crypto';
import {namedCredentials} from './account-naming.mjs';
const fail=(message,status=400)=>{throw Object.assign(new Error(message),{status});};
const headers=['Tên học sinh','Tên phụ huynh','Gmail phụ huynh'];
export async function workbook(rows,columns=headers){
  const book=new ExcelJS.Workbook(),sheet=book.addWorksheet('Danh sách');
  sheet.addRow(columns);rows.forEach(row=>sheet.addRow(row));
  sheet.columns.forEach(c=>c.width=30);sheet.getRow(1).font={bold:true};
  return Buffer.from(await book.xlsx.writeBuffer());
}
export async function credentialsWorkbook(result){
  const book=new ExcelJS.Workbook();book.creator='Quản lý lớp học';
  const sheet=book.addWorksheet('Tài khoản lớp',{views:[{state:'frozen',ySplit:1,xSplit:2}]});
  sheet.addRow(['Lớp','Khối','Tên học sinh','Tài khoản học sinh','Mật khẩu học sinh','Tên phụ huynh','Email phụ huynh','Tài khoản phụ huynh','Mật khẩu phụ huynh']);
  for(const row of result.credentials)sheet.addRow([result.className,String(result.grade),...row].map(String));
  sheet.columns=[18,8,26,26,30,26,34,26,46].map(width=>({width,style:{numFmt:'@',alignment:{vertical:'middle',wrapText:true}}}));
  sheet.getRow(1).height=34;sheet.getRow(1).eachCell((cell,col)=>{cell.font={bold:true,color:{argb:'FFFFFFFF'}};cell.fill={type:'pattern',pattern:'solid',fgColor:{argb:col<=2?'FF173B67':col<=5?'FF2464AF':'FF167C70'}};});
  for(let i=2;i<=sheet.rowCount;i++){sheet.getRow(i).height=40;sheet.getRow(i).eachCell(cell=>{cell.fill={type:'pattern',pattern:'solid',fgColor:{argb:i%2?'FFF0F6FF':'FFFFFFFF'}};});}
  sheet.autoFilter={from:'A1',to:`I${sheet.rowCount}`};
  sheet.pageSetup={orientation:'landscape',fitToPage:true,fitToWidth:1,fitToHeight:0,printTitlesRow:'1:1'};
  return Buffer.from(await book.xlsx.writeBuffer());
}
export function createRosterService({db,persist}){
  const previews=new Map();
  const guard=user=>{if(user.role!=='teacher')fail('Chỉ giáo viên được nhập danh sách.',403);};
  function validate(user,name,grade,rows){
    if(!name||name.length>80||![6,7,8,9].includes(grade))fail('Tên lớp hoặc khối không hợp lệ.');
    if(db.classes.some(c=>c.teacherId===user.id&&c.name.toLowerCase()===name.toLowerCase()))fail('Tên lớp đã tồn tại. Hãy chọn tên khác.');
    const seen=new Set(),parents=new Map();
    return rows.map((row,i)=>{
      const [studentName,parentName,email]=row,errors=[];
      if(!studentName||studentName.length>80||!parentName||parentName.length>80)errors.push('Tên phải có từ 1 đến 80 ký tự.');
      if(email.length>254||! /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))errors.push('Email không hợp lệ.');
      const key=studentName.toLowerCase()+'|'+email;
      if(seen.has(key))errors.push('Trùng học sinh và email phụ huynh.');seen.add(key);
      if(parents.has(email)&&parents.get(email)!==parentName)errors.push('Cùng email nhưng khác tên phụ huynh.');parents.set(email,parentName);
      const matches=db.users.filter(u=>u.email?.toLowerCase()===email),parent=matches[0];
      if(matches.length>1||parent&&(parent.role!=='parent'||parent.name!==parentName||!parent.studentIds.some(id=>user.studentIds.includes(id))))errors.push('Email đã được sử dụng; liên hệ quản trị để kiểm tra liên kết.');
      return {row:i+2,studentName,parentName,email,parentId:parent?.id,existingParent:!!parent,errors};
    });
  }
  async function preview(user,input){
    guard(user);
    for(const [id,p] of previews)if(p.expires<Date.now())previews.delete(id);
    if(previews.size>=100)fail('Có quá nhiều lượt nhập đang chờ. Vui lòng thử lại sau.',429);
    if(typeof input.base64!=='string'||input.base64.length>7000000||!String(input.filename).toLowerCase().endsWith('.xlsx'))fail('Chọn file Excel .xlsx, tối đa 5 MB.');
    const buffer=Buffer.from(input.base64,'base64');
    if(!buffer.length||buffer.length>5*1024*1024||buffer.toString('base64')!==input.base64)fail('File không hợp lệ.');
    // Bound expanded ZIP size before ExcelJS decompresses the workbook.
    let expanded=0,entries=0;
    for(let i=0;i+46<=buffer.length;i++)if(buffer.readUInt32LE(i)===0x02014b50){expanded+=buffer.readUInt32LE(i+24);entries++;}
    if(!entries||entries>1000||expanded>20*1024*1024)fail('File Excel quá lớn sau giải nén.');
    const book=new ExcelJS.Workbook();try{await book.xlsx.load(buffer);}catch{fail('Không đọc được file Excel.');}
    const sheet=book.worksheets[0];if(!sheet||sheet.rowCount<2||sheet.rowCount>201||sheet.columnCount!==3)fail('File cần 3 cột theo mẫu và từ 1 đến 200 học sinh.');
    const cellText=cell=>{const value=cell.value;if(value===null)return '';if(typeof value!=='string')fail('Chỉ nhập văn bản thuần, không dùng công thức hoặc liên kết trong Excel.');return value.trim();};
    if(headers.some((h,i)=>cellText(sheet.getCell(1,i+1))!==h))fail('Tên cột không đúng. Hãy dùng file mẫu.');
    const rows=[];for(let n=2;n<=sheet.rowCount;n++){const row=[1,2,3].map(c=>cellText(sheet.getCell(n,c)));if(row.some(Boolean)){row[2]=row[2].toLowerCase();rows.push(row);}}
    if(!rows.length)fail('Danh sách trống.');
    const name=String(input.name||'').trim(),grade=Number(input.grade),result=validate(user,name,grade,rows),id=randomUUID();
    previews.set(id,{teacherId:user.id,name,grade,rows,expires:Date.now()+30*60*1000});
    return {id,rows:result,valid:result.every(r=>!r.errors.length)};
  }
  function commit(user,id){
    guard(user);const p=previews.get(id);
    if(!p||p.teacherId!==user.id||p.expires<Date.now())fail('Lượt nhập hết hạn. Hãy tải lại file.',404);
    if(p.result)return p.result;
    const rows=validate(user,p.name,p.grade,p.rows);if(rows.some(r=>r.errors.length))fail('Danh sách có lỗi. Hãy xem trước lại.');
    const snapshot=structuredClone(db),teacherIds=[...user.studentIds],credentials=[],members=[];
    const used=new Set(db.users.map(u=>u.username));
    const make=(name,role,email,studentName)=>{
      const {username,password}=namedCredentials({name,role,studentName,used}),salt=randomBytes(16).toString('hex');
      const u={id:randomUUID(),username,name,role,email,studentIds:[],salt,hash:scryptSync(password,salt,64).toString('hex')};
      if(role==='student')u.studentCode=username;
      db.users.push(u);return {u,password};
    };
    try{
      for(const row of rows){
        const {u:student,password}=make(row.studentName,'student');members.push(student.id);user.studentIds.push(student.id);
        db.states[student.id]={attempts:[],reviews:{},assignments:[],notes:{},profile:{name:row.studentName,grade:p.grade}};
        let parent=db.users.find(u=>u.role==='parent'&&u.email===row.email),parentPassword='Đã có tài khoản; dùng mật khẩu hiện tại';
        if(!parent){const made=make(row.parentName,'parent',row.email,row.studentName);parent=made.u;parentPassword=made.password;}
        else {const previous=credentials.find(r=>r[4]===row.email);if(previous)parentPassword=previous[6];}
        parent.studentIds.push(student.id);
        credentials.push([row.studentName,student.username,password,row.parentName,row.email,parent.username,parentPassword]);
      }
      const item={id:randomUUID(),teacherId:user.id,name:p.name,grade:p.grade,studentIds:members};db.classes.push(item);persist();
      p.result={classId:item.id,className:item.name,grade:item.grade,count:members.length,credentials};return p.result;
    }catch(error){for(const key of Object.keys(db))delete db[key];Object.assign(db,snapshot);user.studentIds=teacherIds;throw error;}
  }
  return {preview,commit,template:()=>workbook([['Nguyễn Minh An','Nguyễn Văn Bình','binh@example.com']])};
}
