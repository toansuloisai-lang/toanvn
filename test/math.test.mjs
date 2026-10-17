import { test } from 'node:test';
import assert from 'node:assert/strict';
import {math,formula,plainToTex,promptHTML,richMath} from '../public/math.js';
import {exercises} from '../public/data.js';
import {formulaLibrary} from '../public/formula-library.js';
test('fractions preserve grouping and precedence',()=>{
  assert.equal(plainToTex('(a+b)/(c+d)'),String.raw`\frac{a+b}{c+d}`);
  assert.equal(plainToTex('x/3+2=5'),String.raw`\frac{x}{3}+2=5`);
  assert.equal(plainToTex('1/2/3'),String.raw`\frac{\frac{1}{2}}{3}`);
  assert.equal(plainToTex('-2^2'),'-2^{2}');
  assert.equal(plainToTex('(-2)^2'),String.raw`\left(-2\right)^{2}`);
  assert.equal(plainToTex('sqrt(9)'),String.raw`\sqrt{9}`);
  assert.equal(plainToTex('5,5'),'5{,}5');
});
test('all authored questions, wrong solutions, answers and reference formulas render',()=>{
  for(const ex of exercises){
    for(const html of [promptHTML(ex),formula(ex.wrong),formula(ex.answer),richMath(ex.rule)]){
      assert.doesNotMatch(html,/math-fallback|katex-error/,ex.id);
    }
    if(!ex.richPrompt||ex.prompt.includes('\\('))assert.match(promptHTML(ex),/katex/);
  }
  for(const f of formulaLibrary){
    assert.doesNotMatch(math(f.tex),/math-fallback|katex-error/,f.title);
    assert.doesNotMatch(math(f.example),/math-fallback|katex-error/,f.title);
    for(const [,tex] of f.steps)assert.doesNotMatch(math(tex),/math-fallback|katex-error/,f.title+' worked example');
    if(f.counter)assert.doesNotMatch(math(f.counter[1]),/math-fallback|katex-error/,f.title+' counterexample');
    assert.ok(f.use.length&&f.avoid.length&&f.check.length===3);
  }
});
test('inline, display, dollar delimiters and multi-line systems',()=>{
  const text=String.raw`Phân số \(\frac{1}{2}\), căn $\sqrt{9}$ và hệ \[\begin{cases}x+y=5\\x-y=1\end{cases}\].`;
  const html=richMath(text);
  assert.equal((html.match(/class="katex"/g)||[]).length,3);
  assert.match(html,/math-block/);assert.match(html,/<mfrac>/);assert.match(html,/<msqrt>/);assert.match(html,/<mtable/);
  assert.match(richMath('$$x^2$$'),/math-block/);
  assert.equal(richMath('24/09/2025 · Kết quả 8/10'),'24/09/2025 · Kết quả 8/10');
});
test('unsafe markup stays escaped and malformed LaTeX stays visible',()=>{
  assert.doesNotMatch(richMath('<img src=x onerror=alert(1)>'),/<img/);
  assert.doesNotMatch(math(String.raw`\href{javascript:alert(1)}{x}`),/href="javascript/);
  assert.match(math(String.raw`\frac{1}{`),/math-fallback/);
  assert.match(formula('<script>alert(1)</script>'),/&lt;script&gt;/);
});
