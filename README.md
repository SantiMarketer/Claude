# Aventura por el Espacio 🚀🪐

**Ebook infantil ilustrado** (PDF, 20 páginas) que lleva a los más pequeños en
un viaje por el Sistema Solar: el Sol, los ocho planetas, la Luna, asteroides,
cometas, estrellas, constelaciones y astronautas, con datos curiosos, una
página de actividades y un cierre motivador.

- 📄 **Ebook listo para publicar:** [`Aventura_por_el_Espacio.pdf`](Aventura_por_el_Espacio.pdf)
- 🛠️ **Generador del libro:** [`build_ebook.py`](build_ebook.py)
- 🎯 **Público:** niñas y niños curiosos (lectura acompañada o primeros lectores)
- 🌐 **Idioma:** español
- 📐 **Formato:** A4 vertical (595 × 842 pt), ~0,4 MB

## ¿Qué contiene?

| Pág. | Contenido | Pág. | Contenido |
|----|----------------------------|----|---------------------------------|
| 1  | Portada                    | 11 | Saturno                         |
| 2  | Bienvenida al explorador   | 12 | Urano                           |
| 3  | ¿Qué es el Sistema Solar?  | 13 | Neptuno                         |
| 4  | El Sol                     | 14 | Plutón y los planetas enanos    |
| 5  | Mercurio                   | 15 | Asteroides y cometas            |
| 6  | Venus                      | 16 | Estrellas y constelaciones      |
| 7  | La Tierra                  | 17 | Astronautas y cohetes           |
| 8  | La Luna                    | 18 | ¿Sabías que...? (datos curiosos)|
| 9  | Marte                      | 19 | Juego / actividad               |
| 10 | Júpiter                    | 20 | Despedida                       |

## ¿Cómo se ha creado?

El PDF se genera por completo con **Python puro (solo biblioteca estándar)**,
sin dependencias externas ni acceso a internet. `build_ebook.py` incluye:

- Un **escritor de PDF** propio (objetos, tabla `xref`, fuentes con codificación
  WinAnsi para acentos en español, streams comprimidos con `zlib`/FlateDecode).
- **Ilustraciones 100% vectoriales**: planetas con sombreado esférico (gradientes
  radiales), el Sol con rayos y halo, anillos de Saturno, cohete, astronauta,
  cometa, campos de estrellas y destellos, todo con transparencias.
- **Maquetación tipográfica** con medición de anchos (métricas AFM de Helvetica)
  para justificar, centrar y dividir el texto en líneas correctamente.

### Regenerar el PDF

```bash
python3 build_ebook.py
# -> Aventura_por_el_Espacio.pdf (20 páginas)
```

No necesita instalar nada: funciona con cualquier Python 3 estándar.

## Publicación

El PDF es un documento estándar válido (PDF 1.7) que puede abrirse en cualquier
lector, imprimirse o subirse a plataformas de publicación digital
(Amazon KDP, Google Play Libros, etc.). Para impresión bajo demanda conviene
exportar/embeber las fuentes según los requisitos de cada plataforma.

---
*Hecho con cariño para pequeños exploradores del universo.* ✨
