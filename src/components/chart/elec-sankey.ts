/**
 * Todo:
 * Should attributes be true or false?
 *
 */
import {
  CSSResultArray,
  LitElement,
  TemplateResult,
  css,
  html,
  nothing,
  svg,
} from "lit";

import { mdiTransmissionTower } from "@mdi/js";

import { customElement, property } from "lit/decorators";

const TERMINATOR_BLOCK_LENGTH = 50;
const GENERATION_FAN_OUT_HORIZONTAL_GAP = 50;
const CONSUMERS_FAN_OUT_VERTICAL_GAP = 50;
const CONSUMERS_FAN_OUT_HORIZONTAL_SPAN = 200;
const CONSUMERS_LABEL_WIDTH = 180;

const TARGET_SCALED_TRUNK_WIDTH = 150;

const PV_COLOR = "#0d6a04";
const GRID_IN_COLOR = "#920e83";

const BLEND_LENGTH = 100;
const BLEND_LENGTH_PRE_FAN_OUT = 30;

const ARROW_HEAD_LENGTH = 10;
const TEXT_PADDING = 8;
const FONT_SIZE_PX = 16;
const ICON_SIZE_PX = 24;

const PV_ORIGIN_X = 500;
const PV_ORIGIN_Y = 0 + TEXT_PADDING * 2 + FONT_SIZE_PX + ICON_SIZE_PX;

const GRID_ORIGIN_X = 80;

export const PAD_ANTIALIAS = 0.5;

export interface ElecRoute {
  id?: string;
  text?: string;
  rate: number;
  icon?: string;
}

// Color mixing from here: https://stackoverflow.com/a/76752232
function hex2dec(hex: string) {
  const matched = hex.replace("#", "").match(/.{2}/g);
  if (!matched) throw new Error("Invalid hex string");
  return matched.map((n) => parseInt(n, 16));
}

function rgb2hex(r: number, g: number, b: number) {
  r = Math.round(r);
  g = Math.round(g);
  b = Math.round(b);
  r = Math.min(r, 255);
  g = Math.min(g, 255);
  b = Math.min(b, 255);
  return "#" + [r, g, b].map((c) => c.toString(16).padStart(2, "0")).join("");
}

export function mixHexes(hex1: string, hex2: string, ratio: number = 0.5) {
  if (ratio > 1 || ratio < 0) {
    throw new Error("Invalid ratio: " + ratio);
  }
  const [r1, g1, b1] = hex2dec(hex1);
  const [r2, g2, b2] = hex2dec(hex2);
  const r = Math.round(r1 * ratio + r2 * (1 - ratio));
  const g = Math.round(g1 * ratio + g2 * (1 - ratio));
  const b = Math.round(b1 * ratio + b2 * (1 - ratio));
  return rgb2hex(r, g, b);
}
// End of color mixing code.
/**
 * Calculates the intersection point of two lines defined by their endpoints.
 * i.e. if the lines are defined by
 * (x1, y1) -> (x2, y2) and (x3, y3) -> (x4, y4),
 * As long as the two lines are not parallel, the function will return the
 * extrapolated intersection point of where the line x1,y1 -> x2,y2 intersects
 * the line x3,y3 -> x4,y4.
 */
function line_intersect(x1, y1, x2, y2, x3, y3, x4, y4) {
  // Based on https://stackoverflow.com/a/38977789

  const denom = (y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1);
  if (denom === 0) {
    // eslint-disable-next-line no-console
    console.log("Warning: Lines do not intersect.");
    return null;
  }
  const ua = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / denom;
  const ub = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / denom;
  const x = x1 + ua * (x2 - x1);
  const y = y1 + ua * (y2 - y1);
  const seg1 = ua >= 0 && ua <= 1;
  const seg2 = ub >= 0 && ub <= 1;
  return [x, y, seg1, seg2];
}
/**
 * Draws a flow based on the corners of the start and end.
 * Rather than draw a curve between two points, this function takes the
 * corners of a large stripe between two end lines, and constructs a 4-corner
 * bezier shape to join them. This is useful for creating a flow map where
 * there are significant changes in direction but we don't want curves to
 * overlap.
 * An extreme horizontal fan-out from a wide band to a spread out list
 * of horizontal lines can result in significant overlap if this were to
 * be constructed with curves of constant width.
 */
