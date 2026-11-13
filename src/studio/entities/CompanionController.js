/**
 * CompanionController manages the autonomous and guided behaviors
 * of the robotic cat companion (PET-001), including follow state,
 * modal dialog pause guards, and holographic assist triggers.
 */
export class CompanionController {
  /**
   * @param {import('./RoboCat.js').RoboCat} roboCat
   * @param {import('./Avatar.js').Avatar} avatar
   * @param {import('../interactions/HotspotManager.js').HotspotManager} hotspotManager
   */
  constructor(roboCat, avatar, hotspotManager) {
    this.roboCat = roboCat;
    this.avatar = avatar;
    this.hotspotManager = hotspotManager;

    if (this.roboCat && this.avatar) {
      this.roboCat.setTargetActor(this.avatar);
    }
  }

  /**
   * Toggles whether robo-cat follows the player.
   * @returns {boolean} New follow state
   */
  toggleFollow() {
    const nextState = !this.roboCat.isFollowing;
    this.roboCat.setFollowing(nextState);
    if (!nextState) {
      this.roboCat.returnToBed();
    }
    return nextState;
  }

  /**
   * Guides the user to a requested hotspot using holographic assist.
   * @param {string} hotspotId
   */
  guideToHotspot(hotspotId) {
    const hotspot = this.hotspotManager.getHotspotById(hotspotId);
    if (!hotspot || !hotspot.interactionTile) {
      this.roboCat.react();
      return;
    }

    const [tCol, tRow] = hotspot.interactionTile;
    // Find safe point adjacent to hotspot
    this.roboCat.wakeUp();
    this.roboCat.moveTo(tCol, tRow, () => {
      this.roboCat.assist();
    });
  }

  /**
   * Pauses companion pathfinding when an HTML content modal is open.
   * Specification: stop_when_modal_open = true
   */
  onModalOpened() {
    if (this.roboCat) {
      this.roboCat.isPausedForModal = true;
      this.roboCat.stop();
    }
  }

  /**
   * Resumes companion pathfinding after modal is dismissed.
   */
  onModalClosed() {
    if (this.roboCat) {
      this.roboCat.isPausedForModal = false;
    }
  }
}
