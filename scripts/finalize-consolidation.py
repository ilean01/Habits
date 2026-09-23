from pathlib import Path
p=Path(__file__).resolve().parents[1]/'src/main.js'
s=p.read_text()
s=s.replace("import {diaryEntries,personalProjects,laterTasks,isDiaryEntry,isHydrationHabit,dayModeAllowsHabit} from './selectors.js';","import {diaryEntries,personalProjects,laterTasks,isDiaryEntry,taskProjectOptions,dayModeAllowsHabit} from './selectors.js';")
s=s.replace("const today=dayKey(),hs=rec('habit').sort((a,b)=>(a.order||0)-(b.order||0)),logs=rec('log'),stats=dayStats(hs,logs,today),name=", "const today=dayKey(),hs=rec('habit').sort((a,b)=>(a.order||0)-(b.order||0)),logs=rec('log'),name=")
old="${select('Proyecto','projectId',[['','Sin proyecto'],...personalProjects(rec('project')).map(p=>[p.id,p.name])],r.projectId||'')}"
new="${select('Proyecto','projectId',[['','Sin proyecto'],...taskProjectOptions(rec('project'),r.projectId).map(p=>[p.id,p.name])],r.projectId||'')}"
if old not in s: raise SystemExit('No encontré selector de proyecto de tarea')
s=s.replace(old,new,1)
p.write_text(s)
print('Ajustes finales aplicados')
