"""Gebiet A (Entscheid Simon 13.11.2026): 9 Regionen zwischen Luzern, Sursee und Wolhusen. Spiel-Meter wie lv.py.
b = (x0, z0, x1, z1). Nachbarn überlappen 100–300 m."""
REGIONS_A = {
    'a1': ('Sursee', (-20000, -14600, -14300, -8900)),
    'a2': ('Sempach und Nottwil', (-14500, -14600, -8200, -8900)),
    'a3': ('Hildisrieden und Rain', (-8400, -14600, -3500, -8900)),
    'a4': ('Buttisholz', (-20000, -9100, -14300, -3400)),
    'a5': ('Ruswil', (-14500, -9100, -8200, -3400)),
    'a6': ('Neuenkirch und Hellbühl', (-8400, -9100, -3500, -1200)),
    'a7': ('Wolhusen', (-20000, -3600, -14300, 3000)),
    'a8': ('Malters', (-14500, -3600, -8400, 3000)),
    'a9': ('Rothenburg', (-3700, -9100, 1500, -3700)),
    'a10': ('Root, Buchrain und Inwil', (1300, -9100, 7500, -3700)),  # 13n: Ausbau Umgebung (Fokus Simon 45 %)
    'a11': ('Küssnacht und Meierskappel', (7300, -8600, 12300, -1800)),  # 13o
    'a12': ('Hochdorf und Ballwil', (-3700, -14800, 2300, -8900)),  # 14r: Seetal
    'a13': ('Willisau und Ettiswil', (-26200, -11000, -19800, -5000)),  # 14s
}
