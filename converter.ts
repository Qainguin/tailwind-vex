// converter.ts
interface Style {
  textColor: [number, number, number];
  bgColor: [number, number, number];
  padding: number;
  margin: number;
  textSize: number; // px height for layout
  fontType: string; // e.g. "monoM"
  rounded: boolean;
  align: 0 | 1 | 2;
  width: number | "auto" | "full"; // Add width property
  height: number | "auto" | "full"; // Add height property
}

const ColorMap: Record<string, [number, number, number]> = {
  "red-500": [220, 38, 38],
  "green-500": [22, 163, 74],
  "blue-500": [59, 130, 246],
};

const TextSizeMap: Record<string, number> = {
  "text-xs": 12,
  "text-sm": 16,
  "text-md": 20,
  "text-lg": 24,
  "text-xl": 28,
};

const FontTypeMap: Record<string, string> = {
  "text-xs": "monoXS",
  "text-sm": "monoS",
  "text-md": "monoM",
  "text-lg": "monoL",
  "text-xl": "monoXL",
};

const VEX_SCREEN_WIDTH = 480;
const VEX_SCREEN_HEIGHT = 240;

function parseClasses(cls: string): Style {
  const S: Style = {
    textColor: [255, 255, 255],
    bgColor: [0, 0, 0],
    padding: 0,
    margin: 0,
    textSize: TextSizeMap["text-md"],
    fontType: FontTypeMap["text-md"],
    rounded: false,
    align: 0,
    width: "auto", // Default width
    height: "auto", // Default height
  };
  for (let c of cls.split(/\s+/)) {
    if (c.startsWith("text-") && ColorMap[c.slice(5)]) {
      S.textColor = ColorMap[c.slice(5)];
    } else if (c.startsWith("bg-") && ColorMap[c.slice(3)]) {
      S.bgColor = ColorMap[c.slice(3)];
    } else if (c.startsWith("p-")) {
      S.padding = parseInt(c.slice(2)) * 5;
    } else if (c.startsWith("m-")) {
      S.margin = parseInt(c.slice(2)) * 5;
    } else if (TextSizeMap[c]) {
      S.textSize = TextSizeMap[c];
      S.fontType = FontTypeMap[c];
    } else if (c === "rounded") {
      S.rounded = true;
    } else if (c === "text-center") {
      S.align = 1;
    } else if (c === "text-right") {
      S.align = 2;
    } else if (c.startsWith("w-")) {
      // Handle width classes
      const value = c.slice(2);
      if (value === "auto") {
        S.width = "auto";
      } else if (value === "full") {
        S.width = VEX_SCREEN_WIDTH;
      } else {
        S.width = parseInt(value) * 5; // Assuming units like p- and m-
      }
    } else if (c.startsWith("h-")) {
      // Handle height classes
      const value = c.slice(2);
      if (value === "auto") {
        S.height = "auto";
      } else if (value === "full") {
        S.height = VEX_SCREEN_HEIGHT;
      } else {
        S.height = parseInt(value) * 5; // Assuming units like p- and m-
      }
    }
  }
  return S;
}

interface Elem {
  tag: string;
  classes: string;
  content: string;
}

function extractElements(html: string): Elem[] {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const nodes = Array.from(
    doc.querySelectorAll(
      "div[class],span[class],p[class],h1[class],img[src][class]"
    )
  ) as HTMLElement[];
  return nodes.map((n) => ({
    tag: n.tagName.toLowerCase(),
    classes: n.getAttribute("class") || "",
    content:
      n.tagName.toLowerCase() === "img"
        ? (n.getAttribute("src") as string)
        : n.textContent?.trim() || "",
  }));
}

function genCpp(elems: Elem[]): string {
  const lines: string[] = [];
  lines.push("#include <vex.h>");
  lines.push("using namespace vex;");
  lines.push("");
  lines.push("brain Brain;");
  lines.push("");
  lines.push("int main() {");
  lines.push("  Brain.Screen.clearScreen();");
  lines.push("  int cursorX = 0, cursorY = 0;");
  lines.push("");

  for (let e of elems) {
    const S = parseClasses(e.classes);
    console.log(S.fontType);
    lines.push(`  // <${e.tag} class="${e.classes}">`);

    let elementWidth = S.width === "auto" ? `240-2*cursorX` : S.width;
    let elementHeight =
      S.height === "auto" ? `${S.textSize + 2 * S.padding}` : S.height;

    lines.push(`  cursorY += ${S.margin};`);
    lines.push(`  cursorX = ${S.margin};`);

    const [br, bg, bb] = S.bgColor;
    if (br || bg || bb) {
      lines.push(`  Brain.Screen.setFillColor(color(${br},${bg},${bb}));`);
      if (S.rounded) {
        lines.push(
          `  Brain.Screen.drawRoundedRectangle(` +
            `cursorX, cursorY, ${elementWidth}, ` +
            `${elementHeight}, 5);`
        );
      } else {
        lines.push(
          `  Brain.Screen.drawRectangle(` +
            `cursorX, cursorY, ${elementWidth}, ` +
            `${elementHeight});`
        );
      }
    }

    if (e.tag === "img") {
      // For images, if height is 'auto', we need a placeholder or
      // a way to determine the image height. For now, let's keep
      // the placeholder comment. If a height is specified, use it.
      elementHeight = S.height === "auto" ? `/* image height */ 50` : S.height;
      lines.push(
        `  Brain.Screen.drawImageFromFile(` +
          `cursorX, cursorY, "${e.content}");`
      );
      lines.push(`  cursorY += ${elementHeight};`);
    } else {
      const [tr, tg, tb] = S.textColor;
      lines.push(`  Brain.Screen.setPenColor(color(${tr},${tg},${tb}));`);
      lines.push(`  Brain.Screen.setFont(${S.fontType});`);
      const xPos =
        S.align === 1
          ? `cursorX + ${
              typeof elementWidth === "number"
                ? elementWidth / 2
                : `(${elementWidth})/2`
            } - (Brain.Screen.getStringWidth("${e.content}")/2)`
          : S.align === 2
          ? `cursorX + ${
              typeof elementWidth === "number"
                ? elementWidth
                : `(${elementWidth})`
            } - ${S.padding} - Brain.Screen.getStringWidth("${e.content}")`
          : `cursorX + ${S.padding}`;

      lines.push(
        `  Brain.Screen.printAt(` +
          `${xPos}, cursorY + ${
            typeof S.height === "number" ? S.height / 2 : 0
          }, ` +
          `"${e.content}");`
      );
      lines.push(`  cursorY += ${S.textSize} + 2*${S.padding};`); // Text content still adds height based on text size + padding
    }

    lines.push("");
  }

  lines.push("  return 0;");
  lines.push("}");
  return lines.join("\n");
}

export function genOutput(html: string): string {
  const elems = extractElements(html);
  return genCpp(elems);
}

// --- wiring to the page ---
