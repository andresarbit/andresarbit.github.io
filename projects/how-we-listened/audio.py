import numpy as np, json, wave
from scipy import signal
SR=48000; DUR=100.0; N=int(SR*DUR)
rng=np.random.default_rng(11)
def env(n,a,d):  # attack seconds, exp decay time const
    t=np.arange(n)/SR; e=np.minimum(1,t/max(a,1e-4))*np.exp(-np.maximum(0,t-a)/d); return e
def bp(x,lo,hi,o=2): b,a=signal.butter(o,[lo/(SR/2),hi/(SR/2)],'band'); return signal.lfilter(b,a,x)
def lp(x,f,o=2): b,a=signal.butter(o,f/(SR/2)); return signal.lfilter(b,a,x)
def hp(x,f,o=2): b,a=signal.butter(o,f/(SR/2),'high'); return signal.lfilter(b,a,x)
def place(buf,x,t,g=1.0,pan=0.0):
    i=int(t*SR)
    if i>=N: return
    x=x[:N-i]
    l=np.cos((pan+1)*np.pi/4); r=np.sin((pan+1)*np.pi/4)
    buf[0,i:i+len(x)]+=x*g*l*1.41; buf[1,i:i+len(x)]+=x*g*r*1.41

# ---------------- MUSIC ----------------
bpm=112; beat=60/bpm; bar=beat*4
mus=np.zeros((2,N))
def kick():
    n=int(.35*SR); t=np.arange(n)/SR
    f=45+110*np.exp(-t*28); ph=2*np.pi*np.cumsum(f)/SR
    return np.sin(ph)*env(n,.002,.12)*1.0 + hp(rng.normal(0,1,n),2000)*env(n,.0005,.006)*.3
def snare():
    n=int(.3*SR); t=np.arange(n)/SR
    body=np.sin(2*np.pi*185*t)*env(n,.001,.05)*.5
    nz=bp(rng.normal(0,1,n),1200,8000)*env(n,.001,.11)*.9
    return body+nz
def hat(open_=False):
    n=int((.35 if open_ else .06)*SR)
    return hp(rng.normal(0,1,n),7000,4)*env(n,.0005,.12 if open_ else .018)*.35
K,Sn,Hc,Ho=kick(),snare(),hat(),hat(True)
def ks(freq,dur,damp=0.996,bright=0.5):
    n=int(dur*SR); p=int(SR/freq); buf=rng.uniform(-1,1,p); out=np.zeros(n)
    for i in range(n):
        out[i]=buf[i%p]; nb=damp*(bright*buf[i%p]+(1-bright)*buf[(i+1)%p]); buf[i%p]=nb
    return out
# precompute guitar power chords & bass notes
notes={'E':82.41,'C':65.41*2/2*1.0,'G':98.0,'D':73.42}
notes['C']=65.41*2  # C3 = 130.8? keep low: use C3 for power chord root
roots={'E':82.41,'C':65.41,'G':98.0,'D':73.42}
prog=['E','C','G','D']
cache={}
def pchord(r,dur,mute):
    key=(r,round(dur,3),mute)
    if key in cache: return cache[key]
    f=roots[r]*2 if r in ('C','D') else roots[r]
    s=ks(f,dur,0.985 if mute else 0.997,0.5)+ks(f*1.4983,dur,0.985 if mute else 0.997,0.5)*.8+ks(f*2,dur,0.985 if mute else 0.997,0.5)*.6
    s=np.tanh(s*6)  # distortion
    s=lp(s,3800,2); s=hp(s,110)
    s*=env(len(s),.003,.09 if mute else .9)
    cache[key]=s*.22; return cache[key]
bassc={}
def bassn(r,dur):
    key=(r,round(dur,3))
    if key in bassc: return bassc[key]
    n=int(dur*SR); t=np.arange(n)/SR; f=roots[r]/2*2  # E2 ~82 -> use E1? keep 41-82
    f=roots[r]
    x=signal.sawtooth(2*np.pi*f*t)*.6+np.sin(2*np.pi*f*t)*.8
    x=lp(np.tanh(x*1.5),900,2)*env(n,.004,dur*0.9)
    bassc[key]=x*.32; return bassc[key]
