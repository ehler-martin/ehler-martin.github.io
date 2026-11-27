Martin Ehler · Academic homepage
Local preview · November 2026

OPEN THE SITE
Extract the entire ZIP, open the martin-ehler-homepage folder, then double-click
index.html. The homepage, academic journey, bibliography, course list,
illustrations and fonts work locally. Teaching evaluations are available on the
university website. Publisher links and university pages open online.

EXPLORE
On the homepage, choose 2-design for the tennis-ball curve or 3-design for
the spherical curve with threefold symmetry. The animation varies a from
0.5 to 1 and pauses briefly at the selected family's design value
(a₂ ≈ 0.7778 or a₃ ≈ 0.7660). Drag the slider to change a, or use
“Show 2-design” or “Show 3-design” to hold the corresponding design.
With reduced motion enabled, the figure waits for Play. The dashed line
shows the far side of the sphere.

On the Academic journey page, select a map marker or a stage below the map
to see its institution and appointment. The five stages run from left to
right in chronological order. On narrow screens, scroll the row horizontally.
Use the left and right arrow keys to move between stages or map markers.

On the publications page, open the co-authorship explorer and select a
collaborator in the diagram or dropdown to see your shared papers.
“Show all works” restores the complete list.

EDIT
index.html                 Homepage, selected papers, contact and office hours
academic-journey.html      Career map, cities and appointment descriptions
publications.html          Publications page and full list
teaching-evaluations.html  Courses grouped by semester; link to the university evaluations archive
assets/site.css            Shared colours, fonts, spacing and layout
assets/home.js             Spherical curve families, projection and parameter controls
assets/journey.css         Map and city label styles
assets/publications.css    Publication list and explorer styles

To maintain the bibliography, edit editing/publications.json in a text editor.
Copy an existing record to add a paper. To update the static HTML and collaborator counts, run
the following from this folder with Python 3.8 or later:

    python3 editing/update_publications.py

On Windows, use py instead of python3. Browsing the site only needs a browser.
Edit the homepage selection in index.html.

CONTENTS AND CREDITS
The bibliography combines the November 2026 CV and the author's university
publication archive. Journal issue metadata is used when available.
“Constraints for stable sampling on the sphere” was
published online in 2026 and is listed with its 2027 issue.

Career history, office details and publication sources:
    Supplied cvNEW.pdf, November 2026
    https://homepage.univie.ac.at/martin.ehler/
    https://homepage.univie.ac.at/martin.ehler/?page_id=16
    Publisher, proceedings and arXiv records linked from individual works.

The public teaching page links to the university archive:
    https://homepage.univie.ac.at/martin.ehler/?page_id=71

Reference for the career map and interactive bibliography:
    https://angelikamanhart.github.io/cv.html
    https://angelikamanhart.github.io/publications.html

The spherical curves use k = 2 and k = 3 in equation (15) of Ehler and
Gröchenig, “t-Design Curves and Mobile Sampling on the Sphere,” Example 3.3.
    https://doi.org/10.1017/fms.2023.106
The vector map uses Natural Earth geography at 1:50 million, distributed by
World Atlas (https://github.com/topojson/world-atlas).
The portrait is credited to
Universität Wien / derknopfdruecker.com and uses the crop shown at
    https://mathematik.univie.ac.at/ueber-uns/leitung
Local copies of DM Sans and
Newsreader are distributed with their font licences in assets/fonts/.
