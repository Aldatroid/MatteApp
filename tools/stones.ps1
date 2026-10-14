# Hittar stenarna i "Cracked Stone Cube Asset Set" och "Stylised Blue Stone Tile Set",
# räknar ut hörnen på varje yta och rätar ut ytorna till kvadratiska texturer (JPEG) för 3D-klossarna.
# Användning: powershell -File tools\stones.ps1 [-Preview]   (-Preview ritar bara ut hittade hörn i tools\prev)
param([switch]$Preview, [int]$Size = 512, [double]$TileThick = 0.0, [double]$Inset = 0.09, [int]$BlurRadius = 48, [double]$Detail = 0.6)
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
Add-Type -AssemblyName System.Drawing
Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @'
using System; using System.Drawing; using System.Drawing.Imaging; using System.Collections.Generic; using System.Linq;
public class Stones {
  public int W, H; byte[] px; // BGR
  public Stones(string path) {
    using (var b = new Bitmap(path)) { W = b.Width; H = b.Height;
      var d = b.LockBits(new Rectangle(0,0,W,H), ImageLockMode.ReadOnly, PixelFormat.Format24bppRgb);
      var raw = new byte[d.Stride*H]; System.Runtime.InteropServices.Marshal.Copy(d.Scan0, raw, 0, raw.Length); b.UnlockBits(d);
      px = new byte[W*H*3]; for (int y=0;y<H;y++) Array.Copy(raw, y*d.Stride, px, y*W*3, W*3); }
  }
  int Lum(int k) { int i=k*3; return (px[i+2]*30 + px[i+1]*59 + px[i]*11)/100; }

  // Returnerar ytornas hörn för varje sten i läsordning. kind = "cube" (3 ytor: top,left,right) eller "tile" (1 yta: top).
  // Varje yta = 8 tal: TL,TR,BR,BL (x,y) i bildkoordinater.
  public List<double[]> Detect(string kind, double thr, int minArea, double tileThick) {
    var L = new List<int>(); for (int x=0;x<W;x+=7){ L.Add(Lum(x)); L.Add(Lum((H-1)*W+x)); } L.Sort(); double bgL = L[L.Count/2];
    var outside = new bool[W*H]; var q = new Queue<int>();
    for (int x=0;x<W;x++){ q.Enqueue(x); q.Enqueue((H-1)*W+x); } for (int y=0;y<H;y++){ q.Enqueue(y*W); q.Enqueue(y*W+W-1); }
    while (q.Count>0) { int k=q.Dequeue(); if (outside[k]) continue; if (Lum(k) - bgL > thr) continue; outside[k]=true;
      int x=k%W, y=k/W; if(x>0)q.Enqueue(k-1); if(x<W-1)q.Enqueue(k+1); if(y>0)q.Enqueue(k-W); if(y<H-1)q.Enqueue(k+W); }
    var lab = new bool[W*H]; var comps = new List<List<int>>();
    for (int s=0;s<W*H;s++) { if (outside[s] || lab[s]) continue; var pts = new List<int>(); q.Enqueue(s); lab[s]=true;
      while (q.Count>0) { int k=q.Dequeue(); pts.Add(k); int x=k%W, y=k/W;
        if (x>0 && !outside[k-1] && !lab[k-1]) { lab[k-1]=true; q.Enqueue(k-1); }
        if (x<W-1 && !outside[k+1] && !lab[k+1]) { lab[k+1]=true; q.Enqueue(k+1); }
        if (y>0 && !outside[k-W] && !lab[k-W]) { lab[k-W]=true; q.Enqueue(k-W); }
        if (y<H-1 && !outside[k+W] && !lab[k+W]) { lab[k+W]=true; q.Enqueue(k+W); } }
      if (pts.Count >= minArea) comps.Add(pts); }
    // läsordning: rad efter tyngdpunktens y (grovt), sedan x
    var ordered = comps.Select(c => new { c, cx = c.Average(k => (double)(k%W)), cy = c.Average(k => (double)(k/W)) })
      .OrderBy(o => Math.Round(o.cy / (H/3.0))).ThenBy(o => o.cx).ToList();
    var res = new List<double[]>();
    double c30 = Math.Cos(Math.PI/6), s30 = 0.5;
    foreach (var o in ordered) {
      Func<double,double,double[]> S = (dx,dy) => { double best=double.MinValue; int bk=0; foreach (int k in o.c) { double v=(k%W)*dx+(k/W)*dy; if (v>best){best=v;bk=k;} } return new double[]{bk%W, bk/W}; };
      if (kind == "cube") {
        // högersidan är nästan lika mörk som bakgrunden, så B och LR räknas ut från säkra hörn (parallellprojektion)
        var T=S(0,-1); var UR=S(c30,-s30); var LL=S(-c30,s30); var UL=S(-c30,-s30);
        var C = new double[]{ UR[0]+UL[0]-T[0], UR[1]+UL[1]-T[1] };
        var B = new double[]{ C[0]+LL[0]-UL[0], C[1]+LL[1]-UL[1] }; var LR = new double[]{ UR[0]+LL[0]-UL[0], UR[1]+LL[1]-UL[1] };
        res.Add(new double[]{ T[0],T[1], UR[0],UR[1], C[0],C[1], UL[0],UL[1],     // top
                              UL[0],UL[1], C[0],C[1], B[0],B[1], LL[0],LL[1],     // left
                              C[0],C[1], UR[0],UR[1], LR[0],LR[1], B[0],B[1] });  // right
      } else {
        var TL=S(-1,-1); var TR=S(1,-1); var BR=S(1,1); var BL=S(-1,1);
        // plattans tjocklek syns nedtill: flytta de nedre hörnen upp en andel av höjden
        double hh = ((BL[1]+BR[1]) - (TL[1]+TR[1]))/2 * tileThick;
        res.Add(new double[]{ TL[0],TL[1], TR[0],TR[1], BR[0],BR[1]-hh, BL[0],BL[1]-hh });
      }
    }
    return res;
  }