function renderFlowByCorners(
  startLX: number,
  startLY: number,
  startRX: number,
  startRY: number,
  endLX: number,
  endLY: number,
  endRX: number,
  endRY: number,
  classname: string = "",
  color: string | null = null
): TemplateResult {
  // Don't attempt to draw curves for very narrow lines
  if (
    Math.sqrt((startLX - startLY) ** 2 + (startRX - startRY) ** 2) < 1 ||
    Math.sqrt((endLX - endLY) ** 2 + (endRX - endRY) ** 2) < 1
  ) {
    return svg``;
  }

  // Find points to make a line along the the half way fold
  // between the start and the end ('Mirror' line).
  const pointAX = (startLX + endLX) / 2;
  const pointAY = (startLY + endLY) / 2;
  const pointBX = (startRX + endRX) / 2;
  const pointBY = (startRY + endRY) / 2;
  // The bezier points are defined by the intersection between:
  // - the lines perpendicular to the ends
  // - the mirror line.
  const ret1 = line_intersect(
    startLX,
    startLY,
    startLX - (startRY - startLY),
    startLY - (startLX - startRX),
    pointAX,
    pointAY,
    pointBX,
    pointBY
  );
  const ret2 = line_intersect(
    endLX,
    endLY,
    endLX + (endRY - endLY),
    endLY + (endLX - endRX),
    pointAX,
    pointAY,
    pointBX,
    pointBY
  );

  const ret3 = line_intersect(
    endRX,
    endRY,
    endRX + (endRY - endLY),
    endRY + (endLX - endRX),
    pointAX,
    pointAY,
    pointBX,
    pointBY
  );
  const ret4 = line_intersect(
    startRX,
    startRY,
    startRX - (startRY - startLY),
    startRY - (startLX - startRX),
    pointAX,
    pointAY,
    pointBX,
    pointBY
  );
  if (ret1 == null || ret2 == null || ret3 == null || ret4 == null) {
    // eslint-disable-next-line no-console
    console.log("Warning: Flow creation failed.");
    return svg``;
  }
  const [bezierStartLX, bezierStartLY, ,] = ret1;
  const [bezierEndLX, bezierEndLY, ,] = ret2;
  const [bezierEndRX, bezierEndRY, ,] = ret3;
  const [bezierStartRX, bezierStartRY, ,] = ret4;
  const fillspec = color ? "fill:" + color : "";
  const svg_ret = svg`
  <path
      class="flow ${classname}"
      d="M ${startLX},${startLY}
      C ${bezierStartLX},${bezierStartLY} ${bezierEndLX},${bezierEndLY} ${endLX},${endLY}
      L ${endRX},${endRY}
      C ${bezierEndRX},${bezierEndRY} ${bezierStartRX},${bezierStartRY} ${startRX},${startRY} Z"
      style="${fillspec}"
  />
`;
  return svg_ret;
}

function debugPoint(x: number, y: number, label: string): TemplateResult {
  return svg`
    <circle cx="${x}" cy="${y}" r="3" fill="#22DDDD" />
    <text x="${x - 13}" y="${y - 6}" font-size="10px">${label}</text>
`;
}

/**
 * Creates a flow map graphic showing the flow of electricity.
 *
 * In general, the aim of this class is to display a coherent and informative
 * visual representation of the flow of electricity. If a strange occurence
 * occurs, such as consumption exceeding total input power, the class should
 * attempt to display a sensible visual.
 *
 * The reason for this is that the class is likely to receive asynchronous
 * updates from different sensors. It must display a glitch-free best
 * approximation of the reality until more information becomes available.
 *
 * Interacting with the class is normally through the following methods:
 * 'add' - adding a grid source, renewable, or a consumer.
 * 'update' - updating the value of a grid source, renewable or consumer.
 *
 * Internally, the class deliberately avoids making reference to power or
 * energy because it can in fact be used for either. By populating with
 * power values it would represent power flow. By populating with energy
 * values it would represent the energy flow over a period of time.
 * 'rate' is used as a generic term to refer to the value or power/energy.
 *
 * Removing is not currently supported.
 */
@customElement("elec-sankey")
export class ElecSankey extends LitElement {
  @property()
  public unit: string = "kWh";

  @property()
  public generationInRoutes: { [id: string]: ElecRoute } = {};

  @property({ attribute: false })
  public gridInRoute?: ElecRoute;

  @property({ attribute: false })
  public gridOutRoute?: ElecRoute;

  @property()
  public consumerRoutes: { [id: string]: ElecRoute } = {};

  private _rateToWidthMultplier: number = 0.2;

  private _phantomGridInRoute?: ElecRoute;

  private _phantomGenerationInRoute?: ElecRoute;

