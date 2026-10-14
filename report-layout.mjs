import {hasReportMath,richTokens,richLines,drawRichLines} from './report-math.mjs';
import {schoolName,schoolLogo} from './school-brand.mjs';
// PDF drawing primitives with measured cells and repeating table headers.
export function reportLayout(doc){
  const C={ink:'#20364C',navy:'#15374D',teal:'#147D86',line:'#CAD8E0',soft:'#F1F6F8',muted:'#607789',green:'#207258'};
  const left=44,width=doc.page.width-88,top=57,bottom=doc.page.height-61;
  const features={ccmp:false,liga:false};let y=top;
  const clean=value=>String(value??'').normalize('NFC');
  function measure(value,w,{size=9,bold=false}={}){doc.font(bold?'bold':'regular').fontSize(size);return hasReportMath(value)?richLines(doc,clean(value),w,size).reduce((n,l)=>n+l.height,0):doc.heightOfString(clean(value)||' ',{width:w,lineGap:2,features});}
  function write(value,x,at,w,{size=9,bold=false,color=C.ink,align='left'}={}){
    if(hasReportMath(value)){doc.font(bold?'bold':'regular').fontSize(size);drawRichLines(doc,richLines(doc,clean(value),w,size),x,at,w,{size,color,align,features});return;}
    doc.font(bold?'bold':'regular').fontSize(size).fillColor(color).text(clean(value),x,at,{width:w,lineGap:2,features,align});
  }
  function rect(x,at,w,h,fill=C.soft,stroke=C.line){doc.save().lineWidth(.65).rect(x,at,w,h).fillAndStroke(fill,stroke).restore();}
  function frame(){
    doc.save().lineWidth(.7).strokeColor(C.line).rect(28,27,doc.page.width-56,doc.page.height-54).stroke();
    doc.rect(28,27,doc.page.width-56,4).fill(C.teal).restore();
    const logo=schoolLogo();if(logo)doc.image(logo.content,left,33,{fit:[18,18]});
    write('THCS LẠC ĐẠO · HƯNG YÊN',left+(logo?24:0),36,220,{size:8,bold:true,color:C.teal});
    write('HỒ SƠ HỌC TẬP · DÀNH CHO PHỤ HUYNH',left+155,36,width-155,{size:7,color:C.muted,align:'right'});
  }
  function newPage(){doc.addPage();y=top;frame();}
  function ensure(height){if(y+height>bottom)newPage();}
  function gap(h=9){y+=h;}
  function brand(){ensure(85);const logo=schoolLogo();if(logo)doc.image(logo.content,left,y,{fit:[65,65]});const x=left+(logo?78:0);write(schoolName,x,y+8,width-(x-left),{size:14,bold:true,color:C.navy});write('Hồ sơ học tập · Math Lab',x,y+40,width-(x-left),{size:11,color:C.teal});y+=82;}
  function bars(items,{max=100}={}){for(const item of items){ensure(35);write(item.label,left,y,width-75,{size:9,bold:true});write(item.detail||String(item.value),left+width-75,y,75,{size:9,align:'right'});y+=16;rect(left,y,width,7,'#EAF0F4','#EAF0F4');if(item.value>0)rect(left,y,width*Math.min(1,item.value/max),7,item.color||C.teal,item.color||C.teal);y+=17;}}
  function columns(items){if(!items.length)return;for(let offset=0;offset<items.length;offset+=8){const batch=items.slice(offset,offset+8),h=110,w=width/batch.length;ensure(160);batch.forEach((item,i)=>{const x=left+i*w,bh=h*Math.max(0,Math.min(10,item.value))/10;rect(x+12,y+h-bh,w-24,bh||1,C.teal,C.teal);write(item.value+'/10',x,y+h-bh-17,w,{size:9,bold:true,align:'center'});write(item.label,x,y+h+7,w,{size:8,align:'center'});});y+=160;}}
  function section(number,title){ensure(75);gap(7);rect(left,y,width,27,C.navy,C.navy);write(String(number).padStart(2,'0'),left+9,y+6,25,{size:10,bold:true,color:'#6EE0CD'});write(title,left+40,y+5,width-50,{size:11,bold:true,color:'#FFFFFF'});y+=35;}
  function note(value){
    // Notes are table cells as well, so long notes paginate without overflow.
    table([],[[value]],[1],{size:8,fill:'#F5F8FA',color:C.muted,padding:8});gap(5);
  }
  function title(value,subtitle,status,approved){
    const h=measure(value,width-28,{size:20,bold:true})+53;
    ensure(h+20);rect(left,y,width,h,C.navy,C.navy);
    write(value,left+14,y+12,width-28,{size:20,bold:true,color:'#FFFFFF'});
    write(subtitle,left+14,y+h-29,width-28,{size:9,color:'#C8E8E8'});y+=h+8;
    rect(left,y,width,25,approved?'#EAF6EF':'#FFF5E5',approved?'#B8D8C3':'#E7D0A9');
    write(status,left+10,y+6,width-20,{size:8,bold:true,color:approved?C.green:'#94641D'});y+=34;
  }
  function cards(items){
    const spacing=8,w=(width-spacing*(items.length-1))/items.length;
    const h=72;ensure(h);
    items.forEach((item,i)=>{const x=left+i*(w+spacing);rect(x,y,w,h,'#F1F8F8','#BFD8DC');write(item.label,x+9,y+9,w-18,{size:8,color:C.muted});write(item.value,x+9,y+26,w-18,{size:18,bold:true,color:C.teal});if(item.detail)write(item.detail,x+9,y+53,w-18,{size:7,color:C.muted});});y+=h+9;
  }
  // Find a cell prefix that fits a page; never truncate a long explanation.
  function prefix(value,w,h,style){
    if(!value)return '';
    if(measure(value,w,style)<=h)return value;
    if(hasReportMath(value)){let end=0;for(const token of richTokens(value)){if(measure(value.slice(0,token.end),w,style)>h)break;end=token.end;}return value.slice(0,end||richTokens(value)[0]?.end||1);}
    let lo=1,hi=value.length;
    while(lo<hi){const mid=Math.ceil((lo+hi)/2);if(measure(value.slice(0,mid),w,style)<=h)lo=mid;else hi=mid-1;}
    let cut=lo;const space=value.lastIndexOf(' ',cut);if(space>cut*.6)cut=space+1;
    if(cut>0&&/[\uD800-\uDBFF]/.test(value[cut-1]))cut--;
    return value.slice(0,Math.max(1,cut));
  }
  function table(headers,rows,ratios,{size=9,padding=7,fill,color=C.ink,labelColumn=false}={}){
    const sum=ratios.reduce((a,b)=>a+b,0),widths=ratios.map(v=>v/sum*width);
    const headerHeight=headers.length?Math.max(...headers.map((v,i)=>measure(v,widths[i]-padding*2,{size:8,bold:true})))+padding*2:0;
    function header(){if(!headers.length)return;let x=left;headers.forEach((v,i)=>{rect(x,y,widths[i],headerHeight,'#E5F0F2');write(v,x+padding,y+padding,widths[i]-padding*2,{size:8,bold:true,color:C.navy});x+=widths[i];});y+=headerHeight;}
    ensure(headerHeight+35);header();
    rows.forEach((row,index)=>{
      let remaining=row.map(clean),continued=false;
      while(remaining.some(v=>v.length)){
        const fullHeight=Math.max(...remaining.map((v,i)=>measure(v,widths[i]-padding*2,{size,bold:labelColumn&&i===0})))+padding*2;
        const maxPage=bottom-top-headerHeight;
        if(y+Math.min(fullHeight,maxPage)>bottom&&y>top+headerHeight+.1){newPage();header();}
        const room=bottom-y-padding*2;
        const parts=remaining.map((v,i)=>prefix(v,widths[i]-padding*2,room,{size,bold:labelColumn&&i===0}));
        const height=Math.max(...parts.map((v,i)=>measure(v,widths[i]-padding*2,{size,bold:labelColumn&&i===0})))+padding*2;
        let x=left;
        parts.forEach((v,i)=>{
          const background=labelColumn&&i===0?'#ECF3F6':fill||(index%2?'#F8FAFC':'#FFFFFF');
          rect(x,y,widths[i],height,background);
          write(v||((continued&&i===0)?'(tiếp)':''),x+padding,y+padding,widths[i]-padding*2,{size,bold:labelColumn&&i===0,color});
          x+=widths[i];remaining[i]=remaining[i].slice(v.length);
        });
        y+=height;continued=true;
        if(remaining.some(v=>v.length)){newPage();header();}
      }
    });
    gap(9);
  }
  function keyValues(rows){table([],rows.map(([a,b])=>[a,b||'Chưa có dữ liệu']),[.28,.72],{labelColumn:true});}
  function image(bytes,label){const asset=doc.openImage(bytes),scale=Math.min(width/asset.width,410/asset.height,1),w=asset.width*scale,h=asset.height*scale;ensure(h+32);write(label,left,y,width,{size:8,bold:true});y+=20;doc.image(asset,left+(width-w)/2,y,{width:w,height:h});y+=h+12;}
  function footer(status){
    const pages=doc.bufferedPageRange();
    for(let p=pages.start;p<pages.start+pages.count;p++){
      doc.switchToPage(p);const at=doc.page.height-43;
      const previousBottom=doc.page.margins.bottom;doc.page.margins.bottom=0;
      doc.save().strokeColor(C.line).lineWidth(.6).moveTo(left,at-7).lineTo(left+width,at-7).stroke().restore();
      write(`Math Lab · ${status}`,left,at,width-90,{size:7,color:C.muted});
      write(`Trang ${p+1} / ${pages.count}`,left+width-85,at,85,{size:7,color:C.muted,align:'right'});
      doc.page.margins.bottom=previousBottom;
    }
  }
  frame();
  return {newPage,gap,section,note,title,cards,table,keyValues,image,footer,brand,bars,columns};
}
