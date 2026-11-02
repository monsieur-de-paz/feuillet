<?php
declare(strict_types=1);

function thumbnail_url(string $id,int $size=640): string {
    return 'media.php?id='.rawurlencode($id).'&thumb='.(in_array($size,[96,320,640,1280],true)?$size:640);
}
/** Derivatives are private and always served after the source file's access check. */
function thumbnail_file(array $file,string $source,int $size): ?array {
    if(!in_array($size,[96,320,640,1280],true)||!str_starts_with($file['mime'],'image/')||!extension_loaded('gd'))return null;
    $info=@getimagesize($source);if(!$info)return null;
    [$width,$height]=$info;if(max($width,$height)<=$size&&filesize($source)<32768)return null;
    $webp=function_exists('imagewebp');$extension=$webp?'webp':'png';
    $key=hash('sha256','v1|'.$file['path'].'|'.filesize($source).'|'.filemtime($source).'|'.$size.'|'.$extension);
    $dir=storage().'/thumbnails';$target=$dir.'/'.$key.'.'.$extension;
    if(is_file($target))return [$target,$webp?'image/webp':'image/png'];
    // Decode only when GD can fit comfortably in the current PHP memory budget.
    $memory=ini_get('memory_limit');$limit=(int)$memory;$unit=strtolower(substr($memory,-1));if($unit==='g')$limit*=1073741824;elseif($unit==='m')$limit*=1048576;elseif($unit==='k')$limit*=1024;
    $estimate=$width*$height*12+$size*$size*8+16777216;
    if(filesize($source)>33554432||$width*$height>32000000||($limit>0&&memory_get_usage(true)+$estimate>$limit))return null;
    $image=@imagecreatefromstring(file_get_contents($source));if(!$image)return null;
    try{
        // JPEG orientation is honored in the reduced preview, as browsers do for originals.
        if($file['mime']==='image/jpeg'&&function_exists('exif_read_data')){
            $orientation=(int)(@exif_read_data($source)['Orientation']??1);
            if(in_array($orientation,[2,4,5,7],true))imageflip($image,in_array($orientation,[2,5,7],true)?IMG_FLIP_HORIZONTAL:IMG_FLIP_VERTICAL);
            $angle=match($orientation){3=>180,5,6=>-90,7,8=>90,default=>0};
            if($angle){$rotated=imagerotate($image,$angle,0);if($rotated){imagedestroy($image);$image=$rotated;}}
        }
        $width=imagesx($image);$height=imagesy($image);$scale=min(1,$size/max($width,$height));$w=max(1,(int)round($width*$scale));$h=max(1,(int)round($height*$scale));
        $small=imagecreatetruecolor($w,$h);imagealphablending($small,false);imagesavealpha($small,true);imagefill($small,0,0,imagecolorallocatealpha($small,0,0,0,127));
        try{
            imagecopyresampled($small,$image,0,0,0,0,$w,$h,$width,$height);
            if(!is_dir($dir)&&!@mkdir($dir,0700,true)&&!is_dir($dir))return null;
            $temporary=tempnam($dir,'thumb-');
            try{$ok=$webp?imagewebp($small,$temporary,78):imagepng($small,$temporary,7);if(!$ok||filesize($temporary)>=filesize($source))return null;chmod($temporary,0600);if(!rename($temporary,$target))return null;}finally{if(is_file($temporary))unlink($temporary);}
        }finally{imagedestroy($small);}
    }finally{imagedestroy($image);}
    return [$target,$webp?'image/webp':'image/png'];
}
