import { promises as fs } from "fs";
import path from "path";

const ROOT = "public/content";

function byFolderAware(a,b){
  const rx=/^([0-9]+)\./;
  const an=a.split("/").pop(), bn=b.split("/").pop();
  const aa=rx.exec(an), bb=rx.exec(bn);
  if(aa&&bb) return Number(aa[1])-Number(bb[1]) || a.localeCompare(b,undefined,{numeric:true});
  return a.localeCompare(b,undefined,{numeric:true});
}

async function walk(dir, base=""){
  const out=[];
  const entries=await fs.readdir(dir,{withFileTypes:true});
  for(const e of entries){
    if(e.name.startsWith(".")) continue;
    const abs=path.join(dir,e.name);
    const rel=path.posix.join(base, e.name.replace(/\s+/g," ")); // norm. Spaces
    if(e.isDirectory()){
      out.push(...await walk(abs, rel));
    }else if(e.isFile() && e.name.endsWith(".md")){
      out.push(("content/"+rel).replace(/\\/g,"/"));
    }
  }
  return out;
}

try{
  await fs.access(ROOT); // wirft, falls Ordner fehlt
  const files=(await walk(ROOT)).sort(byFolderAware);
  await fs.writeFile("public/index.json", JSON.stringify(files,null,2)+"\n","utf8");
  console.log(`index.json updated (${files.length} items)`);
}catch(e){
  if(e.code==="ENOENT"){
    console.error("public/content fehlt. Leere index.json geschrieben.");
    await fs.writeFile("public/index.json","[]\n","utf8");
  }else{
    console.error(e); process.exit(1);
  }
}
