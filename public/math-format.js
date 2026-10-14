import {plainToTex} from './math.js';
// Only recognize arithmetic expressions with an operator, never whole prose words.
export function formatMathText(value){
  const text=String(value??''),explicit=/\$\$[\s\S]*?\$\$|\\\[[\s\S]*?\\\]|\\\([\s\S]*?\\\)|(?<!\\)\$[^$\n]+?\$/g;
  const atom=String.raw`(?:\d+(?:[.,]\d+)?(?:[a-zA-Z](?![\p{L}]))?(?:[²³])?|[a-zA-Z](?![\p{L}])(?:[²³])?|\([^()\n]{1,80}\))`;
  const candidate=new RegExp(String.raw`(?<![\p{L}\p{N}\\])${atom}(?:\s*[+\-−*/÷×^=<>≤≥≠]\s*${atom})+(?![\p{L}\p{N}])`,'gu');
  const convert=source=>source.replace(candidate,s=>{if(/^\d{4}-\d{2}-\d{2}$/.test(s)||s.length>400)return s;try{return '\\('+plainToTex(s)+'\\)';}catch{return s;}});
  let result='',at=0;for(const m of text.matchAll(explicit)){result+=convert(text.slice(at,m.index))+m[0];at=m.index+m[0].length;}return result+convert(text.slice(at));
}
