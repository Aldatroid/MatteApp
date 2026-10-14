const fs=require('fs');
const path=require('path');
const sharp=require('C:/Users/Alexander/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const root=path.resolve(__dirname,'..');
const originals=path.resolve(root,'../..');
async function bounds(file){
 const {data,info}=await sharp(file).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 let left=info.width,top=info.height,right=-1,bottom=-1;
 for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++)if(data[(y*info.width+x)*4+3]>8){left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x);bottom=Math.max(bottom,y);}
 if(right<left)throw new Error('Empty image '+file);
 return {left,top,width:right-left+1,height:bottom-top+1};
}
async function main(){
 const records=JSON.parse(fs.readFileSync(path.join(__dirname,'generation.json'),'utf8'));
 for(const item of records){
  if(!item.source)throw new Error('Missing source '+item.name);
  const original=path.join(originals,item.name),target=path.join(root,item.name),m=await sharp(original).metadata();
  fs.mkdirSync(path.dirname(target),{recursive:true});
  if(item.transparent){
   const box=await bounds(item.source),dest=await bounds(original);
   const input=await sharp(item.source).extract(box).resize(dest.width,dest.height,{fit:'fill'}).png().toBuffer();
   await sharp({create:{width:m.width,height:m.height,channels:4,background:{r:0,g:0,b:0,alpha:0}}}).composite([{input,left:dest.left,top:dest.top}]).png().toFile(target);
  }else{
   let p=sharp(item.source).resize(m.width,m.height,{fit:'fill'}).flatten({background:'#10281e'});
   await (item.name.endsWith('.jpg')?p.jpeg({quality:93,mozjpeg:true}):p.png()).toFile(target);
  }
 }
 for(const size of [32,180,192])await sharp(path.join(root,'icon-512.png')).resize(size,size).png().toFile(path.join(root,`icon-${size}.png`));
 const blur=await sharp(path.join(originals,'bg_blur.jpg')).metadata();
 await sharp(path.join(root,'bg.jpg')).resize(blur.width,blur.height).blur(2).jpeg({quality:89,mozjpeg:true}).toFile(path.join(root,'bg_blur.jpg'));
 const files=fs.readdirSync(originals).filter(n=>/\.(png|jpg)$/.test(n)).concat(fs.readdirSync(path.join(originals,'levels')).filter(n=>/\.(png|jpg)$/.test(n)).map(n=>'levels/'+n));
 const results=[],failures=[];
 for(const name of files){
  const a=await sharp(path.join(originals,name)).metadata(),b=await sharp(path.join(root,name)).metadata();
  const stats=await sharp(path.join(root,name)).stats(),alpha=b.hasAlpha?stats.channels.at(-1):null;
  if(a.width!==b.width||a.height!==b.height||a.format!==b.format)failures.push(name+': dimensions or format');
  if(a.hasAlpha&&(!alpha||alpha.min!==0||alpha.max<240))failures.push(name+': transparency');
  results.push({name,width:b.width,height:b.height,format:b.format,alpha:alpha?{min:alpha.min,max:alpha.max}:null});
 }
 fs.writeFileSync(path.join(__dirname,'validation.json'),JSON.stringify({expected:files.length,found:results.length,failures,results},null,2));
 const cellW=360,cellH=230,cols=4,rows=Math.ceil(files.length/cols),layers=[];
 for(let i=0;i<files.length;i++){
  const thumb=await sharp(path.join(root,files[i])).resize(336,182,{fit:'inside'}).png().toBuffer(),m=await sharp(thumb).metadata();
  layers.push({input:thumb,left:(i%cols)*cellW+Math.round((cellW-m.width)/2),top:Math.floor(i/cols)*cellH+8+Math.round((182-m.height)/2)});
  const label=Buffer.from(`<svg width="360" height="32"><text x="12" y="24" fill="#f7edd7" font-size="17" font-family="Arial">${files[i]}</text></svg>`);
  layers.push({input:label,left:(i%cols)*cellW,top:Math.floor(i/cols)*cellH+190});
 }
 await sharp({create:{width:cols*cellW,height:rows*cellH,channels:3,background:'#26312e'}}).composite(layers).jpeg({quality:92}).toFile(path.join(__dirname,'overview.jpg'));
 console.log(JSON.stringify({expected:files.length,found:results.length,failures},null,2));
 if(failures.length)process.exitCode=1;
}
main().catch(e=>{console.error(e);process.exit(1)});
