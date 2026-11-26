import {geoOrthographic,geoPath,geoGraticule10,geoArea,geoDistance,geoContains} from 'd3-geo';
import {feature,mesh} from 'topojson-client';
import BASE from './base.css';
import CSS from './ui.css';
import HTML from './ui.html';
import CTL from './ctl.html';
import CTL_CSS from './ctl.css';
function build(sr,geo,hostEl,csr){
'use strict';
var host=null;
var RAD=Math.PI/180;
var $=function(i){return sr.getElementById(i)||(csr&&csr.getElementById(i));};
/* ---------- dados do projeto ---------- */
var FILT=[],CHAVES=[],EVENTS=[],GROUPS=[],NOLUG=[],byId={},D0=-1,D1=1,KN=[[-1,0],[1,1]];
function loadData(){
 var d=host.data(),old=byId;byId={};
 FILT=d.filters.map(function(f){return {id:f.id,n:f.name,c:host.color(f.color)};});
 var fix={};FILT.forEach(function(f,i){fix[f.id]=i;});
 EVENTS=[];NOLUG=[];GROUPS=[];var gm={},ys=[];
 d.marks.forEach(function(m){(m.events||[]).forEach(function(ev){ys.push(m.year);
  var lg=ev.lug&&isFinite(ev.lug.la)&&isFinite(ev.lug.lo)?ev.lug:null;
  var e={id:ev.id,y:m.year,t:ev.text||'',color:host.color(ev.color),f:(ev.flt||[]).map(function(x){return fix[x];}).filter(function(x){return x!==undefined;}),d:ev.desc||'',h:ev.descH||'',
   place:lg?lg.n:'',lat:lg?lg.la:0,lon:lg?lg.lo:0,on:!!host.pass(ev),a:0,v:1,fresh:true};
  var o=old[e.id];if(o){e.a=o.a;e.v=o.v;e.fresh=false;}
  byId[e.id]=e;
  if(lg){EVENTS.push(e);var k=lg.la.toFixed(2)+','+lg.lo.toFixed(2),g=gm[k];if(!g){g=gm[k]={key:k,name:lg.n,lat:lg.la,lon:lg.lo,evs:[]};GROUPS.push(g);}g.evs.push(e);e.g=g;}
  else NOLUG.push(e);});});
 CHAVES=[];d.brackets.forEach(function(b){if(typeof b.from!=='number'||typeof b.to!=='number')return;ys.push(b.from,b.to);if(host.pass(b))CHAVES.push({a:b.from,b:b.to,l:b.label||'',c:host.color(b.color)});});
 // escala do tempo: mistura linear com a densidade de eventos (anos antigos, vazios, ocupam menos espaço)
 var u=ys.slice().sort(function(a,b){return a-b;}).filter(function(y,i,a){return i===0||y!==a[i-1];});
 if(!u.length)u=[1500,2000];
 var lo=u[0],hi=u[u.length-1];if(hi-lo<20){lo-=10;hi+=10;}
 var pad=(hi-lo)*0.02;D0=Math.floor(lo-pad);D1=Math.ceil(hi+pad);
 var pts=[D0].concat(u.filter(function(y){return y>D0&&y<D1;})).concat([D1]);
 KN=pts.map(function(y,i){return [y,0.3*(y-D0)/(D1-D0)+0.7*i/(pts.length-1)];});
}

/* ---------- mapa ---------- */
var topo=geo.world;
var countries=feature(topo,topo.objects.countries), land=feature(topo,topo.objects.land), borders=mesh(topo,topo.objects.countries,function(a,b){return a!==b;});
var brazil=countries.features.filter(function(f){return f.properties.name==='Brazil';})[0];
var SPN={Argentina:1,Chile:1,Paraguay:1,Bolivia:1,Peru:1,Ecuador:1,Colombia:1,Venezuela:1};
var spanish={type:'FeatureCollection',features:countries.features.filter(function(f){return SPN[f.properties.name];})};
function boxPoly(x0,y0,x1,y1){var r=[],s=2,x,y;for(x=x0;x<x1;x+=s)r.push([x,y0]);for(y=y0;y<y1;y+=s)r.push([x1,y]);for(x=x1;x>x0;x-=s)r.push([x,y1]);for(y=y1;y>y0;y-=s)r.push([x0,y]);r.push(r[0]);
 var f={type:'Polygon',coordinates:[r]};if(geoArea(f)>2*Math.PI){r.reverse();}return f;}
var SAN={Argentina:1,Bolivia:1,Brazil:1,Chile:1,Colombia:1,Ecuador:1,Guyana:1,Paraguay:1,Peru:1,Suriname:1,Uruguay:1,Venezuela:1};
var saLand={type:'FeatureCollection',features:countries.features.filter(function(f){return SAN[f.properties.name];})};
var TORD=-46.62;
// capitanias hereditárias (1534–36): faixas do mar até Tordesilhas; limites APROXIMADOS e ilustrativos [nome, lat norte, lat sul, lon do rótulo, lat do rótulo]
var CAPT=[['Maranhão I',0,-2,-45.4,-1.0],['Maranhão II',-2,-2.9,-45.6,-2.45],['Ceará',-2.9,-4.5,-40.2,-3.7],['Rio Grande',-4.5,-6.6,-36.6,-5.5],['Itamaracá',-6.6,-7.8,-36.2,-7.2],['Pernambuco',-7.8,-10.5,-37.4,-9.15],
 ['Bahia',-10.5,-13,-40.4,-11.75],['Ilhéus',-13,-15.3,-41.2,-14.15],['Porto Seguro',-15.3,-17.9,-41.6,-16.6],['Espírito Santo',-17.9,-20.8,-42.4,-19.35],['São Tomé',-20.8,-22,-43.4,-21.4],['São Vicente',-22,-23.6,-45.2,-22.8],
 ['Santo Amaro',-23.6,-24.3,-47.8,-23.95],['São Vicente II',-24.3,-25.9,-49,-25.1],['Santana',-25.9,-28.6,-49.2,-27.25]].map(function(c){return {n:c[0],poly:boxPoly(-50,c[2],-30,c[1]),lx:c[3],ly:c[4]};});
var westC=boxPoly(-90,-56,-50,13), uniao=boxPoly(-90,-56,-30,13), CPAL=['rgba(47,143,91,.36)','rgba(88,170,120,.34)','rgba(30,120,85,.40)'];
var east=boxPoly(TORD,-56,-20,13), west=boxPoly(-90,-56,TORD,13);
var tordLine={type:'LineString',coordinates:(function(){var c=[];for(var y=-80;y<=80;y+=4)c.push([TORD,y]);return c;})()};
var sphere={type:'Sphere'}, grat=geoGraticule10();
var DIV=geo.divs;
var stMesh={type:'MultiLineString',coordinates:DIV.lines.coordinates};
var stFeats=DIV.labels.map(function(l){return {u:l.u,n:l.n,c:l.c,lon:l.x,lat:l.y};});

/* ---------- tela ---------- */
var cv=$('cv'), ctx=cv.getContext('2d'), stage=$('stage');
var W=0,H=0,R0=0,DPR=1;
var proj=geoOrthographic().clipAngle(90).precision(0.4), path=geoPath(proj,ctx);
var view={lon:-32,lat:-12,k:1}, fly=null, inertia=null, off={x:0,y:0};
var P={};function readPal(){var dark=hostEl.getAttribute('data-theme')==='dark';
 P=dark?{o1:'#1d3a4a',o2:'#0e2330',land:'#3a3a30',lineC:'#6e6a58',grat:'rgba(255,255,255,.06)',ink:'#ece7df',pill:'#1c1b16',pillL:'#34312a',pt:'#ece7df',edge:'rgba(255,255,255,.18)',fade:'#b8b2a4',hi:'rgba(255,255,255,.08)',sh:'rgba(0,0,0,.35)',stl:'#a99f86'}
 :{o1:'#dcebf1',o2:'#a7c7d6',land:'#f2e6c9',lineC:'#b8a77f',grat:'rgba(60,90,110,.10)',ink:'#1f1d1a',pill:'#fffdf9',pillL:'#d8cfbd',pt:'#1f1d1a',edge:'rgba(40,60,80,.35)',fade:'#6f6a60',hi:'rgba(255,255,255,.35)',sh:'rgba(60,45,20,.22)',stl:'#8a7a55'};}
readPal();
function layout(){var r=stage.getBoundingClientRect();W=Math.max(200,r.width);H=Math.max(200,r.height);DPR=Math.min(2,window.devicePixelRatio||1);
 cv.width=Math.round(W*DPR);cv.height=Math.round(H*DPR);R0=Math.min(W,H)/2*0.88;wake();}


/* ---------- estado ---------- */
var win={a:0,b:1}, mode={b:'atual',s:'todos',e:'com'};
var eraA={t:0,c:0,u:0,b:0,m:0,atual:1,epoca:0,st:1}, pick={on:false}, openKey=null, playing=false, winTween=null;
var dirty=true, loopOn=false;
function wake(){dirty=true;if(!loopOn){loopOn=true;requestAnimationFrame(loop);}}
function ease(u){return u<0.5?4*u*u*u:1-Math.pow(-2*u+2,3)/2;}

/* ---------- laço de desenho ---------- */
var hits=[], lastEra='';
function loop(now){
 var busy=false;
 if(hostEl.hidden){loopOn=false;return;}
 if(fly){var u=Math.min(1,(now-fly.t0)/fly.ms),e=ease(u);view.lon=fly.s.lon+fly.dl*e;view.lat=fly.s.lat+(fly.lat-fly.s.lat)*e;view.k=fly.s.k*Math.pow(fly.k/fly.s.k,e);if(u>=1)fly=null;busy=true;}
 if(inertia){var dt=Math.min(40,now-inertia.t);inertia.t=now;view.lon-=inertia.vx*dt;view.lat=clampLat(view.lat+inertia.vy*dt);var f=Math.pow(0.0015,dt/1000);inertia.vx*=f;inertia.vy*=f;if(Math.abs(inertia.vx)+Math.abs(inertia.vy)<0.0004)inertia=null;busy=true;}
 if(winTween){var u2=Math.min(1,(now-winTween.t0)/winTween.ms),e2=ease(u2);win.a=winTween.a0+(winTween.a1-winTween.a0)*e2;win.b=winTween.b0+(winTween.b1-winTween.b0)*e2;if(u2>=1)winTween=null;syncTL();busy=true;}
 if(playing){var ua=WP(win.a),ub=WP(win.b),sp=ub-ua,st=0.000035*Math.min(50,now-(loop.last||now));ua+=st;if(ua+sp>=1){ua=1-sp;setPlay(false);}win.a=WPi(ua);win.b=WPi(ua+sp);syncTL();busy=true;}
 loop.last=now;
 // o globo se afasta para o cartão não cobrir o ponto
 var narrow=W<720, ot=card.classList.contains('open')?(narrow?{x:0,y:-(card.offsetHeight+16)/2}:{x:-(card.offsetWidth+24)/2,y:0}):{x:0,y:0};
 if(Math.abs(ot.x-off.x)+Math.abs(ot.y-off.y)>0.4){off.x+=(ot.x-off.x)*0.14;off.y+=(ot.y-off.y)*0.14;busy=true;}else{off.x=ot.x;off.y=ot.y;}
 // animações suaves
 var mid=(win.a+win.b)/2, ek=eraKey(mid), ep=mode.b==='epoca', tgt={t:(ep&&(ek==='t'||ek==='t2'))?1:0,c:(ep&&ek==='c')?1:0,u:(ep&&ek==='u')?1:0,b:(ep&&ek==='b')?1:0,m:(mode.b==='epoca'&&ek!=='n'&&ek!=='x')?1:0,atual:mode.b==='atual'?1:0,epoca:mode.b==='epoca'?1:0,st:(mode.b==='atual'&&mode.e==='com')?1:0};
 for(var k in tgt){var d=tgt[k]-eraA[k];if(Math.abs(d)>0.004){eraA[k]+=d*0.14;busy=true;}else eraA[k]=tgt[k];}
 EVENTS.forEach(function(e){var inW=e.y>=win.a&&e.y<=win.b,ta=inW?1:0,tv=e.on?1:0;
  if(Math.abs(ta-e.a)>0.004){e.a+=(ta-e.a)*0.2;busy=true;}else e.a=ta;
  if(Math.abs(tv-e.v)>0.004){e.v+=(tv-e.v)*0.2;busy=true;}else e.v=tv;});
 if(dirty||busy){render();dirty=false;}
 if(busy||dirty)requestAnimationFrame(loop);else loopOn=false;
}
function eraKey(m){return m<1494?'n':m<1534?'t':m<1580?'c':m<1640?'u':m<1750?'t2':m<1822?'b':'x';}
function clampLat(l){return Math.max(-85,Math.min(85,l));}

function vis(lon,lat){return geoDistance([lon,lat],[view.lon,view.lat])<Math.PI/2-0.03;}
function render(){
 ctx.setTransform(DPR,0,0,DPR,0,0);ctx.clearRect(0,0,W,H);
 proj.translate([W/2+off.x,H/2+off.y]).scale(R0*view.k).rotate([-view.lon,-view.lat,0]);
 var R=proj.scale(),CX=W/2+off.x,CY=H/2+off.y;
 // sombra e oceano
 ctx.save();ctx.shadowColor=P.sh;ctx.shadowBlur=28;ctx.shadowOffsetY=10;ctx.beginPath();ctx.arc(CX,CY,R,0,7);ctx.fillStyle=P.o2;ctx.fill();ctx.restore();
 var og=ctx.createRadialGradient(CX-R*0.35,CY-R*0.4,R*0.1,CX,CY,R);og.addColorStop(0,P.o1);og.addColorStop(1,P.o2);
 ctx.beginPath();path(sphere);ctx.fillStyle=og;ctx.fill();
 ctx.beginPath();path(grat);ctx.strokeStyle=P.grat;ctx.lineWidth=.8;ctx.stroke();
 // terra
 ctx.beginPath();path(land);ctx.fillStyle=P.land;ctx.fill();
 // fronteiras atuais (e esmaecidas no modo "da época")
 var ba=eraA.atual*0.95+eraA.epoca*0.28;
 if(ba>0.01){ctx.save();ctx.globalAlpha=ba;ctx.beginPath();path(borders);ctx.strokeStyle=P.lineC;ctx.lineWidth=.8;if(eraA.epoca>0.5)ctx.setLineDash([3,3]);ctx.stroke();ctx.restore();}
 // estados do Brasil (hoje)
 if(eraA.st>0.01){ctx.save();ctx.globalAlpha=eraA.st*.9;ctx.beginPath();path(stMesh);ctx.strokeStyle=P.lineC;ctx.lineWidth=.7;ctx.setLineDash([2.5,2.5]);ctx.stroke();ctx.setLineDash([]);
  var la=Math.max(0,Math.min(1,(view.k-1.9)/1.1)),lb=Math.max(0,Math.min(1,(view.k-3.2)/1.0));
  if(la>0.02){ctx.font='700 10.5px "DM Sans",system-ui,sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.lineJoin='round';ctx.lineWidth=3;ctx.strokeStyle=P.land;ctx.fillStyle=P.stl;
   var boxes=[];
   stFeats.forEach(function(s){var al=s.u?la:lb;if(al<0.02||!vis(s.lon,s.lat))return;var p=proj([s.lon,s.lat]);if(p[0]<0||p[0]>W||p[1]<0||p[1]>H)return;var tx=s.u||s.n,w=ctx.measureText(tx).width/2+3;
    for(var i=0;i<boxes.length;i++){var q=boxes[i];if(Math.abs(q[0]-p[0])<q[2]+w&&Math.abs(q[1]-p[1])<11)return;}
    boxes.push([p[0],p[1],w]);ctx.globalAlpha=eraA.st*al;ctx.strokeText(tx,p[0],p[1]);ctx.fillText(tx,p[0],p[1]);});}
  ctx.restore();}
 // camadas da época (ilustrativas)
 function eraLayer(al,fn){ctx.save();ctx.globalAlpha=al;ctx.beginPath();path(saLand);ctx.clip();fn();ctx.restore();}
 function fillP(poly,col){ctx.beginPath();path(poly);ctx.fillStyle=col;ctx.fill();}
 if(eraA.t>0.01)eraLayer(eraA.t,function(){fillP(east,'rgba(47,143,91,.34)');fillP(west,'rgba(217,138,34,.32)');});
 if(eraA.c>0.01)eraLayer(eraA.c,function(){fillP(westC,'rgba(217,138,34,.32)');CAPT.forEach(function(c,i){ctx.beginPath();path(c.poly);ctx.fillStyle=CPAL[i%3];ctx.fill();ctx.strokeStyle='rgba(255,255,255,.8)';ctx.lineWidth=.9;ctx.stroke();});});
 if(eraA.u>0.01)eraLayer(eraA.u,function(){fillP(uniao,'rgba(124,92,196,.34)');});
 if(eraA.c>0.01){var lc=Math.max(0,Math.min(1,(view.k-1.5)/1));if(lc>0.02){ctx.save();ctx.globalAlpha=eraA.c*lc;ctx.font='600 10px "DM Sans",system-ui,sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.lineJoin='round';ctx.lineWidth=3;ctx.strokeStyle=P.land;ctx.fillStyle='#1f6b43';
  CAPT.forEach(function(c){if(!vis(c.lx,c.ly))return;var p=proj([c.lx,c.ly]);ctx.strokeText(c.n,p[0],p[1]);ctx.fillText(c.n,p[0],p[1]);});ctx.restore();}}
 if(eraA.b>0.01){ctx.save();ctx.globalAlpha=eraA.b;ctx.beginPath();path(spanish);ctx.fillStyle='rgba(217,138,34,.32)';ctx.fill();ctx.beginPath();path(brazil);ctx.fillStyle='rgba(47,143,91,.36)';ctx.fill();ctx.strokeStyle='#1f6b43';ctx.lineWidth=1.4;ctx.stroke();ctx.restore();}
 if(eraA.m>0.01){var strong=Math.min(1,eraA.t+eraA.c);ctx.save();ctx.globalAlpha=eraA.m*(strong>0.5?1:0.55);ctx.beginPath();path(tordLine);ctx.setLineDash(strong>0.5?[7,5]:[2,5]);ctx.strokeStyle='#9b1c1c';ctx.lineWidth=strong>0.5?2.2:1.2;ctx.stroke();ctx.setLineDash([]);
  var ltx=strong>0.5?'Linha de Tordesilhas':(eraA.u>0.5?'Tordesilhas (sem efeito prático)':'');
  if(ltx&&vis(TORD,2)){var tp=proj([TORD,2]);label(tp[0]-8,tp[1],ltx,true,'#9b1c1c');}ctx.restore();}
 // contorno e brilho
 ctx.beginPath();path(land);ctx.strokeStyle=P.edge;ctx.lineWidth=.7;ctx.globalAlpha=.7;ctx.stroke();ctx.globalAlpha=1;
 var hg=ctx.createRadialGradient(CX-R*0.4,CY-R*0.45,R*0.05,CX-R*0.2,CY-R*0.25,R*1.05);hg.addColorStop(0,P.hi);hg.addColorStop(.5,'rgba(255,255,255,0)');
 ctx.beginPath();ctx.arc(CX,CY,R,0,7);ctx.fillStyle=hg;ctx.fill();
 ctx.beginPath();ctx.arc(CX,CY,R,0,7);ctx.strokeStyle=P.edge;ctx.lineWidth=1.2;ctx.stroke();
 drawPoints();
 drawPick();
 updateEraTag();
}

function rr(x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();}
var lblRects=[];
function label(x,y,text,right,color){ctx.font='500 11.5px "DM Sans",system-ui,sans-serif';var w=ctx.measureText(text).width+14,h=20;var x0=right?x-w:x,y0=y-h/2;
 rr(x0,y0,w,h,6);ctx.fillStyle=P.pill;ctx.globalAlpha*=.96;ctx.fill();ctx.strokeStyle=P.pillL;ctx.lineWidth=1;ctx.stroke();ctx.fillStyle=color||P.pt;ctx.textBaseline='middle';ctx.textAlign='left';ctx.fillText(text,x0+7,y0+h/2+.5);}

/* ---------- pontos, agrupamento e rótulos ---------- */
function weight(e){return e.v*(mode.s==='periodo'?e.a:1);}
function drawPoints(){
 var items=[],i,j;
 GROUPS.forEach(function(g){
  var evs=g.evs.filter(function(e){return weight(e)>0.03;});if(!evs.length||!vis(g.lon,g.lat))return;
  var p=proj([g.lon,g.lat]);items.push({g:g,evs:evs,x:p[0],y:p[1],hl:evs.reduce(function(s,e){return s+e.a*e.v;},0)});});
 items.sort(function(a,b){return b.hl-a.hl;});
 var TH=14,cl=[];
 items.forEach(function(it){var f=null;for(var c=0;c<cl.length;c++){var dx=cl[c].x-it.x,dy=cl[c].y-it.y;if(dx*dx+dy*dy<TH*TH){f=cl[c];break;}}
  if(f){f.items.push(it);}else cl.push({x:it.x,y:it.y,items:[it]});});
 hits=[];lblRects=[];
 cl.forEach(function(c){c.evs=[];c.items.forEach(function(it){c.evs=c.evs.concat(it.evs);});
  c.s=0;c.nhl=0;c.evs.forEach(function(e){var s=e.a*e.v;if(s>c.s)c.s=s;if(e.a>0.5)c.nhl++;});});
 // 1) pontos apagados (contexto)
 cl.forEach(function(c){var fa=(1-c.s);if(fa<0.02)return;ctx.save();ctx.globalAlpha=fa*0.6*Math.max(...c.evs.map(function(e){return e.v;}));
  ctx.beginPath();ctx.arc(c.x,c.y,3.6+(c.items.length>1?1.5:0),0,7);ctx.fillStyle=P.fade;ctx.fill();ctx.lineWidth=1;ctx.strokeStyle=P.pill;ctx.stroke();ctx.restore();});
 // 2) pontos em destaque
 var hl=cl.filter(function(c){return c.s>0.02;}).sort(function(a,b){return b.nhl-a.nhl;});
 hl.forEach(function(c){
  var cats={};c.evs.forEach(function(e){if(e.a>0.5)cats[e.color]=1;});var ck=Object.keys(cats);var col=ck.length===1?ck[0]:(ck.length?P.ink:c.evs[0].color);
  var n=Math.max(1,c.nhl),r=5.5+Math.min(7,Math.sqrt(n)*2.1);
  ctx.save();ctx.globalAlpha=c.s;
  ctx.beginPath();ctx.arc(c.x,c.y,r+3.5*c.s,0,7);ctx.fillStyle=col;ctx.globalAlpha=c.s*.2;ctx.fill();
  ctx.globalAlpha=c.s;ctx.beginPath();ctx.arc(c.x,c.y,r,0,7);ctx.fillStyle=col;ctx.fill();ctx.lineWidth=2;ctx.strokeStyle=P.pill;ctx.stroke();
  if(c.nhl>1||c.items.length>1){ctx.fillStyle='#fff';ctx.font='700 11px "DM Sans",system-ui,sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(String(Math.max(c.nhl,c.items.length>1&&c.nhl===0?c.evs.length:c.nhl)),c.x,c.y+.5);}
  ctx.restore();
  c.r=r;
 });
 // 3) rótulos sem sobreposição
 ctx.save();
 hl.forEach(function(c){if(c.s<0.6)return;var top=c.items.slice().sort(function(a,b){return b.hl-a.hl;})[0];var name=top.g.name.replace(/ \(.*\)$/,'').replace(' — Vila Rica','');if(c.items.length>1)name+=' +'+(c.items.length-1);
  ctx.font='500 11.5px "DM Sans",system-ui,sans-serif';var w=ctx.measureText(name).width+14,h=20,x0=c.x+c.r+6,y0=c.y-h/2;
  if(x0+w>W-6)x0=c.x-c.r-6-w;
  var R1={x:x0,y:y0,w:w,h:h},ok=x0>4&&y0>4&&y0+h<H-4;
  for(var q=0;q<lblRects.length&&ok;q++){var o=lblRects[q];if(R1.x<o.x+o.w+3&&R1.x+R1.w>o.x-3&&R1.y<o.y+o.h+2&&R1.y+R1.h>o.y-2)ok=false;}
  if(!ok)return;lblRects.push(R1);ctx.globalAlpha=c.s;label(x0,c.y,name,false);});
 ctx.restore();
 cl.forEach(function(c){hits.push({x:c.x,y:c.y,r:Math.max(10,(c.r||4)+5),c:c});});
}

/* ---------- barra de época ---------- */
var eraTag=$('eraTag');
function updateEraTag(){
 var mid=(win.a+win.b)/2,h,ek=eraKey(mid);
 if(mode.b==='epoca'){
  var sw=function(c,t){return '<span class="sw"><i style="background:'+c+'"></i>'+t+'</span>';};
  if(ek==='n'||ek==='x')h='<b>Sem mapa histórico para este período</b><br>Só há mapas ilustrativos do Brasil entre 1494 e 1822; aqui aparecem as fronteiras de hoje, esmaecidas.';
  else if(ek==='t')h='<b>Mapa de Tordesilhas (aprox.)</b><br>'+sw('#2f8f5b','Lado português')+sw('#d98a22','Lado espanhol')+'<br>Linha a 46°37′ O, ilustrativa.';
  else if(ek==='c')h='<b>Capitanias hereditárias (1534–36, aprox.)</b><br>'+sw('#2f8f5b','Capitanias')+sw('#d98a22','América espanhola')+'<br>Faixas do mar até Tordesilhas, que os mapas da época situavam mais a oeste. Limites aproximados.';
  else if(ek==='u')h='<b>União Ibérica (1580–1640)</b><br>'+sw('#7c5cc4','Monarquia Hispânica')+'<br>Portugal e Espanha sob o mesmo rei; Tordesilhas perde o efeito prático.';
  else if(ek==='t2')h='<b>Tordesilhas após a Restauração (aprox.)</b><br>'+sw('#2f8f5b','Lado português')+sw('#d98a22','Lado espanhol')+'<br>Na prática, a ocupação luso-brasileira já avançava além da linha.';
  else h='<b>Mapa após Madri (1750, aprox.)</b><br>'+sw('#2f8f5b','Brasil português')+sw('#d98a22','América espanhola')+'<br>Madri reconhece a ocupação efetiva; contornos ilustrativos, não oficiais.';
 } else if(mode.b==='atual')h='<b>Fronteiras atuais</b>';
 else h='<b>Sem fronteiras</b>';
 if(h!==lastEra){lastEra=h;eraTag.innerHTML=h;}
}

/* ---------- interação no globo ---------- */
var ptrs={}, drag=null, pinch=null, tip=$('tip');
function cvXY(e){var r=cv.getBoundingClientRect();return [e.clientX-r.left,e.clientY-r.top];}
cv.addEventListener('pointerdown',function(e){cv.setPointerCapture(e.pointerId);var p=cvXY(e);ptrs[e.pointerId]=p;fly=null;inertia=null;
 var ids=Object.keys(ptrs);
 if(ids.length===1){drag={x:p[0],y:p[1],sx:p[0],sy:p[1],t:e.timeStamp,vx:0,vy:0,moved:false,pid:e.pointerId};}
 else if(ids.length===2){var a=ptrs[ids[0]],b=ptrs[ids[1]];pinch={d:Math.hypot(a[0]-b[0],a[1]-b[1]),k:view.k};if(drag)drag.moved=true;}
 tip.style.opacity=0;});
cv.addEventListener('pointermove',function(e){var p=cvXY(e);
 if(ptrs[e.pointerId])ptrs[e.pointerId]=p;
 if(pinch&&Object.keys(ptrs).length>=2){var ids=Object.keys(ptrs),a=ptrs[ids[0]],b=ptrs[ids[1]],d=Math.hypot(a[0]-b[0],a[1]-b[1]);view.k=Math.max(0.8,Math.min(14,pinch.k*d/pinch.d));wake();return;}
 if(drag&&e.pointerId===drag.pid){var dx=p[0]-drag.x,dy=p[1]-drag.y;
  if(!drag.moved&&Math.hypot(p[0]-drag.sx,p[1]-drag.sy)>5){drag.moved=true;cv.classList.add('drag');}
  if(drag.moved){var rpx=R0*view.k,dt=Math.max(1,e.timeStamp-drag.t);view.lon-=dx/rpx/RAD;view.lat=clampLat(view.lat+dy/rpx/RAD);
   drag.vx=0.8*drag.vx+0.2*(dx/rpx/RAD/dt);drag.vy=0.8*drag.vy+0.2*(dy/rpx/RAD/dt);drag.x=p[0];drag.y=p[1];drag.t=e.timeStamp;wake();}
  return;}
 if(e.pointerType==='mouse'&&!pick.on){var h=hitAt(p);cv.classList.toggle('hov',!!h);if(h){showTip(h,p);}else tip.style.opacity=0;}});
function endPtr(e){var p=cvXY(e);var wasDrag=drag&&e.pointerId===drag.pid?drag:null;delete ptrs[e.pointerId];
 if(Object.keys(ptrs).length<2)pinch=null;
 if(wasDrag){cv.classList.remove('drag');drag=null;
  if(!wasDrag.moved&&e.type==='pointerup'){if(pick.on){pickAt(p);}else{var h=hitAt(p);if(h){try{clickCluster(h.c);}catch(err){console.error(err);}}}}
  else if(wasDrag.moved&&e.type==='pointerup'&&e.timeStamp-wasDrag.t<70&&(Math.abs(wasDrag.vx)+Math.abs(wasDrag.vy))>0.0008){inertia={vx:wasDrag.vx,vy:wasDrag.vy,t:performance.now()};wake();}
  drag=null;}
 if(Object.keys(ptrs).length===1){var id=Object.keys(ptrs)[0];drag={x:ptrs[id][0],y:ptrs[id][1],sx:ptrs[id][0],sy:ptrs[id][1],t:e.timeStamp,vx:0,vy:0,moved:true,pid:+id};}}
cv.addEventListener('pointerup',endPtr);cv.addEventListener('pointercancel',endPtr);
cv.addEventListener('pointerleave',function(){tip.style.opacity=0;});
cv.addEventListener('wheel',function(e){e.preventDefault();fly=null;view.k=Math.max(0.8,Math.min(14,view.k*Math.exp(-e.deltaY*0.0013)));wake();},{passive:false});
cv.addEventListener('dblclick',function(e){var p=cvXY(e);if(!pick.on&&hitAt(p))return;var ll=proj.invert?proj.invert(p):null;if(ll&&isFinite(ll[0]))flyTo(ll[0],ll[1],Math.min(14,view.k*2),600);});
function hitAt(p){var best=null,bd=1e9;hits.forEach(function(h){var d=Math.hypot(h.x-p[0],h.y-p[1]);if(d<h.r&&d<bd){bd=d;best=h;}});return best;}
function showTip(h,p){var c=h.c;var names=c.items.map(function(i){return i.g.name.replace(/ \(.*\)$/,'');});
 tip.textContent=(c.items.length>1?names.slice(0,2).join(', ')+(names.length>2?'…':''):names[0])+' · '+c.evs.length+(c.evs.length>1?' eventos':' evento');
 tip.style.left=p[0]+'px';tip.style.top=p[1]+'px';tip.style.opacity=1;}
function clickCluster(c){openCard(c.items.map(function(i){return i.g;}));}
function flyTo(lon,lat,k,ms){var dl=((lon-view.lon+540)%360)-180;fly={t0:performance.now(),ms:ms||900,s:{lon:view.lon,lat:view.lat,k:view.k},dl:dl,lat:clampLat(lat),k:k};inertia=null;wake();}
$('zin').onclick=function(){flyTo(view.lon,view.lat,Math.min(14,view.k*1.6),350);};
$('zout').onclick=function(){flyTo(view.lon,view.lat,Math.max(0.8,view.k/1.6),350);};
$('zhome').onclick=function(){homeView();};

/* ---------- cartão ---------- */
var card=$('card'), cardT=$('cardT'), cardBody=$('cardBody');
function el(t,c,x){var e=document.createElement(t);if(c)e.className=c;if(x!==undefined)e.textContent=x;return e;}
function openCard(groups,focusEv){
 openKey=groups.map(function(g){return g.key;}).join('|');
 var evs=[];groups.forEach(function(g){evs=evs.concat(g.evs);});evs=evs.filter(function(e){return e.on;}).sort(function(a,b){return a.y-b.y;});
 cardT.textContent='';var nm=groups.length===1?groups[0].name:groups.slice(0,2).map(function(g){return g.name.replace(/ \(.*\)$/,'');}).join(' · ')+(groups.length>2?' e mais '+(groups.length-2):'');
 cardT.appendChild(document.createTextNode(nm));cardT.appendChild(el('small','',evs.length+(evs.length===1?' evento':' eventos')+' neste lugar'));
 cardBody.textContent='';
 evs.forEach(function(e){var box=el('div','ev'+((e.y<win.a||e.y>win.b)?' dim':''));box.dataset.id=e.id;
  var b=el('button');b.setAttribute('aria-expanded','false');var dot=el('span','dot');dot.style.background=e.color;b.appendChild(dot);b.appendChild(el('span','yr',fy(e.y)));var tt=el('span','tt',e.t);if(groups.length>1)tt.appendChild(el('small','',e.place.replace(/ \(.*\)$/,'')));b.appendChild(tt);b.appendChild(el('span','chev','›'));
  var more=el('div','more'),inner=el('div'),p=el('p','');richRender(p,e.h,e.d);var row=el('div','row'),tags=e.f.map(function(i){var s=el('span','tag',FILT[i].n);s.style.borderColor=FILT[i].c;s.style.color=FILT[i].c;return s;}),go=el('button','go','Ver no período'),op=el('button','go','Abrir evento'),pl=host.canEdit()?el('button','go pl','Mudar lugar'):null;
   op.onclick=function(){host.openEvent(e.y,e.id);};if(pl)pl.onclick=function(){startPick(e);};
  go.onclick=function(){setWindow(WPi(WP(e.y)-.02),WPi(WP(e.y)+.02));};tags.forEach(function(x){row.appendChild(x);});var acts=el('div','acts');acts.appendChild(op);acts.appendChild(go);if(pl)acts.appendChild(pl);row.appendChild(acts);inner.appendChild(p);inner.appendChild(row);more.appendChild(inner);
  b.onclick=function(){var o=box.classList.toggle('open');b.setAttribute('aria-expanded',o);};
  box.appendChild(b);box.appendChild(more);cardBody.appendChild(box);
  if(focusEv===e.id||evs.length===1){box.classList.add('open');b.setAttribute('aria-expanded','true');}});
 card.classList.add('open');wake();
 if(focusEv!==undefined){var t=cardBody.querySelector('[data-id="'+focusEv+'"]');if(t)setTimeout(function(){t.scrollIntoView({block:'nearest',behavior:'smooth'});},120);}
}
function richRender(target,html,plain){
 if(!html){target.textContent=plain||'';return;}
 var stack=[target],depth=[],re=/<(\/?)([biu])>|<br>|([^<]+)|</gi,m;
 while((m=re.exec(html))!==null){var cur=stack[stack.length-1];
  if(m[2]){var tg=m[2].toLowerCase();if(!m[1]){var e=document.createElement(tg);cur.appendChild(e);stack.push(e);depth.push(tg);}else{var k=depth.lastIndexOf(tg);if(k>=0){stack.length=k+1;depth.length=k;}}}
  else if(m[3]!==undefined)cur.appendChild(document.createTextNode(m[3].replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&')));
  else if(m[0].toLowerCase()==='<br>')cur.appendChild(document.createElement('br'));
  else cur.appendChild(document.createTextNode('<'));}
}
function closeCard(){card.classList.remove('open');openKey=null;wake();}
$('cardX').onclick=closeCard;


/* ---------- faixa do tempo ---------- */
var track=$('track'), winEl=$('win'), dotsEl=$('dots'), axisEl=$('axis'), lbl=$('winLbl');
function WP(y){if(y<=KN[0][0])return 0;for(var i=1;i<KN.length;i++){if(y<=KN[i][0]){var a=KN[i-1],b=KN[i];return a[1]+(y-a[0])/(b[0]-a[0])*(b[1]-a[1]);}}return 1;}
function WPi(u){if(u<=0)return KN[0][0];for(var i=1;i<KN.length;i++){if(u<=KN[i][1]){var a=KN[i-1],b=KN[i];return a[0]+(u-a[1])/(b[1]-a[1])*(b[0]-a[0]);}}return KN[KN.length-1][0];}
function fy(y){y=Math.round(y);return y<0?(-y)+' a.C.':String(y);}
function xOf(y){return WP(y)*100;}
var dotEls=[];
function buildAxis(){axisEl.textContent='';var last=-9,ys=[];
 for(var i=1;i<=5;i++){var y=WPi(i/6),m=Math.abs(y),s=m>=3000?500:m>=1000?100:m>=200?50:10;y=Math.round(y/s)*s;var x=xOf(y);if(x-last<14||x<4||x>96)continue;last=x;ys.push(y);}
 ys.forEach(function(y){var s=el('span','',fy(y));s.style.left=xOf(y)+'%';axisEl.appendChild(s);});}
function buildDots(){dotsEl.textContent='';dotEls=EVENTS.map(function(e){var d=document.createElement('i');d.style.left=xOf(e.y)+'%';d.style.background=e.color;d.title=fy(e.y)+' · '+e.t;
 d.addEventListener('click',function(ev){ev.stopPropagation();selectEvent(e);});d.addEventListener('pointerdown',function(ev){ev.stopPropagation();});dotsEl.appendChild(d);return d;});}
function selectEvent(e){
 if(e.y<win.a||e.y>win.b){var span=win.b-win.a,a=Math.max(D0,Math.min(D1-span,e.y-span/2));setWindow(a,a+span,true);}
 var g=e.g;flyTo(g.lon,g.lat,Math.max(view.k,2.2),900);openCard([g],e.id);}
function syncTL(){winEl.style.left=xOf(win.a)+'%';winEl.style.width=(xOf(win.b)-xOf(win.a))+'%';
 var n=0;EVENTS.forEach(function(e,i){var inW=e.y>=win.a&&e.y<=win.b;var on=e.on;if(inW&&on)n++;dotEls[i].style.opacity=on?(inW?1:.35):0;dotEls[i].style.pointerEvents=on?'auto':'none';});
 lbl.innerHTML='<b>'+fy(win.a)+' – '+fy(win.b)+'</b> · '+n+' de '+EVENTS.filter(function(e){return e.on;}).length+' eventos no período';
 var pre=sr.querySelectorAll('.pre');for(var i=0;i<pre.length;i++){var p=PRESETS[i];pre[i].classList.toggle('on',Math.abs(win.a-p[1])<1.5&&Math.abs(win.b-p[2])<1.5);}

 var mid=(win.a+win.b)/2,act=CHAVES.filter(function(c){return c.a<=mid&&mid<=c.b;}).sort(function(x,y){return (x.b-x.a)-(y.b-y.a);}).slice(0,6),key=act.map(function(c){return c.l;}).join('|');
 if(key!==syncTL.k){syncTL.k=key;var box=$('chv');box.textContent='';box.appendChild(el('span','','Chaves neste período:'));
  act.forEach(function(c){var b=el('button','',c.l.charAt(0)+c.l.slice(1).toLowerCase()+' · '+fy(c.a)+'–'+fy(c.b));b.style.setProperty('--c',c.c);b.title='Mostrar o período inteiro desta chave';b.onclick=function(){var p=Math.max(2,(c.b-c.a)*.04);setWindow(c.a-p,c.b+p);};box.appendChild(b);});
  if(!act.length)box.appendChild(el('span','','nenhuma'));}
 dirty=true;}
function setWindow(a,b,quiet){a=Math.max(D0,a);b=Math.min(D1,b);if(WP(b)-WP(a)<.008){b=WPi(WP(a)+.008);}setPlay(false);winTween={t0:performance.now(),ms:quiet?500:650,a0:win.a,a1:a,b0:win.b,b1:b};wake();}
var PRESETS=[],presEl=$('presets'),scrRange=null;
function cap(s){s=String(s||'');return s.charAt(0)+s.slice(1).toLowerCase();}
function buildPresets(){PRESETS=[['Tudo',D0,D1]];
 if(scrRange)PRESETS.push(['Na linha do tempo',scrRange[0],scrRange[1]]);
 CHAVES.slice().sort(function(x,y){return (y.b-y.a)-(x.b-x.a);}).reduce(function(acc,c){if(acc.length>=10)return acc;var ok=acc.every(function(o){var ov=Math.min(o.b,c.b)-Math.max(o.a,c.a);return ov<=0.1*Math.min(o.b-o.a,c.b-c.a);});if(ok)acc.push(c);return acc;},[]).sort(function(x,y){return x.a-y.a;}).forEach(function(c){var n=cap(c.l);if(n.length>26)n=n.slice(0,25)+'…';PRESETS.push([n,c.a,c.b]);});
 presEl.textContent='';PRESETS.forEach(function(p){var b=el('button','pre',p[0]);b.onclick=function(){setWindow(p[1],p[2]);};presEl.appendChild(b);});}
// arrastar a janela
var tdrag=null;
function trackX(e){var r=track.getBoundingClientRect();return {x:e.clientX-r.left,w:r.width};}
track.addEventListener('pointerdown',function(e){track.setPointerCapture(e.pointerId);winTween=null;setPlay(false);var t=trackX(e),u=t.x/t.w,ua=WP(win.a),ub=WP(win.b);
 var mode_=e.target.classList.contains('l')?'l':e.target.classList.contains('r')?'r':(u>=ua&&u<=ub?'m':'new');
 if(mode_==='new'){var sp=ub-ua,a=Math.max(0,Math.min(1-sp,u-sp/2));win.a=WPi(a);win.b=WPi(a+sp);mode_='m';syncTL();wake();}
 tdrag={m:mode_,u0:u,a0:WP(win.a),b0:WP(win.b)};});
track.addEventListener('pointermove',function(e){if(!tdrag)return;var t=trackX(e),u=t.x/t.w,d=u-tdrag.u0,MS=.008;
 if(tdrag.m==='m'){var sp=tdrag.b0-tdrag.a0,a=Math.max(0,Math.min(1-sp,tdrag.a0+d));win.a=WPi(a);win.b=WPi(a+sp);}
 else if(tdrag.m==='l'){win.a=WPi(Math.max(0,Math.min(tdrag.b0-MS,tdrag.a0+d)));}
 else{win.b=WPi(Math.min(1,Math.max(tdrag.a0+MS,tdrag.b0+d)));}
 syncTL();wake();});
function tEnd(){tdrag=null;}track.addEventListener('pointerup',tEnd);track.addEventListener('pointercancel',tEnd);
// tocar a linha
var playBtn=$('play');
function setPlay(v){playing=v;playBtn.textContent=v?'❚❚':'▶';if(v){loop.last=performance.now();if(WP(win.b)>=.995){var s0=WP(win.b)-WP(win.a);win.a=D0;win.b=WPi(s0);}wake();}}
playBtn.onclick=function(){winTween=null;setPlay(!playing);};

/* ---------- controles do topo ---------- */
function seg(id,key){var box=$(id);box.addEventListener('click',function(e){var b=e.target.closest('button');if(!b)return;mode[key]=b.dataset.v;[].forEach.call(box.children,function(x){x.classList.toggle('on',x===b);});wake();});}
seg('segB','b');seg('segS','s');seg('segE','e');
$('segB').addEventListener('click',function(){$('ctlSt').classList.toggle('dis',mode.b!=='atual');});

/* ---------- tela inicial / ciclo de vida ---------- */
function homeView(){var g=EVENTS.filter(function(e){return e.on;});if(!g.length){flyTo(-30,10,1,800);return;}
 var lo=0,la=0,n=0;g.forEach(function(e){lo+=e.lon;la+=e.lat;n++;});flyTo(lo/n,la/n,1,900);}
var norm=function(s){return String(s||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase();};

/* ---------- lista discreta de eventos sem lugar ---------- */
var nolugBtn=$('nolug'),nolugList=$('nolugList');
function updateNolug(){
 var vis_=host&&host.canEdit()?NOLUG.filter(function(e){return e.on;}):[];
 if(!vis_.length){nolugBtn.hidden=true;nolugList.hidden=true;return;}
 nolugBtn.hidden=pick.on;nolugBtn.textContent='○ '+vis_.length+(vis_.length===1?' evento sem lugar':' eventos sem lugar');
 if(nolugList.hidden)return;
 nolugList.textContent='';nolugList.appendChild(el('div','hd','Toque para definir o lugar'));
 vis_.slice().sort(function(a,b){return a.y-b.y;}).forEach(function(e){var b=el('button','it');var d=el('i');d.style.background=e.color;b.appendChild(d);b.appendChild(el('span','y',fy(e.y)));b.appendChild(el('span','t',e.t));b.appendChild(el('span','pin','definir'));
  b.onclick=function(){nolugList.hidden=true;startPick(e);};nolugList.appendChild(b);});
}
nolugBtn.onclick=function(){nolugList.hidden=!nolugList.hidden;updateNolug();};

/* ---------- escolher o lugar de um evento ---------- */
var pkEl=$('pick'),pkQ=$('pkQ'),pkRes=$('pkRes'),pkSel=$('pkSel'),pkName=$('pkName'),pkOk=$('pkOk'),pkNone=$('pkNone');
function geodist(a,b,c,d){return geoDistance([b,a],[d,c])*6371;}
function placeAt(lon,lat){
 var best=null,bd=1e9,C=geo.cities;
 for(var i=0;i<C.length;i++){var c=C[i];if(Math.abs(c[1]-lat)>1.5||Math.abs(c[2]-lon)>2.5)continue;var d=geodist(lat,lon,c[1],c[2]);if(d<bd){bd=d;best=c;}}
 if(best&&bd<70)return {n:best[0]+(best[3]!=null&&geo.cn[best[3]]?' ('+geo.cn[best[3]]+')':''),la:best[1],lo:best[2],snap:true};
 var f=null,pt=[lon,lat];for(var j=0;j<countries.features.length;j++){if(geoContains(countries.features[j],pt)){f=countries.features[j];break;}}
 var nm=f?(geo.ptn[f.properties.name]||f.properties.name):(Math.abs(lat).toFixed(1)+(lat<0?'°S, ':'°N, ')+Math.abs(lon).toFixed(1)+(lon<0?'°O':'°L'));
 return {n:nm,la:lat,lo:lon};
}
function setSel(p){pick.sel=p?{n:p.n,la:+(+p.la).toFixed(3),lo:+(+p.lo).toFixed(3)}:null;pkSel.hidden=!pick.sel;pkName.textContent=pick.sel?'📍 '+pick.sel.n:'';pkOk.disabled=!pick.sel;wake();}
function pickAt(p){var ll=proj.invert?proj.invert(p):null;if(!ll||!isFinite(ll[0])||geodist(ll[1],ll[0],view.lat,view.lon)>10000)return;var r=placeAt(ll[0],ll[1]);setSel(r.snap?r:{n:r.n,la:ll[1],lo:ll[0]});}
function drawPick(){
 if(!pick.on||!pick.sel||!vis(pick.sel.lo,pick.sel.la))return;
 var p=proj([pick.sel.lo,pick.sel.la]);ctx.save();ctx.beginPath();ctx.arc(p[0],p[1],11,0,7);ctx.fillStyle='rgba(201,42,42,.22)';ctx.fill();
 ctx.beginPath();ctx.arc(p[0],p[1],6.5,0,7);ctx.fillStyle='#c92a2a';ctx.fill();ctx.lineWidth=2.2;ctx.strokeStyle='#fff';ctx.stroke();ctx.restore();}
function searchPlaces(q){
 q=norm(q).trim();if(q.length<2)return [];var out=[],C=geo.cities,K=geo.ctry,i;
 function sc(n,en){var a=norm(n),b=en?norm(en):'';if(a===q||b===q)return 0;if(a.indexOf(q)===0||b.indexOf(q)===0)return 1;if((' '+a).indexOf(' '+q)>=0||(' '+b).indexOf(' '+q)>=0)return 2;if(a.indexOf(q)>=0||b.indexOf(q)>=0)return 3;return -1;}
 for(i=0;i<K.length;i++){var s=sc(K[i][0],K[i][1]);if(s>=0)out.push({s:s-0.5,pop:1e9,n:K[i][0],sub:'país',la:K[i][2],lo:K[i][3],z:2.6});}
 for(i=0;i<C.length;i++){var c=C[i],s2=sc(c[0],c[5]);if(s2>=0)out.push({s:s2,pop:c[4],n:c[0]+(c[3]!=null&&geo.cn[c[3]]?' ('+geo.cn[c[3]]+')':''),sub:c[3]!=null?geo.cn[c[3]]:'',la:c[1],lo:c[2],z:8});}
 out.sort(function(a,b){return a.s-b.s||b.pop-a.pop;});
 var seen={},r=[];out.forEach(function(o){var k=o.n;if(seen[k]||r.length>=7)return;seen[k]=1;r.push(o);});return r;
}
function renderRes(){var q=pkQ.value;pkRes.textContent='';if(norm(q).trim().length<2){return;}
 var rs=searchPlaces(q);if(!rs.length){pkRes.appendChild(el('div','none','Nada encontrado. Toque no mapa para marcar o lugar.'));return;}
 rs.forEach(function(r){var b=el('button','',r.n.replace(/ \(.*\)$/,''));if(r.sub)b.appendChild(el('small','',r.sub));
  b.onclick=function(){setSel({n:r.n,la:r.la,lo:r.lo});flyTo(r.lo,r.la,Math.max(view.k,r.z>4?5:2.2),900);pkRes.textContent='';pkQ.value='';};pkRes.appendChild(b);});}
pkQ.addEventListener('input',renderRes);
pkQ.addEventListener('keydown',function(e){if(e.key==='Enter'){var f=pkRes.querySelector('button');if(f)f.click();e.preventDefault();}e.stopPropagation();});
function startPick(ev,opts){
 opts=opts||{};closeCard();nolugList.hidden=true;
 pick={on:true,ev:ev||null,cb:opts.cb||null,sel:null,onlyPick:!!opts.onlyPick};
 $('pkTitle').innerHTML='';var b=el('b','',ev?ev.t:(opts.title||'Lugar'));$('pkTitle').appendChild(document.createTextNode('Lugar de '));$('pkTitle').appendChild(b);
 pkQ.value='';pkRes.textContent='';pkNone.hidden=!(ev?ev.place:opts.hasPlace);pkEl.hidden=false;cv.classList.add('pk');
 var init=opts.init||(ev&&ev.g?{n:ev.place,la:ev.lat,lo:ev.lon}:null);
 if(init){setSel(init);flyTo(init.lo,init.la,Math.max(view.k,2.4),900);}else{setSel(null);}
 updateNolug();
 setTimeout(function(){try{pkQ.focus({preventScroll:true});}catch(e){}},60);wake();
}
function endPick(done,val){
 var p=pick;pick={on:false};pkEl.hidden=true;cv.classList.remove('pk');wake();updateNolug();
 if(done){if(p.cb)p.cb(val);else if(p.ev)host.setPlace(p.ev.id,val);}
 else if(p.cb&&p.cb.cancel)p.cb.cancel();
 if(p.onlyPick&&api.opened)api.close();
 if(!p.onlyPick&&api.opened){/* continua no globo */}
}
pkOk.onclick=function(){if(pick.sel)endPick(true,pick.sel);};
pkNone.onclick=function(){endPick(true,null);};
$('pkX').onclick=function(){endPick(false);};

/* ---------- atualização e abertura ---------- */
function reload(){
 var fk=host.fkey?host.fkey():'';var fchg=lastFK!==null&&fk!==lastFK;lastFK=fk;
 loadData();syncTL.k=null;buildAxis();buildDots();buildPresets();
 if(fchg&&!pick.on)setTimeout(focusEvents,0);
 EVENTS.forEach(function(e){if(e.fresh){e.a=(e.y>=win.a&&e.y<=win.b)?1:0;}});
 updateNolug();syncTL();
 if(openKey){var op=openKey;var gs=GROUPS.filter(function(g){return op.split('|').indexOf(g.key)>=0;});if(gs.length&&card.classList.contains('open'))openCard(gs);else if(card.classList.contains('open'))closeCard();}
 wake();
}
var lastFK=null;
function focusEvents(){var g=EVENTS.filter(function(e){return e.on;}),w=g.filter(function(e){return e.y>=win.a&&e.y<=win.b;});if(w.length)g=w;if(!g.length)return;
 var x=0,y=0,z=0,R=Math.PI/180;g.forEach(function(e){var c=Math.cos(e.lat*R);x+=c*Math.cos(e.lon*R);y+=c*Math.sin(e.lon*R);z+=Math.sin(e.lat*R);});
 var n=Math.hypot(x,y,z);if(n<1e-6){homeView();return;}
 var lo=Math.atan2(y,x)/R,la=Math.asin(z/n)/R,mx=0;
 g.forEach(function(e){var a=Math.acos(Math.max(-1,Math.min(1,Math.sin(la*R)*Math.sin(e.lat*R)+Math.cos(la*R)*Math.cos(e.lat*R)*Math.cos((e.lon-lo)*R))))/R;if(a>mx)mx=a;});
 flyTo(lo,la,Math.max(1,Math.min(6,70/(mx+10))),1100);}
var api={opened:false,t:{view:view,win:win,eraA:eraA,mode:mode,hits:function(){return hits;},proj:proj,card:card,flyTo:flyTo,setWindow:setWindow,EVENTS:function(){return EVENTS;},NOLUG:function(){return NOLUG;},GROUPS:function(){return GROUPS;},startPick:startPick,pickAt:pickAt,pickState:function(){return pick;},searchPlaces:searchPlaces,placeAt:placeAt,PRESETS:function(){return PRESETS;}},
 open:function(h,opts){
  opts=opts||{};host=h;hostEl.hidden=false;api.opened=true;api.place();api.theme();layout();
  loadData();lastFK=h.fkey?h.fkey():'';
  var r=h.range&&h.range();var rr=r&&isFinite(r[0])&&isFinite(r[1])&&r[1]>r[0]?[Math.max(D0,r[0]),Math.min(D1,r[1])]:null;scrRange=rr;
  var w=rr||[D0,D1];win.a=w[0];win.b=w[1];winTween=null;setPlay(false);
  buildAxis();buildDots();buildPresets();
  EVENTS.forEach(function(e){e.a=(e.y>=win.a&&e.y<=win.b)?1:0;e.v=e.on?1:0;});
  syncTL.k=null;updateNolug();syncTL();closeCard();
  var pl=EVENTS.filter(function(e){return e.on&&e.a>0;});if(!pl.length)pl=EVENTS.filter(function(e){return e.on;});
  if(pl.length){var lo=0,la=0;pl.forEach(function(e){lo+=e.lon;la+=e.lat;});view.lon=lo/pl.length;view.lat=clampLat(la/pl.length);}
  view.k=1;wake();
  if(opts.focus&&byId[opts.focus]&&byId[opts.focus].g)selectEvent(byId[opts.focus]);
  if(opts.pick)startPick(null,{cb:opts.pick.cb,title:opts.pick.title,init:opts.pick.init,hasPlace:opts.pick.hasPlace,onlyPick:opts.pick.onlyPick});
 },
 close:function(){if(pick.on){var p=pick;pick={on:false};pkEl.hidden=true;cv.classList.remove('pk');if(p.cb&&p.cb.cancel)p.cb.cancel();}
  hostEl.hidden=true;api.opened=false;setPlay(false);closeCard();nolugList.hidden=true;if(host&&host.onClose)host.onClose();},
 refresh:function(){if(!api.opened)return;api.place();api.theme();reload();},
 theme:function(){if(host)hostEl.setAttribute('data-theme',host.dark()?'dark':'light');readPal();wake();},
 place:function(){if(host)hostEl.style.top=host.top()+'px';},
 pick:function(p,h){host=h||host;startPick(null,{cb:p.cb,title:p.title,init:p.init,hasPlace:p.hasPlace,onlyPick:false});},
 resize:function(){if(!api.opened)return;api.place();layout();},
 back:function(){if(!api.opened)return false;if(pick.on){endPick(false);return true;}if(!nolugList.hidden){nolugList.hidden=true;return true;}if(card.classList.contains('open')){closeCard();return true;}api.close();return true;}
};
$('back').onclick=function(){api.back();};
window.addEventListener('keydown',function(e){if(!api.opened||e.key!=='Escape')return;if(pick.on){endPick(false);e.stopPropagation();return;}if(!nolugList.hidden){nolugList.hidden=true;return;}if(card.classList.contains('open'))closeCard();},true);
layout();
return api;

}
var inst=null,loading=null;
function ensure(){
 if(inst)return Promise.resolve(inst);
 if(loading)return loading;
 loading=fetch(window.JTGLOBO_GEO||'globo/geo.json').then(function(r){if(!r.ok)throw new Error('geo '+r.status);return r.json();}).then(function(geo){
  var hostEl=document.createElement('div');hostEl.id='jtg-host';hostEl.hidden=true;document.body.appendChild(hostEl);
  var sr=hostEl.attachShadow({mode:'open'});var st=document.createElement('style');st.textContent=BASE+CSS;sr.appendChild(st);
  var wrap=document.createElement('div');wrap.style.cssText='display:contents';wrap.innerHTML=HTML;sr.appendChild(wrap);
  var ctlEl=document.createElement('div');ctlEl.id='jtg-ctl';ctlEl.hidden=true;
  var csr=ctlEl.attachShadow({mode:'open'});var cs=document.createElement('style');cs.textContent=BASE+CTL_CSS;csr.appendChild(cs);
  var cw=document.createElement('div');cw.className='cw';cw.innerHTML=CTL;csr.appendChild(cw);
  var fb=document.getElementById('fbar');(fb||document.body).appendChild(ctlEl);
  inst=build(sr,geo,hostEl,csr);inst.hostEl=hostEl;inst.ctlEl=ctlEl;
  new MutationObserver(function(){ctlEl.hidden=hostEl.hidden;if(fb&&window.matchMedia('(max-width:720px)').matches)fb.style.flexWrap=hostEl.hidden?'':'wrap';var t=hostEl.getAttribute('data-theme');if(t)ctlEl.setAttribute('data-theme',t);if(!hostEl.hidden){inst.place();inst.resize();}}).observe(hostEl,{attributes:true,attributeFilter:['hidden','data-theme']});
  return inst;
 }).catch(function(e){loading=null;throw e;});
 return loading;
}
window.JTGlobo={
 load:ensure,
 open:function(h,o){return ensure().then(function(i){i.open(h,o);return i;});},
 pick:function(h,p){return ensure().then(function(i){if(i.opened)i.pick(p,h);else{p.onlyPick=true;i.open(h,{pick:p});}return i;});},
 isOpen:function(){return !!(inst&&inst.opened);},
 refresh:function(){if(inst)inst.refresh();},
 theme:function(){if(inst)inst.theme();},
 resize:function(){if(inst)inst.resize();},
 back:function(){return inst?inst.back():false;},
 _i:function(){return inst;}
};
