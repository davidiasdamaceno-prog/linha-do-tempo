const fs=require('fs');
const {topology}=require('topojson-server');const {presimplify,simplify,quantile}=require('topojson-simplify');
const tc=require('topojson-client');const {geoCentroid}=require('d3-geo');
const p=+process.argv[2]||0.8;
const g50=JSON.parse(fs.readFileSync('dl/ne50_admin1.geojson')), g10=JSON.parse(fs.readFileSync('dl/ne10_admin1.geojson'));
const feats=[];
function add(f,c,grp,label,short){feats.push({type:'Feature',properties:{c,g:grp,n:label,u:short},geometry:f.geometry});}
g50.features.filter(f=>f.properties.admin==='Brazil').forEach(f=>add(f,'BR',f.properties.postal,f.properties.name,f.properties.postal));
g50.features.filter(f=>f.properties.admin==='United States of America').forEach(f=>add(f,'US',f.properties.postal,f.properties.name,f.properties.postal));
g50.features.filter(f=>f.properties.admin==='Russia').forEach(f=>add(f,'RU',f.properties.name,f.properties.name,null));
g10.features.filter(f=>f.properties.admin==='France'&&f.properties.type_en==='Metropolitan department').forEach(f=>add(f,'FR',f.properties.region.trim(),f.properties.region.trim(),null));
g10.features.filter(f=>f.properties.admin==='United Kingdom').forEach(f=>add(f,'GB',f.properties.geonunit,f.properties.geonunit,null));
g10.features.filter(f=>f.properties.admin==='Italy').forEach(f=>add(f,'IT',f.properties.region,f.properties.region==='Apulia'?'Puglia':f.properties.region==='Sicily'?'Sicilia':f.properties.region,null));
g10.features.filter(f=>f.properties.admin==='Germany').forEach(f=>add(f,'DE',f.properties.name,f.properties.name,null));
console.log('feições',feats.length);
// rótulos: centróide por grupo
const groups={};feats.forEach(f=>{const k=f.properties.c+'|'+f.properties.g;(groups[k]=groups[k]||[]).push(f);});
const labels=Object.keys(groups).map(k=>{const fs_=groups[k];const c=geoCentroid({type:'FeatureCollection',features:fs_});const p0=fs_[0].properties;return {u:p0.u||null,n:p0.n,c:p0.c,x:+c[0].toFixed(2),y:+c[1].toFixed(2)};});
let t=topology({e:{type:'FeatureCollection',features:feats}},1e5);
t=presimplify(t);t=simplify(t,quantile(t,p));
const geom=t.objects.e.geometries;
const mesh=tc.mesh(t,t.objects.e,(a,b)=>a!==b&&a.properties.c===b.properties.c&&a.properties.g!==b.properties.g);
const r=(x)=>+x.toFixed(2);
mesh.coordinates=mesh.coordinates.map(l=>l.map(pt=>[r(pt[0]),r(pt[1])]));
// remove pontos repetidos após arredondar
mesh.coordinates=mesh.coordinates.map(l=>l.filter((pt,i)=>i===0||pt[0]!==l[i-1][0]||pt[1]!==l[i-1][1])).filter(l=>l.length>1);
const out={lines:mesh,labels};
const s=JSON.stringify(out);fs.writeFileSync('divs.json',s);console.log('p',p,'bytes',s.length,'linhas',mesh.coordinates.length,'rótulos',labels.length);
