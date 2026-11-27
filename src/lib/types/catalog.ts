/** What the player needs to play a track. Serializable. */
export type PlayableTrack = {
  id: string;
  title: string;
  slug: string;
  featuring: string | null;
  artistId: string;
  artistName: string;
  artistSlug: string;
  releaseTitle: string | null;
  releaseSlug: string | null;
  artworkUrl: string | null;
  durationMs: number;
  isExplicit: boolean;
};
