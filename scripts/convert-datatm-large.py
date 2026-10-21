from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
import subprocess, json, hashlib
import pymupdf
BASE=Path(__file__).resolve().parent.parent
ROOT=BASE/'private/datatm-supplement'
rows=json.loads((ROOT/'phase2-documents.json').read_text(encoding='utf-8'))
large=[r for r in rows if r['status']=='oversize']
out=ROOT/'large-converted';out.mkdir(exist_ok=True)
program=BASE/'artifacts/tools/libreoffice/program/soffice.com'
def convert(pair):
    index,r=pair;source=BASE/r['source']
    if source.suffix.lower()=='.pdf':return r,source
    dest=out/r['sha256'];dest.mkdir(exist_ok=True)
    target=dest/(source.stem+'.pdf')
    if not target.exists():
        profile=(ROOT/f'lo-large-{index}').as_uri()
        result=subprocess.run([str(program),f'-env:UserInstallation={profile}','--headless','--convert-to','pdf','--outdir',str(dest),str(source)],capture_output=True,timeout=180)
        if result.returncode or not target.exists():raise RuntimeError('Large document PDF conversion failed: '+r['source'])
    return r,target
added=[];results=[]
def split(r,reader,start,end):
    writer=pymupdf.open();writer.insert_pdf(reader,from_page=start,to_page=end-1)
    for page in writer:page.clean_contents()
    data=writer.tobytes(garbage=4,deflate=True);writer.close()
    if len(data)>8*1024**2 and end-start>1:
        middle=(start+end)//2;split(r,reader,start,middle);split(r,reader,middle,end);return
    sha=hashlib.sha256(data).hexdigest();target=out/f"{r['sha256'][:16]}-pages-{start+1}-{end}.pdf"
    if len(data)>10*1024**2:raise RuntimeError('Single page remains over the application limit')
    target.write_bytes(data)
    added.append({'source':str(target.relative_to(BASE)).replace('\\','/'),'originalSource':r['source'],'originalSha256':r['sha256'],'grade':r['grade'],'archive':r['archive'],'extension':'.pdf','sha256':sha,'bytes':len(data),'converted':True,'pageRange':[start+1,end],'conversion':'PDF split by pages; original retained; review visual layout before publication'})
with ThreadPoolExecutor(max_workers=3) as pool:
    for r,pdf in pool.map(convert,enumerate(large)):
        reader=pymupdf.open(pdf)
        for start in range(0,len(reader),50):split(r,reader,start,min(start+50,len(reader)))
        results.append({'source':r['source'],'pages':len(reader),'status':'converted_and_split'})
        print(json.dumps(results[-1],ensure_ascii=False),flush=True)
file=ROOT/'phase2-files.json';files=json.loads(file.read_text(encoding='utf-8'));known={r['source'] for r in files}
files.extend(r for r in added if r['source'] not in known)
file.write_text(json.dumps(files,ensure_ascii=False,indent=2),encoding='utf-8')
(ROOT/'large-conversion.json').write_text(json.dumps(results,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({'largeSources':len(large),'pdfParts':len(added),'partsOverLimit':sum(r['bytes']>10*1024**2 for r in added)}),flush=True)