  private _untrackedConsumerRoute: ElecRoute = {
    id: undefined,
    text: "Untracked",
    rate: 0,
  };

  // constructor() {
  //   super();
  //   this._recalculate();
  // }

  private _generationTrackedTotal(): number {
    let totalGen = 0;
    for (const key in this.generationInRoutes) {
      if (Object.prototype.hasOwnProperty.call(this.generationInRoutes, key)) {
        totalGen += this.generationInRoutes[key].rate;
      }
    }
    return totalGen;
  }

  private _generationPhantom(): number {
    return this._phantomGenerationInRoute
      ? this._phantomGenerationInRoute.rate
      : 0;
  }

  private _generationTotal(): number {
    return this._generationTrackedTotal() + this._generationPhantom();
  }

  private _netGridImport(): number {
    if (this.gridInRoute && this.gridOutRoute) {
      return this.gridInRoute.rate - this.gridOutRoute.rate;
    }
    if (this.gridInRoute === undefined && this.gridOutRoute) {
      return -this.gridOutRoute.rate;
    }
    if (this.gridInRoute && this.gridOutRoute === undefined) {
      return this.gridInRoute.rate;
    }
    return 0;
  }

  private _gridImport(): number {
    if (this.gridInRoute) {
      return this.gridInRoute.rate > 0 ? this.gridInRoute.rate : 0;
    }
    return this._netGridImport();
  }

  private _gridExport(): number {
    if (this.gridOutRoute) {
      return this.gridOutRoute.rate;
    }
    return -this._netGridImport();
  }

  private _consumerTrackedTotal(): number {
    let total = 0;
    for (const id in this.consumerRoutes) {
      if (Object.prototype.hasOwnProperty.call(this.consumerRoutes, id)) {
        total += this.consumerRoutes[id].rate;
      }
    }
    return total;
  }

  private _recalculate() {
    const gridImport = this._gridImport();
    const gridExport = this._gridExport();
    const netGridImport = this._netGridImport();
    const generationTrackedTotal = this._generationTrackedTotal();
    const consumerTrackedTotal = this._consumerTrackedTotal();

    // Balance the books.
    const x =
      consumerTrackedTotal - gridImport - (generationTrackedTotal - gridExport);
    if (x > 0) {
      // There is an unknown energy source.
      if (this.gridInRoute === undefined && this.gridOutRoute === undefined) {
        // If we aren't tracking grid sources, create a phantom one.
        this._phantomGridInRoute = {
          id: "untracked",
          text: "Unknown",
          rate: x,
        };
        this._phantomGenerationInRoute = undefined;
        this._untrackedConsumerRoute.rate = 0;
      } else {
        // Otherwise, best guess is now a phantom generation source.
        this._phantomGridInRoute = undefined;
        this._phantomGenerationInRoute = {
          id: "untracked",
          text: "Unknown",
          rate: x,
        };
        this._untrackedConsumerRoute.rate = 0;
      }
    } else {
      // There is an untracked energy consumer (normal situation).
      this._phantomGridInRoute = undefined;
      this._phantomGenerationInRoute = undefined;
      this._untrackedConsumerRoute.rate = -x;
    }

    /**
     * Calculate and update a scaling factor to make the UI look sensible.
     * Since there is no limit to the value of input/output powers, the scaling
     * needs to be dynamic. This function calculates the scaling factor based
     * on ensuring the total width of the maximum 'trunk' sensible.
     */
    const genTotal =
      generationTrackedTotal +
      (this._phantomGenerationInRoute
        ? this._phantomGenerationInRoute.rate
        : 0);
    const gridInTotal =
      gridImport +
      (this._phantomGridInRoute ? this._phantomGridInRoute.rate : 0);
    const consumerTotal =
      consumerTrackedTotal +
      (this._untrackedConsumerRoute ? this._untrackedConsumerRoute.rate : 0);

    const widest_trunk = Math.max(genTotal, gridInTotal, consumerTotal, 1.0);
    this._rateToWidthMultplier = TARGET_SCALED_TRUNK_WIDTH / widest_trunk;
    // eslint-disable-next-line no-console
    console.log(
      "Recalculated:\n" +
        "x = " +
        x +
        "\n" +
        "gridImport = " +
        gridImport +
        "\n" +
        "netGridImport = " +
        netGridImport +
        "\n" +
        "generationTrackedTotal = " +
        generationTrackedTotal +
        "\n" +
        "consumerTrackedTotal = " +
        consumerTrackedTotal +
        "\n\n" +
        "genTotal=" +
        genTotal +
        "\n" +
        "gridInTotal=" +
        gridInTotal +
        "\n" +
        "consumerTotal=" +
        consumerTotal +
        "\n" +
        "phantomGridInroute=" +
        (this._phantomGridInRoute ? this._phantomGridInRoute.rate : 0) +
        "\n" +
        "phantomGenerationInroute=" +
        (this._phantomGenerationInRoute
          ? this._phantomGenerationInRoute.rate
          : 0) +
        "\n" +
        "untrackedConsumerRoute=" +
        this._untrackedConsumerRoute.rate +
        "\n"
    );
  }

