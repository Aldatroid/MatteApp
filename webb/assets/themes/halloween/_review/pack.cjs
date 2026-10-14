const fs = require('fs');
const path = require('path');
const sharp = require('C:/Users/Alexander/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const root = path.resolve(__dirname, '..');
const originals = path.resolve(root, '..');
async function alphaBounds(file) {
  const {data, info}=await sharp(file).ensureAlpha().raw().toBuffer({resolveWithObject:true});
  let left=info.width, top=info.height, right=-1, bottom=-1;
  for(let y=0;y<info.height;y++) for(let x=0;x<info.width;x++) {
    if(data[(y*info.width+x)*info.channels+info.channels-1]>8) {
      left=Math.min(left,x);top=Math.min(top,y);right=Math.max(right,x);bottom=Math.max(bottom,y);
    }
  }
  return {left,top,width:right-left+1,height:bottom-top+1};
}
async function main() {
  const records = JSON.parse(fs.readFileSync(path.join(__dirname, 'generation.json'), 'utf8'));
  for (const item of records) {
    if (!item.source) continue;
    const target = path.join(root, item.name);
    if (fs.existsSync(target)) continue;
    const meta = await sharp(path.join(originals, item.name)).metadata();
    fs.mkdirSync(path.dirname(target), {recursive:true});
    let image = sharp(item.source).resize(meta.width, meta.height, {fit:'fill'});
    if (item.name.endsWith('.jpg')) image = image.flatten({background:'#181125'}).jpeg({quality:92, mozjpeg:true});
    else image = image.png({compressionLevel:9});
    await image.toFile(target);
    console.log(item.name + ' ' + meta.width + 'x' + meta.height);
  }
  // Restore the source canvas padding of wide UI strips before resizing.
  for(const name of ['topbar.png','header.png','hintbar.png']) {
    const item=records.find(r=>r.name===name);
    if(!item?.source) continue;
    const meta=await sharp(path.join(originals,name)).metadata();
    const sourceBox=await alphaBounds(item.source);
    const targetBox=await alphaBounds(path.join(originals,name));
    const content=await sharp(item.source).extract(sourceBox).resize(targetBox.width,targetBox.height,{fit:'fill'}).png().toBuffer();
    await sharp({create:{width:meta.width,height:meta.height,channels:4,background:{r:0,g:0,b:0,alpha:0}}})
      .composite([{input:content,left:targetBox.left,top:targetBox.top}]).png().toFile(path.join(root,name));
    console.log(name+' padding restored');
  }
  const iconSource = path.join(root,'icon-512.png');
  if(fs.existsSync(iconSource)) for(const size of [32,180,192]) {
    const target = path.join(root,`icon-${size}.png`);
    if(!fs.existsSync(target)) await sharp(iconSource).resize(size,size).png().toFile(target);
  }
  const bgSource = path.join(root,'bg.jpg');
  const bgBlur = path.join(root,'bg_blur.jpg');
  if(fs.existsSync(bgSource) && !fs.existsSync(bgBlur)) await sharp(bgSource).resize(960,720).blur(2).jpeg({quality:86,mozjpeg:true}).toFile(bgBlur);
}
main().catch(e=>{console.error(e);process.exit(1)});
