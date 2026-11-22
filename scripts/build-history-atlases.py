#!/usr/bin/env python3
"""Writes the six history atlas pages (weapons, surgery, medicine, castles,
inventions, space) from one template, so they stay alike. The content of each
atlas lives in its own *-data.js file; the shared engine is history-atlas.js.

    python3 scripts/build-history-atlases.py

Run it after changing the template or the page texts below. Then run
node scripts/build-language-pages.mjs --check (these pages have no translations,
so they get no language copies).
"""
import json, os, re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

HEAD = '''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8"><link rel="icon" href="/favicon.svg" type="image/svg+xml"><link rel="manifest" href="/manifest.webmanifest"><meta name="theme-color" content="#081826"><script src="/sw-register.js" defer></script><script src="/web-analytics.js" defer></script><script src="usage-counter.js" defer></script>
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>{title}</title>
<meta name="description" content="{desc}">
<link rel="canonical" href="https://migabuilder.com/{page}">
<meta property="og:image" content="https://videos.migabuilder.com/{slug}.jpg"><meta name="twitter:card" content="summary_large_image">
<meta property="og:title" content="{og_title}">
<meta property="og:description" content="{og_desc}">
<meta property="og:url" content="https://migabuilder.com/{page}"><meta property="og:type" content="website">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&family=IBM+Plex+Sans:wght@400;600&display=swap" rel="stylesheet">
<link rel="stylesheet" href="local-tools.css"><link rel="stylesheet" href="tutorials.css"><link rel="stylesheet" href="history-atlas.css">
<script type="application/ld+json">{faq_ld}</script>
</head>
<body>
<nav class="tool-nav"><a href="index.html">← All tools</a><span>{name}</span></nav>
<header class="masthead"><div><h1>{name}</h1><p>{intro}</p></div></header>
<main>
<div id="atlas"></div>
</main>
<section class="miga-about" aria-labelledby="miga-about-h">
  <h2 id="miga-about-h">About {name}</h2>
  <p>{about}</p>
  <h3>How to use {name}</h3>
  <ol>{howto}</ol>
{faq_html}
  <p class="miga-about-rel">Related tools: {related}</p>
</section>
<footer>{footer}</footer>
<script src="atlas-art.js"></script>
<script src="{data}"></script>
<script src="history-atlas.js"></script>
<script>
HistoryAtlas.init({init});
</script>
<script src="tutorials.js" defer></script>
</body>
</html>
'''

