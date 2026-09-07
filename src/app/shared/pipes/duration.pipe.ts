import { Pipe, PipeTransform } from '@angular/core';

/** Millisecondes en `m:ss` (ou `h:mm:ss` au-delà d'une heure). */
@Pipe({ name: 'filDuration' })
export class DurationPipe implements PipeTransform {
  transform(milliseconds: number): string {
    const total = Math.floor((milliseconds ?? 0) / 1000);
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const seconds = total % 60;
    const head = hours ? `${hours}:${String(minutes).padStart(2, '0')}` : `${minutes}`;
    return `${head}:${String(seconds).padStart(2, '0')}`;
  }
}
