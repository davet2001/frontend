/**
 * To do
 * - Verify what happens if incomplete data set is provided e.g.
 *   - grid but no generation,
 *   - no consumers
 *   - no grid
 *   - etc
 */
import { mdiSolarPower } from "@mdi/js";
import { UnsubscribeFunc } from "home-assistant-js-websocket";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";

import "../../../../components/chart/ha-chart-base";
import "../../../../components/ha-card";
import {
  DeviceConsumptionEnergyPreference,
  EnergyData,
  energySourcesByType,
  getEnergyDataCollection,
  SolarSourceTypeEnergyPreference,
} from "../../../../data/energy";
import {
  calculateStatisticsSumGrowth,
  getStatisticLabel,
} from "../../../../data/recorder";
import { SubscribeMixin } from "../../../../mixins/subscribe-mixin";
import { HomeAssistant } from "../../../../types";
import { LovelaceCard } from "../../types";
import { EnergySolarFlowCardConfig } from "../types";
import "../../../../components/chart/elec-sankey";
import type { ElecRoute } from "../../../../components/chart/elec-sankey";
import "../../../../components/chart/ha-energy-sankey";

@customElement("hui-energy-elec-flow-card")
export class HuiEnergyElecFlowCard
  extends SubscribeMixin(LitElement)
  implements LovelaceCard
{
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _config?: EnergySolarFlowCardConfig;

  @state() private _gridInRoute?: ElecRoute;

  @state() private _generationInRoutes: { [id: string]: ElecRoute } = {};

  @state() private _consumerRoutes: { [id: string]: ElecRoute } = {};

  protected hassSubscribeRequiredHostProps = ["_config"];

  public hassSubscribe(): UnsubscribeFunc[] {
    return [
      getEnergyDataCollection(this.hass, {
        key: this._config?.collection_key,
      }).subscribe((data) => this._getStatistics(data)),
    ];
  }

  public getCardSize(): Promise<number> | number {
    return 3;
  }

  public setConfig(config: EnergySolarFlowCardConfig): void {
    this._config = config;
  }

  protected render() {
    if (!this.hass || !this._config) {
      return nothing;
    }
    return html`
      <ha-card>
        ${this._config.title
          ? html`<h1 class="card-header">${this._config.title}</h1>`
          : ""}
        <div
          class="content ${classMap({
            "has-header": !!this._config.title,
          })}"
        >
          <ha-energy-sankey
            .hass=${this.hass}
            .gridInRoute=${this._gridInRoute ? this._gridInRoute : undefined}
            .generationInRoutes=${this._generationInRoutes
              ? this._generationInRoutes
              : {}}
            .consumerRoutes=${this._consumerRoutes ? this._consumerRoutes : {}}
          ></ha-energy-sankey>
        </div>
      </ha-card>
    `;
  }

  private async _getStatistics(energyData: EnergyData): Promise<void> {
    const solarSources: SolarSourceTypeEnergyPreference[] =
      energyData.prefs.energy_sources.filter(
        (source) => source.type === "solar"
      ) as SolarSourceTypeEnergyPreference[];

    const prefs = energyData.prefs;
    const types = energySourcesByType(prefs);

    const totalFromGrid =
      calculateStatisticsSumGrowth(
        energyData.stats,
        types.grid![0].flow_from.map((flow) => flow.stat_energy_from)
      ) ?? 0;

    this._gridInRoute = {
      id: "grid-in-all",
      rate: totalFromGrid,
    };

    solarSources.forEach((source) => {
      const label = getStatisticLabel(
        this.hass,
        source.stat_energy_from,
        undefined
      );

      const value = calculateStatisticsSumGrowth(energyData.stats, [
        source.stat_energy_from,
      ]);
      if (!(source.stat_energy_from in this._generationInRoutes)) {
        this._generationInRoutes[source.stat_energy_from] = {
          id: source.stat_energy_from,
          text: label,
          rate: value ?? 0,
          icon: mdiSolarPower,
        };
      } else {
        this._generationInRoutes[source.stat_energy_from].rate = value ?? 0;
      }
    });

    const consumers: DeviceConsumptionEnergyPreference[] = energyData.prefs
      .device_consumption as DeviceConsumptionEnergyPreference[];

    consumers.forEach((consumer) => {
      const label = getStatisticLabel(
        this.hass,
        consumer.stat_consumption,
        undefined
      );
      const value = calculateStatisticsSumGrowth(energyData.stats, [
        consumer.stat_consumption,
      ]);
      if (!(consumer.stat_consumption in this._consumerRoutes)) {
        this._consumerRoutes[consumer.stat_consumption] = {
          id: consumer.stat_consumption,
          text: label,
          rate: value ?? 0,
          icon: undefined,
        };
      } else {
        this._consumerRoutes[consumer.stat_consumption].rate = value ?? 0;
      }
    });
  }

  static styles = css`
    ha-card {
      height: 100%;
    }
    .card-header {
      padding-bottom: 0;
    }
    ha-energy-sankey {
      --solar-color: var(--energy-solar-color);
      --grid-in-color: var(--energy-grid-consumption-color);
      --icon-primary-color: var(--icon-primary-color);
    }
  `;
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-energy-elec-flow-card": HuiEnergyElecFlowCard;
  }
}
