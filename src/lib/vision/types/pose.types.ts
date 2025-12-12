export interface Landmark {
  x: number;
  y: number;
  z: number;
  visibility?: number;
}

export type PoseLandmarks = Landmark[];

export interface NormalizedLandmark {
  x: number;
  y: number;
  z: number;
}

export type PoseConnections = [number, number][];
