# Bygger mangatemats bilder ur _source/ (UI-stilarket och de tre rummen).
# Användning: powershell -ExecutionPolicy Bypass -File webb\assets\themes\manga\_review\pack.ps1
# Koordinaterna gäller ui-style-sheet-v3.png (1536x1024).
$ErrorActionPreference = 'Stop'
$Dir = Resolve-Path (Join-Path $PSScriptRoot '..')
$Src = Join-Path $Dir '_source'
Add-Type -AssemblyName System.Drawing
Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @'
using System; using System.Drawing; using System.Drawing.Imaging; using System.Drawing.Drawing2D; using System.Collections.Generic;
public static class Pack {
  static double Dist(byte[] p, int i, double[] bg) { double dr = p[i+2]-bg[0], dg = p[i+1]-bg[1], db = p[i]-bg[2]; return Math.Sqrt(dr*dr+dg*dg+db*db); }
  // Klipper ut ett område med genomskinlig bakgrund.
  // flood = ta bort bakgrund som hänger ihop med kanten (r > 0: högst r px in från kanten); circle = cirkelmask (cx, cy, r);
  // dark = behåll mörka pixlar; light = behåll ljusa pixlar. trim = beskär till synligt innehåll + 2 px.
  public static Bitmap Cut(Bitmap src, int x, int y, int w, int h, string mode, double t0, double t1, double cx, double cy, double r, bool trim) {
    var bd = src.LockBits(new Rectangle(x, y, w, h), ImageLockMode.ReadOnly, PixelFormat.Format24bppRgb);
    byte[] rgb = new byte[bd.Stride * h]; System.Runtime.InteropServices.Marshal.Copy(bd.Scan0, rgb, 0, rgb.Length); int st = bd.Stride; src.UnlockBits(bd);
    byte[] px = new byte[w*h*3]; for (int j=0;j<h;j++) Array.Copy(rgb, j*st, px, j*w*3, w*3);
    var rs = new List<int>(); var gs = new List<int>(); var bs = new List<int>();
    for (int i=0;i<w;i++) foreach (int j in new[]{0,h-1}) { int k=(j*w+i)*3; bs.Add(px[k]); gs.Add(px[k+1]); rs.Add(px[k+2]); }
    for (int j=0;j<h;j++) foreach (int i in new[]{0,w-1}) { int k=(j*w+i)*3; bs.Add(px[k]); gs.Add(px[k+1]); rs.Add(px[k+2]); }
    rs.Sort(); gs.Sort(); bs.Sort(); double[] bg = { rs[rs.Count/2], gs[gs.Count/2], bs[bs.Count/2] };
    double[] a = new double[w*h]; for (int i=0;i<a.Length;i++) a[i]=1;
    if (mode == "flood") {
      bool[] seen = new bool[w*h]; var q = new Queue<int>();
      for (int i=0;i<w;i++){ q.Enqueue(i); q.Enqueue((h-1)*w+i); } for (int j=0;j<h;j++){ q.Enqueue(j*w); q.Enqueue(j*w+w-1); }
      while (q.Count>0) { int k=q.Dequeue(); if (seen[k]) continue; double d = Dist(px, k*3, bg); if (d >= t1) continue;
        int i=k%w, j=k/w;
        if (r > 0 && Math.Min(Math.Min(i, j), Math.Min(w-1-i, h-1-j)) > r) continue;
        seen[k]=true; a[k] = d <= t0 ? 0 : (d - t0) / (t1 - t0);
        if(i>0)q.Enqueue(k-1); if(i<w-1)q.Enqueue(k+1); if(j>0)q.Enqueue(k-w); if(j<h-1)q.Enqueue(k+w); }
    } else if (mode == "dark" || mode == "light") {
      for (int k=0;k<w*h;k++) { double lum = 0.3*px[k*3+2] + 0.59*px[k*3+1] + 0.11*px[k*3];
        a[k] = Math.Max(0, Math.Min(1, mode == "dark" ? (t1 - lum) / (t1 - t0) : (lum - t0) / (t1 - t0))); }
    } else if (mode == "circle") {
      for (int j=0;j<h;j++) for (int i=0;i<w;i++) { double d = Math.Sqrt((i+0.5-cx)*(i+0.5-cx)+(j+0.5-cy)*(j+0.5-cy)); a[j*w+i] = Math.Max(0, Math.Min(1, r - d + 0.5)); }
    }
    int x0=0, y0=0, x1=w-1, y1=h-1;
    if (trim) { x0=w; y0=h; x1=-1; y1=-1;
      for (int j=0;j<h;j++) for (int i=0;i<w;i++) if (a[j*w+i] > 0.03) { if(i<x0)x0=i; if(i>x1)x1=i; if(j<y0)y0=j; if(j>y1)y1=j; }
      x0=Math.Max(0,x0-2); y0=Math.Max(0,y0-2); x1=Math.Min(w-1,x1+2); y1=Math.Min(h-1,y1+2); }
    int W=x1-x0+1, H=y1-y0+1; var o = new Bitmap(W, H, PixelFormat.Format32bppArgb);
    var od = o.LockBits(new Rectangle(0,0,W,H), ImageLockMode.WriteOnly, PixelFormat.Format32bppArgb); byte[] ob = new byte[od.Stride*H];
    for (int j=0;j<H;j++) for (int i=0;i<W;i++) { int k=((j+y0)*w+(i+x0)); double al=a[k]; int s=k*3, t=j*od.Stride+i*4;
      for (int c=0;c<3;c++) { double v = px[s+c]; double b = bg[2-c];
        if (mode=="flood" && al>0.01 && al<1) v = (v - b*(1-al)) / al;
        if (mode=="dark") v = Math.Min(v, 70);  // mörka ikoner: jämn bläckfärg
        ob[t+c] = (byte)Math.Max(0, Math.Min(255, Math.Round(v))); }
      ob[t+3] = (byte)Math.Round(al*255); }
    System.Runtime.InteropServices.Marshal.Copy(ob, 0, od.Scan0, ob.Length); o.UnlockBits(od);
    return o;
  }
  // Skalar om med förmultiplicerad alfa (inga mörka kanter).
  public static Bitmap Resize(Image img, int W, int H, bool alpha) {
    var o = new Bitmap(W, H, alpha ? PixelFormat.Format32bppPArgb : PixelFormat.Format24bppRgb);
    using (var g = Graphics.FromImage(o)) using (var ia = new ImageAttributes()) {
      g.InterpolationMode = InterpolationMode.HighQualityBicubic; g.PixelOffsetMode = PixelOffsetMode.HighQuality; g.CompositingMode = CompositingMode.SourceCopy;
      ia.SetWrapMode(WrapMode.TileFlipXY); g.DrawImage(img, new Rectangle(0, 0, W, H), 0, 0, img.Width, img.Height, GraphicsUnit.Pixel, ia); }
    return o;
  }
  public static Bitmap Crop(Image img, Rectangle r, int W, int H) {
    var o = new Bitmap(W, H, PixelFormat.Format24bppRgb);
    using (var g = Graphics.FromImage(o)) using (var ia = new ImageAttributes()) {
      g.InterpolationMode = InterpolationMode.HighQualityBicubic; g.PixelOffsetMode = PixelOffsetMode.HighQuality;
      ia.SetWrapMode(WrapMode.TileFlipXY); g.DrawImage(img, new Rectangle(0, 0, W, H), r.X, r.Y, r.Width, r.Height, GraphicsUnit.Pixel, ia); }
    return o;
  }
  public static GraphicsPath Round(RectangleF r, float rad) {
    var p = new GraphicsPath(); float d = rad * 2;
    p.AddArc(r.X, r.Y, d, d, 180, 90); p.AddArc(r.Right - d, r.Y, d, d, 270, 90);
    p.AddArc(r.Right - d, r.Bottom - d, d, d, 0, 90); p.AddArc(r.X, r.Bottom - d, d, d, 90, 90); p.CloseFigure(); return p;
  }
  // Toppraden: vänster ände (DNA), en slät mittbit som töjs och höger fack (tipsknappen) utan ägget.
  public static Bitmap Topbar(Bitmap bar, int left, int midX, int midW, int right, Rectangle slot, Color slotColor) {
    int W = left + midW + right, H = bar.Height; var o = new Bitmap(W, H, PixelFormat.Format32bppArgb);
    using (var g = Graphics.FromImage(o)) {
      g.CompositingMode = CompositingMode.SourceCopy; g.InterpolationMode = InterpolationMode.NearestNeighbor; g.PixelOffsetMode = PixelOffsetMode.Half;
      g.DrawImage(bar, new Rectangle(0, 0, left, H), 0, 0, left, H, GraphicsUnit.Pixel);
      for (int mx = 0; mx < midW; mx += 28) g.DrawImage(bar, new Rectangle(left + mx, 0, Math.Min(28, midW - mx), H), midX, 0, Math.Min(28, midW - mx), H, GraphicsUnit.Pixel);
      g.DrawImage(bar, new Rectangle(left + midW, 0, right, H), bar.Width - right, 0, right, H, GraphicsUnit.Pixel);
      g.CompositingMode = CompositingMode.SourceOver; g.SmoothingMode = SmoothingMode.AntiAlias;
      var s = new Rectangle(slot.X - (bar.Width - right) + left + midW, slot.Y, slot.Width, slot.Height);
      using (var b = new SolidBrush(slotColor)) using (var p = Round(s, 7)) g.FillPath(b, p);
      using (var pen = new Pen(Color.FromArgb(90, 0, 0, 0), 2)) using (var p = Round(s, 7)) g.DrawPath(pen, p);
    }
    return o;
  }
  // Dagens pass: bärnstensplatta med stilarkets struktur, mörk kant och fotspåret i hörnet.
  public static Bitmap PassTile(Bitmap sheet, Rectangle patch, int W, int H, Bitmap foot) {
    var o = new Bitmap(W, H, PixelFormat.Format32bppArgb);
    using (var g = Graphics.FromImage(o)) using (var tex = new Bitmap(patch.Width * 5, patch.Height * 5)) {
      using (var tg = Graphics.FromImage(tex)) { tg.InterpolationMode = InterpolationMode.HighQualityBicubic; tg.DrawImage(sheet, new Rectangle(0, 0, tex.Width, tex.Height), patch, GraphicsUnit.Pixel); }
      g.SmoothingMode = SmoothingMode.AntiAlias; g.InterpolationMode = InterpolationMode.HighQualityBicubic;
      var r = new RectangleF(5, 5, W - 10, H - 14);
      using (var sh = Round(new RectangleF(5, 11, W - 10, H - 14), 34)) using (var b = new SolidBrush(Color.FromArgb(70, 40, 30, 20))) g.FillPath(b, sh);
      using (var p = Round(r, 34)) using (var tb = new TextureBrush(tex, WrapMode.TileFlipXY)) {
        g.FillPath(tb, p);
        using (var hl = new LinearGradientBrush(new PointF(0, r.Y), new PointF(0, r.Bottom), Color.FromArgb(60, 255, 235, 190), Color.FromArgb(40, 120, 60, 0))) g.FillPath(hl, p);
        using (var pen = new Pen(Color.FromArgb(255, 52, 54, 49), 6)) g.DrawPath(pen, p); }
      using (var p = Round(new RectangleF(r.X + 9, r.Y + 9, r.Width - 18, r.Height - 18), 26)) using (var pen = new Pen(Color.FromArgb(80, 255, 240, 205), 3)) g.DrawPath(pen, p);
      int fh = (int)(H * 0.42), fw = foot.Width * fh / foot.Height;
      using (var ia = new ImageAttributes()) {
        var cm = new ColorMatrix(); cm.Matrix33 = 0.85f; ia.SetColorMatrix(cm);
        g.DrawImage(foot, new Rectangle(W - fw - 70, H - fh - 62, fw, fh), 0, 0, foot.Width, foot.Height, GraphicsUnit.Pixel, ia); }
    }
    return o;
  }
  // Appikon: stilarkets triceratops i sin rund ram på kricka.
  public static Bitmap Icon(Bitmap round, int S, Color bg) {
    var o = new Bitmap(S, S, PixelFormat.Format24bppRgb);
    using (var g = Graphics.FromImage(o)) { g.Clear(bg); g.InterpolationMode = InterpolationMode.HighQualityBicubic; g.PixelOffsetMode = PixelOffsetMode.HighQuality;
      int d = (int)(S * 0.9), m = (S - d) / 2; g.DrawImage(round, new Rectangle(m, m, d, d)); }
    return o;
  }
  public static void Jpg(Image img, string path) {
    var enc = Array.Find(ImageCodecInfo.GetImageEncoders(), e => e.MimeType == "image/jpeg");
    var ps = new EncoderParameters(1); ps.Param[0] = new EncoderParameter(System.Drawing.Imaging.Encoder.Quality, 88L);
    img.Save(path, enc, ps);
  }
}
'@
function Png($bmp, $name) { $p = Join-Path $Dir $name; $bmp.Save($p, [System.Drawing.Imaging.ImageFormat]::Png); '{0,-22} {1}x{2}' -f $name, $bmp.Width, $bmp.Height }
function Jpg($bmp, $name) { $p = Join-Path $Dir $name; [Pack]::Jpg($bmp, $p); '{0,-22} {1}x{2}' -f $name, $bmp.Width, $bmp.Height }
function Rect($x, $y, $w, $h) { New-Object System.Drawing.Rectangle($x, $y, $w, $h) }

