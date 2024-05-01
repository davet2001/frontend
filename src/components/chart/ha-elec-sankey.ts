import { customElement, property } from "lit/decorators";

import { TemplateResult, css, html, nothing } from "lit";
import { mdiArrowLeft, mdiArrowRight } from "@mdi/js";
import { HomeAssistant } from "../../types";
import { ElecSankey } from "./elec-sankey";
// import { ElecSankeyEnhanced } from "./elec-sankey-enhanced";
import { formatNumber } from "../../common/number/format_number";
import "../ha-icon";
import { fireEvent } from "../../common/dom/fire_event";

@customElement("ha-elec-sankey")
export class HaElecSankey extends ElecSankey {
  @property({ attribute: false }) public hass!: HomeAssistant;

  protected _generateLabelDiv(
    id: string | undefined,
    icon: string | undefined,
    _name: string | undefined,
    valueA: number,
    valueB: number | undefined
  ): TemplateResult {
    return html`
      <div
        class=${id ? "label-action-clickable" : "label-action"}
        id=${id || ""}
        @click=${id ? this._handleMoreInfo : nothing}
      >
        ${_name || nothing}
        ${icon
          ? html`<ha-svg-icon .path=${icon}> </ha-svg-icon><br />`
          : nothing}
        ${valueB
          ? html` <span class="return">
                <ha-svg-icon class="small" .path=${mdiArrowLeft}> </ha-svg-icon
                >${formatNumber(valueB, this.hass.locale, {
                  maximumFractionDigits: 1,
                })}&nbsp;${this.unit}</span
              ><br />
              <span class="consumption">
                <ha-svg-icon class="small" .path=${mdiArrowRight}> </ha-svg-icon
                >${formatNumber(valueA, this.hass.locale, {
                  maximumFractionDigits: 1,
                })}&nbsp;${this.unit}
              </span>`
          : html`${formatNumber(valueA, this.hass.locale, {
              maximumFractionDigits: 1,
            })}&nbsp;${this.unit}`}
      </div>
    `;
  }

  private _handleMoreInfo(e: MouseEvent) {
    const div = e.target as HTMLDivElement;
    fireEvent(this, "hass-more-info", {
      entityId: div.id,
    });
  }

  static styles = [
    super.styles,
    css`
      div {
        .label {
          font-size: 12px;
        }
        .label-action-clickable {
          cursor: pointer;
        }
      }
      ha-svg-icon {
        --icon-primary-color: var(--icon-primary-color);
      }
      ha-svg-icon.small {
        --mdc-icon-size: 12px;
      }
      .consumption {
        color: var(--energy-grid-consumption-color);
      }
      .return {
        color: var(--energy-grid-return-color);
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-elec-sankey": HaElecSankey;
  }
}