def section(t):
    if t<6.0: return 'intro'
    if 80.9<=t<90.8: return 'break'
    if t>=97.0: return 'end'
    return 'full'
nbars=int(DUR/bar)+1
for b in range(nbars):
    t0=b*bar; r=prog[b%4]
    sec=section(t0+0.01)
    for s8 in range(8):
        tt=t0+s8*beat/2
        if tt>=DUR-0.5: continue
        sec=section(tt)
        if sec=='end' and tt>97.5: continue
        # drums
        if sec in ('full','end'):
            if s8 in (0,4) or (s8==5 and b%2==1): place(mus,K,tt,.9)
            if s8 in (2,6): place(mus,Sn,tt,.55,0.05)
            place(mus,Ho if (s8==7 and b%4==3) else Hc,tt,.5 if s8%2 else .32,0.25)
        elif sec=='break':
            if s8==0: place(mus,K,tt,.8)
            if s8==4: place(mus,Sn,tt,.4)
            if s8%2==0: place(mus,Hc,tt,.25,0.25)
        elif sec=='intro':
            if s8 in (0,4) and t0>=bar*1: place(mus,K,tt,.6)
            place(mus,Hc,tt,.22,0.25)
        # bass
        if sec!='intro' or t0>=bar*1:
            place(mus,bassn(r,beat/2*0.92),tt,.9 if sec!='break' else .6)
        # guitar
        if sec=='full':
            place(mus,pchord(r,beat/2,True),tt,.8,-0.35)
            place(mus,pchord(r,beat/2,True),tt+0.012,.6,0.35)
        elif sec=='break' and s8==0:
            place(mus,pchord(r,bar,False),tt,.7,-0.3); place(mus,pchord(r,bar,False),tt+0.015,.6,0.3)
# final hit
place(mus,K,97.03,1.0); place(mus,pchord('E',3.0,False),97.03,1.1,-0.3); place(mus,pchord('E',3.0,False),97.05,1.0,0.3); place(mus,Ho,97.03,.6)
# intro filter sweep
fade_in=np.clip(np.arange(N)/SR/1.2,0,1)
mus*=fade_in
mus[:, -int(1.0*SR):]*=np.linspace(1,0,int(1.0*SR))
# ---------------- SFX ----------------
sfx=np.zeros((2,N))
def noise(n): return rng.normal(0,1,n)
def s_slap():
    n=int(.12*SR); x=bp(noise(n),700,4500)*env(n,.0008,.018)
    t=np.arange(n)/SR; th=np.sin(2*np.pi*(140*np.exp(-t*20)+60)*t)*env(n,.001,.03)*.7
    return (x*.9+th)*.8
def s_pop():
    n=int(.03*SR); return hp(noise(n),2500)*env(n,.0005,.004)*.5
def s_whoosh(d=.42):
    n=int(d*SR); x=noise(n); out=np.zeros(n); seg=512
    for i in range(0,n,seg):
        p=i/n; f=300+2600*p**1.3
        out[i:i+seg]=bp(x[i:i+seg],f*0.7,min(f*1.4,20000))
    e=np.sin(np.pi*np.linspace(0,1,n))**2
    return lp(out,6000)*e*1.1
def s_swish(): return s_whoosh(.22)*.6
def s_thud():
    n=int(.4*SR); t=np.arange(n)/SR
    return np.sin(2*np.pi*(55+60*np.exp(-t*25))*t)*env(n,.001,.12)*1.3 + bp(noise(n),300,3000)*env(n,.0005,.02)*.9
def s_tick():
    n=int(.012*SR); t=np.arange(n)/SR; return np.sin(2*np.pi*2400*t)*env(n,.0003,.003)*.5
def s_scribble():
    n=int(.45*SR); x=bp(noise(n),2000,6000); t=np.arange(n)/SR
    am=0.5+0.5*np.sin(2*np.pi*11*t)**2
    return x*am*np.sin(np.pi*t/t[-1])*.22
