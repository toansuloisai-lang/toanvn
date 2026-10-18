import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseExact,solveExact,canonical,equal} from '../scripts/library-exact-math.mjs';
test('source arithmetic auditor respects exact fractions, decimals, precedence and linear equations',()=>{
 for(const [input,expected] of [['0,1+0,2','3/10'],['–17+5+8+17-5','8'],['-2^2','-4'],['(-2)^2','4'],['1/3+1/6','1/2'],['2*(3+4)^2','98']])assert.equal(canonical(parseExact(input).value),expected);
 assert.equal(canonical(solveExact('5*(3*x+5)-4*(2*x-3)','5*x+3*(2*x-12)+1').value),'18');
 for(const input of ['1/0','2+','(1+2','2^100','1+abc','x*x','1/x'])assert.throws(()=>parseExact(input,{variable:true}),input);
 assert.throws(()=>solveExact('x+1','x+1'));
});
test('all automatically reviewed answers recompute from the recorded expression and original source answer',()=>{
 const bank=JSON.parse(readFileSync(new URL('../data/datatm-arithmetic-reviewed.json',import.meta.url)));
 assert.ok(bank.questions.length>=60);
 for(const q of bank.questions){const audit=q.review.audit;const actual=audit.kind==='arithmetic'?parseExact(audit.expression).value:solveExact(...audit.expression.split('=')).value;assert.equal(canonical(actual),q.answer);assert.ok(equal(actual,parseExact(q.source.originalAnswer.split('=').at(-1).trim().replace(/[.;]+$/,'')).value),q.id);}
});
