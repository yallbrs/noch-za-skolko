"""CSV Авито -> data.js (window.LISTINGS). Запуск: python3 build_data.py"""
import csv
import json
import re

SRC = "creative_hse_2026 - жилье клнгрд.csv"


def num(s):
    return int(re.sub(r"[^\d]", "", s))


def parse_price(s):
    s = s.strip()
    if not s:
        return None
    try:
        return num(s)
    except ValueError:
        return None


def parse_rating(s):
    s = s.strip().replace(",", ".")
    try:
        return float(s)
    except ValueError:
        return None


def parse_reviews(s):
    m = re.search(r"\d+", s)
    return int(m.group()) if m else 0


def parse_title(title):
    m = re.search(r"([\d.,]+)\s*м²", title)
    area = float(m.group(1).replace(",", ".")) if m else None
    b = re.search(r"(\d+)\s*кроват", title)
    beds = int(b.group(1)) if b else None
    return area, beds


def main():
    with open(SRC, encoding="utf-8") as f:
        rows = list(csv.reader(f))

    listings = []
    for r in rows[1:]:
        if len(r) < 14 or not r[0].strip():
            continue
        price = parse_price(r[10])
        if price is None:
            continue
        desc = r[14] if len(r) > 14 else ""
        # выброс «тематического помещения 21+»
        if price == 13000 or "тематическое помещение" in desc.lower():
            continue
        title = r[7].strip()
        area, beds = parse_title(title)
        photos = [u.strip() for u in r[1:6] if u.strip().startswith("http")]
        street = r[13].strip().replace("Калининград,", "").strip()
        listings.append({
            "url": r[0].strip(),
            "photos": photos,
            "title": title,
            "areaM2": area,
            "beds": beds,
            "rating": parse_rating(r[8]),
            "reviews": parse_reviews(r[9]),
            "price": price,
            "superhost": "Суперхозяин" in (r[11] + r[12]),
            "street": street,
        })

    with open("data.js", "w", encoding="utf-8") as f:
        f.write("// Автогенерируется build_data.py — руками не править\n")
        f.write("window.LISTINGS = ")
        json.dump(listings, f, ensure_ascii=False)
        f.write(";\n")
    print(f"OK: {len(listings)} объявлений -> data.js")


if __name__ == "__main__":
    main()
