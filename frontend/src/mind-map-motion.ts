import { useLayoutEffect, useRef, useState } from "react";
import type { Bubble } from "./mind-map-model";
type Item = { id: string; opacity: number; phase: string };

// Visibility is interpolated from the current frame, including when a fold is
// reversed mid-flight. Closing nodes remain mounted until they reach zero.
export function useMindMapPresence(nodes: Bubble[], visible: Bubble[]) {
  const desired = visible.map(n => n.id).join("|");
  const registry = useRef(new Map(nodes.map(n => [n.id, n])));
  for (const node of nodes) registry.current.set(node.id, node);
  const [present, setPresent] = useState<Item[]>(() => visible.map(n => ({ id: n.id, opacity: 1, phase: "steady" })));
  const visual = useRef(present);
  visual.current = present;
  useLayoutEffect(() => {
    const next = new Set(visible.map(n => n.id));
    const previous = visual.current;
    const starts: Item[] = [
      ...visible.map(n => {
        const old = previous.find(item=>item.id===n.id);
        return { id:n.id, opacity:old?.opacity ?? 0, phase:old ? "steady" : "enter" };
      }),
      ...previous.filter(n=>!next.has(n.id)).map(n=>({...n,phase:"exit"})),
    ];
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      const end = visible.map(n=>({id:n.id,opacity:1,phase:"steady"}));
      visual.current=end; setPresent(end); return;
    }
    let frame = 0;
    const at=performance.now();
    const step=(now:number)=>{
      const t=Math.min(1,(now-at)/360), ease=1-Math.pow(1-t,3);
      const result=starts.map(item=>({...item,opacity:item.opacity+((next.has(item.id)?1:0)-item.opacity)*ease}))
        .filter(item=>t<1||next.has(item.id));
      visual.current=result;setPresent(result);
      if(t<1)frame=requestAnimationFrame(step);
      else for (const id of registry.current.keys()) if(!nodes.some(n=>n.id===id)) registry.current.delete(id);
    };
    frame=requestAnimationFrame(step);
    return()=>cancelAnimationFrame(frame);
  },[desired]);
  return present.flatMap(item=>{
    const node=registry.current.get(item.id);
    return node?[{...node,phase:item.phase,presence:item.opacity}]:[];
  });
}