  private _rateToWidth(rate: number): number {
    const value = rate * this._rateToWidthMultplier;
    return value > 1 ? value : 1;
  }

  private _generationInFlowWidth(): number {
    return this._rateToWidth(
      this._generationTrackedTotal() + this._generationPhantom()
    );
  }

  private _generationToConsumersFlowWidth(): number {
    if (this._gridExport() > 0) {
      return this._rateToWidth(this._generationTotal() - this._gridExport());
    }
    return this._rateToWidth(this._generationTotal());

    // if (this._netGridImport() > 0) {
    // )
    // if (this.gridInRoute === undefined || this.gridInRoute.rate > 0) {
    //   return (
    //     this._generationInFlowWidth() + this._phantomGenerationInFlowWidth()
    //   );
    // }
    // return (
    //   this._generationInFlowWidth() +
    //   this._phantomGenerationInFlowWidth() -
    //   this._rateToWidth(-this.gridInRoute.rate)
    // );
  }

  private _generationToGridFlowWidth(): number {
    if (this._gridExport() <= 0) {
      return 0;
    }
    if (this.gridOutRoute) {
      return this._rateToWidth(this._gridExport());
    }
    if (!this.gridInRoute) {
      return 0;
    }
    if (this.gridInRoute.rate > 0) {
      return 0;
    }
    return this._rateToWidth(-this.gridInRoute.rate);
  }

  private _gridInFlowWidth(): number {
    if (this.gridInRoute === undefined) {
      return 0;
    }
    if (this.gridInRoute.rate > 0) {
      return this._rateToWidth(this.gridInRoute.rate);
    }
    return 0;
  }

  private _consumersFanOutTotalHeight(): number {
    let totalHeight = 0;
    let count = 0;
    for (const id in this.consumerRoutes) {
      if (Object.prototype.hasOwnProperty.call(this.consumerRoutes, id)) {
        totalHeight += this._rateToWidth(this.consumerRoutes[id].rate);
        count++;
      }
    }
    const untracked = this._untrackedConsumerRoute.rate;
    totalHeight += this._rateToWidth(untracked);
    count++;

    if (count > 0) {
      totalHeight += (count - 1) * CONSUMERS_FAN_OUT_VERTICAL_GAP;
    }
    return totalHeight;
  }

  private _pvColor(): string {
    const computedStyles = getComputedStyle(this);
    const ret = computedStyles.getPropertyValue("--solar-color").trim();
    return ret || PV_COLOR;
  }

  private _gridColor(): string {
    const computedStyles = getComputedStyle(this);
    const ret = computedStyles.getPropertyValue("--grid-in-color").trim();
    return ret || GRID_IN_COLOR;
  }

  protected _generateLabelDiv(
    _id: string | undefined,
    icon: string | undefined,
    _name: string | undefined,
    value: number
  ): TemplateResult {
    const valueRounded = Math.round(value * 10) / 10;
    return html`
      <div>
        <svg x="0" y="0" height=${ICON_SIZE_PX}>
          <path d=${icon} />
        </svg>
        <br />
        ${valueRounded} ${this.unit}
      </div>
    `;
  }

  protected _generationToConsumersRadius(): number {
    return 50 + this._generationToConsumersFlowWidth();
  }

