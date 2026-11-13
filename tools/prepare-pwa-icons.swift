import AppKit
let root = CommandLine.arguments[1]
guard let logo = NSImage(contentsOfFile: root + "/public/feuillet-logo.png") else { fatalError("Source icon missing") }
for size in [180,192,512] {
  let n = CGFloat(size)
  guard let rep = NSBitmapImageRep(bitmapDataPlanes:nil,pixelsWide:size,pixelsHigh:size,bitsPerSample:8,samplesPerPixel:4,hasAlpha:true,isPlanar:false,colorSpaceName:.deviceRGB,bytesPerRow:size*4,bitsPerPixel:32), let context=NSGraphicsContext(bitmapImageRep:rep) else { fatalError("Bitmap allocation failed") }
  NSGraphicsContext.saveGraphicsState()
  NSGraphicsContext.current=context
  NSColor.white.setFill()
  NSRect(x:0,y:0,width:n,height:n).fill()
  context.imageInterpolation = .high
  logo.draw(in:NSRect(x:n*0.12,y:n*0.12,width:n*0.76,height:n*0.76),from:.zero,operation:.sourceOver,fraction:1)
  NSGraphicsContext.restoreGraphicsState()
  guard let data=rep.representation(using:.png,properties:[:]) else { fatalError("PNG encoding failed") }
  let name=size==180 ? "apple-touch-icon.png" : "pwa-icon-\(size).png"
  try data.write(to: URL(fileURLWithPath:root+"/public/"+name))
}
