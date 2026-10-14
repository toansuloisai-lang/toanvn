import {mathjax} from 'mathjax-full/js/mathjax.js';
import {TeX} from 'mathjax-full/js/input/tex.js';
import {SVG} from 'mathjax-full/js/output/svg.js';
import {liteAdaptor} from 'mathjax-full/js/adaptors/liteAdaptor.js';
import {RegisterHTMLHandler} from 'mathjax-full/js/handlers/html.js';
import 'mathjax-full/js/input/tex/ams/AmsConfiguration.js';
import SVGtoPDF from 'svg-to-pdfkit';
const adaptor=liteAdaptor();RegisterHTMLHandler(adaptor);
const engine=mathjax.document('',{InputJax:new TeX({packages:['base','ams'],maxBuffer:8000,maxMacros:200}),OutputJax:new SVG({fontCache:'none'})});
const cache=new Map();
const pattern=/\$\$([\s\S]*?)\$\$|\\\[([\s\S]*?)\\\]|\\\(([\s\S]*?)\\\)|(?<!\\)\$([^$\n]+?)\$/g;
export const hasReportMath=value=>/\\[([]|\$/.test(String(value));
export function richTokens(value){
  const source=String(value),out=[];let at=0;
  const text=(s,offset)=>{for(const m of s.matchAll(/\n|[^\S\n]+|[^\s]+/g))out.push({text:m[0],end:offset+m.index+m[0].length,newline:m[0]==='\n'});};
  for(const m of source.matchAll(pattern)){text(source.slice(at,m.index),at);out.push({tex:m[1]??m[2]??m[3]??m[4],end:m.index+m[0].length});at=m.index+m[0].length;}text(source.slice(at),at);return out;
}
function formula(tex,size,maxWidth){
  let data=cache.get(tex);
  if(!data){const node=engine.convert(tex,{display:false}),svg=adaptor.firstChild(node),raw=adaptor.outerHTML(svg);const box=adaptor.getAttribute(svg,'viewBox')?.split(/\s+/).map(Number);if(!box||box.some(v=>!Number.isFinite(v)))throw Error('Invalid math SVG');data={raw,w:box[2]/1000,h:box[3]/1000};if(cache.size>2000)cache.clear();cache.set(tex,data);}
  size*=1.18;
  const scale=Math.min(1,maxWidth/(data.w*size),240/(data.h*size)),w=data.w*size*scale,h=data.h*size*scale;
  // SVG-to-PDFKit otherwise interprets MathJax's root ex units using its own
  // font metrics, making the painted formula larger than our measured cell.
  const svg=data.raw.replace(/\bwidth="[^"]*"/,`width="${w}"`).replace(/\bheight="[^"]*"/,`height="${h}"`);
  return {svg,w,h};
}
export function richLines(doc,value,width,size){
  const lines=[];let row={parts:[],width:0,height:size*1.3+2};
  const flush=()=>{lines.push(row);row={parts:[],width:0,height:size*1.3+2};};
  for(const token of richTokens(value)){
    if(token.newline){flush();continue;}
    let part;if(token.tex!==undefined){try{part=formula(token.tex,size,width);}catch{part={text:'[Công thức chưa hợp lệ]',w:doc.widthOfString('[Công thức chưa hợp lệ]'),h:size*1.3};}}
    else part={text:token.text,w:doc.widthOfString(token.text),h:size*1.3};
    if(part.text?.trim()===''&&!row.parts.length)continue;
    if(part.w>width&&part.text){for(const char of part.text){const w=doc.widthOfString(char);if(row.width+w>width&&row.parts.length)flush();row.parts.push({text:char,w,h:size*1.3});row.width+=w;}continue;}
    if(row.width+part.w>width&&row.parts.length)flush();
    if(part.text?.trim()===''&&!row.parts.length)continue;
    row.parts.push(part);row.width+=part.w;row.height=Math.max(row.height,part.h+4);
  }
  if(row.parts.length||!lines.length)flush();return lines;
}
export function drawRichLines(doc,lines,x,y,width,{size=9,color='#20364C',align='left',features}={}){
  for(const row of lines){let at=x+(align==='right'?width-row.width:align==='center'?(width-row.width)/2:0);
    for(const part of row.parts){if(part.svg){doc.save();SVGtoPDF(doc,part.svg,at,y+(row.height-part.h)/2,{width:part.w,height:part.h,assumePt:true,fontCallback:()=>doc._registeredFonts?.regular?'regular':'Helvetica'});doc.restore();}else doc.fillColor(color).fontSize(size).text(part.text,at,y+(row.height-size*1.3)/2,{lineBreak:false,features});at+=part.w;}
    y+=row.height;
  }
}
