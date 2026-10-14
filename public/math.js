import katex from './vendor/katex/katex.mjs';
import { exercises } from './data.js';

const escape = s => String(s ?? '').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const options = {throwOnError:true,trust:false,strict:code=>['unicodeTextInMathMode','unknownSymbol'].includes(code)?'ignore':'error',output:'htmlAndMathml',maxExpand:200,maxSize:20};
export function math(tex, display=false) {
  const source=String(tex);
  try {
    if(source.length>4000)throw Error('Too long');
    return `<span class="math-expression${display?' math-block':''}">${katex.renderToString(source,{...options,displayMode:display})}</span>`;
  } catch {
    // A malformed formula remains readable; never silently drop or reinterpret it.
    return `<span class="math-fallback" title="Công thức chưa đúng cú pháp; đang hiển thị bản gốc">${escape(source)}</span>`;
  }
}

// A restricted arithmetic parser for display, separate from answer grading.
// Fractions are structural: (a+b)/(c+d) is not rewritten by substring guesses.
export function plainToTex(input) {
  const s=String(input).replace(/−/g,'-').replace(/²/g,'^2').replace(/³/g,'^3').replace(/×|·/g,'*').replace(/÷|:/g,'/').replace(/√/g,'sqrt').replace(/\s/g,'');
  if(!s || s.length>500)throw Error('Invalid formula');
  const tokens=s.match(/sqrt|\d+(?:[.,]\d+)?|[a-zA-Z]|<=|>=|!=|[+*/^_=<>≤≥≠⇒→(){}\-]/g)||[];
  if(tokens.join('')!==s)throw Error('Unsupported notation');
  let i=0;
  const precedence={'=':1,'<':1,'>':1,'≤':1,'≥':1,'≠':1,'<=':1,'>=':1,'!=':1,'⇒':1,'→':1,'+':2,'-':2,'*':3,'/':3,'^':5,'_':5};
  const symbols={'*':'\\cdot ','<=':'\\le ','>=':'\\ge ','!=':'\\ne ','≤':'\\le ','≥':'\\ge ','≠':'\\ne ','⇒':'\\Rightarrow ','→':'\\to '};
  function expression(min=0) {
    let t=tokens[i++], left;
    if(t==='+'||t==='-')left={tex:t+expression(4).tex};
    else if(t==='('||t==='{'){
      const inside=expression();if(tokens[i++]!==(t==='('?')':'}'))throw Error('Missing bracket');
      left={tex:`\\left(${inside.tex}\\right)`,inner:inside.tex};
    }else if(t==='sqrt'){const value=expression(5);left={tex:`\\sqrt{${value.inner??value.tex}}`};}
    else if(t && /^(?:\d+(?:[.,]\d+)?|[a-zA-Z])$/.test(t))left={tex:t.replace(',','{,}')};
    else throw Error('Expected operand');
    while(i<tokens.length){
      const next=tokens[i];if(next===')'||next==='}')break;
      const implicit=/^(?:\d|[a-zA-Z(])/.test(next);
      const op=implicit?'*':next,level=precedence[op];
      if(level===undefined)throw Error('Unknown operator');
      if(level<min)break;
      if(!implicit)i++;
      const right=expression(level+(op==='^'||op==='_'?0:1));
      if(op==='/')left={tex:`\\frac{${left.inner??left.tex}}{${right.inner??right.tex}}`};
      else if(op==='^'||op==='_')left={tex:`${left.tex}${op}{${right.inner??right.tex}}`};
      else left={tex:`${left.tex}${implicit?' ':symbols[op]??op}${right.tex}`};
    }
    return left;
  }
  const value=expression();if(i!==tokens.length)throw Error('Trailing tokens');return value.tex;
}
export function formula(input,display=false){try{return math(plainToTex(input),display);}catch{return `<span class="math-fallback">${escape(input)}</span>`;}}
export function solutionHTML(input){
 if(/\\[([]|\$/.test(String(input)))return richMath(input);
 try{return math(plainToTex(input));}catch{return richMath(input);}
}
export function promptHTML(ex){
  if(!ex)return '<span class="missing-exercise">Nội dung bài này chưa có trong phiên bản hiện tại.</span>';
  if(ex.richPrompt||/\\[([]|\$/.test(ex.prompt))return richMath(ex.prompt);
  const match=ex.prompt.match(/^(Tính |Khai triển |Bỏ ngoặc trong |Thu gọn |Giải phương trình )(.+?)(\. Chỉ nhập giá trị x\.|\.)$/u);
  return match?escape(match[1])+formula(match[2])+escape(match[3]):escape(ex.prompt);
}

// Explicit legacy fragments only: don't misidentify dates, scores or Vietnamese prose.
const fragments=[
  '−5 − 9 = −5 + (−9)','3·x + 3·2','(−2)·(−3) = 6','−3·2x = −6x','−3·5 = −15',
  '4 − 2x + 3','2x + x = 3x','3 − 5 = −2','5x − 2x − 1','2x + 6 + x','2x + x',
  '2x − 6 = 8','3x = 12','a ≠ 0','a = 0','b = 24 − 2a','y = ax + b',
  ...exercises.filter(e=>!e.richPrompt).flatMap(e=>[e.prompt.match(/^(?:Tính |Khai triển |Bỏ ngoặc trong |Thu gọn |Giải phương trình )(.+?)\./u)?.[1],e.wrong,e.answer])
].filter(s=>s && /[a-z+−=×:²³]/i.test(s) && s.length>1);
const literal=s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const legacyPattern=new RegExp(`(?<![\\p{L}\\p{N}])(?:${[...new Set(fragments)].sort((a,b)=>b.length-a.length).map(literal).join('|')})(?![\\p{L}\\p{N}])`,'gu');
function legacyText(text){
  let out='',start=0;
  for(const m of text.matchAll(legacyPattern)){out+=escape(text.slice(start,m.index))+formula(m[0]);start=m.index+m[0].length;}
  return out+escape(text.slice(start));
}
export function richMath(text){
  const source=String(text??'');
  const delimiters=/\$\$([\s\S]*?)\$\$|\\\[([\s\S]*?)\\\]|\\\(([\s\S]*?)\\\)|(?<!\\)\$([^$\n]+?)\$/g;
  let out='',start=0;
  for(const m of source.matchAll(delimiters)){
    out+=legacyText(source.slice(start,m.index));
    out+=math(m[1]??m[2]??m[3]??m[4],m[1]!==undefined||m[2]!==undefined);
    start=m.index+m[0].length;
  }
  return out+legacyText(source.slice(start));
}
export function attachMathPreviews(root){
  for(const input of root.querySelectorAll('#answer, #correction, #guess')){
    const box=document.createElement('div');box.className='math-preview';box.setAttribute('aria-live','polite');
    input.insertAdjacentElement('afterend',box);
    const update=()=>{box.innerHTML=input.value.trim()?`<span>Xem trước:</span> ${formula(input.value)}`:'<span>Công thức sẽ hiện ở đây khi em nhập.</span>';};
    input.addEventListener('input',update);update();
  }
  for(const field of root.querySelectorAll('#working, #explanation, #counter-explain, .note-form textarea')){
    const details=document.createElement('details');details.className='math-writing-help';
    details.innerHTML='<summary>Viết và xem trước công thức</summary><p>Dùng \\( \\frac{1}{2} \\), \\( x^2 \\), \\( \\sqrt{9} \\) trong lời giải thích. Dùng \\[ ... \\] cho công thức riêng dòng.</p><div class="math-preview-text"></div>';
    field.insertAdjacentElement('afterend',details);
    const update=()=>{details.querySelector('.math-preview-text').innerHTML=richMath(field.value);};
    field.addEventListener('input',update);update();
  }
}
