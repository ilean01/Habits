const RULES={
 project:{sourceKind:'task',field:'projectId',archivedField:'archivedProjectId',snapshotField:'archivedProjectName'},
 habit:{sourceKind:'log',field:'habitId',archivedField:'archivedHabitId',snapshotField:'habitName'},
 event:{sourceKind:'eventLog',field:'eventId',archivedField:'archivedEventId',snapshotField:'eventName'}
};

const live=records=>records.filter(r=>r&&!r.deleted);
const label=target=>String(target?.data?.name||target?.data?.title||'').trim();

export function areaDependents(areaId,records){
 return live(records).filter(r=>['habit','event','task','project'].includes(r.kind)&&r.data?.area===areaId);
}

export function detachReferences(target,records){
 const rule=RULES[target?.kind];
 if(!rule)return [];
 const snapshot=label(target);
 return live(records).filter(r=>r.kind===rule.sourceKind&&r.data?.[rule.field]===target.id).map(r=>({
  id:r.id,
  kind:r.kind,
  data:{...r.data,[rule.field]:'',[rule.archivedField]:target.id,...(snapshot&&!r.data?.[rule.snapshotField]?{[rule.snapshotField]:snapshot}:{})}
 }));
}

export function restoreReferences(target,records){
 const rule=RULES[target?.kind];
 if(!rule)return [];
 return live(records).filter(r=>r.kind===rule.sourceKind&&!r.data?.[rule.field]&&r.data?.[rule.archivedField]===target.id).map(r=>({
  id:r.id,
  kind:r.kind,
  data:{...r.data,[rule.field]:target.id,[rule.archivedField]:null}
 }));
}
