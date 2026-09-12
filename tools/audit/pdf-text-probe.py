#!/usr/bin/env python3
"""SIGN-OFF DELIVERY — diagnostic only.

Answers one question: can the Arabic in the frozen RC1 session PDFs be
extracted as valid Unicode, or is the text layer damaged the way the original
v1.2.0 reports were? It parses the ToUnicode CMaps and decodes the page
content streams with pure stdlib. It writes nothing into the PDFs and touches
no production code.
"""
import re, sys, zlib, unicodedata

def objects(data):
    out = {}
    for m in re.finditer(rb'(\d+)\s+(\d+)\s+obj\b', data):
        num = int(m.group(1))
        end = data.find(b'endobj', m.end())
        out[num] = data[m.end():end if end != -1 else len(data)]
    return out

def stream_of(body):
    m = re.search(rb'stream\r?\n', body)
    if not m:
        return None
    raw = body[m.end():body.rfind(b'endstream')]
    if b'/FlateDecode' in body[:m.start()]:
        try:
            return zlib.decompress(raw)
        except zlib.error:
            return None
    return raw

def parse_tounicode(cmap):
    m = {}
    for blk in re.findall(rb'beginbfchar(.*?)endbfchar', cmap, re.S):
        for src, dst in re.findall(rb'<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>', blk):
            m[int(src, 16)] = bytes.fromhex(dst.decode()).decode('utf-16-be', 'replace')
    for blk in re.findall(rb'beginbfrange(.*?)endbfrange', cmap, re.S):
        for lo, hi, dst in re.findall(rb'<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>', blk):
            lo_i, hi_i = int(lo, 16), int(hi, 16)
            base = int(dst, 16)
            for k in range(lo_i, hi_i + 1):
                m[k] = chr(base + (k - lo_i))
    return m

def extract(path, max_pages=None):
    data = open(path, 'rb').read()
    objs = objects(data)
    # font object number -> ToUnicode map
    font_map = {}
    for num, body in objs.items():
        tm = re.search(rb'/ToUnicode\s+(\d+)\s+\d+\s+R', body)
        if tm:
            cm = stream_of(objs.get(int(tm.group(1)), b''))
            if cm:
                font_map[num] = parse_tounicode(cm)
    # page resources: resource name -> font object number
    pages = []
    for num, body in objs.items():
        if b'/Type' in body and re.search(rb'/Type\s*/Page\b', body):
            res = {}
            fm = re.search(rb'/Font\s*<<(.*?)>>', body, re.S)
            if fm:
                for name, ref in re.findall(rb'/([A-Za-z0-9]+)\s+(\d+)\s+\d+\s+R', fm.group(1)):
                    res[name.decode()] = int(ref)
            cm = re.search(rb'/Contents\s+(\d+)\s+\d+\s+R', body)
            if cm:
                pages.append((num, res, int(cm.group(1))))
    pages.sort()
    out = []
    for _, res, cnum in (pages[:max_pages] if max_pages else pages):
        content = stream_of(objs.get(cnum, b''))
        if not content:
            continue
        cur = {}
        buf = []
        for tok in re.finditer(rb'/([A-Za-z0-9]+)\s+[\d.]+\s+Tf|<([0-9A-Fa-f]*)>\s*Tj|\[(.*?)\]\s*TJ|\(((?:\\.|[^\\)])*)\)\s*Tj|\bTJ\b|\bT\*|\bTd\b|\bTD\b', content, re.S):
            if tok.group(1):
                cur = font_map.get(res.get(tok.group(1).decode(), -1), {})
            elif tok.group(2) is not None:
                buf.append(decode_hex(tok.group(2), cur))
            elif tok.group(3) is not None:
                for h in re.findall(rb'<([0-9A-Fa-f]*)>', tok.group(3)):
                    buf.append(decode_hex(h, cur))
        out.append(''.join(buf))
    return out

def decode_hex(h, cmap):
    s = h.decode()
    if len(s) % 4:
        s = s.zfill(len(s) + (4 - len(s) % 4))
    return ''.join(cmap.get(int(s[i:i+4], 16), '�') for i in range(0, len(s), 4))

if __name__ == '__main__':
    for path in sys.argv[1:]:
        pages = extract(path, max_pages=2)
        text = '\n'.join(pages)
        arabic = sum(1 for c in text if '؀' <= c <= 'ۿ')
        presentation = sum(1 for c in text if 'ﭐ' <= c <= '﻿')
        latin = sum(1 for c in text if c.isascii() and c.isalpha())
        repl = text.count('�')
        print(f'== {path}')
        print(f'   chars={len(text)} arabic_base={arabic} arabic_presentation_forms={presentation} latin={latin} unmapped={repl}')
        print('   sample:', repr(text[:220]))
