import { HassEntity } from "home-assistant-js-websocket/dist/types";
import {
  css,
  CSSResultGroup,
  html,
  LitElement,
  PropertyValues,
  nothing,
} from "lit";
import { mdiSolarPower } from "@mdi/js";
import { customElement, property, state } from "lit/decorators";
import { applyThemesOnElement } from "../../../common/dom/apply_themes_on_element";
import { computeStateName } from "../../../common/entity/compute_state_name";
import { isValidEntityId } from "../../../common/entity/valid_entity_id";
import "../../../components/ha-card";
import "../../../components/ha-gauge";
import type { HomeAssistant } from "../../../types";
import { findEntities } from "../common/find-entities";
import { createEntityNotFoundWarning } from "../components/hui-warning";
import type { LovelaceCard } from "../types";
import type { GaugeCardConfig, PowerFlowCardConfig } from "./types";
import { ElecRoute } from "../../../components/chart/elec-sankey";
import "../../../components/chart/ha-elec-sankey";
import { hasConfigChanged } from "../common/has-changed";

export const DEFAULT_MIN = 0;
export const DEFAULT_MAX = 100;

export const severityMap = {
  red: "var(--error-color)",
  green: "var(--success-color)",
  yellow: "var(--warning-color)",
  normal: "var(--info-color)",
};

@customElement("hui-power-flow-card")
class HuiPowerFlowCard extends LitElement implements LovelaceCard {
  // public static async getConfigElement(): Promise<LovelaceCardEditor> {
  //   await import("../editor/config-elements/hui-power-flow-card-editor");
  //   return document.createElement("hui-power-flow-card-editor");
  // }

  public static getStubConfig(
    hass: HomeAssistant,
    entities: string[],
    entitiesFallback: string[]
  ): GaugeCardConfig {
    const includeDomains = ["counter", "input_number", "number", "sensor"];
    const maxEntities = 1;
    const entityFilter = (stateObj: HassEntity): boolean =>
      !isNaN(Number(stateObj.state));

    const foundEntities = findEntities(
      hass,
      maxEntities,
      entities,
      entitiesFallback,
      includeDomains,
      entityFilter
    );

    return { type: "gauge", entity: foundEntities[0] || "" };
  }

  @property({ attribute: false }) public hass?: HomeAssistant;

  @state() private _config?: PowerFlowCardConfig;

  // @state() private _gridInRoute?: ElecRoute;

  public getCardSize(): number {
    return 3;
  }

  public setConfig(config: PowerFlowCardConfig): void {
    if (
      !config.power_from_grid_entity &&
      !config.power_to_grid_entity &&
      !config.generation_entities &&
      !config.consumer_entities
    ) {
      throw new Error("Must specify at least one entity");
    }
    if (config.power_from_grid_entity) {
      if (!isValidEntityId(config.power_from_grid_entity)) {
        throw new Error("Invalid power from grid entity specified");
      }
      // Todo more checks
      this._config = { ...config };
    }
  }