ATLASES = [
  dict(slug='weapons-atlas', name='Weapons Atlas', data='weapons-data.js',
    title='Weapons Atlas — the history of weapons from stone tools to drones, with a quiz | MigaBuilder',
    desc='The history of weapons and armour in {N} illustrated entries — from 2.6-million-year-old stone tools, bows, swords and siege engines to gunpowder, tanks, jets, missiles and drones. Who invented each one, how it worked, how it was used and what it changed, on a timeline, with a scored quiz. Free, no signup.',
    og_title='Weapons Atlas — the history of weapons, from stone tools to drones | MigaBuilder',
    og_desc='{N} illustrated weapons, armour, siege engines, warships and aircraft through history: who invented them, how they worked and how they were used, with a timeline and a quiz.',
    intro='The history of weapons, from the first stone tools to drones: who invented each one, how it worked, how it was used and what it changed. Browse the cards or the timeline, then play the quiz.',
    about='Weapons Atlas tells the history of weapons and armour in {N} illustrated entries across nine eras: the Stone Age, the Bronze Age, the Iron Age and classical world, the Middle Ages, the age of gunpowder, the industrial age, the World Wars, the Cold War and today. It covers swords and daggers, clubs and axes, spears and polearms, bows and slings, siege engines, firearms, artillery and missiles, explosives, armour and shields, chariots and tanks, warships, aircraft and drones, and chemical, nuclear and cyber weapons — and the treaties that ban or limit some of them.',
    howto=['Search, or pick a group such as Siege engines or Firearms, or an era.', 'Open any card to read who invented it, how it worked, how it was used and a famous moment. Use ← Older and Newer → to walk through history.', 'Switch to the timeline to see every era with a short introduction.', 'Press “Generate quiz” and try to beat your best score, or download a printable quiz with an answer key.'],
    faq=[('What does Weapons Atlas cover?', '{N} weapons, armour, siege engines, warships and aircraft from the first stone tools 2.6 million years ago to the drones of today, each with who invented it, how it worked, how it was used and a famous moment in history.'),
         ('Does it explain how to make weapons?', 'No. It is a history atlas, like a museum: it explains how each weapon worked in general terms and what it changed, never how to make or modify one.'),
         ('Is Weapons Atlas free?', 'Yes. It is free to use, with no account and no paywall. Everything runs in your browser and nothing is uploaded.')],
    related=[('castle-atlas.html', 'Castle Atlas'), ('invention-atlas.html', 'Invention Atlas'), ('space-atlas.html', 'Space Atlas'), ('geo-forge.html', 'Geography Forge')],
    footer='Weapons Atlas · MigaBuilder · A history atlas for learning. Dates are the earliest well-documented examples; many weapons developed gradually in several places.',
    init=dict(key='weapons', items='WEAPONS', cats='WEAPON_CATS', eras='WEAPON_ERAS', word=['weapon', 'weapons'],
      searchHint='Search a weapon, a battle, an inventor or a country…', emptyIcon='⚔️',
      sections=[['how', '⚙️ How it worked'], ['use', '🗺️ How it was used'], ['ev', '📜 A famous moment']],
      whoLabel='Who invented or used it', whoQ='Who invented or first used “{n}”?', whenQ='When was “{n}” first used?',
      quizTitle='History of weapons quiz', quizFile='weapons-quiz.html',
      ranks=[[90, 'Field marshal 🎖️'], [75, 'General ⭐'], [55, 'Captain 🛡️'], [0, 'Recruit 🌱']],
      note='Weapons Atlas is a history atlas. It explains how weapons worked in general terms and what they changed — it does not explain how to make or modify any weapon. Many weapons, from poison gas to land mines and blinding lasers, are now banned by international treaties.')),
  dict(slug='surgery-atlas', name='Surgery Atlas', data='surgery-data.js',
    title='Surgery Atlas — how operations are done and the history of surgery, illustrated | MigaBuilder',
    desc='{N} operations and milestones in the history of surgery, illustrated: why each operation is done, the main steps, recovery and risks, and who first did it — from 7,000-year-old skull drilling to anaesthesia, heart transplants, keyhole and robotic surgery. With a timeline and a quiz. Free, no signup.',
    og_title='Surgery Atlas — how operations are done, and how surgery began | MigaBuilder',
    og_desc='Illustrated operations from appendix removal to heart transplants: why they are done, the steps, recovery and risks, and their history from ancient skull drilling to robots.',
    intro='How operations are done and how surgery began: why each operation is needed, the main steps, recovery and risks, and the people who first did it. From ancient skull drilling to robots.',
    about='Surgery Atlas explains {N} operations and milestones of surgery across six eras, from ancient Egypt, India, Greece and China to anaesthesia and antisepsis, the first heart operations and transplants, and today’s keyhole, laser and robotic surgery. Each operation has a simple illustration of where it is done, why it is needed, the main steps, recovery, the main risks and its history — including the patients, nurses and technicians whose part was long forgotten.',
    howto=['Search an operation or a body part, or pick a group such as Heart & blood vessels or Transplants.', 'Open a card to see why it is done, how it is done step by step, recovery, risks and its history.', 'Use the timeline to follow surgery from ancient times to robots.', 'Play the quiz, or download a printable quiz with answers for a class.'],
    faq=[('Is Surgery Atlas medical advice?', 'No. It explains operations in general terms, like a hospital information leaflet, for learning. Every patient is different — ask your own doctor or surgeon about your care.'),
         ('Are the pictures graphic?', 'No. Each operation is shown with a simple drawing of the body, the organ involved and the kind of instrument used — nothing gory.'),
         ('Is Surgery Atlas free?', 'Yes. It is free to use, with no account and no paywall. Everything runs in your browser and nothing is uploaded.')],
    related=[('body-map.html', 'Body Map'), ('medicine-atlas.html', 'Medicine & Disease Atlas'), ('visit-forge.html', 'Visit Forge'), ('flashcard-forge.html', 'Flashcard Forge')],
    footer='Surgery Atlas · MigaBuilder · For learning only, not medical advice. Ask your own doctor or surgeon about your care.',
    init=dict(key='surgery', items='SURGERIES', cats='SURGERY_CATS', eras='SURGERY_ERAS', word=['operation', 'operations and milestones'],
      searchHint='Search an operation, a body part or a surgeon…', emptyIcon='🩺',
      sections=[['why', '🎯 Why it is done'], ['steps', '🩺 How it is done'], ['rec', '🛏️ Recovery'], ['risk', '⚠️ Main risks', 'warn'], ['then', '📜 History']],
      whoLabel='Who first did it', whoQ='Who is linked to “{n}”?', whenQ='When was “{n}” first done?', picQ='Which operation or milestone does this picture show?',
      quizTitle='History of surgery quiz', quizFile='surgery-quiz.html',
      ranks=[[90, 'Chief surgeon 🩺'], [75, 'Surgeon ⭐'], [55, 'Junior doctor 📘'], [0, 'Medical student 🌱']],
      note='Surgery Atlas explains operations in general terms for learning, like a hospital information leaflet. It is not medical advice: every patient is different, so ask your own doctor or surgeon about your care.')),
  dict(slug='medicine-atlas', name='Medicine & Disease Atlas', data='medicine-data.js',
    title='Medicine & Disease Atlas — pandemics, vaccines and medicines through history | MigaBuilder',
    desc='The history of medicine and disease in illustrated entries: the Black Death, smallpox, cholera, Spanish flu, HIV and COVID-19; the vaccines, medicines and discoveries that beat them, from willow bark and germ theory to penicillin, insulin, mRNA and CRISPR. With a timeline and a quiz. Free, no signup.',
    og_title='Medicine & Disease Atlas — pandemics, vaccines and medicines through history | MigaBuilder',
    og_desc='Plagues and pandemics, and the vaccines, medicines, discoveries and public health ideas that beat them, on a timeline with a quiz.',
    intro='Plagues and pandemics, and the vaccines, medicines, discoveries and public-health ideas that beat them — from ancient remedies to penicillin, mRNA vaccines and gene editing.',
    about='Medicine & Disease Atlas covers the great epidemics and pandemics of history, from the Plague of Athens and the Black Death to Spanish flu, HIV and COVID-19, and the people and ideas that fought them: vaccines from smallpox to mRNA, medicines from willow bark to antibiotics and insulin, scientific discoveries from Vesalius and germ theory to DNA and CRISPR, the tools doctors use to look inside the body, and public-health work such as clean water, sewers, nursing and the eradication of smallpox.',
    howto=['Search a disease, a medicine or a scientist, or pick a group such as Vaccines or Pandemics.', 'Open a card to read what it is, how it works or spreads, and what it changed.', 'Use the timeline to follow medicine from ancient times to today.', 'Play the quiz, or download a printable quiz with answers.'],
    faq=[('Is the Medicine & Disease Atlas medical advice?', 'No. It is a history of medicine for learning. For your own health, ask a doctor, nurse or pharmacist.'),
         ('What does it cover?', 'Pandemics and diseases, vaccines, medicines, scientific discoveries, tools for diagnosis and public-health milestones, each with who was involved, how it works and what it changed.'),
         ('Is it free?', 'Yes. It is free to use, with no account and no paywall. Everything runs in your browser and nothing is uploaded.')],
    related=[('surgery-atlas.html', 'Surgery Atlas'), ('body-map.html', 'Body Map'), ('biology-map.html', 'Biology Map'), ('chemistry-map.html', 'Chemistry Map')],
    footer='Medicine & Disease Atlas · MigaBuilder · A history of medicine for learning, not medical advice.',
    init=dict(key='medicine', items='MEDICINES', cats='MEDICINE_CATS', eras='MEDICINE_ERAS', word=['entry', 'entries'],
      searchHint='Search a disease, a vaccine, a medicine or a scientist…', emptyIcon='🧪',
      sections=[['how', '🔬 How it works or spreads'], ['impact', '🌍 What it changed']],
      whoLabel='Who was involved', whoQ='Who is linked to “{n}”?', whenQ='When does the story of “{n}” begin?', picQ='Which disease, medicine or discovery does this picture show?',
      quizTitle='History of medicine quiz', quizFile='medicine-quiz.html',
      ranks=[[90, 'Professor 🧪'], [75, 'Doctor 🩺'], [55, 'Nurse 💉'], [0, 'Student 🌱']],
      note='The Medicine & Disease Atlas is a history of medicine for learning. It is not medical advice: for your own health, ask a doctor, nurse or pharmacist.')),
  dict(slug='castle-atlas', name='Castle Atlas', data='castle-data.js',
    title='Castle Atlas — castles, forts and fortifications through history, illustrated | MigaBuilder',
    desc='Castles and fortifications through history, illustrated: hillforts, Roman forts, the Great Wall, motte-and-bailey and concentric castles, Japanese castles, star forts and bunkers, plus moats, gatehouses, murder holes and the sieges that tested them. With a timeline and a quiz. Free, no signup.',
    og_title='Castle Atlas — castles and fortifications through history | MigaBuilder',
    og_desc='From hillforts and the Great Wall to concentric castles, star forts and bunkers: how they defended, the parts of a castle and the sieges that tested them.',
    intro='Walls, castles and forts from the first town walls to Cold War bunkers: how each one defended, the parts of a castle, and the sieges that tested them.',
    about='Castle Atlas covers fortifications on every continent: early town walls and hillforts, ancient walls from Mycenae and Babylon to the Great Wall of China and Hadrian’s Wall, medieval castles from motte-and-bailey to concentric castles, fortresses in Africa, Asia and the Americas, the parts of a castle such as moats, gatehouses, portcullises and murder holes, siege tactics, gunpowder-age star forts and modern lines and bunkers.',
    howto=['Search a castle, a country or a castle part, or pick a group such as Medieval castles or Castle parts.', 'Open a card to read how it defended and a famous siege.', 'Use the timeline to see how walls changed with each new weapon.', 'Play the quiz, or download a printable quiz with answers.'],
    faq=[('What does Castle Atlas cover?', 'Town walls, hillforts, ancient walls, medieval castles, fortresses around the world, the parts of a castle, siege tactics, star forts and modern fortifications — each with how it defended and a famous siege or story.'),
         ('Can I see castles from outside Europe?', 'Yes. It includes fortresses and walls from Africa, Asia, the Middle East and the Americas, such as Great Zimbabwe, Benin City’s walls, Sacsayhuamán, Himeji Castle and Hwaseong Fortress.'),
         ('Is Castle Atlas free?', 'Yes. It is free to use, with no account and no paywall. Everything runs in your browser and nothing is uploaded.')],
    related=[('weapons-atlas.html', 'Weapons Atlas'), ('cad-forge.html', 'CAD Forge'), ('geo-forge.html', 'Geography Forge'), ('invention-atlas.html', 'Invention Atlas')],
    footer='Castle Atlas · MigaBuilder · A history atlas for learning. Building dates are when building began; most castles were changed many times.',
    init=dict(key='castles', items='CASTLES', cats='CASTLE_CATS', eras='CASTLE_ERAS', word=['fortification', 'fortifications'],
      searchHint='Search a castle, a country, a siege or a castle part…', emptyIcon='🏰',
      sections=[['how', '🛡️ How it defended'], ['siege', '⚔️ Famous siege or story']],
      whoLabel='Who built it', whoQ='Who built or designed “{n}”?', whenQ='When was “{n}” built?', picQ='Which castle, wall or castle part does this picture show?',
      quizTitle='Castles and fortifications quiz', quizFile='castle-quiz.html',
      ranks=[[90, 'Castellan 🏰'], [75, 'Knight ⚔️'], [55, 'Squire 🛡️'], [0, 'Page 🌱']],
      note='')),
  dict(slug='invention-atlas', name='Invention Atlas', data='invention-data.js',
    title='Invention Atlas — the inventions that changed the world, from fire to AI | MigaBuilder',
    desc='The inventions that changed the world, illustrated: fire, the wheel, writing, paper, printing, the compass, steam engines, electricity, the telephone, cars, planes, computers, the internet, smartphones and AI. Who invented each one, how it works and what it changed, on a timeline with a quiz. Free, no signup.',
    og_title='Invention Atlas — inventions that changed the world, from fire to AI | MigaBuilder',
    og_desc='From the wheel and writing to steam, electricity, computers and AI: who invented each one, how it works and what it changed, with a timeline and a quiz.',
    intro='The inventions that changed the world, from fire and the wheel to smartphones and AI: who invented each one, how it works and what it changed.',
    about='Invention Atlas tells the stories of inventions in tools and making, farming and food, energy and power, transport, communication, computing, science instruments, everyday life, materials and building. Each entry explains who invented it, how it works in plain words, what it changed, and a surprising fact — with credit to inventors from every part of the world.',
    howto=['Search an invention or an inventor, or pick a group such as Transport or Computing.', 'Open a card to read who invented it, how it works and what it changed.', 'Use the timeline to see what was invented in each era.', 'Play the quiz, or download a printable quiz with answers.'],
    faq=[('What does Invention Atlas cover?', 'Inventions in tools, farming, energy, transport, communication, computing, science, everyday life, materials and building — from stone tools to AI — each with who invented it, how it works and what it changed.'),
         ('Why do some inventions have several inventors?', 'Many inventions were made by several people at about the same time, or improved step by step. The atlas names the main people and explains who did what.'),
         ('Is Invention Atlas free?', 'Yes. It is free to use, with no account and no paywall. Everything runs in your browser and nothing is uploaded.')],
    related=[('space-atlas.html', 'Space Atlas'), ('physics-map.html', 'Physics Map'), ('chemistry-map.html', 'Chemistry Map'), ('weapons-atlas.html', 'Weapons Atlas')],
    footer='Invention Atlas · MigaBuilder · Dates are the first working example or patent; many inventions grew from the work of many people.',
    init=dict(key='inventions', items='INVENTIONS', cats='INVENTION_CATS', eras='INVENTION_ERAS', word=['invention', 'inventions'],
      searchHint='Search an invention, an inventor or a country…', emptyIcon='💡',
      sections=[['how', '⚙️ How it works'], ['impact', '🌍 What it changed']],
      whoLabel='Who invented it', whoQ='Who invented “{n}”?', whenQ='When was “{n}” invented?', picQ='Which invention does this picture show?',
      quizTitle='Inventions quiz', quizFile='inventions-quiz.html',
      ranks=[[90, 'Genius inventor 💡'], [75, 'Engineer ⚙️'], [55, 'Tinkerer 🔧'], [0, 'Apprentice 🌱']],
      note='')),
  dict(slug='space-atlas', name='Space Atlas', data='space-data.js',
    title='Space Atlas — the history of astronomy and space exploration, illustrated | MigaBuilder',
    desc='The history of astronomy and space exploration, illustrated: Stonehenge, Copernicus and Galileo, telescopes, rockets, Sputnik, Gagarin, Apollo 11, the Space Shuttle, the ISS, Mars rovers, Voyager, Hubble and James Webb, and discoveries from Neptune to black holes. With a timeline and a quiz. Free, no signup.',
    og_title='Space Atlas — astronomy and space exploration through history | MigaBuilder',
    og_desc='From ancient sky-watchers and Galileo to Sputnik, Apollo, Mars rovers, Voyager and the James Webb telescope, with a timeline and a quiz.',
    intro='The history of astronomy and space exploration: ancient sky-watchers, telescopes and discoveries, rockets and satellites, astronauts, the Moon landings, probes to every planet and the great space telescopes.',
    about='Space Atlas covers astronomy and spaceflight from ancient observatories and the ideas of Aristarchus, Aryabhata, Copernicus, Galileo, Kepler and Newton, through the discovery of planets, galaxies, pulsars, exoplanets and black holes, to the space age: rockets, satellites, the first animals and people in space, the Moon landings, space stations, rovers and probes to every planet, and the Hubble and James Webb telescopes — with missions from the USA, the Soviet Union and Russia, Europe, China, India and Japan.',
    howto=['Search a mission, a planet, a telescope or an astronomer, or pick a group such as The Moon or Human spaceflight.', 'Open a card to read what happened, how it worked and what we learned.', 'Use the timeline to follow astronomy from ancient times to today.', 'Play the quiz, or download a printable quiz with answers.'],
    faq=[('What does Space Atlas cover?', 'Ancient astronomy, great astronomers and discoveries, telescopes and observatories, rockets, satellites, human spaceflight, the Moon, probes to the planets, space stations and today’s missions.'),
         ('Does it include missions from countries other than the USA?', 'Yes. It includes Soviet and Russian, European, Chinese, Indian and Japanese missions, as well as American ones.'),
         ('Is Space Atlas free?', 'Yes. It is free to use, with no account and no paywall. Everything runs in your browser and nothing is uploaded.')],
    related=[('physics-map.html', 'Physics Map'), ('invention-atlas.html', 'Invention Atlas'), ('weapons-atlas.html', 'Weapons Atlas'), ('geo-forge.html', 'Geography Forge')],
    footer='Space Atlas · MigaBuilder · A history atlas for learning. Mission dates are launch or arrival dates as noted.',
    init=dict(key='space', items='SPACE', cats='SPACE_CATS', eras='SPACE_ERAS', word=['milestone', 'milestones'],
      searchHint='Search a mission, a planet, a telescope or an astronomer…', emptyIcon='🚀',
      sections=[['how', '🛰️ How it worked'], ['impact', '🔭 What we learned']],
      whoLabel='Who was involved', whoQ='Who is linked to “{n}”?', whenQ='When did “{n}” happen?', picQ='Which mission or discovery does this picture show?',
      quizTitle='Space and astronomy quiz', quizFile='space-quiz.html',
      ranks=[[90, 'Mission commander 🚀'], [75, 'Astronaut 👩‍🚀'], [55, 'Astronomer 🔭'], [0, 'Cadet 🌱']],
      note=''))
]


