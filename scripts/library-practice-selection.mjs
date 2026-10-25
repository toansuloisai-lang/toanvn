// Select the displayed format without deleting alternatives used by old links/history.
// Every verified source remains represented. A source with both formats may fill
// the single extra slot needed when the number of sources is odd.
export function balancedLibraryListing(exercises){
 const ids=[],summary=[];
 for(const grade of [6,7,8,9]){
  const rows=exercises.filter(e=>e.grades.includes(grade)),groups=new Map();
  for(const e of rows){const group=groups.get(e.sourceQuestionId)||[];group.push(e);groups.set(e.sourceQuestionId,group);}
  const onlyMcq=[],onlyEssay=[],flexible=[];
  for(const group of groups.values()){
   const mcq=group.find(e=>e.type==='mcq'),essay=group.find(e=>e.type==='essay');
   if(mcq&&essay)flexible.push({mcq,essay});else if(mcq)onlyMcq.push(mcq);else if(essay)onlyEssay.push(essay);else throw Error('Source has no supported format');
  }
  const target=Math.max(Math.ceil(groups.size/2),onlyMcq.length,onlyEssay.length);
  if(onlyMcq.length+flexible.length<target||onlyEssay.length+flexible.length<target)throw Error('Cannot balance grade '+grade+' while retaining every source');
  const chosen=new Set([...onlyMcq,...onlyEssay].map(e=>e.id));
  let mcqCount=onlyMcq.length,essayCount=onlyEssay.length;
  for(const pair of flexible){
   const type=mcqCount<target?'mcq':'essay';
   chosen.add(pair[type].id);if(type==='mcq')mcqCount++;else essayCount++;
  }
  for(const pair of flexible){
   if(mcqCount<target&&!chosen.has(pair.mcq.id)){chosen.add(pair.mcq.id);mcqCount++;}
   if(essayCount<target&&!chosen.has(pair.essay.id)){chosen.add(pair.essay.id);essayCount++;}
  }
  if(mcqCount!==target||essayCount!==target)throw Error('Incomplete balanced selection');
  ids.push(...chosen);summary.push({grade,uniqueQuestions:groups.size,mcq:mcqCount,essay:essayCount,listed:chosen.size,neededFor601:Math.max(0,601-groups.size)});
 }
 return {ids,summary};
}
