export function validAssessmentDue(value){return value===''||typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value;}
export const dueTime=value=>value?Date.parse(value+'T23:59:59+07:00'):Infinity;
