// Shared extras (privacy badge, dark mode, work auto-save) for every tool page.
(function(){if(document.querySelector('script[src*="miga-extras.js"]'))return;const s=document.createElement('script');s.src='miga-extras.js';s.defer=true;document.head.appendChild(s)})();
(function(){
  'use strict';
  const file=(location.pathname.split('/').pop()||'index.html').toLowerCase();
  const tools={
    'website-builder.html':['Website Builder','describe a business and choose the pages and features you need','Draft the site','preview every page, refine the copy, then download or publish it'],
    'app-forge.html':['App Forge','describe the browser app and the result it should produce','Generate app','test the app, refine it, and download the finished HTML'],
    'bot-forge.html':['Bot Forge','add the website details and questions customers usually ask','Build bot','test answers, refine them, and copy the widget to your site'],
    'cartoon-forge.html':['Cartoon Forge','describe the characters, setting, story, dialogue, and ending','Generate cartoon','play the cartoon, refine scenes, then record or download it'],
    'clip-forge.html':['Clip Forge','upload a video and choose the cut, captions, or translation','Process clip','preview the edit and download the finished clip'],
    'code-forge.html':['Code Forge','choose Python or JavaScript and describe what you want to learn','Start lesson','run the examples, answer the exercises, and continue at your pace'],
    'contract-forge.html':['Contract Forge','choose the agreement type and enter the real parties and terms','Draft contract','review every clause carefully, edit it, and export the document'],
    'cv-forge.html':['CV Forge','enter your contact details, summary, experience, education, and strongest skills','Download PDF','check the live preview, proofread every detail, and download or print the CV'],
    'document-forge.html':['Document Forge','drop in a document, image, or PDF and choose the output format','Convert & download','check the preview and open the converted download'],
    'file-forge.html':['File Forge','upload an image and choose the new format or size','Convert file','check the preview and download the converted file'],
    'game-forge.html':['Game Forge','describe the game, controls, goal, art style, and difficulty','Generate game','play-test it, request changes, and download the finished game'],
    '3d-game-forge.html':['3D Game Forge','describe your game in a sentence, or pick a template such as the endless runner, kart racer or maze','Make my 3D game','press Play, then change the world, hero, enemies and sliders, paint your own level, and copy the share link or download the game'],
    'invoice-forge.html':['Invoice Forge','enter the seller, customer, line items, prices, and payment terms','Create invoice','verify the totals and download or print the invoice'],
    'image-studio.html':['Image Studio','choose one or more images and select the background, collage, meme, thumbnail, or upscale tab','Apply background effect','check the live canvas and download the finished PNG'],
    'everyday-forge.html':['Everyday Forge','choose the everyday calculator or helper you need and enter its details','Calculate','review the result and copy or use it'],
    'grammar-forge.html':['Grammar Forge','choose a language and paste or type the writing you want to improve','Check writing','review each explanation, accept the useful fixes, and copy the corrected text'],
    'templates.html':['Template Gallery','browse the ready-made starting points and choose the result you want to create','Open template','customise the selected template in its Forge tool'],
    'logo-forge.html':['Logo Forge','enter the brand name, industry, style, colors, and symbol ideas','Generate logo','compare the result and download the logo, favicon, and brand kit'],
    'merge-forge.html':['Merge Forge','add clips, images, text, and music in the order you want','Merge media','preview the timeline and export the combined video'],
    'meet-forge.html':['Meet Forge','enter your name and create a meeting or an always-open community','Create new meeting','invite people, use the video room, or start separate topic discussions'],
    'ocr-forge.html':['OCR Forge','choose a clear image and select the document language','Extract text','check names and numbers, then copy or download the text'],
    'utility-forge.html':['Utility Forge','choose CSV/JSON conversion, text combining, or a checksum','Convert','review the output and download or copy the result'],
    'site-checkup.html':['Website Checkup','upload or paste the HTML you want to review','Run website checkup','work through the SEO and accessibility fixes, then download the report'],
    'pdf-forge.html':['PDF Forge','choose one or more PDF files and set the page order or rotation','Merge / create PDF','download the finished PDF or split pages into a ZIP'],
    'pdf-edit-forge.html':['Sign Documents','choose a PDF, Word file or photo of a document, then draw, type or upload your signature and press Use this signature','+ Signature','drag it into place, add the date if needed and download the signed document'],
    'pdf-compress.html':['Compress PDF','choose the PDF you want to make smaller and pick a compression level','Compress PDF','compare the sizes and download the compressed copy'],
    'sim-forge.html':['Vehicle Simulator','choose a vehicle, read how it works and learn its controls','Start the simulator','complete each mission, then take the knowledge check'],
    'geo-forge.html':['Geography Forge','click a country on the map or search for it to read its facts, history and customs','Generate quiz','answer the questions and review the ones you missed'],
    'project-hub.html':['Project Hub','review the projects and settings stored in this browser','Export local backup','open a project, restore a backup, or remove local data you no longer need'],
    'repurpose-forge.html':['Repurpose Forge','paste one piece of content and describe its audience and call to action','Create publishing pack','review, personalise, and copy the formats you need'],
    'form-forge.html':['Form Forge','add a title and list each question with its response type','Download form HTML','preview the form and share the self-contained downloaded file'],
    'cad-forge.html':['CAD Forge','set the wall height, wall thickness and roof, then draw walls, doors and windows on the plan','Load sample house','check the 3D house and timber frame, then download the drawings, material list and DXF file'],
    'boat-forge.html':['Boat Forge','pick a starting boat such as a skiff, canoe or sailboat, then shape the hull with the size and shape sliders','Add-ons','add people, an engine, a mast or a cabin, watch it float in 3D, then check the lines plan, stability and plywood panels and download the files'],
    'model-forge.html':['Model Forge','describe the 3D object and set its measurements and shape','Generate model','inspect it from every angle and export the printable model'],
    'music-forge.html':['Music Forge','choose the mood, tempo, instruments, and length','Generate music','listen, adjust the arrangement, and download the track'],
    'name-forge.html':['Name Forge','describe the business, audience, tone, and useful keywords','Generate names','shortlist the strongest names and check their domains'],
    'paint-forge.html':['Paint Forge','open an image or blank canvas and choose the editing tools','Apply edit','work with layers, compare the result, and export the image'],
    'palette-forge.html':['Palette Forge','choose a starting color or describe the brand mood','Build palette','check contrast and copy or download the accessible colors'],
    'post-forge.html':['Post Forge','choose the platform and describe the message, audience, and goal','Create post','refine the wording and image, then copy or publish the post'],
    'qr-forge.html':['QR Forge','paste the destination link or text and choose the QR style','Create QR code','scan-test it and download the final code'],
    'record-forge.html':['Record Forge','choose the screen or tab, microphone, and recording quality','Start recording','demonstrate the task, stop the recording, and download the WebM file'],
    'screen-forge.html':['Screen Share Forge','create a support session and choose what you want to share','Start session','share the link safely and end the session when help is finished'],
    'slide-forge.html':['Slide Forge','describe the topic, audience, purpose, and number of slides','Generate presentation','review each slide and download the PowerPoint file'],
    'talk-forge.html':['Talk Forge','upload a photo and add or record the spoken audio','Create talking photo','preview the lip movement and export the finished video'],
    'video-forge.html':['Video Forge','upload drawings or images and describe how they should move','Create video','preview the motion, adjust it, and download the video'],
    'bug-scanner.html':['Bug Scanner','paste your code, open files or drop a project zip, and choose the language','Scan code','read each problem and how to fix it, check the live preview of what the code builds, then copy the fixed code'],
    'alphabet-forge.html':['Alphabet Forge','choose a writing system such as Thai, Arabic or Mandarin and tap any symbol to hear it','Practise writing it','trace or copy the symbol on the writing pad, press Check for a score, then take the listening quiz'],
    'idea-atlas.html':['Idea Atlas','search or click a philosophy or ideology on the connections map to read its history and key thinkers','Generate quiz','answer the questions against the clock, read each explanation and try to beat your best score'],
    'biology-map.html':['Biology Map','tap any living thing on the tree of life to see how long ago we shared an ancestor and how much DNA we share','Generate quiz','explore DNA, gene expression, mutations, evolution and human diversity in the tabs, then play a quiz'],
    'chemistry-map.html':['Chemistry Map','tap any element in the periodic table to see its atom, forms, uses and compounds','Generate quiz','mix elements in the bowl, explore materials and the formula calculator, then play a quiz'],
    'body-map.html':['Body Map','pick a layer (organs, skeleton, muscles and tendons, or skin) and click any part to read how it works, its connections, illnesses and care','Generate quiz','follow a meal in Eating and drinking, try the Fasting slider, then play or make your own quiz'],
    'audio-forge.html':['Audio Forge','open an audio or video file, or record from your microphone','Keep selection','drag across the waveform to select a part, apply fades, volume or speed, then download MP3 or WAV'],
    'text-compare.html':['Text Compare','paste the original text on the left and the changed version on the right','Compare','review the highlighted additions, removals and changes, then download the report'],
    'exam-checker.html':['Exam Checker','build the exam, choose the question types and tap the correct answers — or press Load demo exam to try it','Load demo exam','print one sheet per student from the class list, test the reader with a photo of the correct answers, drop in every student\'s photo in any order, press Next answer to check, then download the results'],
    'flashcard-forge.html':['Flashcard Forge','create a deck and add cards by typing, pasting a list or letting AI write them from your notes','Make cards','study the due cards, grade how well you remembered each one, then take a test'],
    'memory-forge.html':['Memory Forge','choose a game such as Number cards, Symbol cards or the Chimp test, pick a level or set your own card counts and times, and choose with or without a clock','Start','memorise the cards, put them back in order, check your stars and move on to the next level'],
    '3d-cartoon.html':['3D Cartoon','describe your story in the Story idea box','Make my 3D cartoon','press play to watch it, tick Voices to hear it, or download it as a video'],
    'background-forge.html':['Background Forge','choose a photo with a clear subject','Remove background','check the cut-out edges and download the transparent PNG'],
    'big-five.html':['Big Five Personality','read how the private 50-question test works','Start private test','answer honestly, then read your report across the five dimensions'],
    'design-forge.html':['Design Forge','choose a thumbnail, meme or collage and add your images and text','Create design','check the preview and download the PNG'],
    'media-convert.html':['Media Convert','choose a video or audio file and pick GIF, audio extraction or live transcription','Create and download GIF','check the result, then download it or copy the transcript'],
    'media-convert-forge.html':['Media Convert Forge','choose a video and the output format','Convert and download','check the converted file after it downloads'],
    'pattern-lab.html':['Work Pattern Test','read the instructions and start when you are ready','Start work-pattern practice','answer each pattern question, then read the worked explanations and print your report'],
    'reasoning-test.html':['Reasoning Test','read how the private reasoning test works','Start private test','answer the questions, then study the worked explanations and print your report'],
    'strength-compass.html':['Strength Compass','read how the private assessment works','Begin private assessment','choose between each pair of statements, then read your top five strengths'],
    'writing-forge.html':['Writing Forge','paste the text you want to summarize or clean up','Summarize','compare the result, then copy it or download it as a text file']
  };
  const tool=tools[file]; if(!tool)return;
  const languages={
    en:{label:'English',voice:'en-US',watch:'Real walkthrough',hint:'Follow the real controls on this page with captions and voice.',play:'Start walkthrough',pause:'Pause',restart:'Run again',mute:'Voice on',unmute:'Voice off',step:'Step',steps:[n=>`Welcome to ${n}. This walkthrough uses the real tool controls on this page.`,(_,a)=>`First, ${a}. The relevant input is highlighted on the page.`,(_,a,b)=>`Next, choose your settings and use “${b}”. The real action control is highlighted.`,(_,a,b,c)=>`Finally, ${c}. Check the result carefully before publishing or sharing it.`]},
    es:{label:'Español',voice:'es-ES',watch:'Demostración real',hint:'Sigue los controles reales de esta página con subtítulos y voz.',play:'Iniciar demostración',pause:'Pausa',restart:'Repetir',mute:'Voz activada',unmute:'Voz desactivada',step:'Paso',steps:[n=>`Bienvenido a ${n}. Esta demostración utiliza los controles reales de la página.`,()=>`Primero, introduce claramente el contenido solicitado en el campo resaltado.`,(_,a,b)=>`Después, elige la configuración y usa «${b}». El control real está resaltado.`,()=>`Por último, revisa el resultado, haz los cambios necesarios y descárgalo o compártelo.`]},
    ar:{label:'العربية',voice:'ar-SA',watch:'عرض عملي حقيقي',hint:'اتبع عناصر التحكم الحقيقية في هذه الصفحة مع الترجمة والصوت.',play:'بدء العرض',pause:'إيقاف مؤقت',restart:'تشغيل مرة أخرى',mute:'الصوت يعمل',unmute:'الصوت متوقف',step:'الخطوة',steps:[n=>`مرحباً بك في ${n}. يستخدم هذا العرض عناصر التحكم الحقيقية في الصفحة.`,()=>`أولاً، أدخل التفاصيل المطلوبة بوضوح في الحقل المميز.`,(_,a,b)=>`بعد ذلك اختر الإعدادات واستخدم زر ${b}. تم تمييز عنصر التحكم الحقيقي.`,(_,a,b,c)=>`أخيراً، ${c}. تحقق دائماً من النتيجة قبل النشر.`]},
    zh:{label:'中文',voice:'zh-CN',watch:'真实操作演示',hint:'通过字幕和语音跟随本页的真实控件。',play:'开始演示',pause:'暂停',restart:'再次演示',mute:'语音开启',unmute:'语音关闭',step:'步骤',steps:[n=>`欢迎使用${n}。本演示使用页面上的真实工具控件。`,()=>`首先，在突出显示的输入区域清楚填写所需内容。`,(_,a,b)=>`然后选择设置并使用“${b}”。真实操作按钮已突出显示。`,(_,a,b,c)=>`最后，${c}。发布或分享前请仔细检查结果。`]},
    sw:{label:'Kiswahili',voice:'sw-KE',watch:'Mwongozo halisi',hint:'Fuata vidhibiti halisi vya ukurasa huu kwa manukuu na sauti.',play:'Anza mwongozo',pause:'Sitisha',restart:'Rudia',mute:'Sauti imewashwa',unmute:'Sauti imezimwa',step:'Hatua',steps:[n=>`Karibu kwenye ${n}. Mwongozo huu unatumia vidhibiti halisi vya zana kwenye ukurasa huu.`,()=>`Kwanza, weka maelezo kwa uwazi kwenye sehemu iliyoangaziwa.`,(_,a,b)=>`Kisha chagua mipangilio na utumie ${b}. Kidhibiti halisi kimeangaziwa.`,(_,a,b,c)=>`Mwisho, ${c}. Kagua matokeo kabla ya kuyachapisha au kuyashiriki.`]}
  };
  const box=document.createElement('details');box.className='miga-tutorial real-walkthrough';box.open=false;box.innerHTML='<summary><span><b>REAL WALKTHROUGH</b><span id="mt-title"></span></span><span>▶ actual controls</span></summary><div class="miga-tutorial-body"><div class="miga-tutorial-copy"><p id="mt-hint"></p><div class="miga-tutorial-controls"><select id="mt-lang" aria-label="Walkthrough language"></select><button type="button" data-primary id="mt-play"></button><button type="button" id="mt-voice"></button></div><small>Nothing is uploaded. The walkthrough only points to controls already on this page.</small></div><div class="miga-tutorial-screen" aria-live="polite"><span class="miga-tutorial-badge" id="mt-badge"></span><h3 id="mt-heading"></h3><p id="mt-caption"></p><div class="miga-tutorial-progress"><span id="mt-progress"></span></div><div class="miga-tutorial-dots" id="mt-dots"></div></div></div>';
  const anchor=document.querySelector('header')||document.body.firstElementChild;anchor.insertAdjacentElement('afterend',box);
  const q=id=>box.querySelector('#'+id),langSel=q('mt-lang');Object.entries(languages).forEach(([k,v])=>{const o=document.createElement('option');o.value=k;o.textContent=v.label;langSel.appendChild(o)});
  let index=0,timer=null,playing=false,voice=true,activeTarget=null;
  const visible=el=>el&&el.getClientRects().length&&getComputedStyle(el).visibility!=='hidden';
  const firstVisible=selector=>Array.from(document.querySelectorAll(selector)).find(el=>visible(el)&&!box.contains(el));
  const actionButton=()=>Array.from(document.querySelectorAll('button,input[type="button"],input[type="submit"],a.primary,.primary,a.card')).find(el=>visible(el)&&!box.contains(el)&&new RegExp(tool[2].split(/\s+/).filter(w=>w.length>2).slice(0,2).join('|'),'i').test(el.textContent||el.value||''))||firstVisible('button[data-primary],button.primary,.primary,button[type="submit"],input[type="submit"],a.card');
  const targets=()=>[
    document.querySelector('header')||document.querySelector('h1'),
    firstVisible('main textarea,main input:not([type="hidden"]):not([type="button"]):not([type="submit"]),main select,.panel textarea,.panel input:not([type="hidden"]),.panel select'),
    actionButton(),
    firstVisible('[id*="preview" i],[class*="preview" i],[id*="result" i],[class*="result" i],canvas,video,iframe,[id*="output" i],[class*="output" i]')
  ];
  function focusTarget(){if(activeTarget)activeTarget.classList.remove('miga-live-target');activeTarget=targets()[index]||null;if(activeTarget){activeTarget.classList.add('miga-live-target');activeTarget.scrollIntoView({behavior:'smooth',block:'center'});}}
  const texts=()=>languages[langSel.value].steps.map(fn=>fn(...tool));
  function speak(text){if(!voice||!('speechSynthesis'in window))return;speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.lang=languages[langSel.value].voice;u.rate=.95;speechSynthesis.speak(u)}
  function render(announce){const l=languages[langSel.value],all=texts();box.dir=langSel.value==='ar'?'rtl':'ltr';q('mt-title').textContent=l.watch;q('mt-hint').textContent=l.hint;q('mt-play').textContent=playing?l.pause:(index?l.restart:l.play);q('mt-voice').textContent=voice?l.mute:l.unmute;q('mt-badge').textContent=l.step+' '+(index+1)+' / '+all.length;q('mt-heading').textContent=index===0?tool[0]:l.watch;q('mt-caption').textContent=all[index];q('mt-progress').style.width=((index+1)/all.length*100)+'%';q('mt-dots').innerHTML=all.map((_,i)=>'<span class="'+(i===index?'active':'')+'"></span>').join('');if(announce){focusTarget();speak(all[index])}}
  function stop(){playing=false;clearTimeout(timer);timer=null;if(activeTarget){activeTarget.classList.remove('miga-live-target');activeTarget=null}if('speechSynthesis'in window)speechSynthesis.cancel();render(false)}
  function advance(){if(!playing)return;render(true);timer=setTimeout(()=>{if(index<texts().length-1){index++;advance()}else stop()},8000)}
  q('mt-play').onclick=()=>{box.open=true;if(playing){stop();return}if(index>=texts().length-1)index=0;playing=true;advance();render(false)};
  q('mt-voice').onclick=()=>{voice=!voice;if(!voice&&'speechSynthesis'in window)speechSynthesis.cancel();render(false)};
  langSel.onchange=()=>{index=0;stop();render(false)};
  box.addEventListener('toggle',()=>{if(!box.open)stop()});render(false);

  if(file==='meet-forge.html'){const actions=document.querySelector('.meeting-actions');if(actions){const cal=document.createElement('button');cal.type='button';cal.className='secondary';cal.textContent='Add to calendar';cal.onclick=()=>{const now=new Date(),end=new Date(now.getTime()+3600000),stamp=d=>d.toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,''),title=(document.getElementById('roomHeading')?.textContent||'MigaBuilder meeting').replace(/[\n,;]/g,' '),ics=['BEGIN:VCALENDAR','VERSION:2.0','BEGIN:VEVENT','DTSTAMP:'+stamp(now),'DTSTART:'+stamp(now),'DTEND:'+stamp(end),'SUMMARY:'+title,'URL:'+location.href,'DESCRIPTION:'+location.href.replace(/,/g,'\\,'),'END:VEVENT','END:VCALENDAR'].join('\r\n'),a=document.createElement('a'),u=URL.createObjectURL(new Blob([ics],{type:'text/calendar'}));a.href=u;a.download='migabuilder-meeting.ics';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000)};actions.insertBefore(cal,document.getElementById('shareBtn'))}}

  // Narrated video guide + the sample made in it (both produced by scripts/tutorial-videos).
  fetch('videos/manifest.json').then(r=>r.ok?r.json():null).then(m=>{
    const v=m&&m[file];if(!v||!v.video)return;
    const esc=t=>String(t).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    const mins=Math.floor((v.duration||0)/60)+':'+String((v.duration||0)%60).padStart(2,'0');
    const sampleHref='sample-viewer.html?tool='+encodeURIComponent(file);
    const sum=box.querySelector('summary');
    sum.innerHTML='<span><b>VIDEO GUIDE · '+mins+'</b><span>Watch how '+esc(tool[0])+' works — with voice</span><span id="mt-title" hidden></span></span><span class="miga-sum-actions">'+(v.sample?'<a class="miga-sample-link" href="'+sampleHref+'">See the sample made in this video</a>':'')+'<span>▶ Watch</span></span>';
    const sec=document.createElement('div');sec.className='miga-video';
    sec.innerHTML='<video controls preload="none" playsinline poster="'+esc(v.poster)+'"><source src="'+esc(v.video)+'" type="video/mp4">Your browser cannot play this video.</video>'+
      '<div class="miga-video-actions">'+(v.sample?'<a class="miga-sample-btn" href="'+sampleHref+'">👀 See the sample made in this video</a>':'')+'<a class="miga-video-dl" href="'+esc(v.video)+'" download>⬇ Download video</a></div>'+
      (v.transcript&&v.transcript.length?'<details class="miga-transcript"><summary>Read the transcript</summary><p>'+v.transcript.map(esc).join('</p><p>')+'</p></details>':'')+
      '<p class="miga-video-note">Prefer to follow along on this page? The interactive walkthrough below points to the real controls.</p>';
    const body=box.querySelector('.miga-tutorial-body');body.parentNode.insertBefore(sec,body);
    box.classList.add('has-video');
    const video=sec.querySelector('video');
    video.addEventListener('play',()=>{if(playing)stop()});
    box.addEventListener('toggle',()=>{if(!box.open)video.pause()});
  }).catch(()=>{});
})();
