"""Independent AP01/AP04 binary/provenance/preservation reinspection."""
import ctypes as c
import gzip
import hashlib
import io
import json
import re
import subprocess
import urllib.request
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

ROOT = Path(__file__).resolve().parents[1]
REPO = ROOT.parents[2]
sha = lambda value: hashlib.sha256(value).hexdigest()
out = {"method": "Independent Python TTFont, upstream byte fetch, HarfBuzz shaping and git blob comparison"}
provenance = json.loads((ROOT / "evidence/font-provenance.json").read_text())
records = []
for entry in provenance["files"]:
    path = ROOT / entry["file"]
    data = path.read_bytes()
    upstream = urllib.request.urlopen(entry["origin"], timeout=30).read()
    assert sha(data) == sha(upstream) == entry["sha256"]
    font = TTFont(io.BytesIO(data))
    names = {str(n): font["name"].getDebugName(n) for n in (1, 2, 6, 16, 17)}
    axes = {a.axisTag: [a.minValue, a.defaultValue, a.maxValue] for a in font["fvar"].axes} if "fvar" in font else {}
    weights = []
    for weight in entry["usedWeights"]:
        instance = instantiateVariableFont(font, {a: weight if a == "wght" else bounds[1] for a, bounds in axes.items()}, inplace=False) if axes else font
        assert instance["OS/2"].usWeightClass == weight
        weights.append({"requested": weight, "OS2": instance["OS/2"].usWeightClass, "glyfSHA256": sha(instance["glyf"].compile(instance))})
    assert len({w["glyfSHA256"] for w in weights}) == len(weights)
    license_path = ROOT / entry["license"]
    license_url = entry["origin"].rsplit("/", 1)[0] + "/OFL.txt"
    license_data = license_path.read_bytes()
    upstream_license = urllib.request.urlopen(license_url, timeout=30).read()
    original_path = license_path.with_suffix('.original.gz')
    compressed_original = original_path.read_bytes()
    original_license = gzip.decompress(compressed_original)
    assert original_license == upstream_license
    normalized_license = ('\n'.join(line.rstrip(' \t') for line in original_license.decode().splitlines()) + '\n').encode()
    assert license_data == normalized_license
    assert b"SIL OPEN FONT LICENSE Version 1.1" in license_data
    cmap = font.getBestCmap()
    sample = "مُلخّص الزيارة والمعلومات المُتاحة — اتأكد من الدكتور والميعاد. مُتابعة واضحة نوفمبر 0123456789"
    if not path.name.startswith("inter"):
        assert all(ord(ch) in cmap for ch in set(sample) if not ch.isspace())
    records.append({"file": entry["file"], "sha256": sha(data), "upstreamByteIdentical": True, "names": names, "OS2": font["OS/2"].usWeightClass, "axes": axes, "weights": weights, "licenseSHA256": sha(license_data), "licenseOriginalFile": str(original_path.relative_to(ROOT)), "licenseOriginalCompressedSHA256": sha(compressed_original), "licenseOriginalPayloadSHA256": sha(original_license), "licenseOriginalPayloadUpstreamByteIdentical": True, "licensePlainTextMatchesWhitespaceNormalization": True})
out["fonts"] = records

# Exercise the system shaping engine directly on each Arabic binary, including
# connected letters, dots, combining marks and lam-alef; zero means .notdef.
hb = c.CDLL("libharfbuzz.so.0")
for name, restype, args in [
    ("hb_blob_create", c.c_void_p, [c.c_char_p, c.c_uint, c.c_int, c.c_void_p, c.c_void_p]),
    ("hb_face_create", c.c_void_p, [c.c_void_p, c.c_uint]),
    ("hb_font_create", c.c_void_p, [c.c_void_p]),
    ("hb_buffer_create", c.c_void_p, []),
    ("hb_ot_font_set_funcs", None, [c.c_void_p]),
    ("hb_buffer_add_utf8", None, [c.c_void_p, c.c_char_p, c.c_int, c.c_uint, c.c_int]),
    ("hb_buffer_guess_segment_properties", None, [c.c_void_p]),
    ("hb_shape", None, [c.c_void_p, c.c_void_p, c.c_void_p, c.c_uint]),
]:
    f = getattr(hb, name); f.restype = restype; f.argtypes = args
class Info(c.Structure):
    _fields_ = [(x, c.c_uint32) for x in ("codepoint", "mask", "cluster", "var1", "var2")]