  protected renderGenerationToConsumersFlow(
    x0: number,
    x1: number,
    y1: number,
    x2: number,
    y2: number
  ): [TemplateResult[], TemplateResult] {
    const totalGenWidth = this._generationInFlowWidth();
    const widthToGrid = this._generationToGridFlowWidth();

    const count =
      Object.keys(this.generationInRoutes).length +
      (this._phantomGenerationInRoute !== undefined ? 1 : 0);
    const fanOutWidth =
      totalGenWidth + (count - 1) * GENERATION_FAN_OUT_HORIZONTAL_GAP;
    let xA = PV_ORIGIN_X - fanOutWidth / 2;
    let xB = PV_ORIGIN_X - totalGenWidth / 2;
    const svgArray: TemplateResult[] = [];
    const divArray: TemplateResult[] = [];

    const startTerminatorY = PV_ORIGIN_Y;

    const routes = structuredClone(this.generationInRoutes);
    if (this._phantomGenerationInRoute !== undefined) {
      routes.phantom = this._phantomGenerationInRoute;
    }
    for (const key in routes) {
      if (Object.prototype.hasOwnProperty.call(routes, key)) {
        // const friendlyName = routes.text;
        const rate = routes[key].rate;
        const width = this._rateToWidth(rate);
        svgArray.push(
          renderFlowByCorners(
            xA + width,
            startTerminatorY,
            xA,
            startTerminatorY,
            xB + width,
            startTerminatorY + TERMINATOR_BLOCK_LENGTH,
            xB,
            startTerminatorY + TERMINATOR_BLOCK_LENGTH,
            "solar"
          )
        );
        svgArray.push(
          svg`
          <polygon points="${xA + width},${startTerminatorY}
          ${xA},${startTerminatorY},
          ${xA + width / 2},${startTerminatorY + ARROW_HEAD_LENGTH}"
          class="tint"/>
        `
        );

        const midX = xA + width / 2;
        const midY = (PV_ORIGIN_Y - 0) / 2;

        const divHeight = PV_ORIGIN_Y - 0;
        const divWidth = ICON_SIZE_PX * 3;
        const icon = routes[key].icon;
        if (icon) {
          divArray.push(
            html`<div
              class="label elecroute-label-horiz"
              style="width: ${divWidth}px; left: ${midX}px; top: ${midY}px; margin: ${-divHeight /
              2}px 0 0 ${-divWidth / 2}px;"
            >
              ${this._generateLabelDiv(key, icon, undefined, rate)}
            </div>`
          );
        }
        xA += width + GENERATION_FAN_OUT_HORIZONTAL_GAP;
        xB += width;
      }
    }

    const generatedFlowPath2 = renderFlowByCorners(
      x0 + totalGenWidth,
      PV_ORIGIN_Y + TERMINATOR_BLOCK_LENGTH - PAD_ANTIALIAS,
      x0 + widthToGrid,
      PV_ORIGIN_Y + TERMINATOR_BLOCK_LENGTH - PAD_ANTIALIAS,
      x1,
      y1,
      x2,
      y2,
      "solar"
    );
    const svgRet = svg`
    ${svgArray}
    ${generatedFlowPath2}
    `;
    return [divArray, svgRet];
  }

  protected renderGenerationToGridFlow(
    x0: number,
    y0: number,
    x10: number,
    y10: number
  ): TemplateResult {
    const width = this._generationToGridFlowWidth();
    if (width === 0) {
      return svg``;
    }
    const generatedFlowPath = renderFlowByCorners(
      x0 + width,
      y0,
      x0,
      y0,
      x10,
      y10 + width,
      x10,
      y10,
      "solar"
    );

    return svg`
    ${generatedFlowPath}
    <rect
      class="solar"
      x="${GRID_ORIGIN_X + ARROW_HEAD_LENGTH}"
      y="${y10}"
      height="${width}"
      width="${x10 - GRID_ORIGIN_X - ARROW_HEAD_LENGTH}"
    />
    <polygon points="${GRID_ORIGIN_X + ARROW_HEAD_LENGTH},${y10}
      ${GRID_ORIGIN_X + ARROW_HEAD_LENGTH},${y10 + width}
      ${GRID_ORIGIN_X},${y10 + width / 2}"
      class="solar"/>
  `;
  }

