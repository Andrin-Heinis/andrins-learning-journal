import {promises as fs} from "fs";
import path from "path";

const ROOT="content";
async function listFiles(dir){
  const out=[];
  async function walk(b){
    const entries=await fs.readdir(b,{withFileTypes:true});
    for(const e of entries){
      const p=path.join(b,e.name);
      if(e.isDirectory())await walk(p);
      else if(e.isFile()&&e.name.endsWith(".md")){
        out.push(p.replace(/\\/g,"/").replace(/^content\//,""));
      }
    }
  }
  await walk(dir);
  return out.sort((a,b)=>{
    const rx=/^([0-9]+)\./;
    const an=a.split("/").pop(),bn=b.split("/").pop();
    const aa=rx.exec(an),bb=rx.exec(bn);
    if(aa&&bb)return Number(aa[1])-Number(bb[1])||a.localeCompare(b,undefined,{numeric:true});
    return a.localeCompare(b,undefined,{numeric:true});
  });
}
const files=await listFiles(ROOT);
await fs.writeFile(path.join(ROOT,"index.json"),JSON.stringify(files,null,2));
console.log("index.json updated:",files.length,"items");
