#!/usr/bin/env python3
"""Rebuild geo-data.json for Geography Forge.

Sources: the `world-countries` npm package (mledoze/countries, ODbL) for names,
capitals, currencies, languages, borders and flags, and Wikidata (CC0) for
government type, leaders, legislature, population, driving side and the titles
of each country's history and culture articles.

Usage (from the repository root):
    npm pack world-countries && tar xzf world-countries-*.tgz
    python3 scripts/build-geo-data.py package/countries.json

The *Geography data* workflow (.github/workflows/geo-data.yml) runs this every
month. Before overwriting geo-data.json the new data is compared with the old
file; if it looks broken (places or leaders missing, e.g. because Wikidata was
down), nothing is written and the script exits with an error. It also writes
geo-data-meta.json, whose date Geography Forge shows as "Data updated".

Wikidata responses are cached in .geo-cache/ so an interrupted run can resume.
Wikimedia rate-limits heavy use, so the script is deliberately slow and polite.
"""
import json, os, re, sys, time, urllib.error, urllib.parse, urllib.request

UA = {'User-Agent': 'MigaBuilderGeoBuild/1.0 (https://migabuilder.com)'}
CACHE = '.geo-cache'
OUT = 'geo-data.json'
PROPS = ('P122', 'P35', 'P6', 'P194', 'P1082', 'P1622', 'P2184', 'P2596')
LANGS = ('en', 'es', 'ar', 'zh', 'sw')
# English Wikipedia titles where the common name is ambiguous or differs.
TITLES = {'GE': 'Georgia (country)', 'CG': 'Republic of the Congo', 'CD': 'Democratic Republic of the Congo', 'IE': 'Republic of Ireland',
          'PS': 'State of Palestine', 'VA': 'Vatican City', 'MO': 'Macau', 'KR': 'South Korea', 'KP': 'North Korea',
          'FM': 'Federated States of Micronesia', 'GM': 'The Gambia', 'BS': 'The Bahamas', 'TL': 'East Timor', 'CV': 'Cape Verde',
          'CI': 'Ivory Coast', 'SH': 'Saint Helena, Ascension and Tristan da Cunha', 'UM': 'United States Minor Outlying Islands',
          'BQ': 'Caribbean Netherlands', 'PN': 'Pitcairn Islands', 'NE': 'Niger', 'GN': 'Guinea', 'MF': 'Collectivity of Saint Martin',
          'HM': 'Heard Island and McDonald Islands', 'CC': 'Cocos (Keeling) Islands', 'SJ': 'Svalbard and Jan Mayen', 'AX': 'Åland',
          'CN': 'China', 'US': 'United States', 'GB': 'United Kingdom', 'NL': 'Netherlands', 'MK': 'North Macedonia'}
# Government type for countries whose Wikidata entry has none (checked September 2026).
FALLBACK_GOV={'CF':'presidential republic','CR':'presidential republic','DJ':'semi-presidential republic','DM':'parliamentary republic','DO':'presidential republic','ER':'one-party presidential republic','FJ':'parliamentary republic','GW':'semi-presidential republic','GQ':'presidential republic','GD':'parliamentary constitutional monarchy','HT':'semi-presidential republic','JM':'parliamentary constitutional monarchy','JO':'constitutional monarchy','KE':'presidential republic','KI':'parliamentary republic with an executive president','MV':'presidential republic','MH':'parliamentary republic','ML':'republic under a military-led transitional government','MZ':'presidential republic','MW':'presidential republic','NA':'presidential republic','NE':'republic under military rule','NR':'parliamentary republic','PW':'presidential republic','PG':'parliamentary constitutional monarchy','PY':'presidential republic','SB':'parliamentary constitutional monarchy','RS':'parliamentary republic','ST':'semi-presidential republic','SC':'presidential republic','TD':'presidential republic','TG':'parliamentary republic','TO':'constitutional monarchy','TV':'parliamentary constitutional monarchy','TZ':'presidential republic','VU':'parliamentary republic','WS':'parliamentary republic','ZW':'presidential republic'}


def request(url, redirect=True):
    for attempt in range(8):
        try:
            if redirect:
                return urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=90)
            class NoRedirect(urllib.request.HTTPRedirectHandler):
                def redirect_request(self, *args): return None
            return urllib.request.build_opener(NoRedirect).open(urllib.request.Request(url, headers=UA), timeout=90)
        except urllib.error.HTTPError as e:
            if e.code in (301, 302, 303, 404) or (not redirect and e.code in (301, 302, 303)):
                raise
            time.sleep(8 * (attempt + 1))
        except OSError:
            time.sleep(8 * (attempt + 1))
    raise SystemExit('Giving up on ' + url)


