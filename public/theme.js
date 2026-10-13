(()=>{
 const key='feuillet.theme';let baseStyle=document.body.getAttribute('style')||'',baseMode=document.body.dataset.baseMode||'light';
 const preference=()=>{try{const v=localStorage.getItem(key);return ['light','dark','oled'].includes(v)?v:null}catch{return null}};
 function apply(){
  document.body.setAttribute('style',baseStyle);const value=preference(),mode=value||baseMode;
  if(value&&value!==baseMode){const dark=mode!=='light',oled=mode==='oled',vars={'--page-background':dark?(oled?'#000000':'#111318'):'#ffffff','--page-text':dark?'#f3f4f6':'#37352f','--surface':dark?(oled?'#000000':'#17191d'):'#ffffff','--surface-muted':dark?(oled?'#080808':'#202329'):'#f7f8f4','--surface-soft':dark?'#2a2e35':'#eef0eb','--ink':dark?'#f3f4f6':'#37352f','--muted':dark?'#afb3bd':'#818778','--line':dark?'#373a42':'#e4e6df'};Object.entries(vars).forEach(([k,v])=>document.body.style.setProperty(k,v));document.body.style.background=vars['--page-background'];document.body.style.color=vars['--page-text'];}
  document.body.style.colorScheme=mode==='light'?'light':'dark';document.documentElement.style.background=document.body.style.background;document.body.dataset.theme=mode;
  document.querySelectorAll('[data-theme-main]').forEach(b=>{b.setAttribute('aria-label',mode==='light'?'Activer le mode sombre':'Activer le mode clair');b.title=mode==='light'?'Mode sombre':'Mode clair';b.querySelector('[data-theme-symbol]').textContent=mode==='light'?'☾':'☀'});
  document.querySelectorAll('[data-theme-value]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.themeValue===mode)));
 }
 document.addEventListener('click',event=>{const main=event.target.closest('[data-theme-main]'),option=event.target.closest('[data-theme-value]');if(!main&&!option)return;const value=main?(document.body.dataset.theme==='light'?'dark':'light'):option.dataset.themeValue;try{if(value==='inherit')localStorage.removeItem(key);else localStorage.setItem(key,value)}catch{}option?.closest('details')?.removeAttribute('open');apply()});
 window.addEventListener('storage',event=>{if(event.key===key)apply()});window.FeuilletReaderTheme={setBase(style,mode){baseStyle=style;baseMode=mode;apply()}};apply();
})();
