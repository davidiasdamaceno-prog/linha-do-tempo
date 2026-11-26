import json,re,unicodedata,sys
sys.path.insert(0,'.')
def nz(s): return unicodedata.normalize('NFD',s).encode('ascii','ignore').decode().lower()
pp=json.load(open('dl/ne_10m_populated_places.geojson'))['features']
cn=json.load(open('dl/ne_110m_admin_0_countries.geojson'))['features']
ptn={}; ctry=[]
for f in cn:
    p=f['properties']; ptn[p['NAME']]=p['NAME_PT'] or p['NAME']
    ctry.append([p['NAME_PT'] or p['NAME'], p['NAME'] if nz(p['NAME'])!=nz(p['NAME_PT'] or '') else '', round(p['LABEL_Y'],2), round(p['LABEL_X'],2)])
# nomes de países (pt) para as cidades, pelo ADM0NAME em inglês
adm2pt={}
for f in cn:
    p=f['properties']; adm2pt[p['NAME']]=p['NAME_PT'] or p['NAME']; adm2pt[p['NAME_LONG']]=p['NAME_PT'] or p['NAME']; adm2pt[p['ADMIN']]=p['NAME_PT'] or p['NAME']
cn_list=[];cn_ix={}
def ci(name):
    if name not in cn_ix: cn_ix[name]=len(cn_list); cn_list.append(name)
    return cn_ix[name]
cities=[]
for f in pp:
    p=f['properties']; x,y=f['geometry']['coordinates']
    cap=(p['FEATURECLA'] or '').startswith('Admin-0 capital')
    if not (p['POP_MAX']>=100000 or (p['ADM0NAME']=='Brazil' and p['POP_MAX']>=30000) or cap): continue
    n=(p['NAME_PT'] or p['NAME']).strip(); en=p['NAME'].strip()
    c=adm2pt.get(p['ADM0NAME'],p['ADM0NAME'])
    row=[n,round(y,3),round(x,3),ci(c),int(p['POP_MAX'])]
    if nz(en)!=nz(n): row.append(en)
    cities.append(row)
# lugares históricos e extras (nomes em português do Brasil)
EX=[('Vila Rica (Ouro Preto)',-20.386,-43.504,'Brasil'),('Tordesilhas',41.50,-4.95,'Espanha'),('Canudos',-9.90,-39.15,'Brasil'),('Serra da Barriga (Palmares)',-9.16,-36.02,'Brasil'),
 ('Riacho do Ipiranga',-23.585,-46.609,'Brasil'),('Versalhes',48.80,2.12,'França'),('Waterloo',50.68,4.41,'Bélgica'),('Gettysburg',39.83,-77.23,'Estados Unidos'),
 ('Auschwitz',50.03,19.18,'Polônia'),('Stalingrado (Volgogrado)',48.71,44.51,'Rússia'),('Termópilas',38.80,22.54,'Grécia'),('Maratona',38.15,23.96,'Grécia'),
 ('Cartago',36.85,10.32,'Tunísia'),('Troia',39.96,26.24,'Turquia'),('Babilônia',32.54,44.42,'Iraque'),('Nínive',36.36,43.15,'Iraque'),('Tebas (Egito)',25.72,32.66,'Egito'),
 ('Cnossos',35.30,25.16,'Grécia'),('Jericó',31.87,35.44,'Palestina'),('Uruk',31.32,45.64,'Iraque'),('Wittenberg',51.87,12.65,'Alemanha'),('Trento',46.07,11.12,'Itália'),
 ('Constantinopla',41.01,28.98,'Turquia'),('Região das Minas (MG)',-19.95,-43.85,'Brasil'),('Bastilha (Paris)',48.853,2.369,'França'),('Monte Castelo',44.20,10.97,'Itália'),
 ('Volta Redonda',-22.52,-44.10,'Brasil'),('Itabira',-19.62,-43.23,'Brasil'),('Juazeiro do Norte',-7.21,-39.32,'Brasil'),('Hastings',50.86,0.58,'Reino Unido'),
 ('Saint-Domingue (Haiti)',19.0,-72.4,'Haiti'),('Plymouth',50.37,-4.14,'Reino Unido'),('Jamestown',37.21,-76.78,'Estados Unidos'),('Yalta',44.50,34.17,'Ucrânia'),('Potsdam',52.40,13.07,'Alemanha')]
for n,y,x,c in EX: cities.append([n,y,x,ci(c),5000000])
geo={'world':json.load(open('node_modules/world-atlas/countries-110m.json')),'divs':json.load(open('divs.json')),'cities':cities,'cn':cn_list,'ctry':ctry,'ptn':ptn}
s=json.dumps(geo,ensure_ascii=False,separators=(',',':'))
open('site/geo.json','w',encoding='utf-8').write(s)
print(len(cities),len(ctry),len(s))