def qid_for(title):
    path = os.path.join(CACHE, 'qids.json')
    known = json.load(open(path)) if os.path.exists(path) else {}
    if title not in known:
        try:
            request('https://www.wikidata.org/wiki/Special:ItemByTitle/enwiki/' + urllib.parse.quote(title.replace(' ', '_'), safe=''), redirect=False)
            known[title] = None
        except urllib.error.HTTPError as e:
            known[title] = e.headers['Location'].rsplit('/', 1)[-1] if e.code in (301, 302, 303) else None
        json.dump(known, open(path, 'w'))
        time.sleep(.5)
    return known[title]


def entity(q):
    path = os.path.join(CACHE, q + '.json')
    if os.path.exists(path):
        return json.load(open(path))
    try:
        data = json.load(request('https://www.wikidata.org/wiki/Special:EntityData/%s.json' % q))
    except urllib.error.HTTPError:
        return None
    d = data['entities'].get(q) or next(iter(data['entities'].values()))
    d = {'id': d['id'], 'labels': {k: v for k, v in d.get('labels', {}).items() if k in LANGS + ('mul',)},
         'claims': {p: d['claims'][p] for p in PROPS if p in d.get('claims', {})},
         'sitelinks': {k: v['title'] for k, v in d.get('sitelinks', {}).items() if k in tuple(l + 'wiki' for l in LANGS)}}
    json.dump(d, open(path, 'w'))
    time.sleep(.5)
    return d


def truthy(claims,p):
    sts=[s for s in claims.get(p,[]) if s.get('rank')!='deprecated' and 'P582' not in s.get('qualifiers',{})]
    pref=[s for s in sts if s.get('rank')=='preferred']
    sts=pref or sts
    if p in('P35','P6') and len(sts)>1:
        def start(s):
            q=s.get('qualifiers',{}).get('P580',[])
            return q[0]['datavalue']['value']['time'] if q and 'datavalue' in q[0] else ''
        sts=sorted(sts,key=start,reverse=True)[:1]
    out=[]
    for s in sts:
        dv=s['mainsnak'].get('datavalue')
        if dv: out.append(dv['value'])
    return out
def ids(claims,p): return [v['id'] for v in truthy(claims,p) if isinstance(v,dict) and 'id' in v]


def label(q, lang='en'):
    e = entity(q)
    if not e: return None
    v = (e['labels'].get(lang) or e['labels'].get('en') or e['labels'].get('mul') or {}).get('value')
    # Wikidata increasingly keeps names in a shared 'mul' label; fall back to the English Wikipedia title.
    if not v and e.get('sitelinks', {}).get('enwiki'):
        v = re.sub(r' \([^)]*\)$', '', e['sitelinks']['enwiki'])
    return v


def labels(d, p):
    out = []
    for q in ids(d['claims'], p):
        v = label(q)
        if v and v not in out: out.append(v)
    return out


def links(q):
    e = entity(q) if q else None
    return {k[:2]: v for k, v in e.get('sitelinks', {}).items()} or None if e else None


