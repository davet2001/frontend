import { customElement, property } from "lit/decorators";

import { TemplateResult, html } from "lit";
import { HomeAssistant } from "../../types";
import { ElecSankey } from "./elec-sankey";
// import { ElecSankeyEnhanced } from "./elec-sankey-enhanced";
import { formatNumber } from "../../common/number/format_number";
import "../ha-icon";

@customElement("ha-elec-sankey")
export class HaElecSankey extends ElecSankey {
  @property({ attribute: false }) public hass!: HomeAssistant;

  @property()
  public unit: string = "kWh";

  protected _generateIconLabelDiv(icon: string, value: number): TemplateResult {
    return html`
      <div>
        <ha-svg-icon .path=${icon}></ha-svg-icon>
        <br />
        ${formatNumber(value, this.hass.locale, {
          maximumFractionDigits: 1,
        })}${this.unit}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-elec-sankey": HaElecSankey;
  }
}
