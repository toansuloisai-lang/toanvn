import {exercises as starterExercises} from './public/data.js';
import {libraryPracticeExercises} from './public/library-practice-bank.js';
const exercises=[...starterExercises,...libraryPracticeExercises];
import {asExercise} from './teacher-content.mjs';

export function historicalContentIds(db,id){
 const state=db.states[id];return new Set([...(state?.attempts||[]).map(a=>a.exerciseId),...(state?.assignments||[]).flatMap(a=>a.exerciseIds||[])]);
}
export function studentCatalog(db,id){
 const history=historicalContentIds(db,id);
 return [...exercises,...db.teacherContents.filter(c=>c.kind==='exercise'&&(history.has(c.id)||db.users.some(t=>t.id===c.teacherId&&t.role==='teacher'&&t.studentIds.includes(id)))).map(asExercise)];
}
export function teacherCatalog(db,user){return [...exercises,...db.teacherContents.filter(c=>c.kind==='exercise'&&c.teacherId===user.id).map(asExercise)];}
export const validDue=value=>typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value;
