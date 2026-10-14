# Klipper ut element ur asset-arket till PNG med genomskinlig bakgrund.
# Användning: powershell -File tools\cut.ps1  (läser tools\elements.csv)
param(
  [string]$Sheet = (Join-Path $PSScriptRoot '..\Dinosaur Adventure Game UI Asset Sheet.png'),
  [string]$List = (Join-Path $PSScriptRoot 'elements.csv'),
  [string]$Out = (Join-Path $PSScriptRoot '..\webb\assets'),
  [double]$Scale = 1,     # koordinaterna i listan gäller originalarket; multipliceras med detta för ett uppskalat ark
  [double]$OutScale = 1   # skala utklippen efteråt (t.ex. 0.5 från ett 4x-ark ger 2x-bilder)
)
Add-Type -AssemblyName System.Drawing
Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @'
using System; using System.Drawing; using System.Drawing.Imaging; using System.Collections.Generic;
public static class Cutter {
  static double Dist(byte[] p, int i, double[] bg) { double dr = p[i+2]-bg[0], dg = p[i+1]-bg[1], db = p[i]-bg[2]; return Math.Sqrt(dr*dr+dg*dg+db*db); }
  // mode: flood = ta bort bakgrund som hänger ihop med kanten (mjuk övergång t0..t1); circle = cirkelmask (cx, cy, r relativt utklippet)
  public static string Cut(Bitmap src, string dst, int x, int y, int w, int h, string mode, double t0, double t1, double cx, double cy, double r, string fixedBg, double outScale) {
    x = Math.Max(0, x); y = Math.Max(0, y); w = Math.Min(w, src.Width - x); h = Math.Min(h, src.Height - y);
    var rect = new Rectangle(x, y, w, h);
    var bd = src.LockBits(rect, ImageLockMode.ReadOnly, PixelFormat.Format24bppRgb);
    byte[] rgb = new byte[bd.Stride * h]; System.Runtime.InteropServices.Marshal.Copy(bd.Scan0, rgb, 0, rgb.Length); int st = bd.Stride; src.UnlockBits(bd);
    byte[] px = new byte[w*h*3]; for (int j=0;j<h;j++) Array.Copy(rgb, j*st, px, j*w*3, w*3);
    // bakgrundsfärg = median av kantpixlarna
    var rs = new List<int>(); var gs = new List<int>(); var bs = new List<int>();
    for (int i=0;i<w;i++) foreach (int j in new[]{0,h-1}) { int k=(j*w+i)*3; bs.Add(px[k]); gs.Add(px[k+1]); rs.Add(px[k+2]); }
    for (int j=0;j<h;j++) foreach (int i in new[]{0,w-1}) { int k=(j*w+i)*3; bs.Add(px[k]); gs.Add(px[k+1]); rs.Add(px[k+2]); }
    rs.Sort(); gs.Sort(); bs.Sort(); double[] bg = { rs[rs.Count/2], gs[gs.Count/2], bs[bs.Count/2] };
    if (!string.IsNullOrEmpty(fixedBg)) { var f = fixedBg.Split(';'); bg = new double[] { double.Parse(f[0]), double.Parse(f[1]), double.Parse(f[2]) }; }
    double[] a = new double[w*h]; for (int i=0;i<a.Length;i++) a[i]=1;
    if (mode == "flood") {
      bool[] seen = new bool[w*h]; var q = new Queue<int>();
      for (int i=0;i<w;i++){ q.Enqueue(i); q.Enqueue((h-1)*w+i); } for (int j=0;j<h;j++){ q.Enqueue(j*w); q.Enqueue(j*w+w-1); }
      // r > 0 = max djup (px från utklippets kant) som bakgrunden får tas bort, så att den inte läcker in i ramens mitt
      while (q.Count>0) { int k=q.Dequeue(); if (seen[k]) continue; double d = Dist(px, k*3, bg); if (d >= t1) continue;
        if (r > 0) { int ii=k%w, jj=k/w; if (Math.Min(Math.Min(ii, jj), Math.Min(w-1-ii, h-1-jj)) > r) continue; }
        seen[k]=true;
        a[k] = d <= t0 ? 0 : (d - t0) / (t1 - t0);
        int i=k%w, j=k/w; if(i>0)q.Enqueue(k-1); if(i<w-1)q.Enqueue(k+1); if(j>0)q.Enqueue(k-w); if(j<h-1)q.Enqueue(k+w); }
    } else if (mode == "dark") {
      // behåll mörka pixlar (t.ex. fotspår på guld): alfa efter ljushet
      for (int k=0;k<w*h;k++) { double lum = 0.3*px[k*3+2] + 0.59*px[k*3+1] + 0.11*px[k*3]; a[k] = Math.Max(0, Math.Min(1, (t1 - lum) / (t1 - t0))); }
    } else if (mode == "circle") {
      for (int j=0;j<h;j++) for (int i=0;i<w;i++) { double d = Math.Sqrt((i+0.5-cx)*(i+0.5-cx)+(j+0.5-cy)*(j+0.5-cy)); a[j*w+i] = Math.Max(0, Math.Min(1, r - d + 0.5)); }
    }
    // beskär till synligt innehåll + 2 px
    int x0=w, y0=h, x1=-1, y1=-1;
    for (int j=0;j<h;j++) for (int i=0;i<w;i++) if (a[j*w+i] > 0.03) { if(i<x0)x0=i; if(i>x1)x1=i; if(j<y0)y0=j; if(j>y1)y1=j; }
    x0=Math.Max(0,x0-2); y0=Math.Max(0,y0-2); x1=Math.Min(w-1,x1+2); y1=Math.Min(h-1,y1+2);
    int W=x1-x0+1, H=y1-y0+1; var o = new Bitmap(W, H, PixelFormat.Format32bppArgb);
    var od = o.LockBits(new Rectangle(0,0,W,H), ImageLockMode.WriteOnly, PixelFormat.Format32bppArgb); byte[] ob = new byte[od.Stride*H];
    for (int j=0;j<H;j++) for (int i=0;i<W;i++) { int k=((j+y0)*w+(i+x0)); double al=a[k]; int s=k*3, t=j*od.Stride+i*4;
      for (int c=0;c<3;c++) { double v = px[s+c]; double b = bg[2-c];
        if (mode=="flood" && al>0.01 && al<1) v = (v - b*(1-al)) / al; // ta bort bakgrundens färgton från halvgenomskinliga pixlar
        ob[t+c] = (byte)Math.Max(0, Math.Min(255, Math.Round(v))); }
      ob[t+3] = (byte)Math.Round(al*255); }
    System.Runtime.InteropServices.Marshal.Copy(ob, 0, od.Scan0, ob.Length); o.UnlockBits(od);
    if (Math.Abs(outScale - 1) > 1e-6) {
      // skala ner med förmultiplicerad alfa (undviker mörka kanter)
      int W2 = Math.Max(1, (int)Math.Round(W * outScale)), H2 = Math.Max(1, (int)Math.Round(H * outScale));
      var p = new Bitmap(W, H, PixelFormat.Format32bppPArgb);
      using (var g = Graphics.FromImage(p)) { g.CompositingMode = System.Drawing.Drawing2D.CompositingMode.SourceCopy; g.DrawImage(o, new Rectangle(0, 0, W, H), 0, 0, W, H, GraphicsUnit.Pixel); }
      var r2 = new Bitmap(W2, H2, PixelFormat.Format32bppPArgb);
      using (var g = Graphics.FromImage(r2)) using (var ia = new ImageAttributes()) {
        g.InterpolationMode = System.Drawing.Drawing2D.InterpolationMode.HighQualityBicubic; g.PixelOffsetMode = System.Drawing.Drawing2D.PixelOffsetMode.HighQuality; g.CompositingMode = System.Drawing.Drawing2D.CompositingMode.SourceCopy;
        ia.SetWrapMode(System.Drawing.Drawing2D.WrapMode.TileFlipXY); g.DrawImage(p, new Rectangle(0, 0, W2, H2), 0, 0, W, H, GraphicsUnit.Pixel, ia); }
      o.Dispose(); p.Dispose(); o = r2; W = W2; H = H2;
    }
    o.Save(dst, ImageFormat.Png); o.Dispose();
    return string.Format("{0}x{1} (bg {2:0},{3:0},{4:0})", W, H, bg[0], bg[1], bg[2]);
  }
}
'@
New-Item -ItemType Directory -Force $Out | Out-Null
$src = New-Object System.Drawing.Bitmap((Resolve-Path $Sheet).Path)
foreach ($e in (Import-Csv $List)) {
  $S = $Scale
  $r = [Cutter]::Cut($src, (Join-Path (Resolve-Path $Out) "$($e.name).png"), [int][math]::Round([int]$e.x*$S), [int][math]::Round([int]$e.y*$S), [int][math]::Round([int]$e.w*$S), [int][math]::Round([int]$e.h*$S), $e.mode, [double]$e.t0, [double]$e.t1, [double]$e.cx*$S, [double]$e.cy*$S, [double]$e.r*$S, [string]$e.bg, $OutScale)
  "{0,-14} {1}" -f $e.name, $r
}
$src.Dispose()
