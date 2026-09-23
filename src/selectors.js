const text=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();

export const diaryEntries=rows=>rows.filter(isDiaryEntry);
export const achievements=rows=>rows.filter(r=>r?.achievement===true);
export const englishPractices=rows=>rows.filter(r=>r?.englishPractice===true);
export const bodyMeasurements=rows=>rows.filter(r=>r?.bodyLog===true);
export const workoutPhotos=rows=>rows.filter(r=>r?.workoutPhoto===true);
export const hydrationLogs=rows=>rows.filter(r=>r?.hydration===true);
export const subjectProjects=rows=>rows.filter(r=>r?.category==='subject');
export const personalProjects=rows=>rows.filter(r=>r?.category!=='subject');
export const laterTasks=rows=>rows.filter(r=>!r?.done&&!r?.due);

export function taskProjectOptions(rows,currentId=''){
 const personal=personalProjects(rows),current=rows.find(r=>r?.id===currentId);
 return current?.category==='subject'?[...personal,current]:personal;
}

export function isDiaryEntry(r){
 return !!r && !r.achievement && !r.workoutPhoto && !r.englishPractice && !r.bodyLog && !r.hydration;
}

export function isHydrationHabit(h){
 if(!h)return false;
 if(h.hydration===true)return true;
 const name=text(h.name),unit=text(h.unit);
 return h.area==='salud' && name.includes('agua') && (unit.includes('vaso')||unit==='ml'||unit.includes('litro'));
}

export function hydrationTargetMl(h){
 if(!h)return 2000;
 if(Number(h.targetMl)>0)return Number(h.targetMl);
 const unit=text(h.unit),target=Number(h.target)||0;
 if(unit.includes('vaso'))return Math.max(250,target*250);
 if(unit.includes('litro'))return Math.max(250,target*1000);
 if(unit==='ml'||unit.includes('mililitro'))return Math.max(250,target);
 return 2000;
}

export function dayModeAllowsHabit(h,mode){
 if(!h)return false;
 if(mode==='tranquilo'||mode==='descanso')return !!h.essential;
 // Trabajo y Facultad priorizan su área, pero no hacen desaparecer el resto del día.
 if(mode==='trabajo'||mode==='facultad')return true;
 if(mode==='finDeSemana')return h.area!=='trabajo'||!!h.essential;
 return true;
}

export function priorityAreaForDayMode(mode){
 if(mode==='trabajo')return 'trabajo';
 if(mode==='facultad')return 'facultad';
 return '';
}
