from pathlib import Path
import re

p=Path('src/planning.js')
s=p.read_text()

# Remove buttons that navigated back to the deleted Areas screen.
s=re.sub(r"\$\{area==='facultad'\?'':btn\('Ver área Facultad','area',[\s\S]*?\)\}",'',s,count=1)
s=re.sub(r"\$\{area==='trabajo'\?'':btn\('Ver área Trabajo','area',[\s\S]*?\)\}",'',s,count=1)
s=re.sub(r"\$\{area==='ingles'\?'':btn\('Ver área Inglés','area',[\s\S]*?\)\}",'',s,count=1)
s=re.sub(r"\$\{area==='ingles'\?'':btn\('Abrir vocabulario','area',[\s\S]*?\)\}",'',s,count=1)

# Keep the stored context for compatibility, but stop presenting it as the Areas feature.
s=s.replace("select('Área','area',[['trabajo','Trabajo'],['facultad','Facultad'],['ingles','Inglés']],defaultArea)","select('Contexto','area',[['trabajo','Trabajo'],['facultad','Facultad'],['ingles','Inglés']],defaultArea)")
s=s.replace('Los bloques se guardan en el mismo calendario, con su área correcta.','Los bloques se guardan juntos en el mismo calendario.')

if 'Ver área ' in s or "'area','data-id=" in s or "select('Área','area'" in s:
    raise SystemExit('Remaining visible Areas navigation in planning.js')
p.write_text(s)
