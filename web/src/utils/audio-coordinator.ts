type PauseCallback = () => void;

class AudioCoordinator {
  private activePlayerId: string | null = null;
  private pauseActivePlayer: PauseCallback | null = null;

  play(playerId: string, pauseCallback: PauseCallback): void {
    if (this.activePlayerId && this.activePlayerId !== playerId && this.pauseActivePlayer) {
      try {
        this.pauseActivePlayer();
      } catch {
        // Ignore errors from stale audio instances
      }
    }
    this.activePlayerId = playerId;
    this.pauseActivePlayer = pauseCallback;
  }

  stop(playerId: string): void {
    if (this.activePlayerId === playerId) {
      this.activePlayerId = null;
      this.pauseActivePlayer = null;
    }
  }
}

export const audioCoordinator = new AudioCoordinator();
