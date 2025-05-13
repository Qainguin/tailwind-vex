const ColorMap = {
    "red-500": [220, 38, 38],
    "green-500": [22, 163, 74],
    "blue-500": [59, 130, 246],
};
const TextSizeMap = {
    "text-xs": 12,
    "text-s": 16,
    "text-m": 20,
    "text-l": 24,
    "text-xl": 28,
};
const FontTypeMap = {
    "text-xs": "FontType.monoXS",
    "text-s": "FontType.monoS",
    "text-m": "FontType.monoM",
    "text-l": "FontType.monoL",
    "text-xl": "FontType.monoXL",
};
function parseClasses(cls) {
    const S = {
        textColor: [255, 255, 255],
        bgColor: [0, 0, 0],
        padding: 0,
        margin: 0,
        textSize: TextSizeMap["text-m"],
        fontType: FontTypeMap["text-m"],
        rounded: false,
        align: 0,
    };
    for (let c of cls.split(/\s+/)) {
        if (c.startsWith("text-") && ColorMap[c.slice(5)]) {
            S.textColor = ColorMap[c.slice(5)];
        }
        else if (c.startsWith("bg-") && ColorMap[c.slice(3)]) {
            S.bgColor = ColorMap[c.slice(3)];
        }
        else if (c.startsWith("p-")) {
            S.padding = parseInt(c.slice(2)) * 5;
        }
        else if (c.startsWith("m-")) {
            S.margin = parseInt(c.slice(2)) * 5;
        }
        else if (TextSizeMap[c]) {
            S.textSize = TextSizeMap[c];
            S.fontType = FontTypeMap[c];
        }
        else if (c === "rounded") {
            S.rounded = true;
        }
        else if (c === "text-center") {
            S.align = 1;
        }
        else if (c === "text-right") {
            S.align = 2;
        }
    }
    return S;
}
function extractElements(html) {
    const doc = new DOMParser().parseFromString(html, "text/html");
    const nodes = Array.from(doc.querySelectorAll("div[class],span[class],p[class],h1[class],img[src][class]"));
    return nodes.map((n) => ({
        tag: n.tagName.toLowerCase(),
        classes: n.getAttribute("class") || "",
        content: n.tagName.toLowerCase() === "img"
            ? n.getAttribute("src")
            : n.textContent?.trim() || "",
    }));
}
function genCpp(elems) {
    const lines = [];
    lines.push("#include <vex.h>");
    lines.push("using namespace vex;");
    lines.push("");
    lines.push("int main() {");
    lines.push("  Brain.Screen.clearScreen();");
    lines.push("  int cursorX = 0, cursorY = 0;");
    lines.push("");
    for (let e of elems) {
        const S = parseClasses(e.classes);
        lines.push(`  // <${e.tag} class="${e.classes}">`);
        lines.push(`  cursorY += ${S.margin};`);
        lines.push(`  cursorX = ${S.margin};`);
        const [br, bg, bb] = S.bgColor;
        if (br || bg || bb) {
            lines.push(`  Brain.Screen.setPenColor(color(${br},${bg},${bb}));`);
            if (S.rounded) {
                lines.push(`  Brain.Screen.drawRoundedRectangle(` +
                    `cursorX, cursorY, 240-2*cursorX, ` +
                    `${S.textSize + 2 * S.padding}, 5);`);
            }
            else {
                lines.push(`  Brain.Screen.drawRectangle(` +
                    `cursorX, cursorY, 240-2*cursorX, ` +
                    `${S.textSize + 2 * S.padding});`);
            }
        }
        if (e.tag === "img") {
            lines.push(`  Brain.Screen.drawImageFromFile(` +
                `cursorX, cursorY, "${e.content}");`);
            lines.push(`  cursorY += /* image height */ 50;`);
        }
        else {
            const [tr, tg, tb] = S.textColor;
            lines.push(`  Brain.Screen.setPenColor(color(${tr},${tg},${tb}));`);
            lines.push(`  Brain.Screen.setFont(${S.fontType});`);
            const xPos = S.align === 1
                ? "240/2"
                : S.align === 2
                    ? `240 - cursorX - ${S.padding}`
                    : `cursorX + ${S.padding}`;
            lines.push(`  Brain.Screen.printAt(` +
                `${xPos}, cursorY + ${S.padding} + ${S.textSize}, ` +
                `"${e.content}");`);
            lines.push(`  cursorY += ${S.textSize} + 2*${S.padding};`);
        }
        lines.push("");
    }
    lines.push("  return 0;");
    lines.push("}");
    return lines.join("\n");
}
// --- wiring to the page ---
const inputEl = document.getElementById("htmlInput");
const outputEl = document.getElementById("cppOutput");
const btn = document.getElementById("convertBtn");
const dl = document.getElementById("downloadLink");
btn.addEventListener("click", () => {
    const elems = extractElements(inputEl.value);
    outputEl.value = genCpp(elems);
});
outputEl.addEventListener("input", () => {
    const blob = new Blob([outputEl.value], { type: "text/plain" });
    dl.href = URL.createObjectURL(blob);
    dl.download = "output.cpp";
});
