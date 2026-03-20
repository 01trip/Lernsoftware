import type { RecordModel } from 'pocketbase';

/**
 * Repräsentiert einen Lernenden (Schüler) in der PocketBase-Datenbank.
 * Erweitert PocketBase's RecordModel, damit Rückgabewerte von pb.collection()
 * direkt als User verwendbar sind (kein manuelles Casten nötig).
 */
export interface User extends RecordModel {
  name: string;
  klasse: number;
  xp: number;
  level: number;
}