  // Rätar ut fyrhörningen q (TL,TR,BR,BL) till size x size med homografi och supersampling
  // inset: hur stor del av kanten (0..0.5) som skärs bort, där den målade fasen och mörka kanterna sitter
  public Bitmap Warp(double[] q, int off, int size, int ss, double inset) {
    double[] h = Homography(new double[]{0,0, 1,0, 1,1, 0,1}, q, off);
    var o = new Bitmap(size, size, PixelFormat.Format24bppRgb);
    var d = o.LockBits(new Rectangle(0,0,size,size), ImageLockMode.WriteOnly, PixelFormat.Format24bppRgb); var ob = new byte[d.Stride*size];
    var c = new double[3];
    for (int y=0;y<size;y++) for (int x=0;x<size;x++) { double r=0,g=0,b=0;
      for (int sy=0;sy<ss;sy++) for (int sx=0;sx<ss;sx++) { double u=inset+(1-2*inset)*(x+(sx+0.5)/ss)/size, v=inset+(1-2*inset)*(y+(sy+0.5)/ss)/size;
        double w = h[6]*u + h[7]*v + 1, X = (h[0]*u + h[1]*v + h[2])/w, Y = (h[3]*u + h[4]*v + h[5])/w; Bilin(X,Y,c); b+=c[0]; g+=c[1]; r+=c[2]; }
      int n=ss*ss, t=y*d.Stride+x*3; ob[t]=(byte)(b/n); ob[t+1]=(byte)(g/n); ob[t+2]=(byte)(r/n); }
    System.Runtime.InteropServices.Marshal.Copy(ob, 0, d.Scan0, ob.Length); o.UnlockBits(d); return o;
  }
  void Bilin(double X, double Y, double[] c) { X=Math.Max(0,Math.Min(W-1.001,X)); Y=Math.Max(0,Math.Min(H-1.001,Y)); int x0=(int)X, y0=(int)Y; double fx=X-x0, fy=Y-y0;
    for (int ch=0;ch<3;ch++) { double a=px[(y0*W+x0)*3+ch], b=px[(y0*W+x0+1)*3+ch], cc=px[((y0+1)*W+x0)*3+ch], dd=px[((y0+1)*W+x0+1)*3+ch]; c[ch]=(a*(1-fx)+b*fx)*(1-fy)+(cc*(1-fx)+dd*fx)*fy; } }
  static double[] Homography(double[] s, double[] t, int off) {
    var A = new double[8,9];
    for (int i=0;i<4;i++) { double x=s[2*i], y=s[2*i+1], X=t[off+2*i], Y=t[off+2*i+1];
      double[] r1 = {x,y,1,0,0,0,-x*X,-y*X,X}, r2 = {0,0,0,x,y,1,-x*Y,-y*Y,Y};
      for (int j=0;j<9;j++){ A[2*i,j]=r1[j]; A[2*i+1,j]=r2[j]; } }
    for (int c=0;c<8;c++) { int p=c; for (int r=c+1;r<8;r++) if (Math.Abs(A[r,c])>Math.Abs(A[p,c])) p=r;
      for (int j=0;j<9;j++){ double tmp=A[c,j]; A[c,j]=A[p,j]; A[p,j]=tmp; }
      for (int r=0;r<8;r++) if (r!=c) { double f=A[r,c]/A[c,c]; for (int j=c;j<9;j++) A[r,j]-=f*A[c,j]; } }
    var h = new double[8]; for (int i=0;i<8;i++) h[i]=A[i,8]/A[i,i]; return h;
  }
  // Tar bort inbakat ljus: delar bort den storskaliga ljusstyrkan (toningar, skuggade partier) och dämpar
  // kvarvarande detaljkontrast (sprickornas inbakade skugga) med faktorn detail. Kvar blir en jämn albedo.
  public static void Delight(Bitmap b, int radius, double detail) {
    int w=b.Width, h=b.Height; var d=b.LockBits(new Rectangle(0,0,w,h), ImageLockMode.ReadWrite, PixelFormat.Format24bppRgb); var a=new byte[d.Stride*h]; System.Runtime.InteropServices.Marshal.Copy(d.Scan0,a,0,a.Length);
    var L = new double[w*h]; double mean=0;
    for (int y=0;y<h;y++) for (int x=0;x<w;x++){ int i=y*d.Stride+x*3; L[y*w+x]=a[i+2]*0.3+a[i+1]*0.59+a[i]*0.11; mean+=L[y*w+x]; } mean/=w*h;
    // lådoskärpa via summerad tabell (kanterna speglas inte – rutan krymper vid kanten)
    var S = new double[(w+1)*(h+1)];
    for (int y=0;y<h;y++) { double row=0; for (int x=0;x<w;x++){ row+=L[y*w+x]; S[(y+1)*(w+1)+x+1]=S[y*(w+1)+x+1]+row; } }
    for (int y=0;y<h;y++) for (int x=0;x<w;x++) {
      int x0=Math.Max(0,x-radius), x1=Math.Min(w,x+radius+1), y0=Math.Max(0,y-radius), y1=Math.Min(h,y+radius+1);
      double blur=(S[y1*(w+1)+x1]-S[y0*(w+1)+x1]-S[y1*(w+1)+x0]+S[y0*(w+1)+x0])/((x1-x0)*(y1-y0));
      double l=L[y*w+x], flat=l*mean/Math.Max(1,blur);          // utan storskalig ljusvariation
      double target=mean+(flat-mean)*detail;                     // dämpad detaljkontrast
      double f=target/Math.Max(1,l); int i=y*d.Stride+x*3;
      for (int c=0;c<3;c++) a[i+c]=(byte)Math.Max(0,Math.Min(255,a[i+c]*f)); }
    System.Runtime.InteropServices.Marshal.Copy(a,0,d.Scan0,a.Length); b.UnlockBits(d); }
  // Färgutjämning per kanal: alla ytor får samma medelfärg, så att bakat ljus från bilden inte dubblar 3D-ljuset
  public static double[] MeanRGB(Bitmap b) { var d=b.LockBits(new Rectangle(0,0,b.Width,b.Height), ImageLockMode.ReadOnly, PixelFormat.Format24bppRgb); var a=new byte[d.Stride*b.Height]; System.Runtime.InteropServices.Marshal.Copy(d.Scan0,a,0,a.Length); b.UnlockBits(d);
    var s=new double[3]; for (int y=0;y<b.Height;y++) for (int x=0;x<b.Width;x++){ int i=y*d.Stride+x*3; s[0]+=a[i]; s[1]+=a[i+1]; s[2]+=a[i+2]; } int n=b.Width*b.Height; return new double[]{s[0]/n,s[1]/n,s[2]/n}; }
  public static void MatchRGB(Bitmap b, double[] target) { var m=MeanRGB(b); var d=b.LockBits(new Rectangle(0,0,b.Width,b.Height), ImageLockMode.ReadWrite, PixelFormat.Format24bppRgb); var a=new byte[d.Stride*b.Height]; System.Runtime.InteropServices.Marshal.Copy(d.Scan0,a,0,a.Length);
    var f=new double[3]; for (int c=0;c<3;c++) f[c]=target[c]/Math.Max(1,m[c]);
    for (int y=0;y<b.Height;y++) for (int x=0;x<b.Width;x++) for (int c=0;c<3;c++){ int i=y*d.Stride+x*3+c; a[i]=(byte)Math.Min(255, a[i]*f[c]); }
    System.Runtime.InteropServices.Marshal.Copy(a,0,d.Scan0,a.Length); b.UnlockBits(d); }
}
'@

