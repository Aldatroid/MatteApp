const fs=require('fs');
const path=require('path');
const sharp=require('C:/Users/Alexander/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const target=path.resolve(__dirname,'..');
const source=path.resolve(target,'..');
async function check(){
  const files=fs.readdirSync(source).filter(n=>/\.(png|jpg)$/.test(n)).concat(fs.readdirSync(path.join(source,'levels')).filter(n=>/\.(png|jpg)$/.test(n)).map(n=>'levels/'+n));
  const failures=[];
  const results=[];
  for(const name of files){
    const output=path.join(target,name);
    if(!fs.existsSync(output)){failures.push(name+': missing');continue;}
    const a=await sharp(path.join(source,name)).metadata();
    const b=await sharp(output).metadata();
    if(a.width!==b.width||a.height!==b.height) failures.push(name+': dimensions differ');
    if(a.format!==b.format) failures.push(name+': format differs');
    const stats=await sharp(output).stats();
    const alpha=b.hasAlpha?stats.channels.at(-1):null;
    if(a.hasAlpha && (!b.hasAlpha||alpha.min!==0||alpha.max<240)) failures.push(name+': transparent exterior or visible foreground missing');
    results.push({name,width:b.width,height:b.height,format:b.format,alpha:alpha?{min:alpha.min,max:alpha.max}:null});
  }
  const report={expected:files.length,found:results.length,failures,results};
  fs.writeFileSync(path.join(__dirname,'validation.json'),JSON.stringify(report,null,2));
  console.log(JSON.stringify({expected:files.length,found:results.length,failures},null,2));
  if(failures.length) process.exitCode=1;
}
check().catch(e=>{console.error(e);process.exit(1)});
