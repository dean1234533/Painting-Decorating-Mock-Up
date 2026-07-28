(function(){
  "use strict";

  document.getElementById('year') && (document.getElementById('year').textContent = new Date().getFullYear());

  /* ---------- Shared scroll lock (preserves + restores scroll position) ---------- */
  var scrollLockY = 0;
  var scrollLockCount = 0;
  function lockScroll(){
    if(scrollLockCount === 0){
      scrollLockY = window.scrollY || window.pageYOffset || 0;
      document.body.style.position = 'fixed';
      document.body.style.top = (-scrollLockY) + 'px';
      document.body.style.left = '0';
      document.body.style.right = '0';
      document.body.style.width = '100%';
    }
    scrollLockCount++;
  }
  function unlockScroll(){
    scrollLockCount = Math.max(0, scrollLockCount - 1);
    if(scrollLockCount === 0){
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.left = '';
      document.body.style.right = '';
      document.body.style.width = '';
      window.scrollTo(0, scrollLockY);
    }
  }

  /* Run each feature independently so one failure can never take down the rest of the page */
  function safe(fn){
    try{ fn(); }catch(err){ if(window.console && console.error) console.error('Init error:', err); }
  }

  /* Keep Tab focus inside an open modal (lightbox / mobile menu) */
  var FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
  function trapFocus(container, e){
    var focusables = Array.prototype.slice.call(container.querySelectorAll(FOCUSABLE)).filter(function(el){
      return el.offsetParent !== null;
    });
    if(!focusables.length) return;
    var first = focusables[0], last = focusables[focusables.length - 1];
    if(e.shiftKey && document.activeElement === first){
      e.preventDefault(); last.focus();
    } else if(!e.shiftKey && document.activeElement === last){
      e.preventDefault(); first.focus();
    }
  }

  /* ---------- Loader ---------- */
  window.addEventListener('load', function(){
    var loader = document.getElementById('loader');
    setTimeout(function(){ loader && loader.classList.add('done'); }, 500);
  });

  /* ---------- Scroll progress ---------- */
  var progressBar = document.getElementById('progressBar');
  function onScrollProgress(){
    if(!progressBar) return;
    var h = document.documentElement;
    var scrolled = (h.scrollTop) / (h.scrollHeight - h.clientHeight) * 100;
    progressBar.style.width = scrolled + '%';
  }

  /* ---------- Header scroll state ---------- */
  var header = document.getElementById('siteHeader');
  function onScrollHeader(){
    if(!header) return;
    if(window.scrollY > 40) header.classList.add('scrolled');
    else header.classList.remove('scrolled');
  }

  window.addEventListener('scroll', function(){
    onScrollProgress();
    onScrollHeader();
  }, { passive:true });
  onScrollProgress(); onScrollHeader();

  /* ---------- Mobile menu — premium slide-in panel ---------- */
  safe(function(){
    var menuToggle = document.getElementById('menuToggle');
    var mobileMenu = document.getElementById('mobileMenu');
    var mobileMenuClose = document.getElementById('mobileMenuClose');
    var mobileMenuBackdrop = document.getElementById('mobileMenuBackdrop');
    if(!menuToggle || !mobileMenu) return;

    function openMenu(){
      document.body.classList.add('menu-open');
      menuToggle.setAttribute('aria-expanded', 'true');
      menuToggle.setAttribute('aria-label', 'Close menu');
      lockScroll();
      mobileMenuClose && mobileMenuClose.focus();
    }
    function closeMenu(){
      document.body.classList.remove('menu-open');
      menuToggle.setAttribute('aria-expanded', 'false');
      menuToggle.setAttribute('aria-label', 'Open menu');
      unlockScroll();
    }

    menuToggle.addEventListener('click', function(){
      if(document.body.classList.contains('menu-open')) closeMenu(); else openMenu();
    });
    mobileMenuClose && mobileMenuClose.addEventListener('click', closeMenu);
    mobileMenuBackdrop && mobileMenuBackdrop.addEventListener('click', closeMenu);
    document.querySelectorAll('[data-mm-link]').forEach(function(a){
      a.addEventListener('click', closeMenu);
    });
    document.addEventListener('keydown', function(e){
      if(!document.body.classList.contains('menu-open')) return;
      if(e.key === 'Escape'){ closeMenu(); return; }
      if(e.key === 'Tab') trapFocus(mobileMenu, e);
    });
  });

  /* ---------- Scroll spy — highlight the active section in nav ---------- */
  safe(function(){
    var sectionIds = ['craftsmanship','services','portfolio','process','reviews','contact'];
    var sections = sectionIds.map(function(id){ return document.getElementById(id); }).filter(Boolean);
    var navLinkEls = document.querySelectorAll('.nav-links a, .mm-nav a');
    if(!sections.length || !('IntersectionObserver' in window)) return;
    var spyIo = new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        if(entry.isIntersecting){
          var id = entry.target.id;
          navLinkEls.forEach(function(a){
            a.classList.toggle('active', a.getAttribute('href') === '#' + id);
          });
        }
      });
    }, { rootMargin: '-45% 0px -50% 0px', threshold: 0 });
    sections.forEach(function(s){ spyIo.observe(s); });
  });

  /* ---------- Scroll reveal ---------- */
  safe(function(){
    var revealEls = document.querySelectorAll('[data-reveal], .mask-lines');
    if('IntersectionObserver' in window){
      var io = new IntersectionObserver(function(entries){
        entries.forEach(function(entry){
          if(entry.isIntersecting){
            entry.target.classList.add('is-visible');
            io.unobserve(entry.target);
          }
        });
      }, { threshold:0.18, rootMargin:'0px 0px -60px 0px' });
      revealEls.forEach(function(el){ io.observe(el); });

      var hEl = document.querySelector('h1.mask-lines') || document.querySelector('.hero h1');
      if(hEl){ io.observe(hEl); }
    } else {
      revealEls.forEach(function(el){ el.classList.add('is-visible'); });
    }
  });

  /* ---------- Hero H1 mask reveal trigger (immediate on load, hero always visible first) ---------- */
  safe(function(){
    var heroH1 = document.querySelector('.hero h1');
    if(heroH1){ requestAnimationFrame(function(){ heroH1.classList.add('is-visible'); }); }
  });

  /* ---------- Before / After spotlight slider ---------- */
  safe(function(){
  document.querySelectorAll('[data-ba]').forEach(function(slider){
    var after = slider.querySelector('.spotlight-after');
    var handle = slider.querySelector('.spotlight-handle');
    var dragging = false;

    function setPos(clientX){
      var rect = slider.getBoundingClientRect();
      var pct = Math.min(Math.max((clientX - rect.left) / rect.width, 0), 1) * 100;
      after.style.clipPath = 'inset(0 0 0 ' + pct + '%)';
      handle.style.left = pct + '%';
    }
    function down(e){ dragging = true; slider.classList.add('dragging'); }
    function up(){ dragging = false; slider.classList.remove('dragging'); }
    function move(e){
      if(!dragging) return;
      var x = e.touches ? e.touches[0].clientX : e.clientX;
      setPos(x);
    }
    handle.addEventListener('mousedown', down);
    slider.addEventListener('mousedown', function(e){ down(e); setPos(e.clientX); });
    window.addEventListener('mouseup', up);
    window.addEventListener('mousemove', move);

    handle.addEventListener('touchstart', function(e){ down(e); }, {passive:true});
    slider.addEventListener('touchstart', function(e){ down(e); setPos(e.touches[0].clientX); }, {passive:true});
    window.addEventListener('touchend', up);
    window.addEventListener('touchmove', move, {passive:true});
  });

  /* Spotlight pair switcher */
  var spotlightPairs = {
    0: {
      before: { src: 'https://images.unsplash.com/photo-1760516476528-bfa65002547a?w=2000&q=80&auto=format&fit=crop', alt: 'Living room before renovation, dated decor' },
      after: { src: 'https://images.unsplash.com/photo-1780547300423-c6a539738adb?w=2000&q=80&auto=format&fit=crop', alt: 'Same living room after full repaint' },
      title: 'Interior Repaint',
      sub: 'Victoria Park Village — full strip-back and repaint'
    },
    1: {
      before: { src: 'https://images.unsplash.com/photo-1759460367756-f8afa49a107c?w=2000&q=80&auto=format&fit=crop', alt: 'Exterior render before repainting, weathered and faded' },
      after: { src: 'https://images.unsplash.com/photo-1759338584492-45647a320916?w=2000&q=80&auto=format&fit=crop', alt: 'Freshly painted exterior render' },
      title: 'Exterior Render',
      sub: 'Clapton — render repair and masonry paint system'
    }
  };
  var spotlightNav = document.getElementById('spotlightNav');
  if(spotlightNav){
    var spotlightSlider = document.querySelector('.spotlight-slider');
    var spotlightBeforeImg = spotlightSlider.querySelector('.ba-img-before');
    var spotlightAfterImg = spotlightSlider.querySelector('.spotlight-after img');
    var spotlightCaptionEl = document.getElementById('spotlightCaption');
    spotlightNav.querySelectorAll('button').forEach(function(btn){
      btn.addEventListener('click', function(){
        spotlightNav.querySelectorAll('button').forEach(function(b){ b.classList.remove('active'); });
        btn.classList.add('active');
        var pair = spotlightPairs[btn.getAttribute('data-pair')];
        spotlightBeforeImg.src = pair.before.src;
        spotlightBeforeImg.alt = pair.before.alt;
        spotlightAfterImg.src = pair.after.src;
        spotlightAfterImg.alt = pair.after.alt;
        if(spotlightCaptionEl) spotlightCaptionEl.innerHTML = pair.title + '<span class="spotlight-caption-sub">' + pair.sub + '</span>';
      });
    });
  }
  });

  /* ---------- Services filmstrip — drag to scroll ---------- */
  safe(function(){
  var filmstrip = document.getElementById('filmstrip');
  if(filmstrip){
    /* Some browsers restore a mid-scroll position on load/reload/bfcache-restore — force it back to the first panel */
    filmstrip.scrollLeft = 0;
    window.addEventListener('load', function(){ filmstrip.scrollLeft = 0; });
    window.addEventListener('pageshow', function(){ filmstrip.scrollLeft = 0; });

    var fsDown = false, fsStartX = 0, fsScrollLeft = 0, fsMoved = false;
    filmstrip.addEventListener('mousedown', function(e){
      fsDown = true; fsMoved = false; filmstrip.classList.add('dragging');
      fsStartX = e.pageX - filmstrip.offsetLeft;
      fsScrollLeft = filmstrip.scrollLeft;
    });
    window.addEventListener('mouseup', function(){ fsDown = false; filmstrip.classList.remove('dragging'); });
    filmstrip.addEventListener('mouseleave', function(){ fsDown = false; filmstrip.classList.remove('dragging'); });
    filmstrip.addEventListener('mousemove', function(e){
      if(!fsDown) return;
      e.preventDefault();
      var x = e.pageX - filmstrip.offsetLeft;
      var walk = x - fsStartX;
      if(Math.abs(walk) > 6) fsMoved = true;
      filmstrip.scrollLeft = fsScrollLeft - walk;
    });
    filmstrip.querySelectorAll('a').forEach(function(a){
      a.addEventListener('click', function(e){ if(fsMoved) e.preventDefault(); });
    });
  }
  });

  /* ---------- Portfolio filtering ---------- */
  safe(function(){
    var filterBtns = document.querySelectorAll('.filter-btn');
    var masonItems = document.querySelectorAll('.mason-item');

    function applyFilter(filter){
      filterBtns.forEach(function(b){ b.classList.toggle('active', b.getAttribute('data-filter') === filter); });
      masonItems.forEach(function(item){
        var show = filter === 'all' || item.getAttribute('data-cat') === filter;
        item.classList.toggle('hide', !show);
      });
    }

    filterBtns.forEach(function(btn){
      btn.addEventListener('click', function(){
        applyFilter(btn.getAttribute('data-filter'));
      });
    });

    /* The "All" pill is hidden on mobile (see CSS, max-width:900px) — default to Interior there instead */
    if(window.matchMedia && window.matchMedia('(max-width:900px)').matches){
      applyFilter('interior');
    }
  });

  /* ---------- Portfolio project data + lightbox ---------- */
  safe(function(){
  var PROJECTS = {
    p1: {
      cat: 'Interior', title: 'Interior Repaint', location: 'Victoria Park Village, E9',
      hero: { src: 'https://images.unsplash.com/photo-1780547300423-c6a539738adb?w=1400&q=80&auto=format&fit=crop', alt: 'Elegant period living room finished in soft warm white' },
      gallery: [
        { src: 'https://images.unsplash.com/photo-1761986757577-140af8859587?w=700&q=80&auto=format&fit=crop', alt: 'Decorator sanding a wall surface before painting' },
        { src: 'https://images.unsplash.com/photo-1625931799744-b1c77f1694d6?w=700&q=80&auto=format&fit=crop', alt: "Close-up of a decorator's paintbrush" }
      ],
      before: { src: 'https://images.unsplash.com/photo-1760516476528-bfa65002547a?w=700&q=80&auto=format&fit=crop', alt: 'Living room before renovation, dated decor' },
      after: { src: 'https://images.unsplash.com/photo-1780547300423-c6a539738adb?w=700&q=80&auto=format&fit=crop', alt: 'Same living room after full repaint' },
      overview: "A full redecoration of a Victorian terrace living room for a family who had lived with the previous owner's colour scheme for over a decade. The brief was a calm, adaptable backdrop that would work through every season and hold up against everyday family life.",
      challenges: "Layers of old lining paper concealed hairline cracks in the original plaster, and the room's single large bay window meant colour needed testing at three times of day before a final shade was agreed.",
      results: "A warm off-white scheme that reads differently in morning and evening light, with crisp new skirting and cornice detailing. The client has since booked us for two further rooms.",
      services: ['Full strip-back & repaint', 'Skirting & cornice detailing', 'Colour consultation']
    },
    p2: {
      cat: 'Exterior', title: 'Exterior Render Restoration', location: 'Clapton, E5',
      hero: { src: 'https://images.unsplash.com/photo-1759338584492-45647a320916?w=1400&q=80&auto=format&fit=crop', alt: 'Period terrace exterior render restoration' },
      gallery: [
        { src: 'https://images.unsplash.com/photo-1742900280864-bcc27353ceba?w=700&q=80&auto=format&fit=crop', alt: 'Decorator painting a house exterior render from a ladder' },
        { src: 'https://images.unsplash.com/photo-1761986757577-140af8859587?w=700&q=80&auto=format&fit=crop', alt: 'Decorator preparing a wall surface before painting' }
      ],
      before: { src: 'https://images.unsplash.com/photo-1759460367756-f8afa49a107c?w=700&q=80&auto=format&fit=crop', alt: 'Exterior render before repainting, weathered and faded' },
      after: { src: 'https://images.unsplash.com/photo-1759338584492-45647a320916?w=700&q=80&auto=format&fit=crop', alt: 'Freshly painted exterior render' },
      overview: 'A Victorian terrace with render that had been patch-repaired several times over the decades, leaving a visibly uneven surface and hairline cracking that let damp track behind the finish.',
      challenges: "Several areas of render had failed entirely and needed cutting back to brick before rebuilding, and the terrace's shared party walls meant careful sequencing with neighbouring properties.",
      results: 'A stabilised, breathable masonry system reinstated across the full elevation, with a five-year guarantee against the exact defects that had recurred previously.',
      services: ['Render repair', 'Mould treatment', 'Masonry paint system']
    },
    p3: {
      cat: 'Wallpaper', title: 'Feature Wallpaper', location: 'Stoke Newington, N16',
      hero: { src: 'https://images.unsplash.com/photo-1612764550058-b7ccce95a20e?w=1400&q=80&auto=format&fit=crop', alt: 'Bedroom hung with statement floral wallpaper' },
      gallery: [
        { src: 'https://images.unsplash.com/photo-1694379073034-d8da0119986a?w=700&q=80&auto=format&fit=crop', alt: 'Wallpapered archway hallway detail' },
        { src: 'https://images.unsplash.com/photo-1625931799744-b1c77f1694d6?w=700&q=80&auto=format&fit=crop', alt: "Close-up of a decorator's paintbrush" }
      ],
      overview: 'A main bedroom in a converted Victorian flat, where the client wanted a statement floral wallcovering as the room’s single decorative gesture against otherwise plain walls.',
      challenges: 'The paper’s large repeat pattern meant careful planning of the pattern match across a chimney breast and two alcoves, with minimal offcut waste.',
      results: 'A seamless hang with every join pattern-matched, transforming a previously plain bedroom into the most distinctive room in the flat.',
      services: ['Wall preparation & lining', 'Pattern-matched hanging']
    },
    p4: {
      cat: 'Commercial', title: 'Commercial Office Refresh', location: 'Shoreditch, E1',
      hero: { src: 'https://images.unsplash.com/photo-1715593949273-09009558300a?w=1400&q=80&auto=format&fit=crop', alt: 'Commercial office decorating project' },
      gallery: [
        { src: 'https://images.unsplash.com/photo-1717281234297-3def5ae3eee1?w=700&q=80&auto=format&fit=crop', alt: 'Decorator on a scaffold tower painting a ceiling' },
        { src: 'https://images.unsplash.com/photo-1742900280864-bcc27353ceba?w=700&q=80&auto=format&fit=crop', alt: 'Decorator painting an exterior from a ladder' }
      ],
      overview: 'A boutique office suite above a working showroom, requiring a full repaint without disrupting the daytime business below.',
      challenges: 'Access was limited to evenings and weekends, and the client needed each floor fully dry and odour-free before staff returned the following morning.',
      results: 'The full suite repainted across two out-of-hours sittings, with zero disruption to daytime trade and a noticeably brighter, more professional workspace.',
      services: ['Out-of-hours programme', 'Wall & ceiling repaint', 'Feature colour blocking']
    },
    p5: {
      cat: 'Interior', title: 'Ceiling & Cornice Repaint', location: 'Hackney, E8',
      hero: { src: 'https://images.unsplash.com/photo-1717281234297-3def5ae3eee1?w=1400&q=80&auto=format&fit=crop', alt: 'Decorator on a scaffold tower painting a ceiling' },
      gallery: [
        { src: 'https://images.unsplash.com/photo-1761986757577-140af8859587?w=700&q=80&auto=format&fit=crop', alt: 'Decorator sanding a wall surface before painting' },
        { src: 'https://images.unsplash.com/photo-1625931799744-b1c77f1694d6?w=700&q=80&auto=format&fit=crop', alt: "Close-up of a decorator's paintbrush" }
      ],
      overview: 'A top-floor conversion flat with generously high ceilings and original Victorian cornicing that had never been repainted since installation.',
      challenges: 'Reaching the cornice safely required a scaffold tower rather than a ladder, and decades of nicotine staining had to be sealed before fresh emulsion would sit evenly.',
      results: "Crisp white ceilings and cornice that let the original plaster detailing read clearly again, finished without a single scaffold mark left on the newly restored floors.",
      services: ['Scaffold tower access', 'Cornice cutting-in', 'Two-coat emulsion finish']
    },
    p6: {
      cat: 'Exterior', title: 'Weatherboard Exterior Refresh', location: 'Walthamstow, E17',
      hero: { src: 'https://images.unsplash.com/photo-1587094313669-faf7668ed8a8?w=1400&q=80&auto=format&fit=crop', alt: 'Weatherboard exterior refresh' },
      gallery: [
        { src: 'https://images.unsplash.com/photo-1742900280864-bcc27353ceba?w=700&q=80&auto=format&fit=crop', alt: 'Decorator painting an exterior from a ladder' },
        { src: 'https://images.unsplash.com/photo-1759338584492-45647a320916?w=700&q=80&auto=format&fit=crop', alt: 'Freshly painted exterior render on a terrace street' }
      ],
      overview: 'A timber-clad Victorian house where several seasons of neglect had left the weatherboard cladding dull, flaking and vulnerable to further moisture damage.',
      challenges: 'Sections of timber had begun to soften and needed localised repair before any paint system would hold, and access to the upper storey required careful scaffold planning around a mature tree.',
      results: "A fully repaired and repainted elevation in a breathable exterior system, restoring the house's kerb appeal and protecting the timber for years to come.",
      services: ['Timber repair', 'Mould treatment', 'Breathable masonry system']
    },
    p7: {
      cat: 'Interior', title: 'Colour-Blocked Feature Wall', location: 'Bow, E3',
      hero: { src: 'https://images.unsplash.com/photo-1675191863404-e1db618d6655?w=1400&q=80&auto=format&fit=crop', alt: 'Decorator mid brush-stroke, a bold colour transformation clearly visible' },
      gallery: [
        { src: 'https://images.unsplash.com/photo-1761986757577-140af8859587?w=700&q=80&auto=format&fit=crop', alt: 'Decorator sanding a wall surface before painting' },
        { src: 'https://images.unsplash.com/photo-1625931799744-b1c77f1694d6?w=700&q=80&auto=format&fit=crop', alt: "Close-up of a decorator's paintbrush" }
      ],
      overview: 'A compact reception room that needed a stronger sense of identity without the cost or disruption of new joinery.',
      challenges: 'Freehand cutting-in a crisp, dead-straight line along an existing picture rail with no masking line to hide behind demanded absolute precision from a single decorator.',
      results: 'A bold contrast colour block that gives the room an instant focal point, achieved in a single day with no new materials beyond paint.',
      services: ['Freehand cutting-in', 'Two-coat eggshell finish', 'Colour consultation']
    },
    p8: {
      cat: 'Woodwork', title: 'Staircase Woodwork', location: 'Bethnal Green, E2',
      hero: { src: 'https://images.unsplash.com/photo-1721739507637-738599ff8434?w=1400&q=80&auto=format&fit=crop', alt: 'Freshly painted white staircase joinery' },
      gallery: [
        { src: 'https://images.unsplash.com/photo-1625931799744-b1c77f1694d6?w=700&q=80&auto=format&fit=crop', alt: "Close-up of a decorator's paintbrush" },
        { src: 'https://images.unsplash.com/photo-1761986757577-140af8859587?w=700&q=80&auto=format&fit=crop', alt: 'Decorator sanding a wall surface before painting' }
      ],
      overview: 'Original staircase joinery in a period conversion that had yellowed under decades of built-up gloss coats.',
      challenges: 'Stripping back to bare timber without damaging the original spindles and handrail took considerably longer than a straightforward repaint, with several rounds of fine sanding between coats.',
      results: "A crisp brilliant white finish that reveals the staircase's original joinery detail, finished to a specification that will resist yellowing for years.",
      services: ['Paint stripping', 'Spindle & handrail repair', 'Brilliant white finish']
    }
  };

  /* ---------- Lightbox — full project detail ---------- */
  var lightbox = document.getElementById('lightbox');
  var lightboxPanel = document.getElementById('lightboxPanel');
  var lightboxImg = document.getElementById('lightboxImg');
  var lightboxGallery = document.getElementById('lightboxGallery');
  var lightboxBA = document.getElementById('lightboxBA');
  var lightboxBaBefore = document.getElementById('lightboxBaBefore');
  var lightboxBaAfter = document.getElementById('lightboxBaAfter');
  var lightboxCat = document.getElementById('lightboxCat');
  var lightboxTitle = document.getElementById('lightboxTitle');
  var lightboxLoc = document.getElementById('lightboxLoc');
  var lightboxOverview = document.getElementById('lightboxOverview');
  var lightboxChallenges = document.getElementById('lightboxChallenges');
  var lightboxResults = document.getElementById('lightboxResults');
  var lightboxServices = document.getElementById('lightboxServices');
  var galleryLinks = Array.prototype.slice.call(document.querySelectorAll('[data-lightbox]'));
  var currentIndex = 0;
  var lastFocusedEl = null;

  function showLightbox(link){
    var id = link.getAttribute('data-project');
    var p = PROJECTS[id];
    if(!p){ return; }

    lightboxImg.src = p.hero.src;
    lightboxImg.alt = p.hero.alt;

    lightboxGallery.innerHTML = '';
    (p.gallery || []).forEach(function(g){
      var img = document.createElement('img');
      img.src = g.src; img.alt = g.alt; img.loading = 'lazy';
      lightboxGallery.appendChild(img);
    });

    if(p.before && p.after){
      lightboxBaBefore.src = p.before.src; lightboxBaBefore.alt = p.before.alt;
      lightboxBaAfter.src = p.after.src; lightboxBaAfter.alt = p.after.alt;
      lightboxBA.hidden = false;
    } else {
      lightboxBA.hidden = true;
    }

    lightboxCat.textContent = p.cat;
    lightboxTitle.textContent = p.title;
    lightboxLoc.textContent = p.location;
    lightboxOverview.textContent = p.overview;
    lightboxChallenges.textContent = p.challenges;
    lightboxResults.textContent = p.results;
    lightboxServices.innerHTML = '';
    (p.services || []).forEach(function(s){
      var li = document.createElement('li');
      li.textContent = s;
      lightboxServices.appendChild(li);
    });

    lightboxPanel.scrollTop = 0;
  }

  function openLightbox(index){
    var visible = galleryLinks.filter(function(l){ return !l.classList.contains('hide'); });
    currentIndex = visible.indexOf(galleryLinks[index]) > -1 ? index : 0;
    lastFocusedEl = document.activeElement;
    showLightbox(galleryLinks[index]);
    lightbox.classList.add('active');
    lockScroll();
    lightboxPanel.focus();
  }
  galleryLinks.forEach(function(link, i){
    link.addEventListener('click', function(e){
      e.preventDefault();
      openLightbox(i);
    });
  });
  function closeLightbox(){
    lightbox.classList.remove('active');
    unlockScroll();
    if(lastFocusedEl && typeof lastFocusedEl.focus === 'function'){ lastFocusedEl.focus(); }
  }
  function navigate(dir){
    var visible = galleryLinks.filter(function(l){ return !l.classList.contains('hide'); });
    if(!visible.length) return;
    var pos = visible.indexOf(galleryLinks[currentIndex]);
    if(pos === -1) pos = 0;
    pos = (pos + dir + visible.length) % visible.length;
    currentIndex = galleryLinks.indexOf(visible[pos]);
    showLightbox(galleryLinks[currentIndex]);
  }
  document.getElementById('lightboxClose').addEventListener('click', closeLightbox);
  document.getElementById('lightboxPrev').addEventListener('click', function(){ navigate(-1); });
  document.getElementById('lightboxNext').addEventListener('click', function(){ navigate(1); });
  lightbox.addEventListener('click', function(e){ if(e.target === lightbox) closeLightbox(); });
  document.addEventListener('keydown', function(e){
    if(!lightbox.classList.contains('active')) return;
    if(e.key === 'Escape'){ closeLightbox(); return; }
    if(e.key === 'ArrowLeft') navigate(-1);
    if(e.key === 'ArrowRight') navigate(1);
    if(e.key === 'Tab') trapFocus(lightboxPanel, e);
  });
  });

  /* ---------- Process — sticky pinned number, active entry tracking ---------- */
  safe(function(){
  var processEntries = document.querySelectorAll('.process-entry');
  var processBigNum = document.getElementById('processBigNum');
  var processBigLabel = document.getElementById('processBigLabel');
  if(processEntries.length && 'IntersectionObserver' in window){
    var pIo = new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        if(entry.isIntersecting){
          processEntries.forEach(function(e){ e.classList.remove('active'); });
          entry.target.classList.add('active');
          if(processBigNum) processBigNum.textContent = entry.target.getAttribute('data-num');
          if(processBigLabel) processBigLabel.textContent = entry.target.getAttribute('data-label');
        }
      });
    }, { threshold:0.5, rootMargin:'-20% 0px -20% 0px' });
    processEntries.forEach(function(e){ pIo.observe(e); });
  }
  });

  /* ---------- Testimonials carousel ---------- */
  safe(function(){
  var testiTrack = document.getElementById('testiTrack');
  var testiCards = document.querySelectorAll('.testi-card');
  var testiDots = document.getElementById('testiDots');
  var testiPrev = document.getElementById('testiPrev');
  var testiNext = document.getElementById('testiNext');
  var testiViewport = document.getElementById('testiViewport');
  var testiIndex = 0;

  if(testiDots){
    testiCards.forEach(function(_, i){
      var b = document.createElement('button');
      if(i===0) b.classList.add('active');
      b.setAttribute('aria-label', 'Go to review ' + (i+1));
      b.addEventListener('click', function(){ goToTesti(i); });
      testiDots.appendChild(b);
    });
  }
  function updateDots(){
    Array.prototype.forEach.call(testiDots.children, function(d, i){ d.classList.toggle('active', i===testiIndex); });
  }
  function goToTesti(i){
    testiIndex = (i + testiCards.length) % testiCards.length;
    if(window.matchMedia('(max-width:760px)').matches){
      var card = testiCards[testiIndex];
      testiViewport.scrollTo({ left: card.offsetLeft - 8, behavior:'smooth' });
    } else {
      var cardWidth = testiCards[0].getBoundingClientRect().width + 28;
      testiTrack.style.transform = 'translateX(' + (-cardWidth * testiIndex) + 'px)';
    }
    updateDots();
  }
  testiPrev && testiPrev.addEventListener('click', function(){ goToTesti(testiIndex-1); });
  testiNext && testiNext.addEventListener('click', function(){ goToTesti(testiIndex+1); });

  /* Auto-scroll, pause on touch/hover */
  var autoTimer;
  function startAuto(){
    stopAuto();
    autoTimer = setInterval(function(){ goToTesti(testiIndex+1); }, 5500);
  }
  function stopAuto(){ if(autoTimer) clearInterval(autoTimer); }
  startAuto();
  [testiViewport, document.querySelector('.testimonials')].forEach(function(el){
    if(!el) return;
    el.addEventListener('mouseenter', stopAuto);
    el.addEventListener('mouseleave', startAuto);
    el.addEventListener('touchstart', stopAuto, {passive:true});
    el.addEventListener('touchend', function(){ setTimeout(startAuto, 4000); }, {passive:true});
  });

  /* Sync dots on manual mobile swipe */
  if(testiViewport){
    var scrollTimeout;
    testiViewport.addEventListener('scroll', function(){
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(function(){
        var scrollLeft = testiViewport.scrollLeft;
        var closest = 0, min = Infinity;
        testiCards.forEach(function(card, i){
          var diff = Math.abs(card.offsetLeft - 8 - scrollLeft);
          if(diff < min){ min = diff; closest = i; }
        });
        testiIndex = closest;
        updateDots();
      }, 100);
    }, { passive:true });
  }
  });

  /* ---------- FAQ accordion ---------- */
  safe(function(){
  document.querySelectorAll('.faq-item').forEach(function(item){
    var q = item.querySelector('.faq-q');
    var a = item.querySelector('.faq-a');
    q.addEventListener('click', function(){
      var isOpen = item.classList.contains('open');
      document.querySelectorAll('.faq-item.open').forEach(function(other){
        if(other !== item){
          other.classList.remove('open');
          other.querySelector('.faq-q').setAttribute('aria-expanded','false');
          other.querySelector('.faq-a').style.maxHeight = null;
        }
      });
      item.classList.toggle('open', !isOpen);
      q.setAttribute('aria-expanded', String(!isOpen));
      a.style.maxHeight = !isOpen ? a.scrollHeight + 'px' : null;
    });
  });
  });

  /* ---------- Contact form ---------- */
  safe(function(){
  var form = document.getElementById('contactForm');
  var formMsg = document.getElementById('formMsg');
  if(form){
    form.addEventListener('submit', function(e){
      e.preventDefault();
      if(!form.checkValidity()){
        formMsg.textContent = 'Please complete all required fields before submitting.';
        formMsg.className = 'form-msg show error';
        form.reportValidity();
        return;
      }
      formMsg.textContent = 'Thank you — your enquiry has been received. We will be in touch within one working day.';
      formMsg.className = 'form-msg show success';
      form.reset();
    });
  }
  });

  /* ---------- Cookie consent ---------- */
  safe(function(){
  var cookieBanner = document.getElementById('cookieBanner');
  var prefsModal = document.getElementById('prefsModal');
  var CONSENT_KEY = 'site_cookie_consent';

  function getConsent(){
    try{ return JSON.parse(localStorage.getItem(CONSENT_KEY)); }catch(e){ return null; }
  }
  function setConsent(analytics){
    localStorage.setItem(CONSENT_KEY, JSON.stringify({ analytics: analytics, ts: Date.now() }));
    cookieBanner.classList.remove('show');
    prefsModal.classList.remove('show');
  }
  if(cookieBanner && !getConsent()){
    setTimeout(function(){ cookieBanner.classList.add('show'); }, 900);
  }
  document.getElementById('cookieAccept') && document.getElementById('cookieAccept').addEventListener('click', function(){ setConsent(true); });
  document.getElementById('cookieReject') && document.getElementById('cookieReject').addEventListener('click', function(){ setConsent(false); });

  function openPrefs(){
    var consent = getConsent();
    var analyticsToggle = document.getElementById('prefsAnalytics');
    if(analyticsToggle) analyticsToggle.checked = consent ? consent.analytics : false;
    prefsModal.classList.add('show');
  }
  document.getElementById('cookieManage') && document.getElementById('cookieManage').addEventListener('click', openPrefs);
  document.getElementById('footerManageCookies') && document.getElementById('footerManageCookies').addEventListener('click', function(e){ e.preventDefault(); openPrefs(); });
  document.getElementById('prefsSave') && document.getElementById('prefsSave').addEventListener('click', function(){
    var analyticsToggle = document.getElementById('prefsAnalytics');
    setConsent(analyticsToggle ? analyticsToggle.checked : false);
  });
  prefsModal && prefsModal.addEventListener('click', function(e){ if(e.target === prefsModal) prefsModal.classList.remove('show'); });
  });

})();
