import { describe, expect, it } from 'vitest';
import {
  BACKUP_SCHEMA_VERSION,
  Project,
  deriveProjectName,
  legacyToProject,
  mergeProjects,
  parseBackup,
} from './project.model';

function projectFixture(overrides: Partial<Project> = {}): Project {
  return {
    id: 'p',
    name: 'Projet',
    source: 'Rang 1 : 6 ms',
    image: '',
    pieceIndex: 0,
    stepIndex: 0,
    done: {},
    reps: {},
    elapsed: 0,
    expandAbbreviations: false,
    createdAt: 0,
    lastOpenedAt: 0,
    ...overrides,
  };
}

describe('deriveProjectName', () => {
  it('préfère le titre détecté par le parseur', () => {
    expect(deriveProjectName('Sac Mabel', 'Rang 1 : 6 ms')).toBe('Sac Mabel');
  });

  it('retombe sur la première ligne non vide du texte source', () => {
    expect(deriveProjectName('', '\n\n  Bonnet citrouille  \nRang 1 : 6 ms')).toBe(
      'Bonnet citrouille',
    );
  });

  it("reste vide s'il n'y a ni titre ni texte", () => {
    expect(deriveProjectName('', '')).toBe('');
  });

  it('tronque les noms trop longs', () => {
    const long = 'x'.repeat(120);
    expect(deriveProjectName(long, '')).toHaveLength(80);
  });
});

describe('legacyToProject', () => {
  it('nomme le projet migré d’après le titre détecté, comme un projet neuf', () => {
    const project = legacyToProject(
      { source: 'Amigurumi chat\nRang 1 : 6 ms' },
      'Amigurumi chat',
      'id',
      0,
    );
    expect(project.name).toBe('Amigurumi chat');
  });

  it('préserve intégralement le patron, les compteurs et le chronomètre', () => {
    const project = legacyToProject(
      {
        source: 'Rang 1 : 6 ms dans un cercle magique',
        image: 'data:image/png;base64,xyz',
        pieceIndex: 1,
        stepIndex: 2,
        done: { '0:0': true, '1:2': true },
        reps: { '1:2': 4 },
        elapsed: 125_000,
        expandAbbreviations: true,
      },
      '',
      'legacy-id',
      1_700_000_000_000,
    );

    expect(project).toEqual({
      id: 'legacy-id',
      name: 'Rang 1 : 6 ms dans un cercle magique',
      source: 'Rang 1 : 6 ms dans un cercle magique',
      image: 'data:image/png;base64,xyz',
      pieceIndex: 1,
      stepIndex: 2,
      done: { '0:0': true, '1:2': true },
      reps: { '1:2': 4 },
      elapsed: 125_000,
      expandAbbreviations: true,
      createdAt: 1_700_000_000_000,
      lastOpenedAt: 1_700_000_000_000,
    });
  });

  it('comble les champs absents sans lever', () => {
    const project = legacyToProject({ source: 'Rang 1' }, '', 'id', 0);
    expect(project.done).toEqual({});
    expect(project.reps).toEqual({});
    expect(project.elapsed).toBe(0);
    expect(project.expandAbbreviations).toBe(false);
  });
});

describe('parseBackup', () => {
  it('accepte une sauvegarde valide', () => {
    const backup = { version: BACKUP_SCHEMA_VERSION, projects: [projectFixture()] };
    expect(parseBackup(backup)).toEqual(backup);
  });

  it('refuse une version de schéma inconnue', () => {
    expect(parseBackup({ version: 999, projects: [projectFixture()] })).toBeNull();
  });

  it('refuse si un seul projet a une forme invalide, sans import partiel', () => {
    const backup = {
      version: BACKUP_SCHEMA_VERSION,
      projects: [projectFixture(), { id: 'incomplet' }],
    };
    expect(parseBackup(backup)).toBeNull();
  });

  it('refuse une entrée qui ne ressemble pas à une sauvegarde', () => {
    expect(parseBackup(null)).toBeNull();
    expect(parseBackup('texte')).toBeNull();
    expect(parseBackup({})).toBeNull();
  });
});

describe('mergeProjects', () => {
  it('conserve les projets existants absents de l’import', () => {
    const existing = projectFixture({ id: 'a' });
    expect(mergeProjects([existing], [])).toEqual([existing]);
  });

  it('ajoute les nouveaux projets importés', () => {
    const existing = projectFixture({ id: 'a' });
    const incoming = projectFixture({ id: 'b' });
    const merged = mergeProjects([existing], [incoming]);
    expect(merged.map((p) => p.id).sort()).toEqual(['a', 'b']);
  });

  it('résout un doublon en gardant la version la plus récemment ouverte', () => {
    const older = projectFixture({ id: 'a', name: 'Ancien', lastOpenedAt: 1 });
    const newer = projectFixture({ id: 'a', name: 'Récent', lastOpenedAt: 2 });

    expect(mergeProjects([older], [newer])[0].name).toBe('Récent');
    expect(mergeProjects([newer], [older])[0].name).toBe('Récent');
  });
});
