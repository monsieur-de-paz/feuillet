<?php
declare(strict_types=1);
/** Bounded, text-only RTF reader: embedded objects and hidden destinations are ignored. */
function rtf_document(string $source): array {
    if(!preg_match('/^\s*\{\\\\rtf[0-9]/',$source))fail('Le fichier ne contient pas un document RTF valide.');
    if(!mb_check_encoding($source,'UTF-8'))$source=mb_convert_encoding($source,'UTF-8','Windows-1252');
    $state=['hidden'=>false,'skip'=>false,'bold'=>false,'italic'=>false,'underline'=>false,'strike'=>false,'uc'=>1,'level'=>null];$stack=[];$blocks=[];$inline=[];$fallback=0;$pending=null;$tokens=0;
    $append=function(string $text)use(&$inline,&$state){if($text===''||$state['skip']||$state['hidden'])return;$marks=[];foreach(['bold','italic','underline','strike'] as $mark)if($state[$mark])$marks[]=['type'=>$mark];$last=count($inline)-1;if($last>=0&&($inline[$last]['type']??'')==='text'&&($inline[$last]['marks']??[])===$marks)$inline[$last]['text'].=$text;else{$n=['type'=>'text','text'=>$text];if($marks)$n['marks']=$marks;$inline[]=$n;}};
    $flush=function()use(&$blocks,&$inline,&$state){$node=['type'=>$state['level']===null?'paragraph':'heading'];if($state['level']!==null)$node['attrs']=['level'=>$state['level']];if($inline)$node['content']=$inline;$blocks[]=$node;$inline=[];};
    $length=strlen($source);
    for($i=0;$i<$length;$i++){
        if(++$tokens>300000)fail('Document RTF trop complexe.');$c=$source[$i];
        if($c==='{'){if(count($stack)>=64)fail('Document RTF trop imbriqué.');$stack[]=$state;continue;}
        if($c==='}'){if(!$stack)fail('Structure RTF invalide.');$state=array_pop($stack);continue;}
        if($c==="\r"||$c==="\n")continue;
        if($c!=='\\'){if($fallback>0){$fallback--;continue;}$append($c);continue;}
        if(++$i>=$length)break;$c=$source[$i];
        if(in_array($c,['\\','{','}'],true)){if($fallback>0)$fallback--;else $append($c);continue;}
        if($c==="'"){if($i+2>=$length||!ctype_xdigit(substr($source,$i+1,2)))fail('Échappement RTF invalide.');$byte=hex2bin(substr($source,$i+1,2));$i+=2;if($fallback>0)$fallback--;else $append(mb_convert_encoding($byte,'UTF-8','Windows-1252'));continue;}
        if($c==='*'){$state['skip']=true;continue;}
        if($c==='~'){if($fallback>0)$fallback--;else $append("\u{00a0}");continue;}
        if($c==='-'||$c==='_'){if($fallback>0)$fallback--;else $append($c==='_'?"\u{2011}":"\u{00ad}");continue;}
        if(!ctype_alpha($c))continue;
        $word=$c;while($i+1<$length&&ctype_alpha($source[$i+1]))$word.=$source[++$i];$number='';if($i+1<$length&&$source[$i+1]==='-')$number.=$source[++$i];while($i+1<$length&&ctype_digit($source[$i+1]))$number.=$source[++$i];$value=$number===''?null:(int)$number;if($i+1<$length&&$source[$i+1]===' ')$i++;
        if($word==='bin'){$bytes=max(0,$value??0);if($bytes>$length-$i-1)fail('Objet RTF invalide.');$i+=$bytes;continue;}
        if(in_array($word,['fonttbl','colortbl','stylesheet','info','pict','object','filetbl','datastore','themedata','header','footer','fldinst','xmlopen','xmlattrname','xmlattrvalue'],true)){$state['skip']=true;continue;}
        if($state['skip'])continue;
        if($word==='v'){$state['hidden']=$value!==0;continue;}
        if($word==='uc'){$state['uc']=max(0,min(16,$value??1));continue;}
        if($word==='u'){$unit=($value??0)&65535;if($unit>=0xD800&&$unit<=0xDBFF)$pending=$unit;elseif($unit>=0xDC00&&$unit<=0xDFFF&&$pending!==null){$append(mb_convert_encoding(pack('vv',$pending,$unit),'UTF-8','UTF-16LE'));$pending=null;}else{$pending=null;$append(mb_chr($unit,'UTF-8'));}$fallback=$state['uc'];continue;}
        if(in_array($word,['b','i','ul','strike'],true)){$state[['b'=>'bold','i'=>'italic','ul'=>'underline','strike'=>'strike'][$word]]=$value!==0;continue;}
        if($word==='ulnone'){$state['underline']=false;continue;}
        if($word==='plain'){foreach(['bold','italic','underline','strike'] as $k)$state[$k]=false;continue;}
        if($word==='pard'){$state['level']=null;continue;}
        if($word==='outlinelevel'){$state['level']=$value!==null&&$value>=0&&$value<=2?$value+1:null;continue;}
        if($word==='par'){$flush();continue;}
        if($word==='line'){$inline[]=['type'=>'hardBreak'];continue;}
        if($word==='tab'){$append("\t");continue;}
        $symbols=['emdash'=>"—",'endash'=>"–",'lquote'=>"‘",'rquote'=>"’",'ldblquote'=>"“",'rdblquote'=>"”",'bullet'=>"•"];
        if(isset($symbols[$word]))$append($symbols[$word]);
    }
    if($stack)fail('Document RTF incomplet.');if($inline)$flush();
    return ['type'=>'doc','content'=>$blocks?:[['type'=>'paragraph']]];
}
function plain_document(string $text): array {
    if(str_starts_with($text,"\xff\xfe"))$text=mb_convert_encoding(substr($text,2),'UTF-8','UTF-16LE');
    elseif(str_starts_with($text,"\xfe\xff"))$text=mb_convert_encoding(substr($text,2),'UTF-8','UTF-16BE');
    elseif(str_starts_with($text,"\xef\xbb\xbf"))$text=substr($text,3);
    if(!mb_check_encoding($text,'UTF-8'))fail('Le fichier texte doit être en UTF-8 ou UTF-16.');
    $paragraphs=preg_split('/\n[\t ]*\n/u',str_replace(["\r\n","\r"],"\n",$text));$blocks=[];
    foreach($paragraphs as $part){$inline=[];foreach(explode("\n",$part) as $i=>$line){if($i)$inline[]=['type'=>'hardBreak'];if($line!=='')$inline[]=['type'=>'text','text'=>$line];}$blocks[]=['type'=>'paragraph','content'=>$inline];}
    return ['type'=>'doc','content'=>$blocks?:[['type'=>'paragraph']]];
}
function import_document(): array {
    $file=$_FILES['file']??null;if(!$file||($file['error']??1)!==UPLOAD_ERR_OK)fail('Document manquant ou trop volumineux.',413);
    if(filesize($file['tmp_name'])>2097152)fail('Choisis un document de moins de 2 Mo.',413);
    $extension=strtolower(pathinfo($file['name'],PATHINFO_EXTENSION));
    if(in_array($extension,['md','markdown'],true)){$_FILES['file']['name']=pathinfo($file['name'],PATHINFO_FILENAME).'.md';return import_markdown();}
    $text=file_get_contents($file['tmp_name']);
    $doc=match($extension){'txt'=>plain_document($text),'rtf'=>rtf_document($text),default=>fail('Formats disponibles : .txt, .md, .markdown et .rtf.')};
    return save_page(['title'=>pathinfo($file['name'],PATHINFO_FILENAME),'content'=>$doc,'space_id'=>$_POST['space_id']??null]);
}
