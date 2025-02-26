import { mdiCalendar, mdiDatabase, mdiPuzzle, mdiUpload } from "@mdi/js";
import type { CSSResultGroup } from "lit";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property } from "lit/decorators";
import { navigate } from "../../../../../common/navigate";
import "../../../../../components/ha-button";
import "../../../../../components/ha-card";
import "../../../../../components/ha-icon-next";
import "../../../../../components/ha-md-list";
import "../../../../../components/ha-md-list-item";
import "../../../../../components/ha-svg-icon";
import type { BackupConfig } from "../../../../../data/backup";
import {
  BackupScheduleState,
  computeBackupAgentName,
  getFormattedBackupTime,
  isLocalAgent,
} from "../../../../../data/backup";
import { haStyle } from "../../../../../resources/styles";
import type { HomeAssistant } from "../../../../../types";

@customElement("ha-backup-overview-settings")
class HaBackupBackupsSummary extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property({ attribute: false }) public config!: BackupConfig;

  private _configure() {
    navigate("/config/backup/settings");
  }

  private _scheduleDescription(config: BackupConfig): string {
    const { copies, days } = config.retention;
    const { state: schedule } = config.schedule;

    if (schedule === BackupScheduleState.NEVER) {
      return "Automatic backups are disabled";
    }

    let copiesText = "and keep all backups";
    if (copies) {
      copiesText = `and keep the latest ${copies} backup(s)`;
    } else if (days) {
      copiesText = `and keep backups for ${days} day(s)`;
    }

    const time = getFormattedBackupTime(this.hass.locale, this.hass.config);

    let scheduleText = "";
    if (schedule === BackupScheduleState.DAILY) {
      scheduleText = `Daily at ${time}`;
    }
    if (schedule === BackupScheduleState.MONDAY) {
      scheduleText = `Weekly on Mondays at ${time}`;
    }
    if (schedule === BackupScheduleState.TUESDAY) {
      scheduleText = `Weekly on Tuesdays at ${time}`;
    }
    if (schedule === BackupScheduleState.WEDNESDAY) {
      scheduleText = `Weekly on Wednesdays at ${time}`;
    }
    if (schedule === BackupScheduleState.THURSDAY) {
      scheduleText = `Weekly on Thursdays at ${time}`;
    }
    if (schedule === BackupScheduleState.FRIDAY) {
      scheduleText = `Weekly on Fridays at ${time}`;
    }
    if (schedule === BackupScheduleState.SATURDAY) {
      scheduleText = `Weekly on Saturdays at ${time}`;
    }
    if (schedule === BackupScheduleState.SUNDAY) {
      scheduleText = `Weekly on Sundays at ${time}`;
    }

    return scheduleText + " " + copiesText;
  }

  private _addonsDescription(config: BackupConfig): string {
    if (config.create_backup.include_all_addons) {
      return "All add-ons";
    }
    if (config.create_backup.include_addons?.length) {
      return `${config.create_backup.include_addons.length} add-ons`;
    }
    return "No add-ons";
  }

  private _agentsDescription(config: BackupConfig): string {
    const hasLocal = config.create_backup.agent_ids.some((a) =>
      isLocalAgent(a)
    );

    const offsiteLocations = config.create_backup.agent_ids.filter(
      (a) => !isLocalAgent(a)
    );

    if (offsiteLocations.length) {
      if (offsiteLocations.length === 1) {
        const name = computeBackupAgentName(
          this.hass.localize,
          offsiteLocations[0],
          offsiteLocations
        );
        return `Upload to ${name}`;
      }
      return `Upload to ${offsiteLocations.length} off-site locations`;
    }
    if (hasLocal) {
      return "Local backup only";
    }
    return "No location configured";
  }

  render() {
    const isHassio = this.hass.config.components.includes("hassio");

    return html`
      <ha-card class="my-backups">
        <div class="card-header">Automatic backups</div>
        <div class="card-content">
          <ha-md-list>
            <ha-md-list-item
              type="link"
              href="/config/backup/settings#schedule"
            >
              <ha-svg-icon slot="start" .path=${mdiCalendar}></ha-svg-icon>
              <div slot="headline">
                ${this._scheduleDescription(this.config)}
              </div>
              <div slot="supporting-text">
                Schedule and number of backups to keep
              </div>
              <ha-icon-next slot="end"></ha-icon-next>
            </ha-md-list-item>
            <ha-md-list-item type="link" href="/config/backup/settings#data">
              <ha-svg-icon slot="start" .path=${mdiDatabase}></ha-svg-icon>
              <div slot="headline">
                ${this.config.create_backup.include_database
                  ? "Settings and history"
                  : "Settings only"}
              </div>
              <div slot="supporting-text">
                Home Assistant data that is included
              </div>
              <ha-icon-next slot="end"></ha-icon-next>
            </ha-md-list-item>
            ${isHassio
              ? html`
                  <ha-md-list-item
                    type="link"
                    href="/config/backup/settings#data"
                  >
                    <ha-svg-icon slot="start" .path=${mdiPuzzle}></ha-svg-icon>
                    <div slot="headline">
                      ${this._addonsDescription(this.config)}
                    </div>
                    <div slot="supporting-text">Add-ons that are included</div>
                    <ha-icon-next slot="end"></ha-icon-next>
                  </ha-md-list-item>
                `
              : nothing}
            <ha-md-list-item
              type="link"
              href="/config/backup/settings#locations"
            >
              <ha-svg-icon slot="start" .path=${mdiUpload}></ha-svg-icon>
              <div slot="headline">${this._agentsDescription(this.config)}</div>
              <div slot="supporting-text">
                Locations where backup is uploaded to
              </div>
              <ha-icon-next slot="end"></ha-icon-next>
            </ha-md-list-item>
          </ha-md-list>
        </div>
        <div class="card-actions">
          <ha-button @click=${this._configure}>
            Configure automatic backups
          </ha-button>
        </div>
      </ha-card>
    `;
  }

  static get styles(): CSSResultGroup {
    return [
      haStyle,
      css`
        .content {
          padding: 28px 20px 0;
          max-width: 690px;
          margin: 0 auto;
          gap: 24px;
          display: flex;
          flex-direction: column;
          margin-bottom: 24px;
          margin-bottom: 72px;
        }
        .card-actions {
          display: flex;
          justify-content: flex-end;
        }
        .card-header {
          padding-bottom: 8px;
        }
        .card-content {
          padding-left: 0;
          padding-right: 0;
          padding-bottom: 0;
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-backup-overview-settings": HaBackupBackupsSummary;
  }
}
