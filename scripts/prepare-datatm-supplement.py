"""Resumable source inventory/extraction. Never modifies application or live data."""
from pathlib import Path, PurePosixPath
import hashlib, json, re, sys, unicodedata, zipfile, shutil, faulthandler
import rarfile
from concurrent.futures import ThreadPoolExecutor

BASE=Path(__file__).resolve().parent.parent
ROOT=BASE/'datatm'
OUT=BASE/'private'/'datatm-supplement'
OUT.mkdir(parents=True,exist_ok=True)
rarfile.UNRAR_TOOL=r'C:\Program Files\WinRAR\UnRAR.exe'
shortened={}

def fold(s):
    return ''.join(c for c in unicodedata.normalize('NFD',s.lower().replace('đ','d')) if not unicodedata.combining(c))
def grade(name):
    s=fold(name)
    if re.search(r'(?:lop|toan)\s*7|^7\s',s):return 7
    if re.search(r'(?:lop|toan)\s*6|^6\s',s):return 6
    if re.search(r'(?:lop|toan)\s*8|^8\s|tn\s*8',s):return 8
    if re.search(r'vao\s*10|(?:lop|toan)\s*9',s):return 9
    return None
def digest(p):
    h=hashlib.sha256()
    with p.open('rb') as f:
        for b in iter(lambda:f.read(1024*1024),b''):h.update(b)
    return h.hexdigest()
def save(name,obj):
    target=OUT/name
    tmp=target.with_suffix('.tmp');tmp.write_text(json.dumps(obj,ensure_ascii=False,indent=2),encoding='utf-8');tmp.replace(target)
def safe(name,dest):
    name=name.replace('\\','/')
    parts=PurePosixPath(name)
    if parts.is_absolute() or any(p in ('..','') or ':' in p for p in parts.parts):raise ValueError('Unsafe archive path')
    target=(dest/Path(*parts.parts)).resolve()
    if not target.is_relative_to(dest.resolve()):raise ValueError('Path outside extraction directory')
    if len(str(target))>230:
        original=str(target.relative_to(BASE))
        suffix=target.suffix
        short=dest/'_long_paths'/(hashlib.sha256(name.encode('utf-8')).hexdigest()[:16]+'_'+target.stem[:60]+suffix)
        shortened[str(short.relative_to(BASE)).replace('\\','/')]=original
        return short
    return target
def archive(p):return zipfile.ZipFile(p) if p.suffix.lower()=='.zip' else rarfile.RarFile(p)

stage=sys.argv[1]
phase=int(sys.argv[2]) if len(sys.argv)>2 else 1
mapping_file=OUT/f'phase{phase}-shortened-paths.json'
if mapping_file.exists():shortened.update(json.loads(mapping_file.read_text(encoding='utf-8')))
if stage=='inventory':
    rows=[];seen={}
    for p in sorted(ROOT.iterdir()):
        if not p.is_file() or p.suffix.lower() not in ('.rar','.zip'):continue
        sha=digest(p);row={'source':str(p.relative_to(BASE)),'grade':grade(p.name),'bytes':p.stat().st_size,'sha256':sha,'phase':1 if grade(p.name)==7 else 2}
        if sha in seen:row['duplicateOf']=seen[sha]
        else:seen[sha]=row['source']
        try:
            with archive(p) as a:
                infos=a.infolist();row['entries']=len(infos);row['expandedBytes']=sum(i.file_size for i in infos)
                row['encrypted']=any(i.needs_password() if hasattr(i,'needs_password') else bool(i.flag_bits&1) for i in infos)
                for i in infos:safe(i.filename,ROOT/'bo-sung'/'check')
        except Exception as e:row['error']=str(e)
        rows.append(row)
    save('archives.json',rows)
    for n in [1,2]:
        rs=[r for r in rows if r['phase']==n]
        print(json.dumps({'phase':n,'archives':len(rs),'unique':sum(not r.get('duplicateOf') for r in rs),'bytes':sum(r['bytes'] for r in rs),'errors':[r for r in rs if r.get('error')]}),flush=True)
