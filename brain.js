let commands = [];

// These variables are now accessible by render
let cursorX = 0;
let cursorY = 0;
let currentColor = "rgb(0,0,0)"; // Default color
let currentPenColor = "rgb(0,0,0)"; // Default pen color
let currentFont = "monoM"; // Default font

const drawingOperations = [];

// Simple simulation of Brain.Screen.getStringWidth for a fixed string
const getStringWidth = (text) => {
  // This is a placeholder. In a real canvas implementation, you'd measure text.
  const charWidth = 6; // Approximate character width
  return text.length * charWidth;
};

// Simple simulation of the color function
const color = (r, g, b) => {
  return `rgb(${r},${g},${b})`;
};

const canvas = document.getElementById("brainCanvas"); // Get your canvas element
const ctx = canvas.getContext("2d");

function render() {
  // Clear previous drawing operations before rendering the new set
  drawingOperations.length = 0;
  // You might also want to clear the canvas before drawing
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (const command of commands) {
    if (command.includes("cursorY += ")) {
      const value = parseInt(command.split("+=")[1].replace(";", "").trim());
      cursorY += value; // Modify the outer scope variable
    } else if (command.includes("cursorX = ")) {
      const value = parseInt(command.split("=")[1].replace(";", "").trim());
      cursorX = value; // Modify the outer scope variable
    } else if (command.includes("Brain.Screen.setFillColor(")) {
      const colorArgs = command.substring(
        command.indexOf("(") + 1,
        command.lastIndexOf(")")
      );
      // Evaluate the color function call
      currentColor = eval(colorArgs);
    } else if (command.includes("Brain.Screen.drawRectangle(")) {
      const rectArgs = command.substring(
        command.indexOf("(") + 1,
        command.lastIndexOf(")")
      );
      const [x, y, width, height] = rectArgs.split(",").map((arg) => {
        let newArg = arg.trim();
        if (arg.includes("cursorX")) {
          newArg = arg.replace("cursorX", cursorX).trim();
        }
        if (newArg.includes("cursorY")) {
          newArg = arg.replace("cursorY", cursorX).trim();
        }
        return eval(newArg);
      });
      const rectOp = {
        type: "drawRectangle",
        x: x,
        y: y,
        width: width,
        height: height,
        fillColor: currentColor,
      };
      drawingOperations.push(rectOp);
    } else if (command.includes("Brain.Screen.setPenColor(")) {
      const colorArgs = command.substring(
        command.indexOf("(") + 1,
        command.lastIndexOf(")")
      );
      currentPenColor = eval(colorArgs);
    } else if (command.includes("Brain.Screen.setFont(")) {
      const fontName = command.substring(
        command.indexOf("(") + 1,
        command.lastIndexOf(")")
      );
      currentFont = fontName.replace(/'/g, "").replace(/"/g, ""); // Remove quotes
      // In a real canvas, you'd map 'monoM' to a CSS font string
    } else if (command.includes("Brain.Screen.printAt(")) {
      const printArgs = command.substring(
        command.indexOf("(") + 1,
        command.lastIndexOf(")")
      );
      // Split by comma, but be careful with commas inside string literals
      const args = [];
      let currentArg = "";
      let inString = false;
      for (let i = 0; i < printArgs.length; i++) {
        const char = printArgs[i];
        if (char === '"') {
          inString = !inString;
        }
        if (char === "," && !inString) {
          args.push(currentArg.trim());
          currentArg = "";
        } else {
          currentArg += char;
        }
      }
      args.push(currentArg.trim()); // Add the last argument

      let [x, y, text] = args;
      console.log(`Brain.Screen.getStringWidth(${text})`);
      x = x.replace(
        `Brain.Screen.getStringWidth(${text})`,
        ctx.measureText(text).width
      );
      console.log(args);
      console.log(x);
      const evaluatedX = eval(x); // Evaluate expressions
      const evaluatedY = eval(y);
      const cleanedText = text.replace(/"/g, "").replace(/'/g, ""); // Remove quotes

      drawingOperations.push({
        type: "printAt",
        x: evaluatedX,
        y: evaluatedY,
        text: cleanedText,
        font: currentFont,
        color: currentPenColor,
      });
    }
  }

  // --- Canvas Rendering ---
  for (const operation of drawingOperations) {
    console.log(operation.type);
    if (operation.type === "drawRectangle") {
      ctx.fillStyle = operation.fillColor;
      console.log(operation.x, operation.y, operation.width, operation.height);
      ctx.fillRect(operation.x, operation.y, operation.width, operation.height);
    } else if (operation.type === "printAt") {
      // Map VEX font to a CSS font string (e.g., 'monoM' -> 'monospace')
      const canvasFont =
        operation.font === "monoM" ? "20px monospace" : "20px Arial"; // Adjust font size and family as needed
      ctx.font = canvasFont;
      ctx.fillStyle = operation.color;
      // VEX printAt uses the top-left corner as the text origin
      // HTML5 canvas textBaseline defaults to 'alphabetic', you might want 'top'
      ctx.textBaseline = "top";
      ctx.fillText(
        operation.text,
        operation.x - ctx.measureText(operation.text).width / 4,
        operation.y
      );
    }
  }
}

export function drawBrainScreen(cpp) {
  const lines = cpp
    .split("\n")
    .filter((item) => item !== "")
    .splice(7);

  lines.forEach((line, l) => {
    lines[l] = line.trim();
  });

  commands = lines;

  // Reset state before processing new commands
  cursorX = 0;
  cursorY = 0;
  currentColor = "rgb(0,0,0)";
  currentPenColor = "rgb(0,0,0)";
  currentFont = "monoM";

  render();
}