  protected renderGridInFlow(
    topRightX: number,
    topRightY: number
  ): [TemplateResult | null, TemplateResult, number, number] {
    if (!this.gridInRoute) {
      return [nothing, svg``, topRightX, topRightY];
    }
    const width = this._gridInFlowWidth();

    const startTerminatorX = GRID_ORIGIN_X;
    const startTerminatorY = topRightY;

    const x_width = topRightX - GRID_ORIGIN_X;
    const x3 = topRightX;
    const y3 = topRightY + width;
    const rate = this.gridInRoute.rate;
    const midX = startTerminatorX - ICON_SIZE_PX * 2;
    const midY = startTerminatorY + width / 2;

    const iconX = midX - ICON_SIZE_PX / 2;
    const iconY = midY - (ICON_SIZE_PX + TEXT_PADDING + FONT_SIZE_PX) / 2;

    // iconX = 0;
    // iconY = 0;
    // const svgIcon = this.gridInRoute.html
    //   ? nothing
    //   : svg`
    //   <svg x=${iconX} y=${iconY}>
    //     <path d=${mdiTransmissionTower} />
    //   </svg>`;

    // const divRet = this._generateLabelDiv(mdiTransmissionTower, 99);
    const divRet = html`<div
      width=${ICON_SIZE_PX * 2}
      class="label elecroute-label-grid"
      style="left: ${iconX}px; top: ${iconY}px;"
    >
      ${this._generateLabelDiv(
        this.gridInRoute.id,
        mdiTransmissionTower,
        undefined,
        rate
      )}
    </div>`;

    // <text text-anchor="middle"
    // x="${midX}"
    // y="${
    //   iconY + ICON_SIZE_PX + TEXT_PADDING + FONT_SIZE_PX / 2
    // }">${rate}WF</text>
    const svgRet = svg`
    <rect
      class="grid"
      id="grid-in-rect"
      x="${startTerminatorX}"
      y="${startTerminatorY}"
      height="${width}"
      width="${x_width}"
    />
    <polygon points="${startTerminatorX},${startTerminatorY}
    ${startTerminatorX},${startTerminatorY + width}
    ${startTerminatorX + ARROW_HEAD_LENGTH},${startTerminatorY + width / 2}"
    class="tint"/>
  `;
    return [divRet, svgRet, x3, y3];
  }

  protected renderPVInBlendFlow(
    x1: number,
    y1: number,
    endColor: string
  ): [TemplateResult, number, number] {
    const width = this._generationToConsumersFlowWidth();

    const x4: number = x1 + BLEND_LENGTH;
    const y4: number = y1;

    const svgRet = svg`
    <defs>
      <linearGradient id="grad_grid" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" style="stop-color:${this._pvColor()};stop-opacity:1" />
        <stop offset="100%" style="stop-color:${endColor};stop-opacity:1" />
      </linearGradient>
    </defs>
    <rect
      id="pv-in-blend-rect"
      x="${x1 - PAD_ANTIALIAS}"
      y="${y1}"
      height="${width}"
      width="${BLEND_LENGTH + 2 * PAD_ANTIALIAS}"
      fill="url(#grad_grid)"
    />
  `;
    return [svgRet, x4, y4];
  }

  protected renderGridInBlendFlow(
    x2: number,
    y2: number,
    endColor: string
  ): [TemplateResult, number, number] {
    const width = this._gridInFlowWidth();

    const x5 = x2 + BLEND_LENGTH;
    const y5 = y2 + width;

    const svgRet = svg`
    <defs>
      <linearGradient id="grad_pv" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" style="stop-color:${this._gridColor()};stop-opacity:1" />
        <stop offset="100%" style="stop-color:${endColor};stop-opacity:1" />
      </linearGradient>
    </defs>
    <rect
      id="grid-in-blend-rect"
      x="${x2}"
      y="${y2}"
      height="${width}"
      width="${BLEND_LENGTH + 1}"
      fill="url(#grad_pv)"
      style="fill-opacity:1"
    />
  `;
    return [svgRet, x5, y5];
  }

  protected _renderBlendedFlowPreFanOut(
    x4: number,
    y4: number,
    y5: number,
    color: string
  ): [TemplateResult, number, number, number, number] {
    const x6 = x4 + BLEND_LENGTH_PRE_FAN_OUT;
    const y6 = y4;
    const x7 = x6;
    const y7 = y5;

    const svgRet = svg`
    <rect
      id="blended-flow-pre-fan-out-rect"
      x="${x4}"
      y="${y4}"
      height="${y5 - y4}"
      width="${BLEND_LENGTH_PRE_FAN_OUT + 1}"
      style="fill:${color};fill-opacity:1"
    />
  `;
    return [svgRet, x6, y6, x7, y7];
  }

  protected _insertExtras(
    _topLeftX: number,
    _topLeftY: number,
    _width: number,
    _color: string,
    _route: ElecRoute
  ): [number, TemplateResult] {
    return [0, svg``];
  }

