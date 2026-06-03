export type SpotifyImage = { url: string; width?: number; height?: number };

export type SpotifyTrack = {
  id: string;
  name: string;
  duration_ms: number;
  preview_url?: string | null;
  artists: Array<{ name: string }>;
  album: { images: SpotifyImage[]; name: string };
  popularity?: number;
};

export type SpotifyPlayback = {
  is_playing: boolean;
  progress_ms: number;
  item?: SpotifyTrack | null;
};