def esc(s):
    return s.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;').replace('"', '&quot;')


def count_items(data_file, var):
    """Counts the entries in a data file (each entry starts a line with `{ id: '`)."""
    src = open(os.path.join(ROOT, data_file), encoding='utf-8').read()
    return len(re.findall(r"^\s*\{ id: '", src, re.M))


def build(a):
    n = count_items(a['data'], a['init']['items'])
    # Texts say {N} where the number of entries goes, so it stays right when entries are added.
    a = json.loads(json.dumps(a, ensure_ascii=False).replace('{N}', str(n)))
    faq_ld = json.dumps({'@context': 'https://schema.org', '@type': 'FAQPage', 'mainEntity': [{'@type': 'Question', 'name': q, 'acceptedAnswer': {'@type': 'Answer', 'text': t}} for q, t in a['faq']]}, ensure_ascii=False)
    faq_html = '\n'.join('  <h3>' + esc(q) + '</h3>\n  <p>' + esc(t) + '</p>' for q, t in a['faq'])
    init = dict(a['init'])
    items, cats, eras = init.pop('items'), init.pop('cats'), init.pop('eras')
    init_js = '{\n  ' + 'items: ' + items + ', cats: ' + cats + ', eras: ' + eras + ', title: ' + json.dumps(a['name'], ensure_ascii=False) + ', page: ' + json.dumps(a['slug'] + '.html') + ',\n  ' + ',\n  '.join(k + ': ' + json.dumps(v, ensure_ascii=False) for k, v in init.items()) + '\n}'
    html = HEAD.format(title=esc(a['title']), desc=esc(a['desc']), page=a['slug'] + '.html', slug=a['slug'], og_title=esc(a['og_title']), og_desc=esc(a['og_desc']),
                       faq_ld=faq_ld, name=esc(a['name']), intro=esc(a['intro']), about=esc(a['about']), howto=''.join('<li>' + esc(h) + '</li>' for h in a['howto']),
                       faq_html=faq_html, related=' · '.join('<a href="' + h + '">' + esc(t) + '</a>' for h, t in a['related']), footer=esc(a['footer']), data=a['data'], init=init_js)
    open(os.path.join(ROOT, a['slug'] + '.html'), 'w', encoding='utf-8').write(html)
    return n


if __name__ == '__main__':
    import sys
    only = sys.argv[1:]
    for a in ATLASES:
        if only and a['slug'] not in only:
            continue
        if not os.path.exists(os.path.join(ROOT, a['data'])):
            print('skip (no data yet):', a['slug'])
            continue
        print(a['slug'], build(a), 'entries')
