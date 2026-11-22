import type { Bubble, MapData } from "./mind-map-model";
import { colors } from "./mind-map-model";
import {
  branchColor,
  nodeHeight,
  nodeWidth,
  wordLines,
  titleLines,
  underlined,
  contrast,
} from "./mind-map-geometry";
export function MindMapNode({
  data,
  node: n,
  zoom,
  selected,
  editable,
}: {
  data: MapData;
  node: Bubble;
  zoom: number;
  selected: boolean;
  editable: boolean;
}) {
  const theme = data.theme || "cards",
    h = nodeHeight(n, theme),
    w = nodeWidth(theme),
    color = branchColor(data, n),
    root = !n.parent,
    standard = colors
      .slice(0, 6)
      .some((c) => c.toUpperCase() === n.fill.toUpperCase());
  const organic = theme === "organic" && !root && !n.row,
    classic = theme === "classic" && !root && !underlined(data, n);
  const fill =
    theme === "classic" && root && standard
      ? "#FFE780"
      : classic && standard
        ? color
        : n.fill;
  const ink =
    underlined(data, n) && n.ink.toUpperCase() === "#243A36"
      ? "var(--ink,#243A36)"
      : classic && n.ink.toUpperCase() === "#243A36"
        ? contrast(fill)
        : n.ink;
  const label = titleLines(n, theme),
    note = wordLines(
      n.note || (organic ? n.content?.slice(0, 120) || "" : ""),
      organic ? 33 : 27,
    ),
    titleY =
      n.note || n.content || n.media?.length || organic
        ? -h / 2 + 36
        : -(label.length - 1) * 12 + 6;
  return (
    <>
      {underlined(data, n) ? (
        <>
          <rect
            className="mm-node-surface mm-underlined-surface"
            x={-w / 2}
            y={-h / 2}
            width={w}
            height={h}
            rx="10"
            fill={selected ? "#6B9EB714" : "transparent"}
            stroke={selected ? "#5b87a1" : "transparent"}
          />
          <path
            d={`M${-w / 2},${h / 2 - 12}H${w / 2}`}
            fill="none"
            stroke={color}
            strokeWidth="4.5"
            strokeLinecap="round"
          />
        </>
      ) : theme === "classic" && root ? (
        <ellipse
          className="mm-node-surface"
          rx={w / 2}
          ry={h / 2}
          fill={fill}
          stroke={selected ? "#5b87a1" : color}
          strokeWidth={selected ? 3 : 1.5}
        />
      ) : theme === "organic" ? (
        <>
          <path
            className="mm-node-surface"
            d={`M${-w / 2 + 35},${-h / 2 + 8} C${-w / 2 - 28},${-h / 2 + 38} ${-w / 2 - 20},${h / 2 - 6} ${-w / 2 + 45},${h / 2} C${w / 2 + 26},${h / 2 + 18} ${w / 2 + 18},${-h / 2 + 22} ${w / 2 - 30},${-h / 2 + 4} Q0,${-h / 2 - 18} ${-w / 2 + 35},${-h / 2 + 8}Z`}
            fill={root && standard ? "#E4E8E6" : fill}
            stroke={selected ? "#5b87a1" : "transparent"}
            strokeWidth="2"
          />
          {organic && (
            <rect
              x={-w / 2 + 25}
              y={-h / 2 - 4}
              width={w - 50}
              height={label.length * 24 + 16}
              rx="12"
              fill={color}
            />
          )}
        </>
      ) : (
        <rect
          className="mm-node-surface"
          x={-w / 2}
          y={-h / 2}
          width={w}
          height={h}
          rx={classic ? 10 : 18}
          fill={fill}
          stroke={selected ? "#5b87a1" : color}
          strokeWidth={selected ? 3 : 1.5}
        />
      )}
      <text
        textAnchor="middle"
        fontSize={Math.max(
          theme === "branches" || theme === "classic" ? 20 : n.size,
          Math.min(13 / zoom, n.size * 1.2),
        )}
        fontWeight={n.bold || organic ? 700 : 450}
        fontStyle={n.italic ? "italic" : "normal"}
        fill={organic ? contrast(color) : ink}
      >
        {label.map((line, i) => (
          <tspan
            key={i}
            x="0"
            y={organic ? -h / 2 + 26 + i * 24 : titleY + i * 24}
          >
            {line}
          </tspan>
        ))}
      </text>
      {(!!n.content || !!n.media?.length) && !organic && !n.note && (
        <text textAnchor="middle" fontSize="12" fill={ink} y={h / 2 - 16}>
          Explorer la section ↗
        </text>
      )}
      {(n.note || organic) && (
        <g className="mm-note-area">
          <rect
            x={-w / 2 + 15}
            y={-h / 2 + label.length * 24 + 28}
            width={w - 30}
            height={Math.max(30, h - label.length * 24 - 40)}
            fill="transparent"
          />
          <text
            className="mm-note-text"
            textAnchor="middle"
            fontSize={Math.max(14, Math.min(12 / zoom, 16.8))}
            fill={ink}
          >
            {(n.note || n.content
              ? note
              : editable
                ? ["Double-cliquer pour", "ajouter du contenu"]
                : []
            ).map((line, i) => (
              <tspan key={i} x="0" y={-h / 2 + label.length * 24 + 50 + i * 19}>
                {line}
              </tspan>
            ))}
          </text>
        </g>
      )}
    </>
  );
}
