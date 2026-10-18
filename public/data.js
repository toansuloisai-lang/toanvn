import {gradeSkills,gradeExercises} from './grade-content.js';
import {practiceMCQs} from './practice-mcq-bank.js';
export const skills = [
  { id: 'sign', name: 'Số âm & dấu', short: 'Số âm', color: '#6e71db', prerequisite: null },
  { id: 'distribute', name: 'Phép phân phối', short: 'Phân phối', color: '#338b76', prerequisite: 'sign' },
  { id: 'combine', name: 'Thu gọn biểu thức', short: 'Thu gọn', color: '#c7883d', prerequisite: 'distribute' },
  { id: 'equation', name: 'Phương trình bậc nhất', short: 'Phương trình', color: '#528bc2', prerequisite: 'combine' }
];
const groups = {
  sign: [
    ['Tính −3 + 7.', '−3 + 7 = −10', '4', 'Khác dấu: lấy giá trị tuyệt đối lớn trừ nhỏ, giữ dấu của số có giá trị tuyệt đối lớn.', ['khac dau', 'tru', 'am']],
    ['Tính −4 × (−3).', '−4 × (−3) = −12', '12', 'Tích hai số âm là số dương.', ['hai so am', 'duong', 'cung dau']],
    ['Tính 8 − (−5).', '8 − (−5) = 3', '13', 'Trừ một số âm là cộng với số đối của số đó.', ['so doi', 'cong', 'tru so am']],
    ['Tính −18 : 3.', '−18 : 3 = 6', '-6', 'Thương hai số khác dấu là số âm.', ['khac dau', 'am', 'thuong']],
    ['Tính (−2)³.', '(−2)³ = 8', '-8', 'Lũy thừa bậc lẻ của một số âm là số âm.', ['bac le', 'am', 'nhan']],
    ['Tính −5 − 9.', '−5 − 9 = 4', '-14', '−5 − 9 = −5 + (−9); cộng hai số âm bằng cách cộng hai giá trị tuyệt đối rồi đặt dấu âm.', ['hai so am', 'gia tri tuyet doi', 'am']]
  ],
  distribute: [
    ['Khai triển 3(x + 2).', '3(x + 2) = 3x + 2', '3x+6', 'Nhân 3 với từng số hạng trong ngoặc: 3·x + 3·2.', ['tung', 'moi', 'phan phoi']],
    ['Khai triển −2(x − 3).', '−2(x − 3) = −2x − 6', '-2x+6', 'Nhân −2 với từng số hạng; (−2)·(−3) = 6.', ['tung', 'am', 'phan phoi']],
    ['Bỏ ngoặc trong −(x + 4).', '−(x + 4) = −x + 4', '-x-4', 'Dấu trừ trước ngoặc làm đổi dấu tất cả số hạng trong ngoặc.', ['doi dau', 'tat ca', 'tru']],
    ['Khai triển 5(2x − 1).', '5(2x − 1) = 10x − 1', '10x-5', 'Nhân 5 với cả 2x và −1.', ['ca', 'tung', 'phan phoi']],
    ['Khai triển −3(2x + 5).', '−3(2x + 5) = −6x + 15', '-6x-15', '−3·2x = −6x và −3·5 = −15.', ['am', 'tung', 'phan phoi']],
    ['Bỏ ngoặc trong 4 − (2x − 3).', '4 − (2x − 3) = 4 − 2x − 3 = 1 − 2x', '7-2x', 'Đổi dấu cả hai số hạng sau dấu trừ: 4 − 2x + 3.', ['doi dau', 'ngoac', 'tru']]
  ],
  combine: [
    ['Thu gọn 3x + 2x.', '3x + 2x = 5x²', '5x', 'Cộng hệ số của các đơn thức đồng dạng, giữ nguyên phần biến.', ['he so', 'dong dang', 'phan bien']],
    ['Thu gọn 7x − 4x + 2.', '7x − 4x + 2 = 5x', '3x+2', 'Chỉ gộp các số hạng đồng dạng; hằng số 2 không gộp vào 3x.', ['dong dang', 'hang so', 'so hang']],
    ['Thu gọn 2x + 3 + x − 5.', '2x + 3 + x − 5 = 3x + 2', '3x-2', 'Gộp 2x + x = 3x và 3 − 5 = −2.', ['gom', 'gop', 'dong dang', 'am']],
    ['Thu gọn x + x + x.', 'x + x + x = x³', '3x', 'Phép cộng các đơn thức x là cộng hệ số, không phải nhân x với nhau.', ['cong', 'he so', 'dong dang']],
    ['Thu gọn 5x − (2x + 1).', '5x − (2x + 1) = 3x + 1', '3x-1', 'Bỏ ngoặc thành 5x − 2x − 1 rồi gộp các số hạng đồng dạng.', ['ngoac', 'doi dau', 'dong dang']],
    ['Thu gọn 2(x + 3) + x.', '2(x + 3) + x = 3x + 3', '3x+6', 'Phân phối trước: 2x + 6 + x, rồi gộp 2x + x.', ['phan phoi', 'ngoac', 'nhan']]
  ],
  equation: [
    ['Giải phương trình x + 5 = 12. Chỉ nhập giá trị x.', 'x = 12 + 5 = 17', '7', 'Trừ 5 ở cả hai vế; khi chuyển vế số hạng phải đổi dấu.', ['hai ve', 'doi dau', 'tru']],
    ['Giải phương trình 3x = 15. Chỉ nhập giá trị x.', 'x = 15 − 3 = 12', '5', 'Chia cả hai vế cho 3, không trừ 3.', ['chia', 'hai ve']],
    ['Giải phương trình −2x = 8. Chỉ nhập giá trị x.', 'x = 8 : 2 = 4', '-4', 'Chia cả hai vế cho −2; thương khác dấu là số âm.', ['chia', 'am', 'hai ve']],
    ['Giải phương trình 2(x − 3) = 8. Chỉ nhập giá trị x.', '2x − 3 = 8 → 2x = 11 → x = 5,5', '7', 'Phân phối đúng thành 2x − 6 = 8, rồi cộng 6 và chia 2 ở cả hai vế.', ['phan phoi', 'nhan', 'ngoac']],
    ['Giải phương trình 5x − 4 = 2x + 8. Chỉ nhập giá trị x.', '5x − 2x = 8 − 4 → x = 4/3', '4', 'Chuyển −4 sang vế phải thành +4; 3x = 12.', ['doi dau', 'chuyen ve', 'cong']],
    ['Giải phương trình x/3 + 2 = 5. Chỉ nhập giá trị x.', 'x = (5 − 2) : 3 = 1', '9', 'Trừ 2 ở hai vế rồi nhân hai vế với 3.', ['nhan', 'hai ve', 'tru']]
  ]
};
const legacyGrades={sign:[6,7],distribute:[7,8],combine:[7,8],equation:[8]};
skills.forEach(s=>s.grades=legacyGrades[s.id]);skills.push(...gradeSkills);
export const exercises = [...Object.entries(groups).flatMap(([skill, rows]) => rows.map((r, i) => ({ id: `${skill}-${i+1}`, skill, grades:legacyGrades[skill], prompt: r[0], wrong: r[1], answer: r[2], rule: r[3], keywords: r[4], level: i < 2 ? 'Khởi động' : i < 4 ? 'Luyện tập' : 'Vận dụng' }))),...gradeExercises,...practiceMCQs];

