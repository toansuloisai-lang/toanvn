// Small rational/affine parser used only to independently audit source documents.
const abs=n=>n<0n?-n:n;
const gcd=(a,b)=>{a=abs(a);b=abs(b);while(b)[a,b]=[b,a%b];return a;};
export function rational(n,d=1n){if(!d)throw Error('division by zero');if(d<0n){n=-n;d=-d;}const g=gcd(n,d);n/=g;d/=g;if(String(abs(n)).length>100||String(d).length>100)throw Error('number too large');return {n,d};}
export const add=(a,b)=>rational(a.n*b.d+b.n*a.d,a.d*b.d),neg=a=>rational(-a.n,a.d),sub=(a,b)=>add(a,neg(b)),mul=(a,b)=>rational(a.n*b.n,a.d*b.d),div=(a,b)=>rational(a.n*b.d,a.d*b.n);
export const equal=(a,b)=>a.n===b.n&&a.d===b.d;
export const canonical=a=>a.d===1n?String(a.n):a.n+'/'+a.d;
export const tex=a=>a.d===1n?String(a.n):`${a.n<0n?'-':''}\\frac{${abs(a.n)}}{${a.d}}`;
export function normalizeExpression(input){return String(input).normalize('NFC').replace(/[–−]/g,'-').replace(/[·×]/g,'*').replace(/[÷:]/g,'/').replace(/[\[{]/g,'(').replace(/[\]}]/g,')').replace(/²/g,'^2').replace(/³/g,'^3').replace(/,/g,'.').replace(/\s/g,'').replace(/\)\.(?=\(|\d|x)/g,')*').replace(/(\d)\.(?=\()/g,'$1*').replace(/(\d|\))(?=x|\()/g,'$1*').replace(/x(?=\()/g,'x*');}
export function parseExact(input,{variable=false}={}){
 const s=normalizeExpression(input);if(!s||s.length>300||/[^0-9.x+*/^()\-]/.test(s)||(!variable&&s.includes('x')))throw Error('unsupported expression');
 const tokens=s.match(/\d+(?:\.\d+)?|x|[+*/^()\-]/g)||[];if(tokens.join('')!==s)throw Error('invalid token');let index=0;const trace=[];
 const constant=v=>[rational(0n),v],record=(op,a,b,result)=>{if(a[0].n===0n&&b[0].n===0n)trace.push(`${op==='^'?`(${tex(a[1])})^{${tex(b[1])}}`:`(${tex(a[1])}) ${op==='*'?'\\cdot':op==='/'?'\\div':op} (${tex(b[1])})`} = ${tex(result[1])}`);return result;};
 function atom(){const t=tokens[index++];if(t==='('){const value=sum();if(tokens[index++]!==')')throw Error('unbalanced parentheses');return value;}if(t==='x')return [rational(1n),rational(0n)];if(!/^\d+(?:\.\d+)?$/.test(t||''))throw Error('expected number');return constant(rational(BigInt(t.replace('.','')),10n**BigInt(t.split('.')[1]?.length||0)));}
 function power(){let a=atom();if(tokens[index]==='^'){index++;const b=unary();if(b[0].n||b[1].d!==1n||abs(b[1].n)>12n)throw Error('unsupported exponent');const e=b[1].n;if(a[0].n){if(e===0n)return constant(rational(1n));if(e===1n)return a;throw Error('nonlinear expression');}const value=e<0n?rational(a[1].d**(-e),a[1].n**(-e)):rational(a[1].n**e,a[1].d**e);a=record('^',a,b,constant(value));}return a;}
 function unary(){if(tokens[index]==='-'){index++;return unary().map(neg);}if(tokens[index]==='+'){index++;return unary();}return power();}
 function product(){let a=unary();while(['*','/'].includes(tokens[index])){const op=tokens[index++],b=unary();let result;if(op==='/'){if(b[0].n)throw Error('variable denominator');result=a.map(v=>div(v,b[1]));}else{if(a[0].n&&b[0].n)throw Error('nonlinear expression');result=[add(mul(a[0],b[1]),mul(a[1],b[0])),mul(a[1],b[1])];}a=record(op,a,b,result);}return a;}
 function sum(){let a=product();while(['+','-'].includes(tokens[index])){const op=tokens[index++],b=product(),fn=op==='+'?add:sub;a=record(op,a,b,[fn(a[0],b[0]),fn(a[1],b[1])]);}return a;}
 const affine=sum();if(index!==tokens.length)throw Error('unexpected token');return {affine,value:affine[1],trace,expression:s};
}
export function solveExact(left,right){const a=parseExact(left,{variable:true}).affine,b=parseExact(right,{variable:true}).affine,coefficient=sub(a[0],b[0]),constant=sub(b[1],a[1]);if(!coefficient.n)throw Error('no unique solution');return {value:div(constant,coefficient),coefficient,constant};}
