#!/usr/bin/env python3
"""Lists which emoji the monochrome Noto Emoji font draws as one picture.

    pip install uharfbuzz
    python3 scripts/coloring-library/noto-coverage.py NotoEmoji.ttf openmoji/data/openmoji.json > noto-coverage.json

build.mjs reads the result to decide which pictures get the "Bold" (Noto Emoji) style.
"""
import json, sys
import uharfbuzz as hb

font_path, data_path = sys.argv[1], sys.argv[2]
blob = hb.Blob.from_file_path(font_path)
font = hb.Font(hb.Face(blob))
ok = []
for e in json.load(open(data_path, encoding='utf-8')):
    text = e['emoji']
    buf = hb.Buffer()
    buf.add_str(text)
    buf.guess_segment_properties()
    hb.shape(font, buf, {})
    glyphs = [g.codepoint for g in buf.glyph_infos]
    # One real glyph (variation selectors may leave zero-width extras with id 0 removed by the shaper).
    real = [g for g, p in zip(glyphs, buf.glyph_positions) if p.x_advance > 0]
    if glyphs and 0 not in glyphs and len(real) == 1:
        ok.append(e['hexcode'])
json.dump(ok, sys.stdout)