$sets = @(
  @{ name = 'cube'; file = 'Cracked Stone Cube Asset Set.png'; faces = @('top', 'left', 'right') },
  @{ name = 'tile'; file = 'Stylised Blue Stone Tile Set.png'; faces = @('top') }
)
$jpeg = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/jpeg' }
$ep = New-Object System.Drawing.Imaging.EncoderParameters 1
$ep.Param[0] = New-Object System.Drawing.Imaging.EncoderParameter ([System.Drawing.Imaging.Encoder]::Quality), 86L
$outDir = Join-Path $root 'webb\assets\stone'; New-Item -ItemType Directory -Force $outDir | Out-Null
$warped = @{}

foreach ($set in $sets) {
  $path = Join-Path $root "koncept\$($set.file)"
  $st = New-Object Stones($path)
  if ($set.name -eq 'tile') {
    # plattornas överytor anges för hand (tools\tiles.csv, koordinater i förhandsbildens skala 1/4)
    $quads = @(Import-Csv (Join-Path $PSScriptRoot 'tiles.csv') | ForEach-Object {
      $r = $_; , [double[]]@('x1', 'y1', 'x2', 'y2', 'x3', 'y3', 'x4', 'y4' | ForEach-Object { [double]$r.$_ * 4 }) })
  } else { $quads = $st.Detect($set.name, 22, 200000, $TileThick) }
  "$($set.name): $($quads.Count) stenar"
  if ($Preview) {
    $src = [System.Drawing.Image]::FromFile($path)
    $sc = 0.25; $bmp = New-Object System.Drawing.Bitmap ([int]($src.Width * $sc)), ([int]($src.Height * $sc))
    $g = [System.Drawing.Graphics]::FromImage($bmp); $g.InterpolationMode = 'HighQualityBicubic'; $g.DrawImage($src, 0, 0, $bmp.Width, $bmp.Height)
    $cols = @('Yellow', 'Lime', 'Magenta')
    foreach ($q in $quads) { for ($f = 0; $f -lt $set.faces.Count; $f++) {
      $pen = New-Object System.Drawing.Pen ([System.Drawing.Color]::FromName($cols[$f])), 2
      $pts = for ($j = 0; $j -lt 4; $j++) { New-Object System.Drawing.PointF ([float]($q[$f * 8 + 2 * $j] * $sc)), ([float]($q[$f * 8 + 2 * $j + 1] * $sc)) }
      $g.DrawPolygon($pen, [System.Drawing.PointF[]]$pts) } }
    $g.Dispose(); $bmp.Save((Join-Path $PSScriptRoot "prev\detect_$($set.name).png")); $bmp.Dispose(); $src.Dispose()
    continue
  }
  $n = 0
  foreach ($q in $quads) {
    $n++
    for ($f = 0; $f -lt $set.faces.Count; $f++) {
      $name = if ($set.name -eq 'cube') { "cube$($n)_$($set.faces[$f])" } else { "tile$n" }
      $warped[$name] = @{ bmp = $st.Warp($q, $f * 8, $Size, 3, $(if ($set.name -eq 'cube' -and $f -eq 0) { $Inset + 0.06 } else { $Inset })); face = $set.faces[$f]; kind = $set.name }
    }
  }
}
# Målfärg = medel av kubernas vänstersidor (mellanton). Plattorna lite mörkare, de ligger på marken.
$lefts = $warped.Values | Where-Object { $_.kind -eq 'cube' -and $_.face -eq 'left' } | ForEach-Object { , [Stones]::MeanRGB($_.bmp) }
$target = 0..2 | ForEach-Object { $c = $_; ($lefts | ForEach-Object { $_[$c] } | Measure-Object -Average).Average }
"målfärg BGR: $(($target | ForEach-Object { [math]::Round($_) }) -join ',')"
foreach ($k in $warped.Keys) {
  $w = $warped[$k]; $t = if ($w.kind -eq 'tile') { [double[]]($target | ForEach-Object { $_ * 0.9 }) } else { [double[]]$target }
  [Stones]::Delight($w.bmp, $BlurRadius, $Detail)
  [Stones]::MatchRGB($w.bmp, $t)
  $w.bmp.Save((Join-Path $outDir "$k.jpg"), $jpeg, $ep); $w.bmp.Dispose()
}
'klart'
