"""Refresh the static publications list from the adjacent JSON file. Python 3.8+."""

from collections import Counter, defaultdict
from html import escape
from pathlib import Path
import json
import re
import unicodedata
from urllib.parse import urlparse


def plain(text):
    return "".join(
        char for char in unicodedata.normalize("NFKD", text.casefold())
        if not unicodedata.combining(char)
    )


def icon(name):
    marks = {
        "network": '<circle cx="5" cy="12" r="2.55"/><circle cx="18" cy="5" r="2.55"/><circle cx="18" cy="19" r="2.55"/><path d="m7.3 10.9 8.4-4.7m-8.4 7 8.4 4.7"/>',
        "link": '<path d="M6 18 18 6M7 6h11v11"/>',
    }
    return f'<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">{marks[name]}</svg>'


def author_key(name):
    return re.sub(r"[^a-z0-9]+", "", plain(name))


def author_names(row):
    authors = row["authors"]
    if isinstance(authors, str):
        authors = authors.split(",")
    return [author.strip() for author in authors if author.strip()]


def owns_page(name):
    return plain(name).split()[-1].rstrip(".") == "ehler"


def graph(collaborators, counts):
    """Show frequent collaborators in the diagram and everyone in the dropdown."""
    minimum_shared = 5
    ranked_keys = sorted(
        (key for key in collaborators if counts[key] >= minimum_shared),
        key=lambda key: (-counts[key], plain(collaborators[key])),
    )
    rows = (len(ranked_keys) + 1) // 2
    links, nodes = [], []
    for index, key in enumerate(ranked_keys):
        side = index % 2
        x = (18.5, 81.5)[side]
        side_rows = (len(ranked_keys) + 1 - side) // 2
        y = round(100 * (index // 2 + 0.5) / side_rows, 3)
        name = collaborators[key]
        count = counts[key]
        width = 0.8 + 2.2 * count / max(counts.values())
        links.append(f'<line data-graph-edge="{key}" x1="50" y1="50" x2="{x}" y2="{y}" stroke-width="{width:.2f}" vector-effect="non-scaling-stroke"/>')
        nodes.append(f'<button type="button" data-graph-person="{key}" aria-pressed="false" style="--x:{x}%;--y:{y}%" aria-label="{escape(name)}, {count} shared paper{"" if count == 1 else "s"}"><span>{escape(name)}</span><small>{count}</small></button>')

    options = []
    for key in sorted(collaborators, key=lambda k: plain(collaborators[k].split()[-1])):
        options.append(f'<option value="{key}">{escape(collaborators[key])} ({counts[key]})</option>')
    menu_title = f"All {len(options)} collaborator{'s' if len(options) != 1 else ''}"

    return f"""
    <section class="pub-network" id="pub-network" aria-labelledby="pub-network-title" hidden>
      <div class="pub-network-aside">
        <h2 id="pub-network-title">Co-authorship</h2>
        <p>The diagram shows co-authors with at least {minimum_shared} shared publications.</p>
        <select id="pub-person" aria-label="{menu_title}"><option value="">{menu_title}</option>{''.join(options)}</select>
      </div>
      <div class="pub-graph" style="--rows:{rows}" role="group" aria-label="Co-authors with at least {minimum_shared} shared publications"{'' if ranked_keys else ' hidden'}>
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">{''.join(links)}</svg>
        <span class="pub-graph-center">M. Ehler</span>
        {''.join(nodes)}
      </div>
    </section>"""


def main():
    here = Path(__file__).resolve().parent
    rows = json.loads((here / "publications.json").read_text(encoding="utf-8"))
    papers_by_heading = defaultdict(list)
    collaborators = {}
    counts = Counter()
    order = {"Journal article": 0, "Conference paper": 1}

    def publication_order(row):
        return (row["type"] != "Preprint", -int(row["year"]), order.get(row["type"], 2))

    for row in sorted(rows, key=publication_order):
        names = author_names(row)
        keys = []
        byline = []
        for name in names:
            if owns_page(name):
                byline.append(f'<strong>{escape(name)}</strong>')
            else:
                key = author_key(name)
                keys.append(key)
                collaborators[key] = name
                byline.append(escape(name))
        counts.update(set(keys))
        url = row.get("url") or ""
        if url and urlparse(url).scheme != "https":
            raise ValueError(f"Expected HTTPS link for {row['title']}")
        title = escape(row["title"])
        if url:
            lead, space, last_word = title.rpartition(" ")
            title = (
                f'<a href="{escape(url, quote=True)}">{lead}{space}<span class="pub-link-end">'
                f'{last_word}<span class="pub-external">{icon("link")}</span></span></a>'
            )
        year = str(int(row["year"]))
        preprint = row["type"] == "Preprint"
        heading = "Preprints" if preprint else year
        label = year if preprint else row["type"]
        item = f"""
          <li class="pub-record" data-collaborators="{' '.join(keys)}">
            <h3>{title}</h3>
            <p class="pub-citation"><span class="pub-kind">{escape(label)}</span> ·
              <span class="pub-byline">{', '.join(byline)}</span> · <span class="pub-venue">{escape(row['venue'])}</span></p>
          </li>"""
        papers_by_heading[heading].append(item)
    groups = []
    for heading, papers in papers_by_heading.items():
        heading_id = "pub-preprints" if heading == "Preprints" else f"pub-y{heading}"
        groups.append(f"""
        <section class="pub-year" aria-labelledby="{heading_id}">
          <h2 id="{heading_id}">{heading}</h2>
          <ul class="pub-list">{''.join(papers)}</ul>
        </section>""")

    html = f"""
    <div class="publication-archive" id="publication-archive">
      <div class="pub-tools" id="pub-tools" hidden>
        <div class="pub-tools-top">
          <button class="pub-network-toggle" id="pub-network-toggle" type="button" aria-controls="pub-network" aria-expanded="false">
            {icon('network')}<span>Co-authorship explorer</span><span class="pub-disclose" aria-hidden="true"></span>
          </button>
          <p class="pub-status" role="status" aria-live="polite" aria-atomic="true"></p>
          <button class="pub-reset" type="button" hidden>Show all works</button>
        </div>
        {graph(collaborators, counts)}
      </div>
      <div class="pub-sections">{''.join(groups)}</div>
      {'' if rows else '<p>No publications listed.</p>'}
    </div>"""
    page = here.parent / "publications.html"
    source = page.read_text(encoding="utf-8")
    start = "<!-- BEGIN BIBLIOGRAPHY -->"
    end = "<!-- END BIBLIOGRAPHY -->"
    if source.count(start) != 1 or source.count(end) != 1:
        raise ValueError("The bibliography markers in publications.html are missing or duplicated.")
    before, _, rest = source.partition(start)
    _, marker, after = rest.partition(end)
    if not marker:
        raise ValueError("The end of the bibliography must follow its start.")
    result = before + start + "\n" + html.strip() + "\n" + end + after
    temporary = page.with_suffix(".html.tmp")
    temporary.write_text(result, encoding="utf-8")
    temporary.replace(page)
    print(f"Updated {page.name} with {len(rows)} works.")


if __name__ == "__main__":
    main()
