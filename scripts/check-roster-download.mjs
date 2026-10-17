import {createTestApp} from './browser-fixture.mjs';
import {chromium} from '@playwright/test';
import ExcelJS from 'exceljs';
import assert from 'node:assert/strict';
import {workbook} from '../roster-import.mjs';
const app=await createTestApp(),browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const page=await browser.newPage();await app.login(page,'teacher');await page.goto(app.base);
 await page.evaluate(async()=>{const {mountRoster}=await import('/roster-import.js');document.body.innerHTML='<main></main>';mountRoster(document.querySelector('main'),{auth:{},request:async(path,method='GET',data)=>{const r=await fetch(path,{method,headers:{'Content-Type':'application/json'},...(data?{body:JSON.stringify(data)}:{})});const result=await r.json();if(!r.ok)throw Error(result.error);return result;},onCreated:()=>{}});});
 await page.locator('#roster-form [name="name"]').fill('8A5');await page.locator('#roster-form [name="grade"]').selectOption('8');
 await page.locator('[name="file"]').setInputFiles({name:'lop.xlsx',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',buffer:await workbook([['Nguyễn An','Nguyễn Bình','binh@example.com'],['Nguyễn Hà','Nguyễn Bình','binh@example.com']])});
 await page.locator('#roster-form button').click();await page.locator('#roster-confirm').waitFor();const downloadPromise=page.waitForEvent('download');await page.locator('#roster-confirm').click();const download=await downloadPromise;assert.equal(download.suggestedFilename(),'tai-khoan-lop-8A5.xlsx');
 const book=new ExcelJS.Workbook();await book.xlsx.readFile(await download.path());const sheet=book.worksheets[0];assert.equal(sheet.rowCount,3);assert.equal(sheet.getCell('A2').value,'8A5');assert.equal(sheet.getCell('C2').value,'Nguyễn An');assert.equal(sheet.getCell('H2').value,sheet.getCell('H3').value);assert.equal(sheet.getCell('I2').value,sheet.getCell('I3').value);
 for(const [u,p] of [['D2','E2'],['D3','E3'],['H2','I2']]){const response=await page.context().request.post(app.base+'/api/auth/login',{data:{username:sheet.getCell(u).value,password:sheet.getCell(p).value}});assert.ok(response.ok());}
 const again=page.waitForEvent('download');await page.locator('#roster-download').click();assert.equal((await again).suggestedFilename(),download.suggestedFilename());
 console.log('PASS: Excel import auto-downloads XLSX; student and shared parent credentials log in; re-download works');
}finally{await browser.close();await app.close();}
