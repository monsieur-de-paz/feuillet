#!/usr/bin/env python3
"""Install icons keep an opaque white frame and the mark inside the maskable safe zone."""
import json,math,pathlib,struct,unittest,zlib
ROOT=pathlib.Path(__file__).resolve().parents[1]
def rgba(path):
 data=path.read_bytes();assert data[:8]==b'\x89PNG\r\n\x1a\n';offset=8;compressed=b''
 while offset<len(data):
  length=struct.unpack('>I',data[offset:offset+4])[0];kind=data[offset+4:offset+8];part=data[offset+8:offset+8+length];offset+=length+12
  if kind==b'IHDR':w,h,depth,color,_,_,interlace=struct.unpack('>IIBBBBB',part);assert (depth,color,interlace)==(8,6,0)
  if kind==b'IDAT':compressed+=part
 raw=zlib.decompress(compressed);stride=w*4;prior=bytearray(stride);rows=[]
 def paeth(a,b,c):
  p=a+b-c;pa,pb,pc=abs(p-a),abs(p-b),abs(p-c)
  return a if pa<=pb and pa<=pc else b if pb<=pc else c
 for y in range(h):
  start=y*(stride+1);kind=raw[start];row=bytearray(raw[start+1:start+1+stride])
  for i in range(stride):
   a=row[i-4] if i>=4 else 0;b=prior[i];c=prior[i-4] if i>=4 else 0
   predictor=[0,a,b,(a+b)//2,paeth(a,b,c)][kind]
   row[i]=(row[i]+predictor)&255
  rows.append(row);prior=row
 return w,h,rows
class Icons(unittest.TestCase):
 def test_manifest_and_white_safe_frame(self):
  manifest=json.loads((ROOT/'public/manifest.webmanifest').read_text());icons=manifest['icons']
  self.assertTrue(any('maskable' in i.get('purpose','').split() for i in icons))
  self.assertEqual({i['sizes'] for i in icons},{'192x192','512x512'})
  for name,n in [('pwa-icon-192.png',192),('pwa-icon-512.png',512),('apple-touch-icon.png',180)]:
   w,h,rows=rgba(ROOT/'public'/name);self.assertEqual((w,h),(n,n));ink=0
   for y,row in enumerate(rows):
    for x in range(w):
     pixel=tuple(row[x*4:x*4+4]);self.assertEqual(pixel[3],255,'PWA icons must be opaque')
     if x<n*.12 or x>=n*.88 or y<n*.12 or y>=n*.88:self.assertEqual(pixel,(255,255,255,255),'White frame must surround the mark')
     if min(pixel[:3])<240:
      ink+=1;self.assertLessEqual(math.hypot(x+.5-n/2,y+.5-n/2),n*.4,'Android masking must not cut the mark')
   self.assertGreater(ink,n*n*.1)
  self.assertIn('href="apple-touch-icon.png"',(ROOT/'public/index.php').read_text())
if __name__=='__main__':unittest.main(verbosity=2)