// Parse only a small arithmetic grammar. Never execute learner input as code.
export function evaluate(input, x = 0) {
  const s = String(input).toLowerCase().replace(/−/g, '-').replace(/×|·/g, '*').replace(/÷|:/g, '/').replace(/,/g, '.').replace(/\s/g, '').replace(/²/g, '^2').replace(/³/g, '^3').replace(/(\d|\))(?=x|\()/g, '$1*').replace(/x(?=\()/g, 'x*');
  if (!s || s.length > 100 || /[^0-9.x+*/^()\-]/.test(s)) return NaN;
  const tokens = s.match(/\d*\.?\d+|x|[+*/^()\-]/g) || [];
  if (tokens.join('') !== s) return NaN;
  let i = 0;
  function atom() { const t = tokens[i++]; if (t === '(') { const n = sum(); if (tokens[i++] !== ')') throw Error(); return n; } if (t === 'x') return x; if (t && /^\d*\.?\d+$/.test(t)) return Number(t); throw Error(); }
  function power() { const n = atom(); return tokens[i] === '^' ? (i++, n ** unary()) : n; }
  function unary() { if (tokens[i] === '-') { i++; return -unary(); } if (tokens[i] === '+') { i++; return unary(); } return power(); }
  function product() { let n = unary(); while (tokens[i] === '*' || tokens[i] === '/') { const op = tokens[i++], b = unary(); n = op === '*' ? n * b : n / b; } return n; }
  function sum() { let n = product(); while (tokens[i] === '+' || tokens[i] === '-') { const op = tokens[i++], b = product(); n = op === '+' ? n+b : n-b; } return n; }
  try { const n = sum(); return i === tokens.length && Number.isFinite(n) ? n : NaN; } catch { return NaN; }
}
export function checkAnswer(input, expected) {
  const expression = /x/i.test(expected);
  if (!expression && /x/i.test(input)) return false;
  if(!expression)return Math.abs(evaluate(input)-evaluate(expected))<1e-8;
  // Compare coefficients, not a handful of samples: a nonlinear polynomial can
  // match every sampled point while still being a different expression.
  const actual=affine(input),target=affine(expected);
  return !!actual&&!!target&&actual.every((v,i)=>Math.abs(v-target[i])<1e-8);
}
function affine(input){
 const s=String(input).toLowerCase().replace(/−/g,'-').replace(/×|·/g,'*').replace(/÷|:/g,'/').replace(/,/g,'.').replace(/\s/g,'').replace(/²/g,'^2').replace(/³/g,'^3').replace(/(\d|\))(?=x|\()/g,'$1*').replace(/x(?=\()/g,'x*');
 if(!s||s.length>100||/[^0-9.x+*/^()\-]/.test(s))return null;
 const tokens=s.match(/\d*\.?\d+|x|[+*/^()\-]/g)||[];if(tokens.join('')!==s)return null;let i=0;
 const valid=p=>{if(!p.every(Number.isFinite))throw Error();return p;};
 function atom(){const t=tokens[i++];if(t==='('){const n=sum();if(tokens[i++]!==')')throw Error();return n;}if(t==='x')return [1,0];if(t&&/^\d*\.?\d+$/.test(t))return [0,Number(t)];throw Error();}
 function power(){const a=atom();if(tokens[i]!=='^')return a;i++;const b=unary();if(b[0]||a[0]&&b[1]!==1)throw Error();return a[0]?a:valid([0,a[1]**b[1]]);}
 function unary(){if(tokens[i]==='-'){i++;return unary().map(v=>-v);}if(tokens[i]==='+'){i++;return unary();}return power();}
 function product(){let a=unary();while(['*','/'].includes(tokens[i])){const op=tokens[i++],b=unary();if(op==='/'){if(b[0]||!b[1])throw Error();a=valid(a.map(v=>v/b[1]));}else{if(a[0]&&b[0])throw Error();a=valid([a[0]*b[1]+b[0]*a[1],a[1]*b[1]]);}}return a;}
 function sum(){let a=product();while(['+','-'].includes(tokens[i])){const sign=tokens[i++]==='+'?1:-1,b=product();a=valid(a.map((v,j)=>v+sign*b[j]));}return a;}
 try{const answer=sum();return i===tokens.length?valid(answer):null;}catch{return null;}
}
