(function(){
  const reduce=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine=window.matchMedia('(pointer:fine)').matches;
  const body=document.body;
  document.documentElement.removeAttribute('data-motion');
  const header=document.querySelector('.site-header');
  const nav=document.querySelector('.nav-links');
  const navShell=document.querySelector('.site-header .nav');
  const menu=document.querySelector('.menu-toggle');
  const hero=document.querySelector('.hero');
  const heroSection=hero||document.querySelector('.project-hero');

  // A single editorial wipe gives every route a shared rhythm.
  const wipe=document.createElement('div');
  wipe.className='page-wipe';
  wipe.setAttribute('aria-hidden','true');
  const wipeMeta=document.createElement('div');
  wipeMeta.className='page-wipe-meta';
  wipeMeta.innerHTML='<span class="page-wipe-kicker">Étude de cas</span><strong class="page-wipe-title"></strong>';
  wipe.appendChild(wipeMeta);
  body.appendChild(wipe);
  const wipeTitle=wipe.querySelector('.page-wipe-title');
  const missMajesticLoadingImage=new URL('/assets/profile-loading-background.webp',location.origin).href;
  const missMajesticLoadingPreload=new Image();
  missMajesticLoadingPreload.decoding='async';
  missMajesticLoadingPreload.src=missMajesticLoadingImage;
  const titleTransitionMs=1100;
  const quickTransitionMs=680;
  wipe.style.setProperty('--wipe-background-image',`url("${missMajesticLoadingImage}")`);
  const pageTitle=path=>{
    const normalized=(path||location.pathname).toLowerCase();
    if(normalized.includes('/projets/respire'))return 'Respire';
    if(normalized.includes('/projets/lisiere'))return 'Lisière';
    if(normalized.includes('/projets/babbel'))return 'Babbel';
    if(normalized.includes('/contact'))return 'Parlons-en';
    return 'Miss Majestic';
  };
  const setWipeTitle=(path,show=true)=>{
    if(wipeTitle)wipeTitle.textContent=pageTitle(path);
    wipeMeta.classList.toggle('is-hidden',!show);
  };
  const setWipeAccent=path=>{
    const normalized=(path||'').toLowerCase();
    const palette=normalized.includes('/projets/respire')
      ?{accent:'#c59a68',background:'#ead9bf',ink:'#1d2824'}
      :normalized.includes('/projets/lisiere')
        ?{accent:'#c8d2b8',background:'#718267',ink:'#fffdf9'}
        :normalized.includes('/projets/babbel')
          ?{accent:'#ffd0b6',background:'#f26522',ink:'#fffdf9'}
          :{accent:'#71ddd4',background:'#171827',ink:'#fffdf9'};
    wipe.style.setProperty('--wipe-accent',palette.accent);
    wipe.style.setProperty('--wipe-bg',palette.background);
    wipe.style.setProperty('--wipe-ink',palette.ink);
  };
  const canonicalPath=path=>{
    const value=(path||'/').replace(/\/index(?:\.html)?$/,'/').replace(/\.html$/,'');
    return value||'/';
  };
  let incoming=null;
  try{
    const stored=JSON.parse(sessionStorage.getItem('portfolio-route-transition')||'null');
    sessionStorage.removeItem('portfolio-route-transition');
    const fresh=stored&&canonicalPath(stored.path)===canonicalPath(location.pathname)&&(Date.now()-(stored.at||0)<5000);
    if(fresh)incoming=stored;
  }catch{}
  const transitionMs=incoming?.duration||titleTransitionMs;
  const initialTitle=Boolean(incoming?.title);
  wipe.classList.toggle('is-quick',Boolean(incoming&&!initialTitle));
  setWipeTitle(incoming?.title?location.pathname:location.pathname,initialTitle);
  setWipeAccent(location.pathname);
  if(incoming?.preview){
    wipe.classList.add('has-preview');
    wipe.style.setProperty('--wipe-preview-image',`url("${incoming.preview}")`);
  }
  if(!reduce&&incoming){
    body.classList.add('page-enter');
    const enterStarted=performance.now();
    const waitForImage=image=>new Promise(resolve=>{
      if(!image){resolve();return;}
      const settle=()=>{
        const decoded=typeof image.decode==='function'
          ?image.decode().catch(()=>{})
          :Promise.resolve();
        decoded.then(()=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
      };
      if(image.complete){settle();return;}
      image.addEventListener('load',settle,{once:true});
      image.addEventListener('error',settle,{once:true});
    });
    const waitForUrl=url=>new Promise(resolve=>{
      if(!url){resolve();return;}
      const image=new Image();
      image.onload=resolve;
      image.onerror=resolve;
      image.src=url;
    });
    const criticalImages=[...document.querySelectorAll('.project-hero-media img,.hero-cutout-layer img')];
    const heroBackground=document.querySelector('.hero')&&getComputedStyle(document.querySelector('.hero')).backgroundImage;
    const backgroundUrl=heroBackground?.match(/url\(["']?([^"')]+)["']?\)/)?.[1];
    const fontsReady=document.fonts?.ready||Promise.resolve();
    const layoutReady=new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
    const contentReady=Promise.all([...criticalImages.map(waitForImage),waitForUrl(backgroundUrl),fontsReady,layoutReady]);
    const safetyTimeout=new Promise(resolve=>window.setTimeout(resolve,1800));
    Promise.race([contentReady,safetyTimeout]).then(()=>{
      const remaining=Math.max(0,transitionMs-(performance.now()-enterStarted));
      window.setTimeout(()=>body.classList.remove('page-enter'),remaining);
    });
  }

  // A browser Back/Forward restore can bring back the previous document with
  // its outgoing wipe still active. Always clear that transient state when a
  // page is restored from the bfcache so Back never leaves a dark loading veil.
  addEventListener('pageshow',event=>{
    if(!event.persisted&&!body.classList.contains('page-leave'))return;
    body.classList.remove('page-leave','page-enter');
    wipe.classList.remove('is-quick');
    wipe.classList.remove('has-preview');
    wipe.style.removeProperty('--wipe-preview-image');
    wipeMeta.classList.add('is-hidden');
  });

  const isPlainInternalLink=(link,url)=>{
    if(!link||!url||url.origin!==location.origin)return false;
    if(link.target==='_blank'||link.hasAttribute('download'))return false;
    if(link.hasAttribute('data-no-transition'))return false;
    if(canonicalPath(url.pathname)===canonicalPath(location.pathname))return false;
    return true;
  };
  let leaving=false;
  document.addEventListener('click',e=>{
    const link=e.target.closest('a[href]');
    if(!link||e.defaultPrevented||e.button!==0||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;
    let url;
    try{url=new URL(link.href,location.href)}catch{return}
    const sameDocumentRoute=url.origin===location.origin
      &&canonicalPath(url.pathname)===canonicalPath(location.pathname)
      &&url.hash===location.hash;
    if(sameDocumentRoute){e.preventDefault();return;}
    if(!isPlainInternalLink(link,url)||reduce||leaving)return;
    e.preventDefault();
    leaving=true;
    const isProject=url.pathname.includes('/projets/');
    const preview=link.querySelector('img');
    const previewUrl=preview?new URL(preview.currentSrc||preview.src,location.href).href:null;
    let titleCard=false;
    try{
      // Show the full editorial loading card on every project click.
      // The project title should never disappear after the first visit.
      titleCard=isProject;
      sessionStorage.setItem('portfolio-route-transition',JSON.stringify({path:canonicalPath(url.pathname),at:Date.now(),duration:titleCard?titleTransitionMs:quickTransitionMs,title:titleCard,titleText:pageTitle(url.pathname),preview:previewUrl}));
    }catch{}
    const leaveDuration=titleCard?titleTransitionMs:quickTransitionMs;
    wipe.classList.toggle('is-quick',!titleCard);
    setWipeTitle(url.pathname,titleCard);
    setWipeAccent(url.pathname);
    if(previewUrl){
      wipe.classList.add('has-preview');
      wipe.style.setProperty('--wipe-preview-image',`url("${previewUrl}")`);
    }else{
      wipe.classList.remove('has-preview');
      wipe.style.removeProperty('--wipe-preview-image');
    }
    body.classList.add('page-leave');
    window.setTimeout(()=>{location.href=url.href},leaveDuration);
  });

  if(menu&&nav){
    menu.addEventListener('click',()=>{
      const open=nav.classList.toggle('open');
      menu.setAttribute('aria-expanded',String(open));
      menu.classList.toggle('is-open',open);
    });
    nav.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{
      nav.classList.remove('open');
      menu.setAttribute('aria-expanded','false');
      menu.classList.remove('is-open');
    }));
  }

  const topButton=document.createElement('button');
  topButton.className='back-to-top';
  topButton.type='button';
  topButton.setAttribute('aria-label','Retour en haut');
  topButton.innerHTML='↑<span>Haut</span>';
  body.appendChild(topButton);
  topButton.addEventListener('click',()=>window.scrollTo({top:0,behavior:reduce?'auto':'smooth'}));
  document.querySelectorAll('a[href="#accueil"]').forEach(link=>link.addEventListener('click',e=>{
    e.preventDefault();
    window.scrollTo({top:0,behavior:reduce?'auto':'smooth'});
    history.replaceState(null,'','#accueil');
  }));

  const progress=document.createElement('div');
  progress.className='scroll-progress';
  body.appendChild(progress);
  let scrollTick=false;
  const setScrollState=()=>{
    const max=Math.max(0,document.documentElement.scrollHeight-innerHeight);
    progress.style.width=(max?Math.min(100,scrollY/max*100):0)+'%';
    const threshold=heroSection?heroSection.offsetHeight:0;
    const isHome=body.classList.contains('home-page');
    const isHeroScrolled=isHome&&!!heroSection&&scrollY>8;
    const isScrolled=!isHome||!heroSection||scrollY>=Math.max(threshold-8,0);
    header?.classList.toggle('has-scroll',isHeroScrolled);
    header?.classList.toggle('scrolled',isScrolled);
    header?.classList.toggle('hero-active',isHome&&!!heroSection&&!isScrolled);
    topButton.classList.toggle('is-visible',scrollY>innerHeight*.6);
    scrollTick=false;
  };
  addEventListener('scroll',()=>{if(!scrollTick){requestAnimationFrame(setScrollState);scrollTick=true;}},{passive:true});
  addEventListener('resize',setScrollState);
  setScrollState();

  if(navShell){
    navShell.addEventListener('pointermove',e=>{
      const r=navShell.getBoundingClientRect();
      navShell.style.setProperty('--nav-mx',((e.clientX-r.left)/r.width*100).toFixed(1)+'%');
      navShell.style.setProperty('--nav-my',((e.clientY-r.top)/r.height*100).toFixed(1)+'%');
    },{passive:true});
    navShell.addEventListener('pointerleave',()=>{
      navShell.style.setProperty('--nav-mx','50%');
      navShell.style.setProperty('--nav-my','50%');
    });
  }

  // Reveal the page in editorial beats rather than one large fade.
  const revealSelector='.hero-copy-wrap,.section-head,.project-card,.method-card,.about-photo,.about-copy,.cv-panel,.contact-panel,.contact-lede,.contact-aside,.contact-workspace-intro,.contact-form-shell,.contact-index-heading,.contact-index-links,.project-hero > .container,.case-summary,.project-section,.disclaimer,.project-image-grid figure,.kpi';
  const targets=[...document.querySelectorAll(revealSelector)];
  targets.forEach((el,i)=>{
    el.classList.add('reveal-ready');
    if(!el.dataset.revealDelay)el.style.setProperty('--reveal-delay',Math.min((i%6)*.055,.28)+'s');
  });
  if(reduce)targets.forEach(x=>x.classList.add('is-visible'));
  else{
    const io=new IntersectionObserver(es=>es.forEach(e=>{
      if(e.isIntersecting){e.target.classList.add('is-visible');io.unobserve(e.target);}
    }),{threshold:.08,rootMargin:'0px 0px -30px'});
    targets.forEach(x=>io.observe(x));
  }

  // Split editorial headings into independently arriving lines. Existing
  // <br> tags are preserved, including emphasis inside a line.
  const lineHeadings=[...document.querySelectorAll('.hero h1,.section-head h2,.method-intro h2,.project-hero h1,.project-section h2,.contact-hero h1,.contact-workspace h1,.cv-panel h3,.contact-panel h3')];
  lineHeadings.forEach(heading=>{
    const html=heading.innerHTML;
    if(heading.dataset.linesReady)return;
    heading.dataset.linesReady='true';
    heading.innerHTML=html.split(/<br\s*\/?>/i).map((line,i)=>`<span class="heading-line" style="--line-delay:${i*.08}s"><span>${line}</span></span>`).join('');
    heading.classList.add('line-reveal');
  });
  if(lineHeadings.length){
    if(reduce)lineHeadings.forEach(x=>x.classList.add('is-visible'));
    else{
      const lineIo=new IntersectionObserver(es=>es.forEach(e=>{
        if(e.isIntersecting){e.target.classList.add('is-visible');lineIo.unobserve(e.target);}
      }),{threshold:.12,rootMargin:'0px 0px -24px'});
      lineHeadings.forEach(x=>lineIo.observe(x));
    }
  }

  // Method cards are a keyboard-friendly signal explorer.
  const methodCards=[...document.querySelectorAll('.method-card[data-method]')];
  const methodTitle=document.querySelector('[data-method-title]');
  const methodDetail=document.querySelector('[data-method-detail]');
  const methodIndex=document.querySelector('.method-detail-index');
  const methodProgress=document.querySelector('.method-progress span');
  const methodCopy={
    observer:{title:'Observer',detail:'Je commence par lire les parcours, les pages et les signaux disponibles avant de formuler une hypothèse.'},
    structurer:{title:'Structurer',detail:'Je nomme la friction, hiérarchise les causes et sépare les faits, les hypothèses et les limites.'},
    activer:{title:'Activer',detail:'Je relie le message, l’audience, le canal, l’expérience et les livrables concrets.'},
    mesurer:{title:'Mesurer',detail:'Je définis les KPI et les tests nécessaires pour apprendre, ajuster et recommencer.'}
  };
  const activateMethod=card=>{
    const key=card.dataset.method;
    methodCards.forEach((item,i)=>{
      const active=item===card;
      item.classList.toggle('is-active',active);
      item.setAttribute('aria-selected',String(active));
      if(active&&methodIndex)methodIndex.textContent=String(i+1).padStart(2,'0')+' / 04';
    });
    if(methodCopy[key]){
      const detailChanged=methodTitle&&methodTitle.textContent!==methodCopy[key].title;
      if(detailChanged){
        document.querySelector('.method-detail')?.classList.remove('is-changing');
        requestAnimationFrame(()=>document.querySelector('.method-detail')?.classList.add('is-changing'));
        window.setTimeout(()=>document.querySelector('.method-detail')?.classList.remove('is-changing'),220);
      }
      if(methodTitle)methodTitle.textContent=methodCopy[key].title;
      if(methodDetail)methodDetail.textContent=methodCopy[key].detail;
      if(methodProgress)methodProgress.style.width=((methodCards.indexOf(card)+1)/methodCards.length*100)+'%';
    }
  };
  methodCards.forEach(card=>{
    card.addEventListener('click',()=>activateMethod(card));
    card.addEventListener('keydown',e=>{
      if(e.key==='ArrowRight'||e.key==='ArrowDown'){e.preventDefault();const next=methodCards[(methodCards.indexOf(card)+1)%methodCards.length];next.focus();activateMethod(next);}
      if(e.key==='ArrowLeft'||e.key==='ArrowUp'){e.preventDefault();const prev=methodCards[(methodCards.indexOf(card)-1+methodCards.length)%methodCards.length];prev.focus();activateMethod(prev);}
    });
    if(fine&&!reduce)card.addEventListener('pointerenter',()=>activateMethod(card));
    if(fine&&!reduce){
      card.addEventListener('pointermove',e=>{
        const r=card.getBoundingClientRect();
        card.style.setProperty('--method-x',((e.clientX-r.left)/r.width*100).toFixed(1)+'%');
        card.style.setProperty('--method-y',((e.clientY-r.top)/r.height*100).toFixed(1)+'%');
      },{passive:true});
      card.addEventListener('pointerleave',()=>{
        card.style.setProperty('--method-x','50%');
        card.style.setProperty('--method-y','50%');
      });
    }
  });

  // Small, tactile pointer layer: it disappears entirely on touch and reduced motion.
  if(fine&&!reduce){
    body.classList.add('has-custom-cursor');
    const ring=document.createElement('div');ring.className='cursor-ring';ring.setAttribute('aria-hidden','true');
    const label=document.createElement('div');label.className='cursor-label';label.setAttribute('aria-hidden','true');
    const trail=document.createElement('div');trail.className='cursor-trail';trail.setAttribute('aria-hidden','true');
    body.append(ring,label,trail);
    let tx=0,ty=0,rx=0,ry=0,lx=0,ly=0,frameId=0;
    const frame=()=>{
      const rdx=tx-rx,rdy=ty-ry,ldx=tx-lx,ldy=ty-ly;
      rx+=rdx*.16;ry+=rdy*.16;lx+=ldx*.08;ly+=ldy*.08;
      ring.style.left=rx+'px';ring.style.top=ry+'px';label.style.left=rx+'px';label.style.top=ry+'px';trail.style.left=lx+'px';trail.style.top=ly+'px';
      if(Math.abs(rdx)+Math.abs(rdy)+Math.abs(ldx)+Math.abs(ldy)>.12)frameId=requestAnimationFrame(frame);else frameId=0;
    };
    const wakeCursor=()=>{if(!frameId)frameId=requestAnimationFrame(frame)};
    addEventListener('pointermove',e=>{
      tx=e.clientX;ty=e.clientY;ring.classList.add('is-active');label.classList.add('is-active');trail.classList.add('is-active');wakeCursor();
      if(hero){const r=hero.getBoundingClientRect();const px=(e.clientX-r.left)/r.width;const py=(e.clientY-r.top)/r.height;hero.style.setProperty('--cursor-x',(px*100)+'%');hero.style.setProperty('--cursor-y',(py*100)+'%');hero.style.setProperty('--cutout-shift-x',((px-.5)*22).toFixed(2)+'px');hero.style.setProperty('--cutout-shift-y',((py-.5)*13).toFixed(2)+'px');}
    },{passive:true});
    const interactive=document.querySelectorAll('a,button,.project-card,.card-media,.method-card,.contact-field');
    interactive.forEach(el=>{el.addEventListener('pointerenter',()=>{ring.classList.add('is-hover');const project=el.matches('.project-card,.card-media');const method=el.matches('.method-card');const field=el.matches('.contact-field');label.textContent=project?'Voir le projet':method?'Explorer':field?'Écrire':'Ouvrir';});el.addEventListener('pointerleave',()=>{ring.classList.remove('is-hover');label.textContent='';});});

    document.querySelectorAll('.project-card').forEach(card=>{
      card.addEventListener('pointermove',e=>{const r=card.getBoundingClientRect(),x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;card.style.setProperty('--rx',(-y*3).toFixed(2)+'deg');card.style.setProperty('--ry',(x*3).toFixed(2)+'deg');});
      card.addEventListener('pointerleave',()=>{card.style.setProperty('--rx','0deg');card.style.setProperty('--ry','0deg');});
    });
    document.querySelectorAll('.project-hero-media').forEach(media=>media.addEventListener('pointermove',e=>{const r=media.getBoundingClientRect();media.style.setProperty('--media-x',((e.clientX-r.left)/r.width-.5)*-12+'px');media.style.setProperty('--media-y',((e.clientY-r.top)/r.height-.5)*-8+'px')}));
    document.querySelectorAll('.project-hero-media').forEach(media=>media.addEventListener('pointerleave',()=>{media.style.setProperty('--media-x','0px');media.style.setProperty('--media-y','0px')}));
    document.querySelectorAll('.magnetic,.button,.nav-cta').forEach(el=>{
      el.addEventListener('pointermove',e=>{const r=el.getBoundingClientRect();el.style.transform=`translate(${(e.clientX-r.left-r.width/2)*.08}px,${(e.clientY-r.top-r.height/2)*.08}px)`});
      el.addEventListener('pointerleave',()=>el.style.transform='');
    });
  }

  // Subtle scroll parallax keeps project imagery alive without shifting the layout.
  const parallaxImages=[...document.querySelectorAll('.project-hero-media img,.project-image-grid img')];
  const parallaxCards=[...document.querySelectorAll('.project-card')];
  if((parallaxImages.length||parallaxCards.length)&&!reduce){
    let parallaxTick=false;
    const updateParallax=()=>{
      const viewportCenter=innerHeight*.5;
      parallaxImages.forEach(img=>{
        const r=img.getBoundingClientRect();
        const distance=(viewportCenter-(r.top+r.height*.5))/Math.max(innerHeight,r.height);
        const offset=Math.max(-1,Math.min(1,distance))*10;
        img.style.setProperty('--scroll-y',offset.toFixed(2)+'px');
      });
      parallaxCards.forEach(card=>{
        const r=card.getBoundingClientRect();
        const distance=(viewportCenter-(r.top+r.height*.5))/Math.max(innerHeight,r.height);
        const offset=Math.max(-1,Math.min(1,distance))*9;
        card.style.setProperty('--card-parallax',offset.toFixed(2)+'px');
      });
      parallaxTick=false;
    };
    const requestParallax=()=>{if(!parallaxTick){requestAnimationFrame(updateParallax);parallaxTick=true;}};
    addEventListener('scroll',requestParallax,{passive:true});
    addEventListener('resize',requestParallax);
    updateParallax();
  }

  // Scroll velocity adds a barely-there skew to imagery and display type.
  if(!reduce){
    let previousScroll=scrollY;
    let previousTime=performance.now();
    let velocity=0;
    let velocityTick=false;
    const settleVelocity=()=>{
      velocity*=.78;
      body.style.setProperty('--scroll-velocity',velocity.toFixed(3));
      if(Math.abs(velocity)>.01)requestAnimationFrame(settleVelocity);
      else velocityTick=false;
    };
    addEventListener('scroll',()=>{
      const now=performance.now();
      const delta=scrollY-previousScroll;
      const elapsed=Math.max(12,now-previousTime);
      velocity=Math.max(-2.4,Math.min(2.4,(delta/elapsed)*.055));
      previousScroll=scrollY;
      previousTime=now;
      body.style.setProperty('--scroll-velocity',velocity.toFixed(3));
      if(!velocityTick){velocityTick=true;requestAnimationFrame(settleVelocity);}
    },{passive:true});
  }

  // Count KPI values into view while preserving the original French format.
  const kpis=[...document.querySelectorAll('.kpi strong')];
  const counterData=[];
  const parseFrenchNumber=value=>Number(value.replace(/\s/g,'').replace(',','.'));
  const formatFrenchNumber=(value,template)=>{
    const decimals=(template.split(',')[1]||'').length;
    let output=value.toFixed(decimals).replace('.',',');
    const parts=output.split(',');
    parts[0]=parts[0].replace(/\B(?=(\d{3})+(?!\d))/g,' ');
    return parts.join(',');
  };
  const prepareCounter=el=>{
    const original=el.textContent.trim();
    const match=original.match(/^(\D*)([\d\s.,]+)(?:([–-])([\d\s.,]+))?(.*)$/);
    if(!match)return;
    const [,prefix,start,separator,end,suffix]=match;
    const startValue=parseFrenchNumber(start);
    const endValue=end?parseFrenchNumber(end):null;
    if(!Number.isFinite(startValue))return;
    counterData.push({el,prefix,start,startValue,separator,end,endValue,suffix});
    el.dataset.counterReady='true';
  };
  kpis.forEach(prepareCounter);
  const renderCounter=(item,progress)=>{
    const eased=1-Math.pow(1-progress,3);
    const first=formatFrenchNumber(item.startValue*eased,item.start);
    const second=item.endValue===null?'':item.separator+formatFrenchNumber(item.endValue*eased,item.end);
    item.el.textContent=item.prefix+first+second+item.suffix;
  };
  const runCounter=item=>{
    if(item.el.dataset.counterStarted)return;
    item.el.dataset.counterStarted='true';
    const started=performance.now();
    const tick=now=>{
      const progress=Math.min(1,(now-started)/900);
      renderCounter(item,progress);
      if(progress<1)requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  if(counterData.length){
    if(reduce)counterData.forEach(item=>renderCounter(item,1));
    else{
      const counterIo=new IntersectionObserver(es=>es.forEach(e=>{
        if(e.isIntersecting){runCounter(counterData.find(item=>item.el===e.target));counterIo.unobserve(e.target);}
      }),{threshold:.55});
      counterData.forEach(item=>counterIo.observe(item.el));
    }
  }

  const links=[...document.querySelectorAll('.nav-links a[href^="#"]')];
  const sections=links.map(l=>document.querySelector(l.getAttribute('href'))).filter(Boolean);
  if(sections.length){
    const sio=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){links.forEach(l=>{const active=l.getAttribute('href')==='#'+e.target.id;l.classList.toggle('active-nav',active);if(active)l.setAttribute('aria-current','page');else l.removeAttribute('aria-current');});}}),{rootMargin:'-25% 0px -65%'});
    sections.forEach(s=>sio.observe(s));
  }

  // Contact form stays honest: it prepares a note locally and never pretends to send.
  const form=document.querySelector('#contact-form');
  const status=document.querySelector('[data-form-status]');
  const formStep=document.querySelector('[data-form-step]');
  const formShell=document.querySelector('.contact-form-shell');
  const fields=form?[...form.querySelectorAll('.contact-field')]:[];
  const updateFormProgress=activeIndex=>{
    const complete=fields.filter(field=>field.querySelector('input,textarea')?.value.trim()).length;
    const current=activeIndex||complete;
    if(formStep)formStep.textContent=String(current).padStart(2,'0')+' / 03';
  };
  fields.forEach((field,i)=>{
    const input=field.querySelector('input,textarea');
    input?.addEventListener('focus',()=>updateFormProgress(i+1));
    input?.addEventListener('input',()=>updateFormProgress(i+1));
  });
  if(form&&status){
    form.addEventListener('submit',e=>{
      e.preventDefault();
      formShell?.classList.add('is-sent');
      if(formStep)formStep.textContent='03 / 03';
      status.textContent='Brouillon prêt — il ne manque que l’adresse de réception pour l’envoyer.';
    });
  }
})();