elif stage=='extract':
    rows=json.loads((OUT/'archives.json').read_text(encoding='utf-8'));results=[]
    for row in rows:
        if row['phase']!=phase or row.get('duplicateOf'):continue
        if row.get('error') or row.get('encrypted'):
            results.append({**row,'status':'blocked'});continue
        dest=ROOT/'bo-sung'/row['sha256'][:16]
        marker=dest/'.complete.json'
        if marker.exists():
            with archive(BASE/row['source']) as a:
                for i in a.infolist():safe(i.filename,dest)
            results.append(json.loads(marker.read_text(encoding='utf-8')));continue
        if shutil.disk_usage(ROOT).free<row['expandedBytes']+1024**3:raise RuntimeError('Not enough disk space')
        dest.mkdir(parents=True,exist_ok=True)
        try:
            with archive(BASE/row['source']) as a:
                for i in a.infolist():
                    target=safe(i.filename,dest)
                    if i.is_dir():target.mkdir(parents=True,exist_ok=True);continue
                    if hasattr(i,'is_symlink') and i.is_symlink():raise ValueError('Archive symlink rejected')
                    target.parent.mkdir(parents=True,exist_ok=True)
                    with a.open(i) as src,target.open('wb') as dst:shutil.copyfileobj(src,dst)
            result={**row,'directory':str(dest.relative_to(BASE)),'status':'extracted'}
            marker.write_text(json.dumps(result,ensure_ascii=False),encoding='utf-8')
            print(json.dumps({'source':row['source'],'status':'extracted'},ensure_ascii=False),flush=True)
        except Exception as e:
            result={**row,'directory':str(dest.relative_to(BASE)),'status':'error','error':str(e)}
            print(json.dumps({'source':row['source'],'status':'error','error':str(e)},ensure_ascii=False),flush=True)
        results.append(result)
        save(f'phase{phase}-extraction-progress.json',results)
    # Expand nested archives with the same path checks, bounded depth/volume and no links.
    nested_seen=set()
    for depth in range(8):
        nested=[]
        for result in results:
            if result['status']!='extracted':continue
            for p in (BASE/result['directory']).rglob('*'):
                if p.is_file() and p.suffix.lower() in ('.zip','.rar') and str(p) not in nested_seen:
                    nested.append((p,result))
        if not nested:break
        for source,parent in nested:
            nested_seen.add(str(source));legacy_dest=source.parent/(source.stem+'__expanded')
            dest=legacy_dest if (legacy_dest/'.nested-complete').exists() else BASE/parent['directory']/'_nested'/hashlib.sha256(str(source).encode('utf-8')).hexdigest()[:16]
            marker=dest/'.nested-complete'
            if marker.exists():
                with archive(source) as a:
                    for i in a.infolist():safe(i.filename,dest)
                continue
            try:
                with archive(source) as a:
                    infos=a.infolist();size=sum(i.file_size for i in infos)
                    if size>8*1024**3 or shutil.disk_usage(ROOT).free<size+1024**3:raise ValueError('Nested archive exceeds space limit')
                    dest.mkdir(parents=True,exist_ok=True)
                    for i in infos:
                        target=safe(i.filename,dest)
                        if i.is_dir():target.mkdir(parents=True,exist_ok=True);continue
                        if hasattr(i,'is_symlink') and i.is_symlink():raise ValueError('Archive symlink rejected')
                        target.parent.mkdir(parents=True,exist_ok=True)
                        with a.open(i) as src,target.open('wb') as dst:shutil.copyfileobj(src,dst)
                    marker.write_text('ok',encoding='ascii')
                print(json.dumps({'nested':str(source.relative_to(BASE)),'status':'extracted'},ensure_ascii=False),flush=True)
            except Exception as e:parent.setdefault('nestedErrors',[]).append({'source':str(source.relative_to(BASE)),'error':str(e)})
    files=[];seen={};sources=[]
    for result in results:
        if result['status']!='extracted':continue
        for p in (BASE/result['directory']).rglob('*'):
            if not p.is_file() or p.name.startswith('.') or p.name.startswith('~$'):continue
            sources.append((p,result))
    cache_file=OUT/f'phase{phase}-hash-cache.json'
    cache=json.loads(cache_file.read_text(encoding='utf-8')) if cache_file.exists() else {}
    def hash_source(pair):
        p,result=pair;k=str(p);stat=p.stat()
        cached=cache.get(k)
        if cached and cached['size']==stat.st_size and cached['mtime']==stat.st_mtime_ns:return p,result,cached['sha256']
        sha=digest(p);cache[k]={'size':stat.st_size,'mtime':stat.st_mtime_ns,'sha256':sha}
        return p,result,sha
    with ThreadPoolExecutor(max_workers=8) as pool:
        for index,(p,result,sha) in enumerate(pool.map(hash_source,sources)):
            if index%100==0:
                save(f'phase{phase}-hash-cache.json',dict(cache))
                print(json.dumps({'hashing':index,'files':len(sources)}),flush=True)
            g=grade(p.name)
            if not g:
                for part in reversed(p.relative_to(BASE/result['directory']).parts[:-1]):
                    g=grade(part)
                    if g:break
            g=g or result['grade']
            item={'source':str(p.relative_to(BASE)).replace('\\','/'),'archive':result['source'],'grade':g,'bytes':p.stat().st_size,'sha256':sha,'extension':p.suffix.lower()}
            if sha in seen:item['duplicateOf']=seen[sha]
            else:seen[sha]=item['source']
            files.append(item)
    save(f'phase{phase}-hash-cache.json',cache)
    save(f'phase{phase}-extraction.json',results);save(f'phase{phase}-files.json',files)
    save(f'phase{phase}-shortened-paths.json',shortened)
    faulthandler.cancel_dump_traceback_later()
    print(json.dumps({'phase':phase,'files':len(files),'unique':len(seen),'extensions':{ext:sum(f['extension']==ext for f in files) for ext in sorted(set(f['extension'] for f in files))},'errors':sum(r['status']!='extracted' for r in results)}),flush=True)
else:raise SystemExit('Use inventory or extract [1|2]')
