/**
 * To do
 * - Verify what happens if incomplete data set is provided e.g.
 *   - grid but no generation,
 *   - no consumers
 *   - no grid
 *   - etc
 *
 * - Fix warnings
 */
import { mdiTransmissionTower } from "@mdi/js";
import { endOfToday, startOfToday } from "date-fns/esm";
import { UnsubscribeFunc } from "home-assistant-js-websocket";
import { css, html, LitElement, nothing } from "lit";
import { customElement, property, state } from "lit/decorators";
import { classMap } from "lit/directives/class-map";
import { formatNumber } from "../../../../common/number/format_number";

import "../../../../components/chart/ha-chart-base";
import "../../../../components/ha-card";
import {
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
import { EnergySolarGraphCardConfig } from "../types";
import "../../../../components/chart/elec-sankey";
import type { ElecRoute } from "../../../../components/chart/elec-sankey";

@customElement("hui-energy-solar-flow-card")
export class HuiEnergySolarFlowCard
  extends SubscribeMixin(LitElement)
  implements LovelaceCard
{
  @property({ attribute: false }) public hass!: HomeAssistant;

  @state() private _config?: EnergySolarGraphCardConfig;

  // @state() private _chartData: ChartData = {
  //   datasets: [],
  // };

  // @state() private _sankey = new ElecSankey();

  @state() private _start = startOfToday();

  @state() private _end = endOfToday();

  @state() private _data?: EnergyData;

  @state() private _gridInRoute?: ElecRoute;

  @state() private _generationInRoutes: { [id: string]: ElecRoute } = {};

  @state() private _consumerRoutes?: { [id: string]: ElecRoute } = {};

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

  public setConfig(config: EnergySolarGraphCardConfig): void {
    this._config = config;
  }

  protected render() {
    if (!this.hass || !this._config) {
      return nothing;
    }

    // if (!this._data) {
    //   return html`${this.hass.localize(
    //     "ui.panel.lovelace.cards.energy.loading"
    //   )}`;
    // }

    // const prefs = this._data.prefs;
    // const types = energySourcesByType(prefs);

    // const totalFromGrid =
    //   calculateStatisticsSumGrowth(
    //     this._data.stats,
    //     types.grid![0].flow_from.map((flow) => flow.stat_energy_from)
    //   ) ?? 0;
    const gridInLabel = html`<div>
      <ha-svg-icon .path=${mdiTransmissionTower}></ha-svg-icon>
      <br />${this._gridInRoute
        ? formatNumber(this._gridInRoute.rate)
        : "??"}kWh
    </div>`;

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
          <elec-sankey
            .gridInRoute=${this._gridInRoute ? this._gridInRoute : undefined}
            .gridInHTML=${gridInLabel}
            .generationInRoutes=${this._generationInRoutes
              ? this._generationInRoutes
              : undefined}
          ></elec-sankey>
        </div>
      </ha-card>
    `;
  }
  // .gridInIcon=${gridInIcon}

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

    // eslint-disable-next-line no-console
    console.log("energyData=" + energyData);
    // start of test data
    this._gridInRoute = {
      id: "thing",
      text: "test",
      rate: totalFromGrid,
    };

    // end of test data

    // const datasets: ChartDataset<"bar" | "line">[] = [];

    // const computedStyles = getComputedStyle(this);
    // const solarColor = computedStyles
    //   .getPropertyValue("--energy-solar-color")
    //   .trim();

    // if (color.length === 0) {
    //   const modifiedColor =
    //     idx > 0
    //       ? this.hass.themes.darkMode
    //         ? labBrighten(rgb2lab(hex2rgb(solarColor)), idx)
    //         : labDarken(rgb2lab(hex2rgb(solarColor)), idx)
    //       : undefined;
    //   color = modifiedColor ? rgb2hex(lab2rgb(modifiedColor)) : solarColor;
    // }
    solarSources.forEach((source) => {
      // console.log("source(" + idx + ")=" + source.stat_energy_from);
      // let color = computedStyles
      //   .getPropertyValue("--energy-solar-color")
      //   .trim();

      // console.log("color=" + color);

      const label = getStatisticLabel(
        this.hass,
        source.stat_energy_from,
        undefined
      );

      const value =
        // 123 ??
        calculateStatisticsSumGrowth(energyData.stats, [
          source.stat_energy_from,
        ]);
      if (!(source.stat_energy_from in this._generationInRoutes)) {
        this._generationInRoutes[source.stat_energy_from] = {
          id: source.stat_energy_from,
          text: label,
          rate: value ?? 0,
        };
      } else {
        this._generationInRoutes[source.stat_energy_from].rate = value ?? 0;
      }
      // const stats = energyData.stats[source.stat_energy_from];
      // console.log(
      //   "stats=" +
      //     label +
      //     ": " +
      //     source.stat_energy_from +
      //     " has " +
      //     stats.length +
      //     " entries"
      // );
      // energyData.stats[source.stat_energy_from].forEach((point) => {
      //   console.log(
      //     "point=" +
      //       new Date(point.start).toISOString() +
      //       "-" +
      //       new Date(point.end).toISOString() +
      //       " " +
      //       point.change
      //   );
      // });
      // const points = energyData.stats[source.stat_energy_from];
      // console.log("points=" + points);
    });
  }
  // datasets.push(
  //   ...this._processDataSet(
  //     energyData.stats,
  //     energyData.statsMetadata,
  //     solarSources,
  //     solarColor,
  //     computedStyles
  //   )
  // );

  // if (energyData.statsCompare) {
  //   // Add empty dataset to align the bars
  //   datasets.push({
  //     order: 0,
  //     data: [],
  //   });
  //   datasets.push({
  //     order: 999,
  //     data: [],
  //     xAxisID: "xAxisCompare",
  //   });

  //   datasets.push(
  //     ...this._processDataSet(
  //       energyData.statsCompare,
  //       energyData.statsMetadata,
  //       solarSources,
  //       solarColor,
  //       computedStyles,
  //       true
  //     )
  //   );
  // }

  // if (forecasts) {
  //   datasets.push(
  //     ...this._processForecast(
  //       energyData.statsMetadata,
  //       forecasts,
  //       solarSources,
  //       computedStyles.getPropertyValue("--primary-text-color"),
  //       energyData.start,
  //       energyData.end
  //     )
  //   );
  // }

  // this._start = energyData.start;
  // this._end = energyData.end || endOfToday();

  // this._chartData = {
  //   datasets,
  // };

  // private _processDataSet(
  //   statistics: Statistics,
  //   statisticsMetaData: Record<string, StatisticsMetaData>,
  //   solarSources: SolarSourceTypeEnergyPreference[],
  //   solarColor: string,
  //   computedStyles: CSSStyleDeclaration,
  //   compare = false
  // ) {
  //   solarSources.forEach((source, idx) => {
  //     console.log("source=" + source.stat_energy_from);

  //     let borderColor = computedStyles
  //       .getPropertyValue("--energy-solar-color-" + idx)
  //       .trim();
  //     if (borderColor.length === 0) {
  //       const modifiedColor =
  //         idx > 0
  //           ? this.hass.themes.darkMode
  //             ? labBrighten(rgb2lab(hex2rgb(solarColor)), idx)
  //             : labDarken(rgb2lab(hex2rgb(solarColor)), idx)
  //           : undefined;
  //       borderColor = modifiedColor
  //         ? rgb2hex(lab2rgb(modifiedColor))
  //         : solarColor;
  //     }

  //     let prevStart: number | null = null;

  //     const solarProductionData: ScatterDataPoint[] = [];

  //     // Process solar production data.
  //     if (source.stat_energy_from in statistics) {
  //       const stats = statistics[source.stat_energy_from];
  //       let end;

  //       for (const point of stats) {
  //         if (point.change === null || point.change === undefined) {
  //           continue;
  //         }
  //         if (prevStart === point.start) {
  //           continue;
  //         }
  //         const date = new Date(point.start);
  //         solarProductionData.push({
  //           x: date.getTime(),
  //           y: point.change,
  //         });
  //         prevStart = point.start;
  //         end = point.end;
  //       }
  //       if (solarProductionData.length === 1) {
  //         solarProductionData.push({
  //           x: end,
  //           y: 0,
  //         });
  //       }
  //     }

  //     data.push({
  //       label: this.hass.localize(
  //         "ui.panel.lovelace.cards.energy.energy_solar_graph.production",
  //         {
  //           name: getStatisticLabel(
  //             this.hass,
  //             source.stat_energy_from,
  //             statisticsMetaData[source.stat_energy_from]
  //           ),
  //         }
  //       ),
  //       borderColor: compare ? borderColor + "7F" : borderColor,
  //       backgroundColor: compare ? borderColor + "32" : borderColor + "7F",
  //       data: solarProductionData,
  //       order: 1,
  //       stack: "solar",
  //       xAxisID: compare ? "xAxisCompare" : undefined,
  //     });
  //   });

  //   return data;
  // }

  static get styles() {
    return css`
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
      elec-sankey {
        --solar-color: var(--energy-solar-color);
        --grid-in-color: var(--energy-grid-consumption-color);
        --icon-primary-color: var(--icon-primary-color);
      }
      ha-svg-icon {
        --icon-primary-color: var(--icon-primary-color);
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "hui-energy-solar-flow-card": HuiEnergySolarFlowCard;
  }
}
