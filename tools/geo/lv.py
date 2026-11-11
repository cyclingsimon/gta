"""Lokale Spielmeter <-> WGS84 <-> LV95 (swisstopo-Näherung), wie lv95() in world.ts."""
import math
LAT0, LON0 = 47.0517, 8.3077
KX = math.cos(LAT0 * math.pi / 180) * 111320; KZ = 110574
def ll(x, z): return LAT0 - z / KZ, LON0 + x / KX
def lv95(x, z):
    lat, lon = ll(x, z); p = (lat * 3600 - 169028.66) / 10000; l = (lon * 3600 - 26782.5) / 10000
    return (2600072.37 + 211455.93 * l - 10938.51 * l * p - 0.36 * l * p * p - 44.54 * l ** 3,
            1200147.07 + 308807.95 * p + 3745.25 * l * l + 76.63 * p * p - 194.56 * l * l * p + 119.79 * p ** 3)
