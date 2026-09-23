const dayKey=(date=new Date())=>`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
const parseDay=s=>new Date(`${s}T12:00:00`);

export function effectiveDayMode(settings={},date=dayKey()){
 const override=settings.dayModeOverrides?.[date];
 if(override)return override;
 if(settings.dayModeDate===date)return settings.dayMode||'habitual';
 return settings.weekModes?.[parseDay(date).getDay()]||settings.dayMode||'habitual';
}
