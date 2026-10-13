import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {resolve} from 'node:path';
import {adaptiveAccent,contrast,accentForeground,accentHover,mixColor} from '../../frontend/src/theme-colors';
const palette=['#38795d','#2563eb','#0891b2','#7c3aed','#db2777','#dc2626','#ea580c','#ca8a04','#65a30d','#0d9488','#475569','#a16207','#6366f1','#be185d','#9333ea','#16a34a','#112233','#000000','#FFFFFF','#111111','#FF0000','#FFFF00','#00FF00','#0000FF'];
const fixtures=[];
for(const color of palette){
 assert.equal(adaptiveAccent(color,'light','#FFFFFF'),color.toUpperCase());
 assert.ok(contrast(color,accentForeground(color))>=4.5);assert.ok(contrast(accentHover(color),accentForeground(color))>=4.5);
 for(const mode of ['dark','oled']){
  const bg=mode==='oled'?'#000000':'#17191D';const result=adaptiveAccent(color,mode,bg);
  for(const surface of mode==='oled'?[bg,'#080808','#121212']:[bg,'#202329','#2A2E35'])assert.ok(contrast(result,surface)>=4.5,`${color} ${mode} ${result} against ${surface}`);
  assert.ok(contrast(result,mixColor(result,mode==='oled'?'#000000':'#17191D',0.22))>=4.5);
  const foreground=accentForeground(result);assert.ok(contrast(result,foreground)>=4.5);assert.ok(contrast(accentHover(result),foreground)>=4.5);
  fixtures.push({color,mode,bg,accent:result,foreground,hover:accentHover(result)});
 }
}
const source=`require ${JSON.stringify(resolve('app/theme-colors.php'))}; $cases=json_decode(stream_get_contents(STDIN),true);foreach($cases as &$c){$a=adaptive_accent($c['color'],$c['mode'],$c['bg']);$c['accent']=$a;$c['foreground']=accent_foreground($a);$c['hover']=accent_hover($a);}echo json_encode($cases);`;
const result=spawnSync(process.env.FEUILLET_TEST_PHP || 'php',['-r',source],{input:JSON.stringify(fixtures),encoding:'utf8'});assert.equal(result.status,0,result.stderr);assert.deepEqual(JSON.parse(result.stdout),fixtures);
assert.equal(adaptiveAccent('#112233','dark','#17191D'),adaptiveAccent('#112233','dark','#17191D'));
console.log('Accent themes: 24 colors, light/dark/OLED contrast, filled buttons and exact PHP/JS parity passed');
