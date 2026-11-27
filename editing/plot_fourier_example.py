"""Regenerate the inline figures for the Fourier paper. Requires NumPy."""
from pathlib import Path
import re
import numpy as np

PAGE = Path(__file__).resolve().parents[1] / "fourier-approximation.html"
POWERS = range(10, 21)
DEFAULT_POWER = 12


def spline_sum(x):
    """Equation (3.1) for (a,b) = (2,4), using the centered cubic B-spline."""
    result = np.zeros_like(x, dtype=float)
    base = np.floor(x).astype(np.int64)
    for shift in (-1, 0, 1, 2):
        k = base + shift
        t = np.abs(x - k)
        spline = np.where(t < 1, 2 / 3 - t*t + t**3 / 2, (2 - t)**3 / 6)
        odd = k % 2 != 0
        weight = np.where(k == 0, 0.25, 0.0)
        weight[odd] = -1 / (np.pi * k[odd])**2
        result += weight * spline
    return result


def fourier_values(xi):
    return np.sinc(xi)**4 * np.abs(xi - np.rint(xi))


def grid_error(n, step_exponent):
    h = n**(-step_exponent)
    p = n * h
    indices = np.arange(1 - n // 2, 1 + n // 2)
    # FFT index j is j modulo n, on both the input and output grids.
    order = indices % n
    values = np.empty(n)
    values[order] = spline_sum(h * indices)
    difference = h * np.fft.fft(values)[order] - fourier_values(indices / p)
    return np.sqrt(np.sum(np.abs(difference)**2) / p)


def polyline(xs, ys, style):
    points = ' '.join(f'{x:.2f},{y:.2f}' for x, y in zip(xs, ys))
    return f'<polyline class="{style}" points="{points}"/>'


def label(x, y, value, anchor="middle"):
    return f'<text x="{x:.2f}" y="{y:.2f}" text-anchor="{anchor}">{value}</text>'


def line(x1, y1, x2, y2, style="guide"):
    return f'<line class="{style}" x1="{x1:.2f}" y1="{y1:.2f}" x2="{x2:.2f}" y2="{y2:.2f}"/>'


def power_text(exponent):
    return "2" + str(exponent).translate(str.maketrans("-0123456789", "⁻⁰¹²³⁴⁵⁶⁷⁸⁹"))


def svg(width, height, description, elements):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}" '
            f'role="img" aria-label="{description}">\n' + '\n'.join(elements) + '\n</svg>')


def convergence(measurements):
    left, right, top, bottom = 48, 478, 21, 223
    def x(power):
        return left + (right - left) * (power - 10) / 10

    def y(log_error):
        return top + (bottom - top) * (-9 - log_error) / 16

    elements = []
    for exponent in (-10, -15, -20, -25):
        elements.extend([line(left, y(exponent), right, y(exponent),
                              "target" if exponent == -15 else "guide"),
                         label(left - 8, y(exponent) + 4, power_text(exponent), "end")])
    for exponent in range(10, 21, 2):
        elements.extend([line(x(exponent), bottom, x(exponent), bottom + 4, "axis"),
                         label(x(exponent), bottom + 20, power_text(exponent))])
    elements.append(line(left, bottom, right, bottom, "axis"))
    elements.append(label((left + right) / 2, bottom + 43, 'Number of samples, n'))
    for i, style in enumerate(["standard", "adapted"]):
        elements.append(polyline([x(power) for power in POWERS],
                                 [y(np.log2(row[i])) for row in measurements], style))
    for power, (usual, adapted) in zip(POWERS, measurements):
        a, b = y(np.log2(usual)), y(np.log2(adapted))
        xx = x(power)
        state = ' class="selected"' if power == DEFAULT_POWER else ''
        elements.extend([
            f'<g data-power="{power}" data-standard="{usual:.12g}" data-adapted="{adapted:.12g}"{state}>',
            line(xx, top, xx, bottom, "selection"),
            f'<rect class="standard-dot" x="{xx-2.6:.2f}" y="{a-2.6:.2f}" width="5.2" height="5.2"/>',
            f'<circle class="adapted-dot" cx="{xx:.2f}" cy="{b:.2f}" r="3.5"/>',
            '</g>'])
    return svg(502, 277, 'Computed error for two grids as the number of samples doubles. The decay-adapted grid has smaller errors throughout.', elements)


def profile(fn, extent, ymax, ymin, xticks, yticks, axis_name, description):
    left, right, top, bottom = 47, 308, 10, 113
    def x(v):
        return left + (v + extent) * (right - left) / (2 * extent)

    def y(v):
        return top + (ymax - v) * (bottom - top) / (ymax - ymin)

    elements = [line(left, y(0), right, y(0), "axis"), line(x(0), top, x(0), bottom, "guide")]
    for v in yticks:
        elements.append(label(left - 6, y(v) + 4, f'{v:g}'.replace('-', '−'), 'end'))
    for v in xticks:
        elements.extend([line(x(v), bottom, x(v), bottom + 4, "axis"),
                         label(x(v), bottom + 19, str(v).replace('-', '−'))])
    xs = np.linspace(-extent, extent, 481)
    elements.append(polyline(x(xs), y(fn(xs)), "adapted"))
    elements.append(label(right + 10, bottom + 19, axis_name))
    return svg(335, 140, description, elements)


def replace_figure(html, name, content):
    pattern = rf'(<!-- {name} -->).*?(<!-- /{name} -->)'
    result, count = re.subn(pattern, lambda m: m[1] + '\n' + content + '\n' + m[2], html, flags=re.S)
    if count != 1:
        raise ValueError(f'Missing or duplicated figure block: {name}')
    return result


if __name__ == "__main__":
    data = [(grid_error(2**j, 0.5), grid_error(2**j, 0.3)) for j in POWERS]
    html = replace_figure(PAGE.read_text(), 'convergence', convergence(data))
    html = replace_figure(html, 'function-profile', profile(spline_sum, 4, .15, -.07,
                          [-4, -2, 0, 2, 4], [-.05, 0, .1], 'x', 'The real function, with a central peak and negative side lobes.'))
    html = replace_figure(html, 'transform-profile', profile(fourier_values, 1.5, .19, 0,
                          [-1, 0, 1], [0, .1], 'ξ', 'Its exact Fourier transform, with a zero at the origin and two equal positive peaks.'))
    PAGE.write_text(html)
