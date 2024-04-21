import { css } from "lit";
import { customElement } from "lit/decorators";
import { HaElecSankey } from "./ha-elec-sankey";

@customElement("ha-energy-sankey")
export class HaEnergySankey extends HaElecSankey {
  static styles = [
    super.styles,
    css`
      ha-card {
        height: 100%;
      }
      .card-header {
        padding-bottom: 0;
      }
      .content {
        padding: 16px;
      }
      .has-header {
        padding-top: 0;
      }
      .no-data {
        position: absolute;
        height: 100%;
        top: 0;
        left: 0;
        right: 0;
        display: flex;
        justify-content: center;
        align-items: center;
        padding: 20%;
        margin-left: 32px;
        box-sizing: border-box;
      }
    `,
  ];
}

declare global {
  interface HTMLElementTagNameMap {
    "ha-energy-sankey": HaElecSankey;
  }
}