  protected _renderConsumerFlow(
    topLeftX: number,
    topLeftY: number,
    topRightX: number,
    topRightY: number,
    consumer: ElecRoute,
    color: string
  ): [TemplateResult, TemplateResult, number, number] {
    const width = this._rateToWidth(consumer.rate);
    const xEnd = topRightX;
    const yEnd = topRightY + width / 2;
    const svgFlow = renderFlowByCorners(
      topLeftX,
      topLeftY,
      topLeftX,
      topLeftY + width,
      topRightX + PAD_ANTIALIAS,
      topRightY,
      topRightX + PAD_ANTIALIAS,
      topRightY + width,
      "consumer",
      color
    );
    const [extrasLength, svgExtras] = this._insertExtras(
      topRightX,
      topRightY,
      width,
      color,
      consumer
    );

    const xText = xEnd + ARROW_HEAD_LENGTH + TEXT_PADDING + extrasLength;
    const yText = yEnd;
    const divHeight = width + CONSUMERS_FAN_OUT_VERTICAL_GAP / 2;
    const divWidth = CONSUMERS_LABEL_WIDTH;
    const divRet = html`<div
      class="label elecroute-label-consumer"
      style="width: ${divWidth}px; height:${divHeight}px; left: ${xText}px;
      top: ${yText}px; margin: ${-divHeight / 2}px 0 0 0px;"
    >
      ${this._generateLabelDiv(
        consumer.id,
        undefined,
        consumer.text,
        consumer.rate
      )}
    </div>`;

    const svgRet = svg`
      ${svgFlow}
      ${svgExtras}
      <polygon points="${xEnd + extrasLength},${yEnd - width / 2}
        ${xEnd + extrasLength},${yEnd + width / 2}
        ${xEnd + extrasLength + ARROW_HEAD_LENGTH},${yEnd}"
        style="fill:${color}" />
    `;

    const bottomLeftY = topLeftY + width;
    const bottomRightY = topRightY + width;
    return [divRet, svgRet, bottomLeftY, bottomRightY];
  }

  protected _renderConsumerFlows(
    x6: number,
    y6: number,
    y7: number,
    color: string
  ): [Array<TemplateResult>, Array<TemplateResult>, number] {
    // this._recalculateUntrackedRate();
    const divRetArray: Array<TemplateResult> = [];
    const svgRetArray: Array<TemplateResult> = [];
    const xLeft = x6;
    const xRight = x6 + CONSUMERS_FAN_OUT_HORIZONTAL_SPAN;

    const total_height = this._consumersFanOutTotalHeight();
    let yLeft = y6;
    let yRight = (y6 + y7) / 2 - total_height / 2;
    if (yRight < TEXT_PADDING) {
      yRight = TEXT_PADDING;
    }
    let svgRow;
    let divRow;
    for (const key in this.consumerRoutes) {
      if (Object.prototype.hasOwnProperty.call(this.consumerRoutes, key)) {
        [divRow, svgRow, yLeft, yRight] = this._renderConsumerFlow(
          xLeft,
          yLeft,
          xRight,
          yRight,
          this.consumerRoutes[key],
          color
        );
        divRetArray.push(divRow);
        svgRetArray.push(svgRow);
        yRight += CONSUMERS_FAN_OUT_VERTICAL_GAP;
      }
    }

    [divRow, svgRow, yLeft, yRight] = this._renderConsumerFlow(
      xLeft,
      yLeft,
      xRight,
      yRight,
      this._untrackedConsumerRoute,
      color
    );
    divRetArray.push(divRow);
    svgRetArray.push(svgRow);
    yRight += CONSUMERS_FAN_OUT_VERTICAL_GAP;

    if (svgRetArray.length > 0) {
      yRight += CONSUMERS_FAN_OUT_VERTICAL_GAP;
    }
    return [divRetArray, svgRetArray, yRight];
  }

  protected _gridBlendRatio(): number {
    if (!this.gridInRoute) {
      return 0;
    }
    const grid = this.gridInRoute.rate;
    const renewable =
      this._generationTrackedTotal() + this._generationPhantom();
    const ratio = grid / (grid + renewable);
    if (ratio < 0) {
      return 0;
    }
    if (ratio > 1) {
      return 1;
    }
    return ratio;
  }

  protected _rateInBlendColor(): string {
    return mixHexes(this._gridColor(), this._pvColor(), this._gridBlendRatio());
  }

