"use strict";
var ColorMap = {
  "red-500": [220, 38, 38],
  "green-500": [22, 163, 74],
  "blue-500": [59, 130, 246],
};
var TextSizeMap = {
  "text-xs": 12,
  "text-sm": 16,
  "text-md": 20,
  "text-lg": 24,
  "text-xl": 28,
};
var FontTypeMap = {
  "text-xs": "monoXS",
  "text-sm": "monoS",
  "text-md": "monoM",
  "text-lg": "monoL",
  "text-xl": "monoXL",
};
var VEX_SCREEN_WIDTH = 480;
var VEX_SCREEN_HEIGHT = 240;
function parseClasses(cls) {
  var S = {
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
  for (var _i = 0, _a = cls.split(/\s+/); _i < _a.length; _i++) {
    var c = _a[_i];
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
      var value = c.slice(2);
      if (value === "auto") {
        S.width = "auto";
      } else if (value === "full") {
        S.width = VEX_SCREEN_WIDTH;
      } else {
        S.width = parseInt(value) * 5; // Assuming units like p- and m-
      }
    } else if (c.startsWith("h-")) {
      // Handle height classes
      var value = c.slice(2);
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
function extractElements(html) {
  var doc = new DOMParser().parseFromString(html, "text/html");
  var nodes = Array.from(
    doc.querySelectorAll(
      "div[class],span[class],p[class],h1[class],img[src][class]"
    )
  );
  return nodes.map(function (n) {
    var _a;
    return {
      tag: n.tagName.toLowerCase(),
      classes: n.getAttribute("class") || "",
      content:
        n.tagName.toLowerCase() === "img"
          ? n.getAttribute("src")
          : ((_a = n.textContent) === null || _a === void 0
              ? void 0
              : _a.trim()) || "",
    };
  });
}
function genCpp(elems) {
  var lines = [];
  lines.push("#include <vex.h>");
  lines.push("using namespace vex;");
  lines.push("");
  lines.push("brain Brain;");
  lines.push("");
  lines.push("int main() {");
  lines.push("  Brain.Screen.clearScreen();");
  lines.push("  int cursorX = 0, cursorY = 0;");
  lines.push("");
  for (var _i = 0, elems_1 = elems; _i < elems_1.length; _i++) {
    var e = elems_1[_i];
    var S = parseClasses(e.classes);
    console.log(S.fontType);
    lines.push("  // <".concat(e.tag, ' class="').concat(e.classes, '">'));
    var elementWidth = S.width === "auto" ? "240-2*cursorX" : S.width;
    var elementHeight =
      S.height === "auto" ? "".concat(S.textSize + 2 * S.padding) : S.height;
    lines.push("  cursorY += ".concat(S.margin, ";"));
    lines.push("  cursorX = ".concat(S.margin, ";"));
    var _a = S.bgColor,
      br = _a[0],
      bg = _a[1],
      bb = _a[2];
    if (br || bg || bb) {
      lines.push(
        "  Brain.Screen.setFillColor(color("
          .concat(br, ",")
          .concat(bg, ",")
          .concat(bb, "));")
      );
      if (S.rounded) {
        lines.push(
          "  Brain.Screen.drawRoundedRectangle(" +
            "cursorX, cursorY, ".concat(elementWidth, ", ") +
            "".concat(elementHeight, ", 5);")
        );
      } else {
        lines.push(
          "  Brain.Screen.drawRectangle(" +
            "cursorX, cursorY, ".concat(elementWidth, ", ") +
            "".concat(elementHeight, ");")
        );
      }
    }
    if (e.tag === "img") {
      // For images, if height is 'auto', we need a placeholder or
      // a way to determine the image height. For now, let's keep
      // the placeholder comment. If a height is specified, use it.
      elementHeight = S.height === "auto" ? "/* image height */ 50" : S.height;
      lines.push(
        "  Brain.Screen.drawImageFromFile(" +
          'cursorX, cursorY, "'.concat(e.content, '");')
      );
      lines.push("  cursorY += ".concat(elementHeight, ";"));
    } else {
      var _b = S.textColor,
        tr = _b[0],
        tg = _b[1],
        tb = _b[2];
      lines.push(
        "  Brain.Screen.setPenColor(color("
          .concat(tr, ",")
          .concat(tg, ",")
          .concat(tb, "));")
      );
      lines.push("  Brain.Screen.setFont(".concat(S.fontType, ");"));
      var xPos =
        S.align === 1
          ? "cursorX + "
              .concat(
                typeof elementWidth === "number"
                  ? elementWidth / 2
                  : "(".concat(elementWidth, ")/2"),
                ' - (Brain.Screen.getStringWidth("'
              )
              .concat(e.content, '")/2)')
          : S.align === 2
          ? "cursorX + "
              .concat(
                typeof elementWidth === "number"
                  ? elementWidth
                  : "(".concat(elementWidth, ")"),
                " - "
              )
              .concat(S.padding, ' - Brain.Screen.getStringWidth("')
              .concat(e.content, '")')
          : "cursorX + ".concat(S.padding);
      lines.push(
        "  Brain.Screen.printAt(" +
          ""
            .concat(xPos, ", cursorY + ")
            .concat(typeof S.height === "number" ? S.height / 2 : 0, ", ") +
          '"'.concat(e.content, '");')
      );
      lines.push(
        "  cursorY += ".concat(S.textSize, " + 2*").concat(S.padding, ";")
      ); // Text content still adds height based on text size + padding
    }
    lines.push("");
  }
  lines.push("  return 0;");
  lines.push("}");
  return lines.join("\n");
}
export function genOutput(html) {
  var elems = extractElements(html);
  return genCpp(elems);
}
// --- wiring to the page ---
