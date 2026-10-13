<?php
declare(strict_types=1);

/** Deliberately small, data-only formula grammar. No PHP or JavaScript evaluation. */
final class FeuilletFormula {
    private array $tokens=[]; private int $index=0; private int $steps=0;
    public function __construct(private string $source) {
        if(strlen($source)>4096)throw new RuntimeException('Formule trop longue (4096 caractères maximum).');
        $offset=0;$length=strlen($source);
        while($offset<$length){
            if(preg_match('/\G\s+/Au',$source,$m,0,$offset)){$offset+=strlen($m[0]);continue;}
            if(preg_match('/\G(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?/A',$source,$m,0,$offset)){$this->tokens[]=['number',(float)$m[0]];$offset+=strlen($m[0]);}
            elseif(preg_match('/\G"(?:[^"\\\\]|\\\\.)*"/Asu',$source,$m,0,$offset)){try{$value=json_decode($m[0],true,4,JSON_THROW_ON_ERROR);}catch(Throwable){throw new RuntimeException('Chaîne entre guillemets invalide.');}$this->tokens[]=['string',$value];$offset+=strlen($m[0]);}
            elseif(preg_match("/\\G'(?:[^'\\\\\\\\]|\\\\\\\\.)*'/Asu",$source,$m,0,$offset)){$value=str_replace(["\\'","\\\\"],["'","\\"],substr($m[0],1,-1));$this->tokens[]=['string',$value];$offset+=strlen($m[0]);}
            elseif(preg_match('/\G(?:==|!=|>=|<=|&&|\|\||[+*\/%^!<>()\-,])/A',$source,$m,0,$offset)){$this->tokens[]=[$m[0],$m[0]];$offset+=strlen($m[0]);}
            elseif(preg_match('/\G[A-Za-z_][A-Za-z_0-9]*/A',$source,$m,0,$offset)){$word=strtolower($m[0]);$this->tokens[]=match($word){'and'=>['&&','&&'],'or'=>['||','||'],'not'=>['!','!'],default=>['word',$word]};$offset+=strlen($m[0]);}
            else throw new RuntimeException('Symbole inconnu dans la formule.');
            if(count($this->tokens)>600)throw new RuntimeException('Formule trop complexe.');
        }$this->tokens[]=['end',null];
    }
    private function token(): array { return $this->tokens[$this->index]; }
    private function consume(string $type): array { $token=$this->token();if($token[0]!==$type)throw new RuntimeException('Syntaxe incorrecte : '.$type.' attendu.');$this->index++;return $token; }
    public function parse(): array { $tree=$this->expression(0,0);$this->consume('end');return $tree; }
    private function expression(int $minimum,int $depth): array {
        if($depth>32)throw new RuntimeException('Formule trop imbriquée.');$token=$this->token();$this->index++;
        if(in_array($token[0],['number','string'],true))$left=['literal',$token[1]];
        elseif($token[0]==='word'){
            if(in_array($token[1],['true','false','null'],true))$left=['literal',match($token[1]){'true'=>true,'false'=>false,default=>null}];
            else{$this->consume('(');$args=[];if($this->token()[0]!==')')do{$args[]=$this->expression(0,$depth+1);if($this->token()[0]!==',')break;$this->index++;}while(true);$this->consume(')');$left=['call',$token[1],$args];}
        }elseif($token[0]==='('){$left=$this->expression(0,$depth+1);$this->consume(')');}
        elseif(in_array($token[0],['-','+','!'],true))$left=['unary',$token[0],$this->expression(7,$depth+1)];
        else throw new RuntimeException('Valeur ou fonction attendue.');
        $precedence=['||'=>1,'&&'=>2,'=='=>3,'!='=>3,'>'=>4,'>='=>4,'<'=>4,'<='=>4,'+'=>5,'-'=>5,'*'=>6,'/'=>6,'%'=>6,'^'=>7];
        while(isset($precedence[$this->token()[0]])&&$precedence[$this->token()[0]]>=$minimum){$operator=$this->token()[0];$this->index++;$right=$this->expression($precedence[$operator]+($operator==='^'?0:1),$depth+1);$left=['binary',$operator,$left,$right];}
        return $left;
    }
    public function evaluate(callable $property): mixed { $this->steps=0;$value=$this->run($this->parse(),$property,0);if(is_float($value)&&!is_finite($value))throw new RuntimeException('Résultat numérique hors limites.');if(is_string($value)&&strlen($value)>100000)throw new RuntimeException('Résultat trop volumineux.');return $value; }
    public static function truthy(mixed $value): bool { return $value!==null&&$value!==false&&$value!==''&&$value!==[]&&$value!==0&&$value!==0.0; }
    private static function number(mixed $value): float { if(!is_int($value)&&!is_float($value))throw new RuntimeException('Une valeur numérique est nécessaire.');if(!is_finite((float)$value))throw new RuntimeException('Nombre hors limites.');return (float)$value; }
    private static function stringify(mixed $value): string { if($value===null)return '';if(is_bool($value))return $value?'true':'false';if(is_array($value))return implode(', ',array_map(self::stringify(...),$value));return (string)$value; }
    private static function flatten(array $arguments): array { $values=[];foreach($arguments as $argument){if(is_array($argument))$values=array_merge($values,$argument);else $values[]=$argument;}if(count($values)>5000)throw new RuntimeException('Trop de valeurs à agréger.');return $values; }
    private static function bounded_text(string $value): string { if(strlen($value)>100000)throw new RuntimeException('Résultat intermédiaire trop volumineux.');return $value; }
    private function run(array $node,callable $property,int $depth): mixed {
        if(++$this->steps>2000||$depth>40)throw new RuntimeException('Calcul trop complexe.');
        if($node[0]==='literal')return $node[1];
        if($node[0]==='unary'){$v=$this->run($node[2],$property,$depth+1);return match($node[1]){'!'=>!self::truthy($v),'-'=>-self::number($v),default=>self::number($v)};}
        if($node[0]==='binary'){
            $a=$this->run($node[2],$property,$depth+1);$operator=$node[1];if($operator==='&&'&&!self::truthy($a))return false;if($operator==='||'&&self::truthy($a))return true;$b=$this->run($node[3],$property,$depth+1);
            if(in_array($operator,['&&','||'],true))return self::truthy($b);
            if(in_array($operator,['==','!='],true)){$equal=(is_numeric($a)&&is_numeric($b))?((float)$a===(float)$b):$a===$b;return $operator==='=='?$equal:!$equal;}
            if(in_array($operator,['>','>=','<','<='],true)){if(!is_scalar($a)||!is_scalar($b))throw new RuntimeException('Comparaison impossible.');return match($operator){'>'=>$a>$b,'>='=>$a>=$b,'<'=>$a<$b,default=>$a<=$b};}
            if($operator==='+'&&(is_string($a)||is_string($b)))return self::bounded_text(self::stringify($a).self::stringify($b));
            $a=self::number($a);$b=self::number($b);if(in_array($operator,['/','%'],true)&&$b===0.0)throw new RuntimeException('Division par zéro.');
            $value=match($operator){'+'=>$a+$b,'-'=>$a-$b,'*'=>$a*$b,'/'=>$a/$b,'%'=>fmod($a,$b),'^'=>pow($a,$b),default=>throw new RuntimeException('Opérateur inconnu.')};if(!is_finite($value))throw new RuntimeException('Nombre hors limites.');return $value;
        }
        $function=$node[1];$trees=$node[2];
        if($function==='if'){if(count($trees)!==3)throw new RuntimeException('if attend 3 arguments.');return $this->run(self::truthy($this->run($trees[0],$property,$depth+1))?$trees[1]:$trees[2],$property,$depth+1);}
        $args=array_map(fn($tree)=>$this->run($tree,$property,$depth+1),$trees);
        if($function==='prop'){if(count($args)!==1||!is_string($args[0]))throw new RuntimeException('prop attend un nom de propriété.');return $property($args[0]);}
        if($function==='concat'){$result='';foreach($args as $argument)$result=self::bounded_text($result.self::stringify($argument));return $result;}
        if(in_array($function,['sum','avg','min','max'],true)){$values=array_map(self::number(...),self::flatten($args));if(!$values)return $function==='sum'?0:null;return match($function){'sum'=>array_sum($values),'avg'=>array_sum($values)/count($values),'min'=>min($values),default=>max($values)};}
        if($function==='count'){if(count($args)!==1)throw new RuntimeException('count attend un argument.');return is_array($args[0])?count($args[0]):(is_string($args[0])?mb_strlen($args[0]):($args[0]===null?0:1));}
        if($function==='empty'){if(count($args)!==1)throw new RuntimeException('empty attend un argument.');return !self::truthy($args[0]);}
        if($function==='contains'){if(count($args)!==2)throw new RuntimeException('contains attend 2 arguments.');return is_array($args[0])?in_array($args[1],$args[0],true):str_contains(self::stringify($args[0]),self::stringify($args[1]));}
        if(in_array($function,['round','abs','floor','ceil'],true)){if(count($args)<1||count($args)>($function==='round'?2:1))throw new RuntimeException('Nombre d’arguments invalide.');$v=self::number($args[0]);return match($function){'round'=>round($v,max(-6,min(6,(int)self::number($args[1]??0)))),'abs'=>abs($v),'floor'=>floor($v),default=>ceil($v)};}
        throw new RuntimeException('Fonction inconnue : '.$function.'.');
    }
}