  protected _calc_xy(): [
    number,
    number,
    number,
    number,
    number,
    number,
    number,
    number,
  ] {
    const x0 = PV_ORIGIN_X - this._generationInFlowWidth() / 2;
    const y0 = PV_ORIGIN_Y + TERMINATOR_BLOCK_LENGTH;

    const widthGenToConsumers = this._generationToConsumersFlowWidth();
    const widthGenToGrid = this._generationToGridFlowWidth();
    const radiusGenToConsumers = 50 + widthGenToConsumers;
    const radiusGenToGrid = 50 + widthGenToGrid;
    const y1 = Math.max(
      PV_ORIGIN_Y +
        TERMINATOR_BLOCK_LENGTH +
        radiusGenToConsumers -
        widthGenToConsumers / 2,
      PV_ORIGIN_Y +
        TERMINATOR_BLOCK_LENGTH +
        radiusGenToGrid -
        widthGenToGrid / 2
    );
    const x1: number =
      x0 + widthGenToGrid + widthGenToConsumers / 2 + radiusGenToConsumers;

    const x2: number = x1;
    const y2: number = y1 + widthGenToConsumers;

    const x10 = x0 + this._generationToGridFlowWidth() - (y2 - y0);
    const y10 = y2 - this._generationToGridFlowWidth();
    return [x0, y0, x1, y1, x2, y2, x10, y10];
  }

  protected render(): TemplateResult {
    this._recalculate();
    if (this.gridInRoute === undefined) {
      return html`<svg width="100%" height="80px">
        <text x="90" y="20" font-size="${FONT_SIZE_PX}px">
          "Grid in unspecified!"
        </text>
      </svg>`;
    }
    const [x0, y0, x1, y1, x2, y2, x10, y10] = this._calc_xy();
    const [pvInFlowDiv, pvInFlowSvg] = this.renderGenerationToConsumersFlow(
      x0,
      x1,
      y1,
      x2,
      y2
    );
    const generationToGridFlowSvg = this.renderGenerationToGridFlow(
      x0,
      y0,
      x10,
      y10
    );
    const [gridInDiv, gridInFlowSvg, x3, y3] = this.renderGridInFlow(x2, y2);
    const blendColor = this._rateInBlendColor();

    const [pvInBlendFlowSvg, x4, y4] = this.renderPVInBlendFlow(
      x1,
      y1,
      blendColor
    );
    const [gridInBlendFlowSvg, x5, y5] = this.renderGridInBlendFlow(
      x2,
      y2,
      blendColor
    );
    const [blendedFlowPreFanOut, x6, y6, x7, y7] =
      this._renderBlendedFlowPreFanOut(x4, y4, y5, blendColor);
    const [consOutFlowsDiv, consOutFlowsSvg, y8] = this._renderConsumerFlows(
      x6,
      y6,
      y7,
      blendColor
    );

    const ymax = Math.max(y5, y8);
    return html`<div style="position: relative;">
      ${gridInDiv} ${pvInFlowDiv} ${consOutFlowsDiv}
      <svg width="100%" height=${ymax}>
        ${pvInFlowSvg} ${generationToGridFlowSvg} ${gridInFlowSvg}
        ${pvInBlendFlowSvg} ${gridInBlendFlowSvg} ${blendedFlowPreFanOut}
        ${consOutFlowsSvg} ${debugPoint(x0, y0, "x0,y0")}
        ${debugPoint(x1, y1, "x1,y1")} ${debugPoint(x2, y2, "x2,y2")}
        ${debugPoint(x3, y3, "x3,y3")} ${debugPoint(x4, y4, "x4,y4")}
        ${debugPoint(x5, y5, "x5,y5")} ${debugPoint(x6, y6, "x6,y6")}
        ${debugPoint(x7, y7, "x7,y7")} ${debugPoint(x10, y10, "x10,y10")}
      </svg>
    </div>`;
  }

  static get styles(): CSSResultArray {
    return [
      css`
        div {
          .label {
            position: absolute;
          }
          .elecroute-label-grid {
            text-align: center;
          }
          .elecroute-label-horiz {
            text-align: center;
          }
          .elecroute-label-consumer {
            text-align: left;
            display: flex;
            align-items: center;
          }
        }
        svg {
          rect {
            stroke: none;
            stroke-width: 0;
          }
          path {
            stroke: none;
            stroke-width: 0;
          }
          polygon {
            stroke: none;
          }
          polygon.solar {
            fill: var(--solar-color, #0d6a04);
          }
          polygon.tint {
            fill: #000000;
            opacity: 0.2;
          }
          path.flow {
            fill: gray;
          }
          path.solar {
            fill: var(--solar-color, #0d6a04);
            stroke: var(--solar-color, #0d6a04);
            stroke-width: 0;
          }
          rect.solar {
            fill: var(--solar-color, #0d6a04);
            stroke-width: 0;
          }
          rect.grid {
            fill: var(--grid-in-color, #920e83);
          }
        }
      `,
    ];
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "elec-sankey": ElecSankey;
  }
}
