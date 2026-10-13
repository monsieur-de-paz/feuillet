<?php
declare(strict_types=1);
/** Equivalent to frontend/src/theme-colors.ts, tested against the same fixtures. */
function color_luminance(string $hex): float {
    $values=[];foreach([1,3,5] as $i){$c=hexdec(substr($hex,$i,2))/255;$values[]=$c<=0.04045?$c/12.92:(($c+0.055)/1.055)**2.4;}return $values[0]*0.2126+$values[1]*0.7152+$values[2]*0.0722;
}
function color_contrast(string $a,string $b): float {$x=color_luminance($a);$y=color_luminance($b);return (max($x,$y)+0.05)/(min($x,$y)+0.05);}
function color_hex(array $rgb): string {return '#'.implode('',array_map(fn($c)=>str_pad(strtoupper(dechex((int)floor(max(0,min(1,$c))*255+0.5))),2,'0',STR_PAD_LEFT),$rgb));}
function color_hsl(string $hex): array {
    [$r,$g,$b]=array_map(fn($i)=>hexdec(substr($hex,$i,2))/255,[1,3,5]);$max=max($r,$g,$b);$min=min($r,$g,$b);$d=$max-$min;$l=($max+$min)/2;if($d==0)return [0,0,$l];$s=$d/(1-abs(2*$l-1));$h=$max==$r?(($g-$b)/$d+($g<$b?6:0)):($max==$g?($b-$r)/$d+2:($r-$g)/$d+4);return [$h/6,$s,$l];
}
function color_from_hsl(float $h,float $s,float $l): string {
    $c=(1-abs(2*$l-1))*$s;$t=$h*6;$x=$c*(1-abs(fmod($t,2)-1));$m=$l-$c/2;$rgb=$t<1?[$c,$x,0]:($t<2?[$x,$c,0]:($t<3?[0,$c,$x]:($t<4?[0,$x,$c]:($t<5?[$x,0,$c]:[$c,0,$x]))));return color_hex(array_map(fn($v)=>$v+$m,$rgb));
}
function color_mix(string $a,string $b,float $weight): string {return color_hex(array_map(fn($i)=>hexdec(substr($a,$i,2))/255*$weight+hexdec(substr($b,$i,2))/255*(1-$weight),[1,3,5]));}
function adaptive_accent(string $accent,string $mode,string $background): string {
    $original=strtoupper($accent);if($mode==='light')return $original;$surfaces=$mode==='oled'?[$background,'#000000','#080808','#121212']:[$background,'#17191D','#202329','#2A2E35'];$minimum=fn($c)=>min(...[...array_map(fn($bg)=>color_contrast($c,$bg),$surfaces),color_contrast($c,color_mix($c,$mode==='oled'?'#000000':'#17191D',0.22))]);if($minimum($original)>=4.5)return $original;
    [$h,$s,$l]=color_hsl($original);$goal=$minimum('#FFFFFF')>=$minimum('#000000')?1:0;$failing=$l;$passing=$goal;
    for($i=0;$i<24;$i++){$middle=($failing+$passing)/2;if($minimum(color_from_hsl($h,$s,$middle))>=4.55)$passing=$middle;else $failing=$middle;}return color_from_hsl($h,$s,$passing);
}
function accent_foreground(string $accent): string {return color_contrast($accent,'#FFFFFF')>=color_contrast($accent,'#000000')?'#FFFFFF':'#000000';}
function accent_hover(string $accent): string {$target=accent_foreground($accent)==='#000000'?1:0;return color_hex(array_map(fn($i)=>hexdec(substr($accent,$i,2))/255*0.92+$target*0.08,[1,3,5]));}