$sheet = New-Object System.Drawing.Bitmap((Join-Path $Src 'ui-style-sheet-v3.png'))
# Ramar och knappar
Png ([Pack]::Cut($sheet, 652, 170, 430, 264, 'flood', 12, 42, 0, 0, 12, $true)) 'panel.png'
Png ([Pack]::Cut($sheet, 1104, 171, 404, 74, 'flood', 12, 42, 0, 0, 10, $true)) 'header.png'
$bar = [Pack]::Cut($sheet, 653, 51, 730, 114, 'flood', 12, 42, 0, 0, 10, $false)
Png ([Pack]::Topbar($bar, 110, 582, 196, 127, (Rect 622 22 72 70), [System.Drawing.Color]::FromArgb(255, 35, 55, 55))) 'topbar.png'
Png ([Pack]::Cut($sheet, 1404, 50, 108, 114, 'flood', 12, 42, 0, 0, 8, $true)) 'gear.png'
# Porträtt: flickan är guiden (dino_ring), triceratopsen används i appikonen
$guide = [Pack]::Cut($sheet, 930, 435, 245, 245, 'circle', 0, 0, 121.5, 120, 117, $true)
Png ([Pack]::Resize($guide, 476, 476, $true)) 'dino_ring.png'
$trike = [Pack]::Cut($sheet, 1228, 431, 250, 250, 'circle', 0, 0, 124, 124, 119, $true)
Png ([Pack]::Resize($trike, 446, 446, $true)) 'dino.png'
# Ikoner
$foot = [Pack]::Cut($sheet, 1350, 745, 66, 63, 'dark', 60, 120, 0, 0, 0, $true)
Png ([Pack]::Resize($foot, $foot.Width * 2, $foot.Height * 2, $true)) 'icon_foot.png'
$back = [Pack]::Cut($sheet, 1143, 752, 76, 48, 'dark', 70, 160, 0, 0, 0, $true)
Png ([Pack]::Resize($back, $back.Width * 2, $back.Height * 2, $true)) 'icon_back.png'
$bulb = [Pack]::Cut($sheet, 1130, 363, 48, 58, 'light', 150, 205, 0, 0, 0, $true)
Png ([Pack]::Resize($bulb, $bulb.Width * 2, $bulb.Height * 2, $true)) 'icon_bulb.png'
$helix = [Pack]::Cut($sheet, 782, 848, 62, 112, 'flood', 14, 50, 0, 0, 0, $true)
Png ([Pack]::Resize($helix, $helix.Width * 2, $helix.Height * 2, $true)) 'icon_mountain.png'
Png ([Pack]::PassTile($sheet, (Rect 1262 748 80 56), 1217, 513, $foot)) 'btn_pass.png'
# Appikoner
$teal = [System.Drawing.Color]::FromArgb(255, 41, 75, 75)
foreach ($s in 512, 192, 180, 32) { Png ([Pack]::Icon($trike, $s, $teal)) "icon-$s.png" }