def main(countries_path):
    os.makedirs(CACHE, exist_ok=True)
    C = json.load(open(countries_path))
    Q = {c['cca2']: {'qid': qid_for(TITLES.get(c['cca2'], c['name']['common']))} for c in C}
    ent = lambda q: entity(q) if q else None
    out = {}; missing = 0
    cca3={c['cca3']:c['cca2'] for c in C}
    out={};missing=0
    for c in C:
        k=c['cca2'];q=Q.get(k,{}).get('qid');d=ent(q) if q else None
        if not d: missing+=1;d={'claims':{},'labels':{},'sitelinks':{}}
        idd=c.get('idd',{});cc=idd.get('root','')+(idd['suffixes'][0] if len(idd.get('suffixes',[]))==1 else '')
        pop=None;popy=None
        for v in truthy(d['claims'],'P1082'):
            try: pop=max(pop or 0,float(v['amount']))
            except Exception: pass
        # when several population values are truthy take the most recent statement instead of the max
        ps=[s for s in d['claims'].get('P1082',[]) if s.get('rank')!='deprecated']
        def when(s):
            qq=s.get('qualifiers',{}).get('P585',[]);return qq[0]['datavalue']['value']['time'] if qq and 'datavalue' in qq[0] else ''
        if ps:
            best=sorted(ps,key=when)[-1];dv=best['mainsnak'].get('datavalue')
            if dv: pop=float(dv['value']['amount'])
            # (before: this ran for every place, so a place without population statements got the previous place's year)
            popy=when(best)[1:5] or None
        drive=None
        for q2 in ids(d['claims'],'P1622'): drive=label(q2)
        hist=ids(d['claims'],'P2184');cult=ids(d['claims'],'P2596')
        rec={'n':c['name']['common'],'o':c['name']['official'],'f':c['flag'],'r':c['region'],'s':c.get('subregion') or None,'c':c.get('capital') or [],
          'cur':[[code,v.get('name'),v.get('symbol')] for code,v in (c.get('currencies') or {}).items()],'l':list((c.get('languages') or {}).values()),
          'pop':round(pop) if pop else None,'popy':popy,'area':c.get('area'),'g':labels(d,'P122') or ([FALLBACK_GOV[k]] if k in FALLBACK_GOV else []),'hs':labels(d,'P35'),'hg':labels(d,'P6'),'leg':labels(d,'P194'),
          'drv':drive,'cc':cc or None,'tld':(c.get('tld') or [None])[0],'b':[cca3[x] for x in c.get('borders',[]) if x in cca3],
          'dem':(c.get('demonyms',{}).get('eng') or {}).get('m'),'ll':c.get('latlng'),'lk':c.get('landlocked'),'ind':c.get('independent'),'un':c.get('unMember'),
          'id':c.get('ccn3') or None,'w':{k2[:2]:v for k2,v in d.get('sitelinks',{}).items()} or None,'h':links(hist[0]) if hist else None,'cu':links(cult[0]) if cult else None,
          'nm':{'es':c['translations'].get('spa',{}).get('common'),'ar':c['translations'].get('ara',{}).get('common'),'zh':c['translations'].get('zho',{}).get('common'),'sw':(d['labels'].get('sw') or {}).get('value')}}
        if rec['ind'] is False: rec['st']='Dependent territory'
        out[k]={a:b for a,b in rec.items() if b not in (None,[],{},'')}
    problems = sanity_check(out)
    if problems:
        raise SystemExit('Not writing %s, the new data looks wrong:\n  ' % OUT + '\n  '.join(problems))
    changed = describe_changes(out)
    json.dump(out, open(OUT, 'w'), ensure_ascii=False, separators=(',', ':'))
    json.dump({'updated': time.strftime('%Y-%m-%d', time.gmtime()), 'places': len(out),
               'sources': ['world-countries (mledoze/countries, ODbL)', 'Wikidata (CC0)']},
              open('geo-data-meta.json', 'w'), indent=1)
    print('Wrote %d places to %s (%d without Wikidata)' % (len(out), OUT, missing))
    for line in changed: print('  ' + line)


def sanity_check(new):
    """Refuse data that lost a lot compared with the committed file (a Wikidata outage, a changed API...)."""
    problems = []
    if len(new) < 240: problems.append('only %d places (expected about 250)' % len(new))
    try: old = json.load(open(OUT))
    except (OSError, ValueError): return problems
    if len(new) < len(old) - 3: problems.append('%d places, was %d' % (len(new), len(old)))
    for field, what in (('hs', 'heads of state'), ('hg', 'heads of government'), ('pop', 'populations'), ('g', 'government types'), ('c', 'capitals')):
        was = sum(1 for c in old.values() if c.get(field)); now = sum(1 for c in new.values() if c.get(field))
        if now < was * 0.9: problems.append('%s: %d, was %d' % (what, now, was))
    return problems


def describe_changes(new):
    """Short human-readable list of what changed, for the workflow log and commit message."""
    try: old = json.load(open(OUT))
    except (OSError, ValueError): return []
    lines = []
    for k, c in sorted(new.items()):
        o = old.get(k)
        if not o: lines.append('%s: new place' % c['n']); continue
        for field, what in (('hs', 'head of state'), ('hg', 'head of government'), ('c', 'capital'), ('g', 'government')):
            if o.get(field) != c.get(field):
                lines.append('%s %s: %s -> %s' % (c['n'], what, ', '.join(o.get(field) or ['-']), ', '.join(c.get(field) or ['-'])))
    for k in sorted(set(old) - set(new)): lines.append('%s: removed' % old[k]['n'])
    return lines


if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else 'package/countries.json')
