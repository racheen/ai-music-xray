export {};

declare global {
  interface Window {
    onSpotifyWebPlaybackSDKReady?: () => void;
    Spotify?: {
      Player: new (options: {
        name: string;
        getOAuthToken: (callback: (token: string) => void) => void;
        volume?: number;
      }) => SpotifyPlayer;
    };
  }

  type SpotifyPlayer = {
    addListener: (event: string, callback: (payload: unknown) => void) => boolean;
    connect: () => Promise<boolean>;
    disconnect: () => void;
    getCurrentState: () => Promise<SpotifyWebPlaybackState | null>;
    togglePlay: () => Promise<void>;
    pause: () => Promise<void>;
    resume: () => Promise<void>;
    nextTrack: () => Promise<void>;
    previousTrack: () => Promise<void>;
    seek: (positionMs: number) => Promise<void>;
  };

  type SpotifyWebPlaybackState = {
    paused: boolean;
    position: number;
    duration: number;
    track_window: {
      current_track: {
        id: string;
        name: string;
        duration_ms: number;
        album: { images: Array<{ url: string }> };
        artists: Array<{ name: string }>;
        preview_url?: string | null;
      };
    };
  };
}
