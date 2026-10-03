import { colorAt, validGrid } from './color-grid';
import { GridPixels, imageToGrid } from './image-to-grid';

/** Image `width × height` dont chaque pixel vaut `paint(x, y)`, ligne du haut en premier. */
function image(
  width: number,
  height: number,
  paint: (x: number, y: number) => readonly [number, number, number, number?],
): GridPixels {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const [r, g, b, a = 255] = paint(x, y);
      data.set([r, g, b, a], (y * width + x) * 4);
    }
  }
  return { data, width, height };
}

const usedColors = (cells: Uint8Array) => new Set(cells).size;

describe('imageToGrid', () => {
  it('une image unie donne une seule couleur utile, et une grille valide', () => {
    const grid = imageToGrid(
      image(80, 80, () => [200, 30, 60]),
      { width: 20, colors: 6, worked: 'flat' },
    );
    expect(usedColors(grid.cells)).toBe(1);
    expect(grid.palette[0]).toBe('#c81e3c');
    expect(validGrid(grid)).not.toBeNull();
  });

  it('un damier de deux couleurs garde les deux, chacune à sa place', () => {
    // Cases de 2 × 2 pixels : à 10 mailles de large, une case par maille.
    const black = [10, 10, 10] as const;
    const white = [250, 250, 250] as const;
    const grid = imageToGrid(
      image(20, 20, (x, y) => ((Math.floor(x / 2) + Math.floor(y / 2)) % 2 ? black : white)),
      { width: 10, colors: 2, worked: 'flat' },
    );
    expect(grid.palette).toEqual(['#fafafa', '#0a0a0a']);
    expect([grid.width, grid.height]).toEqual([10, 10]);
    for (let row = 0; row < 10; row++) {
      // Le rang 1 est le bas de l'image.
      const y = 9 - row;
      for (let column = 0; column < 10; column++) {
        expect(grid.cells[row * 10 + column]).toBe((column + y) % 2);
      }
    }
    // colorAt suit le sens de travail : rang 1, maille 1 = colonne de droite.
    expect(colorAt(grid, 0, 0)).toBe((9 + 9) % 2);
  });

  for (let colors = 2; colors <= 12; colors++) {
    it(`un dégradé donne exactement ${colors} couleurs, de la plus claire à la plus foncée`, () => {
      const grid = imageToGrid(
        image(300, 100, (x) => [x * 0.85, 255 - x * 0.85, 128]),
        { width: 60, colors, worked: 'round' },
      );
      expect(grid.palette).toHaveLength(colors);
      expect(usedColors(grid.cells)).toBe(colors);
      const light = grid.palette.map((hex) => {
        const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
      });
      expect([...light].sort((a, b) => b - a)).toEqual(light);
      expect(validGrid(grid)).not.toBeNull();
    });
  }

  it('est déterministe : mêmes pixels, mêmes réglages, même grille', () => {
    const photo = image(97, 61, (x, y) => [(x * 37 + y * 11) % 256, (x * y) % 256, (y * 53) % 256]);
    const options = { width: 33, colors: 7, worked: 'flat' as const };
    expect(imageToGrid(photo, options)).toEqual(imageToGrid(photo, options));
  });

  it('garde les proportions d’une image 2:1, maille supposée carrée', () => {
    const grid = imageToGrid(
      image(200, 100, (x) => (x < 100 ? [255, 0, 0] : [0, 0, 255])),
      { width: 40, colors: 2, worked: 'flat' },
    );
    expect([grid.width, grid.height]).toEqual([40, 20]);
  });

  it('ramène la largeur entre 10 et 150 mailles', () => {
    const photo = image(400, 400, (x) => [x % 256, 0, 0]);
    for (const [asked, expected] of [
      [3, 10],
      [10, 10],
      [150, 150],
      [400, 150],
    ]) {
      expect(imageToGrid(photo, { width: asked, colors: 4, worked: 'flat' }).width).toBe(expected);
    }
  });

  it('compte un pixel transparent comme du blanc', () => {
    const grid = imageToGrid(
      image(40, 40, (x) => (x < 20 ? [0, 0, 0, 0] : [0, 0, 0, 255])),
      { width: 10, colors: 2, worked: 'flat' },
    );
    expect(grid.palette).toEqual(['#ffffff', '#000000']);
  });

  it('un pixel isolé ne décide pas d’une maille : la zone fait la moyenne', () => {
    // Une maille couvre 10 × 10 pixels ; un seul est rouge.
    const grid = imageToGrid(
      image(100, 100, (x, y) => (x === 5 && y === 5 ? [255, 0, 0] : [255, 255, 255])),
      { width: 10, colors: 2, worked: 'flat' },
    );
    const topLeft = grid.cells[(grid.height - 1) * grid.width];
    expect(grid.palette[topLeft]).not.toBe('#ff0000');
  });
});