def s_glitch():
    n=int(.3*SR); x=np.sign(noise(n))*0.3; x=np.repeat(x[::40],40)[:n]
    g=np.ones(n); g[(np.arange(n)//1500)%2==1]=0.15
    t=np.arange(n)/SR
    return (x*g + signal.square(2*np.pi*(880+600*np.sin(t*80))*t)*.15)*env(n,.001,.12)*.6
def s_skip():
    out=np.zeros(int(.6*SR))
    for k,o in enumerate([0,.09,.18,.27]):
        c=hp(noise(int(.012*SR)),1500)*.8; i=int(o*SR); out[i:i+len(c)]+=c
        n=int(.06*SR); t=np.arange(n)/SR; out[i:i+n]+=signal.square(2*np.pi*(320+k*40)*t)*.12*env(n,.001,.02)
    return out
def s_ring():
    seq=[(1318,.08),(0,.03),(1568,.08),(0,.03),(1318,.08),(0,.03),(1760,.14)]
    out=[]
    for f,d in seq:
        n=int(d*SR); t=np.arange(n)/SR
        out.append(signal.square(2*np.pi*f*t)*.12 if f else np.zeros(n))
    x=np.concatenate(out); return lp(x,5000)
def s_thock():
    n=int(.15*SR); t=np.arange(n)/SR
    return (np.sin(2*np.pi*190*t)*env(n,.001,.04)*.8+bp(noise(n),500,2500)*env(n,.0005,.015)*.6)
F={'slap':s_slap,'pop':s_pop,'whoosh':s_whoosh,'swish':s_swish,'thud':s_thud,'tick':s_tick,'scribble':s_scribble,'glitch':s_glitch,'skip':s_skip,'ring':s_ring,'thock':s_thock}
G={'slap':.55,'pop':.22,'whoosh':.32,'swish':.18,'thud':.7,'tick':.16,'scribble':.25,'glitch':.22,'skip':.5,'ring':.35,'thock':.45}
cues=json.load(open('cues.json'))
last={}
for c in sorted(cues,key=lambda c:c['t']):
    ty=c['type']
    if ty=='pop' and c['t']-last.get('pop',-9)<0.05: continue
    if ty=='slap' and c['t']-last.get('slap',-9)<0.04: continue
    last[ty]=c['t']
    x=F[ty]() if ty not in ('slap','pop') else F[ty]()
    place(sfx,x,max(0,c['t']-(0.15 if ty=='whoosh' else 0.0)),G[ty]*c['vol'],float(rng.uniform(-.4,.4)))
# ---------------- VO + ducking ----------------
w=wave.open('vo_edit.wav'); vsr=w.getframerate(); v=np.frombuffer(w.readframes(w.getnframes()),dtype=np.int16).astype(float)/32768
if w.getnchannels()==2: v=v.reshape(-1,2).mean(1)
v=signal.resample_poly(v,SR,vsr)
vo=np.zeros(N); off=int(0.6*SR); vo[off:off+len(v)]=v[:N-off]
envv=np.abs(vo); envv=lp(envv,6,1); envv=envv/ (envv.max()+1e-9)
duck=1-0.55*np.clip(envv*6,0,1)
duck=lp(duck,3,1)
mix_m=mus*duck*0.42
np.save('vo48.npy',vo)
def wr(name,x):
    x=np.clip(x,-1,1); d=(x.T*32767).astype(np.int16)
    ww=wave.open(name,'wb'); ww.setnchannels(2); ww.setsampwidth(2); ww.setframerate(SR); ww.writeframes(d.tobytes()); ww.close()
wr('music_bed.wav',mix_m); wr('sfx.wav',sfx*(0.8/np.abs(sfx).max()))
vv=np.stack([vo,vo]); wr('vo_track.wav',vv)
print('peaks',np.abs(mix_m).max(),np.abs(sfx).max(),np.abs(vo).max())
