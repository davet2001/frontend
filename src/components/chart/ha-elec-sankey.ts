import { customElement, property } from "lit/decorators";

import { TemplateResult, css, html, nothing } from "lit";
import { HomeAssistant } from "../../types";
import { ElecSankey } from "./elec-sankey";
// import { ElecSankeyEnhanced } from "./elec-sankey-enhanced";
import { formatNumber } from "../../common/number/format_number";
import "../ha-icon";

@customElement("ha-elec-sankey")
export class HaElecSankey extends ElecSankey {
  @property({ attribute: false }) public hass!: HomeAssistant;

  protected _generateLabelDiv(
    icon: string | undefined,
    _name: string | undefined,
    value: number
  ): TemplateResult {
    return html`
      <div style="background:gray;">
        ${_name || nothing}
        ${icon
          ? html`<ha-svg-icon .path=${icon}> </ha-svg-icon><br />`
          : nothing}
        ${formatNumber(value, this.hass.locale, {
          maximumFractionDigits: 1,
        })}&nbsp;${this.unit}
      </div>
    `;
  }

  static styles = [
    super.styles,
    css`
      div {
        .label {
          font-size: 12px;
        }
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-elec-sankey": HaElecSankey;
  }
}
