import { describe, expect, it } from 'vitest';
import { validGrid } from './color-grid';
import { GridPixels, MAX_IMAGE_GRID_WIDTH, MIN_IMAGE_GRID_WIDTH, imageToGrid } from './image-to-grid';

/** Image dont chaque pixel est donné par `paint(x, y)` → [r, g, b, a?]. */
function image(
  width: number,
  height: number,
  paint: (x: number, y: number) => number[],
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

const flat = (width: number, colors: number) => ({ width, colors, worked: 'flat' as const });

describe('imageToGrid', () => {
  it("une image unie donne une seule couleur utile, sur une grille que l'application accepte", () => {
    const grid = imageToGrid(image(40, 30, () => [200, 30, 30]), flat(20, 6));
    expect(new Set(grid.cells)).toEqual(new Set([0]));
    expect(grid.palette[0]).toBe('#c81e1e');
    expect(validGrid(grid)).not.toBeNull();
  });

  it('un damier de deux couleurs retrouve les deux, au bon endroit', () => {
    // Cases de 4 × 4 pixels, mailles de 4 × 4 pixels : une case, une maille.
    const checker = image(80, 80, (x, y) =>
      (Math.floor(x / 4) + Math.floor(y / 4)) % 2 === 0 ? [255, 255, 255] : [0, 0, 0],
    );
    const grid = imageToGrid(checker, flat(20, 2));
    expect(grid.palette).toEqual(['#ffffff', '#000000']);
    expect(grid.height).toBe(20);
    for (let row = 0; row < 20; row++) {
      for (let column = 0; column < 20; column++) {
        // Le rang 1 est le bas de l'image ; sur 20 rangs, le haut est le rang 20.
        const imageRow = 19 - row;
        expect(grid.cells[row * 20 + column]).toBe((column + imageRow) % 2);
      }
    }
  });

  it('place le haut de l’image au dernier rang et le bas au rang 1', () => {
    const grid = imageToGrid(
      image(20, 20, (_x, y) => (y < 10 ? [255, 255, 255] : [0, 0, 0])),
      flat(10, 2),
    );
    expect(grid.palette).toEqual(['#ffffff', '#000000']);
    expect(grid.cells[0]).toBe(1);
    expect(grid.cells[grid.cells.length - 1]).toBe(0);
  });

  it('un dégradé donne exactement le nombre de couleurs demandé, de 2 à 12', () => {
    const gradient = image(150, 20, (x) => [Math.floor((x * 255) / 149), 80, 120]);
    for (let colors = 2; colors <= 12; colors++) {
      const grid = imageToGrid(gradient, flat(100, colors));
      expect(grid.palette, `${colors} couleurs`).toHaveLength(colors);
      expect(new Set(grid.palette).size, `${colors} distinctes`).toBe(colors);
      expect(new Set(grid.cells).size, `${colors} utilisées`).toBe(colors);
      expect(validGrid(grid)).not.toBeNull();
    }
  });

  it('trie la palette de la plus claire à la plus foncée', () => {
    const gradient = image(100, 10, (x) => [x * 2, x * 2, x * 2]);
    const { palette } = imageToGrid(gradient, flat(50, 5));
    const levels = palette.map((hex) => parseInt(hex.slice(1, 3), 16));
    expect(levels).toEqual([...levels].sort((a, b) => b - a));
  });

  it('donne la même grille pour la même image et les mêmes réglages', () => {
    const noise = image(90, 60, (x, y) => [(x * 37) % 256, (y * 91) % 256, (x * y) % 256]);
    expect(imageToGrid(noise, flat(45, 7))).toEqual(imageToGrid(noise, flat(45, 7)));
  });

  it('garde les proportions : une image 2:1 donne une grille deux fois plus large que haute', () => {
    const grid = imageToGrid(
      image(200, 100, () => [10, 10, 10]),
      flat(40, 3),
    );
    expect([grid.width, grid.height]).toEqual([40, 20]);
  });

  it('borne la largeur de 10 à 150 mailles', () => {
    const wide = image(300, 300, (x) => [x % 256, 0, 0]);
    expect(imageToGrid(wide, flat(3, 4)).width).toBe(MIN_IMAGE_GRID_WIDTH);
    expect(imageToGrid(wide, flat(900, 4)).width).toBe(MAX_IMAGE_GRID_WIDTH);
  });

  it('borne la hauteur : une image très allongée reste une grille valide', () => {
    const grid = imageToGrid(
      image(1000, 10, (x) => [x % 256, 0, 0]),
      flat(150, 4),
    );
    expect(validGrid(grid)).not.toBeNull();
  });

  it("un pixel isolé ne décide pas d'une maille", () => {
    const speck = image(40, 40, (x, y) => (x === 5 && y === 5 ? [0, 0, 0] : [255, 255, 255]));
    const grid = imageToGrid(speck, flat(10, 2));
    // Le point, moyenné avec le blanc de sa maille, ne fait pas une couleur à lui seul.
    expect(new Set(grid.cells)).toEqual(new Set([0]));
    expect(grid.palette[0]).toBe('#ffffff');
  });

  it('compte un pixel transparent comme blanc', () => {
    const grid = imageToGrid(
      image(20, 20, (x) => (x < 10 ? [0, 0, 0, 0] : [0, 0, 0, 255])),
      flat(10, 2),
    );
    expect(grid.palette).toEqual(['#ffffff', '#000000']);
    expect(grid.cells[0]).toBe(0);
    expect(grid.cells[9]).toBe(1);
  });

  it('garde le sens de travail demandé', () => {
    const round = imageToGrid(
      image(20, 20, () => [1, 2, 3]),
      { width: 10, colors: 2, worked: 'round' },
    );
    expect(round.worked).toBe('round');
  });
});
