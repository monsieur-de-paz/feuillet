import { Extension } from '@tiptap/core';
import { Plugin } from '@tiptap/pm/state';
import type { Node as PMNode } from '@tiptap/pm/model';
import type { EditorView } from '@tiptap/pm/view';

type Item = {node:PMNode;dom:HTMLElement;rect:DOMRect;pos:number};
/** Layout animation only. Never writes to a document or interferes with editor selection. */
export const BlockMotion = Extension.create({
  name:'feuilletBlockMotion',
  addProseMirrorPlugins() {
    return [new Plugin({view(view) {
      const reduced=matchMedia('(prefers-reduced-motion: reduce)');
      let frame=0,dead=false;
      const animations=new Set<Animation>();
      function capture(editor:EditorView):Item[] {
        const items:Item[]=[];
        editor.state.doc.descendants((node,pos,parent)=>{
          if(items.length>=100)return false;
          if(['table','codeBlock'].includes(parent?.type.name||''))return false;
          if(node.isBlock && node.type.spec.group?.split(' ').includes('block')) {
            const dom=editor.nodeDOM(pos);
            if(dom instanceof HTMLElement) {
              const rect=dom.getBoundingClientRect();
              if(rect.height>0&&rect.bottom>0&&rect.top<innerHeight)items.push({node,dom,rect,pos});
            }
          }
          return !['table','codeBlock'].includes(node.type.name);
        });
        return items;
      }
      let before=capture(view);
      function animate(el:HTMLElement,keys:Keyframe[],duration=220) {
        if(!el.animate)return;
        const animation=el.animate(keys,{duration,easing:'cubic-bezier(.2,.8,.2,1)'});
        animations.add(animation);animation.finished.catch(()=>{}).finally(()=>animations.delete(animation));
      }
      function cancel() {animations.forEach(a=>a.cancel());animations.clear();}
      const preference=()=>{if(reduced.matches)cancel();};
      reduced.addEventListener('change',preference);
      const resize=new ResizeObserver(()=>{if(!frame&&!dead)before=capture(view);});
      resize.observe(view.dom);
      return {
        update(next,previous) {
          if(next.state.doc===previous.doc)return;
          if(frame)cancelAnimationFrame(frame);
          frame=requestAnimationFrame(()=>{
            frame=0;if(dead)return;
            const after=capture(next);
            if(reduced.matches||document.hidden||document.body.classList.contains('block-dragging')) {before=after;return;}
            const old=new Map(before.map((item,index)=>[item.node,{...item,index}]));
            const structural=before.length!==after.length || after.some((item,index)=>{
              const prior=old.get(item.node);
              return prior ? prior.index!==index : before[index]?.node.type!==item.node.type;
            });
            if(structural) {
              cancel();
              const moving:HTMLElement[]=[];
              for(const item of after) {
                if(moving.some(parent=>parent.contains(item.dom)))continue;
                const prior=old.get(item.node);
                if(prior) {
                  const dx=prior.rect.left-item.rect.left,dy=prior.rect.top-item.rect.top;
                  if(Math.abs(dx)+Math.abs(dy)>2) {
                    if(Math.abs(dx)+Math.abs(dy)<160)animate(item.dom,[{translate:`${dx}px ${dy}px`},{translate:'0 0'}]);
                    else animate(item.dom,[{translate:'0 6px'},{translate:'0 0'}]);
                    moving.push(item.dom);
                  }
                } else if(item.node.isTextblock||item.node.isAtom) {
                  animate(item.dom,[{translate:'0 5px'},{translate:'0 0'}]);moving.push(item.dom);
                }
              }
            }
            before=after;
          });
        },
        destroy(){dead=true;cancelAnimationFrame(frame);resize.disconnect();reduced.removeEventListener('change',preference);cancel();},
      };
    }})];
  },
});
