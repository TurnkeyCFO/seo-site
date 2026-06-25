/* ===========================================================
   TURNKEY SEO — shared interaction layer
   =========================================================== */
(function(){
  var reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine=matchMedia('(hover:hover) and (pointer:fine)').matches;
  var mob=matchMedia('(max-width:920px)').matches;
  var hasG=window.gsap&&window.ScrollTrigger;
  if(hasG) gsap.registerPlugin(ScrollTrigger);

  /* ---- word-mask splitter (preserves inner spans like .shine) ---- */
  function splitWords(h){
    if(!h||h.dataset.split)return[];h.dataset.split='1';
    var out=[],kids=Array.prototype.slice.call(h.childNodes);h.innerHTML='';
    kids.forEach(function(n){
      if(n.nodeType===3){
        n.textContent.split(/(\s+)/).forEach(function(tok){
          if(tok.trim()===''){ if(tok.length)h.appendChild(document.createTextNode(' ')); return; }
          var m=document.createElement('span');m.className='m';
          var w=document.createElement('span');w.className='w';w.textContent=tok;
          m.appendChild(w);h.appendChild(m);out.push(w);
        });
      }else{
        var m=document.createElement('span');m.className='m';
        var w=document.createElement('span');w.className='w';
        w.appendChild(n.cloneNode(true));m.appendChild(w);h.appendChild(m);out.push(w);
      }
    });
    return out;
  }

  /* ================= WebGL fire hero ================= */
  (function(){
    var cv=document.getElementById('gl');if(!cv||!window.THREE)return;
    if(reduce||(navigator.connection&&navigator.connection.saveData)){cv.style.display='none';return;}
    var rnd;try{rnd=new THREE.WebGLRenderer({canvas:cv,antialias:false,alpha:false,powerPreference:'low-power'});}catch(e){cv.style.display='none';return;}
    rnd.setPixelRatio(1);var RSCALE=mob?0.6:0.72;
    var scene=new THREE.Scene(),cam=new THREE.Camera();
    var u={uTime:{value:0},uMouse:{value:new THREE.Vector2(.5,.5)},uFlow:{value:0},uRes:{value:new THREE.Vector2(1,1)}};
    var f=[
'precision highp float;varying vec2 vUv;uniform float uTime;uniform vec2 uMouse;uniform float uFlow;uniform vec2 uRes;',
'float hash(vec2 p){p=fract(p*vec2(123.34,345.45));p+=dot(p,p+34.345);return fract(p.x*p.y);}',
'float n(vec2 p){vec2 i=floor(p),f=fract(p);float a=hash(i),b=hash(i+vec2(1,0)),c=hash(i+vec2(0,1)),d=hash(i+vec2(1,1));vec2 u=f*f*(3.-2.*f);return mix(a,b,u.x)+(c-a)*u.y*(1.-u.x)+(d-b)*u.x*u.y;}',
'float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=a*n(p);p*=2.02;a*=.5;}return v;}',
'vec2 rot(vec2 p,float a){float c=cos(a),s=sin(a);return mat2(c,-s,s,c)*p;}',
'void main(){',
'vec2 uv=vUv;float asp=uRes.x/uRes.y;vec2 p=(uv-.5)*vec2(asp,1.);float t=uTime*.10;',
'float fly=uFlow;',
'p*=(1.0-0.42*fly);p+=vec2(0.10*fly,-0.30*fly);',
// rotate so the fire ribbon sweeps upward to the right (launch trajectory)
'vec2 q=rot(p,-.42);',
'vec2 warp=vec2(fbm(q*1.2+vec2(t*1.4,0.)),fbm(q*1.2+vec2(5.2,t*1.1)));',
'vec2 qw=q+(warp-.5)*1.0;',
'float rid=fbm(qw*1.8+vec2(-t*1.6,t*.7));',
'float vein=1.-abs(rid-.5)*2.;vein=pow(clamp(vein,0.,1.),2.2);',
// primary ribbon
'float disp=.30*sin(qw.x*.9+t*1.6)+.30*(fbm(qw*0.9+vec2(t,0.))-.5);',
'float d=qw.y-disp+.02;float band=exp(-d*d*2.6);',
// secondary ribbon (depth)
'float disp2=.34*sin(qw.x*.6-t)+.40*(fbm(qw*1.0-vec2(t*.7,1.2))-.5)-.28;',
'float d2=qw.y-disp2;float band2=exp(-d2*d2*1.7);',
'float cloud=smoothstep(.2,1.05,fbm(qw*1.0+vec2(t*.6,-t)));',
'float pulse=.8+.4*sin(t*3.4+qw.x*1.7);',
'float side=smoothstep(-1.15,.95,q.x);',
'float energy=(band*.62+band2*.4)*(.45+vein*1.6)*pulse;',
'float md=distance(p,(uMouse-.5)*vec2(asp,1.));float mlift=.13*exp(-md*md*2.2);',
'float g=clamp((energy+cloud*.18)*side+mlift,0.,2.6);',
// fire color ramp magenta -> orange -> yellow
'vec3 base=mix(vec3(.030,.010,.052),vec3(.012,.004,.022),uv.y);',
'float hue=clamp(.5+qw.x*.34+rid*.5,0.,1.);',
'vec3 magenta=vec3(1.0,0.082,0.392);vec3 orange=vec3(1.0,0.42,0.0);vec3 yellow=vec3(1.0,0.82,0.0);',
'vec3 rib=mix(magenta,orange,smoothstep(0.0,0.55,hue));rib=mix(rib,yellow,smoothstep(0.5,1.0,hue));',
'vec3 col=base+g*rib;',
'col+=pow(g,3.)*yellow*.5;',                            // hot core
'col+=pow(clamp(vein*band,0.,1.),3.)*vec3(1.,.7,.35)*.5*side;',
// rising embers
'vec2 sg=uv*uRes*.5;sg.y-=uTime*uRes.y*.03+fly*uRes.y*.9;sg.x-=fly*uRes.x*.16;float st=hash(floor(sg));',
'float ember=step(.9986,st)*(.5+.5*sin(t*8.+st*40.));',
'col+=ember*vec3(1.,.75,.3)*.9*side;',
// vignette + dither
'col*=.86+.2*smoothstep(1.7,.1,length(uv-.5));',
'col+=(hash(uv*uRes+uTime)-.5)*.012;',
'gl_FragColor=vec4(col,1.);}'].join('\n');
    var mat=new THREE.ShaderMaterial({uniforms:u,vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position,1.);}',fragmentShader:f});
    scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2,2),mat));
    function sz(){var w=Math.max(1,Math.round(cv.clientWidth*RSCALE)),h=Math.max(1,Math.round(cv.clientHeight*RSCALE));rnd.setSize(w,h,false);u.uRes.value.set(w,h);}
    sz();addEventListener('resize',sz);
    var hero=cv.closest('.hero')||document.body,vis=true;
    new IntersectionObserver(function(e){vis=e[0].isIntersecting;}).observe(hero);
    var tmx=.5,tmy=.5;
    if(fine)addEventListener('mousemove',function(e){tmx=e.clientX/innerWidth;tmy=1-e.clientY/innerHeight;},{passive:true});
    var t0=Date.now(),lastF=0,minDt=mob?40:30;
    (function loop(){requestAnimationFrame(loop);if(!vis)return;var nowT=Date.now();if(nowT-lastF<minDt)return;lastF=nowT;
      u.uTime.value=(nowT-t0)/1000;
      u.uMouse.value.x+=(tmx-u.uMouse.value.x)*.04;u.uMouse.value.y+=(tmy-u.uMouse.value.y)*.04;
      rnd.render(scene,cam);})();
    if(hasG)gsap.to(u.uFlow,{value:1,ease:'none',scrollTrigger:{trigger:document.documentElement,start:'top top',end:'bottom bottom',scrub:.5}});
  })();

  /* ================= Lenis ================= */
  var lenis;
  if(!reduce&&window.Lenis){
    lenis=new Lenis({lerp:.1,smoothWheel:true});
    lenis.on('scroll',function(){if(window.ScrollTrigger)ScrollTrigger.update();});
    gsap.ticker.add(function(t){lenis.raf(t*1000);});gsap.ticker.lagSmoothing(0);
    document.querySelectorAll('a[href^="#"]').forEach(function(a){
      a.addEventListener('click',function(e){var id=a.getAttribute('href');if(id.length<2)return;var el=document.querySelector(id);if(!el)return;e.preventDefault();lenis.scrollTo(el,{offset:-70});closeMenu();});
    });
  }

  /* ================= preloader + first-visit gate ================= */
  var pre=document.getElementById('pre'),pn=document.getElementById('preNum');
  var curtain=document.getElementById('curtain');
  var firstVisit=!sessionStorage.getItem('tkseo_seen');
  var done=false;

  function startHero(){
    var h1=document.querySelector('h1.disp');var hw=splitWords(h1);
    if(hasG&&hw.length){
      gsap.set(hw,{y:function(i,el){return el.offsetHeight*1.15;}});
      gsap.to(hw,{y:0,duration:1.05,ease:'power4.out',stagger:.06,delay:.05});
      gsap.to('.hero .rv',{opacity:1,y:0,duration:1,ease:'power3.out',stagger:.1,delay:.4});
    }else{document.querySelectorAll('.w').forEach(function(w){w.style.transform='none';});document.querySelectorAll('.hero .rv').forEach(function(e){e.style.opacity=1;e.style.transform='none';});}
  }
  function finish(){
    if(done)return;done=true;
    if(pre){pre.classList.add('done');setTimeout(function(){pre.style.display='none';},1100);}
    document.body.classList.remove('lock');
    if(lenis)lenis.scrollTo(0,{immediate:true});
    revealAll();
    if(window.ScrollTrigger)ScrollTrigger.refresh();
    requestAnimationFrame(function(){requestAnimationFrame(startHero);});
    sessionStorage.setItem('tkseo_seen','1');
  }

  if(firstVisit&&pre&&hasG){
    var o={v:0};
    gsap.to(o,{v:100,duration:1.4,ease:'power2.inOut',onUpdate:function(){if(pn)pn.textContent=Math.round(o.v)+'%';},onComplete:function(){gsap.delayedCall(.12,finish);}});
  }else{
    // returning visitor / no gsap: quick reveal, skip the count
    if(pre)pre.style.display='none';
    if(curtain&&hasG){curtain.style.transform='scaleY(1)';curtain.style.transformOrigin='top';
      requestAnimationFrame(function(){curtain.classList.add('out');setTimeout(function(){curtain.style.transform='';curtain.classList.remove('out');},700);});}
    finish();
  }
  setTimeout(finish,4200); // safety

  /* ================= reveals ================= */
  function revealAll(){
    if(!hasG){document.querySelectorAll('.rv,.w').forEach(function(e){e.style.opacity=1;e.style.transform='none';});return;}
    document.querySelectorAll('h2.rwords,h3.rwords').forEach(function(h){
      var ws=splitWords(h);if(!ws.length)return;
      gsap.set(ws,{y:function(i,el){return el.offsetHeight*1.15;}});
      gsap.to(ws,{y:0,duration:1,ease:'power4.out',stagger:.045,scrollTrigger:{trigger:h,start:'top 88%'}});
    });
    gsap.utils.toArray('.rv').forEach(function(el){
      if(el.closest('.hero'))return;
      gsap.to(el,{opacity:1,y:0,duration:.9,ease:'power3.out',scrollTrigger:{trigger:el,start:'top 90%'}});
    });
    gsap.utils.toArray('[data-count]').forEach(function(el){
      var end=+el.getAttribute('data-count'),o={v:0};
      ScrollTrigger.create({trigger:el,start:'top 90%',once:true,onEnter:function(){gsap.to(o,{v:end,duration:1.5,ease:'power2.out',onUpdate:function(){el.textContent=Math.round(o.v);}});}});
    });
    // marquees
    document.querySelectorAll('.marq .t').forEach(function(t){
      t.innerHTML+=t.innerHTML;var mx=0,base=.6;
      gsap.ticker.add(function(){mx-=base;var w=t.scrollWidth/2;if(-mx>=w)mx+=w;t.style.transform='translateX('+mx+'px)';});
      ScrollTrigger.create({onUpdate:function(self){base=.6+Math.min(Math.abs(self.getVelocity()/300),8);}});
    });
    // process number parallax
    gsap.utils.toArray('.prow').forEach(function(row){
      var pn=row.querySelector('.pn');if(pn)gsap.fromTo(pn,{y:40},{y:-40,ease:'none',scrollTrigger:{trigger:row,start:'top bottom',end:'bottom top',scrub:true}});
    });
    // animated bar charts
    gsap.utils.toArray('.chart').forEach(function(ch){
      var bars=ch.querySelectorAll('.bar');
      bars.forEach(function(b,i){var hpct=+(b.dataset.h||60);
        gsap.fromTo(b,{scaleY:0},{scaleY:hpct/100,duration:1.1,ease:'power3.out',delay:i*.08,scrollTrigger:{trigger:ch,start:'top 82%',once:true}});});
    });
    // footer drift
    var fb=document.querySelector('.foot-big');if(fb)gsap.fromTo(fb,{x:-60},{x:30,ease:'none',scrollTrigger:{trigger:'footer',start:'top bottom',end:'bottom top',scrub:true}});
    // progress
    gsap.to('.prog',{width:'100%',ease:'none',scrollTrigger:{trigger:document.body,start:'top top',end:'bottom bottom',scrub:true}});
    // header scrolled
    ScrollTrigger.create({start:'top -50',onUpdate:function(s){var h=document.querySelector('header');if(h)h.classList.toggle('scrolled',s.scroll()>50);}});
  }

  /* ================= cursor + magnetic + draggable ================= */
  if(fine){
    var cur=document.getElementById('cur'),cd=document.getElementById('curD');
    if(cur){var mx=innerWidth/2,my=innerHeight/2,cx=mx,cy=my,lbl=cur.querySelector('.lbl');
      addEventListener('mousemove',function(e){mx=e.clientX;my=e.clientY;if(cd)cd.style.transform='translate('+mx+'px,'+my+'px) translate(-50%,-50%)';},{passive:true});
      (function cl(){cx+=(mx-cx)*.16;cy+=(my-cy)*.16;cur.style.transform='translate('+cx+'px,'+cy+'px) translate(-50%,-50%)';requestAnimationFrame(cl);})();
      document.querySelectorAll('a,button,input,textarea,summary,[data-cursor]').forEach(function(el){
        el.addEventListener('mouseenter',function(){if(!el.hasAttribute('data-cursor-label'))cur.classList.add('grow');});
        el.addEventListener('mouseleave',function(){cur.classList.remove('grow');});
      });
      document.querySelectorAll('[data-cursor-label]').forEach(function(el){
        el.addEventListener('mouseenter',function(){if(lbl)lbl.textContent=el.getAttribute('data-cursor-label');cur.classList.add('label');cur.classList.remove('grow');if(cd)cd.style.opacity=0;});
        el.addEventListener('mouseleave',function(){cur.classList.remove('label');if(cd)cd.style.opacity=1;});
      });
    }
    document.querySelectorAll('.magnetic').forEach(function(el){
      el.addEventListener('mousemove',function(e){var r=el.getBoundingClientRect();el.style.transform='translate('+(e.clientX-(r.left+r.width/2))*.3+'px,'+(e.clientY-(r.top+r.height/2))*.45+'px)';});
      el.addEventListener('mouseleave',function(){el.style.transform='';});
    });
    var tr=document.getElementById('workTrack');
    if(tr){var dn=false,sx=0,sl=0,mv=0;
      tr.addEventListener('mousedown',function(e){dn=true;mv=0;sx=e.pageX;sl=tr.scrollLeft;tr.classList.add('drag');});
      addEventListener('mouseup',function(){dn=false;tr.classList.remove('drag');});
      tr.addEventListener('mousemove',function(e){if(!dn)return;e.preventDefault();mv+=Math.abs(e.movementX);tr.scrollLeft=sl-(e.pageX-sx)*1.25;});
      tr.addEventListener('click',function(e){if(mv>6){e.preventDefault();e.stopPropagation();}},true);
    }
  }

  /* ================= mobile menu ================= */
  var menuBtn=document.querySelector('.menu-btn'),mnav=document.querySelector('.mnav');
  function closeMenu(){if(menuBtn)menuBtn.classList.remove('open');if(mnav)mnav.classList.remove('open');document.body.classList.remove('lock');}
  if(menuBtn&&mnav){menuBtn.addEventListener('click',function(){var open=mnav.classList.toggle('open');menuBtn.classList.toggle('open',open);document.body.classList.toggle('lock',open);});}

  /* ================= page-transition wipes ================= */
  if(curtain){
    document.querySelectorAll('a[href]').forEach(function(a){
      var href=a.getAttribute('href');
      if(!href||href[0]==='#'||a.target==='_blank'||href.indexOf('http')===0||href.indexOf('mailto:')===0||href.indexOf('tel:')===0)return;
      a.addEventListener('click',function(e){
        if(e.metaKey||e.ctrlKey||e.shiftKey)return;
        e.preventDefault();closeMenu();
        if(reduce){location.href=href;return;}
        curtain.classList.remove('out');curtain.style.transformOrigin='bottom';curtain.classList.add('in');
        setTimeout(function(){location.href=href;},540);
      });
    });
  }

  /* ================= SERP climb (home) ================= */
  (function(){
    var serp=document.getElementById('serp');if(!serp)return;
    var competitors=['directory-listings.com','yelp.com/biz','angi.com/companylist','thumbtack.com/pro','localsearch-hub.com','manta.com','citysearch.com','bbb.org/profile'];
    function esc(s){return s.replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
    function cap(s){return s.split('.')[0].replace(/-/g,' ').replace(/\b\w/g,function(m){return m.toUpperCase();});}
    function render(kw,you){
      var rows=[];
      for(var i=1;i<=8;i++){
        if(i===you){rows.push('<div class="result you"><div class="rank">#'+i+'</div><div><div class="t">Your Business — '+esc(kw)+'</div><div class="u">yourbusiness.com › book-now</div></div><div class="badge">You</div></div>');}
        else{var c=competitors[(i-1)%competitors.length];rows.push('<div class="result"><div class="rank">#'+i+'</div><div><div class="t">'+cap(c)+'</div><div class="u">'+c+'</div></div></div>');}
      }
      serp.innerHTML=rows.join('');
    }
    var kwIn=document.getElementById('kw'),btn=document.getElementById('runClimb'),iv=null;
    function run(){
      if(iv)clearInterval(iv);
      var kw=(kwIn.value||'best plumber near me').trim();
      var ranks=[8,8,7,6,4,3,2,1,1],step=0;render(kw,ranks[0]);
      iv=setInterval(function(){step++;if(step>=ranks.length){clearInterval(iv);iv=null;return;}render(kw,ranks[step]);},340);
    }
    if(btn)btn.addEventListener('click',run);
    if(kwIn)kwIn.addEventListener('keydown',function(e){if(e.key==='Enter')run();});
    render(kwIn?kwIn.value:'best plumber near me',8);
    if(hasG)ScrollTrigger.create({trigger:serp,start:'top 72%',once:true,onEnter:run});
  })();

  /* year stamp */
  document.querySelectorAll('.yr').forEach(function(e){e.textContent=new Date().getFullYear();});
})();