  protected render() {
    if (!this._config || !this.hass) {
      return nothing;
    }
    let gridInRoute: ElecRoute | null = null;
    if (this._config.power_from_grid_entity) {
      const stateObj = this.hass.states[this._config.power_from_grid_entity];
      if (!stateObj) {
        return html`
          <hui-warning>
            ${createEntityNotFoundWarning(
              this.hass,
              this._config.power_from_grid_entity
            )}
          </hui-warning>
        `;
      }
      const name = computeStateName(stateObj);
      gridInRoute = {
        id: this._config.power_from_grid_entity,
        text: name,
        rate: Number(stateObj.state),
      };
    }

    let gridOutRoute: ElecRoute | null = null;
    if (this._config.power_to_grid_entity) {
      const stateObj = this.hass.states[this._config.power_to_grid_entity];
      if (!stateObj) {
        return html`
          <hui-warning>
            ${createEntityNotFoundWarning(
              this.hass,
              this._config.power_to_grid_entity
            )}
          </hui-warning>
        `;
      }
      const name = computeStateName(stateObj);
      gridOutRoute = {
        id: this._config.power_to_grid_entity,
        text: name,
        rate: Number(stateObj.state),
      };
    }

    const generationInRoutes: { [id: string]: ElecRoute } = {};
    if (this._config.generation_entities) {
      for (const entity of this._config.generation_entities) {
        const stateObj = this.hass.states[entity];
        if (!stateObj) {
          return html`
            <hui-warning>
              ${createEntityNotFoundWarning(this.hass, entity)}
            </hui-warning>
          `;
        }
        const name = computeStateName(stateObj);
        generationInRoutes[entity] = {
          id: entity,
          text: name,
          rate: Number(stateObj.state),
          icon: mdiSolarPower,
        };
      }
    }

    const consumerRoutes: { [id: string]: ElecRoute } = {};
    if (this._config.consumer_entities) {
      for (const entity of this._config.consumer_entities) {
        const stateObj = this.hass.states[entity];
        if (!stateObj) {
          return html`
            <hui-warning>
              ${createEntityNotFoundWarning(this.hass, entity)}
            </hui-warning>
          `;
        }
        const name = computeStateName(stateObj);
        consumerRoutes[entity] = {
          id: entity,
          text: name,
          rate: Number(stateObj.state),
        };
      }
    }
    // const stateObj = this.hass.states[this._config.entity];

    // if (!stateObj) {
    //   return html`
    //     <hui-warning>
    //       ${createEntityNotFoundWarning(this.hass, this._config.entity)}
    //     </hui-warning>
    //   `;
    // }

    // const entityState = Number(stateObj.state);

    // if (stateObj.state === UNAVAILABLE) {
    //   return html`
    //     <hui-warning
    //       >${this.hass.localize(
    //         "ui.panel.lovelace.warning.entity_unavailable",
    //         { entity: this._config.entity }
    //       )}</hui-warning
    //     >
    //   `;
    // }

    // if (isNaN(entityState)) {
    //   return html`
    //     <hui-warning
    //       >${this.hass.localize(
    //         "ui.panel.lovelace.warning.entity_non_numeric",
    //         { entity: this._config.entity }
    //       )}</hui-warning
    //     >
    //   `;
    // }

    return html`
      <ha-card>
        <ha-elec-sankey
          .hass=${this.hass}
          .unit=${"W"}
          .gridInRoute=${gridInRoute || undefined}
          .gridOutRoute=${gridOutRoute || undefined}
          .generationInRoutes=${generationInRoutes}
          .consumerRoutes=${consumerRoutes}
        ></ha-elec-sankey>
      </ha-card>
    `;
  }

  protected shouldUpdate(changedProps: PropertyValues): boolean {
    if (hasConfigChanged(this, changedProps)) {
      return true;
    }

    if (!changedProps.has("hass")) {
      return false;
    }
    const oldHass = changedProps.get("hass") as HomeAssistant;
    const newHass = this.hass as HomeAssistant;

    if (this._config) {
      for (const id of [
        this._config.power_from_grid_entity || [],
        this._config.power_to_grid_entity || [],
        ...this._config!.generation_entities,
        ...this._config!.consumer_entities,
      ]) {
        const oldState = oldHass.states[id] as HassEntity | undefined;
        const newState = newHass.states[id] as HassEntity | undefined;

        if (oldState !== newState) {
          return true;
        }
      }
    }
    return false;
  }

  protected updated(changedProps: PropertyValues): void {
    super.updated(changedProps);
    if (!this._config || !this.hass) {
      return;
    }

    const oldHass = changedProps.get("hass") as HomeAssistant | undefined;
    const oldConfig = changedProps.get("_config") as
      | GaugeCardConfig
      | undefined;

    if (
      !oldHass ||
      !oldConfig ||
      oldHass.themes !== this.hass.themes ||
      oldConfig.theme !== this._config.theme
    ) {
      applyThemesOnElement(this, this.hass.themes, this._config.theme);
    }
  }

  static get styles(): CSSResultGroup {
    return css`
      ha-card {
        height: 100%;
        //overflow: hidden;
        padding: 16px;
        //display: flex;
        align-items: center;
        justify-content: center;
        flex-direction: column;
        box-sizing: border-box;
      }

      ha-card:focus {
        outline: none;
      }
      ha-elec-sankey {
        --solar-color: var(--energy-solar-color);
        --grid-in-color: var(--energy-grid-consumption-color);
      }
      .name {
        text-align: center;
        line-height: initial;
        color: var(--primary-text-color);
        width: 100%;
        font-size: 15px;
        margin-top: 8px;
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-power-flow-card": HuiPowerFlowCard;
  }
}
