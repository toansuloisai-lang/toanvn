import katex from 'katex';
export function validateMath(value,max=8000){
  if(typeof value!=='string'||value.length>max)throw Object.assign(Error('Nội dung vượt giới hạn hoặc không phải văn bản.'),{status:400});
  const pattern=/\$\$([\s\S]*?)\$\$|\\\[([\s\S]*?)\\\]|\\\(([\s\S]*?)\\\)|(?<!\\)\$([^$\n]+?)\$/g;
  const rest=value.replace(pattern,(_,a,b,c,d)=>{try{katex.renderToString(a??b??c??d,{throwOnError:true,trust:false,strict:code=>['unicodeTextInMathMode','unknownSymbol'].includes(code)?'ignore':'error',maxExpand:200,maxSize:20});}catch{throw Object.assign(Error('Công thức LaTeX chưa hợp lệ. Hãy kiểm tra phần xem trước.'),{status:400});}return '';});
  if(/\\[()[\]]|(?<!\\)\$/.test(rest))throw Object.assign(Error('Dấu bao công thức chưa khép kín. Dùng \\( ... \\).'),{status:400});
  return value.trim();
}