hb.hb_buffer_get_glyph_infos.restype = c.POINTER(Info)
hb.hb_buffer_get_glyph_infos.argtypes = [c.c_void_p, c.POINTER(c.c_uint)]
shaping = []
for name in ("plex-400.ttf", "plex-600.ttf", "noto-variable.ttf"):
    data = (ROOT / "fonts" / name).read_bytes()
    blob = hb.hb_blob_create(data, len(data), 0, None, None)
    font = hb.hb_font_create(hb.hb_face_create(blob, 0)); hb.hb_ot_font_set_funcs(font)
    def shape(text):
        buf = hb.hb_buffer_create(); encoded = text.encode()
        hb.hb_buffer_add_utf8(buf, encoded, len(encoded), 0, len(encoded))
        hb.hb_buffer_guess_segment_properties(buf); hb.hb_shape(font, buf, None, 0)
        count = c.c_uint(); infos = hb.hb_buffer_get_glyph_infos(buf, c.byref(count))
        return [{"glyph": infos[i].codepoint, "cluster": infos[i].cluster} for i in range(count.value)]
    samples = {s: shape(s) for s in ("مُلخّص الزيارة", "مُتابعة واضحة", "ب ت ث ن ي", "لا", "بتثني", "م ل خ ص")}
    assert all(g["glyph"] for run in samples.values() for g in run)
    assert len({shape(s)[0]["glyph"] for s in "بتثني"}) == 5
    assert shape("بتثني") != sum((shape(s) for s in "بتثني"), [])
    shaping.append({"file": name, "runs": samples, "noNotdef": True, "distinctDottedLetters": True, "contextualShapingDiffersFromIsolated": True})
out["shaping"] = shaping

previous = "81ea915d10c4ad83578465dcd8b2d26d69d1b6fe"
allowed = {"docs/CURRENT_STATUS.md", "docs/SOURCE_OF_TRUTH.md"}
paths = subprocess.check_output(["git", "ls-tree", "-rz", "--name-only", previous], cwd=REPO).decode().split("\0")
preserved, changed, missing = [], [], []
for name in filter(None, paths):
    path = REPO / name
    if not path.is_file(): missing.append(name); continue
    old = subprocess.check_output(["git", "show", f"{previous}:{name}"], cwd=REPO)
    if path.read_bytes() == old: preserved.append(name)
    else: changed.append(name)
assert not missing and set(changed) == allowed
out["preservation"] = {"previousHead": previous, "tracked": len(preserved) + len(changed), "byteIdentical": len(preserved), "exceptions": changed, "missing": missing}

def luminance(color):
    values = [int(v) / 255 for v in re.findall(r"\d+", color)[:3]]
    return sum((v / 12.92 if v <= .04045 else ((v + .055) / 1.055) ** 2.4) * k for v, k in zip(values, (.2126, .7152, .0722)))
def contrast(a, b):
    high, low = sorted((luminance(a), luminance(b)), reverse=True)
    return (high + .05) / (low + .05)
pairs = json.loads((ROOT / "evidence/color-pairs.json").read_text())["pairs"]
for pair in pairs:
    measured = contrast(pair["foreground"], pair["background"])
    assert abs(measured - pair["ratio"]) < 1e-10
    assert measured >= pair["threshold"]
out["authorContrastRecalculation"] = {"pairs": len(pairs), "allRatiosReproduced": True, "minimumByRole": {role: min(p["ratio"] for p in pairs if p["role"] == role) for role in {p["role"] for p in pairs}}}
out["inputs"] = {str(p.relative_to(REPO)): sha(p.read_bytes()) for p in sorted(ROOT.rglob("*")) if p.is_file() and "independent" not in str(p.relative_to(ROOT)).lower() and "__pycache__" not in str(p) and p.name != "artifact-hashes.json"}
out["inputInventoryExclusion"] = "artifact-hashes.json is derived delivery bookkeeping, finalized after this independent report; review input hashes exclude independent outputs and that self-referential inventory."
out["governanceInputHashes"] = {name: sha((REPO / name).read_bytes()) for name in ["AGENTS.md", "docs/CURRENT_STATUS.md", "docs/SOURCE_OF_TRUTH.md", "docs/FOUNDATION_CHARTER.md", "docs/ARABIC_UX.md", "docs/CONTENT_SYSTEM.md"]}
(ROOT / "evidence/independent-audit.json").write_text(json.dumps(out, indent=2, ensure_ascii=False) + "\n")
print(json.dumps({"fonts": len(records), "shapingRuns": len(shaping), "preservation": out["preservation"], "contrast": out["authorContrastRecalculation"], "inputHashes": len(out["inputs"])}, indent=2))