# Rummen: växthuset är startsidans bakgrund och dörren, kläckeriet banorna, labbet sista rummet
$green = New-Object System.Drawing.Bitmap((Join-Path $Src 'greenhouse-habitat-square-v3 DOOR.png'))
$nurse = New-Object System.Drawing.Bitmap((Join-Path $Src 'incubation-nursery-square-v3 PROGRESS.png'))
$lab = New-Object System.Drawing.Bitmap((Join-Path $Src 'genetics-laboratory-square-v3 FINAL ROOM.png'))
$bg = [Pack]::Crop($green, (Rect 0 157 1254 940), 2048, 1536); Jpg $bg 'bg.jpg'
$small = [Pack]::Resize($bg, 96, 72, $false); Jpg ([Pack]::Resize($small, 960, 720, $false)) 'bg_blur.jpg'
New-Item -ItemType Directory -Force (Join-Path $Dir 'levels') | Out-Null
Jpg ([Pack]::Crop($green, (Rect 0 157 1254 940), 1280, 960)) 'levels/door.jpg'
Jpg ([Pack]::Crop($lab, (Rect 0 209 1254 836), 1280, 853)) 'levels/final.jpg'
Jpg ([Pack]::Crop($nurse, (Rect 0 330 1003 752), 1280, 960)) 'levels/progress1.jpg'
Jpg ([Pack]::Crop($nurse, (Rect 251 300 1003 752), 1280, 960)) 'levels/progress2.jpg'
Jpg ([Pack]::Crop($nurse, (Rect 0 157 1254 940), 1280, 960)) 'levels/progress3.jpg'
