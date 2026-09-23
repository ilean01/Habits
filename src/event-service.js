import {findEventConflicts,conflictMessage} from './schedule-conflicts.js';

export function validateEventTiming(candidate){
 if(!candidate)return candidate;
 if(candidate.end&&!candidate.time)throw new Error('Indicá una hora inicial.');
 if(candidate.end&&candidate.end<=candidate.time)throw new Error('La hora final debe ser posterior a la inicial.');
 if(candidate.until&&candidate.until<candidate.date)throw new Error('La fecha final no puede ser anterior al inicio.');
 return candidate;
}

export function assessEventConflicts(candidate,events,{ignoreId='',days=180,occurrenceDate=''}={}){
 validateEventTiming(candidate);
 const checked=occurrenceDate?{...candidate,date:occurrenceDate,repeat:'none',until:''}:candidate;
 const conflicts=findEventConflicts(checked,events,{ignoreId,days});
 return {candidate:checked,conflicts,message:conflictMessage(conflicts)};
}

export function authorizeEventSave(candidate,events,{ignoreId='',days=180,occurrenceDate='',confirmConflict}={}){
 const assessment=assessEventConflicts(candidate,events,{ignoreId,days,occurrenceDate});
 if(!assessment.conflicts.length)return {...assessment,allowed:true};
 const allowed=typeof confirmConflict==='function'&&!!confirmConflict(assessment.message,assessment.conflicts);
 return {...assessment,allowed};
}
